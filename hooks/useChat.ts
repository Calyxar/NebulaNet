// hooks/useChat.ts - FIXED VERSION
import { SupabaseAttachment } from "@/components/chat/ChatInput";
import { useAuth } from "@/hooks/useAuth";
import {
  ChatConversation,
  ChatMessage,
  chatQueries,
  chatSubscriptions,
} from "@/lib/queries/chat";
import { useCallback, useEffect, useState } from "react";
import { Alert } from "react-native";

export const useChat = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(
    null,
  );
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState({
    conversations: false,
    messages: false,
    sending: false,
  });

  // Load conversations
  const loadConversations = useCallback(async () => {
    if (!user?.id) return;

    setLoading((prev) => ({ ...prev, conversations: true }));

    try {
      const result = await chatQueries.getConversations(user.id);

      if (result.error) throw result.error;
      setConversations(result.data || []);
    } catch (error) {
      console.error("Error loading conversations:", error);
      Alert.alert("Error", "Failed to load conversations");
    } finally {
      setLoading((prev) => ({ ...prev, conversations: false }));
    }
  }, [user?.id]);

  // Load messages for a conversation
  const loadMessages = useCallback(
    async (conversationId: string) => {
      if (!conversationId) return;

      setLoading((prev) => ({ ...prev, messages: true }));

      try {
        const result = await chatQueries.getMessages(conversationId);

        if (result.error) throw result.error;
        setMessages(result.data || []);

        // Mark messages as read
        if (user?.id) {
          await chatQueries.markAsRead(conversationId, user.id);
        }
      } catch (error) {
        console.error("Error loading messages:", error);
        Alert.alert("Error", "Failed to load messages");
      } finally {
        setLoading((prev) => ({ ...prev, messages: false }));
      }
    },
    [user?.id],
  );

  // Send a message with attachments
  const sendMessage = useCallback(
    async (
      content: string,
      conversationId: string,
      attachments?: SupabaseAttachment[],
      mediaUrl?: string,
      mediaType?: "image" | "video" | "audio" | "file",
    ) => {
      if (!user?.id || (!content.trim() && !attachments?.length)) return null;

      setLoading((prev) => ({ ...prev, sending: true }));

      try {
        const result = await chatQueries.sendMessage(
          conversationId,
          user.id,
          content,
          attachments,
          mediaUrl,
          mediaType,
        );

        if (result.error) throw result.error;

        // Add message to local state
        if (result.data) {
          setMessages((prev) => [result.data!, ...prev]);

          // Update conversation in list
          setConversations((prev) =>
            prev.map((conv) =>
              conv.id === conversationId
                ? {
                    ...conv,
                    updated_at: new Date().toISOString(),
                    last_message: result.data,
                  }
                : conv,
            ),
          );
        }

        return result.data;
      } catch (error) {
        console.error("Error sending message:", error);
        Alert.alert("Error", "Failed to send message");
        return null;
      } finally {
        setLoading((prev) => ({ ...prev, sending: false }));
      }
    },
    [user?.id],
  );

  // Update typing status
  const updateTypingStatus = useCallback(
    async (conversationId: string, isTyping: boolean) => {
      if (!conversationId || !user?.id) return;

      try {
        await chatQueries.updateTypingStatus(conversationId, isTyping);
      } catch (error) {
        console.error("Error updating typing status:", error);
      }
    },
    [user?.id],
  );

  // Create a new conversation
  const createConversation = useCallback(
    async (participantIds: string[], name?: string, isGroup = false) => {
      if (participantIds.length === 0) return null;

      try {
        const result = await chatQueries.createConversation(
          participantIds,
          name,
          isGroup,
        );

        if (result.error) throw result.error;

        if (result.data) {
          // Reload conversations
          await loadConversations();
        }

        return result.data;
      } catch (error) {
        console.error("Error creating conversation:", error);
        Alert.alert("Error", "Failed to create conversation");
        return null;
      }
    },
    [loadConversations],
  );

  // Set active conversation
  const selectConversation = useCallback(
    (conversationId: string | null) => {
      setActiveConversation(conversationId);
      if (conversationId) {
        loadMessages(conversationId);
      } else {
        setMessages([]);
        setTypingUsers(new Set());
      }
    },
    [loadMessages],
  );

  // Get conversation by ID
  const getConversation = useCallback(
    (id: string) => {
      return conversations.find((c) => c.id === id);
    },
    [conversations],
  );

  // Real-time subscriptions
  useEffect(() => {
    if (!user?.id) return;

    // Subscribe to conversation updates
    const unsubscribe = chatSubscriptions.subscribeToUserConversations(
      user.id,
      async (payload: any) => {
        // Update conversations list when there are changes
        await loadConversations();
      },
    );

    return () => {
      unsubscribe();
    };
  }, [user?.id, loadConversations]);

  useEffect(() => {
    if (!activeConversation || !user?.id) return;

    // ✅ FIXED: subscribeToMessages now receives 3 parameters
    const unsubscribeMessages = chatSubscriptions.subscribeToMessages(
      activeConversation,
      user.id,
      async (payload: any) => {
        const newMessage = payload.new;

        // Don't add if it's our own message (already added when sending)
        if (newMessage.sender_id === user?.id) return;

        // Add the new message to state
        setMessages((prev) => {
          // Check if message already exists to avoid duplicates
          const exists = prev.some((msg) => msg.id === newMessage.id);
          if (exists) return prev;

          return [newMessage, ...prev];
        });

        // Update conversation timestamp
        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === activeConversation
              ? {
                  ...conv,
                  updated_at: newMessage.created_at,
                  last_message: newMessage,
                }
              : conv,
          ),
        );

        // Mark as read automatically
        if (user?.id) {
          await chatQueries.markAsRead(activeConversation, user.id);
        }
      },
    );

    // Subscribe to typing status
    const unsubscribeTyping = chatSubscriptions.subscribeToTypingStatus(
      activeConversation,
      (payload: any) => {
        if (payload.new.is_typing) {
          // Determine who is typing (not the current user)
          const conversation = getConversation(activeConversation);
          if (conversation) {
            const typingParticipant = conversation.participants?.find(
              (p) => p.user_id !== user.id,
            );
            if (typingParticipant) {
              setTypingUsers((prev) =>
                new Set(prev).add(typingParticipant.user_id),
              );
            }
          }
        } else {
          setTypingUsers((prev) => {
            const newSet = new Set(prev);
            // Remove all users since typing stopped
            newSet.clear();
            return newSet;
          });
        }
      },
    );

    return () => {
      unsubscribeMessages();
      unsubscribeTyping();
    };
  }, [activeConversation, user?.id, getConversation]);

  // Subscribe to user's conversation participants
  useEffect(() => {
    if (!user?.id) return;

    const unsubscribe = chatSubscriptions.subscribeToUserParticipants(
      user.id,
      () => {
        loadConversations();
      },
    );

    return () => {
      unsubscribe();
    };
  }, [user?.id, loadConversations]);

  // Initial load
  useEffect(() => {
    if (user?.id) {
      loadConversations();
    }
  }, [user?.id, loadConversations]);

  return {
    // State
    conversations,
    messages,
    activeConversation,
    typingUsers,
    loading,

    // Actions
    loadConversations,
    loadMessages,
    sendMessage,
    updateTypingStatus,
    createConversation,
    selectConversation,

    // Helpers
    getConversation,
  };
};
