//
//  WebSocketService.swift
//  AiChat
//

import Foundation

// MARK: - WebSocket Event

enum WSEvent {
    case connected
    case disconnected
    case reconnecting
    case text(String, AIModel)
    case toolCall(ToolCall)
    case toolUpdate(id: String, status: ToolStatus, result: ToolResult?)
    case complete(sessionId: String)
    case error(String)
}

// MARK: - WebSocket Service

@Observable
final class WebSocketService {
    static let shared = WebSocketService()

    private(set) var isConnected = false
    private(set) var isReconnecting = false

    private var webSocket: URLSessionWebSocketTask?
    private var session: URLSession?
    private var currentSessionId: String?
    private var lastEventId: Int = 0
    private var eventHandler: ((WSEvent) -> Void)?
    private var reconnectTask: Task<Void, Never>?
    private var pingTask: Task<Void, Never>?

    private let baseURL = "wss://api.panel.webaweba.com/ws/ai"
    private let auth = AuthService.shared

    private init() {}

    // MARK: - Public Methods

    func connect(onEvent: @escaping (WSEvent) -> Void) async {
        eventHandler = onEvent

        guard let jwt = await auth.getJWT() else {
            onEvent(.error("Not authenticated"))
            return
        }

        await disconnect()
        await setupConnection(jwt: jwt)
    }

    func disconnect() async {
        pingTask?.cancel()
        reconnectTask?.cancel()
        webSocket?.cancel(with: .goingAway, reason: nil)
        webSocket = nil
        isConnected = false
        currentSessionId = nil
        lastEventId = 0
    }

    func sendMessage(
        prompt: String,
        cwd: String,
        model: AIModel,
        sessionId: String?
    ) async {
        let message = ChatMessage(
            type: "chat",
            prompt: prompt,
            cwd: cwd,
            model: model.rawValue,
            sessionId: sessionId
        )

        do {
            let data = try JSONEncoder().encode(message)
            guard let json = String(data: data, encoding: .utf8) else { return }
            try await webSocket?.send(.string(json))
        } catch {
            eventHandler?(.error("Failed to send message"))
        }
    }

    func reconnect(sessionId: String, lastEventId: Int) async {
        guard let jwt = await auth.getJWT() else { return }

        isReconnecting = true
        eventHandler?(.reconnecting)

        await setupConnection(jwt: jwt)

        let message = ReconnectMessage(
            type: "reconnect",
            sessionId: sessionId,
            lastEventId: lastEventId
        )

        do {
            let data = try JSONEncoder().encode(message)
            guard let json = String(data: data, encoding: .utf8) else { return }
            try await webSocket?.send(.string(json))
        } catch {
            eventHandler?(.error("Failed to reconnect"))
        }

        isReconnecting = false
    }

    // MARK: - Private Methods

    private func setupConnection(jwt: String) async {
        guard let url = URL(string: baseURL) else { return }

        var request = URLRequest(url: url)
        request.setValue("Bearer \(jwt)", forHTTPHeaderField: "Authorization")

        session = URLSession(configuration: .default)
        webSocket = session?.webSocketTask(with: request)
        webSocket?.resume()

        isConnected = true
        eventHandler?(.connected)

        startPing()
        receiveMessages()
    }

    private func receiveMessages() {
        webSocket?.receive { [weak self] result in
            guard let self else { return }

            switch result {
            case .success(let message):
                switch message {
                case .string(let text):
                    self.handleMessage(text)
                case .data(let data):
                    if let text = String(data: data, encoding: .utf8) {
                        self.handleMessage(text)
                    }
                @unknown default:
                    break
                }
                self.receiveMessages()

            case .failure(let error):
                self.handleDisconnect(error: error)
            }
        }
    }

    private func handleMessage(_ text: String) {
        guard let data = text.data(using: .utf8) else { return }

        do {
            let event = try JSONDecoder().decode(WSEventData.self, from: data)

            // Track event ID for reconnect
            if let eventId = event.eventId {
                lastEventId = eventId
            }

            // Track session ID
            if let sessionId = event.data?.sessionId ?? event.sessionId {
                currentSessionId = sessionId
            }

            parseEvent(event)
        } catch {
            // Ignore parse errors for unknown events
        }
    }

    private func parseEvent(_ event: WSEventData) {
        switch event.type {
        case "pong":
            break

        case "init", "system":
            break

        case "assistant":
            parseAssistantEvent(event)

        case "user":
            parseUserEvent(event)

        case "result":
            if let sessionId = currentSessionId {
                eventHandler?(.complete(sessionId: sessionId))
            }

        case "complete", "done":
            if let sessionId = currentSessionId {
                eventHandler?(.complete(sessionId: sessionId))
            }

        case "error":
            let errorMsg = event.data?.error ?? "Unknown error"
            eventHandler?(.error(errorMsg))

        default:
            break
        }
    }

    private func parseAssistantEvent(_ event: WSEventData) {
        guard let message = event.data?.message else { return }

        for content in message.content ?? [] {
            switch content.type {
            case "text":
                if let text = content.text {
                    let model = AIModel(rawValue: message.model ?? "sonnet") ?? .sonnet
                    eventHandler?(.text(text, model))
                }

            case "tool_use":
                if let id = content.id, let name = content.name {
                    let toolCall = ToolCall(
                        id: id,
                        type: ToolType(from: name),
                        status: .running,
                        timestamp: Date(),
                        input: parseToolInput(content.input),
                        result: nil
                    )
                    eventHandler?(.toolCall(toolCall))
                }

            default:
                break
            }
        }
    }

    private func parseUserEvent(_ event: WSEventData) {
        guard let message = event.data?.message else { return }

        for content in message.content ?? [] {
            if content.type == "tool_result", let toolUseId = content.toolUseId {
                let isError = content.isError ?? false
                let status: ToolStatus = isError ? .error : .completed

                let result = parseToolResult(event.data?.toolUseResult)

                eventHandler?(.toolUpdate(
                    id: toolUseId,
                    status: status,
                    result: result
                ))
            }
        }
    }

    private func parseToolInput(_ input: [String: AnyCodable]?) -> ToolInput {
        guard let input else { return ToolInput() }

        return ToolInput(
            filePath: input["file_path"]?.value as? String,
            content: input["content"]?.value as? String,
            oldString: input["old_string"]?.value as? String,
            newString: input["new_string"]?.value as? String,
            command: input["command"]?.value as? String,
            description: input["description"]?.value as? String,
            pattern: input["pattern"]?.value as? String,
            path: input["path"]?.value as? String,
            url: input["url"]?.value as? String,
            query: input["query"]?.value as? String,
            prompt: input["prompt"]?.value as? String,
            subagentType: input["subagent_type"]?.value as? String,
            taskDescription: input["task_description"]?.value as? String
        )
    }

    private func parseToolResult(_ result: [String: AnyCodable]?) -> ToolResult? {
        guard let result else { return nil }

        var toolResult = ToolResult()

        // File content
        if let file = result["file"]?.value as? [String: Any] {
            toolResult.fileContent = file["content"] as? String
            toolResult.numLines = file["numLines"] as? Int
            toolResult.startLine = file["startLine"] as? Int
            toolResult.totalLines = file["totalLines"] as? Int
        }

        // Bash
        toolResult.stdout = result["stdout"]?.value as? String
        toolResult.stderr = result["stderr"]?.value as? String
        toolResult.exitCode = result["exit_code"]?.value as? Int

        // Glob
        toolResult.filenames = result["filenames"]?.value as? [String]

        // Grep
        toolResult.matches = result["matches"]?.value as? String

        // Diff
        if let patch = result["structuredPatch"]?.value as? [[String: Any]] {
            toolResult.structuredPatch = patch.compactMap { hunk in
                guard let oldStart = hunk["oldStart"] as? Int,
                      let oldLines = hunk["oldLines"] as? Int,
                      let newStart = hunk["newStart"] as? Int,
                      let newLines = hunk["newLines"] as? Int,
                      let lines = hunk["lines"] as? [String] else {
                    return nil
                }
                return DiffHunk(
                    oldStart: oldStart,
                    oldLines: oldLines,
                    newStart: newStart,
                    newLines: newLines,
                    lines: lines
                )
            }

            // Calculate diff stats
            var added = 0
            var removed = 0
            for hunk in toolResult.structuredPatch ?? [] {
                for line in hunk.lines {
                    if line.hasPrefix("+") && !line.hasPrefix("+++") {
                        added += 1
                    } else if line.hasPrefix("-") && !line.hasPrefix("---") {
                        removed += 1
                    }
                }
            }
            toolResult.diffAdded = added
            toolResult.diffRemoved = removed
        }

        return toolResult
    }

    private func handleDisconnect(error: Error?) {
        isConnected = false
        eventHandler?(.disconnected)

        // Auto-reconnect if we have a session
        if let sessionId = currentSessionId {
            reconnectTask = Task {
                try? await Task.sleep(nanoseconds: 2_000_000_000)
                await reconnect(sessionId: sessionId, lastEventId: lastEventId)
            }
        }
    }

    private func startPing() {
        pingTask = Task {
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: 25_000_000_000)
                try? await webSocket?.send(.string("{\"type\":\"ping\"}"))
            }
        }
    }
}

// MARK: - WebSocket Message Types

private struct ChatMessage: Encodable {
    let type: String
    let prompt: String
    let cwd: String
    let model: String
    let sessionId: String?

    enum CodingKeys: String, CodingKey {
        case type, prompt, cwd, model
        case sessionId = "session_id"
    }
}

private struct ReconnectMessage: Encodable {
    let type: String
    let sessionId: String
    let lastEventId: Int

    enum CodingKeys: String, CodingKey {
        case type
        case sessionId = "session_id"
        case lastEventId = "last_event_id"
    }
}

// MARK: - WebSocket Event Data

private struct WSEventData: Decodable {
    let eventId: Int?
    let type: String
    let sessionId: String?
    let data: WSEventPayload?

    enum CodingKeys: String, CodingKey {
        case eventId = "event_id"
        case type
        case sessionId = "session_id"
        case data
    }
}

private struct WSEventPayload: Decodable {
    let sessionId: String?
    let message: WSMessage?
    let toolUseResult: [String: AnyCodable]?
    let error: String?

    enum CodingKeys: String, CodingKey {
        case sessionId = "session_id"
        case message
        case toolUseResult = "tool_use_result"
        case error
    }
}

private struct WSMessage: Decodable {
    let id: String?
    let model: String?
    let content: [WSContent]?
}

private struct WSContent: Decodable {
    let type: String
    let text: String?
    let id: String?
    let name: String?
    let input: [String: AnyCodable]?
    let toolUseId: String?
    let isError: Bool?

    enum CodingKeys: String, CodingKey {
        case type, text, id, name, input
        case toolUseId = "tool_use_id"
        case isError = "is_error"
    }
}

// MARK: - AnyCodable Helper

struct AnyCodable: Decodable {
    let value: Any

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()

        if let bool = try? container.decode(Bool.self) {
            value = bool
        } else if let int = try? container.decode(Int.self) {
            value = int
        } else if let double = try? container.decode(Double.self) {
            value = double
        } else if let string = try? container.decode(String.self) {
            value = string
        } else if let array = try? container.decode([AnyCodable].self) {
            value = array.map { $0.value }
        } else if let dict = try? container.decode([String: AnyCodable].self) {
            value = dict.mapValues { $0.value }
        } else {
            value = NSNull()
        }
    }
}
