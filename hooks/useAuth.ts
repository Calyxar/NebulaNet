// hooks/useAuth.ts — FIREBASE ✅ (UPDATED to match AuthProvider)

import { auth } from "@/lib/firebase";
import { useAuth as useProviderAuth } from "@/providers/AuthProvider";
import { reload } from "firebase/auth";

export const useAuth = () => {
  const ctx = useProviderAuth();

  const isAuthenticated = !!ctx.user;
  const isEmailVerified = !!ctx.user?.emailVerified;

  const checkSession = async () => {
    const u = auth.currentUser;
    if (u) {
      try {
        await reload(u);
      } catch {}
    }
    return auth.currentUser;
  };

  return {
    // core
    user: ctx.user,
    session: null,
    profile: ctx.profile,
    userSettings: ctx.userSettings,

    // convenience
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

    // onboarding
    hasCompletedOnboarding: ctx.hasCompletedOnboarding,
    completeOnboarding: ctx.completeOnboarding,
    skipOnboarding: ctx.skipOnboarding,

    // theme
    themePreference: ctx.themePreference,
    setThemePreference: ctx.setThemePreference,

    // ✅ settings + account management (fixes your TS errors)
    updateSettings: ctx.updateSettings,
    deactivateAccount: ctx.deactivateAccount,
    deleteAccount: ctx.deleteAccount,

    firebaseAuth: auth,
  };
};

export type UseAuthReturn = ReturnType<typeof useAuth>;
