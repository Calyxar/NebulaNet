// providers/AuthProvider.tsx ✅
// ✅ FIXED: birthdate is never wiped on app update — profileRef.set() only runs
//           when profile does not exist (new user). Existing users use .update()
//           so birthdate, age_group and all other fields are preserved.
// ✅ FIXED: removed redo onboarding logic — onboarding only happens once at signup
// ✅ FIXED: user_settings uses real-time onSnapshot listener

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";
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
import firestore, {
  FirebaseFirestoreTypes,
} from "@react-native-firebase/firestore";
import { router } from "expo-router";
import { Alert, Platform, ToastAndroid } from "react-native";

import { initPresence, teardownPresence } from "@/lib/firestore/presence";
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
  is_founder?: boolean;
  created_at: string;
  updated_at: string;
  birthdate?: string | null;
  age_group?: "under_13" | "teen" | "adult" | null;
  birthDate?: FirebaseFirestoreTypes.Timestamp | null;
  birthMMDD?: string | null;
  showBirthday?: boolean;
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

type EmailPasswordVars = { email: string; password: string };
type LoginMutation = UseMutationResult<any, Error, EmailPasswordVars>;
type SignupMutation = UseMutationResult<any, Error, EmailPasswordVars>;
type UpdateProfileMutation = UseMutationResult<void, Error, Partial<Profile>>;

interface AuthContextType {
  user: FirebaseUser | null;
  profile: Profile | null;
  userSettings: UserSettings | null;
  isLoading: boolean;
  isProfileLoading: boolean;
  isUserSettingsLoading: boolean;
  hasCompletedOnboarding: boolean;
  themePreference: ThemePreference | null;
  setThemePreference: (pref: ThemePreference) => Promise<void>;
  login: LoginMutation;
  signup: SignupMutation;
  updateProfile: UpdateProfileMutation;
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

const nowIso = () => new Date().toISOString();
const toast = (message: string) => {
  if (Platform.OS === "android") ToastAndroid.show(message, ToastAndroid.SHORT);
  else console.log("Toast:", message);
};

async function isWithinFirstHundred(): Promise<boolean> {
  try {
    const snap = await firestore().collection("profiles").limit(100).get();
    return snap.docs.length < 100;
  } catch {
    return false;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [isUserSettingsLoading, setIsUserSettingsLoading] = useState(true);

  const userId = user?.uid ?? null;

  // ── Firebase Auth listener ─────────────────────────────
  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(
      async (u: FirebaseAuthTypes.User | null) => {
        try {
          if (!u) {
            setUser(null);
            setHydrated(true);
            return;
          }

          (u as any).id = u.uid;
          try {
            initRevenueCat(u.uid);
          } catch {}
          try {
            registerForPushNotificationsAsync().catch(() => {});
          } catch {}

          const profileRef = firestore().collection("profiles").doc(u.uid);
          const profileSnap = await profileRef.get();

          if (!profileSnap.exists()) {
            // ✅ Only runs for BRAND NEW users — never overwrites existing profile
            // so birthdate, age_group, and all user data is always preserved on updates
            const baseUsername =
              u.email?.split("@")[0] ?? `user_${u.uid.slice(0, 8)}`;
            const t = nowIso();
            const isFounder = await isWithinFirstHundred();
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
              is_founder: isFounder,
              created_at: t,
              updated_at: t,
              created_at_ts: firestore.FieldValue.serverTimestamp(),
              updated_at_ts: firestore.FieldValue.serverTimestamp(),
            });
          }
          // ✅ Existing users: profile doc is NEVER touched here
          // birthdate, age_group, avatar, bio — all preserved on every app update

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
          initPresence(u.uid);
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

  // ✅ Real-time listener for user_settings
  useEffect(() => {
    if (!userId) {
      setUserSettings(null);
      setIsUserSettingsLoading(false);
      return;
    }
    setIsUserSettingsLoading(true);
    const unsub = firestore()
      .collection("user_settings")
      .doc(userId)
      .onSnapshot(
        (snap) => {
          try {
            const exists = snap?.exists?.();
            setUserSettings(exists ? (snap.data() as UserSettings) : null);
          } catch (err) {
            console.warn("user_settings snapshot processing failed:", err);
            setUserSettings(null);
          } finally {
            setIsUserSettingsLoading(false);
          }
        },
        (err) => {
          console.warn("user_settings listener error:", err);
          setIsUserSettingsLoading(false);
        },
      );
    return unsub;
  }, [userId]);

  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: ["profile", userId],
    enabled: !!userId && hydrated,
    queryFn: async () => {
      if (!userId) return null;
      const snap = await firestore().collection("profiles").doc(userId).get();
      return snap.exists() ? (snap.data() as Profile) : null;
    },
  });

  const hasCompletedOnboarding = !!userSettings?.onboarding_completed;
  const themePreference = userSettings?.theme_preference ?? null;

  const login = useMutation<any, Error, EmailPasswordVars>({
    mutationFn: async ({ email, password }) =>
      auth().signInWithEmailAndPassword(email, password),
  });

  const signup = useMutation<any, Error, EmailPasswordVars>({
    mutationFn: async ({ email, password }) => {
      const res = await auth().createUserWithEmailAndPassword(email, password);
      try {
        await res.user.sendEmailVerification();
      } catch {}
      return res;
    },
    onError: (err) => toast(`Signup failed: ${err.message}`),
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

      // ✅ FIXED: propagate denormalized author info to existing content
      // whenever username OR full_name (display name) changes — not just
      // username. Previously full_name was never propagated at all, so
      // changing your display name silently never updated old posts.
      const usernameChanged = !!updates.username;
      const nameChanged = updates.full_name !== undefined;
      if (usernameChanged || nameChanged) {
        const newUsername = updates.username;
        const newUsernameLc = newUsername?.toLowerCase();
        const newFullName = updates.full_name;
        const newAvatarUrl = updates.avatar_url;

        // Build the patch for embedded `user: ProfileRow` objects
        // (matches the ProfileRow shape in lib/firestore/posts.ts:
        // { id, username, full_name, avatar_url } — no username_lc there).
        const userPatch: Record<string, any> = {};
        if (usernameChanged) userPatch["user.username"] = newUsername;
        if (nameChanged) userPatch["user.full_name"] = newFullName;
        if (newAvatarUrl !== undefined)
          userPatch["user.avatar_url"] = newAvatarUrl;

        const authorPatch: Record<string, any> = {};
        if (usernameChanged) {
          authorPatch["author.username"] = newUsername;
          authorPatch["author.username_lc"] = newUsernameLc;
        }
        if (nameChanged) authorPatch["author.full_name"] = newFullName;
        if (newAvatarUrl !== undefined)
          authorPatch["author.avatar_url"] = newAvatarUrl;

        const profilesEmbedPatch: Record<string, any> = {};
        if (usernameChanged)
          profilesEmbedPatch["profiles.username"] = newUsername;
        if (nameChanged) profilesEmbedPatch["profiles.full_name"] = newFullName;

        const participantPatch: Record<string, any> = {};
        if (usernameChanged)
          participantPatch[`participants.${userId}.username`] = newUsername;
        if (nameChanged)
          participantPatch[`participants.${userId}.full_name`] = newFullName;

        await Promise.allSettled([
          (async () => {
            if (!Object.keys(userPatch).length) return;
            const snap = await firestore()
              .collection("posts")
              .where("user_id", "==", userId)
              .get();
            if (!snap.docs.length) return;
            const batch = firestore().batch();
            snap.docs.forEach((doc) => {
              batch.update(doc.ref, userPatch);
            });
            await batch.commit();
          })(),
          (async () => {
            if (!Object.keys(authorPatch).length) return;
            const snap = await firestore()
              .collection("comments")
              .where("user_id", "==", userId)
              .get();
            if (!snap.docs.length) return;
            const batch = firestore().batch();
            snap.docs.forEach((doc) => {
              batch.update(doc.ref, authorPatch);
            });
            await batch.commit();
          })(),
          (async () => {
            if (!Object.keys(profilesEmbedPatch).length) return;
            const snap = await firestore()
              .collection("stories")
              .where("user_id", "==", userId)
              .get();
            if (!snap.docs.length) return;
            const batch = firestore().batch();
            snap.docs.forEach((doc) => {
              batch.update(doc.ref, profilesEmbedPatch);
            });
            await batch.commit();
          })(),
          (async () => {
            if (!Object.keys(participantPatch).length) return;
            const snap = await firestore()
              .collection("conversations")
              .where("participant_ids", "array-contains", userId)
              .get();
            if (!snap.docs.length) return;
            const batch = firestore().batch();
            snap.docs.forEach((doc) => {
              batch.update(doc.ref, participantPatch);
            });
            await batch.commit();
          })(),
        ]);
      }
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
    },
    [userId],
  );

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
    await qc.refetchQueries({ queryKey: ["profile", userId] });
  }, [updateSettings, qc, userId]);

  const skipOnboarding = completeOnboarding;

  const deactivateAccount = useCallback(async () => {
    if (!userId) throw new Error("Not authenticated");
    await firestore().collection("profiles").doc(userId).update({
      is_deactivated: true,
      updated_at: nowIso(),
      updated_at_ts: firestore.FieldValue.serverTimestamp(),
    });
    await teardownPresence(userId);
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
          email: u.email || null,
          status: "requested",
          created_at: nowIso(),
          created_at_ts: firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    Alert.alert(
      "Account Deletion Started",
      "Your account and data are being deleted now. This usually finishes within a few minutes, and you'll be signed out automatically.",
      [{ text: "OK" }],
    );
  }, [userId]);

  const signOut = useCallback(async () => {
    if (userId) await teardownPresence(userId);
    await auth().signOut();
    qc.clear();
    router.replace("/(auth)/login");
  }, [qc, userId]);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      profile: profile ?? null,
      userSettings,
      isLoading: !hydrated,
      isProfileLoading,
      isUserSettingsLoading,
      hasCompletedOnboarding,
      themePreference,
      setThemePreference,
      login,
      signup,
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
