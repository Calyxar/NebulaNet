// providers/ThemeProvider.tsx
import { auth, db } from "@/lib/firebase";
import { Colors, storage, type Theme } from "@/lib/theme";
import type { FontSize, UIScale } from "@/types/settings";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { ActivityIndicator, View, useColorScheme } from "react-native";

type ThemeColors = (typeof Colors)["light"] | (typeof Colors)["dark"];

const FONT_SCALE: Record<string, number> = {
  small: 0.85,
  medium: 1.0,
  large: 1.15,
};

const UI_SCALE: Record<string, number> = {
  compact: 0.92,
  normal: 1,
  large: 1.08,
};

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => Promise<void>;
  colors: ThemeColors;
  fontScale: number;
  fs: (size: number) => number;
  reduceAnimations: boolean;
  animDuration: (ms: number) => number;
  loadUserPrefs: (uid: string) => Promise<void>;
  // ✅ NEW: allow direct updates from useSettings without re-login
  applyFontSize: (size: FontSize) => void;
  applyReduceAnimations: (value: boolean) => void;
  uiScale: number;
  applyUIScale: (scale: UIScale) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
};

function isTheme(v: any): v is Theme {
  return v === "light" || v === "dark" || v === "system";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [theme, setThemeState] = useState<Theme>("system");
  const [localHydrated, setLocalHydrated] = useState(false);
  const [fontSizePref, setFontSizePref] = useState<FontSize>("medium");
  const [uiScalePref, setUIScalePref] = useState<UIScale>("normal");
  const [reduceAnimations, setReduceAnimations] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const saved = await storage.getTheme();
        if (alive && saved && isTheme(saved)) setThemeState(saved);
      } finally {
        if (alive) setLocalHydrated(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const setTheme = useCallback(async (newTheme: Theme) => {
    setThemeState(newTheme);
    await storage.setTheme(newTheme);
    const uid = auth.currentUser?.uid;
    if (uid) {
      try {
        await db.collection("profiles").doc(uid).update({
          theme_preference: newTheme,
        });
      } catch (e) {
        console.warn("Failed to save theme to Firestore:", e);
      }
    }
  }, []);

  const loadUserPrefs = useCallback(async (uid: string) => {
    try {
      const snap = await db.collection("profiles").doc(uid).get();
      if (!snap.exists) return;
      const data = snap.data() as any;
      const prefs = data?.preferences ?? {};

      if (isTheme(data?.theme_preference)) {
        setThemeState(data.theme_preference);
        await storage.setTheme(data.theme_preference);
      }
      if (
        prefs.font_size === "small" ||
        prefs.font_size === "medium" ||
        prefs.font_size === "large"
      ) {
        setFontSizePref(prefs.font_size);
      }

      if (
        prefs.ui_scale === "compact" ||
        prefs.ui_scale === "normal" ||
        prefs.ui_scale === "large"
      ) {
        setUIScalePref(prefs.ui_scale);
      }
      if (typeof prefs.reduce_animations === "boolean") {
        setReduceAnimations(prefs.reduce_animations);
      }
    } catch {}
  }, []);

  // ✅ FIX: these let useSettings push changes into ThemeProvider immediately
  const applyFontSize = useCallback((size: FontSize) => {
    setFontSizePref(size);
  }, []);

  const applyReduceAnimations = useCallback((value: boolean) => {
    setReduceAnimations(value);
  }, []);

  const applyUIScale = useCallback((scale: UIScale) => {
    setUIScalePref(scale);
  }, []);

  const isDark = useMemo(() => {
    if (theme === "dark") return true;
    if (theme === "light") return false;
    return systemColorScheme === "dark";
  }, [theme, systemColorScheme]);

  const colors = isDark ? Colors.dark : Colors.light;

  const toggleTheme = useCallback(() => {
    const effective =
      theme === "system"
        ? systemColorScheme === "dark"
          ? "dark"
          : "light"
        : theme;
    void setTheme(effective === "light" ? "dark" : "light");
  }, [theme, systemColorScheme, setTheme]);

  const uiScale = UI_SCALE[uiScalePref] ?? 1.0;
  const fontScale = FONT_SCALE[fontSizePref] ?? 1.0;
  const fs = useCallback(
    (size: number) => Math.round(size * fontScale),
    [fontScale],
  );
  const animDuration = useCallback(
    (ms: number) => (reduceAnimations ? 0 : ms),
    [reduceAnimations],
  );

  if (!localHydrated) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDark,
        toggleTheme,
        setTheme,
        colors,
        uiScale,
        applyUIScale,
        fontScale,
        fs,
        reduceAnimations,
        animDuration,
        loadUserPrefs,
        applyFontSize,
        applyReduceAnimations,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
