import {
  supabase
} from "@/lib/supabase";

import type {
  AuthChangeEvent,
  Session,
  User as SupabaseUser,
} from "@supabase/supabase-js";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

/* =========================================================
   TYPES
========================================================= */

export type Preferences = {
  language?: string;
  region?: string;
  localized_content?: boolean;
};

export interface Profile {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  location?: string | null;
  created_at: string;
  updated_at: string;
}

export type ThemePreference = "light" | "dark" | "system";

type UserSettingsRow = {
  user_id: string;
  onboarding_completed: boolean | null;
  onboarding_completed_at: string | null;
  theme_preference: ThemePreference | null;
  preferences?: Preferences | null;
  updated_at: string | null;
};

type UpdateProfileInput = Partial<
  Pick<Profile, "username" | "full_name" | "avatar_url" | "bio" | "location">
>;

type LoginResult = Awaited<ReturnType<typeof supabase.auth.signInWithPassword>>;
type SignupResult = Awaited<ReturnType<typeof supabase.auth.signUp>>;
type GoogleLoginResult = Awaited<
  ReturnType<typeof supabase.auth.signInWithIdToken>
>;

interface AuthContextType {
  user: SupabaseUser | null;
  session: Session | null;
  profile: Profile | null;
  userSettings: UserSettingsRow | null;

  isLoading: boolean;
  isProfileLoading: boolean;
  isUserSettingsLoading: boolean;

  hasCompletedOnboarding: boolean;
  markOnboardingCompleted: (interests?: string[]) => Promise<boolean>;

  themePreference: ThemePreference | null;
  setThemePreference: (pref: ThemePreference) => Promise<void>;

  login: UseMutationResult<LoginResult, Error, any>;
  signup: UseMutationResult<SignupResult, Error, any>;
  googleLogin: UseMutationResult<GoogleLoginResult, Error, any>;

  updateProfile: UseMutationResult<Profile, Error, UpdateProfileInput>;

  signOut: () => Promise<void>;
  refreshProfile: () => Promise<Profile | null>;

  updateSettings: (
    settings: Partial<UserSettingsRow>,
  ) => Promise<UserSettingsRow>;

  deactivateAccount: (reason?: string) => Promise<void>;
  deleteAccount: (reason?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const NO_ROWS = "PGRST116";
const isNoRowsError = (err: any) => err?.code === NO_ROWS;

/* =========================================================
   PROVIDER
========================================================= */

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();

  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [hydrated, setHydrated] = useState(false);

  /* ============================
     SESSION HYDRATION
  ============================ */

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const res = await supabase.auth.getSession();
      if (cancelled) return;

      const s = res.data?.session ?? null;
      setSession(s);
      setUser(s?.user ?? null);
      setHydrated(true);
    })();

    const { data } = supabase.auth.onAuthStateChange(
      (_: AuthChangeEvent, s: Session | null) => {
        setSession(s ?? null);
        setUser(s?.user ?? null);
        setHydrated(true);
      },
    );

    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, []);

  /* ============================
     PROFILE
  ============================ */

  const { data: profile, isLoading: isProfileLoading } =
    useQuery<Profile | null>({
      queryKey: ["profile", user?.id],
      enabled: !!user?.id && hydrated,
      queryFn: async () => {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user!.id)
          .maybeSingle();

        if (error && !isNoRowsError(error)) return null;
        return data ?? null;
      },
    });

  /* ============================
     USER SETTINGS
  ============================ */

  const { data: userSettings, isLoading: isUserSettingsLoading } =
    useQuery<UserSettingsRow | null>({
      queryKey: ["user-settings", user?.id],
      enabled: !!user?.id && hydrated,
      queryFn: async () => {
        const { data, error } = await supabase
          .from("user_settings")
          .select("*")
          .eq("user_id", user!.id)
          .maybeSingle();

        if (error && !isNoRowsError(error)) return null;
        return data ?? null;
      },
    });

  const hasCompletedOnboarding = !!userSettings?.onboarding_completed;

  const themePreference = userSettings?.theme_preference ?? null;

  /* ============================
     AUTH MUTATIONS
  ============================ */

  const login = useMutation({
    mutationFn: async ({ email, password }: any) => {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw new Error(error.message);
    },
  });

  const signup = useMutation({
    mutationFn: async ({ email, password, userData }: any) => {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: userData },
      });
      if (error) throw new Error(error.message);
    },
  });

  const googleLogin = useMutation({
    mutationFn: async ({ idToken, accessToken }: any) => {
      const { error } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: idToken,
        access_token: accessToken ?? undefined,
      });
      if (error) throw new Error(error.message);
    },
  });

  /* ============================
     SETTINGS UPDATE
  ============================ */

  const updateSettings = async (
    settings: Partial<UserSettingsRow>,
  ): Promise<UserSettingsRow> => {
    const { data, error } = await supabase
      .from("user_settings")
      .upsert({
        user_id: user!.id,
        ...settings,
        updated_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (error) throw new Error(error.message);

    qc.setQueryData(["user-settings", user!.id], data);
    return data;
  };

  /* ============================
     ONBOARDING
  ============================ */

  const markOnboardingCompleted = async (interests: string[] = []) => {
    await updateSettings({
      onboarding_completed: true,
      onboarding_completed_at: new Date().toISOString(),
    });

    if (interests.length > 0) {
      await supabase.from("user_interests").insert(
        interests.map((i) => ({
          user_id: user!.id,
          interest: i,
        })),
      );
    }

    return true;
  };

  /* ============================
     THEME
  ============================ */

  const setThemePreference = async (pref: ThemePreference) => {
    await updateSettings({ theme_preference: pref });
  };

  /* ============================
     SIGN OUT
  ============================ */

  const signOut = async () => {
    await supabase.auth.signOut();
    qc.clear();
  };

  /* ============================
     PROVIDER VALUE
  ============================ */

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile: profile ?? null,
        userSettings: userSettings ?? null,

        isLoading: !hydrated,
        isProfileLoading,
        isUserSettingsLoading,

        hasCompletedOnboarding,
        markOnboardingCompleted,

        themePreference,
        setThemePreference,

        login,
        signup,
        googleLogin,

        updateProfile: {} as any,

        signOut,
        refreshProfile: async () => profile ?? null,

        updateSettings,

        deactivateAccount: async () => {},
        deleteAccount: async () => {},
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/* =========================================================
   HOOK
========================================================= */

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
