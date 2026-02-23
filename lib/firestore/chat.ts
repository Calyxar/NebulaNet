// lib/firestore/chat.ts — FIRESTORE CHAT ✅ (UPDATED FOR FIREBASE STORAGE ATTACHMENTS)
// ✅ Uses ChatAttachment (url + storagePath) instead of SupabaseAttachment
// ✅ Keeps backward-ish compatibility fields: media_url/media_type for UI that expects them
// ✅ subscribeToMessages ignores initial snapshot
// ✅ participants included in getConversations/getConversation
// ✅ unread_count from participants subdoc
// ✅ last_message stored on conversation doc

import type { ChatAttachment } from "@/components/chat/ChatInput";
import { auth, db } from "@/lib/firebase";
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    limit as fsLimit,
    getDoc,
    getDocs,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    startAfter,
    Timestamp,
    updateDoc,
    where,
    writeBatch,
} from "firebase/firestore";

/* =============================================================================
   TYPES
============================================================================= */

export type ProfileRow = {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
};

export type ChatMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;

  // legacy single media (for older UI)
  media_url: string | null;
  media_type: string | null;

  // ✅ firebase attachments
  attachments?: ChatAttachment[];

  created_at: string;
  delivered_at: string | null;
  read_at: string | null;

  sender?: ProfileRow | null;
};

export type ChatConversation = {
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

  participants?: { user_id: string; profiles?: ProfileRow | null }[];
  last_message?: ChatMessage;
};

/* =============================================================================
   HELPERS
============================================================================= */

const CONVERSATIONS = collection(db, "conversations");

function tsToIso(ts: any): string {
  if (!ts) return new Date().toISOString();
  if (ts instanceof Timestamp) return ts.toDate().toISOString();
  return new Date(ts).toISOString();
}

function normalizeAttachments(d: any): ChatAttachment[] {
  const atts: any[] = Array.isArray(d.attachments) ? d.attachments : [];

  // Ensure each attachment has url + storagePath (and type/name if possible)
  return atts
    .map((a) => {
      if (!a) return null;
      return {
        url: a.url ?? a.downloadURL ?? null,
        storagePath: a.storagePath ?? a.path ?? null,
        type: a.type ?? "file",
        name: a.name ?? "attachment",
        size: a.size ?? undefined,
        mimeType: a.mimeType ?? undefined,
        duration: a.duration ?? undefined,
      } as ChatAttachment;
    })
    .filter((x) => !!x?.url && !!x?.storagePath);
}

function msgDocToChatMessage(
  conversationId: string,
  id: string,
  d: any,
): ChatMessage {
  const atts = normalizeAttachments(d);
  const first = atts?.[0];

  return {
    id,
    conversation_id: conversationId,
    sender_id: d.sender_id,
    content: d.content ?? null,

    // keep compatibility fields for UI that expects them
    media_url: d.media_url ?? first?.url ?? null,
    media_type: d.media_type ?? first?.type ?? null,

    attachments: atts,

    created_at: tsToIso(d.created_at_ts ?? d.created_at),
    delivered_at: d.delivered_at_ts ? tsToIso(d.delivered_at_ts) : null,
    read_at: null,
    sender: (d.sender ?? null) as ProfileRow | null,
  };
}

async function getProfileSnapshot(uid: string): Promise<ProfileRow | null> {
  const snap = await getDoc(doc(db, "profiles", uid));
  if (!snap.exists()) return null;
  const d = snap.data() as any;
  return {
    id: uid,
    username: d.username ?? "",
    full_name: d.full_name ?? null,
    avatar_url: d.avatar_url ?? null,
    bio: d.bio ?? null,
  };
}

async function getConversationParticipants(
  conversationId: string,
): Promise<{ user_id: string; profiles?: ProfileRow | null }[]> {
  const partsSnap = await getDocs(
    collection(db, "conversations", conversationId, "participants"),
  );

  return partsSnap.docs.map((p) => {
    const pd = p.data() as any;
    return {
      user_id: pd.user_id ?? p.id,
      profiles: (pd.profile ?? null) as ProfileRow | null,
    };
  });
}

/* =============================================================================
   QUERIES
============================================================================= */

export const chatQueries = {
  getConversations: async (userId: string) => {
    try {
      const q1 = query(
        CONVERSATIONS,
        where("participant_ids", "array-contains", userId),
        orderBy("updated_at_ts", "desc"),
      );

      const snap = await getDocs(q1);
      const convs: ChatConversation[] = [];

      for (const c of snap.docs) {
        const d = c.data() as any;

        const partSnap = await getDoc(
          doc(db, "conversations", c.id, "participants", userId),
        );
        const unread =
          partSnap.exists() &&
          typeof (partSnap.data() as any).unread_count === "number"
            ? (partSnap.data() as any).unread_count
            : 0;

        const participants = await getConversationParticipants(c.id);

        convs.push({
          id: c.id,
          name: d.name ?? null,
          created_at: tsToIso(d.created_at_ts ?? d.created_at),
          updated_at: tsToIso(d.updated_at_ts ?? d.updated_at),

          last_message_id: d.last_message?.id ?? null,
          last_message: d.last_message
            ? msgDocToChatMessage(c.id, d.last_message.id, d.last_message)
            : undefined,

          is_typing: !!d.is_typing,
          is_group: !!d.is_group,
          avatar_url: d.avatar_url ?? null,
          unread_count: unread,
          is_online: d.is_online ?? null,
          is_pinned: d.is_pinned ?? null,

          participants,
        });
      }

      return { data: convs, error: null };
    } catch (error) {
      console.error("Error fetching conversations:", error);
      return { data: null, error: error as Error };
    }
  },

  getConversation: async (conversationId: string) => {
    try {
      const snap = await getDoc(doc(db, "conversations", conversationId));
      if (!snap.exists()) return { data: null, error: null };

      const d = snap.data() as any;
      const participants = await getConversationParticipants(conversationId);

      return {
        data: {
          id: snap.id,
          name: d.name ?? null,
          created_at: tsToIso(d.created_at_ts ?? d.created_at),
          updated_at: tsToIso(d.updated_at_ts ?? d.updated_at),

          last_message_id: d.last_message?.id ?? null,
          last_message: d.last_message
            ? msgDocToChatMessage(snap.id, d.last_message.id, d.last_message)
            : undefined,

          is_typing: !!d.is_typing,
          is_group: !!d.is_group,
          avatar_url: d.avatar_url ?? null,

          participants,

          // typing map supported by useTyping() firebase version
          ...(d.typing ? { typing: d.typing } : {}),
        } as any,
        error: null,
      };
    } catch (error) {
      console.error("Error fetching conversation:", error);
      return { data: null, error: error as Error };
    }
  },

  getMessages: async (conversationId: string, page = 0, pageSize = 20) => {
    try {
      const msgsCol = collection(
        db,
        "conversations",
        conversationId,
        "messages",
      );

      let qBase = query(
        msgsCol,
        orderBy("created_at_ts", "desc"),
        fsLimit(pageSize),
      );

      if (page > 0) {
        let cursorSnap: any = null;
        let walked = 0;

        while (walked < page) {
          const snap = await getDocs(qBase);
          const last = snap.docs[snap.docs.length - 1];
          if (!last) break;
          cursorSnap = last;
          walked += 1;

          qBase = query(
            msgsCol,
            orderBy("created_at_ts", "desc"),
            startAfter(cursorSnap),
            fsLimit(pageSize),
          );
        }
      }

      const snap = await getDocs(qBase);
      const messages = snap.docs.map((m) =>
        msgDocToChatMessage(conversationId, m.id, m.data()),
      );

      return { data: messages, error: null };
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
  ) => {
    try {
      const nowIso = new Date().toISOString();

      const atts = Array.isArray(attachments) ? attachments : [];
      const first = atts[0];

      const messageData: any = {
        conversation_id: conversationId,
        sender_id: senderId,
        content: content.trim() || null,
        attachments: atts,

        // compatibility fields
        media_url: first?.url ?? null,
        media_type: first?.type ?? null,

        delivered_at_ts: serverTimestamp(),
        created_at_ts: serverTimestamp(),
        created_at: nowIso,
      };

      const msgsCol = collection(
        db,
        "conversations",
        conversationId,
        "messages",
      );
      const msgRef = await addDoc(msgsCol, messageData);

      const convoRef = doc(db, "conversations", conversationId);
      const convoSnap = await getDoc(convoRef);
      if (!convoSnap.exists()) throw new Error("Conversation not found");

      const participantIds: string[] =
        (convoSnap.data() as any).participant_ids ?? [];

      const batch = writeBatch(db);

      // conversation update (denormalize last_message)
      const senderSnap = await getProfileSnapshot(senderId);

      batch.update(convoRef, {
        updated_at_ts: serverTimestamp(),
        updated_at: nowIso,
        last_message: {
          id: msgRef.id,
          sender_id: senderId,
          content: messageData.content,
          attachments: atts,
          media_url: messageData.media_url,
          media_type: messageData.media_type,
          created_at_ts: serverTimestamp(),
          created_at: nowIso,
          sender: senderSnap,
        },
      });

      // unread++ for others
      for (const uid of participantIds) {
        if (uid === senderId) continue;

        const pRef = doc(
          db,
          "conversations",
          conversationId,
          "participants",
          uid,
        );
        const pSnap = await getDoc(pRef);

        const cur =
          pSnap.exists() &&
          typeof (pSnap.data() as any).unread_count === "number"
            ? (pSnap.data() as any).unread_count
            : 0;

        batch.set(
          pRef,
          {
            user_id: uid,
            unread_count: cur + 1,
            joined_at_ts:
              (pSnap.exists() ? (pSnap.data() as any).joined_at_ts : null) ??
              serverTimestamp(),
          },
          { merge: true },
        );
      }

      await batch.commit();

      return {
        data: {
          ...msgDocToChatMessage(conversationId, msgRef.id, messageData),
          sender: senderSnap,
        } as ChatMessage,
        error: null,
      };
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

      const nowIso = new Date().toISOString();

      const convoRef = await addDoc(CONVERSATIONS, {
        name: name || null,
        is_group: isGroup,
        avatar_url: null,
        is_typing: false,
        is_pinned: false,
        is_online: false,
        participant_ids: participantIds,
        last_message: null,
        typing: {},

        created_at_ts: serverTimestamp(),
        updated_at_ts: serverTimestamp(),
        created_at: nowIso,
        updated_at: nowIso,
      });

      const batch = writeBatch(db);
      for (const uid of participantIds) {
        const prof = await getProfileSnapshot(uid);
        batch.set(doc(db, "conversations", convoRef.id, "participants", uid), {
          user_id: uid,
          unread_count: 0,
          joined_at_ts: serverTimestamp(),
          profile: prof,
        });
      }
      await batch.commit();

      const snap = await getDoc(convoRef);
      const d = snap.data() as any;

      return {
        data: {
          id: snap.id,
          name: d.name ?? null,
          created_at: tsToIso(d.created_at_ts ?? d.created_at),
          updated_at: tsToIso(d.updated_at_ts ?? d.updated_at),
          last_message_id: null,
          is_typing: false,
          is_group: !!d.is_group,
          avatar_url: d.avatar_url ?? null,
        } as ChatConversation,
        error: null,
      };
    } catch (error) {
      console.error("Error creating conversation:", error);
      return { data: null, error: error as Error };
    }
  },

  markAsRead: async (conversationId: string, userId: string) => {
    try {
      await updateDoc(
        doc(db, "conversations", conversationId, "participants", userId),
        { unread_count: 0 },
      );

      await updateDoc(doc(db, "conversations", conversationId), {
        [`read_state.${userId}`]: serverTimestamp(),
      });

      return { error: null };
    } catch (error) {
      console.error("Error marking messages as read:", error);
      return { error: error as Error };
    }
  },

  deleteConversation: async (conversationId: string) => {
    try {
      await deleteDoc(doc(db, "conversations", conversationId));
      return { error: null };
    } catch (error) {
      console.error("Error deleting conversation:", error);
      return { error: error as Error };
    }
  },

  updateTypingStatus: async (conversationId: string, isTyping: boolean) => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) throw new Error("Not authenticated");

      await updateDoc(doc(db, "conversations", conversationId), {
        // compatibility:
        is_typing: isTyping,

        // preferred:
        [`typing.${uid}`]: isTyping,

        updated_at_ts: serverTimestamp(),
      });

      return { error: null };
    } catch (error) {
      console.error("Error updating typing status:", error);
      return { error: error as Error };
    }
  },
};

/* =============================================================================
   SUBSCRIPTIONS
============================================================================= */

export const chatSubscriptions = {
  subscribeToMessages: (
    conversationId: string,
    userId: string,
    callback: (payload: any) => void,
  ) => {
    const msgsCol = collection(db, "conversations", conversationId, "messages");
    const q1 = query(msgsCol, orderBy("created_at_ts", "desc"), fsLimit(1));

    let didInit = false;

    const unsub = onSnapshot(q1, (snap) => {
      const docSnap = snap.docs[0];
      if (!docSnap) return;

      if (!didInit) {
        didInit = true;
        return;
      }

      const d = docSnap.data() as any;
      if (d.sender_id === userId) return;

      const msg = msgDocToChatMessage(conversationId, docSnap.id, d);
      callback({ new: msg });
    });

    return () => unsub();
  },

  subscribeToUserConversations: (
    userId: string,
    callback: (payload: any) => void,
  ) => {
    const q1 = query(
      CONVERSATIONS,
      where("participant_ids", "array-contains", userId),
      orderBy("updated_at_ts", "desc"),
    );

    const unsub = onSnapshot(q1, (snap) => {
      callback({
        type: "conversations",
        docs: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
      });
    });

    return () => unsub();
  },

  subscribeToConversations: (callback: (payload: any) => void) => {
    const q1 = query(
      CONVERSATIONS,
      orderBy("updated_at_ts", "desc"),
      fsLimit(50),
    );
    const unsub = onSnapshot(q1, (snap) => {
      callback({
        type: "conversations",
        docs: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
      });
    });

    return () => unsub();
  },

  subscribeToTypingStatus: (
    conversationId: string,
    callback: (payload: any) => void,
  ) => {
    const ref = doc(db, "conversations", conversationId);
    const unsub = onSnapshot(ref, (snap) => {
      if (!snap.exists()) return;
      callback({ new: { id: snap.id, ...snap.data() } });
    });
    return () => unsub();
  },

  subscribeToUserParticipants: (
    userId: string,
    callback: (payload: any) => void,
  ) => {
    const unsub = chatSubscriptions.subscribeToUserConversations(
      userId,
      callback,
    );
    return () => unsub();
  },
};

// Backward-compat exports
export const getConversations = chatQueries.getConversations;
export const getMessages = chatQueries.getMessages;
export const sendMessage = chatQueries.sendMessage;
export const createConversation = chatQueries.createConversation;
export const markAsRead = chatQueries.markAsRead;
export const getConversation = chatQueries.getConversation;
export const deleteConversation = chatQueries.deleteConversation;
export const updateTypingStatus = chatQueries.updateTypingStatus;
