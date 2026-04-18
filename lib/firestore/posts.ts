// lib/firestore/chat.ts — REACT NATIVE FIREBASE ✅
import { ChatAttachment } from "@/components/chat/ChatInput";
import auth from "@react-native-firebase/auth";
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
  participant_ids?: string[];
  dm_pair_key?: string | null;
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

const profileCache = new Map<string, ProfileRow | undefined>();

async function getProfile(userId: string): Promise<ProfileRow | undefined> {
  if (profileCache.has(userId)) return profileCache.get(userId);
  const snap = await firestore().collection("profiles").doc(userId).get();
  const d = snap.data();
  const profile: ProfileRow | undefined = d
    ? {
        id: snap.id,
        username: d.username ?? "",
        full_name: d.full_name ?? null,
        avatar_url: d.avatar_url ?? null,
        bio: d.bio ?? null,
      }
    : undefined;
  profileCache.set(userId, profile);
  return profile;
}

async function getProfilesBatch(
  userIds: string[],
): Promise<Map<string, ProfileRow>> {
  const out = new Map<string, ProfileRow>();
  const toFetch: string[] = [];

  for (const id of userIds) {
    const cached = profileCache.get(id);
    if (cached) {
      out.set(id, cached);
    } else if (cached === undefined && !profileCache.has(id)) {
      toFetch.push(id);
    }
  }

  for (let i = 0; i < toFetch.length; i += 10) {
    const batch = toFetch.slice(i, i + 10);
    const snap = await firestore()
      .collection("profiles")
      .where(firestore.FieldPath.documentId(), "in", batch)
      .get();
    snap.docs.forEach((d) => {
      const data = d.data() as any;
      const profile: ProfileRow = {
        id: d.id,
        username: data.username ?? "",
        full_name: data.full_name ?? null,
        avatar_url: data.avatar_url ?? null,
        bio: data.bio ?? null,
      };
      profileCache.set(d.id, profile);
      out.set(d.id, profile);
    });
  }

  return out;
}

// ✅ FIX: fetch real presence status from user_presence collection
async function getPresenceBatch(
  userIds: string[],
): Promise<Map<string, boolean>> {
  const out = new Map<string, boolean>();
  if (!userIds.length) return out;
  const unique = [...new Set(userIds)];
  for (let i = 0; i < unique.length; i += 10) {
    const batch = unique.slice(i, i + 10);
    const snap = await firestore()
      .collection("user_presence")
      .where(firestore.FieldPath.documentId(), "in", batch)
      .get();
    snap.docs.forEach((d) => {
      const data = d.data() as any;
      // Consider online only if status is "online" and last_seen within 2 minutes
      const lastSeen: number = data?.last_seen?.toDate
        ? data.last_seen.toDate().getTime()
        : 0;
      const fresh = Date.now() - lastSeen < 2 * 60 * 1000;
      out.set(d.id, data?.status === "online" && fresh);
    });
  }
  return out;
}

function docToMessage(d: any, id: string, conversationId: string): MessageRow {
  return {
    id,
    conversation_id: d.conversation_id ?? conversationId,
    sender_id: d.sender_id,
    content: d.content ?? null,
    media_url: d.media_url ?? null,
    media_type: d.media_type ?? null,
    attachments: d.attachments ?? [],
    created_at: tsToIso(d.created_at_ts ?? d.created_at),
    delivered_at: d.delivered_at ? tsToIso(d.delivered_at) : null,
    read_at: d.read_at ? tsToIso(d.read_at) : null,
  };
}

function docToConversation(d: any, id: string): ConversationRow {
  return {
    id,
    name: d.name ?? null,
    created_at: tsToIso(d.created_at_ts ?? d.created_at),
    updated_at: tsToIso(d.updated_at_ts ?? d.updated_at),
    last_message_id: d.last_message_id ?? null,
    is_typing: d.is_typing ?? false,
    is_group: d.is_group ?? false,
    avatar_url: d.avatar_url ?? null,
    unread_count: d.unread_count ?? 0,
    is_online: false, // resolved separately from user_presence
    is_pinned: d.is_pinned ?? false,
    participant_ids: Array.isArray(d.participant_ids) ? d.participant_ids : [],
    dm_pair_key: d.dm_pair_key ?? null,
  };
}

/* -------------------- SUBSCRIPTIONS -------------------- */

export const chatSubscriptions = {
  subscribeToMessages: (
    conversationId: string,
    _userId: string,
    callback: (payload: any) => void,
  ) => {
    return firestore()
      .collection("conversations")
      .doc(conversationId)
      .collection("messages")
      .orderBy("created_at_ts", "desc")
      .limit(50)
      .onSnapshot(
        (snap) => {
          if (!snap) return;
          snap.docChanges().forEach((change) => {
            if (change.type === "added") {
              const data = change.doc.data() as any;
              callback({
                new: docToMessage(data, change.doc.id, conversationId),
              });
            }
          });
        },
        (error) => {
          console.error("Error in subscribeToMessages:", error);
        },
      );
  },

  subscribeToUserConversations: (
    userId: string,
    callback: (payload: any) => void,
  ) => {
    return firestore()
      .collection("conversations")
      .where("participant_ids", "array-contains", userId)
      .onSnapshot(
        (snap) => {
          if (!snap) return;
          const docs = snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as any),
          }));
          callback({ docs });
        },
        (error) => {
          console.error("Error in subscribeToUserConversations:", error);
        },
      );
  },

  subscribeToTypingStatus: (
    conversationId: string,
    callback: (payload: any) => void,
  ) => {
    return firestore()
      .collection("conversations")
      .doc(conversationId)
      .collection("typing")
      .onSnapshot(
        (snap) => {
          if (!snap) return;
          const typing: Record<string, boolean> = {};
          snap.docs.forEach((d) => {
            const data = d.data() as any;
            const updated = data?.updated_at?.toDate
              ? data.updated_at.toDate().getTime()
              : 0;
            const fresh = updated > Date.now() - 6000;
            typing[d.id] = !!data?.is_typing && fresh;
          });
          callback({ new: { typing } });
        },
        (error) => {
          console.error("Error in subscribeToTypingStatus:", error);
        },
      );
  },
};

/* -------------------- QUERIES -------------------- */

export const chatQueries = {
  getConversations: async (userId: string) => {
    try {
      // ✅ FIX: removed orderBy("updated_at_ts") — combining array-contains with
      // orderBy requires a composite Firestore index that may not exist, causing
      // the entire query to throw and conversations to never load.
      // Sort is done in JS below instead.
      const convSnap = await firestore()
        .collection("conversations")
        .where("participant_ids", "array-contains", userId)
        .limit(50)
        .get();

      if (convSnap.empty) return { data: [], error: null };

      const allUserIds = new Set<string>();
      convSnap.docs.forEach((d) => {
        const ids = (d.data() as any).participant_ids;
        if (Array.isArray(ids)) ids.forEach((id) => allUserIds.add(id));
      });
      await getProfilesBatch(Array.from(allUserIds));

      // ✅ FIX: fetch real presence for all participants
      const otherUserIds = Array.from(allUserIds).filter((id) => id !== userId);
      const presenceMap = await getPresenceBatch(otherUserIds);

      const conversations: ChatConversation[] = await Promise.all(
        convSnap.docs.map(async (convDoc) => {
          const conv = docToConversation(convDoc.data(), convDoc.id);

          const participants = (conv.participant_ids ?? []).map((uid) => ({
            user_id: uid,
            profiles: profileCache.get(uid) ?? undefined,
          }));

          // ✅ FIX: resolve is_online from presence, not from conversation doc
          const otherParticipants = (conv.participant_ids ?? []).filter(
            (id) => id !== userId,
          );
          const is_online = otherParticipants.some(
            (id) => presenceMap.get(id) === true,
          );

          let last_message: ChatMessage | undefined;
          if (conv.last_message_id) {
            try {
              const msgSnap = await firestore()
                .collection("conversations")
                .doc(convDoc.id)
                .collection("messages")
                .doc(conv.last_message_id)
                .get();
              const msgData = msgSnap.data();
              if (msgData) {
                last_message = docToMessage(
                  msgData as any,
                  msgSnap.id,
                  convDoc.id,
                ) as ChatMessage;
              }
            } catch (e) {
              console.warn("Failed to load last message:", e);
            }
          }

          return { ...conv, is_online, participants, last_message };
        }),
      );

      // ✅ FIX: sort by updated_at in JS since we removed Firestore orderBy
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
      const limitCount = pageSize * (page + 1);
      const snap = await firestore()
        .collection("conversations")
        .doc(conversationId)
        .collection("messages")
        .orderBy("created_at_ts", "desc")
        .limit(limitCount)
        .get();

      const senderIds = Array.from(
        new Set(snap.docs.map((d) => (d.data() as any).sender_id as string)),
      );
      await getProfilesBatch(senderIds);

      const msgs: ChatMessage[] = snap.docs.map((d) => {
        const data = d.data() as any;
        const msg = docToMessage(data, d.id, conversationId) as ChatMessage;
        msg.sender = profileCache.get(data.sender_id);
        return msg;
      });

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
        created_at: new Date().toISOString(),
        created_at_ts: firestore.FieldValue.serverTimestamp(),
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
            url: mediaUrl,
            type: mediaType,
            name: mediaUrl.split("/").pop() ?? "file",
            storagePath: "",
          },
        ];
      }

      const convRef = firestore()
        .collection("conversations")
        .doc(conversationId);

      const msgRef = await convRef.collection("messages").add(messageData);

      await convRef.update({
        updated_at: new Date().toISOString(),
        updated_at_ts: firestore.FieldValue.serverTimestamp(),
        last_message_id: msgRef.id,
        last_message: {
          id: msgRef.id,
          content: messageData.content,
          sender_id: senderId,
          media_type: messageData.media_type ?? null,
        },
      });

      try {
        const partsSnap = await convRef.collection("participants").get();
        const batch = firestore().batch();
        partsSnap.docs.forEach((p) => {
          if (p.id !== senderId) {
            batch.set(
              p.ref,
              { unread_count: firestore.FieldValue.increment(1) },
              { merge: true },
            );
          }
        });
        await batch.commit();
      } catch (e) {
        console.warn("Failed to bump unread counts:", e);
      }

      const sender = await getProfile(senderId);
      const newMsg: ChatMessage = {
        ...docToMessage(messageData, msgRef.id, conversationId),
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

      const dmPairKey =
        !isGroup && participantIds.length === 2
          ? [...participantIds].sort().join("__")
          : null;

      const convRef = await firestore()
        .collection("conversations")
        .add({
          name: name || null,
          is_group: isGroup,
          dm_pair_key: dmPairKey,
          participant_ids: participantIds,
          avatar_url: null,
          is_online: false,
          is_typing: false,
          is_pinned: false,
          unread_count: 0,
          last_message_id: null,
          last_message: null,
          last_message_at: null,
          created_at: firestore.FieldValue.serverTimestamp(),
          updated_at: firestore.FieldValue.serverTimestamp(),
          created_at_ts: firestore.FieldValue.serverTimestamp(),
          updated_at_ts: firestore.FieldValue.serverTimestamp(),
        });

      const batch = firestore().batch();
      participantIds.forEach((userId) => {
        const partRef = convRef.collection("participants").doc(userId);
        batch.set(partRef, {
          user_id: userId,
          unread_count: 0,
          joined_at: firestore.FieldValue.serverTimestamp(),
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
      const convRef = firestore()
        .collection("conversations")
        .doc(conversationId);

      await convRef.collection("participants").doc(userId).set(
        {
          user_id: userId,
          unread_count: 0,
          last_read_at: firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      const msgSnap = await convRef
        .collection("messages")
        .orderBy("created_at_ts", "desc")
        .limit(50)
        .get();

      const batch = firestore().batch();
      let updates = 0;
      msgSnap.docs.forEach((d) => {
        const data = d.data() as any;
        if (data.sender_id !== userId && !data.read_at) {
          batch.update(d.ref, { read_at: new Date().toISOString() });
          updates++;
        }
      });
      if (updates > 0) await batch.commit();

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
      const convData = convSnap.data();
      if (!convData) throw new Error("Conversation not found");

      const conv = docToConversation(convData, convSnap.id);

      const participants = await Promise.all(
        (conv.participant_ids ?? []).map(async (uid) => ({
          user_id: uid,
          profiles: await getProfile(uid),
        })),
      );

      // ✅ FIX: resolve is_online from presence
      const currentUid = auth().currentUser?.uid;
      const otherIds = (conv.participant_ids ?? []).filter(
        (id) => id !== currentUid,
      );
      const presenceMap = await getPresenceBatch(otherIds);
      const is_online = otherIds.some((id) => presenceMap.get(id) === true);

      let last_message: ChatMessage | undefined;
      if (conv.last_message_id) {
        const msgSnap = await firestore()
          .collection("conversations")
          .doc(conversationId)
          .collection("messages")
          .doc(conv.last_message_id)
          .get();
        const msgData = msgSnap.data();
        if (msgData) {
          last_message = docToMessage(
            msgData as any,
            msgSnap.id,
            conversationId,
          ) as ChatMessage;
        }
      }

      return {
        data: {
          ...conv,
          is_online,
          participants,
          last_message,
        } as ChatConversation,
        error: null,
      };
    } catch (error) {
      console.error("Error fetching conversation:", error);
      return { data: null, error: error as Error };
    }
  },

  deleteConversation: async (conversationId: string) => {
    try {
      const convRef = firestore()
        .collection("conversations")
        .doc(conversationId);

      const msgSnap = await convRef.collection("messages").get();
      const partSnap = await convRef.collection("participants").get();
      const typingSnap = await convRef.collection("typing").get();

      const batch = firestore().batch();
      msgSnap.docs.forEach((d) => batch.delete(d.ref));
      partSnap.docs.forEach((d) => batch.delete(d.ref));
      typingSnap.docs.forEach((d) => batch.delete(d.ref));
      batch.delete(convRef);

      await batch.commit();
      return { error: null };
    } catch (error) {
      console.error("Error deleting conversation:", error);
      return { error: error as Error };
    }
  },

  updateTypingStatus: async (conversationId: string, isTyping: boolean) => {
    try {
      const uid = auth().currentUser?.uid;
      if (!uid) return { error: null };
      await firestore()
        .collection("conversations")
        .doc(conversationId)
        .collection("typing")
        .doc(uid)
        .set(
          {
            is_typing: isTyping,
            updated_at: firestore.FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
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
