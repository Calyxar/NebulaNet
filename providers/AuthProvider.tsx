// providers/AuthProvider.tsx

import {
  deleteMyAccount,
  getAuthRedirectUrl,
  getPasswordResetRedirectUrl,
  supabase,
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
  useMemo,
  useState,
  type ReactNode,
} from "react";

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

type UpdateProfileInput = Partial<
  Pick<Profile, "username" | "full_name" | "avatar_url" | "bio" | "location">
>;

type UpdateProfileMutation = UseMutationResult<
  Profile,
  Error,
  UpdateProfileInput,
  unknown
>;

type LoginResult = Awaited<ReturnType<typeof supabase.auth.signInWithPassword>>;
type SignupResult = Awaited<ReturnType<typeof supabase.auth.signUp>>;
type GoogleLoginResult = Awaited<
  ReturnType<typeof supabase.auth.signInWithIdToken>
>;

type LoginMutation = UseMutationResult<
  LoginResult,
  Error,
  { email: string; password: string },
  unknown
>;

type SignupMutation = UseMutationResult<
  SignupResult,
  Error,
  {
    email: string;
    password: string;
    userData: { username: string; full_name?: string };
  },
  unknown
>;

type GoogleLoginMutation = UseMutationResult<
  GoogleLoginResult,
  Error,
  { idToken: string; accessToken?: string | null },
  unknown
>;

interface AuthContextType {
  user: SupabaseUser | null;
  profile: Profile | null;
  session: Session | null;

  isLoading: boolean;
  isProfileLoading: boolean;

  login: LoginMutation;
  signup: SignupMutation;
  googleLogin: GoogleLoginMutation;
  updateProfile: UpdateProfileMutation;

  signOut: () => Promise<void>;
  refreshProfile: () => Promise<Profile | null>;

  resetPassword: (email: string) => Promise<void>;
  resendVerificationEmail: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  updateUserEmail: (newEmail: string) => Promise<void>;

  updateSettings: (settings: Record<string, any>) => Promise<any>;
  deactivateAccount: (reason?: string) => Promise<void>;
  deleteAccount: (reason?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const NO_ROWS = "PGRST116";
function isNoRowsError(err: any) {
  return err?.code === NO_ROWS;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const ensureProfileExists = async (u: SupabaseUser) => {
    try {
      const { data: existing, error: readErr } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", u.id)
        .maybeSingle();

      if (readErr && !isNoRowsError(readErr)) return;
      if (existing?.id) return;

      const usernameFromMeta =
        (u.user_metadata?.username as string | undefined) ||
        (u.user_metadata?.preferred_username as string | undefined) ||
        (u.email ? u.email.split("@")[0] : "user");

      const fullNameFromMeta =
        (u.user_metadata?.full_name as string | undefined) ||
        (u.user_metadata?.name as string | undefined) ||
        null;

      const now = new Date().toISOString();

      await supabase.from("profiles").upsert(
        {
          id: u.id,
          username: usernameFromMeta,
          full_name: fullNameFromMeta,
          created_at: now,
          updated_at: now,
        },
        { onConflict: "id" },
      );
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const {
          data: { session: s },
        } = await supabase.auth.getSession();

        if (cancelled) return;

        setSession(s ?? null);
        setUser(s?.user ?? null);

        if (s?.user) {
          ensureProfileExists(s.user).finally(() => {
            queryClient.invalidateQueries({ queryKey: ["profile", s.user.id] });
          });
        }
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, s: Session | null) => {
        setSession(s ?? null);
        setUser(s?.user ?? null);
        setHydrated(true);

        if (s?.user) {
          ensureProfileExists(s.user).finally(() => {
            queryClient.invalidateQueries({ queryKey: ["profile", s.user.id] });
          });
        } else {
          queryClient.removeQueries({ queryKey: ["profile"] });
        }
      },
    );

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [queryClient]);

  const {
    data: profile,
    isLoading: isLoadingProfile,
    isFetching: isFetchingProfile,
  } = useQuery<Profile | null>({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (error && !isNoRowsError(error)) return null;
      return (data as Profile) ?? null;
    },
    enabled: !!user?.id && hydrated,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  const refreshProfile = async () => {
    if (!user?.id) return null;

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (error && !isNoRowsError(error)) return null;

    queryClient.setQueryData(["profile", user.id], (data as Profile) ?? null);
    return (data as Profile) ?? null;
  };

  const login = useMutation<
    LoginResult,
    Error,
    { email: string; password: string }
  >({
    mutationFn: async ({ email, password }) => {
      const result = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (result.error) throw new Error(result.error.message);
      return result;
    },
  });

  const signup = useMutation<
    SignupResult,
    Error,
    {
      email: string;
      password: string;
      userData: { username: string; full_name?: string };
    }
  >({
    mutationFn: async ({ email, password, userData }) => {
      const result = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            username: userData.username,
            full_name: userData.full_name ?? null,
          },
        },
      });

      if (result.error) throw new Error(result.error.message);

      if (result.data?.user) {
        ensureProfileExists(result.data.user as SupabaseUser).finally(() => {
          queryClient.invalidateQueries({
            queryKey: ["profile", result.data.user!.id],
          });
        });
      }

      return result;
    },
  });

  const googleLogin = useMutation<
    GoogleLoginResult,
    Error,
    { idToken: string; accessToken?: string | null }
  >({
    mutationFn: async ({ idToken, accessToken }) => {
      const result = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: idToken,
        access_token: accessToken ?? undefined,
      });

      if (result.error) throw new Error(result.error.message);

      if (result.data?.user) {
        ensureProfileExists(result.data.user as SupabaseUser).finally(() => {
          queryClient.invalidateQueries({
            queryKey: ["profile", result.data.user!.id],
          });
        });
      }

      return result;
    },
  });

  const updateProfile = useMutation<Profile, Error, UpdateProfileInput>({
    mutationFn: async (updates) => {
      if (!user?.id) throw new Error("No user found");

      const { data, error } = await supabase
        .from("profiles")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", user.id)
        .select("*")
        .single();

      if (error) throw new Error(error.message ?? "Failed to update profile");
      return data as Profile;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["profile", user?.id], data);
    },
  });

  const signOut = async () => {
    await supabase.auth.signOut();
    queryClient.clear();
    setSession(null);
    setUser(null);
  };

  const resetPassword = async (email: string) => {
    const redirectTo = getPasswordResetRedirectUrl();
    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo },
    );
    if (error) throw new Error(error.message);
  };

  const resendVerificationEmail = async (email: string) => {
    const redirectTo = getAuthRedirectUrl();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: redirectTo },
    });
    if (error) throw new Error(error.message);
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
  };

  const updateUserEmail = async (newEmail: string) => {
    const base = getAuthRedirectUrl();
    const { error } = await supabase.auth.updateUser(
      { email: newEmail.trim().toLowerCase() },
      { emailRedirectTo: `${base}?type=email_change` },
    );
    if (error) throw new Error(error.message);
  };

  const updateSettings = async (settings: Record<string, any>) => {
    if (!user?.id) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from("user_settings")
      .upsert({
        user_id: user.id,
        ...settings,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  };

  const deactivateAccount = async (reason?: string) => {
    if (!user?.id) throw new Error("Not authenticated");

    const { error } = await supabase
      .from("profiles")
      .update({
        status: "deactivated",
        deactivation_reason: reason ?? null,
        deactivated_at: new Date().toISOString(),
      } as any)
      .eq("id", user.id);

    if (error) throw new Error(error.message);

    await signOut();
  };

  const deleteAccount = async (reason?: string) => {
    await deleteMyAccount(reason);
    await signOut();
  };

  const isLoading = useMemo(() => !hydrated, [hydrated]);

  const value: AuthContextType = {
    user,
    profile: profile ?? null,
    session,

    isLoading,
    isProfileLoading: !!user?.id && (isLoadingProfile || isFetchingProfile),

    login,
    signup,
    googleLogin,
    updateProfile,

    signOut,
    refreshProfile,

    resetPassword,
    resendVerificationEmail,
    updatePassword,
    updateUserEmail,

    updateSettings,
    deactivateAccount,
    deleteAccount,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
