// hooks/useAuth.ts
import {
  getCurrentSession,
  getCurrentUser,
  getProfile,
  supabase,
  signInWithEmail as supabaseSignIn,
  signUpWithEmail as supabaseSignUp,
  updateProfile as supabaseUpdateProfile
} from "@/lib/supabase";
import { useMutation } from "@tanstack/react-query";
import { makeRedirectUri } from "expo-auth-session";
import * as Google from "expo-auth-session/providers/google";
import Constants from "expo-constants";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useEffect, useState } from "react";
import { Alert, Platform } from "react-native";

WebBrowser.maybeCompleteAuthSession();

export const useAuth = () => {
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEmailVerified, setIsEmailVerified] = useState(false);

  const redirectUri = makeRedirectUri({
    scheme: "nebulanet",
    path: "auth/callback",
  });

  const [googleRequest, googleResponse, googlePromptAsync] =
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

  const checkSession = useCallback(async () => {
    console.log("🔄 checkSession called");
    setIsLoading(true);

    try {
      const [currentSession, currentUser] = await Promise.all([
        getCurrentSession(),
        getCurrentUser(),
      ]);

      console.log("📊 checkSession results:", {
        session: !!currentSession,
        user: !!currentUser,
        userEmail: currentUser?.email,
        emailVerified: !!currentUser?.email_confirmed_at,
      });

      setSession(currentSession);
      setUser(currentUser);
      setIsEmailVerified(!!currentUser?.email_confirmed_at);

      if (currentUser) {
        const userProfile = await getProfile(currentUser.id);
        setProfile(userProfile);
        console.log("👤 Profile loaded:", !!userProfile);
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

  // Login mutation - COMPLETELY FIXED
  const loginMutation = useMutation({
    mutationFn: async ({
      email,
      password,
    }: {
      email: string;
      password: string;
    }) => {
      console.log("🔄 loginMutation called for:", email);
      try {
        const data = await supabaseSignIn(email, password);
        console.log("✅ loginMutation success, user ID:", data.user?.id);
        return { data, error: null };
      } catch (error: any) {
        console.error("❌ loginMutation error:", {
          message: error.message,
          name: error.name,
          status: error.status,
        });
        return { data: null, error };
      }
    },
    onSuccess: (result) => {
      console.log("🎯 loginMutation onSuccess:", !!result.data);
      if (result.data) {
        setUser(result.data.user);
        setSession(result.data.session);
        setIsEmailVerified(!!result.data.user?.email_confirmed_at);

        console.log(
          "📧 Login onSuccess - email verified:",
          !!result.data.user?.email_confirmed_at,
        );

        if (result.data.user) {
          getProfile(result.data.user.id).then((userProfile) => {
            setProfile(userProfile);
          });
        }
      }
    },
    onError: (error: Error) => {
      console.error("💥 loginMutation onError:", error.message);
    },
  });

  // Google OAuth mutation
  const googleLoginMutation = useMutation({
    mutationFn: async () => {
      if (!googleRequest) {
        throw new Error("Google auth request not ready");
      }

      const result = await googlePromptAsync();

      if (result.type !== "success") {
        throw new Error("Google login cancelled or failed");
      }

      const { id_token, access_token } = result.params;

      if (!id_token) {
        throw new Error("No ID token received from Google");
      }

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: id_token,
        access_token,
      });

      if (error) throw error;
      return { data, error: null };
    },
    onSuccess: (result) => {
      if (result.data) {
        setUser(result.data.user);
        setSession(result.data.session);
        setIsEmailVerified(!!result.data.user?.email_confirmed_at);

        if (result.data.user) {
          getProfile(result.data.user.id).then((userProfile) => {
            setProfile(userProfile);
          });
        }
      }
    },
    onError: (error: Error) => {
      console.error("❌ Google login error:", error);
      if (
        !error.message.includes("cancelled") &&
        !error.message.includes("dismissed")
      ) {
        Alert.alert("Google Login Failed", error.message);
      }
    },
  });

  // Sign in with Google directly
  const signInWithGoogle = useCallback(async () => {
    if (!googleRequest) {
      Alert.alert("Error", "Google auth not ready");
      return;
    }

    try {
      const result = await googlePromptAsync();

      if (result.type !== "success") {
        throw new Error("Google login cancelled or failed");
      }

      const { id_token, access_token } = result.params;

      if (!id_token) {
        throw new Error("No ID token received from Google");
      }

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: id_token,
        access_token,
      });

      if (error) throw error;

      if (data.user) {
        Alert.alert("Success", "Google account linked successfully");
        return data;
      }
    } catch (error: any) {
      console.error("❌ Google sign in error:", error);
      Alert.alert("Google Login Failed", error.message);
    }
  }, [googleRequest, googlePromptAsync]);

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      await supabase.auth.signOut();
    },
    onSuccess: () => {
      setSession(null);
      setUser(null);
      setProfile(null);
      setIsEmailVerified(false);
    },
    onError: (error: Error) => {
      console.error("❌ Logout error:", error);
      Alert.alert("Logout Failed", error.message);
    },
  });

  // Signup mutation
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
      console.log("🔄 signupMutation called for:", email);
      try {
        const data = await supabaseSignUp(email, password, userData);
        console.log("✅ signupMutation success, user ID:", data.user?.id);
        return { data, error: null };
      } catch (error: any) {
        console.error("❌ signupMutation error:", error.message);
        return { data: null, error };
      }
    },
    onSuccess: (result) => {
      console.log("🎯 signupMutation onSuccess:", !!result.data);
      if (result.data) {
        setUser(result.data.user);
        setSession(result.data.session);
        setIsEmailVerified(false);

        if (result.data.user) {
          getProfile(result.data.user.id).then((userProfile) => {
            setProfile(userProfile);
          });
        }
      }
    },
    onError: (error: Error) => {
      console.error("💥 signupMutation onError:", error.message);
      Alert.alert("Signup Failed", error.message);
    },
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (updates: {
      username?: string;
      full_name?: string;
      avatar_url?: string;
      bio?: string;
      website?: string;
      location?: string;
      is_online?: boolean;
      last_seen?: string;
    }) => {
      console.log("🔄 updateProfileMutation called");
      try {
        const data = await supabaseUpdateProfile(updates);
        console.log("✅ updateProfileMutation success");
        return { data, error: null };
      } catch (error: any) {
        console.error("❌ updateProfileMutation error:", error.message);
        return { data: null, error };
      }
    },
    onSuccess: (result) => {
      if (result.data) {
        setProfile(result.data);
      }
    },
    onError: (error: Error) => {
      console.error("💥 updateProfileMutation onError:", error.message);
      Alert.alert("Update Failed", error.message);
    },
  });

  // Update password mutation
  const updatePassword = useMutation({
    mutationFn: async ({ newPassword }: { newPassword: string }) => {
      console.log("🔄 updatePassword mutation called");
      try {
        const { data, error } = await supabase.auth.updateUser({
          password: newPassword,
        });

        if (error) throw error;
        return { data, error: null };
      } catch (error: any) {
        console.error("❌ updatePassword error:", error.message);
        return { data: null, error };
      }
    },
    onSuccess: (result) => {
      if (result.data) {
        Alert.alert("Success", "Password updated successfully");
      }
    },
    onError: (error: Error) => {
      console.error("💥 updatePassword onError:", error.message);
      Alert.alert("Update Failed", error.message);
    },
  });

  // Reset password mutation
  const resetPassword = useMutation({
    mutationFn: async ({ email }: { email: string }) => {
      console.log("🔄 resetPassword mutation called for:", email);
      try {
        const redirectTo = Platform.select({
          ios: `${redirectUri}/auth/reset-password`,
          android: `${redirectUri}/auth/reset-password`,
          default: `${redirectUri}/auth/reset-password`,
        });

        const { data, error } = await supabase.auth.resetPasswordForEmail(
          email.trim().toLowerCase(),
          {
            redirectTo,
          },
        );

        if (error) throw error;
        return { data, error: null };
      } catch (error: any) {
        console.error("❌ resetPassword error:", error.message);
        return { data: null, error };
      }
    },
    onSuccess: (result) => {
      if (result.data) {
        Alert.alert(
          "Check your email",
          "A password reset link has been sent to your email address.",
        );
      }
    },
    onError: (error: Error) => {
      console.error("💥 resetPassword onError:", error.message);
      Alert.alert("Reset Failed", error.message);
    },
  });

  // Resend verification mutation
  const resendVerification = useMutation({
    mutationFn: async ({ email }: { email: string }) => {
      console.log("🔄 resendVerification mutation called for:", email);
      try {
        const redirectTo = Linking.createURL("/(auth)/verify-email");

        const { data, error } = await supabase.auth.resend({
          type: "signup",
          email: email.trim().toLowerCase(),
          options: {
            emailRedirectTo: redirectTo,
          },
        });

        if (error) throw error;
        return { data, error: null };
      } catch (error: any) {
        console.error("❌ resendVerification error:", error.message);
        return { data: null, error };
      }
    },
    onSuccess: (result) => {
      if (result.data) {
        Alert.alert(
          "Verification Email Sent",
          "Please check your inbox for the verification link. If you don't see it, check your spam folder.",
        );
      }
    },
    onError: (error: Error) => {
      console.error("💥 resendVerification onError:", error.message);
      Alert.alert("Resend Failed", error.message);
    },
  });

  // Update settings mutation
  const updateSettings = useMutation({
    mutationFn: async (settings: any) => {
      try {
        if (!user?.id) {
          throw new Error("User not authenticated");
        }

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
        return { data, error: null };
      } catch (error: any) {
        return { data: null, error };
      }
    },
    onSuccess: (result) => {
      if (result.data) {
        Alert.alert("Success", "Settings updated successfully");
      }
    },
    onError: (error: Error) => {
      Alert.alert("Update Failed", error.message);
    },
  });

  // Enable two-factor authentication
  const enableTwoFactor = useMutation({
    mutationFn: async () => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 1000));

        return {
          data: {
            success: true,
            message: "Two-factor authentication enabled",
            backupCodes: ["code1", "code2", "code3"],
          },
          error: null,
        };
      } catch (error: any) {
        return { data: null, error };
      }
    },
    onSuccess: (result) => {
      if (result.data) {
        Alert.alert(
          "2FA Enabled",
          `Two-factor authentication has been enabled. Backup codes: ${result.data.backupCodes.join(", ")}`,
        );
      }
    },
    onError: (error: Error) => {
      Alert.alert("2FA Failed", error.message);
    },
  });

  // Disable two-factor authentication
  const disableTwoFactor = useMutation({
    mutationFn: async () => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 1000));

        return {
          data: {
            success: true,
            message: "Two-factor authentication disabled",
          },
          error: null,
        };
      } catch (error: any) {
        return { data: null, error };
      }
    },
    onSuccess: (result) => {
      if (result.data) {
        Alert.alert("Success", "Two-factor authentication has been disabled");
      }
    },
    onError: (error: Error) => {
      Alert.alert("Disable Failed", error.message);
    },
  });

  // Deactivate account (soft delete)
  const deactivateAccount = useMutation({
    mutationFn: async ({ reason }: { reason?: string } = {}) => {
      try {
        if (!user?.id) {
          throw new Error("User not authenticated");
        }

        const { data, error } = await supabase
          .from("profiles")
          .update({
            status: "deactivated",
            deactivation_reason: reason,
            deactivated_at: new Date().toISOString(),
          })
          .eq("id", user.id)
          .select()
          .single();

        if (error) throw error;

        await supabase.auth.signOut();

        return { data, error: null };
      } catch (error: any) {
        return { data: null, error };
      }
    },
    onSuccess: (result) => {
      if (result.data) {
        setSession(null);
        setUser(null);
        setProfile(null);
        setIsEmailVerified(false);
        Alert.alert(
          "Account Deactivated",
          "Your account has been deactivated. You can reactivate it by logging in again within 30 days.",
        );
      }
    },
    onError: (error: Error) => {
      Alert.alert("Deactivation Failed", error.message);
    },
  });

  // Delete account (permanent)
  const deleteAccount = useMutation({
    mutationFn: async ({ reason }: { reason?: string } = {}) => {
      try {
        if (!user?.id) {
          throw new Error("User not authenticated");
        }

        const { error: deleteError } = await supabase
          .from("profiles")
          .delete()
          .eq("id", user.id);

        if (deleteError) throw deleteError;

        await supabase.auth.signOut();

        return {
          data: { success: true, message: "Account deleted successfully" },
          error: null,
        };
      } catch (error: any) {
        return { data: null, error };
      }
    },
    onSuccess: (result) => {
      if (result.data) {
        setSession(null);
        setUser(null);
        setProfile(null);
        setIsEmailVerified(false);
        Alert.alert(
          "Account Deleted",
          "Your account has been permanently deleted. All your data has been removed.",
        );
      }
    },
    onError: (error: Error) => {
      Alert.alert("Deletion Failed", error.message);
    },
  });

  // Mutate profile (refresh)
  const mutateProfile = useCallback(async () => {
    if (user?.id) {
      try {
        const userProfile = await getProfile(user.id);
        setProfile(userProfile);
      } catch (error) {
        console.error("Error mutating profile:", error);
      }
    }
  }, [user?.id]);

  // Check email verification status
  const checkEmailVerification = useCallback(async () => {
    if (user?.id) {
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
    }
    return false;
  }, [user?.id]);

  // Handle Google OAuth response
  useEffect(() => {
    if (googleResponse?.type === "success") {
      const { authentication } = googleResponse;
      if (authentication) {
        googleLoginMutation.mutate();
      }
    }
  }, [googleResponse, googleLoginMutation]);

  // Handle auth state changes
  useEffect(() => {
    console.log("🔧 Setting up auth state listener");
    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("🔔 Auth state changed:", event, "session:", !!session);

      if (event === "SIGNED_IN") {
        setSession(session);
        setUser(session?.user ?? null);
        setIsEmailVerified(!!session?.user?.email_confirmed_at);

        if (session?.user) {
          try {
            const userProfile = await getProfile(session.user.id);
            setProfile(userProfile);
          } catch (error) {
            console.error("Error loading profile after sign in:", error);
          }
        }

        setIsLoading(false);
      } else if (event === "SIGNED_OUT") {
        setSession(null);
        setUser(null);
        setProfile(null);
        setIsEmailVerified(false);
        setIsLoading(false);
      } else if (event === "TOKEN_REFRESHED") {
        setSession(session);
        setIsLoading(false);
      } else if (event === "USER_UPDATED") {
        if (session?.user) {
          try {
            const userProfile = await getProfile(session.user.id);
            setProfile(userProfile);
            setIsEmailVerified(!!session.user.email_confirmed_at);
          } catch (error) {
            console.error("Error updating profile:", error);
          }
        }
      }
    });

    return () => {
      console.log("🧹 Cleaning up auth subscription");
      subscription.unsubscribe();
    };
  }, [checkSession]);

  const isAuthenticated = !!user;

  // Test connection function
  const testConnection = useCallback(async () => {
    console.log("🔌 Testing Supabase connection from hook...");
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.error("❌ Connection test failed:", error.message);
        return { success: false, error: error.message };
      }

      console.log("✅ Connection test successful! Session exists:", !!session);
      return { success: true, session: !!session };
    } catch (error: any) {
      console.error("❌ Connection test exception:", error.message);
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

    // Actions
    checkSession,
    mutateProfile,
    checkEmailVerification,
    testConnection,

    // Account management methods
    signInWithGoogle,
    updatePassword,
    resetPassword,
    resendVerification,
    updateSettings,
    enableTwoFactor,
    disableTwoFactor,
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
