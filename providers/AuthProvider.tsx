// providers/AuthProvider.tsx — FIXED ✅
// ✅ ADDED: hasCompletedOnboarding, themePreference, setThemePreference to interface + value
// ✅ FIXED: Google Sign-In idToken access for newer SDK versions
// ✅ FIXED: googleLogin mutation type matches useAuth.ts expectation

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import auth, { FirebaseAuthTypes } from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { Platform, ToastAndroid } from "react-native";

import { initRevenueCat } from "@/lib/revenuecat";
import { registerForPushNotificationsAsync } from "@/utils/pushNotifications";

export type FirebaseUser = FirebaseAuthTypes.User & { id: string };
export type ThemePreference = "light" | "dark" | "system";

export interface Profile {
  id: string;
  username: string;
  username_lc: string;
  full_name: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  location?: string | null;
  role?: "user" | "admin";
  is_suspended?: boolean;
  is_deactivated?: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserSettings {
  user_id: string;
  onboarding_completed: boolean | null;
  onboarding_completed_at: string | null;
  theme_preference: ThemePreference | null;
  language?: string | null;
  region?: string | null;
  updated_at: string | null;
}

interface AuthContextType {
  user: FirebaseUser | null;
  profile: Profile | null;
  userSettings: UserSettings | null;
  isLoading: boolean;
  isProfileLoading: boolean;
  isUserSettingsLoading: boolean;

  // ✅ ADDED: missing properties
  hasCompletedOnboarding: boolean;
  themePreference: ThemePreference | null;
  setThemePreference: (pref: ThemePreference) => Promise<void>;

  login: UseMutationResult<
    FirebaseAuthTypes.UserCredential,
    Error,
    { email: string; password: string }
  >;
  signup: UseMutationResult<
    FirebaseAuthTypes.UserCredential,
    Error,
    { email: string; password: string }
  >;
  googleLogin: UseMutationResult<FirebaseAuthTypes.UserCredential, Error, void>;

  updateProfile: UseMutationResult<void, Error, Partial<Profile>>;
  updateSettings: (
    updates: Partial<UserSettings> & Record<string, any>,
  ) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  skipOnboarding: () => Promise<void>;
  deactivateAccount: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const LAST_AUTH_UID_KEY = "nebula:last_auth_uid";

const nowIso = () => new Date().toISOString();
const toast = (message: string) => {
  if (Platform.OS === "android") ToastAndroid.show(message, ToastAndroid.SHORT);
  else console.log("Toast:", message);
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const userId = user?.uid ?? null;

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(
      async (u: FirebaseAuthTypes.User | null) => {
        try {
          if (!u) {
            const lastUid = await AsyncStorage.getItem(LAST_AUTH_UID_KEY);
            if (lastUid) {
              // Helps avoid false logouts right after app updates / cold starts.
              await new Promise((r) => setTimeout(r, 1200));
              const retryUser = auth().currentUser;
              if (retryUser) {
                (retryUser as any).id = retryUser.uid;
                setUser(retryUser as FirebaseUser);
                setHydrated(true);
                return;
              }
            }
            await AsyncStorage.removeItem(LAST_AUTH_UID_KEY);
            setUser(null);
            setHydrated(true);
            return;
          }
          (u as any).id = u.uid;
          await AsyncStorage.setItem(LAST_AUTH_UID_KEY, u.uid);

          try {
            initRevenueCat(u.uid);
          } catch {}
          try {
            registerForPushNotificationsAsync().catch(() => {});
          } catch {}

          const profileRef = firestore().collection("profiles").doc(u.uid);
          const profileSnap = await profileRef.get();
          if (!profileSnap.exists()) {
            const baseUsername =
              u.email?.split("@")[0] ?? `user_${u.uid.slice(0, 8)}`;
            const t = nowIso();
            await profileRef.set({
              id: u.uid,
              username: baseUsername,
              username_lc: baseUsername.toLowerCase(),
              full_name: u.displayName ?? null,
              avatar_url: u.photoURL ?? null,
              bio: null,
              location: null,
              role: "user",
              is_suspended: false,
              is_deactivated: false,
              created_at: t,
              updated_at: t,
              created_at_ts: firestore.FieldValue.serverTimestamp(),
              updated_at_ts: firestore.FieldValue.serverTimestamp(),
            });
          }

          const settingsRef = firestore()
            .collection("user_settings")
            .doc(u.uid);
          const settingsSnap = await settingsRef.get();
          if (!settingsSnap.exists()) {
            await settingsRef.set({
              user_id: u.uid,
              onboarding_completed: false,
              onboarding_completed_at: null,
              theme_preference: null,
              updated_at: nowIso(),
              updated_at_ts: firestore.FieldValue.serverTimestamp(),
            });
          }

          setUser(u as FirebaseUser);
        } catch (err) {
          console.warn("AuthState processing failed:", err);
          setUser(null);
        } finally {
          setHydrated(true);
        }
      },
    );
    return unsubscribe;
  }, []);

  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: ["profile", userId],
    enabled: !!userId && hydrated,
    queryFn: async () => {
      if (!userId) return null;
      const snap = await firestore().collection("profiles").doc(userId).get();
      return snap.exists() ? (snap.data() as Profile) : null;
    },
  });

  const { data: userSettings, isLoading: isUserSettingsLoading } = useQuery({
    queryKey: ["user-settings", userId],
    enabled: !!userId && hydrated,
    queryFn: async () => {
      if (!userId) return null;
      const snap = await firestore()
        .collection("user_settings")
        .doc(userId)
        .get();
      return snap.exists() ? (snap.data() as UserSettings) : null;
    },
  });

  // ✅ ADDED: derived values
  const hasCompletedOnboarding = !!userSettings?.onboarding_completed;
  const themePreference = userSettings?.theme_preference ?? null;

  const login = useMutation<
    FirebaseAuthTypes.UserCredential,
    Error,
    { email: string; password: string }
  >({
    mutationFn: async ({ email, password }) =>
      auth().signInWithEmailAndPassword(email, password),
    onError: (err) => toast(`Login failed: ${err.message}`),
  });

  const signup = useMutation<
    FirebaseAuthTypes.UserCredential,
    Error,
    { email: string; password: string }
  >({
    mutationFn: async ({ email, password }) => {
      const res = await auth().createUserWithEmailAndPassword(email, password);
      try {
        await res.user.sendEmailVerification();
      } catch {}
      return res;
    },
    onError: (err) => toast(`Signup failed: ${err.message}`),
  });

  const googleLogin = useMutation<
    FirebaseAuthTypes.UserCredential,
    Error,
    void
  >({
    mutationFn: async () => {
      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });
      await GoogleSignin.signIn();
      // ✅ FIXED: use getTokens() for newer SDK versions where idToken is not on signIn() result
      const { idToken } = await GoogleSignin.getTokens();
      if (!idToken) throw new Error("Google login failed: no token returned");
      const googleCredential = auth.GoogleAuthProvider.credential(idToken);
      return auth().signInWithCredential(googleCredential);
    },
    onError: (err) => toast(`Google login failed: ${err.message}`),
  });

  const updateProfile = useMutation<void, Error, Partial<Profile>>({
    mutationFn: async (updates) => {
      if (!userId) throw new Error("Not authenticated");
      if (updates.username) {
        const usernameLc = updates.username.toLowerCase();
        const snap = await firestore()
          .collection("profiles")
          .where("username_lc", "==", usernameLc)
          .get();
        for (const d of snap.docs) {
          if (d.id !== userId)
            throw new Error("This username is already taken");
        }
        updates.username_lc = usernameLc;
      }
      await firestore()
        .collection("profiles")
        .doc(userId)
        .update({
          ...updates,
          updated_at: nowIso(),
          updated_at_ts: firestore.FieldValue.serverTimestamp(),
        });
      await qc.invalidateQueries({ queryKey: ["profile", userId] });
    },
    onError: (err) => toast(`Profile update failed: ${err.message}`),
  });

  const updateSettings = useCallback(
    async (updates: Partial<UserSettings> & Record<string, any>) => {
      if (!userId) throw new Error("Not authenticated");
      await firestore()
        .collection("user_settings")
        .doc(userId)
        .set(
          {
            ...updates,
            user_id: userId,
            updated_at: nowIso(),
            updated_at_ts: firestore.FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      await qc.invalidateQueries({ queryKey: ["user-settings", userId] });
    },
    [userId, qc],
  );

  // ✅ ADDED: setThemePreference
  const setThemePreference = useCallback(
    async (pref: ThemePreference) => {
      await updateSettings({ theme_preference: pref });
    },
    [updateSettings],
  );

  const completeOnboarding = useCallback(async () => {
    await updateSettings({
      onboarding_completed: true,
      onboarding_completed_at: nowIso(),
    });
  }, [updateSettings]);

  const skipOnboarding = completeOnboarding;

  const deactivateAccount = useCallback(async () => {
    if (!userId) throw new Error("Not authenticated");
    await firestore().collection("profiles").doc(userId).update({
      is_deactivated: true,
      updated_at: nowIso(),
      updated_at_ts: firestore.FieldValue.serverTimestamp(),
    });
    await auth().signOut();
    qc.clear();
  }, [userId, qc]);

  const deleteAccount = useCallback(async () => {
    if (!userId) throw new Error("Not authenticated");
    const u = auth().currentUser;
    if (!u) throw new Error("Not authenticated");
    await firestore()
      .collection("account_deletion_requests")
      .doc(userId)
      .set(
        {
          user_id: userId,
          status: "requested",
          created_at: nowIso(),
          created_at_ts: firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    try {
      await firestore().collection("profiles").doc(userId).delete();
    } catch {}
    try {
      await firestore()
        .collection("user_settings")
        .doc(userId)
        .set({ deleted_at: nowIso() }, { merge: true });
    } catch {}
    try {
      await u.delete();
    } catch (e: any) {
      if (String(e?.code).includes("requires-recent-login"))
        throw new Error("Please re-authenticate, then try again.");
      throw e;
    } finally {
      qc.clear();
    }
  }, [userId, qc]);

  const signOut = useCallback(async () => {
    await auth().signOut();
    qc.clear();
  }, [qc]);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      profile: profile ?? null,
      userSettings: userSettings ?? null,
      isLoading: !hydrated,
      isProfileLoading,
      isUserSettingsLoading,
      hasCompletedOnboarding, // ✅ ADDED
      themePreference, // ✅ ADDED
      setThemePreference, // ✅ ADDED
      login,
      signup,
      googleLogin,
      updateProfile,
      updateSettings,
      completeOnboarding,
      skipOnboarding,
      deactivateAccount,
      deleteAccount,
      signOut,
    }),
    [
      user,
      profile,
      userSettings,
      hydrated,
      isProfileLoading,
      isUserSettingsLoading,
      hasCompletedOnboarding,
      themePreference,
      setThemePreference,
      login,
      signup,
      googleLogin,
      updateProfile,
      updateSettings,
      completeOnboarding,
      skipOnboarding,
      deactivateAccount,
      deleteAccount,
      signOut,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
