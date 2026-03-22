// providers/ThemeProvider.tsx — UPDATED ✅ font scale + reduce animations
import { db } from "@/lib/firebase";
import { Colors, storage, type Theme } from "@/lib/theme";
import { useAuth } from "@/providers/AuthProvider";
import { doc, getDoc } from "firebase/firestore";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ActivityIndicator, View, useColorScheme } from "react-native";

type ThemeColors = (typeof Colors)["light"] | (typeof Colors)["dark"];

// Font size → scale multiplier
const FONT_SCALE: Record<string, number> = {
  small: 0.85,
  medium: 1.0,
  large: 1.15,
};

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  colors: ThemeColors;
  // ✅ New — font scale + animation toggle
  fontScale: number; // 0.85 | 1.0 | 1.15
  fs: (size: number) => number; // helper: fs(14) → scaled font size
  reduceAnimations: boolean; // if true, skip/shorten animations
  animDuration: (ms: number) => number; // helper: animDuration(300) → 0 if reduced
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
  const {
    user,
    themePreference,
    setThemePreference,
    isLoading,
    isUserSettingsLoading,
  } = useAuth();

  const [theme, setThemeState] = useState<Theme>("system");
  const [localHydrated, setLocalHydrated] = useState(false);
  const [fontSizePref, setFontSizePref] = useState<string>("medium");
  const [reduceAnimations, setReduceAnimations] = useState(false);
  const hasSyncedFromRemoteRef = useRef(false);

  // 1) Hydrate theme from local storage
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const saved = await storage.getTheme();
        if (!alive) return;
        if (saved && isTheme(saved)) setThemeState(saved);
      } finally {
        if (alive) setLocalHydrated(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // 2) Sync theme from remote when user settings load
  useEffect(() => {
    if (!user?.id) {
      setThemeState("system");
      void storage.setTheme("system");
      hasSyncedFromRemoteRef.current = false;
      return;
    }
    if (isLoading || isUserSettingsLoading) return;
    if (isTheme(themePreference)) {
      setThemeState(themePreference);
      void storage.setTheme(themePreference);
    }
    hasSyncedFromRemoteRef.current = true;
  }, [user?.id, isLoading, isUserSettingsLoading, themePreference]);

  // 3) ✅ Load font_size + reduce_animations from Firestore preferences
  useEffect(() => {
    if (!user?.uid) return;
    let alive = true;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "profiles", user.uid));
        if (!snap.exists() || !alive) return;
        const prefs = (snap.data() as any)?.preferences ?? {};
        if (prefs.font_size) setFontSizePref(prefs.font_size);
        if (typeof prefs.reduce_animations === "boolean") {
          setReduceAnimations(prefs.reduce_animations);
        }
      } catch {
        /* silent */
      }
    })();
    return () => {
      alive = false;
    };
  }, [user?.uid]);

  const setTheme = useCallback(
    async (newTheme: Theme) => {
      setThemeState(newTheme);
      await storage.setTheme(newTheme);
      if (user?.id && hasSyncedFromRemoteRef.current) {
        try {
          await setThemePreference(newTheme);
        } catch {
          /* silent */
        }
      }
    },
    [user?.id, setThemePreference],
  );

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

  // ✅ Derived font scale helpers
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
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
