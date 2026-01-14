//
//  AiChatApp.swift
//  AiChat
//

import SwiftUI
import SwiftData

@main
struct AiChatApp: App {
    let auth = AuthService.shared

    var sharedModelContainer: ModelContainer = {
        let schema = Schema([
            Chat.self,
            PathPreset.self,
            AppSettings.self
        ])
        let modelConfiguration = ModelConfiguration(
            schema: schema,
            isStoredInMemoryOnly: false,
            cloudKitDatabase: .automatic
        )

        do {
            return try ModelContainer(for: schema, configurations: [modelConfiguration])
        } catch {
            fatalError("Could not create ModelContainer: \(error)")
        }
    }()

    var body: some Scene {
        WindowGroup {
            RootView()
                .preferredColorScheme(.dark)
        }
        .modelContainer(sharedModelContainer)
    }
}

// MARK: - Root View

struct RootView: View {
    let auth = AuthService.shared

    var body: some View {
        Group {
            if auth.isAuthenticated {
                ChatListView()
            } else {
                LoginView()
            }
        }
        .animation(.smooth, value: auth.isAuthenticated)
    }
}
