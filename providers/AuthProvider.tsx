// providers/AuthProvider.tsx — FIREBASE ✅ (DROP-IN STYLE)
// Replaces Supabase with Firebase Auth + Firestore
// ✅ Sends email verification on signup
// ✅ Optional: block email/password login if not verified
// ✅ Works with emulator wiring in lib/firebase.ts

import { auth, db } from "@/lib/firebase";
import type { User as FirebaseUserBase } from "firebase/auth";
import {
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendEmailVerification,
  signInWithCredential,
  signInWithEmailAndPassword,
} from "firebase/auth";

import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  type Timestamp,
} from "firebase/firestore";

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

// ✅ Extend FirebaseUser to add `id` as alias for `uid`
// This fixes all `user.id` references across the app
export type FirebaseUser = FirebaseUserBase & { id: string };

/* =========================================================
   TYPES
========================================================= */

export type Preferences = {
  language?: string;
  region?: string;
  localized_content?: boolean;
};

export interface Profile {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  location?: string | null;
  created_at: string;
  updated_at: string;
}

export type ThemePreference = "light" | "dark" | "system";

export type UserSettingsRow = {
  user_id: string;

  onboarding_completed: boolean | null;
  onboarding_completed_at: string | null;

  theme_preference: ThemePreference | null;

  preferences?: Preferences | null;

  updated_at: string | null;

  language?: string | null;
  region?: string | null;
  localized_content?: boolean | null;
};

type UpdateProfileInput = Partial<
  Pick<Profile, "username" | "full_name" | "avatar_url" | "bio" | "location">
>;

type LoginVars = { email: string; password: string };
type SignupVars = { email: string; password: string; userData?: any };
type GoogleVars = { idToken: string; accessToken?: string };

// Firebase mutation result types
type LoginResult = Awaited<ReturnType<typeof signInWithEmailAndPassword>>;
type SignupResult = Awaited<ReturnType<typeof createUserWithEmailAndPassword>>;
type GoogleLoginResult = Awaited<ReturnType<typeof signInWithCredential>>;

interface AuthContextType {
  user: FirebaseUser | null;
  session: null; // keep compatibility
  profile: Profile | null;
  userSettings: UserSettingsRow | null;

  isLoading: boolean;
  isProfileLoading: boolean;
  isUserSettingsLoading: boolean;

  hasCompletedOnboarding: boolean;
  markOnboardingCompleted: (interests?: string[]) => Promise<boolean>;

  themePreference: ThemePreference | null;
  setThemePreference: (pref: ThemePreference) => Promise<void>;

  login: UseMutationResult<LoginResult, Error, LoginVars>;
  signup: UseMutationResult<SignupResult, Error, SignupVars>;
  googleLogin: UseMutationResult<GoogleLoginResult, Error, GoogleVars>;

  updateProfile: UseMutationResult<Profile, Error, UpdateProfileInput>;

  signOut: () => Promise<void>;
  refreshProfile: () => Promise<Profile | null>;

  updateSettings: (
    settings: Partial<UserSettingsRow>,
  ) => Promise<UserSettingsRow>;

  deactivateAccount: (reason?: string) => Promise<void>;
  deleteAccount: (reason?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/* =========================================================
   CONFIG
========================================================= */

// Toggle if you want to block email/password login until email verified
const REQUIRE_EMAIL_VERIFICATION = false;

/* =========================================================
   HELPERS: Firestore paths
========================================================= */

const profileDocRef = (uid: string) => doc(db, "profiles", uid);
const settingsDocRef = (uid: string) => doc(db, "user_settings", uid);
const interestsDocRef = (uid: string) => doc(db, "user_interests", uid);

function tsToIso(value: any): string | null {
  // Supports Firestore Timestamp, ISO string, null/undefined
  if (!value) return null;
  if (typeof value === "string") return value;
  const maybeTs = value as Timestamp;
  // Firestore Timestamp has toDate()
  if (typeof (maybeTs as any)?.toDate === "function") {
    return maybeTs.toDate().toISOString();
  }
  return null;
}

/* =========================================================
   PROVIDER
========================================================= */

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();

  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [hydrated, setHydrated] = useState(false);

  /* ============================
     AUTH STATE (Firebase)
  ============================ */

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      // ✅ Attach `id` as alias for `uid` so user.id works everywhere
      if (u) {
        (u as any).id = u.uid;
      }
      setUser((u as FirebaseUser) ?? null);
      setHydrated(true);
    });
    return unsub;
  }, []);

  const userId = user?.uid;

  /* ============================
     PROFILE (Firestore)
     profiles/{uid}
  ============================ */

  const { data: profile, isLoading: isProfileLoading } =
    useQuery<Profile | null>({
      queryKey: ["profile", userId],
      enabled: !!userId && hydrated,
      queryFn: async () => {
        if (!userId) return null;

        const snap = await getDoc(profileDocRef(userId));
        if (!snap.exists()) return null;

        const d = snap.data() as any;

        const createdAt =
          d.created_at ?? tsToIso(d.created_at_ts) ?? new Date().toISOString();

        const updatedAt =
          d.updated_at ?? tsToIso(d.updated_at_ts) ?? new Date().toISOString();

        return {
          id: userId,
          username: d.username ?? "",
          full_name: d.full_name ?? null,
          avatar_url: d.avatar_url ?? null,
          bio: d.bio ?? null,
          location: d.location ?? null,
          created_at: createdAt,
          updated_at: updatedAt,
        };
      },
    });

  /* ============================
     USER SETTINGS (Firestore)
     user_settings/{uid}
  ============================ */

  const { data: userSettings, isLoading: isUserSettingsLoading } =
    useQuery<UserSettingsRow | null>({
      queryKey: ["user-settings", userId],
      enabled: !!userId && hydrated,
      queryFn: async () => {
        if (!userId) return null;

        const snap = await getDoc(settingsDocRef(userId));
        if (!snap.exists()) return null;

        const d = snap.data() as any;

        return {
          user_id: userId,
          onboarding_completed: d.onboarding_completed ?? null,
          onboarding_completed_at:
            d.onboarding_completed_at ?? tsToIso(d.onboarding_completed_at_ts),
          theme_preference: d.theme_preference ?? null,
          preferences: d.preferences ?? null,
          updated_at: d.updated_at ?? tsToIso(d.updated_at_ts),
        };
      },
    });

  const hasCompletedOnboarding = !!userSettings?.onboarding_completed;
  const themePreference = userSettings?.theme_preference ?? null;

  /* ============================
     AUTH MUTATIONS (Firebase)
  ============================ */

  const login = useMutation<LoginResult, Error, LoginVars>({
    mutationFn: async ({ email, password }) => {
      const res = await signInWithEmailAndPassword(auth, email, password);

      if (REQUIRE_EMAIL_VERIFICATION && !res.user.emailVerified) {
        // Optional enforcement
        await firebaseSignOut(auth);
        throw new Error("Email not verified. Please verify your email first.");
      }

      return res;
    },
  });

  const signup = useMutation<SignupResult, Error, SignupVars>({
    mutationFn: async ({ email, password, userData }) => {
      const res = await createUserWithEmailAndPassword(auth, email, password);

      const uid = res.user.uid;
      const nowIso = new Date().toISOString();

      // ✅ Send verification email
      try {
        await sendEmailVerification(res.user);
      } catch (e) {
        // Don’t fail signup if email sending hiccups
        console.warn("sendEmailVerification failed:", e);
      }

      // Create initial profile doc
      await setDoc(
        profileDocRef(uid),
        {
          id: uid,
          username: userData?.username ?? "",
          full_name: userData?.full_name ?? null,
          avatar_url: userData?.avatar_url ?? null,
          bio: userData?.bio ?? null,
          location: userData?.location ?? null,
          created_at: nowIso,
          updated_at: nowIso,
          created_at_ts: serverTimestamp(),
          updated_at_ts: serverTimestamp(),
        },
        { merge: true },
      );

      // Create default settings doc
      await setDoc(
        settingsDocRef(uid),
        {
          user_id: uid,
          onboarding_completed: false,
          onboarding_completed_at: null,
          theme_preference: null,
          preferences: userData?.preferences ?? null,
          updated_at: nowIso,
          updated_at_ts: serverTimestamp(),
        },
        { merge: true },
      );

      qc.invalidateQueries({ queryKey: ["profile", uid] });
      qc.invalidateQueries({ queryKey: ["user-settings", uid] });

      return res;
    },
  });

  const googleLogin = useMutation<GoogleLoginResult, Error, GoogleVars>({
    mutationFn: async ({ idToken, accessToken }) => {
      const cred = GoogleAuthProvider.credential(idToken, accessToken);
      const res = await signInWithCredential(auth, cred);

      const uid = res.user.uid;
      const nowIso = new Date().toISOString();

      await setDoc(
        profileDocRef(uid),
        {
          id: uid,
          username: "",
          full_name: res.user.displayName ?? null,
          avatar_url: res.user.photoURL ?? null,
          created_at: nowIso,
          updated_at: nowIso,
          created_at_ts: serverTimestamp(),
          updated_at_ts: serverTimestamp(),
        },
        { merge: true },
      );

      await setDoc(
        settingsDocRef(uid),
        {
          user_id: uid,
          onboarding_completed: false,
          onboarding_completed_at: null,
          theme_preference: null,
          preferences: null,
          updated_at: nowIso,
          updated_at_ts: serverTimestamp(),
        },
        { merge: true },
      );

      qc.invalidateQueries({ queryKey: ["profile", uid] });
      qc.invalidateQueries({ queryKey: ["user-settings", uid] });

      return res;
    },
  });

  /* ============================
     SETTINGS UPDATE (Firestore)
  ============================ */

  const updateSettings = useCallback(
    async (settings: Partial<UserSettingsRow>): Promise<UserSettingsRow> => {
      if (!userId) throw new Error("Not authenticated");

      const safe: any = {};

      if (typeof settings.onboarding_completed === "boolean") {
        safe.onboarding_completed = settings.onboarding_completed;
      }
      if (
        typeof settings.onboarding_completed_at === "string" ||
        settings.onboarding_completed_at === null
      ) {
        safe.onboarding_completed_at = settings.onboarding_completed_at;
      }
      if (
        typeof settings.theme_preference === "string" ||
        settings.theme_preference === null
      ) {
        safe.theme_preference = settings.theme_preference;
      }
      if (settings.preferences !== undefined) {
        safe.preferences = settings.preferences ?? null;
      }

      const nowIso = new Date().toISOString();
      safe.user_id = userId;
      safe.updated_at = nowIso;
      safe.updated_at_ts = serverTimestamp();

      await setDoc(settingsDocRef(userId), safe, { merge: true });

      const snap = await getDoc(settingsDocRef(userId));
      const d = snap.exists() ? (snap.data() as any) : {};

      const normalized: UserSettingsRow = {
        user_id: userId,
        onboarding_completed: d.onboarding_completed ?? null,
        onboarding_completed_at: d.onboarding_completed_at ?? null,
        theme_preference: d.theme_preference ?? null,
        preferences: d.preferences ?? null,
        updated_at: d.updated_at ?? null,
      };

      qc.setQueryData(["user-settings", userId], normalized);
      return normalized;
    },
    [userId, qc],
  );

  /* ============================
     ONBOARDING
  ============================ */

  const markOnboardingCompleted = useCallback(
    async (interests: string[] = []) => {
      if (!userId) throw new Error("Not authenticated");

      await updateSettings({
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString(),
      });

      if (interests.length > 0) {
        await setDoc(
          interestsDocRef(userId),
          {
            user_id: userId,
            interests,
            updated_at_ts: serverTimestamp(),
          },
          { merge: true },
        );
      }

      return true;
    },
    [userId, updateSettings],
  );

  /* ============================
     THEME
  ============================ */

  const setThemePreference = useCallback(
    async (pref: ThemePreference) => {
      await updateSettings({ theme_preference: pref });
    },
    [updateSettings],
  );

  /* ============================
     PROFILE UPDATE (Firestore)
  ============================ */

  const updateProfile = useMutation<Profile, Error, UpdateProfileInput>({
    mutationFn: async (input) => {
      if (!userId) throw new Error("Not authenticated");

      const nowIso = new Date().toISOString();

      await setDoc(
        profileDocRef(userId),
        {
          ...input,
          id: userId,
          updated_at: nowIso,
          updated_at_ts: serverTimestamp(),
        },
        { merge: true },
      );

      const snap = await getDoc(profileDocRef(userId));
      if (!snap.exists()) throw new Error("Profile not found after update");

      const d = snap.data() as any;

      const normalized: Profile = {
        id: userId,
        username: d.username ?? "",
        full_name: d.full_name ?? null,
        avatar_url: d.avatar_url ?? null,
        bio: d.bio ?? null,
        location: d.location ?? null,
        created_at: d.created_at ?? nowIso,
        updated_at: d.updated_at ?? nowIso,
      };

      qc.setQueryData(["profile", userId], normalized);
      return normalized;
    },
  });

  const refreshProfile = useCallback(async () => {
    if (!userId) return null;
    await qc.invalidateQueries({ queryKey: ["profile", userId] });
    return profile ?? null;
  }, [userId, qc, profile]);

  /* ============================
     SIGN OUT
  ============================ */

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
    qc.clear();
  }, [qc]);

  /* ============================
     PROVIDER VALUE
  ============================ */

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      session: null,
      profile: profile ?? null,
      userSettings: userSettings ?? null,

      isLoading: !hydrated,
      isProfileLoading,
      isUserSettingsLoading,

      hasCompletedOnboarding,
      markOnboardingCompleted,

      themePreference,
      setThemePreference,

      login,
      signup,
      googleLogin,

      updateProfile,

      signOut,
      refreshProfile,

      updateSettings,

      deactivateAccount: async () => {},
      deleteAccount: async () => {},
    }),
    [
      user,
      profile,
      userSettings,
      hydrated,
      isProfileLoading,
      isUserSettingsLoading,
      hasCompletedOnboarding,
      markOnboardingCompleted,
      themePreference,
      setThemePreference,
      login,
      signup,
      googleLogin,
      updateProfile,
      signOut,
      refreshProfile,
      updateSettings,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/* =========================================================
   HOOK
========================================================= */

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
