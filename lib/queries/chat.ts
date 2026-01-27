// lib/queries/chat.ts - UPDATED VERSION WITH ALL SUBSCRIPTIONS
import { SupabaseAttachment } from "@/components/chat/ChatInput";
import { supabase, Tables } from "@/lib/supabase";

export type ChatMessage = Tables["messages"]["Row"] & {
  sender?: Tables["profiles"]["Row"];
  // ✅ Already added: attachments property
  attachments?: SupabaseAttachment[];
};

export type ChatConversation = Tables["conversations"]["Row"] & {
  participants?: {
    user_id: string;
    profiles?: Tables["profiles"]["Row"];
  }[];
  last_message?: ChatMessage;
};

// ✅ UPDATED: Complete chatSubscriptions with all required functions
export const chatSubscriptions = {
  subscribeToMessages: (
    conversationId: string,
    userId: string,
    callback: (payload: any) => void,
  ) => {
    const channel = supabase.channel(`messages-${conversationId}`);

    channel.on(
      "postgres_changes" as any,
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        // Only call callback for messages not from current user
        if (payload.new.sender_id !== userId) {
          callback(payload);
        }
      },
    );

    channel.subscribe();

    return () => {
      console.log("📡 Unsubscribing from messages");
      supabase.removeChannel(channel);
    };
  },

  // ✅ ADDED: subscribeToUserConversations (called in useChat)
  subscribeToUserConversations: (
    userId: string,
    callback: (payload: any) => void,
  ) => {
    const channel = supabase.channel(`user-conversations-${userId}`);

    channel.on(
      "postgres_changes" as any,
      {
        event: "*",
        schema: "public",
        table: "conversations",
      },
      callback,
    );

    channel.subscribe();

    return () => {
      console.log("📡 Unsubscribing from user conversations");
      supabase.removeChannel(channel);
    };
  },

  // ✅ ADDED: subscribeToConversations (general)
  subscribeToConversations: (callback: (payload: any) => void) => {
    const channel = supabase.channel("conversations-global");

    channel.on(
      "postgres_changes" as any,
      {
        event: "*",
        schema: "public",
        table: "conversations",
      },
      callback,
    );

    channel.subscribe();

    return () => {
      console.log("📡 Unsubscribing from conversations");
      supabase.removeChannel(channel);
    };
  },

  subscribeToTypingStatus: (
    conversationId: string,
    callback: (payload: any) => void,
  ) => {
    const channel = supabase.channel(`typing-${conversationId}`);

    channel.on(
      "postgres_changes" as any,
      {
        event: "UPDATE",
        schema: "public",
        table: "conversations",
        filter: `id=eq.${conversationId}`,
      },
      (payload) => {
        if (payload.new.is_typing !== payload.old?.is_typing) {
          callback(payload);
        }
      },
    );

    channel.subscribe();

    return () => {
      console.log("📡 Unsubscribing from typing status");
      supabase.removeChannel(channel);
    };
  },

  // ✅ ADDED: subscribeToUserParticipants (called in useChat)
  subscribeToUserParticipants: (
    userId: string,
    callback: (payload: any) => void,
  ) => {
    const channel = supabase.channel(`user-participants-${userId}`);

    channel.on(
      "postgres_changes" as any,
      {
        event: "*",
        schema: "public",
        table: "conversation_participants",
        filter: `user_id=eq.${userId}`,
      },
      callback,
    );

    channel.subscribe();

    return () => {
      console.log("📡 Unsubscribing from user participants");
      supabase.removeChannel(channel);
    };
  },
};

// ✅ UPDATED: Fix the sendMessage function to handle attachments properly
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
        `,
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
        `,
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

  // ✅ FIXED: sendMessage function to properly handle attachments
  sendMessage: async (
    conversationId: string,
    senderId: string,
    content: string,
    attachments?: SupabaseAttachment[],
    mediaUrl?: string,
    mediaType?: "image" | "video" | "audio" | "file",
  ) => {
    try {
      const messageData: any = {
        conversation_id: conversationId,
        sender_id: senderId,
        content: content.trim() || null,
        delivered_at: new Date().toISOString(),
        read_at: null, // Initially null, will be updated when read
      };

      // Handle attachments
      if (attachments && attachments.length > 0) {
        messageData.attachments = attachments;
        // Use first attachment for legacy media_url/type support
        const firstAttachment = attachments[0];
        messageData.media_url = firstAttachment.url;
        messageData.media_type = firstAttachment.type;
      } else if (mediaUrl && mediaType) {
        // Legacy support for single media
        messageData.media_url = mediaUrl;
        messageData.media_type = mediaType;
        messageData.attachments = [
          {
            id: `media-${Date.now()}`,
            url: mediaUrl,
            type: mediaType,
            name: mediaUrl.split("/").pop(),
          },
        ];
      }

      const { data, error } = await supabase
        .from("messages")
        .insert(messageData)
        .select(
          `
          *,
          sender:profiles!messages_sender_id_fkey(*)
        `,
        )
        .single();

      if (error) throw error;

      // Update conversation timestamp and last message
      await supabase
        .from("conversations")
        .update({
          updated_at: new Date().toISOString(),
          last_message_id: data.id,
        })
        .eq("id", conversationId);

      // Increment unread count for other participants
      const { data: participants } = await supabase
        .from("conversation_participants")
        .select("user_id")
        .eq("conversation_id", conversationId)
        .neq("user_id", senderId);

      if (participants && participants.length > 0) {
        for (const participant of participants) {
          await supabase
            .from("conversation_participants")
            .update({
              unread_count: supabase.rpc("increment", {
                table_name: "conversation_participants",
                column_name: "unread_count",
                id: participant.user_id,
              }),
            })
            .eq("conversation_id", conversationId)
            .eq("user_id", participant.user_id);
        }
      }

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
    isGroup = false,
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
        joined_at: new Date().toISOString(),
      }));

      const { error: partError } = await supabase
        .from("conversation_participants")
        .insert(participantsData);

      if (partError) {
        // Cleanup on error
        await supabase.from("conversations").delete().eq("id", conversation.id);
        throw partError;
      }

      // Get full conversation data with participants
      const { data: fullConversation, error: fetchError } = await supabase
        .from("conversations")
        .select(
          `
          *,
          participants:conversation_participants(
            user_id,
            profiles:user_id(*)
          )
        `,
        )
        .eq("id", conversation.id)
        .single();

      if (fetchError) throw fetchError;

      return { data: fullConversation as ChatConversation, error: null };
    } catch (error) {
      console.error("Error creating conversation:", error);
      return { data: null, error: error as Error };
    }
  },

  // Mark messages as read
  markAsRead: async (conversationId: string, userId: string) => {
    try {
      // Mark messages as read
      const { error: messagesError } = await supabase
        .from("messages")
        .update({ read_at: new Date().toISOString() })
        .eq("conversation_id", conversationId)
        .neq("sender_id", userId)
        .is("read_at", null);

      if (messagesError) throw messagesError;

      // Reset unread count for user
      const { error: unreadError } = await supabase
        .from("conversation_participants")
        .update({ unread_count: 0 })
        .eq("conversation_id", conversationId)
        .eq("user_id", userId);

      if (unreadError) throw unreadError;

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
        `,
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
      // Delete messages first
      const { error: messagesError } = await supabase
        .from("messages")
        .delete()
        .eq("conversation_id", conversationId);

      if (messagesError) throw messagesError;

      // Delete participants
      const { error: participantsError } = await supabase
        .from("conversation_participants")
        .delete()
        .eq("conversation_id", conversationId);

      if (participantsError) throw participantsError;

      // Finally delete conversation
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

  // Update typing status
  updateTypingStatus: async (conversationId: string, isTyping: boolean) => {
    try {
      const { error } = await supabase
        .from("conversations")
        .update({ is_typing: isTyping })
        .eq("id", conversationId);

      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error("Error updating typing status:", error);
      return { error: error as Error };
    }
  },
};

// ✅ Export individual functions for backward compatibility
export const getConversations = chatQueries.getConversations;
export const getMessages = chatQueries.getMessages;
export const sendMessage = chatQueries.sendMessage;
export const createConversation = chatQueries.createConversation;
export const markAsRead = chatQueries.markAsRead;
export const getConversation = chatQueries.getConversation;
export const deleteConversation = chatQueries.deleteConversation;
export const updateTypingStatus = chatQueries.updateTypingStatus;
