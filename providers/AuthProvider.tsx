import { auth, db } from "@/lib/firebase";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";
import type { User as FirebaseUserBase } from "firebase/auth";
import {
  createUserWithEmailAndPassword,
  deleteUser,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendEmailVerification,
  signInWithCredential,
  signInWithEmailAndPassword,
} from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type FirebaseUser = FirebaseUserBase & { id: string };
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
  deactivated_at?: string | null;
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
  hasCompletedOnboarding: boolean;
  themePreference: ThemePreference | null;
  setThemePreference: (pref: ThemePreference) => Promise<void>;
  updateProfile: UseMutationResult<void, Error, Partial<Profile>>;
  login: UseMutationResult<any, Error, { email: string; password: string }>;
  signup: UseMutationResult<any, Error, { email: string; password: string }>;
  googleLogin: UseMutationResult<
    any,
    Error,
    { idToken: string; accessToken?: string }
  >;
  updateSettings: (
    updates: Partial<UserSettings> & Record<string, any>,
  ) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  skipOnboarding: () => Promise<void>;
  deactivateAccount: () => Promise<void>;
  deleteAccount: (opts?: {
    reauth?: { idToken?: string; accessToken?: string };
  }) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const profileRef = (uid: string) => doc(db, "profiles", uid);
const settingsRef = (uid: string) => doc(db, "user_settings", uid);

const nowIso = () => new Date().toISOString();
const REQUIRE_EMAIL_VERIFICATION = false;

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      try {
        if (u) {
          if (REQUIRE_EMAIL_VERIFICATION && !u.emailVerified) {
            await firebaseSignOut(auth);
            setUser(null);
            setHydrated(true);
            return;
          }

          (u as any).id = u.uid;

          const pSnap = await getDoc(profileRef(u.uid));
          if (!pSnap.exists()) {
            const t = nowIso();
            const baseUsername =
              u.email?.split("@")[0] ?? `user_${u.uid.slice(0, 8)}`;

            await setDoc(profileRef(u.uid), {
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
              deactivated_at: null,
              created_at: t,
              updated_at: t,
              created_at_ts: serverTimestamp(),
              updated_at_ts: serverTimestamp(),
            });
          }

          const sSnap = await getDoc(settingsRef(u.uid));
          if (!sSnap.exists()) {
            await setDoc(settingsRef(u.uid), {
              user_id: u.uid,
              onboarding_completed: false,
              onboarding_completed_at: null,
              theme_preference: null,
              language: null,
              region: null,
              updated_at: nowIso(),
              updated_at_ts: serverTimestamp(),
            });
          }
        }

        setUser((u as FirebaseUser) ?? null);
      } finally {
        setHydrated(true);
      }
    });

    return unsub;
  }, []);

  const userId = user?.uid ?? null;

  const { data: profile, isLoading: isProfileLoading } =
    useQuery<Profile | null>({
      queryKey: ["profile", userId],
      enabled: !!userId && hydrated,
      queryFn: async () => {
        if (!userId) return null;
        const snap = await getDoc(profileRef(userId));
        return snap.exists() ? (snap.data() as Profile) : null;
      },
    });

  const { data: userSettings, isLoading: isUserSettingsLoading } =
    useQuery<UserSettings | null>({
      queryKey: ["user-settings", userId],
      enabled: !!userId && hydrated,
      queryFn: async () => {
        if (!userId) return null;
        const snap = await getDoc(settingsRef(userId));
        return snap.exists() ? (snap.data() as UserSettings) : null;
      },
    });

  const hasCompletedOnboarding = !!userSettings?.onboarding_completed;
  const themePreference = userSettings?.theme_preference ?? null;

  const updateProfile = useMutation<void, Error, Partial<Profile>>({
    mutationFn: async (updates) => {
      if (!userId) throw new Error("Not authenticated");

      if (updates.username) {
        const usernameLc = updates.username.toLowerCase();
        const qy = query(
          collection(db, "profiles"),
          where("username_lc", "==", usernameLc),
        );
        const snap = await getDocs(qy);
        snap.forEach((d) => {
          if (d.id !== userId) {
            throw new Error("This username is already taken");
          }
        });
        updates.username_lc = usernameLc;
      }

      await updateDoc(profileRef(userId), {
        ...updates,
        updated_at: nowIso(),
        updated_at_ts: serverTimestamp(),
      });
    },
    onSuccess: async () => {
      if (userId) await qc.invalidateQueries({ queryKey: ["profile", userId] });
    },
  });

  const updateSettings = useCallback(
    async (updates: Partial<UserSettings> & Record<string, any>) => {
      if (!userId) throw new Error("Not authenticated");
      await setDoc(
        settingsRef(userId),
        {
          ...updates,
          user_id: userId,
          updated_at: nowIso(),
          updated_at_ts: serverTimestamp(),
        },
        { merge: true },
      );
      await qc.invalidateQueries({ queryKey: ["user-settings", userId] });
    },
    [userId, qc],
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
  }, [updateSettings]);

  const skipOnboarding = completeOnboarding;

  const deactivateAccount = useCallback(async () => {
    if (!userId) throw new Error("Not authenticated");

    await updateDoc(profileRef(userId), {
      is_deactivated: true,
      deactivated_at: nowIso(),
      updated_at: nowIso(),
      updated_at_ts: serverTimestamp(),
    });

    await firebaseSignOut(auth);
    qc.clear();
  }, [userId, qc]);

  const deleteAccountFn = useCallback(async () => {
    const u = auth.currentUser;
    if (!u || !userId) throw new Error("Not authenticated");

    await setDoc(
      doc(db, "account_deletion_requests", userId),
      {
        user_id: userId,
        created_at: nowIso(),
        created_at_ts: serverTimestamp(),
        status: "requested",
      },
      { merge: true },
    );

    try {
      await deleteDoc(profileRef(userId));
    } catch {}

    try {
      await setDoc(
        settingsRef(userId),
        {
          deleted_at: nowIso(),
          updated_at: nowIso(),
          updated_at_ts: serverTimestamp(),
        },
        { merge: true },
      );
    } catch {}

    try {
      await deleteUser(u);
    } catch (e: any) {
      if (String(e?.code).includes("requires-recent-login")) {
        throw new Error("Please re-authenticate, then try again.");
      }
      throw e;
    } finally {
      try {
        await firebaseSignOut(auth);
      } catch {}
      qc.clear();
    }
  }, [userId, qc]);

  const login = useMutation({
    mutationFn: ({ email, password }: any) =>
      signInWithEmailAndPassword(auth, email, password),
  });

  const signup = useMutation({
    mutationFn: async ({ email, password }: any) => {
      const res = await createUserWithEmailAndPassword(auth, email, password);
      try {
        await sendEmailVerification(res.user);
      } catch {}
      return res;
    },
  });

  const googleLogin = useMutation({
    mutationFn: ({ idToken, accessToken }: any) => {
      const cred = GoogleAuthProvider.credential(idToken, accessToken);
      return signInWithCredential(auth, cred);
    },
  });

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
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
      hasCompletedOnboarding,
      themePreference,
      setThemePreference,
      updateProfile,
      login,
      signup,
      googleLogin,
      updateSettings,
      completeOnboarding,
      skipOnboarding,
      deactivateAccount,
      deleteAccount: deleteAccountFn,
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
      updateProfile,
      login,
      signup,
      googleLogin,
      updateSettings,
      completeOnboarding,
      skipOnboarding,
      deactivateAccount,
      deleteAccountFn,
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
