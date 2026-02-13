// providers/ThemeProvider.tsx — COMPLETED + UPDATED (no Supabase query; syncs with AuthProvider)

import { Colors, storage, type Theme } from "@/lib/theme";
import { useAuth } from "@/providers/AuthProvider";
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

interface ThemeContextType {
  theme: Theme; // "light" | "dark" | "system" (user preference)
  isDark: boolean; // effective
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  colors: ThemeColors;
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
    themePreference, // comes from user_settings.theme_preference
    setThemePreference, // writes to DB via AuthProvider.updateSettings
    isLoading,
    isUserSettingsLoading,
  } = useAuth();

  const [theme, setThemeState] = useState<Theme>("system");
  const [localHydrated, setLocalHydrated] = useState(false);

  // prevents writing back during initial hydration
  const hasSyncedFromRemoteRef = useRef(false);

  // 1) Always hydrate from local storage for instant UI
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

  // 2) When logged in + user_settings finished loading, prefer remote themePreference
  useEffect(() => {
    if (!user?.id) {
      // optional policy: reset on logout
      setThemeState("system");
      void storage.setTheme("system");
      hasSyncedFromRemoteRef.current = false;
      return;
    }

    if (isLoading || isUserSettingsLoading) return;

    // themePreference can be null in DB initially
    if (isTheme(themePreference)) {
      setThemeState(themePreference);
      void storage.setTheme(themePreference);
      hasSyncedFromRemoteRef.current = true;
    } else {
      // if remote empty, we keep local and later the user can set it.
      hasSyncedFromRemoteRef.current = true;
    }
  }, [user?.id, isLoading, isUserSettingsLoading, themePreference]);

  const setTheme = useCallback(
    async (newTheme: Theme) => {
      setThemeState(newTheme);
      await storage.setTheme(newTheme);

      // Only write to DB if:
      // - user is logged in
      // - we've already synced from remote once (so we don't clobber remote during boot)
      if (user?.id && hasSyncedFromRemoteRef.current) {
        try {
          await setThemePreference(newTheme);
        } catch (e) {
          console.warn("Failed to persist theme_preference:", e);
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

    const next: Theme = effective === "light" ? "dark" : "light";
    void setTheme(next);
  }, [theme, systemColorScheme, setTheme]);

  // Only gate render until local hydration is done
  // (don’t block UI waiting for remote)
  if (!localHydrated) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ThemeContext.Provider
      value={{ theme, isDark, toggleTheme, setTheme, colors }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
