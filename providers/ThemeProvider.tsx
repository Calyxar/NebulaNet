// providers/ThemeProvider.tsx
import { auth, db } from "@/lib/firebase";
import { Colors, storage, type Theme } from "@/lib/theme";
import { doc, getDoc, updateDoc } from "firebase/firestore";
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
  const [fontSizePref, setFontSizePref] = useState<string>("medium");
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
        await updateDoc(doc(db, "profiles", uid), {
          theme_preference: newTheme,
        });
      } catch (e) {
        console.warn("Failed to save theme to Firestore:", e);
      }
    }
  }, []);

  const loadUserPrefs = useCallback(async (uid: string) => {
    try {
      const snap = await getDoc(doc(db, "profiles", uid));
      if (!snap.exists()) return;
      const prefs = (snap.data() as any)?.preferences ?? {};
      const data = snap.data() as any;
      if (isTheme(data?.theme_preference)) {
        setThemeState(data.theme_preference);
        await storage.setTheme(data.theme_preference);
      }
      if (prefs.font_size) setFontSizePref(prefs.font_size);
      if (typeof prefs.reduce_animations === "boolean") {
        setReduceAnimations(prefs.reduce_animations);
      }
    } catch {}
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
        fontScale,
        fs,
        reduceAnimations,
        animDuration,
        loadUserPrefs,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
