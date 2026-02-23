// hooks/useChat.ts — FIRESTORE VERSION ✅ (COMPLETED + UPDATED)
// ✅ No Supabase types/imports
// ✅ Accepts Firebase ChatAttachment from ChatInput
// ✅ Safely converts Firestore Timestamp/string -> ISO when patching from subscriptions
// ✅ Realtime: conversation list updates + active conversation new messages
// ✅ markAsRead + optimistic unread reset
// ✅ Keeps the same public API surface area

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

  // Firestore Timestamp
  if (typeof v === "object" && typeof v.toDate === "function") {
    try {
      return v.toDate().toISOString();
    } catch {
      return undefined;
    }
  }

  // already ISO-ish string or Date
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

  // NOTE: you now have useTyping() for UI typing.
  // Keeping typingUsers here for backwards compatibility with any screens.
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

  // ─── Helpers ───────────────────────────────────────────────────────────────

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

  // ─── Loaders ───────────────────────────────────────────────────────────────

  const loadConversations = useCallback(async () => {
    if (!user?.id) return;

    setLoading((prev) => ({ ...prev, conversations: true }));
    try {
      const result = await chatQueries.getConversations(user.id);
      if (result.error) throw result.error;
      setConversations(result.data ?? []);
    } catch (error) {
      console.error("Error loading conversations:", error);
      Alert.alert("Error", "Failed to load conversations");
    } finally {
      setLoading((prev) => ({ ...prev, conversations: false }));
    }
  }, [user?.id]);

  const loadMessages = useCallback(
    async (conversationId: string) => {
      if (!conversationId) return;

      setLoading((prev) => ({ ...prev, messages: true }));
      try {
        const result = await chatQueries.getMessages(conversationId);
        if (result.error) throw result.error;

        setMessages(result.data ?? []);

        if (user?.id) {
          await chatQueries.markAsRead(conversationId, user.id);
          patchConversation(conversationId, { unread_count: 0 });
        }
      } catch (error) {
        console.error("Error loading messages:", error);
        Alert.alert("Error", "Failed to load messages");
      } finally {
        setLoading((prev) => ({ ...prev, messages: false }));
      }
    },
    [user?.id, patchConversation],
  );

  // ─── Actions ───────────────────────────────────────────────────────────────

  const sendMessage = useCallback(
    async (
      content: string,
      conversationId: string,
      attachments?: ChatAttachment[],
      mediaUrl?: string,
      mediaType?: "image" | "video" | "audio" | "file",
    ) => {
      if (!user?.id) return null;

      const hasText = !!content?.trim();
      const hasAtts = !!attachments?.length;
      const hasLegacyMedia = !!mediaUrl && !!mediaType;

      if (!hasText && !hasAtts && !hasLegacyMedia) return null;

      setLoading((prev) => ({ ...prev, sending: true }));
      try {
        const result = await chatQueries.sendMessage(
          conversationId,
          user.id,
          content,
          attachments as any, // chat.ts expects SupabaseAttachment shape; ChatAttachment is compatible (url/type/name + extra fields).
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
    [user?.id, patchConversation],
  );

  // Keeping for compatibility; ChatInput uses useTyping() now.
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
        if (!conversationsRef.current.length) loadConversations();
        loadMessages(conversationId);
      } else {
        setMessages([]);
        setTypingUsers(new Set());
      }
    },
    [loadConversations, loadMessages],
  );

  // ─── Subscriptions ─────────────────────────────────────────────────────────

  // Conversation list realtime: patch known; reload if new
  useEffect(() => {
    if (!user?.id) return;

    const unsub = chatSubscriptions.subscribeToUserConversations(
      user.id,
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

          // Convert timestamps safely
          const updatedAt =
            toIsoMaybe(changed.updated_at_ts) ??
            toIsoMaybe(changed.updated_at) ??
            undefined;

          // last_message is denormalized on conversation doc
          const lm = changed.last_message as any | null;

          patchConversation(changed.id, {
            ...(updatedAt ? { updated_at: updatedAt } : {}),
            is_typing: !!changed.is_typing,
            last_message_id: lm?.id ?? null,
            // We do NOT rebuild last_message here (shape mismatches are common);
            // it will be correct when you open the conversation or when send/receive fires.
          });
        }
      },
    );

    return unsub;
  }, [user?.id, loadConversations, patchConversation]);

  // Active conversation: new messages realtime
  useEffect(() => {
    if (!activeConversation || !user?.id) return;

    const unsubMessages = chatSubscriptions.subscribeToMessages(
      activeConversation,
      user.id,
      async (payload) => {
        const newMessage = payload?.new as ChatMessage | undefined;
        if (!newMessage) return;

        // ignore if user navigated away
        if (activeConversationRef.current !== activeConversation) return;

        setMessages((prev) => {
          const exists = prev.some((m) => m.id === newMessage.id);
          return exists ? prev : [newMessage, ...prev];
        });

        patchConversation(activeConversation, {
          updated_at: newMessage.created_at,
          last_message: newMessage,
          last_message_id: newMessage.id,
        });

        // If we are viewing this thread, mark as read immediately
        if (user.id) {
          await chatQueries.markAsRead(activeConversation, user.id);
          patchConversation(activeConversation, { unread_count: 0 });
        }
      },
    );

    // OPTIONAL: typing here (you already have useTyping() per screen)
    const unsubTyping = chatSubscriptions.subscribeToTypingStatus(
      activeConversation,
      (payload) => {
        const d = payload?.new;
        const typingMap = (d?.typing ?? undefined) as
          | Record<string, boolean>
          | undefined;

        if (typingMap && user?.id) {
          const next = new Set<string>();
          for (const [uid, val] of Object.entries(typingMap)) {
            if (uid !== user.id && val) next.add(uid);
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
  }, [activeConversation, user?.id, patchConversation]);

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
    updateTypingStatus, // kept for compatibility
    createConversation,

    selectConversation,
    getConversation,
  };
};
