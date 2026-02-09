// hooks/useAuth.ts

import { supabase } from "@/lib/supabase";
import { useAuth as useProviderAuth } from "@/providers/AuthProvider";
import { Alert } from "react-native";

export const useAuth = () => {
  const ctx = useProviderAuth();

  const { user, session, profile, isLoading, isProfileLoading } = ctx;

  const isAuthenticated = !!session?.user;
  const isEmailVerified = !!user?.email_confirmed_at;

  const signOut = ctx.signOut;

  const mutateProfile = async () => {
    try {
      return await ctx.refreshProfile();
    } catch {
      return null;
    }
  };

  const checkSession = async () => session;

  const notWired = (label: string) => async () => {
    Alert.alert("Not available", `${label} is not implemented yet.`);
    return false as any;
  };

  return {
    user,
    session,
    profile,
    isLoading,
    isProfileLoading,

    isAuthenticated,
    isEmailVerified,

    signOut,
    checkSession,
    mutateProfile,

    login: ctx.login,
    signup: ctx.signup,
    googleLogin: ctx.googleLogin,
    updateProfile: ctx.updateProfile,

    supabaseClient: supabase,

    hasCompletedOnboarding: () => false,
    markOnboardingCompleted: notWired("markOnboardingCompleted"),
    checkEmailVerification: async () => isEmailVerified,

    updatePassword: { mutateAsync: notWired("updatePassword") } as any,
    resetPassword: { mutateAsync: notWired("resetPassword") } as any,
    resendVerification: { mutateAsync: notWired("resendVerification") } as any,

    updateSettings: { mutateAsync: notWired("updateSettings") } as any,
    deactivateAccount: { mutateAsync: notWired("deactivateAccount") } as any,
    deleteAccount: { mutateAsync: notWired("deleteAccount") } as any,

    testConnection: async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) return { success: false, error: error.message };
        return { success: true, session: !!data.session };
      } catch (e: any) {
        return { success: false, error: e?.message || "Unknown error" };
      }
    },

    isGoogleReady: true,
  };
};

export type UseAuthReturn = ReturnType<typeof useAuth>;
