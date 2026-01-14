//
//  Theme.swift
//  AiChat
//

import SwiftUI

// MARK: - Colors

extension Color {
    // Background
    static let bgPrimary = Color(hex: "09090B")
    static let bgSecondary = Color(hex: "0F0F11")
    static let bgTertiary = Color(hex: "18181B")

    // Surface (cards, inputs)
    static let surface = Color.white.opacity(0.03)
    static let surfaceHover = Color.white.opacity(0.05)
    static let surfaceBorder = Color.white.opacity(0.06)

    // Gold accent
    static let gold = Color(hex: "C9A962")
    static let goldLight = Color(hex: "D4B978")
    static let goldMuted = Color(hex: "8B7355")

    // Text
    static let textPrimary = Color(hex: "F4F4F5")
    static let textSecondary = Color(hex: "A1A1AA")
    static let textTertiary = Color(hex: "52525B")
    static let textMuted = Color(hex: "3F3F46")

    // Semantic
    static let success = Color(hex: "22C55E")
    static let error = Color(hex: "EF4444")
    static let warning = Color(hex: "F59E0B")

    // Diff colors
    static let diffAdded = Color(hex: "22C55E")
    static let diffRemoved = Color(hex: "EF4444")

    // Timeline
    static let timelineLine = Color(hex: "27272A")
}

// MARK: - Hex Color Init

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3:
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6:
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8:
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}

// MARK: - Typography

extension Font {
    // Headers
    static let headerLarge = Font.system(size: 28, weight: .semibold, design: .default)
    static let headerMedium = Font.system(size: 20, weight: .semibold, design: .default)
    static let headerSmall = Font.system(size: 17, weight: .semibold, design: .default)

    // Body
    static let bodyLarge = Font.system(size: 17, weight: .regular, design: .default)
    static let bodyMedium = Font.system(size: 15, weight: .regular, design: .default)
    static let bodySmall = Font.system(size: 13, weight: .regular, design: .default)

    // Captions
    static let caption = Font.system(size: 12, weight: .regular, design: .default)
    static let captionMedium = Font.system(size: 12, weight: .medium, design: .default)
    static let captionSmall = Font.system(size: 11, weight: .regular, design: .default)

    // Code
    static let codeLarge = Font.system(size: 14, weight: .regular, design: .monospaced)
    static let codeMedium = Font.system(size: 12, weight: .regular, design: .monospaced)
    static let codeSmall = Font.system(size: 11, weight: .regular, design: .monospaced)
}

// MARK: - Spacing

enum Spacing {
    static let xs: CGFloat = 4
    static let sm: CGFloat = 8
    static let md: CGFloat = 12
    static let lg: CGFloat = 16
    static let xl: CGFloat = 24
    static let xxl: CGFloat = 32
}

// MARK: - Corner Radius

enum CornerRadius {
    static let sm: CGFloat = 8
    static let md: CGFloat = 12
    static let lg: CGFloat = 16
    static let xl: CGFloat = 20
    static let full: CGFloat = 100
}

// MARK: - Animation

extension Animation {
    static let smooth = Animation.spring(response: 0.3, dampingFraction: 0.8)
    static let quick = Animation.spring(response: 0.2, dampingFraction: 0.9)
    static let gentle = Animation.spring(response: 0.4, dampingFraction: 0.7)
}
