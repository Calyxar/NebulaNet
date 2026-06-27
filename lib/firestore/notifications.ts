// lib/firestore/notifications.ts — FIREBASE ✅
// ✅ FIXED: added deleteNotification function

import { auth, db } from "@/lib/firebase";
import firestore from "@react-native-firebase/firestore";

export type NotificationType =
  | "follow"
  | "follow_request"
  | "like"
  | "comment"
  | "repost"
  | "mention"
  | "message"
  | "story_like"
  | "story_comment"
  | "community_invite"
  | "join_request"
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
  created_at: string;
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

function tsToIso(ts: any): string {
  if (!ts) return new Date().toISOString();
  if (ts instanceof firestore.Timestamp) return ts.toDate().toISOString();
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

  if (senderId && senderId === input.receiver_id) return null;

  const now = new Date().toISOString();

  const refDoc = await db.collection("notifications").add({
    type: input.type,
    sender_id: senderId,
    receiver_id: input.receiver_id,
    entity_type: input.entity_type ?? null,
    entity_id: input.entity_id ?? null,
    text: input.text ?? null,
    is_read: false,
    created_at: now,
    created_at_ts: firestore.FieldValue.serverTimestamp(),
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

  let q = db
    .collection("notifications")
    .where("receiver_id", "==", viewer.uid)
    .orderBy("created_at_ts", "desc");

  if (cursor?.lastDocId) {
    const lastSnap = await db
      .collection("notifications")
      .doc(cursor.lastDocId)
      .get();
    if (lastSnap.exists()) q = q.startAfter(lastSnap) as any;
  }

  const snap = await q.limit(lim).get();

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

  const res = await db
    .collection("notifications")
    .where("receiver_id", "==", viewer.uid)
    .where("is_read", "==", false)
    .count()
    .get();

  return res.data().count ?? 0;
}

/* =============================================================================
   MARK READ
============================================================================= */

export async function markNotificationRead(notificationId: string) {
  const viewer = auth.currentUser;
  if (!viewer) throw new Error("Not authenticated");

  const refDoc = db.collection("notifications").doc(notificationId);
  const snap = await refDoc.get();
  if (!snap.exists) return;

  const d = snap.data() as any;
  if (d.receiver_id !== viewer.uid) return;

  await refDoc.update({ is_read: true });
}

export async function markAllNotificationsRead() {
  const viewer = auth.currentUser;
  if (!viewer) throw new Error("Not authenticated");

  const snap = await db
    .collection("notifications")
    .where("receiver_id", "==", viewer.uid)
    .where("is_read", "==", false)
    .orderBy("created_at_ts", "desc")
    .limit(250)
    .get();

  if (snap.empty) return;

  const batch = db.batch();
  snap.docs.forEach((d) => batch.update(d.ref, { is_read: true }));
  await batch.commit();
}

/* =============================================================================
   ✅ DELETE NOTIFICATION
   Only the receiver can delete their own notifications.
============================================================================= */

export async function deleteNotification(
  notificationId: string,
): Promise<void> {
  const viewer = auth.currentUser;
  if (!viewer) throw new Error("Not authenticated");

  const refDoc = db.collection("notifications").doc(notificationId);
  const snap = await refDoc.get();
  if (!snap.exists) return;

  const d = snap.data() as any;
  // Only allow deleting own notifications
  if (d.receiver_id !== viewer.uid) return;

  await refDoc.delete();
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

  return db
    .collection("notifications")
    .where("receiver_id", "==", viewer.uid)
    .orderBy("created_at_ts", "desc")
    .limit(lim)
    .onSnapshot((snap) => {
      const rows = snap.docs.map((d) => docToNotification(d.id, d.data()));
      params.onChange(rows);
    });
}
