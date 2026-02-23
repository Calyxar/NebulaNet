// hooks/useAuth.ts — FIREBASE VERSION ✅ (COMPLETED + UPDATED)

import { auth } from "@/lib/firebase";
import { useAuth as useProviderAuth } from "@/providers/AuthProvider";
import { reload } from "firebase/auth";

export const useAuth = () => {
  const ctx = useProviderAuth();

  // Firebase: authenticated if user exists
  const isAuthenticated = !!ctx.user;

  // Firebase: email verification uses emailVerified boolean
  const isEmailVerified = !!ctx.user?.emailVerified;

  const mutateProfile = async () => {
    try {
      return await ctx.refreshProfile();
    } catch {
      return null;
    }
  };

  const checkSession = async () => {
    // ✅ Important: refresh user state (emailVerified can change after clicking link)
    const u = auth.currentUser;
    if (u) {
      try {
        await reload(u);
      } catch {
        // ignore reload errors
      }
    }
    return auth.currentUser;
  };

  return {
    // core
    user: ctx.user,
    session: null, // Firebase doesn't use session objects
    profile: ctx.profile,
    userSettings: ctx.userSettings,

    // optional convenience
    userId: ctx.user?.uid ?? null,
    email: ctx.user?.email ?? null,

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

    // direct firebase client (if needed)
    firebaseAuth: auth,
  };
};

export type UseAuthReturn = ReturnType<typeof useAuth>;
