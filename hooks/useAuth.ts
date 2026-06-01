import { auth } from "@/lib/firebase";
import { useAuth as useProviderAuth } from "@/providers/AuthProvider";

export const useAuth = () => {
  const ctx = useProviderAuth();
  const isAuthenticated = !!ctx.user;
  const isEmailVerified = !!ctx.user?.emailVerified;

  const checkSession = async () => {
    const u = auth.currentUser;
    if (u) {
      try {
        await u.reload();
      } catch {}
    }
    return auth.currentUser;
  };

  return {
    user: ctx.user,
    session: null,
    profile: ctx.profile,
    userSettings: ctx.userSettings,
    userId: ctx.user?.uid ?? null,
    email: ctx.user?.email ?? null,
    isLoading: ctx.isLoading,
    isProfileLoading: ctx.isProfileLoading,
    isUserSettingsLoading: ctx.isUserSettingsLoading,
    isAuthenticated,
    isEmailVerified,
    login: ctx.login,
    signup: ctx.signup,
    updateProfile: ctx.updateProfile,
    signOut: ctx.signOut,
    checkSession,
    hasCompletedOnboarding: ctx.hasCompletedOnboarding,
    completeOnboarding: ctx.completeOnboarding,
    skipOnboarding: ctx.skipOnboarding,
    themePreference: ctx.themePreference,
    setThemePreference: ctx.setThemePreference,
    updateSettings: ctx.updateSettings,
    deactivateAccount: ctx.deactivateAccount,
    deleteAccount: ctx.deleteAccount,
    firebaseAuth: auth,
  };
};

export type UseAuthReturn = ReturnType<typeof useAuth>;
