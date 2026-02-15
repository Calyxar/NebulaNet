// hooks/useChat.ts
import { SupabaseAttachment } from "@/components/chat/ChatInput";
import { useAuth } from "@/hooks/useAuth";
import {
  ChatConversation,
  ChatMessage,
  chatQueries,
  chatSubscriptions,
} from "@/lib/queries/chat";
import { useCallback, useEffect, useRef, useState } from "react";
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

  // ✅ keep latest activeConversation for safe subscription callbacks
  const activeConversationRef = useRef<string | null>(null);
  useEffect(() => {
    activeConversationRef.current = activeConversation;
  }, [activeConversation]);

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

        if (result.data) {
          // prevent duplicates if subscription also fires
          setMessages((prev) => {
            const exists = prev.some((m) => m.id === result.data!.id);
            return exists ? prev : [result.data!, ...prev];
          });

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

        if (result.data) await loadConversations();
        return result.data;
      } catch (error) {
        console.error("Error creating conversation:", error);
        Alert.alert("Error", "Failed to create conversation");
        return null;
      }
    },
    [loadConversations],
  );

  // Get conversation by ID
  const getConversation = useCallback(
    (id: string) => conversations.find((c) => c.id === id),
    [conversations],
  );

  // Set active conversation
  const selectConversation = useCallback(
    (conversationId: string | null) => {
      setActiveConversation(conversationId);

      if (conversationId) {
        // ✅ If conversation list isn't loaded, load it (supports direct /chat/[id])
        if (!conversations.length) {
          loadConversations();
        }
        loadMessages(conversationId);
      } else {
        setMessages([]);
        setTypingUsers(new Set());
      }
    },
    [conversations.length, loadConversations, loadMessages],
  );

  // Subscribe to conversation updates
  useEffect(() => {
    if (!user?.id) return;

    const unsubscribe = chatSubscriptions.subscribeToUserConversations(
      user.id,
      async () => {
        await loadConversations();
      },
    );

    return () => unsubscribe();
  }, [user?.id, loadConversations]);

  // Subscribe to user's conversation participants
  useEffect(() => {
    if (!user?.id) return;

    const unsubscribe = chatSubscriptions.subscribeToUserParticipants(
      user.id,
      () => {
        loadConversations();
      },
    );

    return () => unsubscribe();
  }, [user?.id, loadConversations]);

  // Subscribe to messages + typing for active conversation
  useEffect(() => {
    if (!activeConversation || !user?.id) return;

    const unsubscribeMessages = chatSubscriptions.subscribeToMessages(
      activeConversation,
      user.id,
      async (payload: any) => {
        const newMessage = payload.new;

        // safety: ignore messages for stale conversation
        if (activeConversationRef.current !== activeConversation) return;

        // ignore own message
        if (newMessage.sender_id === user.id) return;

        setMessages((prev) => {
          const exists = prev.some((msg) => msg.id === newMessage.id);
          return exists ? prev : [newMessage, ...prev];
        });

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

        await chatQueries.markAsRead(activeConversation, user.id);
      },
    );

    const unsubscribeTyping = chatSubscriptions.subscribeToTypingStatus(
      activeConversation,
      (payload: any) => {
        if (payload.new.is_typing) {
          const conversation = getConversation(activeConversation);
          const typingParticipant = conversation?.participants?.find(
            (p: { user_id: string }) => p.user_id !== user.id,
          );
          if (typingParticipant) {
            setTypingUsers((prev) =>
              new Set(prev).add(typingParticipant.user_id)
            );
          }
        } else {
          setTypingUsers((prev) => {
            const next = new Set(prev);
            next.clear();
            return next;
          });
        }
      },
    );

    return () => {
      unsubscribeMessages();
      unsubscribeTyping();
    };
  }, [activeConversation, user?.id, getConversation]);

  // Initial load
  useEffect(() => {
    if (user?.id) loadConversations();
  }, [user?.id, loadConversations]);

  return {
    conversations,
    messages,
    activeConversation,
    typingUsers,
    loading,

    loadConversations,
    loadMessages,
    sendMessage,
    updateTypingStatus,
    createConversation,
    selectConversation,

    getConversation,
  };
};
