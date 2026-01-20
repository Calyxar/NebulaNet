// lib/theme.ts - CONSTANTS ONLY
import AsyncStorage from "@react-native-async-storage/async-storage";

export type Theme = "light" | "dark" | "system";

// Theme colors for both modes
export const Colors = {
  light: {
    background: "#ffffff",
    surface: "#f8f8f8",
    primary: "#000000",
    secondary: "#666666",
    tertiary: "#999999",
    border: "#e5e5e5",
    error: "#ff3b30",
    success: "#34c759",
    warning: "#ff9500",
    info: "#007AFF",
    text: "#000000",
    textSecondary: "#666666",
    textTertiary: "#999999",
    accent: "#000000",
    card: "#ffffff",
    inputBackground: "#f8f8f8",
    modalBackground: "rgba(0, 0, 0, 0.5)",
    storyRing: "#000000",
    like: "#ff375f",
    save: "#000000",
    share: "#666666",
    comment: "#666666",
  },
  dark: {
    background: "#000000",
    surface: "#1c1c1e",
    primary: "#ffffff",
    secondary: "#8e8e93",
    tertiary: "#636366",
    border: "#38383a",
    error: "#ff453a",
    success: "#32d74b",
    warning: "#ff9f0a",
    info: "#0a84ff",
    text: "#ffffff",
    textSecondary: "#8e8e93",
    textTertiary: "#636366",
    accent: "#ffffff",
    card: "#1c1c1e",
    inputBackground: "#2c2c2e",
    modalBackground: "rgba(0, 0, 0, 0.7)",
    storyRing: "#ffffff",
    like: "#ff375f",
    save: "#ffffff",
    share: "#8e8e93",
    comment: "#8e8e93",
  },
} as const;

export type ColorScheme = keyof typeof Colors;

// Storage helper
export const storage = {
  async getTheme(): Promise<Theme | null> {
    try {
      const savedTheme = await AsyncStorage.getItem("app-theme");
      if (
        savedTheme &&
        (savedTheme === "light" ||
          savedTheme === "dark" ||
          savedTheme === "system")
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
