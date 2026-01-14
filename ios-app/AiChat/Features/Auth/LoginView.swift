//
//  LoginView.swift
//  AiChat
//

import SwiftUI

struct LoginView: View {
    @State private var token = ""
    @State private var isLoading = false
    @State private var error: String?

    let auth = AuthService.shared

    var body: some View {
        ZStack {
            Color.bgPrimary
                .ignoresSafeArea()

            VStack(spacing: Spacing.xxl) {
                Spacer()

                // Logo
                VStack(spacing: Spacing.md) {
                    Image(systemName: "diamond")
                        .font(.system(size: 48, weight: .light))
                        .foregroundStyle(Color.gold)

                    Text("AI")
                        .font(.headerLarge)
                        .foregroundStyle(Color.textPrimary)
                }

                Spacer()

                // Form
                VStack(spacing: Spacing.lg) {
                    // Token field
                    VStack(alignment: .leading, spacing: Spacing.sm) {
                        Text("Access Token")
                            .font(.caption)
                            .foregroundStyle(Color.textSecondary)

                        SecureField("", text: $token)
                            .textFieldStyle(AppTextFieldStyle())
                            .textContentType(.password)
                            .autocorrectionDisabled()
                            .textInputAutocapitalization(.never)
                    }

                    // Error
                    if let error {
                        Text(error)
                            .font(.caption)
                            .foregroundStyle(Color.error)
                    }

                    // Sign in button
                    Button {
                        signIn()
                    } label: {
                        HStack {
                            if isLoading {
                                ProgressView()
                                    .tint(Color.bgPrimary)
                            } else {
                                Text("Sign In")
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .frame(height: 50)
                        .background(token.isEmpty ? Color.goldMuted : Color.gold)
                        .foregroundStyle(Color.bgPrimary)
                        .font(.bodyMedium.weight(.semibold))
                        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
                    }
                    .disabled(token.isEmpty || isLoading)
                }
                .padding(.horizontal, Spacing.xl)

                Spacer()
                Spacer()
            }
        }
    }

    private func signIn() {
        isLoading = true
        error = nil

        Task {
            await auth.login(token: token)

            await MainActor.run {
                isLoading = false
                if !auth.isAuthenticated {
                    error = auth.error ?? "Authentication failed"
                }
            }
        }
    }
}

// MARK: - Text Field Style

struct AppTextFieldStyle: TextFieldStyle {
    func _body(configuration: TextField<Self._Label>) -> some View {
        configuration
            .padding(.horizontal, Spacing.md)
            .frame(height: 50)
            .background(Color.surface)
            .foregroundStyle(Color.textPrimary)
            .overlay(
                RoundedRectangle(cornerRadius: CornerRadius.md)
                    .stroke(Color.surfaceBorder, lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
    }
}

#Preview {
    LoginView()
}
