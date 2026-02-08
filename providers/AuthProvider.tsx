// providers/AuthProvider.tsx
// ✅ Real Supabase authentication with profile management (HYDRATION-SAFE + PROFILE UPSERT)

import { supabase } from "@/lib/supabase";
import type {
  Session,
  User as SupabaseUser
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

interface AuthContextType {
  user: SupabaseUser | null;
  profile: Profile | null;
  session: Session | null;

  /**
   * ✅ True until we finish the *first* getSession() call AND profile query (if user exists)
   * Use this to avoid redirecting to login too early.
   */
  isLoading: boolean;

  updateProfile: UpdateProfileMutation;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// PostgREST "no rows" code
const NO_ROWS = "PGRST116";

function isNoRowsError(err: any) {
  return err?.code === NO_ROWS;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  // ✅ Critical: separate “hydration” flag so we don’t flash-login
  const [hydrated, setHydrated] = useState(false);

  // ✅ Ensure a profiles row exists (important for OAuth + edge cases)
  const ensureProfileExists = async (u: SupabaseUser) => {
    try {
      // Try to find existing profile row
      const { data: existing, error: readErr } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", u.id)
        .maybeSingle();

      if (readErr && !isNoRowsError(readErr)) {
        console.warn("⚠️ Profile existence check error:", readErr);
        return;
      }

      if (existing?.id) return;

      const usernameFromMeta =
        (u.user_metadata?.username as string | undefined) ||
        (u.user_metadata?.preferred_username as string | undefined) ||
        (u.email ? u.email.split("@")[0] : "user");

      const fullNameFromMeta =
        (u.user_metadata?.full_name as string | undefined) ||
        (u.user_metadata?.name as string | undefined) ||
        null;

      // Create minimal profile row
      const now = new Date().toISOString();
      const { error: upsertErr } = await supabase.from("profiles").upsert(
        {
          id: u.id,
          username: usernameFromMeta,
          full_name: fullNameFromMeta,
          created_at: now,
          updated_at: now,
        },
        { onConflict: "id" },
      );

      if (upsertErr) {
        console.warn("⚠️ Profile upsert error:", upsertErr);
      } else {
        console.log("✅ Profile ensured (upserted if missing)");
      }
    } catch (e) {
      console.warn("⚠️ ensureProfileExists exception:", e);
    }
  };

  // ✅ Auth bootstrapping (runs once)
  useEffect(() => {
    let cancelled = false;

    console.log("🔐 AuthProvider bootstrapping...");

    (async () => {
      try {
        const {
          data: { session: s },
          error,
        } = await supabase.auth.getSession();

        if (error) console.warn("⚠️ getSession error:", error);

        if (cancelled) return;

        setSession(s ?? null);
        setUser(s?.user ?? null);

        if (s?.user) {
          await ensureProfileExists(s.user);
          // Prime profile cache
          queryClient.invalidateQueries({ queryKey: ["profile", s.user.id] });
        }
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (event: string, s: Session | null) => {
        console.log("🔔 Auth state changed:", event, "session:", !!s);

        setSession(s ?? null);
        setUser(s?.user ?? null);

        // Hydrated stays true once it becomes true
        setHydrated(true);

        if (s?.user) {
          await ensureProfileExists(s.user);
          queryClient.invalidateQueries({ queryKey: ["profile", s.user.id] });
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

  // ✅ Fetch user profile from profiles table
  const {
    data: profile,
    isLoading: isLoadingProfile,
    isFetching: isFetchingProfile,
  } = useQuery<Profile | null>({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      console.log("👤 Fetching profile for user:", user.id);

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (error && !isNoRowsError(error)) {
        console.error("❌ Profile fetch error:", error);
        return null;
      }

      // If profile truly doesn't exist, we return null (ensureProfileExists should prevent this)
      return (data as Profile) ?? null;
    },
    enabled: !!user?.id && hydrated, // ✅ don’t fetch before session hydration
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  // ✅ Update profile mutation (typed)
  const updateProfile = useMutation<Profile, Error, UpdateProfileInput>({
    mutationFn: async (updates) => {
      if (!user?.id) throw new Error("No user found");

      console.log("📝 Updating profile:", updates);

      const { data, error } = await supabase
        .from("profiles")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)
        .select("*")
        .single();

      if (error) throw new Error(error.message ?? "Failed to update profile");

      console.log("✅ Profile updated successfully");
      return data as Profile;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["profile", user?.id], data);
    },
    onError: (error) => {
      console.error("❌ Profile update error:", error);
    },
  });

  // ✅ Sign out function
  const signOut = async () => {
    try {
      console.log("👋 Signing out...");
      await supabase.auth.signOut();
      queryClient.clear();
      console.log("✅ Signed out successfully");
    } catch (error) {
      console.error("❌ Sign out error:", error);
      throw error;
    }
  };

  // ✅ This is the key: loading is true until session is hydrated AND (if authed) profile is done.
  const isLoading = useMemo(() => {
    if (!hydrated) return true;
    if (user?.id) return isLoadingProfile || isFetchingProfile;
    return false;
  }, [hydrated, user?.id, isLoadingProfile, isFetchingProfile]);

  const value: AuthContextType = {
    user,
    profile: profile ?? null,
    session,
    isLoading,
    updateProfile,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
