//
//  ToolExpandedView.swift
//  AiChat
//

import SwiftUI

struct ToolExpandedView: View {
    let tool: ToolCall

    var body: some View {
        Group {
            switch tool.type {
            case .read:
                ReadToolExpanded(tool: tool)
            case .write:
                WriteToolExpanded(tool: tool)
            case .edit:
                EditToolExpanded(tool: tool)
            case .bash:
                BashToolExpanded(tool: tool)
            case .glob:
                GlobToolExpanded(tool: tool)
            case .grep:
                GrepToolExpanded(tool: tool)
            default:
                GenericToolExpanded(tool: tool)
            }
        }
    }
}

// MARK: - Read Tool

struct ReadToolExpanded: View {
    let tool: ToolCall

    var body: some View {
        if let result = tool.result, let content = result.fileContent {
            CodeBlock(
                code: content,
                startLine: result.startLine ?? 1,
                maxLines: 10
            )
        }
    }
}

// MARK: - Write Tool

struct WriteToolExpanded: View {
    let tool: ToolCall

    var body: some View {
        if let content = tool.input.content {
            VStack(alignment: .leading, spacing: Spacing.xs) {
                HStack {
                    Label("NEW", systemImage: "plus.circle.fill")
                        .font(.captionSmall)
                        .foregroundStyle(Color.success)

                    Spacer()

                    Text("\(content.components(separatedBy: "\n").count) lines")
                        .font(.captionSmall)
                        .foregroundStyle(Color.textTertiary)
                }

                CodeBlock(code: content, maxLines: 10)
            }
        }
    }
}

// MARK: - Edit Tool

struct EditToolExpanded: View {
    let tool: ToolCall

    var body: some View {
        if let result = tool.result, let patch = result.structuredPatch {
            VStack(alignment: .leading, spacing: Spacing.sm) {
                ForEach(Array(patch.enumerated()), id: \.offset) { _, hunk in
                    DiffHunkView(hunk: hunk)
                }
            }
        }
    }
}

// MARK: - Diff Hunk View

struct DiffHunkView: View {
    let hunk: DiffHunk

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Hunk header
            Text("@@ -\(hunk.oldStart),\(hunk.oldLines) +\(hunk.newStart),\(hunk.newLines) @@")
                .font(.codeSmall)
                .foregroundStyle(Color.textTertiary)
                .padding(.horizontal, Spacing.sm)
                .padding(.vertical, Spacing.xs)
                .background(Color.surface)

            // Diff lines
            ForEach(Array(hunk.lines.prefix(15).enumerated()), id: \.offset) { _, line in
                if !line.hasPrefix("\\") {
                    DiffLineView(line: line)
                }
            }

            if hunk.lines.count > 15 {
                Text("... +\(hunk.lines.count - 15) more lines")
                    .font(.captionSmall)
                    .foregroundStyle(Color.textTertiary)
                    .padding(Spacing.sm)
            }
        }
        .background(Color.bgTertiary)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.sm))
    }
}

// MARK: - Diff Line View

struct DiffLineView: View {
    let line: String

    var lineType: DiffLineType {
        if line.hasPrefix("+") && !line.hasPrefix("+++") {
            return .added
        } else if line.hasPrefix("-") && !line.hasPrefix("---") {
            return .removed
        }
        return .context
    }

    var body: some View {
        HStack(spacing: 0) {
            Text(lineType.prefix)
                .font(.codeSmall)
                .foregroundStyle(lineType.color)
                .frame(width: 16)

            Text(String(line.dropFirst()))
                .font(.codeSmall)
                .foregroundStyle(lineType.color.opacity(0.9))
                .lineLimit(1)

            Spacer()
        }
        .padding(.horizontal, Spacing.sm)
        .padding(.vertical, 2)
        .background(lineType.bgColor)
    }

    enum DiffLineType {
        case added, removed, context

        var prefix: String {
            switch self {
            case .added: return "+"
            case .removed: return "-"
            case .context: return " "
            }
        }

        var color: Color {
            switch self {
            case .added: return .diffAdded
            case .removed: return .diffRemoved
            case .context: return .textTertiary
            }
        }

        var bgColor: Color {
            switch self {
            case .added: return .diffAdded.opacity(0.1)
            case .removed: return .diffRemoved.opacity(0.1)
            case .context: return .clear
            }
        }
    }
}

// MARK: - Bash Tool

struct BashToolExpanded: View {
    let tool: ToolCall

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.xs) {
            // Command
            HStack(spacing: Spacing.xs) {
                Text("$")
                    .font(.codeMedium)
                    .foregroundStyle(Color.textTertiary)

                Text(tool.input.command ?? "")
                    .font(.codeMedium)
                    .foregroundStyle(Color.success)
                    .lineLimit(2)
            }

            // Output
            if let result = tool.result {
                if let stderr = result.stderr, !stderr.isEmpty {
                    CodeBlock(code: stderr, style: .error, maxLines: 10)
                } else if let stdout = result.stdout, !stdout.isEmpty {
                    CodeBlock(code: stdout, maxLines: 10)
                }

                // Exit code
                if let exitCode = result.exitCode, exitCode != 0 {
                    Text("Exit code: \(exitCode)")
                        .font(.captionSmall)
                        .foregroundStyle(Color.error)
                }
            }
        }
        .padding(Spacing.sm)
        .background(Color.bgTertiary)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.sm))
    }
}

// MARK: - Glob Tool

struct GlobToolExpanded: View {
    let tool: ToolCall

    var body: some View {
        if let result = tool.result, let files = result.filenames {
            VStack(alignment: .leading, spacing: Spacing.xs) {
                Text("\(files.count) files found")
                    .font(.captionSmall)
                    .foregroundStyle(Color.textTertiary)

                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: Spacing.xs) {
                        ForEach(files.prefix(20), id: \.self) { file in
                            FileChip(filename: file)
                        }

                        if files.count > 20 {
                            Text("+\(files.count - 20)")
                                .font(.captionSmall)
                                .foregroundStyle(Color.textTertiary)
                        }
                    }
                }
            }
        }
    }
}

// MARK: - File Chip

struct FileChip: View {
    let filename: String

    var body: some View {
        Text(filename.components(separatedBy: "/").last ?? filename)
            .font(.codeSmall)
            .foregroundStyle(Color.textSecondary)
            .padding(.horizontal, Spacing.sm)
            .padding(.vertical, Spacing.xs)
            .background(Color.surface)
            .clipShape(RoundedRectangle(cornerRadius: CornerRadius.sm))
    }
}

// MARK: - Grep Tool

struct GrepToolExpanded: View {
    let tool: ToolCall

    var body: some View {
        if let result = tool.result, let matches = result.matches {
            let lines = matches.components(separatedBy: "\n").filter { !$0.isEmpty }

            VStack(alignment: .leading, spacing: Spacing.xs) {
                Text("\(lines.count) matches")
                    .font(.captionSmall)
                    .foregroundStyle(Color.textTertiary)

                ForEach(Array(lines.prefix(8).enumerated()), id: \.offset) { _, line in
                    Text(line)
                        .font(.codeSmall)
                        .foregroundStyle(Color.textSecondary)
                        .lineLimit(1)
                }

                if lines.count > 8 {
                    Text("+\(lines.count - 8) more")
                        .font(.captionSmall)
                        .foregroundStyle(Color.textTertiary)
                }
            }
            .padding(Spacing.sm)
            .background(Color.bgTertiary)
            .clipShape(RoundedRectangle(cornerRadius: CornerRadius.sm))
        }
    }
}

// MARK: - Generic Tool

struct GenericToolExpanded: View {
    let tool: ToolCall

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.xs) {
            if let result = tool.result?.raw {
                Text(result)
                    .font(.codeSmall)
                    .foregroundStyle(Color.textSecondary)
                    .lineLimit(10)
            }
        }
        .padding(Spacing.sm)
        .background(Color.bgTertiary)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.sm))
    }
}

// MARK: - Code Block

struct CodeBlock: View {
    let code: String
    var startLine: Int = 1
    var style: CodeStyle = .normal
    var maxLines: Int = 20

    enum CodeStyle {
        case normal, error
    }

    var body: some View {
        let lines = code.components(separatedBy: "\n")
        let displayLines = Array(lines.prefix(maxLines))

        VStack(alignment: .leading, spacing: 0) {
            ForEach(Array(displayLines.enumerated()), id: \.offset) { idx, line in
                HStack(spacing: Spacing.sm) {
                    Text("\(startLine + idx)")
                        .font(.codeSmall)
                        .foregroundStyle(Color.textMuted)
                        .frame(width: 30, alignment: .trailing)

                    Text(line)
                        .font(.codeSmall)
                        .foregroundStyle(style == .error ? Color.error : Color.textSecondary)
                        .lineLimit(1)

                    Spacer()
                }
                .padding(.vertical, 1)
            }

            if lines.count > maxLines {
                Text("... +\(lines.count - maxLines) more lines")
                    .font(.captionSmall)
                    .foregroundStyle(Color.textTertiary)
                    .padding(.top, Spacing.xs)
            }
        }
        .padding(Spacing.sm)
        .background(Color.bgTertiary)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.sm))
    }
}
