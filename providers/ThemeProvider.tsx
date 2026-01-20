import React, { createContext, useContext, useEffect, useState } from "react";
import { useColorScheme } from "react-native";
import { Colors, storage, Theme } from "../lib/theme";

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  colors: typeof Colors.light | typeof Colors.dark;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const systemColorScheme = useColorScheme();
  const [theme, setThemeState] = useState<Theme>("light");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    const savedTheme = await storage.getTheme();
    if (savedTheme) {
      setThemeState(savedTheme);
    }
    setIsReady(true);
  };

  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme);
    await storage.setTheme(newTheme);
  };

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
  };

  const isDark =
    theme === "dark" || (theme === "system" && systemColorScheme === "dark");
  const colors = isDark ? Colors.dark : Colors.light;

  if (!isReady) {
    return null; // Or a loading spinner
  }

  return (
    <ThemeContext.Provider
      value={{ theme, isDark, toggleTheme, setTheme, colors }}
    >
      {children}
    </ThemeContext.Provider>
  );
};
