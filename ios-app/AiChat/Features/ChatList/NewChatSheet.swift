//
//  NewChatSheet.swift
//  AiChat
//

import SwiftUI
import SwiftData

struct NewChatSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Query(sort: \PathPreset.createdAt) private var presets: [PathPreset]

    @State private var path = "/home/user/"

    let onCreate: (String) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.xl) {
            // Header
            Text("New Chat")
                .font(.headerMedium)
                .foregroundStyle(Color.textPrimary)

            // Path input
            VStack(alignment: .leading, spacing: Spacing.sm) {
                Text("Path")
                    .font(.caption)
                    .foregroundStyle(Color.textSecondary)

                TextField("", text: $path)
                    .textFieldStyle(AppTextFieldStyle())
                    .autocorrectionDisabled()
                    .textInputAutocapitalization(.never)
            }

            // Presets
            if !presets.isEmpty {
                VStack(alignment: .leading, spacing: Spacing.sm) {
                    Text("Presets")
                        .font(.caption)
                        .foregroundStyle(Color.textSecondary)

                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: Spacing.sm) {
                            ForEach(presets) { preset in
                                PresetChip(preset: preset) {
                                    path = preset.path
                                }
                            }

                            AddPresetButton()
                        }
                    }
                }
            }

            Spacer()

            // Create button
            Button {
                onCreate(path)
                dismiss()
            } label: {
                Text("Create")
                    .frame(maxWidth: .infinity)
                    .frame(height: 50)
                    .background(path.count > "/home/user/".count ? Color.gold : Color.goldMuted)
                    .foregroundStyle(Color.bgPrimary)
                    .font(.bodyMedium.weight(.semibold))
                    .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
            }
            .disabled(path.count <= "/home/user/".count)
        }
        .padding(Spacing.xl)
        .background(Color.bgSecondary)
    }
}

// MARK: - Preset Chip

struct PresetChip: View {
    let preset: PathPreset
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            Text(preset.name)
                .font(.captionMedium)
                .foregroundStyle(Color.textPrimary)
                .padding(.horizontal, Spacing.md)
                .padding(.vertical, Spacing.sm)
                .background(Color.surface)
                .clipShape(RoundedRectangle(cornerRadius: CornerRadius.sm))
                .overlay(
                    RoundedRectangle(cornerRadius: CornerRadius.sm)
                        .stroke(Color.surfaceBorder, lineWidth: 1)
                )
        }
    }
}

// MARK: - Add Preset Button

struct AddPresetButton: View {
    @Environment(\.modelContext) private var modelContext
    @State private var showingAlert = false
    @State private var presetName = ""
    @State private var presetPath = "/home/user/"

    var body: some View {
        Button {
            showingAlert = true
        } label: {
            Image(systemName: "plus")
                .font(.caption)
                .foregroundStyle(Color.textTertiary)
                .padding(.horizontal, Spacing.md)
                .padding(.vertical, Spacing.sm)
                .background(Color.surface)
                .clipShape(RoundedRectangle(cornerRadius: CornerRadius.sm))
                .overlay(
                    RoundedRectangle(cornerRadius: CornerRadius.sm)
                        .stroke(Color.surfaceBorder, lineWidth: 1)
                )
        }
        .alert("New Preset", isPresented: $showingAlert) {
            TextField("Name", text: $presetName)
            TextField("Path", text: $presetPath)
            Button("Cancel", role: .cancel) {}
            Button("Add") {
                let preset = PathPreset(name: presetName, path: presetPath)
                modelContext.insert(preset)
                presetName = ""
                presetPath = "/home/user/"
            }
        }
    }
}

#Preview {
    NewChatSheet { _ in }
        .modelContainer(for: PathPreset.self, inMemory: true)
}
