// lib/theme.ts — CONSTANTS ONLY (SINGLE SOURCE OF TRUTH)
import AsyncStorage from "@react-native-async-storage/async-storage";

export type Theme = "light" | "dark" | "system";

/**
 * NebulaNet Theme Tokens
 * - Keys are identical across light/dark
 * - No duplicate theme systems
 * - Safe for Expo + Android + iOS
 */
export const Colors = {
  light: {
    // Backgrounds
    background: "#F7F9FC",
    surface: "#FFFFFF",
    card: "#FFFFFF",
    border: "#E5E7EB",

    // Brand
    primary: "#6D5DF6",
    accent: "#4FD1C5",

    // Text
    text: "#0F172A",
    textSecondary: "#475569",
    textTertiary: "#94A3B8",

    // Inputs / Modals
    inputBackground: "#F1F3F7",
    placeholder: "#94A3B8", // ✅ ADDED (fixes colors.placeholder TS error)
    modalBackground: "rgba(0,0,0,0.4)",

    // Status
    success: "#22C55E",
    error: "#EF4444",
    warning: "#F59E0B",
    info: "#0A84FF",

    // Social actions
    storyRing: "#6D5DF6",
    like: "#FF375F",
    save: "#6D5DF6",
    share: "#475569",
    comment: "#475569",

    // Neutral aliases (kept for compatibility)
    secondary: "#475569",
    tertiary: "#94A3B8",
  },

  dark: {
    // 🌑 Dark mode (AMOLED-friendly, not pure black)
    background: "#0B0E14",
    surface: "#121826",
    card: "#121826",
    border: "#1F2937",

    // Brand (slightly brighter for contrast)
    primary: "#8A7CFA",
    accent: "#4FD1C5",

    // Text
    text: "#E6E9F0",
    textSecondary: "#AAB0C0",
    textTertiary: "#7C8293",

    // Inputs / Modals
    inputBackground: "#161D2D",
    placeholder: "#7C8293", // ✅ ADDED (fixes colors.placeholder TS error)
    modalBackground: "rgba(0,0,0,0.6)",

    // Status (dark-tuned)
    success: "#22C55E",
    error: "#F87171",
    warning: "#FBBF24",
    info: "#38BDF8",

    // Social actions
    storyRing: "#8A7CFA",
    like: "#FF4D6D",
    save: "#8A7CFA",
    share: "#AAB0C0",
    comment: "#AAB0C0",

    // Neutral aliases
    secondary: "#AAB0C0",
    tertiary: "#7C8293",
  },
} as const;

export type ColorScheme = keyof typeof Colors;

/**
 * Persisted theme storage
 */
export const storage = {
  async getTheme(): Promise<Theme | null> {
    try {
      const savedTheme = await AsyncStorage.getItem("app-theme");
      if (
        savedTheme === "light" ||
        savedTheme === "dark" ||
        savedTheme === "system"
      ) {
        return savedTheme as Theme;
      }
      return null;
    } catch (error) {
      console.error("Error loading theme:", error);
      return null;
    }
  },

  async setTheme(theme: Theme): Promise<void> {
    try {
      await AsyncStorage.setItem("app-theme", theme);
    } catch (error) {
      console.error("Error saving theme:", error);
    }
  },
};
