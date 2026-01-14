//
//  ChatListView.swift
//  AiChat
//

import SwiftUI
import SwiftData

struct ChatListView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \Chat.updatedAt, order: .reverse) private var chats: [Chat]

    @State private var showNewChat = false
    @State private var selectedChat: Chat?

    var body: some View {
        NavigationStack {
            ZStack {
                Color.bgPrimary
                    .ignoresSafeArea()

                if chats.isEmpty {
                    emptyState
                } else {
                    chatList
                }

                // FAB
                VStack {
                    Spacer()
                    HStack {
                        Spacer()
                        fabButton
                    }
                    .padding(.trailing, Spacing.lg)
                    .padding(.bottom, Spacing.lg)
                }
            }
            .navigationTitle("Chats")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    NavigationLink {
                        SettingsView()
                    } label: {
                        Image(systemName: "gearshape")
                            .foregroundStyle(Color.textSecondary)
                    }
                }
            }
            .navigationDestination(item: $selectedChat) { chat in
                ChatView(chat: chat)
            }
            .sheet(isPresented: $showNewChat) {
                NewChatSheet { path in
                    createChat(path: path)
                }
                .presentationDetents([.medium])
                .presentationDragIndicator(.visible)
            }
        }
        .tint(Color.gold)
    }

    // MARK: - Components

    private var emptyState: some View {
        VStack(spacing: Spacing.lg) {
            Image(systemName: "diamond")
                .font(.system(size: 48, weight: .light))
                .foregroundStyle(Color.gold.opacity(0.5))

            Text("No chats yet")
                .font(.bodyMedium)
                .foregroundStyle(Color.textTertiary)
        }
    }

    private var chatList: some View {
        ScrollView {
            LazyVStack(spacing: Spacing.sm) {
                ForEach(chats) { chat in
                    ChatRow(chat: chat)
                        .onTapGesture {
                            selectedChat = chat
                        }
                }
            }
            .padding(.horizontal, Spacing.lg)
            .padding(.top, Spacing.sm)
        }
    }

    private var fabButton: some View {
        Button {
            showNewChat = true
        } label: {
            Image(systemName: "plus")
                .font(.system(size: 20, weight: .medium))
                .foregroundStyle(Color.bgPrimary)
                .frame(width: 56, height: 56)
                .background(Color.gold)
                .clipShape(Circle())
                .shadow(color: Color.gold.opacity(0.3), radius: 8, y: 4)
        }
    }

    // MARK: - Actions

    private func createChat(path: String) {
        let chat = Chat(path: path)
        modelContext.insert(chat)
        selectedChat = chat
    }
}

// MARK: - Chat Row

struct ChatRow: View {
    let chat: Chat

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.xs) {
            HStack {
                Text(chat.name)
                    .font(.bodyMedium)
                    .foregroundStyle(Color.textPrimary)
                    .lineLimit(1)

                Spacer()

                Text(chat.updatedAt.timeAgo)
                    .font(.caption)
                    .foregroundStyle(Color.textTertiary)
            }

            Text(chat.displayPath)
                .font(.caption)
                .foregroundStyle(Color.textSecondary)
                .lineLimit(1)
        }
        .padding(Spacing.md)
        .background(Color.surface)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
        .overlay(
            RoundedRectangle(cornerRadius: CornerRadius.md)
                .stroke(Color.surfaceBorder, lineWidth: 1)
        )
    }
}

// MARK: - Date Extension

extension Date {
    var timeAgo: String {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .abbreviated
        return formatter.localizedString(for: self, relativeTo: Date())
    }
}

#Preview {
    ChatListView()
        .modelContainer(for: Chat.self, inMemory: true)
}
