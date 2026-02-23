// lib/firestore/notifications.ts — FIREBASE ✅ (NEW + COMPLETED)
// Minimal, scalable notifications layer for NebulaNet.
//
// Collection: notifications
// Fields:
// - type: "follow" | "like" | "comment" | "story_reply" | "system" | ...
// - sender_id, receiver_id
// - entity_type: "post" | "comment" | "story" | "user" | "community" | ...
// - entity_id
// - text (optional preview)
// - is_read (boolean)
// - created_at_ts (serverTimestamp)
// - created_at (ISO string optional)
//
// ✅ getMyNotifications (paged cursor)
// ✅ unread count
// ✅ mark read / mark all read
// ✅ realtime subscribe for badge + list

import { auth, db } from "@/lib/firebase";
import {
    Timestamp,
    addDoc,
    collection,
    doc,
    limit as fsLimit,
    getCountFromServer,
    getDoc,
    getDocs,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    startAfter,
    updateDoc,
    where,
    writeBatch,
} from "firebase/firestore";

export type NotificationType =
  | "follow"
  | "like"
  | "comment"
  | "story_reply"
  | "system";

export type EntityType = "post" | "comment" | "story" | "user" | "community";

export type NotificationRow = {
  id: string;
  type: NotificationType;

  sender_id: string | null;
  receiver_id: string;

  entity_type?: EntityType | null;
  entity_id?: string | null;

  text?: string | null;

  is_read: boolean;

  created_at: string; // ISO
  created_at_ts?: any;
};

export type NotificationsCursor = {
  lastDocId?: string;
} | null;

export type PaginatedNotifications = {
  notifications: NotificationRow[];
  hasMore: boolean;
  nextCursor: NotificationsCursor;
};

const NOTIFS = collection(db, "notifications");

function tsToIso(ts: any): string {
  if (!ts) return new Date().toISOString();
  if (ts instanceof Timestamp) return ts.toDate().toISOString();
  const d = new Date(ts);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function docToNotification(id: string, d: any): NotificationRow {
  return {
    id,
    type: d.type,
    sender_id: d.sender_id ?? null,
    receiver_id: d.receiver_id,
    entity_type: d.entity_type ?? null,
    entity_id: d.entity_id ?? null,
    text: d.text ?? null,
    is_read: typeof d.is_read === "boolean" ? d.is_read : false,
    created_at: tsToIso(d.created_at_ts ?? d.created_at),
    created_at_ts: d.created_at_ts,
  };
}

/* =============================================================================
   CREATE
============================================================================= */

export async function createNotification(input: {
  type: NotificationType;
  receiver_id: string;
  sender_id?: string | null;

  entity_type?: EntityType | null;
  entity_id?: string | null;

  text?: string | null;
}) {
  const sender = auth.currentUser;
  const senderId = input.sender_id ?? sender?.uid ?? null;

  // Optional: prevent self-notify
  if (senderId && senderId === input.receiver_id) return null;

  const now = new Date().toISOString();

  const refDoc = await addDoc(NOTIFS, {
    type: input.type,
    sender_id: senderId,
    receiver_id: input.receiver_id,

    entity_type: input.entity_type ?? null,
    entity_id: input.entity_id ?? null,

    text: input.text ?? null,

    is_read: false,

    created_at: now,
    created_at_ts: serverTimestamp(),
  });

  return refDoc.id;
}

/* =============================================================================
   LIST (PAGED)
============================================================================= */

export async function getMyNotifications(params?: {
  limit?: number;
  cursor?: NotificationsCursor;
}): Promise<PaginatedNotifications> {
  const viewer = auth.currentUser;
  if (!viewer) return { notifications: [], hasMore: false, nextCursor: null };

  const lim = params?.limit ?? 30;
  const cursor = params?.cursor ?? null;

  let qBase = query(
    NOTIFS,
    where("receiver_id", "==", viewer.uid),
    orderBy("created_at_ts", "desc"),
  );

  if (cursor?.lastDocId) {
    const lastSnap = await getDoc(doc(db, "notifications", cursor.lastDocId));
    if (lastSnap.exists()) qBase = query(qBase, startAfter(lastSnap));
  }

  const snap = await getDocs(query(qBase, fsLimit(lim)));

  const notifications = snap.docs.map((d) => docToNotification(d.id, d.data()));

  const last = snap.docs[snap.docs.length - 1];
  const nextCursor: NotificationsCursor = last ? { lastDocId: last.id } : null;

  return {
    notifications,
    hasMore: snap.docs.length === lim,
    nextCursor,
  };
}

/* =============================================================================
   UNREAD COUNT
============================================================================= */

export async function getUnreadCount(): Promise<number> {
  const viewer = auth.currentUser;
  if (!viewer) return 0;

  const q1 = query(
    NOTIFS,
    where("receiver_id", "==", viewer.uid),
    where("is_read", "==", false),
  );

  const res = await getCountFromServer(q1);
  return res.data().count ?? 0;
}

/* =============================================================================
   MARK READ
============================================================================= */

export async function markNotificationRead(notificationId: string) {
  const viewer = auth.currentUser;
  if (!viewer) throw new Error("Not authenticated");

  const refDoc = doc(db, "notifications", notificationId);
  const snap = await getDoc(refDoc);
  if (!snap.exists()) return;

  const d = snap.data() as any;
  if (d.receiver_id !== viewer.uid) return;

  await updateDoc(refDoc, { is_read: true });
}

export async function markAllNotificationsRead() {
  const viewer = auth.currentUser;
  if (!viewer) throw new Error("Not authenticated");

  const q1 = query(
    NOTIFS,
    where("receiver_id", "==", viewer.uid),
    where("is_read", "==", false),
    orderBy("created_at_ts", "desc"),
    fsLimit(250), // batch safety
  );

  const snap = await getDocs(q1);
  if (snap.empty) return;

  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.update(d.ref, { is_read: true }));
  await batch.commit();
}

/* =============================================================================
   REALTIME SUBSCRIBE (badge / live list)
============================================================================= */

export function subscribeToMyNotifications(params: {
  onChange: (rows: NotificationRow[]) => void;
  limit?: number;
}) {
  const viewer = auth.currentUser;
  if (!viewer) return () => {};

  const lim = params.limit ?? 50;

  const q1 = query(
    NOTIFS,
    where("receiver_id", "==", viewer.uid),
    orderBy("created_at_ts", "desc"),
    fsLimit(lim),
  );

  return onSnapshot(q1, (snap) => {
    const rows = snap.docs.map((d) => docToNotification(d.id, d.data()));
    params.onChange(rows);
  });
}
