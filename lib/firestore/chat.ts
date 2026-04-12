// lib/firestore/chat.ts — React Native Firebase ✅

import { ChatAttachment } from "@/components/chat/ChatInput";
import firestore from "@react-native-firebase/firestore";

/* -------------------- TYPES -------------------- */

type ProfileRow = {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  media_url: string | null;
  media_type: string | null;
  attachments?: ChatAttachment[];
  created_at: string;
  delivered_at: string | null;
  read_at: string | null;
};

type ConversationRow = {
  id: string;
  name: string | null;
  created_at: string;
  updated_at: string;
  last_message_id: string | null;
  is_typing: boolean | null;
  is_group?: boolean | null;
  avatar_url?: string | null;
  unread_count?: number | null;
  is_online?: boolean | null;
  is_pinned?: boolean | null;
};

export type ChatMessage = MessageRow & {
  sender?: ProfileRow;
  attachments?: ChatAttachment[];
};

export type ChatConversation = ConversationRow & {
  participants?: {
    user_id: string;
    profiles?: ProfileRow;
  }[];
  last_message?: ChatMessage;
};

/* -------------------- HELPERS -------------------- */

function tsToIso(ts: any): string {
  if (!ts) return new Date().toISOString();
  if (ts?.toDate) return ts.toDate().toISOString();
  const d = new Date(ts);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

async function getProfile(userId: string): Promise<ProfileRow | undefined> {
  const snap = await firestore().collection("profiles").doc(userId).get();
  if (!snap.exists) return undefined;
  const d = snap.data() as any;
  return {
    id: snap.id,
    username: d.username ?? "",
    full_name: d.full_name ?? null,
    avatar_url: d.avatar_url ?? null,
    bio: d.bio ?? null,
  };
}

function docToMessage(d: any, id: string): MessageRow {
  return {
    id,
    conversation_id: d.conversation_id,
    sender_id: d.sender_id,
    content: d.content ?? null,
    media_url: d.media_url ?? null,
    media_type: d.media_type ?? null,
    attachments: d.attachments ?? [],
    created_at: tsToIso(d.created_at),
    delivered_at: d.delivered_at ? tsToIso(d.delivered_at) : null,
    read_at: d.read_at ? tsToIso(d.read_at) : null,
  };
}

function docToConversation(d: any, id: string): ConversationRow {
  return {
    id,
    name: d.name ?? null,
    created_at: tsToIso(d.created_at),
    updated_at: tsToIso(d.updated_at),
    last_message_id: d.last_message_id ?? null,
    is_typing: d.is_typing ?? false,
    is_group: d.is_group ?? false,
    avatar_url: d.avatar_url ?? null,
    unread_count: d.unread_count ?? 0,
    is_online: d.is_online ?? false,
    is_pinned: d.is_pinned ?? false,
  };
}

/* -------------------- SUBSCRIPTIONS -------------------- */

export const chatSubscriptions = {
  subscribeToMessages: (
    conversationId: string,
    userId: string,
    callback: (payload: any) => void,
  ) => {
    return firestore()
      .collection("messages")
      .where("conversation_id", "==", conversationId)
      .orderBy("created_at", "desc")
      .limit(50)
      .onSnapshot((snap) => {
        snap.docChanges().forEach((change) => {
          if (change.type === "added") {
            const msg = { id: change.doc.id, ...change.doc.data() } as any;
            if (msg.sender_id !== userId) {
              callback({ new: docToMessage(msg, change.doc.id) });
            }
          }
        });
      });
  },

  subscribeToUserConversations: (
    userId: string,
    callback: (payload: any) => void,
  ) => {
    return firestore()
      .collection("conversation_participants")
      .where("user_id", "==", userId)
      .onSnapshot((snap) => {
        snap.docChanges().forEach((change) => {
          callback({ type: change.type, data: change.doc.data() });
        });
      });
  },

  subscribeToConversations: (callback: (payload: any) => void) => {
    return firestore()
      .collection("conversations")
      .onSnapshot((snap) => {
        snap.docChanges().forEach((change) => {
          callback({
            type: change.type,
            data: { id: change.doc.id, ...change.doc.data() },
          });
        });
      });
  },

  subscribeToTypingStatus: (
    conversationId: string,
    callback: (payload: any) => void,
  ) => {
    return firestore()
      .collection("conversations")
      .doc(conversationId)
      .onSnapshot((snap) => {
        if (snap.exists()) {
          const d = snap.data() as any;
          callback({ new: { is_typing: d.is_typing } });
        }
      });
  },

  subscribeToUserParticipants: (
    userId: string,
    callback: (payload: any) => void,
  ) => {
    return firestore()
      .collection("conversation_participants")
      .where("user_id", "==", userId)
      .onSnapshot((snap) => {
        snap.docChanges().forEach((change) => {
          callback({ type: change.type, data: change.doc.data() });
        });
      });
  },
};

/* -------------------- QUERIES -------------------- */

export const chatQueries = {
  getConversations: async (userId: string) => {
    try {
      const partSnap = await firestore()
        .collection("conversation_participants")
        .where("user_id", "==", userId)
        .get();

      const convIds = partSnap.docs.map(
        (d) => (d.data() as any).conversation_id as string,
      );
      if (!convIds.length) return { data: [], error: null };

      const conversations: ChatConversation[] = [];

      for (let i = 0; i < convIds.length; i += 10) {
        const batch = convIds.slice(i, i + 10);
        const convSnaps = await firestore()
          .collection("conversations")
          .where(firestore.FieldPath.documentId(), "in", batch)
          .get();

        for (const convDoc of convSnaps.docs) {
          const conv = docToConversation(convDoc.data(), convDoc.id);

          const pSnap = await firestore()
            .collection("conversation_participants")
            .where("conversation_id", "==", convDoc.id)
            .get();

          const participants = await Promise.all(
            pSnap.docs.map(async (p) => {
              const pd = p.data() as any;
              const profile = await getProfile(pd.user_id);
              return { user_id: pd.user_id, profiles: profile };
            }),
          );

          let last_message: ChatMessage | undefined;
          if (conv.last_message_id) {
            const msgSnap = await firestore()
              .collection("messages")
              .doc(conv.last_message_id)
              .get();
            if (msgSnap.exists()) {
              last_message = docToMessage(
                msgSnap.data() as any,
                msgSnap.id,
              ) as ChatMessage;
            }
          }

          conversations.push({ ...conv, participants, last_message });
        }
      }

      conversations.sort(
        (a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
      );

      return { data: conversations, error: null };
    } catch (error) {
      console.error("Error fetching conversations:", error);
      return { data: null, error: error as Error };
    }
  },

  getMessages: async (
    conversationId: string,
    page = 0,
    pageSize: number = 20,
  ) => {
    try {
      const snap = await firestore()
        .collection("messages")
        .where("conversation_id", "==", conversationId)
        .orderBy("created_at", "desc")
        .limit(pageSize)
        .get();

      const msgs: ChatMessage[] = await Promise.all(
        snap.docs.map(async (d) => {
          const data = d.data() as any;
          const msg = docToMessage(data, d.id) as ChatMessage;
          if (data.sender_id) {
            msg.sender = await getProfile(data.sender_id);
          }
          return msg;
        }),
      );

      const from = page * pageSize;
      return { data: msgs.slice(from, from + pageSize), error: null };
    } catch (error) {
      console.error("Error fetching messages:", error);
      return { data: null, error: error as Error };
    }
  },

  sendMessage: async (
    conversationId: string,
    senderId: string,
    content: string,
    attachments?: ChatAttachment[],
    mediaUrl?: string,
    mediaType?: "image" | "video" | "audio" | "file",
  ) => {
    try {
      const messageData: any = {
        conversation_id: conversationId,
        sender_id: senderId,
        content: content.trim() || null,
        delivered_at: new Date().toISOString(),
        read_at: null,
        created_at: firestore.FieldValue.serverTimestamp(),
      };

      if (attachments && attachments.length > 0) {
        messageData.attachments = attachments;
        messageData.media_url = attachments[0].url;
        messageData.media_type = attachments[0].type;
      } else if (mediaUrl && mediaType) {
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

      const msgRef = await firestore().collection("messages").add(messageData);

      await firestore().collection("conversations").doc(conversationId).update({
        updated_at: firestore.FieldValue.serverTimestamp(),
        last_message_id: msgRef.id,
      });

      const pSnap = await firestore()
        .collection("conversation_participants")
        .where("conversation_id", "==", conversationId)
        .where("user_id", "!=", senderId)
        .get();

      const batch = firestore().batch();
      pSnap.docs.forEach((p) => {
        const current = (p.data() as any).unread_count ?? 0;
        batch.update(p.ref, { unread_count: current + 1 });
      });
      await batch.commit();

      const sender = await getProfile(senderId);
      const newMsg: ChatMessage = {
        ...docToMessage({ ...messageData, created_at: new Date() }, msgRef.id),
        sender,
      };

      return { data: newMsg, error: null };
    } catch (error) {
      console.error("Error sending message:", error);
      return { data: null, error: error as Error };
    }
  },

  createConversation: async (
    participantIds: string[],
    name?: string,
    isGroup = false,
  ) => {
    try {
      if (!participantIds.length) throw new Error("No participants provided");

      const convRef = await firestore()
        .collection("conversations")
        .add({
          name: name || null,
          is_group: isGroup,
          avatar_url: null,
          is_online: false,
          is_typing: false,
          is_pinned: false,
          unread_count: 0,
          last_message_id: null,
          created_at: firestore.FieldValue.serverTimestamp(),
          updated_at: firestore.FieldValue.serverTimestamp(),
        });

      const batch = firestore().batch();
      participantIds.forEach((userId) => {
        const ref = firestore().collection("conversation_participants").doc();
        batch.set(ref, {
          conversation_id: convRef.id,
          user_id: userId,
          unread_count: 0,
          joined_at: new Date().toISOString(),
        });
      });
      await batch.commit();

      const convSnap = await convRef.get();
      const conv = docToConversation(convSnap.data(), convSnap.id);

      const participants = await Promise.all(
        participantIds.map(async (userId) => ({
          user_id: userId,
          profiles: await getProfile(userId),
        })),
      );

      return {
        data: { ...conv, participants } as ChatConversation,
        error: null,
      };
    } catch (error) {
      console.error("Error creating conversation:", error);
      return { data: null, error: error as Error };
    }
  },

  markAsRead: async (conversationId: string, userId: string) => {
    try {
      const snap = await firestore()
        .collection("messages")
        .where("conversation_id", "==", conversationId)
        .where("sender_id", "!=", userId)
        .get();

      const batch = firestore().batch();
      snap.docs.forEach((d) => {
        if (!(d.data() as any).read_at) {
          batch.update(d.ref, { read_at: new Date().toISOString() });
        }
      });
      await batch.commit();

      const pSnap = await firestore()
        .collection("conversation_participants")
        .where("conversation_id", "==", conversationId)
        .where("user_id", "==", userId)
        .get();

      pSnap.docs.forEach((d) => d.ref.update({ unread_count: 0 }));

      return { error: null };
    } catch (error) {
      console.error("Error marking messages as read:", error);
      return { error: error as Error };
    }
  },

  getConversation: async (conversationId: string) => {
    try {
      const convSnap = await firestore()
        .collection("conversations")
        .doc(conversationId)
        .get();
      if (!convSnap.exists) throw new Error("Conversation not found");

      const conv = docToConversation(convSnap.data(), convSnap.id);

      const pSnap = await firestore()
        .collection("conversation_participants")
        .where("conversation_id", "==", conversationId)
        .get();

      const participants = await Promise.all(
        pSnap.docs.map(async (p) => {
          const pd = p.data() as any;
          return {
            user_id: pd.user_id,
            profiles: await getProfile(pd.user_id),
          };
        }),
      );

      let last_message: ChatMessage | undefined;
      if (conv.last_message_id) {
        const msgSnap = await firestore()
          .collection("messages")
          .doc(conv.last_message_id)
          .get();
        if (msgSnap.exists()) {
          last_message = docToMessage(
            msgSnap.data() as any,
            msgSnap.id,
          ) as ChatMessage;
        }
      }

      return {
        data: { ...conv, participants, last_message } as ChatConversation,
        error: null,
      };
    } catch (error) {
      console.error("Error fetching conversation:", error);
      return { data: null, error: error as Error };
    }
  },

  deleteConversation: async (conversationId: string) => {
    try {
      const batch = firestore().batch();

      const msgSnap = await firestore()
        .collection("messages")
        .where("conversation_id", "==", conversationId)
        .get();
      msgSnap.docs.forEach((d) => batch.delete(d.ref));

      const pSnap = await firestore()
        .collection("conversation_participants")
        .where("conversation_id", "==", conversationId)
        .get();
      pSnap.docs.forEach((d) => batch.delete(d.ref));

      batch.delete(firestore().collection("conversations").doc(conversationId));

      await batch.commit();
      return { error: null };
    } catch (error) {
      console.error("Error deleting conversation:", error);
      return { error: error as Error };
    }
  },

  updateTypingStatus: async (conversationId: string, isTyping: boolean) => {
    try {
      await firestore().collection("conversations").doc(conversationId).update({
        is_typing: isTyping,
      });
      return { error: null };
    } catch (error) {
      console.error("Error updating typing status:", error);
      return { error: error as Error };
    }
  },
};

/* -------------------- BACKWARD COMPAT EXPORTS -------------------- */
export const getConversations = chatQueries.getConversations;
export const getMessages = chatQueries.getMessages;
export const sendMessage = chatQueries.sendMessage;
export const createConversation = chatQueries.createConversation;
export const markAsRead = chatQueries.markAsRead;
export const getConversation = chatQueries.getConversation;
export const deleteConversation = chatQueries.deleteConversation;
export const updateTypingStatus = chatQueries.updateTypingStatus;
