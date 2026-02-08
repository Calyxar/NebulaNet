// providers/AuthProvider.tsx
// ✅ Real Supabase authentication with profile management

import { supabase } from "@/lib/supabase";
import type { Session, User as SupabaseUser } from "@supabase/supabase-js";
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

export interface Profile {
  id: string;
  username: string;
  full_name: string;
  avatar_url?: string | null;
  bio?: string | null;
  location?: string | null;
  created_at: string;
  updated_at: string;
}

type UpdateProfileInput = Partial<
  Pick<Profile, "username" | "full_name" | "avatar_url" | "bio" | "location">
>;

// ✅ Explicit mutation type so context matches the actual mutation
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
  isLoading: boolean;
  updateProfile: UpdateProfileMutation;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  // ✅ Fetch user profile from profiles table
  const { data: profile, isLoading: isLoadingProfile } =
    useQuery<Profile | null>({
      queryKey: ["profile", user?.id],
      queryFn: async () => {
        if (!user?.id) return null;

        console.log("👤 Fetching profile for user:", user.id);

        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (error) {
          console.error("Profile fetch error:", error);
          return null;
        }

        console.log("👤 Profile loaded:", !!data);
        return data as Profile;
      },
      enabled: !!user?.id,
      staleTime: 1000 * 60 * 5,
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

      if (error) {
        // Supabase errors aren’t always Error instances
        throw new Error(error.message ?? "Failed to update profile");
      }

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

  // ✅ Listen to auth state changes
  useEffect(() => {
    console.log("🔐 Setting up auth listener...");

    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("🔐 Initial session:", !!session);
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log("🔔 Auth state changed:", _event, "session:", !!session);

      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);

      if (session?.user) {
        queryClient.invalidateQueries({
          queryKey: ["profile", session.user.id],
        });
      } else {
        // if signed out, ensure profile cache is cleared
        queryClient.removeQueries({ queryKey: ["profile"] });
      }
    });

    return () => {
      console.log("🔐 Cleaning up auth listener");
      subscription.unsubscribe();
    };
  }, [queryClient]);

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

  const value: AuthContextType = {
    user,
    profile: profile ?? null,
    session,
    isLoading: isLoading || isLoadingProfile,
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
