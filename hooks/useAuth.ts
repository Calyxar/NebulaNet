// hooks/useAuth.ts — COMPLETED + UPDATED ✅

import { supabase } from "@/lib/supabase";
import { useAuth as useProviderAuth } from "@/providers/AuthProvider";

export const useAuth = () => {
  const ctx = useProviderAuth();

  const isAuthenticated = !!ctx.session?.user;
  const isEmailVerified = !!ctx.user?.email_confirmed_at;

  const mutateProfile = async () => {
    try {
      return await ctx.refreshProfile();
    } catch {
      return null;
    }
  };

  const checkSession = async () => ctx.session;

  return {
    // core
    user: ctx.user,
    session: ctx.session,
    profile: ctx.profile,
    userSettings: ctx.userSettings,

    // loading
    isLoading: ctx.isLoading,
    isProfileLoading: ctx.isProfileLoading,
    isUserSettingsLoading: ctx.isUserSettingsLoading,

    // derived
    isAuthenticated,
    isEmailVerified,

    // auth actions
    login: ctx.login,
    signup: ctx.signup,
    googleLogin: ctx.googleLogin,
    updateProfile: ctx.updateProfile,

    signOut: ctx.signOut,
    checkSession,
    mutateProfile,

    // onboarding
    hasCompletedOnboarding: ctx.hasCompletedOnboarding,
    markOnboardingCompleted: ctx.markOnboardingCompleted,

    // theme
    themePreference: ctx.themePreference,
    setThemePreference: ctx.setThemePreference,

    // account management
    deactivateAccount: ctx.deactivateAccount,
    deleteAccount: ctx.deleteAccount,

    // settings
    updateSettings: ctx.updateSettings,

    // direct client (if you want)
    supabaseClient: supabase,
  };
};

export type UseAuthReturn = ReturnType<typeof useAuth>;
