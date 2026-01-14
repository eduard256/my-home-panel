//
//  ChatView.swift
//  AiChat
//

import SwiftUI
import SwiftData

struct ChatView: View {
    @Environment(\.modelContext) private var modelContext
    @Bindable var chat: Chat

    @State private var inputText = ""
    @State private var selectedModel: AIModel = .sonnet
    @State private var isStreaming = false
    @State private var showModelPicker = false

    private let ws = WebSocketService.shared

    var body: some View {
        ZStack {
            Color.bgPrimary
                .ignoresSafeArea()

            VStack(spacing: 0) {
                // Messages
                ScrollViewReader { proxy in
                    ScrollView {
                        LazyVStack(spacing: 0) {
                            ForEach(chat.messages) { message in
                                MessageView(message: message)
                                    .id(message.id)
                            }
                        }
                        .padding(.horizontal, Spacing.lg)
                        .padding(.vertical, Spacing.md)
                    }
                    .onChange(of: chat.messages.count) {
                        if let lastId = chat.messages.last?.id {
                            withAnimation(.smooth) {
                                proxy.scrollTo(lastId, anchor: .bottom)
                            }
                        }
                    }
                }

                // Input area
                inputArea
            }
        }
        .navigationTitle(chat.name)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .principal) {
                VStack(spacing: 2) {
                    Text(chat.name)
                        .font(.bodyMedium.weight(.semibold))
                        .foregroundStyle(Color.textPrimary)

                    Text(chat.displayPath)
                        .font(.captionSmall)
                        .foregroundStyle(Color.textTertiary)
                }
            }

            ToolbarItem(placement: .topBarTrailing) {
                Menu {
                    Button("Rename") {}
                    Button("Copy path") {}
                    Button("Delete", role: .destructive) {}
                } label: {
                    Image(systemName: "ellipsis")
                        .foregroundStyle(Color.textSecondary)
                }
            }
        }
        .task {
            await connectWebSocket()
        }
    }

    // MARK: - Input Area

    private var inputArea: some View {
        VStack(spacing: Spacing.sm) {
            Divider()
                .background(Color.surfaceBorder)

            HStack(spacing: Spacing.sm) {
                TextField("Message...", text: $inputText, axis: .vertical)
                    .textFieldStyle(AppTextFieldStyle())
                    .lineLimit(1...5)
                    .disabled(isStreaming)

                Button {
                    if isStreaming {
                        stopStreaming()
                    } else {
                        sendMessage()
                    }
                } label: {
                    Image(systemName: isStreaming ? "stop.fill" : "arrow.up")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(Color.bgPrimary)
                        .frame(width: 36, height: 36)
                        .background(inputText.isEmpty && !isStreaming ? Color.goldMuted : Color.gold)
                        .clipShape(Circle())
                }
                .disabled(inputText.isEmpty && !isStreaming)
            }
            .padding(.horizontal, Spacing.lg)

            // Model selector
            Button {
                showModelPicker.toggle()
            } label: {
                HStack(spacing: Spacing.xs) {
                    Text(selectedModel.displayName)
                        .font(.caption)
                        .foregroundStyle(Color.textSecondary)

                    Image(systemName: "chevron.down")
                        .font(.system(size: 10))
                        .foregroundStyle(Color.textTertiary)
                }
            }
            .padding(.bottom, Spacing.sm)
            .sheet(isPresented: $showModelPicker) {
                ModelPickerSheet(selected: $selectedModel)
                    .presentationDetents([.height(200)])
                    .presentationDragIndicator(.visible)
            }
        }
        .background(Color.bgPrimary)
    }

    // MARK: - Actions

    private func connectWebSocket() async {
        await ws.connect { event in
            handleWSEvent(event)
        }
    }

    private func sendMessage() {
        let text = inputText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }

        // Add user message
        let userMessage = Message(role: .user, text: text)
        var messages = chat.messages
        messages.append(userMessage)
        chat.messages = messages

        // Add streaming assistant message
        let assistantMessage = Message(
            role: .assistant,
            model: selectedModel,
            isStreaming: true
        )
        messages.append(assistantMessage)
        chat.messages = messages

        inputText = ""
        isStreaming = true

        // Send to WebSocket
        Task {
            await ws.sendMessage(
                prompt: text,
                cwd: chat.path,
                model: selectedModel,
                sessionId: chat.sessionId
            )
        }
    }

    private func stopStreaming() {
        isStreaming = false
        // Update last message
        var messages = chat.messages
        if var last = messages.last, last.role == .assistant {
            last.isStreaming = false
            messages[messages.count - 1] = last
            chat.messages = messages
        }
    }

    private func handleWSEvent(_ event: WSEvent) {
        var messages = chat.messages

        switch event {
        case .text(let text, _):
            if var last = messages.last, last.role == .assistant {
                last.text += text
                messages[messages.count - 1] = last
                chat.messages = messages
            }

        case .toolCall(let tool):
            if var last = messages.last, last.role == .assistant {
                last.toolCalls.append(tool)
                messages[messages.count - 1] = last
                chat.messages = messages
            }

        case .toolUpdate(let id, let status, let result):
            if var last = messages.last, last.role == .assistant {
                if let idx = last.toolCalls.firstIndex(where: { $0.id == id }) {
                    last.toolCalls[idx].status = status
                    last.toolCalls[idx].result = result
                    messages[messages.count - 1] = last
                    chat.messages = messages
                }
            }

        case .complete(let sessionId):
            chat.sessionId = sessionId
            chat.updatedAt = Date()
            isStreaming = false

            if var last = messages.last, last.role == .assistant {
                last.isStreaming = false
                messages[messages.count - 1] = last
                chat.messages = messages
            }

            // Auto-generate chat name from first message
            if chat.name == "New Chat", let first = messages.first {
                chat.name = String(first.text.prefix(30))
            }

        case .error(let error):
            isStreaming = false
            print("WebSocket error: \(error)")

        case .reconnecting:
            break

        case .connected, .disconnected:
            break
        }
    }
}

// MARK: - Model Picker Sheet

struct ModelPickerSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Binding var selected: AIModel

    var body: some View {
        VStack(spacing: 0) {
            ForEach(AIModel.allCases, id: \.self) { model in
                Button {
                    selected = model
                    dismiss()
                } label: {
                    HStack {
                        VStack(alignment: .leading, spacing: Spacing.xs) {
                            Text(model.displayName)
                                .font(.bodyMedium)
                                .foregroundStyle(Color.textPrimary)

                            Text(model.description)
                                .font(.caption)
                                .foregroundStyle(Color.textTertiary)
                        }

                        Spacer()

                        if model == selected {
                            Image(systemName: "checkmark")
                                .foregroundStyle(Color.gold)
                        }
                    }
                    .padding(Spacing.lg)
                }

                if model != AIModel.allCases.last {
                    Divider()
                        .background(Color.surfaceBorder)
                }
            }
        }
        .background(Color.bgSecondary)
    }
}

#Preview {
    NavigationStack {
        ChatView(chat: Chat(path: "/home/user/my-app"))
    }
    .modelContainer(for: Chat.self, inMemory: true)
}
