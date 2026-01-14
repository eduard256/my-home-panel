//
//  MarkdownView.swift
//  AiChat
//
//  Full Markdown parser with tables, code blocks, lists, etc.
//

import SwiftUI

// MARK: - Markdown View

struct MarkdownView: View {
    let text: String

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            ForEach(Array(parseBlocks(text).enumerated()), id: \.offset) { _, block in
                BlockView(block: block)
            }
        }
    }
}

// MARK: - Block Types

enum MarkdownBlock {
    case paragraph(AttributedString)
    case heading(level: Int, text: String)
    case codeBlock(language: String?, code: String)
    case blockquote(String)
    case unorderedList([String])
    case orderedList([String])
    case table(headers: [String], rows: [[String]])
    case horizontalRule
    case empty
}

// MARK: - Block View

struct BlockView: View {
    let block: MarkdownBlock

    var body: some View {
        switch block {
        case .paragraph(let attributed):
            Text(attributed)
                .font(.bodyMedium)
                .foregroundStyle(Color.textPrimary)
                .textSelection(.enabled)

        case .heading(let level, let text):
            HeadingView(level: level, text: text)

        case .codeBlock(let language, let code):
            CodeBlockView(language: language, code: code)

        case .blockquote(let text):
            BlockquoteView(text: text)

        case .unorderedList(let items):
            UnorderedListView(items: items)

        case .orderedList(let items):
            OrderedListView(items: items)

        case .table(let headers, let rows):
            TableView(headers: headers, rows: rows)

        case .horizontalRule:
            Divider()
                .background(Color.surfaceBorder)
                .padding(.vertical, Spacing.sm)

        case .empty:
            EmptyView()
        }
    }
}

// MARK: - Heading View

struct HeadingView: View {
    let level: Int
    let text: String

    var body: some View {
        Text(text)
            .font(fontForLevel)
            .foregroundStyle(Color.textPrimary)
            .padding(.top, level == 1 ? Spacing.md : Spacing.sm)
    }

    private var fontForLevel: Font {
        switch level {
        case 1: return .headerLarge
        case 2: return .headerMedium
        case 3: return .headerSmall
        default: return .bodyMedium.weight(.semibold)
        }
    }
}

// MARK: - Code Block View

struct CodeBlockView: View {
    let language: String?
    let code: String

    @State private var isCopied = false

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Header with language
            if let lang = language, !lang.isEmpty {
                HStack {
                    Text(lang)
                        .font(.captionSmall)
                        .foregroundStyle(Color.textTertiary)

                    Spacer()

                    Button {
                        copyToClipboard()
                    } label: {
                        Image(systemName: isCopied ? "checkmark" : "doc.on.doc")
                            .font(.caption)
                            .foregroundStyle(isCopied ? Color.success : Color.textTertiary)
                    }
                }
                .padding(.horizontal, Spacing.sm)
                .padding(.vertical, Spacing.xs)
                .background(Color.bgTertiary)
            }

            // Code content
            ScrollView(.horizontal, showsIndicators: false) {
                Text(code)
                    .font(.codeMedium)
                    .foregroundStyle(Color.textSecondary)
                    .textSelection(.enabled)
                    .padding(Spacing.sm)
            }
        }
        .background(Color.bgTertiary)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.sm))
        .overlay(
            RoundedRectangle(cornerRadius: CornerRadius.sm)
                .stroke(Color.surfaceBorder, lineWidth: 1)
        )
    }

    private func copyToClipboard() {
        UIPasteboard.general.string = code
        isCopied = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
            isCopied = false
        }
    }
}

// MARK: - Blockquote View

struct BlockquoteView: View {
    let text: String

    var body: some View {
        HStack(spacing: Spacing.sm) {
            Rectangle()
                .fill(Color.gold.opacity(0.5))
                .frame(width: 3)

            Text(text)
                .font(.bodyMedium)
                .foregroundStyle(Color.textSecondary)
                .italic()
        }
        .padding(.vertical, Spacing.xs)
    }
}

// MARK: - Unordered List View

struct UnorderedListView: View {
    let items: [String]

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.xs) {
            ForEach(Array(items.enumerated()), id: \.offset) { _, item in
                HStack(alignment: .top, spacing: Spacing.sm) {
                    Text("•")
                        .font(.bodyMedium)
                        .foregroundStyle(Color.gold)

                    Text(parseInline(item))
                        .font(.bodyMedium)
                        .foregroundStyle(Color.textPrimary)
                }
            }
        }
    }
}

// MARK: - Ordered List View

struct OrderedListView: View {
    let items: [String]

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.xs) {
            ForEach(Array(items.enumerated()), id: \.offset) { idx, item in
                HStack(alignment: .top, spacing: Spacing.sm) {
                    Text("\(idx + 1).")
                        .font(.bodyMedium)
                        .foregroundStyle(Color.gold)
                        .frame(width: 24, alignment: .trailing)

                    Text(parseInline(item))
                        .font(.bodyMedium)
                        .foregroundStyle(Color.textPrimary)
                }
            }
        }
    }
}

// MARK: - Table View

struct TableView: View {
    let headers: [String]
    let rows: [[String]]

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            VStack(spacing: 0) {
                // Header row
                HStack(spacing: 0) {
                    ForEach(Array(headers.enumerated()), id: \.offset) { idx, header in
                        Text(header)
                            .font(.captionMedium)
                            .foregroundStyle(Color.textPrimary)
                            .frame(minWidth: 80, alignment: .leading)
                            .padding(.horizontal, Spacing.sm)
                            .padding(.vertical, Spacing.sm)
                            .background(Color.bgTertiary)

                        if idx < headers.count - 1 {
                            Divider()
                                .background(Color.surfaceBorder)
                        }
                    }
                }

                Divider()
                    .background(Color.gold.opacity(0.3))

                // Data rows
                ForEach(Array(rows.enumerated()), id: \.offset) { rowIdx, row in
                    HStack(spacing: 0) {
                        ForEach(Array(row.enumerated()), id: \.offset) { idx, cell in
                            Text(cell)
                                .font(.caption)
                                .foregroundStyle(Color.textSecondary)
                                .frame(minWidth: 80, alignment: .leading)
                                .padding(.horizontal, Spacing.sm)
                                .padding(.vertical, Spacing.sm)

                            if idx < row.count - 1 {
                                Divider()
                                    .background(Color.surfaceBorder)
                            }
                        }
                    }
                    .background(rowIdx % 2 == 0 ? Color.clear : Color.surface)

                    if rowIdx < rows.count - 1 {
                        Divider()
                            .background(Color.surfaceBorder)
                    }
                }
            }
            .clipShape(RoundedRectangle(cornerRadius: CornerRadius.sm))
            .overlay(
                RoundedRectangle(cornerRadius: CornerRadius.sm)
                    .stroke(Color.surfaceBorder, lineWidth: 1)
            )
        }
    }
}

// MARK: - Parsing Functions

private func parseBlocks(_ text: String) -> [MarkdownBlock] {
    var blocks: [MarkdownBlock] = []
    let lines = text.components(separatedBy: "\n")
    var i = 0

    while i < lines.count {
        let line = lines[i]
        let trimmed = line.trimmingCharacters(in: .whitespaces)

        // Empty line
        if trimmed.isEmpty {
            i += 1
            continue
        }

        // Horizontal rule
        if trimmed.matches(of: /^(-{3,}|\*{3,}|_{3,})$/).count > 0 {
            blocks.append(.horizontalRule)
            i += 1
            continue
        }

        // Heading
        if let match = trimmed.firstMatch(of: /^(#{1,6})\s+(.+)$/) {
            let level = match.1.count
            let text = String(match.2)
            blocks.append(.heading(level: level, text: text))
            i += 1
            continue
        }

        // Code block
        if trimmed.hasPrefix("```") {
            let language = String(trimmed.dropFirst(3))
            var codeLines: [String] = []
            i += 1

            while i < lines.count && !lines[i].trimmingCharacters(in: .whitespaces).hasPrefix("```") {
                codeLines.append(lines[i])
                i += 1
            }
            i += 1 // Skip closing ```

            blocks.append(.codeBlock(language: language.isEmpty ? nil : language, code: codeLines.joined(separator: "\n")))
            continue
        }

        // Blockquote
        if trimmed.hasPrefix(">") {
            var quoteLines: [String] = []
            while i < lines.count && lines[i].trimmingCharacters(in: .whitespaces).hasPrefix(">") {
                let quoteLine = lines[i].trimmingCharacters(in: .whitespaces).dropFirst().trimmingCharacters(in: .whitespaces)
                quoteLines.append(quoteLine)
                i += 1
            }
            blocks.append(.blockquote(quoteLines.joined(separator: " ")))
            continue
        }

        // Table
        if trimmed.hasPrefix("|") && i + 1 < lines.count {
            let nextLine = lines[i + 1].trimmingCharacters(in: .whitespaces)
            if nextLine.contains("---") || nextLine.contains(":-") {
                // Parse table
                let headers = parseTableRow(trimmed)
                var tableRows: [[String]] = []
                i += 2 // Skip header and separator

                while i < lines.count {
                    let rowLine = lines[i].trimmingCharacters(in: .whitespaces)
                    if !rowLine.hasPrefix("|") { break }
                    tableRows.append(parseTableRow(rowLine))
                    i += 1
                }

                blocks.append(.table(headers: headers, rows: tableRows))
                continue
            }
        }

        // Unordered list
        if trimmed.hasPrefix("- ") || trimmed.hasPrefix("* ") || trimmed.hasPrefix("+ ") {
            var items: [String] = []
            while i < lines.count {
                let listLine = lines[i].trimmingCharacters(in: .whitespaces)
                if listLine.hasPrefix("- ") || listLine.hasPrefix("* ") || listLine.hasPrefix("+ ") {
                    items.append(String(listLine.dropFirst(2)))
                    i += 1
                } else if listLine.hasPrefix("  ") && !items.isEmpty {
                    // Continuation of previous item
                    items[items.count - 1] += " " + listLine.trimmingCharacters(in: .whitespaces)
                    i += 1
                } else {
                    break
                }
            }
            blocks.append(.unorderedList(items))
            continue
        }

        // Ordered list
        if let _ = trimmed.firstMatch(of: /^\d+\.\s+/) {
            var items: [String] = []
            while i < lines.count {
                let listLine = lines[i].trimmingCharacters(in: .whitespaces)
                if let match = listLine.firstMatch(of: /^\d+\.\s+(.+)$/) {
                    items.append(String(match.1))
                    i += 1
                } else if listLine.hasPrefix("   ") && !items.isEmpty {
                    items[items.count - 1] += " " + listLine.trimmingCharacters(in: .whitespaces)
                    i += 1
                } else {
                    break
                }
            }
            blocks.append(.orderedList(items))
            continue
        }

        // Paragraph
        var paragraphLines: [String] = []
        while i < lines.count {
            let pLine = lines[i]
            let pTrimmed = pLine.trimmingCharacters(in: .whitespaces)
            if pTrimmed.isEmpty || pTrimmed.hasPrefix("#") || pTrimmed.hasPrefix("```") ||
               pTrimmed.hasPrefix(">") || pTrimmed.hasPrefix("- ") || pTrimmed.hasPrefix("* ") ||
               pTrimmed.hasPrefix("|") || pTrimmed.matches(of: /^\d+\.\s+/).count > 0 {
                break
            }
            paragraphLines.append(pTrimmed)
            i += 1
        }

        if !paragraphLines.isEmpty {
            let paragraphText = paragraphLines.joined(separator: " ")
            blocks.append(.paragraph(parseInline(paragraphText)))
        }
    }

    return blocks
}

private func parseTableRow(_ row: String) -> [String] {
    row.split(separator: "|")
        .map { $0.trimmingCharacters(in: .whitespaces) }
        .filter { !$0.isEmpty }
}

private func parseInline(_ text: String) -> AttributedString {
    var result = AttributedString(text)

    // Bold **text** or __text__
    if let range = result.range(of: "**", options: .literal) {
        // Process bold - simplified for now
    }

    // Apply basic styling
    do {
        result = try AttributedString(markdown: text, options: AttributedString.MarkdownParsingOptions(
            interpretedSyntax: .inlineOnlyPreservingWhitespace
        ))
    } catch {
        result = AttributedString(text)
    }

    return result
}

// MARK: - Preview

#Preview {
    ScrollView {
        MarkdownView(text: """
        # Heading 1

        ## Heading 2

        This is a paragraph with **bold** and *italic* text.

        ### Code Example

        ```swift
        func hello() {
            print("Hello, World!")
        }
        ```

        > This is a blockquote with some important information.

        ### Unordered List

        - First item
        - Second item
        - Third item

        ### Ordered List

        1. Step one
        2. Step two
        3. Step three

        ### Table

        | Name | Age | City |
        |------|-----|------|
        | John | 30 | NYC |
        | Jane | 25 | LA |
        | Bob | 35 | Chicago |

        ---

        That's all folks!
        """)
        .padding()
    }
    .background(Color.bgPrimary)
}
