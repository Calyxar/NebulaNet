// hooks/useChat.ts ✅
import type { ChatAttachment } from "@/components/chat/ChatInput";
import { useAuth } from "@/hooks/useAuth";
import {
  type ChatConversation,
  type ChatMessage,
  chatQueries,
  chatSubscriptions,
} from "@/lib/firestore/chat";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "react-native";

function toIsoMaybe(v: any): string | undefined {
  if (!v) return undefined;
  if (typeof v === "object" && typeof v.toDate === "function") {
    try {
      return v.toDate().toISOString();
    } catch {
      return undefined;
    }
  }
  try {
    return new Date(v).toISOString();
  } catch {
    return undefined;
  }
}

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

  const activeConversationRef = useRef<string | null>(null);
  const conversationsRef = useRef<ChatConversation[]>([]);

  useEffect(() => {
    activeConversationRef.current = activeConversation;
  }, [activeConversation]);
  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  const patchConversation = useCallback(
    (id: string, patch: Partial<ChatConversation>) => {
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.id === id);
        if (idx === -1) return prev;
        const next = [...prev];
        next[idx] = { ...next[idx], ...patch };
        next.sort(
          (a, b) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
        );
        return next;
      });
    },
    [],
  );

  const getConversation = useCallback(
    (id: string) => conversationsRef.current.find((c) => c.id === id),
    [],
  );

  const loadConversations = useCallback(async () => {
    if (!user?.uid) return;
    setLoading((prev) => ({ ...prev, conversations: true }));
    try {
      const result = await chatQueries.getConversations(user.uid);
      if (result.error) throw result.error;
      setConversations(result.data ?? []);
    } catch (error) {
      console.error("Error loading conversations:", error);
      Alert.alert("Error", "Failed to load conversations");
    } finally {
      setLoading((prev) => ({ ...prev, conversations: false }));
    }
  }, [user?.uid]);

  const loadMessages = useCallback(
    async (conversationId: string) => {
      if (!conversationId) return;
      setLoading((prev) => ({ ...prev, messages: true }));
      try {
        const result = await chatQueries.getMessages(conversationId);
        if (result.error) throw result.error;
        setMessages(result.data ?? []);
        if (user?.uid) {
          await chatQueries.markAsRead(conversationId, user.uid);
          patchConversation(conversationId, { unread_count: 0 });
        }
      } catch (error) {
        console.error("Error loading messages:", error);
        Alert.alert("Error", "Failed to load messages");
      } finally {
        setLoading((prev) => ({ ...prev, messages: false }));
      }
    },
    [user?.uid, patchConversation],
  );

  const sendMessage = useCallback(
    async (
      content: string,
      conversationId: string,
      attachments?: ChatAttachment[],
      mediaUrl?: string,
      mediaType?: "image" | "video" | "audio" | "file",
    ) => {
      if (!user?.uid) return null;
      const hasText = !!content?.trim();
      const hasAtts = !!attachments?.length;
      const hasLegacyMedia = !!mediaUrl && !!mediaType;
      if (!hasText && !hasAtts && !hasLegacyMedia) return null;

      setLoading((prev) => ({ ...prev, sending: true }));
      try {
        const result = await chatQueries.sendMessage(
          conversationId,
          user.uid,
          content,
          attachments as any,
          mediaUrl,
          mediaType,
        );
        if (result.error) throw result.error;
        if (result.data) {
          setMessages((prev) => {
            const exists = prev.some((m) => m.id === result.data!.id);
            return exists ? prev : [result.data!, ...prev];
          });
          patchConversation(conversationId, {
            updated_at: result.data.created_at,
            last_message: result.data,
            last_message_id: result.data.id,
          });
        }
        return result.data ?? null;
      } catch (error) {
        console.error("Error sending message:", error);
        Alert.alert("Error", "Failed to send message");
        return null;
      } finally {
        setLoading((prev) => ({ ...prev, sending: false }));
      }
    },
    [user?.uid, patchConversation],
  );

  const deleteMessage = useCallback(
    async (conversationId: string, messageId: string) => {
      if (!user?.uid) return;
      try {
        const { error } = await chatQueries.deleteMessage(
          conversationId,
          messageId,
          user.uid,
        );
        if (error) throw error;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? {
                  ...m,
                  content: null,
                  media_url: null,
                  media_type: null,
                  attachments: [],
                  is_deleted: true,
                }
              : m,
          ),
        );
      } catch (error: any) {
        Alert.alert("Error", error?.message ?? "Failed to delete message");
      }
    },
    [user?.uid],
  );

  const updateTypingStatus = useCallback(
    async (conversationId: string, isTyping: boolean) => {
      if (!conversationId || !user?.uid) return;
      try {
        await chatQueries.updateTypingStatus(conversationId, isTyping);
      } catch (error) {
        console.error("Error updating typing status:", error);
      }
    },
    [user?.uid],
  );

  const createConversation = useCallback(
    async (participantIds: string[], name?: string, isGroup = false) => {
      if (!participantIds.length) return null;
      try {
        const result = await chatQueries.createConversation(
          participantIds,
          name,
          isGroup,
        );
        if (result.error) throw result.error;
        if (result.data) {
          await loadConversations();
          return result.data;
        }
        return null;
      } catch (error) {
        console.error("Error creating conversation:", error);
        Alert.alert("Error", "Failed to create conversation");
        return null;
      }
    },
    [loadConversations],
  );

  const selectConversation = useCallback(
    (conversationId: string | null) => {
      setActiveConversation(conversationId);
      if (conversationId) {
        // ✅ Always load conversations when selecting — fixes blank header when
        // navigating directly via deep link or notification tap without visiting
        // the chat list first. The load is fast if data is already cached.
        loadConversations();
        loadMessages(conversationId);
      } else {
        setMessages([]);
        setTypingUsers(new Set());
      }
    },
    [loadConversations, loadMessages],
  );

  // Real-time: conversation list
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = chatSubscriptions.subscribeToUserConversations(
      user.uid,
      async (payload) => {
        const docs: any[] = payload?.docs ?? [];
        for (const changed of docs) {
          const known = conversationsRef.current.some(
            (c) => c.id === changed.id,
          );
          if (!known) {
            await loadConversations();
            return;
          }
          const updatedAt =
            toIsoMaybe(changed.updated_at_ts) ??
            toIsoMaybe(changed.updated_at) ??
            undefined;
          const lm = changed.last_message as any | null;
          patchConversation(changed.id, {
            ...(updatedAt ? { updated_at: updatedAt } : {}),
            is_typing: !!changed.is_typing,
            last_message_id: lm?.id ?? null,
          });
        }
      },
    );
    return unsub;
  }, [user?.uid, loadConversations, patchConversation]);

  // Real-time: messages + typing for active conversation
  useEffect(() => {
    if (!activeConversation || !user?.uid) return;

    const unsubMessages = chatSubscriptions.subscribeToMessages(
      activeConversation,
      user.uid,
      async (payload) => {
        const newMessage = payload?.new as ChatMessage | undefined;
        if (!newMessage) return;
        if (activeConversationRef.current !== activeConversation) return;

        if (payload.type === "modified") {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === newMessage.id ? { ...m, ...newMessage } : m,
            ),
          );
          return;
        }

        setMessages((prev) => {
          const exists = prev.some((m) => m.id === newMessage.id);
          return exists ? prev : [newMessage, ...prev];
        });

        patchConversation(activeConversation, {
          updated_at: newMessage.created_at,
          last_message: newMessage,
          last_message_id: newMessage.id,
        });

        if (user.uid) {
          await chatQueries.markAsRead(activeConversation, user.uid);
          patchConversation(activeConversation, { unread_count: 0 });
        }
      },
    );

    const unsubTyping = chatSubscriptions.subscribeToTypingStatus(
      activeConversation,
      (payload) => {
        const typingMap = payload?.new?.typing as
          | Record<string, boolean>
          | undefined;
        if (typingMap && user?.uid) {
          const next = new Set<string>();
          for (const [uid, val] of Object.entries(typingMap)) {
            if (uid !== user.uid && val) next.add(uid);
          }
          setTypingUsers(next);
        } else {
          setTypingUsers(new Set());
        }
      },
    );

    return () => {
      unsubMessages?.();
      unsubTyping?.();
    };
  }, [activeConversation, user?.uid, patchConversation]);

  // Initial load
  useEffect(() => {
    if (user?.uid) loadConversations();
  }, [user?.uid, loadConversations]);

  return {
    conversations,
    messages,
    activeConversation,
    typingUsers,
    loading,
    loadConversations,
    loadMessages,
    sendMessage,
    deleteMessage,
    updateTypingStatus,
    createConversation,
    selectConversation,
    getConversation,
  };
};
