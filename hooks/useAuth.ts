// hooks/useAuth.ts — COMPLETED + UPDATED

import { supabase } from "@/lib/supabase";
import { useAuth as useProviderAuth } from "@/providers/AuthProvider";

export const useAuth = () => {
  const ctx = useProviderAuth();

  const {
    user,
    session,
    profile,
    userSettings, // ✅ Added

    isLoading,
    isProfileLoading,
    isUserSettingsLoading, // ✅ Added

    hasCompletedOnboarding,
    markOnboardingCompleted,

    themePreference,
    setThemePreference,

    deactivateAccount,
    deleteAccount,

    updateSettings,
  } = ctx;

  const isAuthenticated = !!session?.user;
  const isEmailVerified = !!user?.email_confirmed_at;

  const mutateProfile = async () => {
    try {
      return await ctx.refreshProfile();
    } catch {
      return null;
    }
  };

  const checkSession = async () => session;

  return {
    // core user
    user,
    session,
    profile,
    userSettings, // ✅ Now exposed

    // loading states
    isLoading,
    isProfileLoading,
    isUserSettingsLoading, // ✅ Now exposed

    // auth helpers
    isAuthenticated,
    isEmailVerified,

    login: ctx.login,
    signup: ctx.signup,
    googleLogin: ctx.googleLogin,
    updateProfile: ctx.updateProfile,

    signOut: ctx.signOut,
    checkSession,
    mutateProfile,

    // onboarding
    hasCompletedOnboarding,
    markOnboardingCompleted,

    // theme
    themePreference,
    setThemePreference,

    // account management
    deactivateAccount,
    deleteAccount,

    // settings updater
    updateSettings,

    // direct client access
    supabaseClient: supabase,
    isGoogleReady: true,
  };
};

export type UseAuthReturn = ReturnType<typeof useAuth>;
