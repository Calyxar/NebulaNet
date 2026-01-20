import { supabase, Tables } from "@/lib/supabase";

export type ChatMessage = Tables["messages"]["Row"] & {
  sender?: Tables["profiles"]["Row"];
};

export type ChatConversation = Tables["conversations"]["Row"] & {
  participants?: {
    user_id: string;
    profiles?: Tables["profiles"]["Row"];
  }[];
  last_message?: ChatMessage;
};

// Chat service functions
export const chatQueries = {
  // Get all conversations for current user
  getConversations: async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("conversations")
        .select(
          `
          *,
          participants:conversation_participants(
            user_id,
            profiles:user_id(*)
          ),
          last_message:messages!last_message_id(*)
        `
        )
        .eq("participants.user_id", userId)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return { data: data as ChatConversation[], error: null };
    } catch (error) {
      console.error("Error fetching conversations:", error);
      return { data: null, error: error as Error };
    }
  },

  // Get messages for a conversation
  getMessages: async (conversationId: string, page = 0, limit = 20) => {
    try {
      const from = page * limit;
      const to = from + limit - 1;

      const { data, error } = await supabase
        .from("messages")
        .select(
          `
          *,
          sender:profiles!messages_sender_id_fkey(*)
        `
        )
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;
      return { data: data as ChatMessage[], error: null };
    } catch (error) {
      console.error("Error fetching messages:", error);
      return { data: null, error: error as Error };
    }
  },

  // Send a message
  sendMessage: async (
    conversationId: string,
    senderId: string,
    content: string,
    mediaUrl?: string,
    mediaType?: "image" | "video" | "audio" | "file"
  ) => {
    try {
      const messageData: any = {
        conversation_id: conversationId,
        sender_id: senderId,
        content,
        delivered_at: new Date().toISOString(),
      };

      if (mediaUrl && mediaType) {
        messageData.media_url = mediaUrl;
        messageData.media_type = mediaType;
      }

      const { data, error } = await supabase
        .from("messages")
        .insert(messageData)
        .select(
          `
          *,
          sender:profiles!messages_sender_id_fkey(*)
        `
        )
        .single();

      if (error) throw error;

      // Update conversation timestamp
      await supabase
        .from("conversations")
        .update({
          updated_at: new Date().toISOString(),
          last_message_id: data.id,
        })
        .eq("id", conversationId);

      return { data: data as ChatMessage, error: null };
    } catch (error) {
      console.error("Error sending message:", error);
      return { data: null, error: error as Error };
    }
  },

  // Create a new conversation
  createConversation: async (
    participantIds: string[],
    name?: string,
    isGroup = false
  ) => {
    try {
      if (participantIds.length === 0) {
        throw new Error("No participants provided");
      }

      // First create the conversation
      const conversationData: any = {
        name: name || null,
        is_group: isGroup,
        avatar_url: null,
        is_online: false,
        is_typing: false,
        is_pinned: false,
        unread_count: 0,
        last_message_id: null,
      };

      const { data: conversation, error: convError } = await supabase
        .from("conversations")
        .insert(conversationData)
        .select()
        .single();

      if (convError) throw convError;

      // Add participants
      const participantsData = participantIds.map((userId) => ({
        conversation_id: conversation.id,
        user_id: userId,
        unread_count: 0,
      }));

      const { error: partError } = await supabase
        .from("conversation_participants")
        .insert(participantsData);

      if (partError) {
        // Cleanup on error
        await supabase.from("conversations").delete().eq("id", conversation.id);

        throw partError;
      }

      return { data: conversation as ChatConversation, error: null };
    } catch (error) {
      console.error("Error creating conversation:", error);
      return { data: null, error: error as Error };
    }
  },

  // Mark messages as read
  markAsRead: async (conversationId: string, userId: string) => {
    try {
      const { error } = await supabase
        .from("messages")
        .update({ read_at: new Date().toISOString() })
        .eq("conversation_id", conversationId)
        .neq("sender_id", userId)
        .is("read_at", null);

      if (error) throw error;

      // Reset unread count for user
      await supabase
        .from("conversation_participants")
        .update({ unread_count: 0 })
        .eq("conversation_id", conversationId)
        .eq("user_id", userId);

      return { error: null };
    } catch (error) {
      console.error("Error marking messages as read:", error);
      return { error: error as Error };
    }
  },

  // Get conversation by ID
  getConversation: async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from("conversations")
        .select(
          `
          *,
          participants:conversation_participants(
            user_id,
            profiles:user_id(*)
          ),
          last_message:messages!last_message_id(*)
        `
        )
        .eq("id", conversationId)
        .single();

      if (error) throw error;
      return { data: data as ChatConversation, error: null };
    } catch (error) {
      console.error("Error fetching conversation:", error);
      return { data: null, error: error as Error };
    }
  },

  // Delete conversation
  deleteConversation: async (conversationId: string) => {
    try {
      const { error } = await supabase
        .from("conversations")
        .delete()
        .eq("id", conversationId);

      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error("Error deleting conversation:", error);
      return { error: error as Error };
    }
  },
};

// Real-time subscriptions
export const chatSubscriptions = {
  // Subscribe to conversation messages
  subscribeToMessages: (
    conversationId: string,
    callback: (payload: any) => void
  ) => {
    const channel = supabase.channel(`messages:${conversationId}`);

    channel
      .on(
        "postgres_changes" as any,
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        callback
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  // Subscribe to conversation updates
  subscribeToConversation: (
    conversationId: string,
    callback: (payload: any) => void
  ) => {
    const channel = supabase.channel(`conversation:${conversationId}`);

    channel
      .on(
        "postgres_changes" as any,
        {
          event: "UPDATE",
          schema: "public",
          table: "conversations",
          filter: `id=eq.${conversationId}`,
        },
        callback
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  // Subscribe to user's conversations
  subscribeToUserConversations: (
    userId: string,
    callback: (payload: any) => void
  ) => {
    const channel = supabase.channel(`user-conversations:${userId}`);

    channel
      .on(
        "postgres_changes" as any,
        {
          event: "*",
          schema: "public",
          table: "conversations",
        },
        async (payload: any) => {
          try {
            // Fetch the conversation with participants to check if user is included
            const { data: conversation, error } = await supabase
              .from("conversations")
              .select(
                `
              *,
              participants:conversation_participants(user_id)
            `
              )
              .eq("id", payload.new.id)
              .single();

            if (error) {
              console.error(
                "Error fetching conversation in subscription:",
                error
              );
              return;
            }

            if (
              conversation?.participants?.some((p: any) => p.user_id === userId)
            ) {
              callback(payload);
            }
          } catch (error) {
            console.error("Error in conversation subscription:", error);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  // Subscribe to user's conversation participants
  subscribeToUserParticipants: (
    userId: string,
    callback: (payload: any) => void
  ) => {
    const channel = supabase.channel(`user-participants:${userId}`);

    channel
      .on(
        "postgres_changes" as any,
        {
          event: "INSERT",
          schema: "public",
          table: "conversation_participants",
          filter: `user_id=eq.${userId}`,
        },
        callback
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  // Subscribe to typing status
  subscribeToTypingStatus: (
    conversationId: string,
    callback: (payload: any) => void
  ) => {
    const channel = supabase.channel(`typing:${conversationId}`);

    channel
      .on(
        "postgres_changes" as any,
        {
          event: "UPDATE",
          schema: "public",
          table: "conversations",
          filter: `id=eq.${conversationId}`,
        },
        (payload) => {
          // Only callback if typing status changed
          if (payload.old.is_typing !== payload.new.is_typing) {
            callback(payload);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  // Subscribe to online status
  subscribeToOnlineStatus: (
    userId: string,
    callback: (payload: any) => void
  ) => {
    const channel = supabase.channel(`online-status:${userId}`);

    channel
      .on(
        "postgres_changes" as any,
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          // Only callback if online status changed
          if (payload.old.is_online !== payload.new.is_online) {
            callback(payload);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};

// Helper functions
export const formatChatTimestamp = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hr ago`;
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
};

export const formatMessageTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const getConversationName = (
  conversation: ChatConversation,
  userId?: string
): string => {
  if (conversation.name) return conversation.name;

  // For direct messages, use the other participant's name
  if (
    !conversation.is_group &&
    conversation.participants?.length === 2 &&
    userId
  ) {
    const otherParticipant = conversation.participants.find(
      (p) => p.user_id !== userId
    );
    return (
      otherParticipant?.profiles?.full_name ||
      otherParticipant?.profiles?.username ||
      "Unknown User"
    );
  }

  // For group chats without a name, show participant count
  if (conversation.is_group) {
    return `${conversation.participants?.length || 0} members`;
  }

  return "Chat";
};

export const getConversationAvatar = (
  conversation: ChatConversation,
  userId?: string
): string | null => {
  if (conversation.avatar_url) return conversation.avatar_url;

  // For direct messages, get the other participant's avatar
  if (
    !conversation.is_group &&
    conversation.participants?.length === 2 &&
    userId
  ) {
    const otherParticipant = conversation.participants.find(
      (p) => p.user_id !== userId
    );
    return otherParticipant?.profiles?.avatar_url || null;
  }

  return null;
};

// Message status helpers
export const getMessageStatus = (
  message: ChatMessage
): "sent" | "delivered" | "read" => {
  if (message.read_at) return "read";
  if (message.delivered_at) return "delivered";
  return "sent";
};

// Search conversations
export const searchConversations = async (userId: string, query: string) => {
  try {
    const { data, error } = await supabase
      .from("conversations")
      .select(
        `
        *,
        participants:conversation_participants(
          user_id,
          profiles:user_id(*)
        )
      `
      )
      .eq("participants.user_id", userId)
      .or(`name.ilike.%${query}%`)
      .order("updated_at", { ascending: false });

    if (error) throw error;
    return { data: data as ChatConversation[], error: null };
  } catch (error) {
    console.error("Error searching conversations:", error);
    return { data: null, error: error as Error };
  }
};

// Get conversation by participant IDs (for creating or finding existing DMs)
export const getConversationByParticipants = async (
  participantIds: string[]
) => {
  try {
    // This is a more complex query that finds conversations where exactly these participants exist
    // For simplicity, we'll check each participant
    const { data, error } = await supabase
      .from("conversations")
      .select(
        `
        *,
        participants:conversation_participants(user_id)
      `
      )
      .eq("is_group", false);

    if (error) throw error;

    // Find conversation where participants match exactly
    const matchingConversation = data?.find((conv) => {
      const convParticipantIds =
        conv.participants?.map((p: any) => p.user_id) || [];
      if (convParticipantIds.length !== participantIds.length) return false;

      return convParticipantIds.every((id: string) =>
        participantIds.includes(id)
      );
    });

    return {
      data: matchingConversation as ChatConversation | undefined,
      error: null,
    };
  } catch (error) {
    console.error("Error finding conversation by participants:", error);
    return { data: undefined, error: error as Error };
  }
};
