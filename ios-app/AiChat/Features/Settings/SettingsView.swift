//
//  SettingsView.swift
//  AiChat
//

import SwiftUI
import SwiftData

struct SettingsView: View {
    @Environment(\.modelContext) private var modelContext
    @Query private var presets: [PathPreset]

    @State private var defaultModel: AIModel = .sonnet
    @State private var iCloudEnabled = true

    let auth = AuthService.shared

    var body: some View {
        ZStack {
            Color.bgPrimary
                .ignoresSafeArea()

            ScrollView {
                VStack(spacing: Spacing.xl) {
                    // Account section
                    SettingsSection(title: "ACCOUNT") {
                        HStack {
                            Text("Connected")
                                .font(.bodyMedium)
                                .foregroundStyle(Color.textPrimary)

                            Spacer()

                            Circle()
                                .fill(Color.success)
                                .frame(width: 8, height: 8)
                        }
                        .padding(Spacing.md)
                    }

                    // Presets section
                    SettingsSection(title: "PATH PRESETS") {
                        VStack(spacing: 0) {
                            ForEach(presets) { preset in
                                PresetRow(preset: preset) {
                                    modelContext.delete(preset)
                                }

                                if preset.id != presets.last?.id {
                                    Divider()
                                        .background(Color.surfaceBorder)
                                }
                            }

                            Button {
                                // Add preset handled by alert
                            } label: {
                                HStack {
                                    Image(systemName: "plus")
                                        .foregroundStyle(Color.gold)
                                    Text("Add preset")
                                        .font(.bodyMedium)
                                        .foregroundStyle(Color.textSecondary)
                                    Spacer()
                                }
                                .padding(Spacing.md)
                            }
                        }
                    }

                    // Model section
                    SettingsSection(title: "DEFAULT MODEL") {
                        HStack(spacing: Spacing.sm) {
                            ForEach(AIModel.allCases, id: \.self) { model in
                                ModelButton(
                                    model: model,
                                    isSelected: defaultModel == model
                                ) {
                                    defaultModel = model
                                }
                            }
                        }
                        .padding(Spacing.md)
                    }

                    // Sync section
                    SettingsSection(title: "SYNC") {
                        Toggle(isOn: $iCloudEnabled) {
                            Text("iCloud Sync")
                                .font(.bodyMedium)
                                .foregroundStyle(Color.textPrimary)
                        }
                        .tint(Color.gold)
                        .padding(Spacing.md)
                    }

                    // Sign out
                    Button {
                        Task {
                            await auth.logout()
                        }
                    } label: {
                        Text("Sign Out")
                            .font(.bodyMedium)
                            .foregroundStyle(Color.error)
                            .frame(maxWidth: .infinity)
                            .padding(Spacing.md)
                            .background(Color.surface)
                            .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
                            .overlay(
                                RoundedRectangle(cornerRadius: CornerRadius.md)
                                    .stroke(Color.surfaceBorder, lineWidth: 1)
                            )
                    }
                }
                .padding(Spacing.lg)
            }
        }
        .navigationTitle("Settings")
        .navigationBarTitleDisplayMode(.inline)
    }
}

// MARK: - Settings Section

struct SettingsSection<Content: View>: View {
    let title: String
    @ViewBuilder let content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            Text(title)
                .font(.captionMedium)
                .foregroundStyle(Color.textTertiary)
                .padding(.leading, Spacing.xs)

            VStack(spacing: 0) {
                content
            }
            .background(Color.surface)
            .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
            .overlay(
                RoundedRectangle(cornerRadius: CornerRadius.md)
                    .stroke(Color.surfaceBorder, lineWidth: 1)
            )
        }
    }
}

// MARK: - Preset Row

struct PresetRow: View {
    let preset: PathPreset
    let onDelete: () -> Void

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: Spacing.xs) {
                Text(preset.name)
                    .font(.bodyMedium)
                    .foregroundStyle(Color.textPrimary)

                Text(preset.path)
                    .font(.caption)
                    .foregroundStyle(Color.textTertiary)
            }

            Spacer()

            Button {
                onDelete()
            } label: {
                Image(systemName: "xmark")
                    .font(.caption)
                    .foregroundStyle(Color.textTertiary)
            }
        }
        .padding(Spacing.md)
    }
}

// MARK: - Model Button

struct ModelButton: View {
    let model: AIModel
    let isSelected: Bool
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: Spacing.xs) {
                Circle()
                    .fill(isSelected ? Color.gold : Color.clear)
                    .stroke(isSelected ? Color.gold : Color.textTertiary, lineWidth: 1.5)
                    .frame(width: 16, height: 16)

                Text(model.displayName)
                    .font(.captionMedium)
                    .foregroundStyle(isSelected ? Color.textPrimary : Color.textSecondary)
            }
            .padding(.horizontal, Spacing.md)
            .padding(.vertical, Spacing.sm)
            .background(isSelected ? Color.gold.opacity(0.1) : Color.clear)
            .clipShape(RoundedRectangle(cornerRadius: CornerRadius.sm))
        }
    }
}

#Preview {
    NavigationStack {
        SettingsView()
    }
    .modelContainer(for: PathPreset.self, inMemory: true)
}
