// lib/supabase.ts - COMPLETE UPDATED VERSION (FIXED + SAFER QUERIES)
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";
import "react-native-url-polyfill/auto";

/* -------------------------------------------------------------------------- */
/*                               CONFIG / CLIENT                              */
/* -------------------------------------------------------------------------- */

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

console.log("🔧 Supabase URL exists:", !!supabaseUrl);
console.log("🔧 Supabase Anon Key exists:", !!supabaseAnonKey);

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Check your .env file!",
  );
}

export const getAuthRedirectUrl = () => {
  if (Platform.OS === "web") return "https://nebulanet.space/auth/verify-email";
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

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
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
});

/* -------------------------------------------------------------------------- */
/*                                   TYPES                                    */
/* -------------------------------------------------------------------------- */

// Helper: PostgREST "no rows" code (common)
const NO_ROWS = "PGRST116";

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
    };
    Insert: Partial<
      Omit<Tables["profiles"]["Row"], "id" | "created_at" | "updated_at">
    > & {
      id?: string;
      created_at?: string;
      updated_at?: string;
    };
    Update: Partial<Tables["profiles"]["Row"]>;
  };

  posts: {
    Row: {
      id: string;
      user_id: string;
      title: string | null;
      content: string;
      media: any[] | null; // NOTE: your community code uses media_urls; keep both if you have both
      community_id: string | null;
      is_public: boolean;
      like_count: number;
      comment_count: number;
      share_count: number;
      view_count: number;
      created_at: string;
      updated_at: string;
    };
    Insert: Partial<
      Omit<Tables["posts"]["Row"], "id" | "created_at" | "updated_at">
    > & {
      id?: string;
      created_at?: string;
      updated_at?: string;
    };
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
    Insert: Partial<
      Omit<Tables["stories"]["Row"], "id" | "created_at" | "updated_at">
    > & {
      id?: string;
      created_at?: string;
      updated_at?: string;
    };
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
    Insert: Partial<
      Omit<Tables["story_comments"]["Row"], "id" | "created_at" | "updated_at">
    > & {
      id?: string;
      created_at?: string;
      updated_at?: string;
    };
    Update: Partial<Tables["story_comments"]["Row"]>;
  };

  story_views: {
    Row: {
      id: string;
      story_id: string;
      user_id: string;
      viewed_at: string;
    };
    Insert: Partial<Omit<Tables["story_views"]["Row"], "id" | "viewed_at">> & {
      id?: string;
      viewed_at?: string;
    };
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
    Insert: Partial<
      Omit<Tables["communities"]["Row"], "id" | "created_at" | "updated_at">
    > & {
      id?: string;
      created_at?: string;
      updated_at?: string;
    };
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
    Insert: Partial<
      Omit<Tables["community_members"]["Row"], "id" | "joined_at">
    > & {
      id?: string;
      joined_at?: string;
    };
    Update: Partial<Tables["community_members"]["Row"]>;
  };

  likes: {
    Row: {
      id: string;
      user_id: string;
      post_id: string;
      created_at: string;
    };
    Insert: Partial<Omit<Tables["likes"]["Row"], "id" | "created_at">> & {
      id?: string;
      created_at?: string;
    };
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
    Insert: Partial<
      Omit<Tables["comments"]["Row"], "id" | "created_at" | "updated_at">
    > & {
      id?: string;
      created_at?: string;
      updated_at?: string;
    };
    Update: Partial<Tables["comments"]["Row"]>;
  };

  comment_likes: {
    Row: {
      id: string;
      user_id: string;
      comment_id: string;
      created_at: string;
    };
    Insert: Partial<
      Omit<Tables["comment_likes"]["Row"], "id" | "created_at">
    > & {
      id?: string;
      created_at?: string;
    };
    Update: Partial<Tables["comment_likes"]["Row"]>;
  };

  follows: {
    Row: {
      id: string;
      follower_id: string;
      following_id: string;
      created_at: string;
    };
    Insert: Partial<Omit<Tables["follows"]["Row"], "id" | "created_at">> & {
      id?: string;
      created_at?: string;
    };
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
    Insert: Partial<
      Omit<Tables["notifications"]["Row"], "id" | "created_at" | "updated_at">
    > & {
      id?: string;
      created_at?: string;
      updated_at?: string;
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
    Insert: Partial<
      Omit<Tables["conversations"]["Row"], "id" | "created_at" | "updated_at">
    > & {
      id?: string;
      created_at?: string;
      updated_at?: string;
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
    Insert: Partial<
      Omit<Tables["conversation_participants"]["Row"], "id" | "joined_at">
    > & {
      id?: string;
      joined_at?: string;
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
    Insert: Partial<Omit<Tables["messages"]["Row"], "id" | "created_at">> & {
      id?: string;
      created_at?: string;
    };
    Update: Partial<Tables["messages"]["Row"]>;
  };

  user_interests: {
    Row: {
      id: string;
      user_id: string;
      interest: string;
      created_at: string;
    };
    Insert: Partial<
      Omit<Tables["user_interests"]["Row"], "id" | "created_at">
    > & {
      id?: string;
      created_at?: string;
    };
    Update: Partial<Tables["user_interests"]["Row"]>;
  };

  saves: {
    Row: {
      id: string;
      user_id: string;
      post_id: string;
      created_at: string;
    };
    Insert: Partial<Omit<Tables["saves"]["Row"], "id" | "created_at">> & {
      id?: string;
      created_at?: string;
    };
    Update: Partial<Tables["saves"]["Row"]>;
  };

  // ✅ Added: post_views (you call it in trackPostView)
  post_views: {
    Row: {
      id: string;
      post_id: string;
      user_id: string;
      viewed_at: string;
    };
    Insert: Partial<Omit<Tables["post_views"]["Row"], "id" | "viewed_at">> & {
      id?: string;
      viewed_at?: string;
    };
    Update: Partial<Tables["post_views"]["Row"]>;
  };

  // ✅ Added: reports (you call it in reportPost)
  reports: {
    Row: {
      id: string;
      reporter_id: string;
      post_id: string;
      reason: string;
      status: "pending" | "reviewed" | "dismissed" | "actioned";
      created_at: string;
    };
    Insert: Partial<Omit<Tables["reports"]["Row"], "id" | "created_at">> & {
      id?: string;
      created_at?: string;
    };
    Update: Partial<Tables["reports"]["Row"]>;
  };

  // ✅ Added: blocks (you call it in block/unblock/isUserBlocked/getBlockedUsers)
  blocks: {
    Row: {
      id: string;
      blocker_id: string;
      blocked_id: string;
      created_at: string;
    };
    Insert: Partial<Omit<Tables["blocks"]["Row"], "id" | "created_at">> & {
      id?: string;
      created_at?: string;
    };
    Update: Partial<Tables["blocks"]["Row"]>;
  };

  deactivated_accounts: {
    Row: {
      id: string;
      user_id: string;
      deactivated_at: string;
      data_backup: any;
      created_at: string;
    };
    Insert: Partial<
      Omit<Tables["deactivated_accounts"]["Row"], "id" | "created_at">
    > & {
      id?: string;
      created_at?: string;
    };
    Update: Partial<Tables["deactivated_accounts"]["Row"]>;
  };

  deleted_accounts_backup: {
    Row: {
      id: string;
      user_id: string;
      deleted_at: string;
      user_data: any;
      created_at: string;
    };
    Insert: Partial<
      Omit<Tables["deleted_accounts_backup"]["Row"], "id" | "created_at">
    > & {
      id?: string;
      created_at?: string;
    };
    Update: Partial<Tables["deleted_accounts_backup"]["Row"]>;
  };
};

export type TableName = keyof Tables;

export const from = <T extends TableName>(table: T) => supabase.from(table);

export type { Session, User } from "@supabase/supabase-js";

export type RealtimePayload<T extends TableName> = {
  commit_timestamp: string;
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: Tables[T]["Row"];
  old: Tables[T]["Row"];
  schema: string;
  table: string;
};

// Small helper so you don’t repeat this everywhere
function isNoRowsError(err: any) {
  return err?.code === NO_ROWS;
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
  console.log("🔔 Creating notification:", notification.type);

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

    console.log("✅ Notification created:", data.id);
    return { data, error: null as any };
  } catch (error: any) {
    console.error("❌ Create notification error:", error);
    return { data: null, error };
  }
}

export async function getNotifications(limit = 50, offset = 0) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  try {
    const { data, error } = await supabase
      .from("notifications")
      .select(
        `
        *,
        sender:profiles!notifications_sender_id_fkey(id, username, full_name, avatar_url),
        post:posts!notifications_post_id_fkey(id, title, content, media),
        comment:comments!notifications_comment_id_fkey(id, content),
        community:communities!notifications_community_id_fkey(id, name, slug, avatar_url),
        story:stories!notifications_story_id_fkey(id, content, media_url),
        conversation:conversations!notifications_conversation_id_fkey(id, name, avatar_url)
      `,
      )
      .eq("receiver_id", user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return { data, error: null as any };
  } catch (error: any) {
    console.error("❌ Get notifications error:", error);
    return { data: null, error };
  }
}

export async function markNotificationAsRead(notificationId: string) {
  try {
    const { error } = await supabase
      .from("notifications")
      .update({ read: true, updated_at: new Date().toISOString() })
      .eq("id", notificationId);

    if (error) throw error;
    return { error: null as any };
  } catch (error: any) {
    console.error("❌ markNotificationAsRead error:", error);
    return { error };
  }
}

export async function markAllNotificationsAsRead() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  try {
    const { error } = await supabase
      .from("notifications")
      .update({ read: true, updated_at: new Date().toISOString() })
      .eq("receiver_id", user.id)
      .eq("read", false);

    if (error) throw error;
    return { error: null as any };
  } catch (error: any) {
    console.error("❌ markAllNotificationsAsRead error:", error);
    return { error };
  }
}

export async function deleteNotification(notificationId: string) {
  try {
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", notificationId);
    if (error) throw error;
    return { error: null as any };
  } catch (error: any) {
    console.error("❌ deleteNotification error:", error);
    return { error };
  }
}

export async function deleteAllNotifications() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  try {
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("receiver_id", user.id);
    if (error) throw error;
    return { error: null as any };
  } catch (error: any) {
    console.error("❌ deleteAllNotifications error:", error);
    return { error };
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

export async function getNotificationStats() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  try {
    const { data, error } = await supabase
      .from("notifications")
      .select("type, read")
      .eq("receiver_id", user.id);

    if (error) throw error;

    const stats = {
      total: data?.length || 0,
      unread: data?.filter((n) => !n.read).length || 0,
      byType:
        data?.reduce(
          (acc, n) => {
            acc[n.type] = (acc[n.type] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        ) || {},
    };

    return { data: stats, error: null as any };
  } catch (error: any) {
    console.error("❌ getNotificationStats error:", error);
    return { data: null, error };
  }
}

/* -------------------------- notification triggers -------------------------- */

export async function createLikeNotification(postId: string, userId: string) {
  try {
    const { data: post, error } = await supabase
      .from("posts")
      .select("user_id")
      .eq("id", postId)
      .single();
    if (error) throw error;

    const ownerId = (post as any)?.user_id as string | undefined;
    if (!ownerId || ownerId === userId) return;

    return createNotification({
      type: "like",
      sender_id: userId,
      receiver_id: ownerId,
      post_id: postId,
    });
  } catch (error) {
    console.error("❌ createLikeNotification error:", error);
    throw error;
  }
}

export async function createCommentNotification(
  commentId: string,
  userId: string,
) {
  try {
    const { data: comment, error } = await supabase
      .from("comments")
      .select(`id, post_id, posts!inner(user_id)`)
      .eq("id", commentId)
      .single();

    if (error) throw error;

    const ownerId = (comment as any)?.posts?.user_id as string | undefined;
    const postId = (comment as any)?.post_id as string | undefined;

    if (!ownerId || !postId || ownerId === userId) return;

    return createNotification({
      type: "comment",
      sender_id: userId,
      receiver_id: ownerId,
      post_id: postId,
      comment_id: commentId,
    });
  } catch (error) {
    console.error("❌ createCommentNotification error:", error);
    throw error;
  }
}

export async function createFollowNotification(
  followingId: string,
  followerId: string,
) {
  return createNotification({
    type: "follow",
    sender_id: followerId,
    receiver_id: followingId,
  });
}

export async function createStoryCommentNotification(
  storyId: string,
  userId: string,
) {
  try {
    const { data: story, error } = await supabase
      .from("stories")
      .select("user_id")
      .eq("id", storyId)
      .single();
    if (error) throw error;

    const ownerId = (story as any)?.user_id as string | undefined;
    if (!ownerId || ownerId === userId) return;

    return createNotification({
      type: "story_comment",
      sender_id: userId,
      receiver_id: ownerId,
      story_id: storyId,
    });
  } catch (error) {
    console.error("❌ createStoryCommentNotification error:", error);
    throw error;
  }
}

export async function createMessageNotification(
  conversationId: string,
  senderId: string,
  receiverId: string,
) {
  return createNotification({
    type: "message",
    sender_id: senderId,
    receiver_id: receiverId,
    conversation_id: conversationId,
  });
}

export async function createMentionNotification(
  postId: string,
  userId: string,
  mentionedUserId: string,
) {
  if (userId === mentionedUserId) return;
  return createNotification({
    type: "mention",
    sender_id: userId,
    receiver_id: mentionedUserId,
    post_id: postId,
  });
}

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
      });
    } catch (e) {
      console.error("❌ Profile creation error:", e);
    }
  }

  return data;
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

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser() {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) return null;
    return data.user;
  } catch {
    return null;
  }
}

export async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) return null;
  return data.session;
}

export async function resetPassword(email: string) {
  const redirectTo = getPasswordResetRedirectUrl();
  const { error } = await supabase.auth.resetPasswordForEmail(
    email.trim().toLowerCase(),
    {
      redirectTo,
    },
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
}) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("profiles")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", user.id)
    .select()
    .single();

  if (error) throw error;
  return data;
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
    .single();
  if (error) return null;
  return data;
}

export async function getProfileByUsername(username: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .single();
  if (error) return null;
  return data;
}

export async function getCurrentUserProfile() {
  const user = await getCurrentUser();
  if (!user) return null;
  return getProfile(user.id);
}

/* -------------------------------------------------------------------------- */
/*                                    POSTS                                   */
/* -------------------------------------------------------------------------- */

export async function createPost(postData: {
  title?: string;
  content: string;
  media?: any[];
  community_id?: string;
  is_public?: boolean;
}) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("posts")
    .insert({
      ...postData,
      user_id: user.id,
      like_count: 0,
      comment_count: 0,
      share_count: 0,
      view_count: 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getFeedPosts(limit = 20, offset = 0) {
  const { data, error } = await supabase
    .from("posts")
    .select(
      `
      *,
      profiles!posts_user_id_fkey(
        id,
        username,
        full_name,
        avatar_url,
        is_online
      ),
      communities!posts_community_id_fkey(
        id,
        name,
        slug,
        avatar_url
      )
    `,
    )
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return data;
}

export async function getPostById(postId: string) {
  const { data, error } = await supabase
    .from("posts")
    .select(
      `
      *,
      profiles!posts_user_id_fkey(
        id,
        username,
        full_name,
        avatar_url,
        is_online
      ),
      communities!posts_community_id_fkey(
        id,
        name,
        slug,
        avatar_url
      )
    `,
    )
    .eq("id", postId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * ✅ FIXED: likePost now uses maybeSingle() so "no rows" isn't treated as an exception.
 * Also checks errors for both read and write operations.
 */
export async function likePost(postId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  // find existing like safely
  const { data: existingLike, error: likeReadErr } = await supabase
    .from("likes")
    .select("id")
    .eq("user_id", user.id)
    .eq("post_id", postId)
    .maybeSingle();

  if (likeReadErr && !isNoRowsError(likeReadErr)) throw likeReadErr;

  if (existingLike?.id) {
    // unlike
    const { error: delErr } = await supabase
      .from("likes")
      .delete()
      .eq("id", existingLike.id);
    if (delErr) throw delErr;

    const { error: rpcErr } = await supabase.rpc("decrement", {
      table_name: "posts",
      column_name: "like_count",
      id: postId,
    });
    if (rpcErr) throw rpcErr;

    return false;
  }

  // like
  const { error: insErr } = await supabase.from("likes").insert({
    user_id: user.id,
    post_id: postId,
  });
  if (insErr) throw insErr;

  const { error: rpcErr } = await supabase.rpc("increment", {
    table_name: "posts",
    column_name: "like_count",
    id: postId,
  });
  if (rpcErr) throw rpcErr;

  await createLikeNotification(postId, user.id);
  return true;
}

export async function checkIfLiked(postId: string): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  const { data, error } = await supabase
    .from("likes")
    .select("id")
    .eq("user_id", user.id)
    .eq("post_id", postId)
    .maybeSingle();

  if (error && !isNoRowsError(error)) {
    console.error("❌ checkIfLiked error:", error);
    return false;
  }

  return !!data?.id;
}

/* -------------------------------------------------------------------------- */
/*                                     SAVES                                  */
/* -------------------------------------------------------------------------- */

export async function checkIfSaved(postId: string): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  const { data, error } = await supabase
    .from("saves")
    .select("id")
    .eq("user_id", user.id)
    .eq("post_id", postId)
    .maybeSingle();

  if (error && !isNoRowsError(error)) {
    console.error("❌ checkIfSaved error:", error);
    return false;
  }

  return !!data?.id;
}

/**
 * ✅ FIXED: savePost uses maybeSingle() to avoid throwing on "no rows"
 */
export async function savePost(postId: string): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const { data: existingSave, error: saveReadErr } = await supabase
    .from("saves")
    .select("id")
    .eq("user_id", user.id)
    .eq("post_id", postId)
    .maybeSingle();

  if (saveReadErr && !isNoRowsError(saveReadErr)) throw saveReadErr;

  if (existingSave?.id) {
    const { error: delErr } = await supabase
      .from("saves")
      .delete()
      .eq("id", existingSave.id);
    if (delErr) throw delErr;
    return false;
  }

  const { error: insErr } = await supabase.from("saves").insert({
    user_id: user.id,
    post_id: postId,
    created_at: new Date().toISOString(),
  });
  if (insErr) throw insErr;

  return true;
}

/* -------------------------------------------------------------------------- */
/*                                   COMMENTS                                 */
/* -------------------------------------------------------------------------- */

export async function createComment(
  postId: string,
  content: string,
  parentId?: string,
) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("comments")
    .insert({
      user_id: user.id,
      post_id: postId,
      content,
      parent_id: parentId || null,
      like_count: 0,
    })
    .select()
    .single();

  if (error) throw error;

  const { error: rpcErr } = await supabase.rpc("increment", {
    table_name: "posts",
    column_name: "comment_count",
    id: postId,
  });
  if (rpcErr) throw rpcErr;

  await createCommentNotification(data.id, user.id);
  return data;
}

/* -------------------------------------------------------------------------- */
/*                                   FOLLOWS                                  */
/* -------------------------------------------------------------------------- */

export async function followUser(userIdToFollow: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  if (user.id === userIdToFollow) throw new Error("Cannot follow yourself");

  const { data: existingFollow, error: followReadErr } = await supabase
    .from("follows")
    .select("id")
    .eq("follower_id", user.id)
    .eq("following_id", userIdToFollow)
    .maybeSingle();

  if (followReadErr && !isNoRowsError(followReadErr)) throw followReadErr;

  if (existingFollow?.id) {
    const { error: delErr } = await supabase
      .from("follows")
      .delete()
      .eq("id", existingFollow.id);
    if (delErr) throw delErr;

    await supabase.rpc("decrement", {
      table_name: "profiles",
      column_name: "follower_count",
      id: userIdToFollow,
    });
    await supabase.rpc("decrement", {
      table_name: "profiles",
      column_name: "following_count",
      id: user.id,
    });

    return false;
  }

  const { error: insErr } = await supabase.from("follows").insert({
    follower_id: user.id,
    following_id: userIdToFollow,
  });
  if (insErr) throw insErr;

  await supabase.rpc("increment", {
    table_name: "profiles",
    column_name: "follower_count",
    id: userIdToFollow,
  });
  await supabase.rpc("increment", {
    table_name: "profiles",
    column_name: "following_count",
    id: user.id,
  });

  await createFollowNotification(userIdToFollow, user.id);
  return true;
}

/* -------------------------------------------------------------------------- */
/*                                    STORIES                                 */
/* -------------------------------------------------------------------------- */

export async function createStory(
  content: string,
  mediaUrl?: string,
  mediaType?: "image" | "video" | "text",
) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("stories")
    .insert({
      user_id: user.id,
      content: content || null,
      media_url: mediaUrl || null,
      media_type: mediaType || (mediaUrl ? "image" : "text"),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      view_count: 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getFollowingStories() {
  const user = await getCurrentUser();
  if (!user) return [];

  const { data: following, error: followError } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", user.id);

  if (followError) return [];
  const ids = (following as any[])?.map((f) => f.following_id) || [];
  if (!ids.length) return [];

  const { data: stories, error } = await supabase
    .from("stories")
    .select(
      `
      *,
      profiles!stories_user_id_fkey(
        id, username, full_name, avatar_url
      )
    `,
    )
    .in("user_id", ids)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: true });

  if (error) return [];
  return stories || [];
}

export async function createStoryComment(storyId: string, content: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const { data: story, error: storyError } = await supabase
    .from("stories")
    .select("user_id, expires_at")
    .eq("id", storyId)
    .gt("expires_at", new Date().toISOString())
    .single();

  if (storyError || !story) throw new Error("Story not found or has expired");

  const { data, error } = await supabase
    .from("story_comments")
    .insert({
      story_id: storyId,
      user_id: user.id,
      content: content.trim(),
    })
    .select()
    .single();

  if (error) throw error;

  if ((story as any).user_id !== user.id) {
    await createStoryCommentNotification(storyId, user.id);
  }

  return data;
}

export async function getActiveStories(limit = 50) {
  const { data, error } = await supabase
    .from("stories")
    .select(`*, profiles!stories_user_id_fkey(*)`)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return [];
  return data || [];
}

export async function getStoriesWithUsers() {
  const { data, error } = await supabase
    .from("stories")
    .select(
      `
      *,
      profiles!stories_user_id_fkey(id, username, full_name, avatar_url)
    `,
    )
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  if (error) return [];
  return data || [];
}

export async function getStoryById(storyId: string) {
  const { data, error } = await supabase
    .from("stories")
    .select(
      `
      *,
      profiles!stories_user_id_fkey(id, username, full_name, avatar_url)
    `,
    )
    .eq("id", storyId)
    .single();

  if (error) return null;
  return data;
}

export async function getUserStories(userId: string) {
  const { data, error } = await supabase
    .from("stories")
    .select(
      `
      *,
      profiles!stories_user_id_fkey(id, username, full_name, avatar_url)
    `,
    )
    .eq("user_id", userId)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: true });

  if (error) return [];
  return data || [];
}

export async function viewStory(storyId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const { data: story, error: storyError } = await supabase
    .from("stories")
    .select("id, view_count")
    .eq("id", storyId)
    .gt("expires_at", new Date().toISOString())
    .single();

  if (storyError || !story) throw new Error("Story not found or has expired");

  const { data: existingView, error: viewReadErr } = await supabase
    .from("story_views")
    .select("id")
    .eq("story_id", storyId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (viewReadErr && !isNoRowsError(viewReadErr)) throw viewReadErr;

  if (!existingView?.id) {
    const { error: insErr } = await supabase.from("story_views").insert({
      story_id: storyId,
      user_id: user.id,
      viewed_at: new Date().toISOString(),
    });
    if (insErr) throw insErr;

    const { error: updErr } = await supabase
      .from("stories")
      .update({ view_count: (story as any).view_count + 1 })
      .eq("id", storyId);

    if (updErr) throw updErr;
  }

  return true;
}

export async function deleteStory(storyId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("stories")
    .delete()
    .eq("id", storyId)
    .eq("user_id", user.id);
  if (error) throw error;
  return true;
}

export async function deleteStoryComment(commentId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("story_comments")
    .delete()
    .eq("id", commentId)
    .eq("user_id", user.id);

  if (error) throw error;
  return true;
}

export async function getStoryComments(
  storyId: string,
  limit = 50,
  offset = 0,
) {
  const { data, error } = await supabase
    .from("story_comments")
    .select(
      `
      *,
      profiles!story_comments_user_id_fkey(id, username, full_name, avatar_url)
    `,
    )
    .eq("story_id", storyId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return [];
  return data || [];
}

export async function getStoryStats(storyId: string) {
  try {
    const [{ count: viewsCount }, { count: commentsCount }] = await Promise.all(
      [
        supabase
          .from("story_views")
          .select("*", { count: "exact", head: true })
          .eq("story_id", storyId),
        supabase
          .from("story_comments")
          .select("*", { count: "exact", head: true })
          .eq("story_id", storyId),
      ],
    );

    return { views: viewsCount || 0, comments: commentsCount || 0 };
  } catch {
    return { views: 0, comments: 0 };
  }
}

export async function hasUnviewedStories() {
  const user = await getCurrentUser();
  if (!user) return false;

  const followingStories = await getFollowingStories();
  if (!followingStories.length) return false;

  const storyIds = followingStories.map((s: any) => s.id);

  const { data: viewedStories } = await supabase
    .from("story_views")
    .select("story_id")
    .eq("user_id", user.id)
    .in("story_id", storyIds);

  const viewedIds = (viewedStories as any[])?.map((v) => v.story_id) || [];
  return storyIds.some((id) => !viewedIds.includes(id));
}

export async function hasActiveStory() {
  const user = await getCurrentUser();
  if (!user) return false;

  const { count, error } = await supabase
    .from("stories")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gt("expires_at", new Date().toISOString());

  if (error) return false;
  return (count || 0) > 0;
}

/* -------------------------------------------------------------------------- */
/*                                 COMMUNITIES                                */
/* -------------------------------------------------------------------------- */

export async function joinCommunity(communityId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("community_members")
    .insert({ community_id: communityId, user_id: user.id, role: "member" })
    .select()
    .single();

  if (error) throw error;

  await supabase.rpc("increment", {
    table_name: "communities",
    column_name: "member_count",
    id: communityId,
  });

  return data;
}

/* -------------------------------------------------------------------------- */
/*                               LINK GENERATION                               */
/* -------------------------------------------------------------------------- */

export function generatePostLink(postId: string) {
  return `https://nebulanet.space/post/${postId}`;
}
export function generateUserLink(username: string) {
  return `https://nebulanet.space/user/${username}`;
}
export function generateCommunityLink(slug: string) {
  return `https://nebulanet.space/community/${slug}`;
}
export function generateDeepLink(
  type: "post" | "user" | "community",
  id: string,
) {
  return `nebulanet://${type}/${id}`;
}

export async function incrementShareCount(postId: string) {
  const post = await getPostById(postId);
  if (!post) throw new Error("Post not found");

  const { error } = await supabase
    .from("posts")
    .update({ share_count: (post as any).share_count + 1 })
    .eq("id", postId);

  if (error) throw error;
}

/* -------------------------------------------------------------------------- */
/*                                 SAVED POSTS                                */
/* -------------------------------------------------------------------------- */

export async function getSavedPosts(limit = 20, offset = 0) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("saves")
    .select(
      `
      created_at,
      posts (
        *,
        profiles!posts_user_id_fkey (
          id,
          username,
          full_name,
          avatar_url
        )
      )
    `,
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  const savedPosts =
    (data as any[])
      ?.filter((item) => item.posts)
      .map((item) => ({ ...item.posts, saved_at: item.created_at })) || [];

  return savedPosts;
}

export async function getSavesCount(postId: string) {
  try {
    const { count, error } = await supabase
      .from("saves")
      .select("*", { count: "exact", head: true })
      .eq("post_id", postId);

    if (error) return 0;
    return count || 0;
  } catch {
    return 0;
  }
}

/* -------------------------------------------------------------------------- */
/*                                    CHAT                                    */
/* -------------------------------------------------------------------------- */

export async function sendMessage(
  conversationId: string,
  content: string,
  mediaUrl?: string,
  mediaType?: "image" | "video" | "audio" | "file",
) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content,
      media_url: mediaUrl,
      media_type: mediaType,
    })
    .select()
    .single();

  if (error) throw error;

  await supabase
    .from("conversations")
    .update({ last_message_id: data.id, updated_at: new Date().toISOString() })
    .eq("id", conversationId);

  return data;
}

/* -------------------------------------------------------------------------- */
/*                              SEARCH / TRENDING                             */
/* -------------------------------------------------------------------------- */

export async function searchPosts(query: string, limit = 20) {
  const { data, error } = await supabase
    .from("posts")
    .select(
      `
      *,
      profiles!posts_user_id_fkey(id, username, full_name, avatar_url)
    `,
    )
    .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

export async function getTrendingPosts(limit = 10) {
  const { data, error } = await supabase
    .from("posts")
    .select(
      `
      *,
      profiles!posts_user_id_fkey(id, username, full_name, avatar_url)
    `,
    )
    .order("like_count", { ascending: false })
    .order("comment_count", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

export async function getRelatedPosts(postId: string, limit = 5) {
  const currentPost = await getPostById(postId);
  if (!currentPost) return [];

  const title = (currentPost as any).title || "";
  const content = (currentPost as any).content || "";

  const { data, error } = await supabase
    .from("posts")
    .select(
      `
      *,
      profiles!posts_user_id_fkey(id, username, full_name, avatar_url)
    `,
    )
    .neq("id", postId)
    .or(`title.ilike.%${title}%,content.ilike.%${content}%`)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return [];
  return data || [];
}

/* -------------------------------------------------------------------------- */
/*                           REPORTS / BLOCKS (FIXED)                          */
/* -------------------------------------------------------------------------- */

export async function reportPost(postId: string, reason: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    post_id: postId,
    reason,
    status: "pending",
    created_at: new Date().toISOString(),
  });

  if (error) throw error;
  return true;
}

export async function blockUser(userId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase.from("blocks").insert({
    blocker_id: user.id,
    blocked_id: userId,
    created_at: new Date().toISOString(),
  });

  if (error) throw error;
  return true;
}

export async function unblockUser(userId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("blocks")
    .delete()
    .eq("blocker_id", user.id)
    .eq("blocked_id", userId);

  if (error) throw error;
  return true;
}

export async function isUserBlocked(userId: string) {
  const user = await getCurrentUser();
  if (!user) return false;

  const { data, error } = await supabase
    .from("blocks")
    .select("id")
    .eq("blocker_id", user.id)
    .eq("blocked_id", userId)
    .maybeSingle();

  if (error && !isNoRowsError(error)) return false;
  return !!data?.id;
}

export async function getBlockedUsers(limit = 50, offset = 0) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("blocks")
    .select(
      `
      *,
      blocked:profiles!blocks_blocked_id_fkey(id, username, full_name, avatar_url)
    `,
    )
    .eq("blocker_id", user.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return data;
}

/* -------------------------------------------------------------------------- */
/*                                 ANALYTICS                                  */
/* -------------------------------------------------------------------------- */

export async function trackPostView(postId: string) {
  const user = await getCurrentUser();
  if (!user) return;

  try {
    const twentyFourHoursAgo = new Date(
      Date.now() - 24 * 60 * 60 * 1000,
    ).toISOString();

    const { data: existingView, error: viewReadErr } = await supabase
      .from("post_views")
      .select("id")
      .eq("post_id", postId)
      .eq("user_id", user.id)
      .gt("viewed_at", twentyFourHoursAgo)
      .maybeSingle();

    if (viewReadErr && !isNoRowsError(viewReadErr)) throw viewReadErr;

    if (!existingView?.id) {
      const { error: insErr } = await supabase.from("post_views").insert({
        post_id: postId,
        user_id: user.id,
        viewed_at: new Date().toISOString(),
      });
      if (insErr) throw insErr;

      const { error: rpcErr } = await supabase.rpc("increment", {
        table_name: "posts",
        column_name: "view_count",
        id: postId,
      });
      if (rpcErr) throw rpcErr;
    }
  } catch (error) {
    console.error("❌ trackPostView error:", error);
  }
}

export async function getUserAnalytics() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const [
    { count: totalPosts },
    { count: totalLikes },
    { count: totalComments },
    { count: totalFollowers },
    { count: totalFollowing },
  ] = await Promise.all([
    supabase
      .from("posts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("likes")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("comments")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("following_id", user.id),
    supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", user.id),
  ]);

  return {
    totalPosts: totalPosts ?? 0,
    totalLikes: totalLikes ?? 0,
    totalComments: totalComments ?? 0,
    totalFollowers: totalFollowers ?? 0,
    totalFollowing: totalFollowing ?? 0,
    engagementRate:
      (totalFollowers ?? 0) > 0
        ? ((totalLikes ?? 0) + (totalComments ?? 0)) / (totalFollowers ?? 1)
        : 0,
  };
}

/* -------------------------------------------------------------------------- */
/*                                 REALTIME                                   */
/* -------------------------------------------------------------------------- */

export function subscribeToNotifications(
  userId: string,
  callback: (payload: any) => void,
) {
  const channel = supabase.channel(`notifications-${userId}`);

  channel.on(
    "postgres_changes" as any,
    {
      event: "INSERT",
      schema: "public",
      table: "notifications",
      filter: `receiver_id=eq.${userId}`,
    },
    callback,
  );

  channel.subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToPosts(callback: (payload: any) => void) {
  const channel = supabase.channel("posts-feed");

  channel.on(
    "postgres_changes" as any,
    {
      event: "INSERT",
      schema: "public",
      table: "posts",
    },
    callback,
  );

  channel.subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
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

export async function initializeSupabase() {
  const { data: authData } = await supabase.auth.getSession();
  console.log(
    "Supabase initialized",
    authData.session ? "User logged in" : "No user session",
  );
  return authData;
}

export async function withErrorHandling<T>(
  operation: Promise<T>,
): Promise<{ data: T | null; error: Error | null }> {
  try {
    const data = await operation;
    return { data, error: null };
  } catch (error) {
    console.error("Supabase operation failed:", error);
    return { data: null, error: error as Error };
  }
}

/* -------------------------------------------------------------------------- */
/*                               EXTRA HELPERS                                */
/* -------------------------------------------------------------------------- */

export async function getUserPosts(userId: string, limit = 20, offset = 0) {
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return data;
}

export async function getPostComments(postId: string, limit = 50, offset = 0) {
  const { data, error } = await supabase
    .from("comments")
    .select(`*, profiles!comments_user_id_fkey(*)`)
    .eq("post_id", postId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return data;
}

/* -------------------------------------------------------------------------- */
/*                                DEFAULT EXPORT                               */
/* -------------------------------------------------------------------------- */

export default {
  supabase,

  // auth
  signInWithEmail,
  signUpWithEmail,
  signOut,
  getCurrentUser,
  getCurrentSession,
  resetPassword,
  updatePassword,
  updateUserEmail,
  resendVerificationEmail,
  verifyEmailToken,

  // profile
  updateProfile,
  getProfile,
  getProfileByUsername,
  getCurrentUserProfile,

  // posts
  createPost,
  getFeedPosts,
  getPostById,
  likePost,
  checkIfLiked,

  // saves
  checkIfSaved,
  savePost,
  getSavedPosts,
  getSavesCount,

  // comments
  createComment,
  getPostComments,

  // follows
  followUser,

  // stories
  createStory,
  getFollowingStories,
  getActiveStories,
  getStoriesWithUsers,
  createStoryComment,
  getStoryById,
  getUserStories,
  viewStory,
  deleteStory,
  deleteStoryComment,
  getStoryComments,
  getStoryStats,
  hasUnviewedStories,
  hasActiveStory,

  // notifications
  createNotification,
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  deleteAllNotifications,
  getUnreadNotificationsCount,
  getNotificationStats,
  createLikeNotification,
  createCommentNotification,
  createFollowNotification,
  createStoryCommentNotification,
  createMessageNotification,
  createMentionNotification,

  // community
  joinCommunity,

  // links
  generatePostLink,
  generateUserLink,
  generateCommunityLink,
  generateDeepLink,
  incrementShareCount,

  // chat
  sendMessage,

  // report/block
  reportPost,
  blockUser,
  unblockUser,
  isUserBlocked,
  getBlockedUsers,

  // analytics
  trackPostView,
  getUserAnalytics,

  // realtime
  subscribeToNotifications,
  subscribeToPosts,

  // utils
  testConnection,
  initializeSupabase,
  from,
  withErrorHandling,
  getAuthRedirectUrl,
  getPasswordResetRedirectUrl,
};
