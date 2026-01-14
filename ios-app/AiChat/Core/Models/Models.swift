//
//  Models.swift
//  AiChat
//

import Foundation
import SwiftData

// MARK: - AI Model

enum AIModel: String, Codable, CaseIterable {
    case sonnet
    case opus
    case haiku

    var displayName: String {
        switch self {
        case .sonnet: return "Sonnet"
        case .opus: return "Opus"
        case .haiku: return "Haiku"
        }
    }

    var description: String {
        switch self {
        case .sonnet: return "Balanced"
        case .opus: return "Most capable"
        case .haiku: return "Fastest"
        }
    }
}

// MARK: - Tool Status

enum ToolStatus: String, Codable {
    case pending
    case running
    case completed
    case error
}

// MARK: - Tool Type

enum ToolType: String, Codable {
    case read = "Read"
    case write = "Write"
    case edit = "Edit"
    case bash = "Bash"
    case glob = "Glob"
    case grep = "Grep"
    case webSearch = "WebSearch"
    case webFetch = "WebFetch"
    case task = "Task"
    case taskOutput = "TaskOutput"
    case todoWrite = "TodoWrite"
    case killShell = "KillShell"
    case enterPlanMode = "EnterPlanMode"
    case exitPlanMode = "ExitPlanMode"
    case unknown

    init(from name: String) {
        self = ToolType(rawValue: name) ?? .unknown
    }
}

// MARK: - Tool Call

struct ToolCall: Identifiable, Codable {
    let id: String
    let type: ToolType
    var status: ToolStatus
    let timestamp: Date
    let input: ToolInput
    var result: ToolResult?

    var displayName: String {
        switch type {
        case .read: return "Read"
        case .write: return "Write"
        case .edit: return "Edit"
        case .bash: return "Terminal"
        case .glob: return "Find files"
        case .grep: return "Search"
        case .webSearch: return "Web search"
        case .webFetch: return "Fetch URL"
        case .task: return "Agent"
        case .taskOutput: return "Task output"
        case .todoWrite: return "Tasks"
        case .killShell: return "Stop"
        case .enterPlanMode, .exitPlanMode: return "Plan"
        case .unknown: return "Tool"
        }
    }

    var summary: String {
        switch type {
        case .read, .write, .edit:
            return input.filePath?.components(separatedBy: "/").last ?? ""
        case .bash:
            return input.description ?? input.command?.prefix(30).description ?? ""
        case .glob, .grep:
            return input.pattern ?? ""
        case .webSearch:
            return input.query ?? ""
        case .webFetch:
            if let url = input.url, let host = URL(string: url)?.host {
                return host
            }
            return ""
        case .task:
            return input.subagentType ?? ""
        default:
            return ""
        }
    }
}

// MARK: - Tool Input

struct ToolInput: Codable {
    // File operations
    var filePath: String?
    var content: String?
    var oldString: String?
    var newString: String?

    // Bash
    var command: String?
    var description: String?

    // Search
    var pattern: String?
    var path: String?

    // Web
    var url: String?
    var query: String?
    var prompt: String?

    // Task
    var subagentType: String?
    var taskDescription: String?

    enum CodingKeys: String, CodingKey {
        case filePath = "file_path"
        case content
        case oldString = "old_string"
        case newString = "new_string"
        case command
        case description
        case pattern
        case path
        case url
        case query
        case prompt
        case subagentType = "subagent_type"
        case taskDescription = "task_description"
    }
}

// MARK: - Tool Result

struct ToolResult: Codable {
    // File read
    var fileContent: String?
    var numLines: Int?
    var startLine: Int?
    var totalLines: Int?

    // Bash
    var stdout: String?
    var stderr: String?
    var exitCode: Int?

    // Edit diff
    var diffAdded: Int?
    var diffRemoved: Int?
    var structuredPatch: [DiffHunk]?

    // Glob
    var filenames: [String]?

    // Grep
    var matches: String?

    // Generic
    var raw: String?
}

// MARK: - Diff Hunk

struct DiffHunk: Codable {
    let oldStart: Int
    let oldLines: Int
    let newStart: Int
    let newLines: Int
    let lines: [String]
}

// MARK: - Message Content

enum MessageContent: Codable {
    case text(String)
    case toolCalls([ToolCall])

    enum CodingKeys: String, CodingKey {
        case type
        case text
        case toolCalls
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let type = try container.decode(String.self, forKey: .type)
        switch type {
        case "text":
            let text = try container.decode(String.self, forKey: .text)
            self = .text(text)
        case "toolCalls":
            let tools = try container.decode([ToolCall].self, forKey: .toolCalls)
            self = .toolCalls(tools)
        default:
            self = .text("")
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        switch self {
        case .text(let text):
            try container.encode("text", forKey: .type)
            try container.encode(text, forKey: .text)
        case .toolCalls(let tools):
            try container.encode("toolCalls", forKey: .type)
            try container.encode(tools, forKey: .toolCalls)
        }
    }
}

// MARK: - Message

struct Message: Identifiable, Codable {
    let id: UUID
    let role: MessageRole
    let timestamp: Date
    var text: String
    var toolCalls: [ToolCall]
    var model: AIModel?
    var isStreaming: Bool

    init(
        id: UUID = UUID(),
        role: MessageRole,
        timestamp: Date = Date(),
        text: String = "",
        toolCalls: [ToolCall] = [],
        model: AIModel? = nil,
        isStreaming: Bool = false
    ) {
        self.id = id
        self.role = role
        self.timestamp = timestamp
        self.text = text
        self.toolCalls = toolCalls
        self.model = model
        self.isStreaming = isStreaming
    }
}

enum MessageRole: String, Codable {
    case user
    case assistant
}

// MARK: - Chat

@Model
final class Chat {
    @Attribute(.unique) var id: UUID
    var name: String
    var path: String
    var createdAt: Date
    var updatedAt: Date
    var sessionId: String?
    var messagesData: Data?

    var messages: [Message] {
        get {
            guard let data = messagesData else { return [] }
            return (try? JSONDecoder().decode([Message].self, from: data)) ?? []
        }
        set {
            messagesData = try? JSONEncoder().encode(newValue)
        }
    }

    init(
        id: UUID = UUID(),
        name: String = "New Chat",
        path: String,
        createdAt: Date = Date(),
        updatedAt: Date = Date(),
        sessionId: String? = nil,
        messages: [Message] = []
    ) {
        self.id = id
        self.name = name
        self.path = path
        self.createdAt = createdAt
        self.updatedAt = updatedAt
        self.sessionId = sessionId
        self.messagesData = try? JSONEncoder().encode(messages)
    }

    var displayPath: String {
        if path.hasPrefix("/home/user/") {
            return "~/" + path.dropFirst("/home/user/".count)
        }
        return path
    }

    var lastMessagePreview: String {
        guard let last = messages.last else { return "" }
        return String(last.text.prefix(50))
    }
}

// MARK: - Path Preset

@Model
final class PathPreset {
    @Attribute(.unique) var id: UUID
    var name: String
    var path: String
    var createdAt: Date

    init(id: UUID = UUID(), name: String, path: String, createdAt: Date = Date()) {
        self.id = id
        self.name = name
        self.path = path
        self.createdAt = createdAt
    }
}

// MARK: - App Settings

@Model
final class AppSettings {
    var defaultModel: AIModel
    var iCloudSyncEnabled: Bool

    init(defaultModel: AIModel = .sonnet, iCloudSyncEnabled: Bool = true) {
        self.defaultModel = defaultModel
        self.iCloudSyncEnabled = iCloudSyncEnabled
    }
}
