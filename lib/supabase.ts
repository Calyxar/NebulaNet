// lib/supabase.ts — COMPLETE UPDATED (VERCEL STATIC EXPORT SAFE + FULL NAMED EXPORTS)
// ✅ SSR/static export safe (won't hard-crash Vercel builds)
// ✅ Safe storage adapter (localStorage on web, AsyncStorage on native)
// ✅ Named exports for auth/profile helpers + delete-account Edge Function invoke
// ✅ Optional typed Tables map (lightweight, no generated types required)

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Session, User } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";
import "react-native-url-polyfill/auto";

/* -------------------------------------------------------------------------- */
/*                               CONFIG / CLIENT                              */
/* -------------------------------------------------------------------------- */

// Static export / SSR guard (Vercel build runs in Node where window is undefined)
const IS_SSR = Platform.OS === "web" && typeof window === "undefined";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

if (!IS_SSR) {
  console.log("🔧 Supabase URL exists:", !!supabaseUrl);
  console.log("🔧 Supabase Anon Key exists:", !!supabaseAnonKey);
}

// During build-time static rendering we don't want to hard-crash the whole export.
// On real client runtime we DO want to fail loudly if env vars are missing.
if (!supabaseUrl || !supabaseAnonKey) {
  if (!IS_SSR) {
    throw new Error(
      "Missing Supabase environment variables. Check your .env and Vercel Environment Variables!",
    );
  }
}

export const getAuthRedirectUrl = () => {
  // Web email verification / signup redirect
  if (Platform.OS === "web") return "https://nebulanet.space/auth/verify-email";
  // Native deep link handler route
  return "nebulanet://verify-email-handler";
};

export const getPasswordResetRedirectUrl = () => {
  if (Platform.OS === "web")
    return "https://nebulanet.space/auth/reset-password";
  return "nebulanet://auth/reset-password";
};

const createSafeStorage = () => {
  const isWebLike =
    typeof window !== "undefined" && typeof localStorage !== "undefined";

  if (Platform.OS === "web" && isWebLike) {
    return {
      getItem: async (key: string) => {
        try {
          return localStorage.getItem(key);
        } catch (e) {
          console.warn("localStorage getItem error:", e);
          return null;
        }
      },
      setItem: async (key: string, value: string) => {
        try {
          localStorage.setItem(key, value);
        } catch (e) {
          console.warn("localStorage setItem error:", e);
        }
      },
      removeItem: async (key: string) => {
        try {
          localStorage.removeItem(key);
        } catch (e) {
          console.warn("localStorage removeItem error:", e);
        }
      },
    };
  }

  // Native (iOS/Android)
  return {
    getItem: async (key: string) => {
      try {
        return await AsyncStorage.getItem(key);
      } catch (e) {
        console.warn("AsyncStorage getItem error:", e);
        return null;
      }
    },
    setItem: async (key: string, value: string) => {
      try {
        await AsyncStorage.setItem(key, value);
      } catch (e) {
        console.warn("AsyncStorage setItem error:", e);
      }
    },
    removeItem: async (key: string) => {
      try {
        await AsyncStorage.removeItem(key);
      } catch (e) {
        console.warn("AsyncStorage removeItem error:", e);
      }
    },
  };
};

// If SSR/build and env vars are missing, create a "safe stub" client to prevent crashes.
// (Any calls will fail gracefully vs breaking the export build.)
const canCreateClient = !!supabaseUrl && !!supabaseAnonKey;

export const supabase = canCreateClient
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: createSafeStorage(),
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: Platform.OS === "web",
      },
      global: {
        headers: { "X-Client-Info": "nebulanet@1.0.0" },
      },
      realtime: {
        params: { eventsPerSecond: 10 },
      },
    })
  : // SSR stub client
    ({
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
        getSession: async () => ({ data: { session: null }, error: null }),
        signOut: async () => ({ error: null }),
      },
      from: () => {
        throw new Error(
          "Supabase client not initialized (missing env vars during build/SSR).",
        );
      },
      rpc: () => {
        throw new Error(
          "Supabase client not initialized (missing env vars during build/SSR).",
        );
      },
      functions: {
        invoke: async () => {
          throw new Error(
            "Supabase client not initialized (missing env vars during build/SSR).",
          );
        },
      },
      channel: () => {
        throw new Error(
          "Supabase client not initialized (missing env vars during build/SSR).",
        );
      },
      removeChannel: () => {},
    } as unknown as any);

/* -------------------------------------------------------------------------- */
/*                                   TYPES                                    */
/* -------------------------------------------------------------------------- */

export type Tables = {
  profiles: {
    Row: {
      id: string;
      username: string;
      full_name: string | null;
      avatar_url: string | null;
      bio: string | null;
      website: string | null;
      location: string | null;
      is_online: boolean;
      last_seen: string | null;
      follower_count: number;
      following_count: number;
      post_count: number;
      is_deactivated: boolean;
      deactivated_at: string | null;
      is_deleted: boolean;
      deleted_at: string | null;
      created_at: string;
      updated_at: string;
      is_private?: boolean | null;
    };
    Insert: Partial<Omit<Tables["profiles"]["Row"], "id">> & { id?: string };
    Update: Partial<Tables["profiles"]["Row"]>;
  };

  posts: {
    Row: {
      id: string;
      user_id: string;
      title: string | null;
      content: string;
      media: any[] | null;
      community_id: string | null;
      is_public: boolean;
      like_count: number;
      comment_count: number;
      share_count: number;
      view_count: number;
      created_at: string;
      updated_at: string;
      media_urls?: string[] | null;
    };
    Insert: Partial<Omit<Tables["posts"]["Row"], "id">> & { id?: string };
    Update: Partial<Tables["posts"]["Row"]>;
  };

  stories: {
    Row: {
      id: string;
      user_id: string;
      content: string | null;
      media_url: string | null;
      media_type: "image" | "video" | "text" | null;
      expires_at: string;
      view_count: number;
      created_at: string;
      updated_at: string;
    };
    Insert: Partial<Omit<Tables["stories"]["Row"], "id">> & { id?: string };
    Update: Partial<Tables["stories"]["Row"]>;
  };

  story_comments: {
    Row: {
      id: string;
      story_id: string;
      user_id: string;
      content: string;
      created_at: string;
      updated_at: string;
    };
    Insert: Partial<Omit<Tables["story_comments"]["Row"], "id">> & {
      id?: string;
    };
    Update: Partial<Tables["story_comments"]["Row"]>;
  };

  story_views: {
    Row: { id: string; story_id: string; user_id: string; viewed_at: string };
    Insert: Partial<Omit<Tables["story_views"]["Row"], "id">> & { id?: string };
    Update: Partial<Tables["story_views"]["Row"]>;
  };

  communities: {
    Row: {
      id: string;
      name: string;
      slug: string;
      description: string | null;
      avatar_url: string | null;
      cover_url: string | null;
      owner_id: string;
      member_count: number;
      post_count: number;
      is_private: boolean;
      created_at: string;
      updated_at: string;
    };
    Insert: Partial<Omit<Tables["communities"]["Row"], "id">> & { id?: string };
    Update: Partial<Tables["communities"]["Row"]>;
  };

  community_members: {
    Row: {
      id: string;
      community_id: string;
      user_id: string;
      role: "member" | "moderator" | "admin";
      joined_at: string;
    };
    Insert: Partial<Omit<Tables["community_members"]["Row"], "id">> & {
      id?: string;
    };
    Update: Partial<Tables["community_members"]["Row"]>;
  };

  likes: {
    Row: { id: string; user_id: string; post_id: string; created_at: string };
    Insert: Partial<Omit<Tables["likes"]["Row"], "id">> & { id?: string };
    Update: Partial<Tables["likes"]["Row"]>;
  };

  comments: {
    Row: {
      id: string;
      user_id: string;
      post_id: string;
      content: string;
      parent_id: string | null;
      like_count: number;
      created_at: string;
      updated_at: string;
    };
    Insert: Partial<Omit<Tables["comments"]["Row"], "id">> & { id?: string };
    Update: Partial<Tables["comments"]["Row"]>;
  };

  follows: {
    Row: {
      id: string;
      follower_id: string;
      following_id: string;
      created_at: string;
    };
    Insert: Partial<Omit<Tables["follows"]["Row"], "id">> & { id?: string };
    Update: Partial<Tables["follows"]["Row"]>;
  };

  notifications: {
    Row: {
      id: string;
      type:
        | "like"
        | "comment"
        | "follow"
        | "mention"
        | "community_invite"
        | "post_shared"
        | "story_comment"
        | "story_like"
        | "message"
        | "join_request";
      sender_id: string;
      receiver_id: string;
      post_id: string | null;
      comment_id: string | null;
      community_id: string | null;
      story_id: string | null;
      conversation_id: string | null;
      read: boolean;
      created_at: string;
      updated_at: string;
    };
    Insert: Partial<Omit<Tables["notifications"]["Row"], "id">> & {
      id?: string;
    };
    Update: Partial<Tables["notifications"]["Row"]>;
  };

  conversations: {
    Row: {
      id: string;
      name: string | null;
      avatar_url: string | null;
      is_group: boolean;
      is_online: boolean;
      is_typing: boolean;
      is_pinned: boolean;
      unread_count: number;
      last_message_id: string | null;
      created_at: string;
      updated_at: string;
    };
    Insert: Partial<Omit<Tables["conversations"]["Row"], "id">> & {
      id?: string;
    };
    Update: Partial<Tables["conversations"]["Row"]>;
  };

  conversation_participants: {
    Row: {
      id: string;
      conversation_id: string;
      user_id: string;
      unread_count: number;
      joined_at: string;
    };
    Insert: Partial<Omit<Tables["conversation_participants"]["Row"], "id">> & {
      id?: string;
    };
    Update: Partial<Tables["conversation_participants"]["Row"]>;
  };

  messages: {
    Row: {
      id: string;
      conversation_id: string;
      sender_id: string;
      content: string;
      media_url: string | null;
      media_type: "image" | "video" | "audio" | "file" | null;
      read_at: string | null;
      delivered_at: string | null;
      created_at: string;
    };
    Insert: Partial<Omit<Tables["messages"]["Row"], "id">> & { id?: string };
    Update: Partial<Tables["messages"]["Row"]>;
  };

  saves: {
    Row: { id: string; user_id: string; post_id: string; created_at: string };
    Insert: Partial<Omit<Tables["saves"]["Row"], "id">> & { id?: string };
    Update: Partial<Tables["saves"]["Row"]>;
  };

  post_views: {
    Row: { id: string; post_id: string; user_id: string; viewed_at: string };
    Insert: Partial<Omit<Tables["post_views"]["Row"], "id">> & { id?: string };
    Update: Partial<Tables["post_views"]["Row"]>;
  };

  reports: {
    Row: {
      id: string;
      reporter_id: string;
      post_id: string;
      reason: string;
      status: "pending" | "reviewed" | "dismissed" | "actioned";
      created_at: string;
    };
    Insert: Partial<Omit<Tables["reports"]["Row"], "id">> & { id?: string };
    Update: Partial<Tables["reports"]["Row"]>;
  };

  blocks: {
    Row: {
      id: string;
      blocker_id: string;
      blocked_id: string;
      created_at: string;
    };
    Insert: Partial<Omit<Tables["blocks"]["Row"], "id">> & { id?: string };
    Update: Partial<Tables["blocks"]["Row"]>;
  };
};

export type TableName = keyof Tables;
export const from = <T extends TableName>(table: T) => supabase.from(table);

/* -------------------------------------------------------------------------- */
/*                                    AUTH                                    */
/* -------------------------------------------------------------------------- */

export async function signInWithEmail(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
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
  const redirectTo = getAuthRedirectUrl();

  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password: password.trim(),
    options: { data: userData, emailRedirectTo: redirectTo },
  });

  if (error) throw error;

  // Create profile row if user created
  if (data.user) {
    try {
      await supabase.from("profiles").insert({
        id: data.user.id,
        username: userData.username,
        full_name: userData.full_name || null,
        follower_count: 0,
        following_count: 0,
        post_count: 0,
        is_deactivated: false,
        is_deleted: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any);
    } catch (e) {
      console.error("❌ Profile creation error:", e);
    }
  }

  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) return null;
    return data.user ?? null;
  } catch {
    return null;
  }
}

export async function getCurrentSession(): Promise<Session | null> {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) return null;
    return data.session ?? null;
  } catch {
    return null;
  }
}

export async function resendVerificationEmail(email: string) {
  const redirectTo = getAuthRedirectUrl();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: email.trim().toLowerCase(),
    options: { emailRedirectTo: redirectTo },
  });
  if (error) throw error;
  return true;
}

export async function verifyEmailToken(token: string, type: string = "signup") {
  const { data, error } = await supabase.auth.verifyOtp({
    token_hash: token,
    type: type as any,
  });
  if (error) throw error;
  return data;
}

export async function resetPassword(email: string) {
  const redirectTo = getPasswordResetRedirectUrl();
  const { error } = await supabase.auth.resetPasswordForEmail(
    email.trim().toLowerCase(),
    { redirectTo },
  );
  if (error) throw error;
  return true;
}

export async function updatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

export async function updateUserEmail(newEmail: string) {
  const redirectTo = getAuthRedirectUrl();
  const { error } = await supabase.auth.updateUser(
    { email: newEmail.trim().toLowerCase() },
    { emailRedirectTo: `${redirectTo}?type=email_change` },
  );
  if (error) throw error;
}

/* -------------------------------------------------------------------------- */
/*                                  PROFILES                                  */
/* -------------------------------------------------------------------------- */

export async function updateProfile(updates: {
  username?: string;
  full_name?: string;
  avatar_url?: string;
  bio?: string;
  website?: string;
  location?: string;
  is_online?: boolean;
  last_seen?: string;
  is_private?: boolean;
}) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("profiles")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", user.id)
    .select("*")
    .single();

  if (error) throw error;
  return data as Tables["profiles"]["Row"];
}

export async function getProfile(userId?: string) {
  if (!userId) {
    const user = await getCurrentUser();
    if (!user) return null;
    userId = user.id;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle(); // ✅ less noisy than .single()

  if (error) return null;
  return (data as Tables["profiles"]["Row"]) ?? null;
}

export async function getProfileByUsername(username: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .maybeSingle();

  if (error) return null;
  return (data as Tables["profiles"]["Row"]) ?? null;
}

export async function getCurrentUserProfile() {
  const user = await getCurrentUser();
  if (!user) return null;
  return getProfile(user.id);
}

/* -------------------------------------------------------------------------- */
/*                              NOTIFICATIONS API                              */
/* -------------------------------------------------------------------------- */

export async function createNotification(notification: {
  type: Tables["notifications"]["Row"]["type"];
  sender_id: string;
  receiver_id: string;
  post_id?: string;
  comment_id?: string;
  community_id?: string;
  story_id?: string;
  conversation_id?: string;
  message?: string;
}) {
  try {
    const { data, error } = await supabase
      .from("notifications")
      .insert({
        ...notification,
        read: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return { data, error: null as any };
  } catch (error: any) {
    console.error("❌ Create notification error:", error);
    return { data: null, error };
  }
}

export async function getUnreadNotificationsCount() {
  const user = await getCurrentUser();
  if (!user) return 0;

  try {
    const { count, error } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("receiver_id", user.id)
      .eq("read", false);

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error("❌ getUnreadNotificationsCount error:", error);
    return 0;
  }
}

/* -------------------------------------------------------------------------- */
/*                           DELETE ACCOUNT (SAFE)                             */
/* -------------------------------------------------------------------------- */
/**
 * Calls your Supabase Edge Function "delete-account".
 * This is the ONLY safe way to delete a user without shipping a service key.
 */
export async function deleteMyAccount(reason?: string) {
  const session = await getCurrentSession();
  if (!session) throw new Error("Not authenticated");

  const { data, error } = await supabase.functions.invoke("delete-account", {
    body: { reason: reason ?? null },
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (error) throw error;
  return data;
}

/* -------------------------------------------------------------------------- */
/*                                   UTILS                                    */
/* -------------------------------------------------------------------------- */

export async function testConnection() {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) return { success: false, error: error.message };
    return { success: true, session: !!data.session };
  } catch (e: any) {
    return { success: false, error: e?.message || "Unknown error" };
  }
}

/* -------------------------------------------------------------------------- */
/*                              DEFAULT EXPORT (OK)                            */
/* -------------------------------------------------------------------------- */

export default {
  supabase,
  from,

  // redirects
  getAuthRedirectUrl,
  getPasswordResetRedirectUrl,

  // auth
  signInWithEmail,
  signUpWithEmail,
  signOut,
  getCurrentUser,
  getCurrentSession,
  resendVerificationEmail,
  verifyEmailToken,
  resetPassword,
  updatePassword,
  updateUserEmail,

  // profiles
  updateProfile,
  getProfile,
  getProfileByUsername,
  getCurrentUserProfile,

  // notifications
  createNotification,
  getUnreadNotificationsCount,

  // delete account
  deleteMyAccount,

  // utils
  testConnection,
};
