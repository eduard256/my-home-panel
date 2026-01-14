//
//  AuthService.swift
//  AiChat
//

import Foundation

@Observable
final class AuthService {
    static let shared = AuthService()

    private(set) var isAuthenticated = false
    private(set) var isLoading = false
    private(set) var error: String?

    private let baseURL = "https://api.panel.webaweba.com"
    private let keychain = KeychainService.shared

    private init() {
        Task {
            await checkAuth()
        }
    }

    // MARK: - Public Methods

    @MainActor
    func login(token: String) async {
        isLoading = true
        error = nil

        do {
            let jwt = try await authenticate(accessToken: token)
            try await keychain.saveToken(jwt)
            isAuthenticated = true
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }

    @MainActor
    func logout() async {
        await keychain.deleteToken()
        isAuthenticated = false
    }

    @MainActor
    func checkAuth() async {
        isAuthenticated = await keychain.hasToken
    }

    func getJWT() async -> String? {
        await keychain.getToken()
    }

    // MARK: - Private Methods

    private func authenticate(accessToken: String) async throws -> String {
        guard let url = URL(string: "\(baseURL)/api/auth/login") else {
            throw AuthError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body = ["token": accessToken]
        request.httpBody = try JSONEncoder().encode(body)

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw AuthError.invalidResponse
        }

        guard httpResponse.statusCode == 200 else {
            throw AuthError.unauthorized
        }

        let result = try JSONDecoder().decode(LoginResponse.self, from: data)
        return result.accessToken
    }
}

// MARK: - Types

private struct LoginResponse: Decodable {
    let accessToken: String
    let tokenType: String
    let expiresIn: Int

    enum CodingKeys: String, CodingKey {
        case accessToken = "access_token"
        case tokenType = "token_type"
        case expiresIn = "expires_in"
    }
}

enum AuthError: LocalizedError {
    case invalidURL
    case invalidResponse
    case unauthorized

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid server URL"
        case .invalidResponse:
            return "Invalid server response"
        case .unauthorized:
            return "Invalid access token"
        }
    }
}
