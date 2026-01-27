// lib/supabase.ts - COMPLETE FIXED VERSION
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";
import "react-native-url-polyfill/auto";

// Supabase configuration
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Debug logging for environment variables
console.log("🔧 Supabase URL exists:", !!supabaseUrl);
console.log("🔧 Supabase Anon Key exists:", !!supabaseAnonKey);

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Check your .env file!",
  );
}

// Get platform-specific redirect URL for email verification
export const getAuthRedirectUrl = () => {
  if (Platform.OS === "web") {
    return "https://nebulanet.space/verify-email-handler";
  } else {
    return "nebulanet://verify-email-handler";
  }
};

// Safe storage adapter
const createSafeStorage = () => {
  const isWebLike =
    typeof window !== "undefined" && typeof localStorage !== "undefined";

  if (Platform.OS === "web" && isWebLike) {
    return {
      getItem: async (key: string): Promise<string | null> => {
        try {
          return localStorage.getItem(key);
        } catch (error) {
          console.warn("localStorage getItem error:", error);
          return null;
        }
      },
      setItem: async (key: string, value: string): Promise<void> => {
        try {
          localStorage.setItem(key, value);
        } catch (error) {
          console.warn("localStorage setItem error:", error);
        }
      },
      removeItem: async (key: string): Promise<void> => {
        try {
          localStorage.removeItem(key);
        } catch (error) {
          console.warn("localStorage removeItem error:", error);
        }
      },
    };
  } else {
    return {
      getItem: async (key: string): Promise<string | null> => {
        try {
          return await AsyncStorage.getItem(key);
        } catch (error) {
          console.warn("AsyncStorage getItem error:", error);
          return null;
        }
      },
      setItem: async (key: string, value: string): Promise<void> => {
        try {
          await AsyncStorage.setItem(key, value);
        } catch (error) {
          console.warn("AsyncStorage setItem error:", error);
        }
      },
      removeItem: async (key: string): Promise<void> => {
        try {
          await AsyncStorage.removeItem(key);
        } catch (error) {
          console.warn("AsyncStorage removeItem error:", error);
        }
      },
    };
  }
};

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
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
    params: {
      eventsPerSecond: 10,
    },
  },
});

// ==================== TYPES ====================
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
      media: any[] | null;
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

// ==================== NOTIFICATION FUNCTIONS ====================

/**
 * Create a notification
 */
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

    if (error) {
      console.error("❌ Create notification error:", error);
      throw error;
    }

    console.log("✅ Notification created:", data.id);
    return { data, error: null };
  } catch (error: any) {
    console.error("❌ Create notification exception:", error);
    return { data: null, error };
  }
}

/**
 * Get notifications for current user
 */
export async function getNotifications(limit = 50, offset = 0) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  console.log("🔔 Getting notifications for user:", user.id);

  try {
    const { data, error } = await supabase
      .from("notifications")
      .select(
        `
        *,
        sender:profiles!notifications_sender_id_fkey(
          id,
          username,
          full_name,
          avatar_url
        ),
        post:posts!notifications_post_id_fkey(
          id,
          title,
          content,
          media
        ),
        comment:comments!notifications_comment_id_fkey(
          id,
          content
        ),
        community:communities!notifications_community_id_fkey(
          id,
          name,
          slug,
          avatar_url
        ),
        story:stories!notifications_story_id_fkey(
          id,
          content,
          media_url
        ),
        conversation:conversations!notifications_conversation_id_fkey(
          id,
          name,
          avatar_url
        )
      `,
      )
      .eq("receiver_id", user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("❌ Get notifications error:", error);
      throw error;
    }

    console.log(`✅ Found ${data?.length || 0} notifications`);
    return { data, error: null };
  } catch (error: any) {
    console.error("❌ Get notifications exception:", error);
    return { data: null, error };
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: string) {
  console.log("📝 Marking notification as read:", notificationId);

  try {
    const { error } = await supabase
      .from("notifications")
      .update({
        read: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", notificationId);

    if (error) {
      console.error("❌ Mark notification as read error:", error);
      throw error;
    }

    console.log("✅ Notification marked as read");
    return { error: null };
  } catch (error: any) {
    console.error("❌ Mark notification as read exception:", error);
    return { error };
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsAsRead() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  console.log("📝 Marking all notifications as read");

  try {
    const { error } = await supabase
      .from("notifications")
      .update({
        read: true,
        updated_at: new Date().toISOString(),
      })
      .eq("receiver_id", user.id)
      .eq("read", false);

    if (error) {
      console.error("❌ Mark all notifications as read error:", error);
      throw error;
    }

    console.log("✅ All notifications marked as read");
    return { error: null };
  } catch (error: any) {
    console.error("❌ Mark all notifications as read exception:", error);
    return { error };
  }
}

/**
 * Delete notification
 */
export async function deleteNotification(notificationId: string) {
  console.log("🗑️ Deleting notification:", notificationId);

  try {
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", notificationId);

    if (error) {
      console.error("❌ Delete notification error:", error);
      throw error;
    }

    console.log("✅ Notification deleted");
    return { error: null };
  } catch (error: any) {
    console.error("❌ Delete notification exception:", error);
    return { error };
  }
}

/**
 * DELETE ALL NOTIFICATIONS (CLEAR ALL)
 */
export async function deleteAllNotifications() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  console.log("🗑️ Deleting all notifications for user:", user.id);

  try {
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("receiver_id", user.id);

    if (error) {
      console.error("❌ Delete all notifications error:", error);
      throw error;
    }

    console.log("✅ All notifications deleted");
    return { error: null };
  } catch (error: any) {
    console.error("❌ Delete all notifications exception:", error);
    return { error };
  }
}

/**
 * Get unread notifications count
 */
export async function getUnreadNotificationsCount() {
  const user = await getCurrentUser();
  if (!user) return 0;

  console.log("🔍 Getting unread notifications count");

  try {
    const { count, error } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("receiver_id", user.id)
      .eq("read", false);

    if (error) {
      console.error("❌ Get unread notifications count error:", error);
      throw error;
    }

    console.log(`✅ Unread count: ${count || 0}`);
    return count || 0;
  } catch (error: any) {
    console.error("❌ Get unread notifications count exception:", error);
    return 0;
  }
}

/**
 * Get notification statistics
 */
export async function getNotificationStats() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  console.log("📊 Getting notification statistics");

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
          (acc, notification) => {
            acc[notification.type] = (acc[notification.type] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        ) || {},
    };

    console.log("✅ Notification stats:", stats);
    return { data: stats, error: null };
  } catch (error: any) {
    console.error("❌ Get notification stats error:", error);
    return { data: null, error };
  }
}

// ==================== NOTIFICATION TRIGGERS ====================

/**
 * Create like notification
 */
export async function createLikeNotification(postId: string, userId: string) {
  console.log("❤️ Creating like notification");

  try {
    // Get post owner
    const { data: post, error: postError } = await supabase
      .from("posts")
      .select("user_id")
      .eq("id", postId)
      .single();

    if (postError) throw postError;

    // ✅ Type cast to handle potential null
    const postData = post as { user_id: string } | null;

    if (!postData || postData.user_id === userId) return;

    // Create notification
    return createNotification({
      type: "like",
      sender_id: userId,
      receiver_id: postData.user_id,
      post_id: postId,
    });
  } catch (error) {
    console.error("❌ Create like notification error:", error);
    throw error;
  }
}

/**
 * Create comment notification
 */
export async function createCommentNotification(
  commentId: string,
  userId: string,
) {
  console.log("💬 Creating comment notification");

  try {
    // Get comment details
    const { data: comment, error: commentError } = await supabase
      .from("comments")
      .select(
        `
        id,
        post_id,
        posts!inner(user_id)
      `,
      )
      .eq("id", commentId)
      .single();

    if (commentError) throw commentError;

    // ✅ FIXED: Cast through unknown first for complex nested type
    const commentData = comment as unknown as {
      id: string;
      post_id: string;
      posts: { user_id: string };
    } | null;

    if (!commentData || commentData.posts.user_id === userId) return;

    // Create notification
    return createNotification({
      type: "comment",
      sender_id: userId,
      receiver_id: commentData.posts.user_id,
      post_id: commentData.post_id,
      comment_id: commentId,
    });
  } catch (error) {
    console.error("❌ Create comment notification error:", error);
    throw error;
  }
}

/**
 * Create follow notification
 */
export async function createFollowNotification(
  followingId: string,
  followerId: string,
) {
  console.log("👤 Creating follow notification");

  try {
    return createNotification({
      type: "follow",
      sender_id: followerId,
      receiver_id: followingId,
    });
  } catch (error) {
    console.error("❌ Create follow notification error:", error);
    throw error;
  }
}

/**
 * ✅ FIXED — `createStoryCommentNotification()`
 */
export async function createStoryCommentNotification(
  storyId: string,
  userId: string,
) {
  console.log("📸 Creating story comment notification");

  try {
    const { data: story, error: storyError } = await supabase
      .from("stories")
      .select("user_id")
      .eq("id", storyId)
      .single();

    // ✅ FIXED: Proper type casting
    const storyData = story as { user_id: string } | null;

    if (storyError || !storyData || storyData.user_id === userId) return;

    return createNotification({
      type: "story_comment",
      sender_id: userId,
      receiver_id: storyData.user_id,
      story_id: storyId,
    });
  } catch (error) {
    console.error("❌ Create story comment notification error:", error);
    throw error;
  }
}

/**
 * Create message notification
 */
export async function createMessageNotification(
  conversationId: string,
  senderId: string,
  receiverId: string,
) {
  console.log("💌 Creating message notification");

  try {
    return createNotification({
      type: "message",
      sender_id: senderId,
      receiver_id: receiverId,
      conversation_id: conversationId,
    });
  } catch (error) {
    console.error("❌ Create message notification error:", error);
    throw error;
  }
}

/**
 * Create mention notification
 */
export async function createMentionNotification(
  postId: string,
  userId: string,
  mentionedUserId: string,
) {
  console.log("📍 Creating mention notification");

  try {
    if (userId === mentionedUserId) return;

    return createNotification({
      type: "mention",
      sender_id: userId,
      receiver_id: mentionedUserId,
      post_id: postId,
    });
  } catch (error) {
    console.error("❌ Create mention notification error:", error);
    throw error;
  }
}

// ==================== AUTH FUNCTIONS ====================

export async function signInWithEmail(email: string, password: string) {
  console.log("🔐 signInWithEmail called for:", email);

  try {
    const normalizedEmail = email.trim().toLowerCase();
    console.log("🔧 Normalized email:", normalizedEmail);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password: password.trim(),
    });

    if (error) {
      console.error("❌ Supabase auth error:", {
        message: error.message,
        status: error.status,
        name: error.name,
      });
      throw error;
    }

    console.log("✅ Login successful! User ID:", data.user?.id);
    console.log("🔐 Session exists:", !!data.session);
    console.log("📧 Email verified:", !!data.user?.email_confirmed_at);
    return data;
  } catch (error: any) {
    console.error("❌ signInWithEmail exception:", {
      message: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

export async function signUpWithEmail(
  email: string,
  password: string,
  userData: { username: string; full_name?: string },
) {
  console.log("📝 signUpWithEmail called for:", email);

  // Get redirect URL for email verification
  const redirectTo = getAuthRedirectUrl();
  console.log("🔗 Verification redirect URL:", redirectTo);

  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password: password.trim(),
    options: {
      data: userData,
      emailRedirectTo: redirectTo,
    },
  });

  if (error) {
    console.error("❌ Signup error:", error);
    throw error;
  }

  // Create profile after successful signup
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
      console.log("✅ Profile created for user:", data.user.id);
    } catch (profileError: any) {
      console.error("❌ Profile creation error:", profileError);
      // Don't throw - the auth user was created successfully
    }
  }

  return data;
}

export async function resendVerificationEmail(email: string) {
  console.log("📧 Resending verification email to:", email);

  const redirectTo = getAuthRedirectUrl();
  console.log("🔗 Resend redirect URL:", redirectTo);

  const { error } = await supabase.auth.resend({
    type: "signup",
    email: email.trim().toLowerCase(),
    options: {
      emailRedirectTo: redirectTo,
    },
  });

  if (error) {
    console.error("❌ Resend verification error:", error);
    throw error;
  }

  console.log("✅ Verification email resent");
  return true;
}

export async function verifyEmailToken(token: string, type: string = "signup") {
  console.log("🔑 Verifying email token...");

  try {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: type as any,
    });

    if (error) {
      console.error("❌ Email verification error:", error);
      throw error;
    }

    console.log("✅ Email verified successfully!");
    return data;
  } catch (error: any) {
    console.error("❌ verifyEmailToken exception:", error);
    throw error;
  }
}

export async function signOut() {
  console.log("👋 Signing out...");
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("❌ Signout error:", error);
    throw error;
  }
  console.log("✅ Signed out successfully");
}

export async function getCurrentUser() {
  console.log("🔍 Getting current user...");
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      console.error("❌ Get user error:", error);
      return null;
    }

    console.log("✅ Current user:", user?.email || "No user");
    return user;
  } catch (error: any) {
    console.error("❌ Get current user exception:", error);
    return null;
  }
}

export async function getCurrentSession() {
  console.log("🔍 Getting current session...");
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      console.error("❌ Get session error:", error);
      return null;
    }

    console.log("✅ Session exists:", !!session);
    return session;
  } catch (error: any) {
    console.error("❌ Get current session exception:", error);
    return null;
  }
}

export async function resetPassword(email: string) {
  console.log("📧 Resetting password for:", email);

  const redirectTo = getAuthRedirectUrl();

  const { error } = await supabase.auth.resetPasswordForEmail(
    email.trim().toLowerCase(),
    {
      redirectTo: `${redirectTo}?type=recovery`,
    },
  );

  if (error) {
    console.error("❌ Reset password error:", error);
    throw error;
  }

  console.log("✅ Password reset email sent");
}

export async function updatePassword(newPassword: string) {
  console.log("🔐 Updating password...");

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    console.error("❌ Update password error:", error);
    throw error;
  }

  console.log("✅ Password updated");
}

export async function updateUserEmail(newEmail: string) {
  console.log("📧 Updating user email to:", newEmail);

  const redirectTo = getAuthRedirectUrl();

  const { error } = await supabase.auth.updateUser(
    {
      email: newEmail.trim().toLowerCase(),
    },
    {
      emailRedirectTo: `${redirectTo}?type=email_change`,
    },
  );

  if (error) {
    console.error("❌ Update email error:", error);
    throw error;
  }

  console.log("✅ Email update initiated");
}

// ==================== PROFILE FUNCTIONS ====================

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
  console.log("📝 Updating profile...");

  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("profiles")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", user.id)
    .select()
    .single();

  if (error) {
    console.error("❌ Update profile error:", error);
    throw error;
  }

  console.log("✅ Profile updated");
  return data;
}

export async function getProfile(userId?: string) {
  console.log("🔍 Getting profile for:", userId || "current user");

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

  if (error) {
    console.error("❌ Get profile error:", error);
    return null;
  }

  console.log("✅ Profile found:", data.username);
  return data;
}

export async function getProfileByUsername(username: string) {
  console.log("🔍 Getting profile by username:", username);

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .single();

  if (error) {
    console.error("❌ Get profile by username error:", error);
    return null;
  }

  console.log("✅ Profile found by username:", data.username);
  return data;
}

export async function getCurrentUserProfile() {
  const user = await getCurrentUser();
  if (!user) return null;
  return await getProfile(user.id);
}

// ==================== POST FUNCTIONS ====================

export async function createPost(postData: {
  title?: string;
  content: string;
  media?: any[];
  community_id?: string;
  is_public?: boolean;
}) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  console.log("📝 Creating post");

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

  if (error) {
    console.error("❌ Create post error:", error);
    throw error;
  }

  console.log("✅ Post created:", data.id);
  return data;
}

export async function getFeedPosts(limit = 20, offset = 0) {
  console.log("🔍 Getting feed posts");

  try {
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

    if (error) {
      console.error("❌ Get feed posts error:", error);
      throw error;
    }

    console.log(`✅ Found ${data?.length || 0} feed posts`);
    return data;
  } catch (error) {
    console.error("❌ Get feed posts exception:", error);
    throw error;
  }
}

export async function getPostById(postId: string) {
  console.log("🔍 Getting post by ID:", postId);

  try {
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

    if (error) {
      console.error("❌ Get post error:", error);
      throw error;
    }

    console.log("✅ Post found:", data.id);
    return data;
  } catch (error) {
    console.error("❌ Get post exception:", error);
    throw error;
  }
}

export async function likePost(postId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  console.log("❤️ Liking post:", postId);

  try {
    // Check if already liked
    const { data: existingLike } = await supabase
      .from("likes")
      .select("*")
      .eq("user_id", user.id)
      .eq("post_id", postId)
      .single();

    if (existingLike) {
      // Unlike
      await supabase.from("likes").delete().eq("id", existingLike.id);
      await supabase.rpc("decrement", {
        table_name: "posts",
        column_name: "like_count",
        id: postId,
      });
      console.log("✅ Post unliked");
      return false;
    } else {
      // Like
      await supabase.from("likes").insert({
        user_id: user.id,
        post_id: postId,
      });
      await supabase.rpc("increment", {
        table_name: "posts",
        column_name: "like_count",
        id: postId,
      });

      // Create notification
      await createLikeNotification(postId, user.id);

      console.log("✅ Post liked");
      return true;
    }
  } catch (error) {
    console.error("❌ Like post error:", error);
    throw error;
  }
}

export async function checkIfLiked(postId: string): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  console.log("🔍 Checking if post is liked:", postId);

  try {
    const { data } = await supabase
      .from("likes")
      .select("*")
      .eq("user_id", user.id)
      .eq("post_id", postId)
      .single();

    const isLiked = !!data;
    console.log(`✅ Post ${isLiked ? "is" : "is not"} liked`);
    return isLiked;
  } catch (error) {
    console.error("❌ Check if liked error:", error);
    return false;
  }
}

// ==================== SAVE FUNCTIONS ====================

export async function checkIfSaved(postId: string): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  console.log("🔍 Checking if post is saved:", postId);

  try {
    const { data, error } = await supabase
      .from("saves")
      .select("*")
      .eq("user_id", user.id)
      .eq("post_id", postId)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("❌ Check if saved error:", error);
      return false;
    }

    const isSaved = !!data;
    console.log(`✅ Post ${isSaved ? "is" : "is not"} saved`);
    return isSaved;
  } catch (error) {
    console.error("❌ Check if saved exception:", error);
    return false;
  }
}

export async function savePost(postId: string): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  console.log("💾 Toggling save for post:", postId);

  try {
    // Check if already saved
    const { data: existingSave } = await supabase
      .from("saves")
      .select("*")
      .eq("user_id", user.id)
      .eq("post_id", postId)
      .single();

    if (existingSave) {
      // Unsave the post
      const { error: deleteError } = await supabase
        .from("saves")
        .delete()
        .eq("id", existingSave.id);

      if (deleteError) {
        console.error("❌ Unsave post error:", deleteError);
        throw deleteError;
      }

      console.log("✅ Post unsaved");
      return false;
    } else {
      // Save the post
      const { error: insertError } = await supabase.from("saves").insert({
        user_id: user.id,
        post_id: postId,
        created_at: new Date().toISOString(),
      });

      if (insertError) {
        console.error("❌ Save post error:", insertError);
        throw insertError;
      }

      console.log("✅ Post saved");
      return true;
    }
  } catch (error) {
    console.error("❌ Save post exception:", error);
    throw error;
  }
}

// ==================== COMMENT FUNCTIONS ====================

export async function createComment(
  postId: string,
  content: string,
  parentId?: string,
) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  console.log("💬 Creating comment on post:", postId);

  try {
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

    if (error) {
      console.error("❌ Create comment error:", error);
      throw error;
    }

    // Increment comment count
    await supabase.rpc("increment", {
      table_name: "posts",
      column_name: "comment_count",
      id: postId,
    });

    // Create notification
    await createCommentNotification(data.id, user.id);

    console.log("✅ Comment created:", data.id);
    return data;
  } catch (error) {
    console.error("❌ Create comment exception:", error);
    throw error;
  }
}

// ==================== FOLLOW FUNCTIONS ====================

export async function followUser(userIdToFollow: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  if (user.id === userIdToFollow) {
    throw new Error("Cannot follow yourself");
  }

  console.log("👤 Following user:", userIdToFollow);

  try {
    const { data: existingFollow } = await supabase
      .from("follows")
      .select("*")
      .eq("follower_id", user.id)
      .eq("following_id", userIdToFollow)
      .single();

    if (existingFollow) {
      // Unfollow
      await supabase.from("follows").delete().eq("id", existingFollow.id);

      // Decrement counts
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

      console.log("✅ User unfollowed");
      return false;
    } else {
      // Follow
      await supabase.from("follows").insert({
        follower_id: user.id,
        following_id: userIdToFollow,
      });

      // Increment counts
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

      // Create notification
      await createFollowNotification(userIdToFollow, user.id);

      console.log("✅ User followed");
      return true;
    }
  } catch (error) {
    console.error("❌ Follow user error:", error);
    throw error;
  }
}

// ==================== STORY FUNCTIONS ====================

export async function createStory(
  content: string,
  mediaUrl?: string,
  mediaType?: "image" | "video" | "text",
) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  console.log("📸 Creating story for user:", user.id);

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

  if (error) {
    console.error("❌ Create story error:", error);
    throw error;
  }

  console.log("✅ Story created:", data.id);
  return data;
}

export async function getFollowingStories() {
  const user = await getCurrentUser();
  if (!user) {
    console.log("⚠️ No user, returning empty stories");
    return [];
  }

  console.log("🔍 Getting stories from followed users");

  try {
    // Get users that the current user follows
    const { data: following, error: followError } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", user.id);

    if (followError) {
      console.error("❌ Get following error:", followError);
      return [];
    }

    // ✅ FIXED: Proper type handling
    const followingData = following as { following_id: string }[] | null;
    const followingIds = followingData?.map((f) => f.following_id) || [];

    if (followingIds.length === 0) {
      console.log("ℹ️ Not following anyone");
      return [];
    }

    // Get active stories from followed users
    const { data: stories, error: storiesError } = await supabase
      .from("stories")
      .select(
        `
        *,
        profiles!stories_user_id_fkey (
          id,
          username,
          full_name,
          avatar_url
        )
      `,
      )
      .in("user_id", followingIds)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: true });

    if (storiesError) {
      console.error("❌ Get stories error:", storiesError);
      return [];
    }

    console.log(`✅ Found ${stories?.length || 0} following stories`);
    return stories || [];
  } catch (error) {
    console.error("❌ Get following stories exception:", error);
    return [];
  }
}

/**
 * ✅ FIXED — `createStoryComment()`
 */
export async function createStoryComment(storyId: string, content: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  console.log("💬 Creating story comment for story:", storyId);

  try {
    // Check if story exists and is not expired
    const { data: story, error: storyError } = await supabase
      .from("stories")
      .select("user_id")
      .eq("id", storyId)
      .gt("expires_at", new Date().toISOString())
      .single();

    // ✅ FIXED: Proper type casting
    const storyData = story as { user_id: string } | null;

    if (storyError || !storyData) {
      throw new Error("Story not found or has expired");
    }

    // Create comment
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

    // Notify story owner (if not self)
    if (storyData.user_id !== user.id) {
      await createStoryCommentNotification(storyId, user.id);
    }

    console.log("✅ Story comment created:", data.id);
    return data;
  } catch (error: any) {
    console.error("❌ Create story comment error:", error);
    throw error;
  }
}

export async function getActiveStories(limit = 50) {
  console.log("🔍 Getting active stories");

  try {
    const { data, error } = await supabase
      .from("stories")
      .select(
        `
        *,
        profiles!stories_user_id_fkey(*)
      `,
      )
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("❌ Get active stories error:", error);
      return [];
    }

    console.log(`✅ Found ${data?.length || 0} active stories`);
    return data || [];
  } catch (error) {
    console.error("❌ Get active stories exception:", error);
    return [];
  }
}

export async function getStoriesWithUsers() {
  console.log("🔍 Getting stories with user data");

  try {
    const { data, error } = await supabase
      .from("stories")
      .select(
        `
        *,
        profiles!stories_user_id_fkey (
          id,
          username,
          full_name,
          avatar_url
        )
      `,
      )
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ Get stories with users error:", error);
      return [];
    }

    console.log(`✅ Found ${data?.length || 0} stories with users`);
    return data || [];
  } catch (error) {
    console.error("❌ Get stories with users exception:", error);
    return [];
  }
}

// ==================== REAL-TIME SUBSCRIPTIONS ====================

export function subscribeToNotifications(
  userId: string,
  callback: (payload: any) => void,
) {
  console.log("📡 Subscribing to notifications for user:", userId);

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
    console.log("📡 Unsubscribing from notifications");
    supabase.removeChannel(channel);
  };
}

export function subscribeToPosts(callback: (payload: any) => void) {
  console.log("📡 Subscribing to posts");

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
    console.log("📡 Unsubscribing from posts");
    supabase.removeChannel(channel);
  };
}

// ==================== UTILITY FUNCTIONS ====================

export async function testConnection() {
  console.log("🔌 Testing Supabase connection...");

  try {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      console.error("❌ Connection test failed:", error.message);
      return { success: false, error: error.message };
    }

    console.log("✅ Connection test successful!");
    return { success: true, session: !!data.session };
  } catch (error: any) {
    console.error("❌ Connection test exception:", error.message);
    return { success: false, error: error.message };
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

export type TableName = keyof Tables;

export const from = <T extends TableName>(table: T) => {
  return supabase.from(table);
};

export type { Session, User } from "@supabase/supabase-js";

export type RealtimePayload<T extends TableName> = {
  commit_timestamp: string;
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: Tables[T]["Row"];
  old: Tables[T]["Row"];
  schema: string;
  table: string;
};

// Error handling wrapper
export async function withErrorHandling<T>(operation: Promise<T>): Promise<{
  data: T | null;
  error: Error | null;
}> {
  try {
    const data = await operation;
    return { data, error: null };
  } catch (error) {
    console.error("Supabase operation failed:", error);
    return { data: null, error: error as Error };
  }
}

// ==================== HELPER FUNCTIONS ====================

export async function getUserPosts(userId: string, limit = 20, offset = 0) {
  console.log("🔍 Getting posts for user:", userId);

  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("❌ Get user posts error:", error);
    throw error;
  }

  console.log(`✅ Found ${data?.length || 0} user posts`);
  return data;
}

export async function getPostComments(postId: string, limit = 50, offset = 0) {
  console.log("🔍 Getting comments for post:", postId);

  const { data, error } = await supabase
    .from("comments")
    .select(
      `
      *,
      profiles!comments_user_id_fkey(*)
    `,
    )
    .eq("post_id", postId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("❌ Get post comments error:", error);
    throw error;
  }

  console.log(`✅ Found ${data?.length || 0} post comments`);
  return data;
}

export async function getStoryById(storyId: string) {
  console.log("🔍 Getting story by ID:", storyId);

  try {
    const { data, error } = await supabase
      .from("stories")
      .select(
        `
        *,
        profiles!stories_user_id_fkey (
          id,
          username,
          full_name,
          avatar_url
        )
      `,
      )
      .eq("id", storyId)
      .single();

    if (error) {
      console.error("❌ Get story error:", error);
      return null;
    }

    console.log("✅ Story found:", data.id);
    return data;
  } catch (error) {
    console.error("❌ Get story exception:", error);
    return null;
  }
}

export async function getUserStories(userId: string) {
  console.log("🔍 Getting stories for user:", userId);

  try {
    const { data, error } = await supabase
      .from("stories")
      .select(
        `
        *,
        profiles!stories_user_id_fkey (
          id,
          username,
          full_name,
          avatar_url
        )
      `,
      )
      .eq("user_id", userId)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: true });

    if (error) {
      console.error("❌ Get user stories error:", error);
      return [];
    }

    console.log(`✅ Found ${data?.length || 0} stories`);
    return data || [];
  } catch (error) {
    console.error("❌ Get user stories exception:", error);
    return [];
  }
}

export async function viewStory(storyId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  console.log("👀 Viewing story:", storyId);

  try {
    // Check if story exists and is not expired
    const { data: story, error: storyError } = await supabase
      .from("stories")
      .select("*")
      .eq("id", storyId)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (storyError || !story) {
      throw new Error("Story not found or has expired");
    }

    // Check if already viewed
    const { data: existingView } = await supabase
      .from("story_views")
      .select("*")
      .eq("story_id", storyId)
      .eq("user_id", user.id)
      .single();

    if (!existingView) {
      // Record view
      await supabase.from("story_views").insert({
        story_id: storyId,
        user_id: user.id,
        viewed_at: new Date().toISOString(),
      });

      // Increment view count
      await supabase
        .from("stories")
        .update({ view_count: story.view_count + 1 })
        .eq("id", storyId);

      console.log("✅ Story viewed and count incremented");
    } else {
      console.log("ℹ️ Story already viewed");
    }

    return true;
  } catch (error) {
    console.error("❌ View story error:", error);
    throw error;
  }
}

export async function deleteStory(storyId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  console.log("🗑️ Deleting story:", storyId);

  const { error } = await supabase
    .from("stories")
    .delete()
    .eq("id", storyId)
    .eq("user_id", user.id);

  if (error) {
    console.error("❌ Delete story error:", error);
    throw error;
  }

  console.log("✅ Story deleted");
  return true;
}

export async function deleteStoryComment(commentId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  console.log("🗑️ Deleting story comment:", commentId);

  const { error } = await supabase
    .from("story_comments")
    .delete()
    .eq("id", commentId)
    .eq("user_id", user.id);

  if (error) {
    console.error("❌ Delete story comment error:", error);
    throw error;
  }

  console.log("✅ Story comment deleted");
  return true;
}

export async function getStoryComments(
  storyId: string,
  limit = 50,
  offset = 0,
) {
  console.log("🔍 Getting comments for story:", storyId);

  try {
    const { data, error } = await supabase
      .from("story_comments")
      .select(
        `
        *,
        profiles!story_comments_user_id_fkey (
          id,
          username,
          full_name,
          avatar_url
        )
      `,
      )
      .eq("story_id", storyId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("❌ Get story comments error:", error);
      return [];
    }

    console.log(`✅ Found ${data?.length || 0} story comments`);
    return data || [];
  } catch (error) {
    console.error("❌ Get story comments exception:", error);
    return [];
  }
}

export async function getStoryStats(storyId: string) {
  console.log("📊 Getting story stats for:", storyId);

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

    const stats = {
      views: viewsCount || 0,
      comments: commentsCount || 0,
    };

    console.log("✅ Story stats:", stats);
    return stats;
  } catch (error) {
    console.error("❌ Get story stats error:", error);
    return { views: 0, comments: 0 };
  }
}

export async function hasUnviewedStories() {
  const user = await getCurrentUser();
  if (!user) {
    console.log("⚠️ No user, returning false for unviewed stories");
    return false;
  }

  console.log("🔍 Checking for unviewed stories");

  try {
    const followingStories = await getFollowingStories();

    if (followingStories.length === 0) {
      console.log("ℹ️ No following stories");
      return false;
    }

    const storyIds = followingStories.map((story: any) => story.id);

    // Get stories that have been viewed by the user
    const { data: viewedStories } = await supabase
      .from("story_views")
      .select("story_id")
      .eq("user_id", user.id)
      .in("story_id", storyIds);

    const viewedStoryIds =
      viewedStories?.map((view: any) => view.story_id) || [];

    const hasUnviewed = storyIds.some(
      (storyId: string) => !viewedStoryIds.includes(storyId),
    );

    console.log(`✅ Has unviewed stories: ${hasUnviewed}`);
    return hasUnviewed;
  } catch (error) {
    console.error("❌ Check unviewed stories error:", error);
    return false;
  }
}

export async function hasActiveStory() {
  const user = await getCurrentUser();
  if (!user) {
    console.log("⚠️ No user, returning false for active story");
    return false;
  }

  console.log("🔍 Checking if user has active story");

  try {
    const { count, error } = await supabase
      .from("stories")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gt("expires_at", new Date().toISOString());

    if (error) {
      console.error("❌ Check active story error:", error);
      return false;
    }

    const hasActive = (count || 0) > 0;
    console.log(`✅ User has active story: ${hasActive}`);
    return hasActive;
  } catch (error) {
    console.error("❌ Check active story exception:", error);
    return false;
  }
}

// ==================== COMMUNITY FUNCTIONS ====================

export async function joinCommunity(communityId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  console.log("👥 Joining community:", communityId);

  const { data, error } = await supabase
    .from("community_members")
    .insert({
      community_id: communityId,
      user_id: user.id,
      role: "member",
    })
    .select()
    .single();

  if (error) {
    console.error("❌ Join community error:", error);
    throw error;
  }

  await supabase.rpc("increment", {
    table_name: "communities",
    column_name: "member_count",
    id: communityId,
  });

  console.log("✅ Joined community");
  return data;
}

// ==================== ACCOUNT MANAGEMENT ====================

// Helper function to get user data backup - FIXED VERSION
async function getUserDataBackup(userId: string) {
  console.log("💾 Creating user data backup");

  const [
    { data: profile },
    { data: posts },
    { data: comments },
    { data: followers },
    { data: following },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).single(),
    supabase
      .from("posts")
      .select("id, title, content, created_at")
      .eq("user_id", userId),
    supabase
      .from("comments")
      .select("id, content, created_at")
      .eq("user_id", userId),
    supabase
      .from("follows")
      .select("following_id, created_at")
      .eq("follower_id", userId),
    supabase
      .from("follows")
      .select("follower_id, created_at")
      .eq("following_id", userId),
  ]);

  // ✅ FIXED: Use proper type casting to resolve TypeScript errors
  const followersTyped = followers as
    | { following_id: string; created_at: string }[]
    | null;
  const followingTyped = following as
    | { follower_id: string; created_at: string }[]
    | null;

  return {
    profile,
    posts: posts || [],
    comments: comments || [],
    followers: followersTyped || [],
    following: followingTyped || [],
    backup_created: new Date().toISOString(),
  };
}

export async function deactivateAccount() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  console.log("⏸️  Deactivating account");

  // Create a backup of user data before deactivation
  const { error: backupError } = await supabase
    .from("deactivated_accounts")
    .insert({
      user_id: user.id,
      deactivated_at: new Date().toISOString(),
      data_backup: await getUserDataBackup(user.id),
    });

  if (backupError) {
    console.error("Failed to create backup:", backupError);
  }

  // Soft delete: Mark user as deactivated
  const { error: deactivateError } = await supabase
    .from("profiles")
    .update({
      is_deactivated: true,
      deactivated_at: new Date().toISOString(),
      username: `deactivated_${Date.now()}`,
      avatar_url: null,
      bio: null,
      website: null,
      location: null,
      is_online: false,
    })
    .eq("id", user.id);

  if (deactivateError) {
    console.error("❌ Deactivate account error:", deactivateError);
    throw deactivateError;
  }

  // Sign out the user
  await signOut();

  console.log("✅ Account deactivated");
  return true;
}

export async function deleteAccount() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  console.log("🗑️  Deleting account");

  try {
    // Create a backup before hard delete
    const { error: backupError } = await supabase
      .from("deleted_accounts_backup")
      .insert({
        user_id: user.id,
        deleted_at: new Date().toISOString(),
        user_data: await getUserDataBackup(user.id),
      });

    if (backupError) {
      console.error("Backup creation failed:", backupError);
    }

    // Mark as deleted in profiles table
    await supabase
      .from("profiles")
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        username: `deleted_${Date.now()}`,
        avatar_url: null,
        bio: "This account has been deleted",
        full_name: "Deleted User",
      })
      .eq("id", user.id);

    // Delete user's auth session
    await supabase.auth.signOut();

    console.log("✅ Account deleted");
    return true;
  } catch (error) {
    console.error("❌ Account deletion failed:", error);
    throw error;
  }
}

// ==================== LINK GENERATION ====================

export function generatePostLink(postId: string): string {
  return `https://nebulanet.space/post/${postId}`;
}

export function generateUserLink(username: string): string {
  return `https://nebulanet.space/user/${username}`;
}

export function generateCommunityLink(slug: string): string {
  return `https://nebulanet.space/community/${slug}`;
}

export function generateDeepLink(
  type: "post" | "user" | "community",
  id: string,
): string {
  return `nebulanet://${type}/${id}`;
}

export async function incrementShareCount(postId: string) {
  console.log("📈 Incrementing share count for post:", postId);

  const post = await getPostById(postId);
  if (!post) throw new Error("Post not found");

  const { error } = await supabase
    .from("posts")
    .update({ share_count: post.share_count + 1 })
    .eq("id", postId);

  if (error) {
    console.error("❌ Increment share count error:", error);
    throw error;
  }

  console.log("✅ Share count incremented");
}

// ==================== SAVED POSTS ====================

export async function getSavedPosts(limit = 20, offset = 0) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  console.log("🔍 Getting saved posts for user:", user.id);

  try {
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

    if (error) {
      console.error("❌ Get saved posts error:", error);
      throw error;
    }

    // Transform the data to make it easier to use
    const savedPosts = data
      .filter((item: any) => item.posts) // Filter out any null posts
      .map((item: any) => ({
        ...item.posts,
        saved_at: item.created_at,
      }));

    console.log(`✅ Found ${savedPosts.length} saved posts`);
    return savedPosts;
  } catch (error) {
    console.error("❌ Get saved posts exception:", error);
    throw error;
  }
}

export async function getSavesCount(postId: string): Promise<number> {
  console.log("🔍 Getting saves count for post:", postId);

  try {
    const { count, error } = await supabase
      .from("saves")
      .select("*", { count: "exact", head: true })
      .eq("post_id", postId);

    if (error) {
      console.error("❌ Get saves count error:", error);
      return 0;
    }

    console.log(`✅ Post has ${count || 0} saves`);
    return count || 0;
  } catch (error) {
    console.error("❌ Get saves count exception:", error);
    return 0;
  }
}

// ==================== CHAT FUNCTIONS ====================

export async function sendMessage(
  conversationId: string,
  content: string,
  mediaUrl?: string,
  mediaType?: "image" | "video" | "audio" | "file",
) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  console.log("💬 Sending message to conversation:", conversationId);

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

  if (error) {
    console.error("❌ Send message error:", error);
    throw error;
  }

  await supabase
    .from("conversations")
    .update({
      last_message_id: data.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", conversationId);

  console.log("✅ Message sent:", data.id);
  return data;
}

// ==================== EXTRA UTILITY FUNCTIONS ====================

export async function searchPosts(query: string, limit = 20) {
  console.log("🔍 Searching posts with query:", query);

  const { data, error } = await supabase
    .from("posts")
    .select(
      `
      *,
      profiles!posts_user_id_fkey(
        id,
        username,
        full_name,
        avatar_url
      )
    `,
    )
    .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("❌ Search posts error:", error);
    throw error;
  }

  console.log(`✅ Found ${data?.length || 0} posts matching query`);
  return data;
}

export async function getTrendingPosts(limit = 10) {
  console.log("🔥 Getting trending posts");

  const { data, error } = await supabase
    .from("posts")
    .select(
      `
      *,
      profiles!posts_user_id_fkey(
        id,
        username,
        full_name,
        avatar_url
      )
    `,
    )
    .order("like_count", { ascending: false })
    .order("comment_count", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("❌ Get trending posts error:", error);
    throw error;
  }

  console.log(`✅ Found ${data?.length || 0} trending posts`);
  return data;
}

export async function getRelatedPosts(postId: string, limit = 5) {
  console.log("🔗 Getting related posts for:", postId);

  // First get the current post to find similar content
  const currentPost = await getPostById(postId);
  if (!currentPost) return [];

  const { data, error } = await supabase
    .from("posts")
    .select(
      `
      *,
      profiles!posts_user_id_fkey(
        id,
        username,
        full_name,
        avatar_url
      )
    `,
    )
    .neq("id", postId)
    .or(
      `title.ilike.%${currentPost.title}%,content.ilike.%${currentPost.content}%`,
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("❌ Get related posts error:", error);
    return [];
  }

  console.log(`✅ Found ${data?.length || 0} related posts`);
  return data;
}

export async function reportPost(postId: string, reason: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  console.log("🚨 Reporting post:", postId);

  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    post_id: postId,
    reason,
    status: "pending",
    created_at: new Date().toISOString(),
  });

  if (error) {
    console.error("❌ Report post error:", error);
    throw error;
  }

  console.log("✅ Post reported");
  return true;
}

export async function blockUser(userId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  console.log("🚫 Blocking user:", userId);

  const { error } = await supabase.from("blocks").insert({
    blocker_id: user.id,
    blocked_id: userId,
    created_at: new Date().toISOString(),
  });

  if (error) {
    console.error("❌ Block user error:", error);
    throw error;
  }

  console.log("✅ User blocked");
  return true;
}

export async function unblockUser(userId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  console.log("🔓 Unblocking user:", userId);

  const { error } = await supabase
    .from("blocks")
    .delete()
    .eq("blocker_id", user.id)
    .eq("blocked_id", userId);

  if (error) {
    console.error("❌ Unblock user error:", error);
    throw error;
  }

  console.log("✅ User unblocked");
  return true;
}

export async function isUserBlocked(userId: string): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  console.log("🔍 Checking if user is blocked:", userId);

  const { data, error } = await supabase
    .from("blocks")
    .select("*")
    .eq("blocker_id", user.id)
    .eq("blocked_id", userId)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("❌ Check if user blocked error:", error);
    return false;
  }

  const isBlocked = !!data;
  console.log(`✅ User ${isBlocked ? "is" : "is not"} blocked`);
  return isBlocked;
}

export async function getBlockedUsers(limit = 50, offset = 0) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  console.log("🔍 Getting blocked users");

  const { data, error } = await supabase
    .from("blocks")
    .select(
      `
      *,
      blocked:profiles!blocks_blocked_id_fkey(
        id,
        username,
        full_name,
        avatar_url
      )
    `,
    )
    .eq("blocker_id", user.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("❌ Get blocked users error:", error);
    throw error;
  }

  console.log(`✅ Found ${data?.length || 0} blocked users`);
  return data;
}

// ==================== ANALYTICS FUNCTIONS ====================

export async function trackPostView(postId: string) {
  const user = await getCurrentUser();
  if (!user) return;

  console.log("📊 Tracking post view:", postId);

  try {
    // Check if already viewed recently (within last 24 hours)
    const twentyFourHoursAgo = new Date(
      Date.now() - 24 * 60 * 60 * 1000,
    ).toISOString();

    const { data: existingView } = await supabase
      .from("post_views")
      .select("*")
      .eq("post_id", postId)
      .eq("user_id", user.id)
      .gt("viewed_at", twentyFourHoursAgo)
      .single();

    if (!existingView) {
      // Record the view
      await supabase.from("post_views").insert({
        post_id: postId,
        user_id: user.id,
        viewed_at: new Date().toISOString(),
      });

      // Increment view count on post
      await supabase.rpc("increment", {
        table_name: "posts",
        column_name: "view_count",
        id: postId,
      });

      console.log("✅ Post view tracked");
    }
  } catch (error) {
    console.error("❌ Track post view error:", error);
    // Don't throw - analytics shouldn't break the app
  }
}

/**
 * ✅ FIXED — `getUserAnalytics()`
 */
export async function getUserAnalytics() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  console.log("📊 Getting user analytics");

  try {
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

    // ✅ FIXED: Null-safe handling with ?? operator
    const analytics = {
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

    console.log("✅ User analytics:", analytics);
    return analytics;
  } catch (error) {
    console.error("❌ Get user analytics error:", error);
    throw error;
  }
}

// ==================== EXPORT ALL ====================

// Export all functions as an object
export default {
  // Client
  supabase,

  // Auth
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

  // Profile
  updateProfile,
  getProfile,
  getProfileByUsername,
  getCurrentUserProfile,

  // Posts
  createPost,
  getFeedPosts,
  getPostById,
  likePost,
  checkIfLiked,
  getUserPosts,
  getPostComments,
  searchPosts,
  getTrendingPosts,
  getRelatedPosts,
  reportPost,
  trackPostView,

  // Saves
  checkIfSaved,
  savePost,
  getSavedPosts,
  getSavesCount,

  // Comments
  createComment,

  // Follow
  followUser,

  // Stories
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

  // Notifications
  createNotification,
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  deleteAllNotifications,
  getUnreadNotificationsCount,
  getNotificationStats,

  // Notification Triggers
  createLikeNotification,
  createCommentNotification,
  createFollowNotification,
  createStoryCommentNotification,
  createMessageNotification,
  createMentionNotification,

  // Communities
  joinCommunity,

  // Account Management
  deactivateAccount,
  deleteAccount,

  // Links
  generatePostLink,
  generateUserLink,
  generateCommunityLink,
  generateDeepLink,
  incrementShareCount,

  // Chat
  sendMessage,

  // Blocks
  blockUser,
  unblockUser,
  isUserBlocked,
  getBlockedUsers,

  // Analytics
  getUserAnalytics,

  // Utility
  testConnection,
  initializeSupabase,
  from,
  withErrorHandling,
  getAuthRedirectUrl,

  // Subscriptions
  subscribeToNotifications,
  subscribeToPosts,
};
