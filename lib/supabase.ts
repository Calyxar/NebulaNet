// lib/supabase.ts
// FINAL HARDENED VERSION (Android / Expo / Web Safe)

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Session, User } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";
import "react-native-url-polyfill/auto";

/* -------------------------------------------------------------------------- */
/*                              ENV NORMALIZATION                             */
/* -------------------------------------------------------------------------- */

const IS_SSR = Platform.OS === "web" && typeof window === "undefined";

// 🔒 Normalize + trim to prevent hidden whitespace bugs
const rawUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const rawKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

const supabaseUrl = rawUrl.trim().replace(/\/+$/, "");
const supabaseAnonKey = rawKey.trim();

// Debug (remove later if desired)
if (!IS_SSR) {
  console.log("SUPABASE_URL:", JSON.stringify(supabaseUrl));
  console.log("ANON_KEY prefix:", supabaseAnonKey.slice(0, 12));
  console.log("ANON_KEY length:", supabaseAnonKey.length);
}

if (!supabaseUrl || !supabaseAnonKey) {
  if (!IS_SSR) {
    throw new Error(
      "Missing Supabase environment variables. Check .env or EAS secrets.",
    );
  }
}

/* -------------------------------------------------------------------------- */
/*                                 STORAGE                                    */
/* -------------------------------------------------------------------------- */

const createSafeStorage = () => {
  const isWebLike =
    typeof window !== "undefined" && typeof localStorage !== "undefined";

  if (Platform.OS === "web" && isWebLike) {
    return {
      getItem: async (key: string) => localStorage.getItem(key),
      setItem: async (key: string, value: string) =>
        localStorage.setItem(key, value),
      removeItem: async (key: string) => localStorage.removeItem(key),
    };
  }

  return {
    getItem: async (key: string) => await AsyncStorage.getItem(key),
    setItem: async (key: string, value: string) =>
      await AsyncStorage.setItem(key, value),
    removeItem: async (key: string) => await AsyncStorage.removeItem(key),
  };
};

/* -------------------------------------------------------------------------- */
/*                               CREATE CLIENT                                */
/* -------------------------------------------------------------------------- */

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          storage: createSafeStorage(),
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: Platform.OS === "web",
        },
        global: {
          headers: {
            "X-Client-Info": "nebulanet@1.0.0",
          },
        },
        realtime: {
          params: { eventsPerSecond: 10 },
        },
      })
    : ({} as any);

/* -------------------------------------------------------------------------- */
/*                                    AUTH                                    */
/* -------------------------------------------------------------------------- */

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password: password.trim(),
  });
  if (error) throw error;
  return data;
}

export async function signUpWithEmail(
  email: string,
  password: string,
  userData: { username: string; full_name?: string },
) {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password: password.trim(),
    options: {
      data: userData,
    },
  });

  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser(): Promise<User | null> {
  const { data } = await supabase.auth.getUser();
  return data?.user ?? null;
}

export async function getCurrentSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data?.session ?? null;
}

/* -------------------------------------------------------------------------- */
/*                              PROFILE HELPERS                               */
/* -------------------------------------------------------------------------- */

export async function updateProfile(updates: any) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("profiles")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", user.id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function getProfile(userId: string) {
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  return data ?? null;
}

/* -------------------------------------------------------------------------- */
/*                                TEST HELPER                                 */
/* -------------------------------------------------------------------------- */

export async function testConnection() {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) return { success: false, error: error.message };
    return { success: true, session: !!data.session };
  } catch (e: any) {
    return { success: false, error: e?.message };
  }
}

/* -------------------------------------------------------------------------- */
/*                              DEFAULT EXPORT                                */
/* -------------------------------------------------------------------------- */

export default {
  supabase,
  signInWithEmail,
  signUpWithEmail,
  signOut,
  getCurrentUser,
  getCurrentSession,
  updateProfile,
  getProfile,
  testConnection,
};
