//
//  MessageView.swift
//  AiChat
//

import SwiftUI

struct MessageView: View {
    let message: Message

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            if message.role == .user {
                userMessage
            } else {
                assistantMessage
            }
        }
        .padding(.vertical, Spacing.md)
    }

    // MARK: - User Message

    private var userMessage: some View {
        HStack {
            Spacer()

            VStack(alignment: .trailing, spacing: Spacing.xs) {
                Text(message.timestamp.formatted(date: .omitted, time: .shortened))
                    .font(.captionSmall)
                    .foregroundStyle(Color.textTertiary)

                Text(message.text)
                    .font(.bodyMedium)
                    .foregroundStyle(Color.textPrimary)
                    .padding(Spacing.md)
                    .background(.ultraThinMaterial)
                    .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
            }
        }
    }

    // MARK: - Assistant Message

    private var assistantMessage: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {

            // Header with time and model
            HStack(spacing: Spacing.sm) {
                Text(message.timestamp.formatted(date: .omitted, time: .shortened))
                    .font(.captionSmall)
                    .foregroundStyle(Color.textTertiary)

                if let model = message.model {
                    Text(model.displayName)
                        .font(.captionSmall)
                        .foregroundStyle(Color.gold)
                }

                if message.isStreaming {
                    ProgressView()
                        .scaleEffect(0.6)
                }
            }

            // Content in chronological order
            ForEach(message.content) { item in
                switch item.type {
                case .text:
                    if let text = item.text, !text.isEmpty {
                        MarkdownView(text: text)
                    }
                case .tool:
                    if let tool = item.toolCall {
                        ToolRow(tool: tool, isLast: item.id == message.content.last?.id)
                    }
                }
            }

            // Streaming cursor when empty
            if message.isStreaming && message.content.isEmpty {
                HStack(spacing: 4) {
                    Rectangle()
                        .fill(Color.gold)
                        .frame(width: 2, height: 16)
                        .opacity(0.8)
                }
                .padding(.leading, Spacing.sm)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

// MARK: - Tool Row

struct ToolRow: View {
    let tool: ToolCall
    let isLast: Bool

    @State private var isExpanded = false

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Tool header
            Button {
                if hasExpandableContent {
                    withAnimation(.quick) {
                        isExpanded.toggle()
                    }
                }
            } label: {
                HStack(spacing: Spacing.sm) {
                    // Status indicator
                    statusIndicator

                    // Tool name + summary
                    HStack(spacing: Spacing.xs) {
                        Text(tool.displayName)
                            .font(.captionMedium)
                            .foregroundStyle(Color.textSecondary)

                        Text(tool.summary)
                            .font(.caption)
                            .foregroundStyle(Color.textTertiary)
                            .lineLimit(1)
                    }

                    Spacer()

                    // Diff stats for Edit
                    if tool.type == .edit, let result = tool.result {
                        diffStats(added: result.diffAdded ?? 0, removed: result.diffRemoved ?? 0)
                    }

                    // Expand chevron
                    if hasExpandableContent {
                        Image(systemName: "chevron.right")
                            .font(.system(size: 10))
                            .foregroundStyle(Color.textTertiary)
                            .rotationEffect(.degrees(isExpanded ? 90 : 0))
                    }
                }
                .padding(.vertical, Spacing.xs)
            }
            .buttonStyle(.plain)

            // Expanded content
            if isExpanded {
                ToolExpandedView(tool: tool)
                    .padding(.leading, Spacing.xl)
                    .padding(.bottom, Spacing.sm)
            }

            // Timeline connector
            if !isLast {
                Rectangle()
                    .fill(Color.timelineLine)
                    .frame(width: 1, height: 12)
                    .padding(.leading, 5)
            }
        }
    }

    private var statusIndicator: some View {
        Group {
            switch tool.status {
            case .pending:
                Circle()
                    .stroke(Color.textTertiary, lineWidth: 1.5)
                    .frame(width: 10, height: 10)

            case .running:
                Circle()
                    .stroke(Color.gold, lineWidth: 2)
                    .frame(width: 10, height: 10)
                    .overlay(
                        Circle()
                            .fill(Color.gold.opacity(0.3))
                            .frame(width: 6, height: 6)
                    )
                    .modifier(PulseModifier())

            case .completed:
                Circle()
                    .fill(Color.gold)
                    .frame(width: 10, height: 10)

            case .error:
                Image(systemName: "xmark")
                    .font(.system(size: 8, weight: .bold))
                    .foregroundStyle(Color.error)
                    .frame(width: 10, height: 10)
            }
        }
    }

    private func diffStats(added: Int, removed: Int) -> some View {
        HStack(spacing: Spacing.xs) {
            Text("+\(added)")
                .font(.captionSmall)
                .foregroundStyle(Color.diffAdded)

            Text("-\(removed)")
                .font(.captionSmall)
                .foregroundStyle(Color.diffRemoved)
        }
    }

    private var hasExpandableContent: Bool {
        switch tool.type {
        case .read, .write, .edit, .bash, .glob, .grep:
            return tool.status == .completed
        default:
            return false
        }
    }
}

// MARK: - Pulse Modifier

struct PulseModifier: ViewModifier {
    @State private var isPulsing = false

    func body(content: Content) -> some View {
        content
            .scaleEffect(isPulsing ? 1.2 : 1.0)
            .opacity(isPulsing ? 0.7 : 1.0)
            .animation(
                .easeInOut(duration: 0.8)
                .repeatForever(autoreverses: true),
                value: isPulsing
            )
            .onAppear {
                isPulsing = true
            }
    }
}

#Preview {
    VStack {
        MessageView(message: Message(
            role: .user,
            text: "Fix the login bug"
        ))

        MessageView(message: Message(
            role: .assistant,
            content: [
                .text("Let me check the file first."),
                .tool(ToolCall(
                    id: "1",
                    type: .read,
                    status: .completed,
                    timestamp: Date(),
                    input: ToolInput(filePath: "src/auth/login.ts"),
                    result: nil
                )),
                .text("I found the issue. Let me fix it."),
                .tool(ToolCall(
                    id: "2",
                    type: .edit,
                    status: .running,
                    timestamp: Date(),
                    input: ToolInput(filePath: "src/auth/login.ts"),
                    result: ToolResult(diffAdded: 3, diffRemoved: 1)
                ))
            ],
            model: .sonnet
        ))
    }
    .padding()
    .background(Color.bgPrimary)
}
