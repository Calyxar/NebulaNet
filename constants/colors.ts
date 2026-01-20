// constants/colors.ts
export const lightColors = {
  primary: "#6D5DF6",
  primarySoft: "#8A7CFA",
  accent: "#4FD1C5",

  background: "#F7F9FC",
  card: "#FFFFFF",
  input: "#F1F3F7",

  textPrimary: "#0F172A",
  textSecondary: "#475569",
  textMuted: "#94A3B8",
  textInverse: "#FFFFFF",

  borderLight: "#E5E7EB",
  borderMedium: "#CBD5E1",

  success: "#22C55E",
  error: "#EF4444",
  warning: "#F59E0B",

  overlay: "rgba(0,0,0,0.4)",
};

export const darkColors = {
  primary: "#8A7CFA",
  primarySoft: "#6D5DF6",
  accent: "#4FD1C5",

  background: "#0B0F1A",
  card: "#121726",
  input: "#1A2033",

  textPrimary: "#F8FAFC",
  textSecondary: "#CBD5E1",
  textMuted: "#94A3B8",
  textInverse: "#0B0F1A",

  borderLight: "#1F2937",
  borderMedium: "#334155",

  success: "#22C55E",
  error: "#F87171",
  warning: "#FBBF24",

  overlay: "rgba(0,0,0,0.6)",
};

// Export a default colors object (uses light theme by default)
export const colors = lightColors;

// You can also export a function to get colors based on theme
export const getColors = (isDark: boolean) =>
  isDark ? darkColors : lightColors;
