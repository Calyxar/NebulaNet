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
    null
  );
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
    [user?.id]
  );

  // Send a message
  const sendMessage = useCallback(
    async (
      content: string,
      conversationId: string,
      mediaUrl?: string,
      mediaType?: "image" | "video" | "audio" | "file"
    ) => {
      if (!user?.id || !content.trim()) return null;

      setLoading((prev) => ({ ...prev, sending: true }));

      try {
        const result = await chatQueries.sendMessage(
          conversationId,
          user.id,
          content,
          mediaUrl,
          mediaType
        );

        if (result.error) throw result.error;

        // Add message to local state
        if (result.data) {
          setMessages((prev) => [result.data!, ...prev]);

          // Update conversation in list
          setConversations((prev) =>
            prev.map((conv) =>
              conv.id === conversationId
                ? { ...conv, updated_at: new Date().toISOString() }
                : conv
            )
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
    [user?.id]
  );

  // Create a new conversation
  const createConversation = useCallback(
    async (participantIds: string[], name?: string, isGroup = false) => {
      if (participantIds.length === 0) return null;

      try {
        const result = await chatQueries.createConversation(
          participantIds,
          name,
          isGroup
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
    [loadConversations]
  );

  // Set active conversation
  const selectConversation = useCallback(
    (conversationId: string | null) => {
      setActiveConversation(conversationId);
      if (conversationId) {
        loadMessages(conversationId);
      } else {
        setMessages([]);
      }
    },
    [loadMessages]
  );

  // Get conversation by ID
  const getConversation = useCallback(
    (id: string) => {
      return conversations.find((c) => c.id === id);
    },
    [conversations]
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
      }
    );

    return () => {
      unsubscribe();
    };
  }, [user?.id, loadConversations]);

  useEffect(() => {
    if (!activeConversation || !user?.id) return;

    // Subscribe to new messages in active conversation
    const unsubscribe = chatSubscriptions.subscribeToMessages(
      activeConversation,
      (payload: any) => {
        const newMessage = payload.new;

        // Don't add if it's our own message (already added when sending)
        if (newMessage.sender_id === user.id) return;

        setMessages((prev) => [newMessage, ...prev]);

        // Update conversation timestamp
        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === activeConversation
              ? { ...conv, updated_at: newMessage.created_at }
              : conv
          )
        );
      }
    );

    return () => {
      unsubscribe();
    };
  }, [activeConversation, user?.id]);

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
    loading,

    // Actions
    loadConversations,
    loadMessages,
    sendMessage,
    createConversation,
    selectConversation,

    // Helpers
    getConversation,
  };
};
