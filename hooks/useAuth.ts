// hooks/useAuth.ts — COMPLETE (typed auth listener + 30-day inactivity auto-logout + safe delete account)
import {
  deleteMyAccount,
  getCurrentSession,
  getCurrentUser,
  getProfile,
  supabase,
  signInWithEmail as supabaseSignIn,
  signUpWithEmail as supabaseSignUp,
  updateProfile as supabaseUpdateProfile,
} from "@/lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { makeRedirectUri } from "expo-auth-session";
import * as Google from "expo-auth-session/providers/google";
import Constants from "expo-constants";
import * as Linking from "expo-linking";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, AppState, type AppStateStatus, Platform } from "react-native";

/* -------------------------------------------------------------------------- */
/*                                INACTIVITY                                  */
/* -------------------------------------------------------------------------- */

const INACTIVITY_DAYS = 30;
const INACTIVITY_MS = INACTIVITY_DAYS * 24 * 60 * 60 * 1000;
const LAST_ACTIVE_KEY = "nebulanet:last_active_at";

// Update this whenever the user uses/opens the app (foreground)
async function touchLastActive() {
  try {
    await AsyncStorage.setItem(LAST_ACTIVE_KEY, String(Date.now()));
  } catch {
    // ignore
  }
}

async function getLastActive(): Promise<number | null> {
  try {
    const v = await AsyncStorage.getItem(LAST_ACTIVE_KEY);
    if (!v) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/*                                   HOOK                                     */
/* -------------------------------------------------------------------------- */

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isEmailVerified, setIsEmailVerified] = useState(false);

  const queryClient = useQueryClient();

  const redirectUri = useMemo(
    () =>
      makeRedirectUri({
        scheme: "nebulanet",
        path: "auth/callback",
      }),
    [],
  );

  const [googleRequest, _googleResponse, googlePromptAsync] =
    Google.useAuthRequest({
      clientId:
        Constants.expoConfig?.extra?.googleWebClientId ||
        process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      iosClientId:
        Constants.expoConfig?.extra?.googleIosClientId ||
        process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
      androidClientId:
        Constants.expoConfig?.extra?.googleAndroidClientId ||
        process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
      redirectUri,
      scopes: ["profile", "email"],
    });

  /* ---------------------------------------------------------------------- */
  /*                              SESSION BOOT                               */
  /* ---------------------------------------------------------------------- */

  const checkSession = useCallback(async () => {
    setIsLoading(true);

    try {
      const [currentSession, currentUser] = await Promise.all([
        getCurrentSession(),
        getCurrentUser(),
      ]);

      setSession(currentSession);
      setUser(currentUser);
      setIsEmailVerified(!!currentUser?.email_confirmed_at);

      if (currentUser) {
        try {
          const userProfile = await getProfile(currentUser.id);
          setProfile(userProfile);
        } catch (profileError) {
          console.error("❌ Error loading profile:", profileError);
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
    } catch (error) {
      console.error("❌ Error checking session:", error);
      setSession(null);
      setUser(null);
      setProfile(null);
      setIsEmailVerified(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /* ---------------------------------------------------------------------- */
  /*                        30-DAY INACTIVITY LOGOUT                         */
  /* ---------------------------------------------------------------------- */

  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      setSession(null);
      setUser(null);
      setProfile(null);
      setIsEmailVerified(false);
      queryClient.clear();
    }
  }, [queryClient]);

  const maybeAutoLogoutForInactivity = useCallback(
    async (reasonLabel: string) => {
      try {
        const currentSession = await getCurrentSession();
        if (!currentSession) {
          // still touch last active so we don't keep checking forever
          await touchLastActive();
          return;
        }

        const last = await getLastActive();
        if (!last) {
          await touchLastActive();
          return;
        }

        const inactiveFor = Date.now() - last;
        if (inactiveFor >= INACTIVITY_MS) {
          console.log(
            `⏳ Auto-logout: inactive for ${Math.floor(
              inactiveFor / (24 * 60 * 60 * 1000),
            )} days (${reasonLabel})`,
          );
          await signOut();
          Alert.alert(
            "Session expired",
            "For security, you were signed out due to 30 days of inactivity. Please log in again.",
          );
        } else {
          await touchLastActive();
        }
      } catch (e) {
        console.warn("Inactivity check error:", e);
      }
    },
    [signOut],
  );

  // Run inactivity check once on mount + keep updating timestamp on foreground
  useEffect(() => {
    // On first mount, decide if we should auto logout (30 days)
    maybeAutoLogoutForInactivity("startup").finally(() => {
      // regardless, load session
      checkSession();
    });

    const sub = AppState.addEventListener("change", async (nextState) => {
      const prevState = appStateRef.current;
      appStateRef.current = nextState;

      // when we come back to active, check inactivity window
      if (
        (prevState === "inactive" || prevState === "background") &&
        nextState === "active"
      ) {
        await maybeAutoLogoutForInactivity("foreground");
      }

      // when we go background, store last active immediately
      if (nextState === "background") {
        await touchLastActive();
      }
    });

    return () => sub.remove();
  }, [checkSession, maybeAutoLogoutForInactivity]);

  /* ---------------------------------------------------------------------- */
  /*                                 MUTATIONS                               */
  /* ---------------------------------------------------------------------- */

  const loginMutation = useMutation({
    mutationFn: async ({
      email,
      password,
    }: {
      email: string;
      password: string;
    }) => {
      try {
        const data = await supabaseSignIn(email, password);
        return { data, error: null as any };
      } catch (error: any) {
        return { data: null, error };
      }
    },
    onSuccess: async (result) => {
      if (result.data) {
        setUser(result.data.user ?? null);
        setSession(result.data.session ?? null);
        setIsEmailVerified(!!result.data.user?.email_confirmed_at);

        await touchLastActive();

        if (result.data.user) {
          const userProfile = await getProfile(result.data.user.id);
          setProfile(userProfile);
          queryClient.invalidateQueries({ queryKey: ["user"] });
          queryClient.invalidateQueries({ queryKey: ["profile"] });
        }
      }
    },
  });

  const googleLoginMutation = useMutation({
    mutationFn: async () => {
      if (!googleRequest) throw new Error("Google auth request not ready");

      const result = await googlePromptAsync();
      if (result.type !== "success") throw new Error("Google login cancelled");

      const { id_token, access_token } = result.params as any;
      if (!id_token) throw new Error("No ID token received from Google");

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: id_token,
        access_token,
      });

      if (error) throw error;
      return { data, error: null as any };
    },
    onSuccess: async (result) => {
      if (result.data) {
        setUser(result.data.user ?? null);
        setSession(result.data.session ?? null);
        setIsEmailVerified(!!result.data.user?.email_confirmed_at);

        await touchLastActive();

        if (result.data.user) {
          const userProfile = await getProfile(result.data.user.id);
          setProfile(userProfile);
          queryClient.invalidateQueries({ queryKey: ["user"] });
          queryClient.invalidateQueries({ queryKey: ["profile"] });
        }
      }
    },
    onError: (error: Error) => {
      if (
        !error.message.includes("cancelled") &&
        !error.message.includes("dismissed")
      ) {
        Alert.alert("Google Login Failed", error.message);
      }
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await signOut();
      return true;
    },
    onError: (error: Error) => {
      Alert.alert("Logout Failed", error.message);
    },
  });

  const signupMutation = useMutation({
    mutationFn: async ({
      email,
      password,
      userData,
    }: {
      email: string;
      password: string;
      userData: { username: string; full_name?: string };
    }) => {
      try {
        const data = await supabaseSignUp(email, password, userData);
        return { data, error: null as any };
      } catch (error: any) {
        return { data: null, error };
      }
    },
    onSuccess: async (result) => {
      if (result.data) {
        setUser(result.data.user ?? null);
        setSession(result.data.session ?? null);
        setIsEmailVerified(false);

        await touchLastActive();

        if (result.data.user) {
          const userProfile = await getProfile(result.data.user.id);
          setProfile(userProfile);
          queryClient.invalidateQueries({ queryKey: ["user"] });
          queryClient.invalidateQueries({ queryKey: ["profile"] });
        }
      }
    },
    onError: (error: Error) => {
      Alert.alert("Signup Failed", error.message);
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (updates: any) => {
      // Convert "" -> null
      const cleaned: any = { ...updates };
      for (const k of Object.keys(cleaned)) {
        if (cleaned[k] === "") cleaned[k] = null;
      }

      // Prevent location update if schema doesn't have it
      if (cleaned.location !== undefined) {
        const profileHasLocation = profile && "location" in (profile as any);
        if (!profileHasLocation) delete cleaned.location;
      }

      const data = await supabaseUpdateProfile(cleaned);
      return data;
    },
    onSuccess: (data) => {
      if (data) {
        setProfile((prev: any) => ({ ...prev, ...data }));
        queryClient.invalidateQueries({ queryKey: ["profile"] });
      }
    },
    onError: (error: any) => {
      Alert.alert(
        "Update Failed",
        error?.message || "Failed to update profile",
      );
    },
  });

  const updatePassword = useMutation({
    mutationFn: async ({ newPassword }: { newPassword: string }) => {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      Alert.alert("Success", "Password updated successfully");
    },
    onError: (error: Error) => {
      Alert.alert("Update Failed", error.message);
    },
  });

  const resetPassword = useMutation({
    mutationFn: async ({ email }: { email: string }) => {
      const redirectTo = Platform.select({
        ios: `${redirectUri}/auth/reset-password`,
        android: `${redirectUri}/auth/reset-password`,
        default: `${redirectUri}/auth/reset-password`,
      });

      const { data, error } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        { redirectTo },
      );
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      Alert.alert(
        "Check your email",
        "A password reset link has been sent to your email address.",
      );
    },
    onError: (error: Error) => {
      Alert.alert("Reset Failed", error.message);
    },
  });

  const resendVerification = useMutation({
    mutationFn: async ({ email }: { email: string }) => {
      const redirectTo = Linking.createURL("/(auth)/verify-email");

      const { data, error } = await supabase.auth.resend({
        type: "signup",
        email: email.trim().toLowerCase(),
        options: { emailRedirectTo: redirectTo },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      Alert.alert(
        "Verification Email Sent",
        "Please check your inbox for the verification link. If you don't see it, check your spam folder.",
      );
    },
    onError: (error: Error) => {
      Alert.alert("Resend Failed", error.message);
    },
  });

  // Settings upsert (kept as-is)
  const updateSettings = useMutation({
    mutationFn: async (settings: any) => {
      if (!user?.id) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("user_settings")
        .upsert({
          user_id: user.id,
          ...settings,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      Alert.alert("Success", "Settings updated successfully");
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (error: Error) => {
      Alert.alert("Update Failed", error.message);
    },
  });

  // Deactivate (your table columns here look custom; leaving behavior but typed)
  const deactivateAccount = useMutation({
    mutationFn: async ({ reason }: { reason?: string } = {}) => {
      if (!user?.id) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("profiles")
        .update({
          status: "deactivated",
          deactivation_reason: reason,
          deactivated_at: new Date().toISOString(),
        } as any)
        .eq("id", user.id)
        .select()
        .single();

      if (error) throw error;

      await signOut();

      return data;
    },
    onSuccess: () => {
      Alert.alert(
        "Account Deactivated",
        "Your account has been deactivated. You can reactivate it by logging in again within 30 days.",
      );
    },
    onError: (error: Error) => {
      Alert.alert("Deactivation Failed", error.message);
    },
  });

  // ✅ Delete account (permanent) — SAFE: calls Edge Function
  const deleteAccount = useMutation({
    mutationFn: async ({ reason }: { reason?: string } = {}) => {
      // This calls supabase.functions.invoke("delete-account") with the current access token
      await deleteMyAccount(reason);
      await signOut();
      return { success: true };
    },
    onSuccess: () => {
      Alert.alert(
        "Account Deleted",
        "Your account has been permanently deleted. All your data has been removed.",
      );
    },
    onError: (error: any) => {
      Alert.alert(
        "Deletion Failed",
        error?.message || "Failed to delete account",
      );
    },
  });

  /* ---------------------------------------------------------------------- */
  /*                                HELPERS                                  */
  /* ---------------------------------------------------------------------- */

  const mutateProfile = useCallback(async () => {
    if (!user?.id) return null;
    try {
      const userProfile = await getProfile(user.id);
      setProfile(userProfile);
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      return userProfile;
    } catch (error) {
      console.error("Error mutating profile:", error);
      return null;
    }
  }, [user?.id, queryClient]);

  const checkEmailVerification = useCallback(async () => {
    if (!user?.id) return false;
    try {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      const verified = !!currentUser?.email_confirmed_at;
      setIsEmailVerified(verified);
      return verified;
    } catch (error) {
      console.error("Error checking email verification:", error);
      return false;
    }
  }, [user?.id]);

  const hasCompletedOnboarding = useCallback(() => {
    return profile?.metadata?.onboarding_completed === true;
  }, [profile]);

  const markOnboardingCompleted = useCallback(
    async (interests?: string[]) => {
      if (!user?.id) return false;

      try {
        const updates: any = {
          metadata: {
            ...profile?.metadata,
            onboarding_completed: true,
            onboarding_completed_at: new Date().toISOString(),
          },
        };

        if (interests && interests.length > 0) {
          updates.metadata.interests = interests;
        }

        const { error } = await supabase
          .from("profiles")
          .update(updates)
          .eq("id", user.id);

        if (error) throw error;

        const updatedProfile = await getProfile(user.id);
        setProfile(updatedProfile);
        queryClient.invalidateQueries({ queryKey: ["profile"] });
        return true;
      } catch (error) {
        console.error("Error marking onboarding completed:", error);
        return false;
      }
    },
    [user?.id, profile, queryClient],
  );

  // Sign in with Google directly (used in your settings “link accounts”)
  const signInWithGoogle = useCallback(async () => {
    if (!googleRequest) {
      Alert.alert("Error", "Google auth not ready");
      return null;
    }

    try {
      const result = await googlePromptAsync();
      if (result.type !== "success") throw new Error("Google login cancelled");

      const { id_token, access_token } = result.params as any;
      if (!id_token) throw new Error("No ID token received from Google");

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: id_token,
        access_token,
      });

      if (error) throw error;

      Alert.alert("Success", "Google account linked successfully");
      await touchLastActive();
      return data;
    } catch (error: any) {
      Alert.alert("Google Login Failed", error.message);
      return null;
    }
  }, [googleRequest, googlePromptAsync]);

  /* ---------------------------------------------------------------------- */
  /*                         AUTH STATE CHANGE LISTENER                       */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, nextSession: Session | null) => {
        console.log("🔔 Auth state changed:", event, "session:", !!nextSession);

        switch (event) {
          case "SIGNED_IN":
            setSession(nextSession);
            setUser(nextSession?.user ?? null);
            setIsEmailVerified(!!nextSession?.user?.email_confirmed_at);
            await touchLastActive();

            if (nextSession?.user) {
              try {
                const userProfile = await getProfile(nextSession.user.id);
                setProfile(userProfile);
                queryClient.invalidateQueries({ queryKey: ["user"] });
                queryClient.invalidateQueries({ queryKey: ["profile"] });
              } catch (error) {
                console.error("Error loading profile after sign in:", error);
              }
            }
            setIsLoading(false);
            break;

          case "SIGNED_OUT":
            setSession(null);
            setUser(null);
            setProfile(null);
            setIsEmailVerified(false);
            queryClient.clear();
            setIsLoading(false);
            break;

          case "TOKEN_REFRESHED":
            setSession(nextSession);
            setIsLoading(false);
            break;

          case "USER_UPDATED":
            setSession(nextSession);
            setUser(nextSession?.user ?? null);
            setIsEmailVerified(!!nextSession?.user?.email_confirmed_at);
            if (nextSession?.user) {
              try {
                const userProfile = await getProfile(nextSession.user.id);
                setProfile(userProfile);
                queryClient.invalidateQueries({ queryKey: ["profile"] });
              } catch (error) {
                console.error("Error updating profile:", error);
              }
            }
            setIsLoading(false);
            break;

          default:
            // INITIAL_SESSION, PASSWORD_RECOVERY, etc.
            setSession(nextSession);
            setUser(nextSession?.user ?? null);
            setIsEmailVerified(!!nextSession?.user?.email_confirmed_at);
            setIsLoading(false);
            break;
        }
      },
    );

    return () => subscription.unsubscribe();
  }, [queryClient]);

  const isAuthenticated = !!user;

  const testConnection = useCallback(async () => {
    try {
      const {
        data: { session: currentSession },
        error,
      } = await supabase.auth.getSession();

      if (error) return { success: false, error: error.message };
      return { success: true, session: !!currentSession };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }, []);

  return {
    // State
    user,
    session,
    profile,
    isLoading,
    isAuthenticated,
    isEmailVerified,

    // Onboarding
    hasCompletedOnboarding,
    markOnboardingCompleted,

    // Actions
    checkSession,
    mutateProfile,
    checkEmailVerification,
    testConnection,

    // Account management methods
    signInWithGoogle,
    signOut, // ✅ for screens expecting signOut()
    updatePassword,
    resetPassword,
    resendVerification,
    updateSettings,
    deactivateAccount,
    deleteAccount,

    // TanStack Query mutations
    login: loginMutation,
    googleLogin: googleLoginMutation,
    logout: logoutMutation,
    signup: signupMutation,
    updateProfile: updateProfileMutation,

    // Google OAuth state
    isGoogleReady: !!googleRequest,

    // Supabase client
    supabaseClient: supabase,
  };
};

export type UseAuthReturn = ReturnType<typeof useAuth>;
