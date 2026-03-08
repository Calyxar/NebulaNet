// hooks/useThemeStyles.ts
// One hook to theme every screen automatically.
// Usage: const ts = useThemeStyles();
// Then use ts.container, ts.card, ts.text, ts.input, etc.

import { useTheme } from "@/providers/ThemeProvider";
import { useMemo } from "react";
import { StyleSheet } from "react-native";

export function useThemeStyles() {
  const { colors, isDark } = useTheme();

  return useMemo(
    () =>
      StyleSheet.create({
        // ── Containers ──────────────────────────────────────
        safe: {
          flex: 1,
          backgroundColor: colors.background,
        },
        container: {
          flex: 1,
          backgroundColor: colors.background,
        },
        scroll: {
          flex: 1,
          backgroundColor: colors.background,
        },
        scrollContent: {
          paddingHorizontal: 16,
          paddingBottom: 32,
        },
        center: {
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.background,
        },

        // ── Cards ───────────────────────────────────────────
        card: {
          backgroundColor: colors.card,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 16,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.3 : 0.06,
          shadowRadius: 8,
          elevation: 2,
        },
        cardLarge: {
          backgroundColor: colors.card,
          borderRadius: 22,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 18,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isDark ? 0.35 : 0.08,
          shadowRadius: 14,
          elevation: 3,
        },
        surface: {
          backgroundColor: colors.surface,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.border,
        },

        // ── Header ──────────────────────────────────────────
        header: {
          flexDirection: "row" as const,
          alignItems: "center" as const,
          justifyContent: "space-between" as const,
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: colors.background,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        headerTitle: {
          fontSize: 17,
          fontWeight: "700" as const,
          color: colors.text,
        },

        // ── Typography ──────────────────────────────────────
        h1: {
          fontSize: 28,
          fontWeight: "900" as const,
          color: colors.text,
          letterSpacing: -0.5,
        },
        h2: {
          fontSize: 22,
          fontWeight: "800" as const,
          color: colors.text,
          letterSpacing: -0.3,
        },
        h3: {
          fontSize: 18,
          fontWeight: "700" as const,
          color: colors.text,
        },
        title: {
          fontSize: 16,
          fontWeight: "700" as const,
          color: colors.text,
        },
        body: {
          fontSize: 15,
          color: colors.text,
          lineHeight: 22,
        },
        bodySmall: {
          fontSize: 13,
          color: colors.textSecondary,
          lineHeight: 18,
        },
        caption: {
          fontSize: 12,
          color: colors.textTertiary,
          fontWeight: "500" as const,
        },
        label: {
          fontSize: 13,
          fontWeight: "700" as const,
          color: colors.textSecondary,
          marginBottom: 8,
        },

        // ── Inputs ──────────────────────────────────────────
        input: {
          backgroundColor: colors.inputBackground,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 12,
          fontSize: 15,
          color: colors.text,
        },
        inputFocused: {
          backgroundColor: colors.inputBackground,
          borderWidth: 1,
          borderColor: colors.primary,
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 12,
          fontSize: 15,
          color: colors.text,
        },
        textArea: {
          backgroundColor: colors.inputBackground,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 12,
          fontSize: 15,
          color: colors.text,
          minHeight: 100,
          textAlignVertical: "top" as const,
        },

        // ── Buttons ─────────────────────────────────────────
        btnPrimary: {
          backgroundColor: colors.primary,
          borderRadius: 999,
          paddingHorizontal: 24,
          paddingVertical: 13,
          alignItems: "center" as const,
          justifyContent: "center" as const,
        },
        btnPrimaryText: {
          color: "#fff",
          fontWeight: "700" as const,
          fontSize: 15,
        },
        btnSecondary: {
          backgroundColor: "transparent",
          borderRadius: 999,
          borderWidth: 1,
          borderColor: colors.border,
          paddingHorizontal: 24,
          paddingVertical: 13,
          alignItems: "center" as const,
          justifyContent: "center" as const,
        },
        btnSecondaryText: {
          color: colors.text,
          fontWeight: "700" as const,
          fontSize: 15,
        },
        btnGhost: {
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: 10,
          alignItems: "center" as const,
          justifyContent: "center" as const,
        },
        btnGhostText: {
          color: colors.primary,
          fontWeight: "600" as const,
          fontSize: 14,
        },

        // ── Circle buttons (icon buttons) ───────────────────
        circleBtn: {
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: "center" as const,
          justifyContent: "center" as const,
        },

        // ── Rows / List items ────────────────────────────────
        row: {
          flexDirection: "row" as const,
          alignItems: "center" as const,
          gap: 12,
        },
        rowBetween: {
          flexDirection: "row" as const,
          alignItems: "center" as const,
          justifyContent: "space-between" as const,
        },
        listItem: {
          flexDirection: "row" as const,
          alignItems: "center" as const,
          gap: 12,
          paddingVertical: 14,
          paddingHorizontal: 16,
          backgroundColor: colors.card,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },

        // ── Dividers ────────────────────────────────────────
        divider: {
          height: 1,
          backgroundColor: colors.border,
        },
        dividerV: {
          width: 1,
          backgroundColor: colors.border,
        },

        // ── Avatars ──────────────────────────────────────────
        avatarSm: {
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: colors.primary,
        },
        avatarMd: {
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: colors.primary,
        },
        avatarLg: {
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: colors.primary,
        },

        // ── Badges / Pills ───────────────────────────────────
        badge: {
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: 999,
          backgroundColor: colors.primary + "20",
          borderWidth: 1,
          borderColor: colors.primary + "40",
        },
        badgeText: {
          fontSize: 12,
          fontWeight: "600" as const,
          color: colors.primary,
        },

        // ── Empty states ─────────────────────────────────────
        emptyState: {
          alignItems: "center" as const,
          justifyContent: "center" as const,
          paddingVertical: 60,
          paddingHorizontal: 32,
        },
        emptyTitle: {
          fontSize: 18,
          fontWeight: "700" as const,
          color: colors.text,
          marginTop: 16,
          marginBottom: 8,
          textAlign: "center" as const,
        },
        emptySubtitle: {
          fontSize: 14,
          color: colors.textTertiary,
          textAlign: "center" as const,
          lineHeight: 20,
        },

        // ── Status bar background fill ────────────────────────
        statusBarFill: {
          backgroundColor: colors.background,
        },

        // ── Shadow helpers ────────────────────────────────────
        shadow: {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.3 : 0.06,
          shadowRadius: 8,
          elevation: 2,
        },
        shadowLg: {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: isDark ? 0.4 : 0.1,
          shadowRadius: 16,
          elevation: 4,
        },

        // ── Platform-specific ─────────────────────────────────
        androidRipple: {
          borderRadius: 12,
          overflow: "hidden" as const,
        },
      }),
    [colors, isDark],
  );
}

// Also export a raw colors hook for one-off inline styles
export function useColors() {
  return useTheme().colors;
}
