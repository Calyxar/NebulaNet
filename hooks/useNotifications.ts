// hooks/useNotifications.ts — FIREBASE ✅ FIXED
// ✅ onSnapshot no longer fires spurious sound/push on mount (initialised ref)
// ✅ unreadCount derived from notifications list — can't drift out of sync
// ✅ Real-time listener re-attaches when auth state changes (onAuthStateChanged)
// ✅ markAsRead(undefined) = mark all; markAsRead(id) = mark one

import { auth, db } from "@/lib/firebase";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Audio } from "expo-av";
import * as Notifications from "expo-notifications";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { useCallback, useEffect, useRef } from "react";
import { Platform } from "react-native";

/* ─────────────────────────────────────────
   TYPE
───────────────────────────────────────── */

export interface Notification {
  id: string;
  type:
    | "like"
    | "comment"
    | "follow"
    | "mention"
    | "community_invite"
    | "post_shared"
    | "story_comment"
    | "story_like"
    | "message"
    | "join_request";
  sender_id: string;
  receiver_id: string;
  post_id?: string;
  comment_id?: string;
  community_id?: string;
  story_id?: string;
  conversation_id?: string;
  read: boolean;
  created_at: string;
  sender: {
    id: string;
    username: string;
    full_name?: string;
    avatar_url?: string;
  };
  post?: { id: string; title?: string; content: string };
  comment?: { id: string; content: string };
  community?: { id: string; name: string; slug: string };
  story?: { id: string; content: string | null };
}

/* ─────────────────────────────────────────
   HELPERS
───────────────────────────────────────── */

function tsToIso(ts: any): string {
  if (!ts) return new Date().toISOString();
  if (ts instanceof Timestamp) return ts.toDate().toISOString();
  return new Date(ts).toISOString();
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/* ─────────────────────────────────────────
   HOOK
───────────────────────────────────────── */

export function useNotifications() {
  const queryClient = useQueryClient();

  // ✅ Tracks whether the real-time listener has finished its initial snapshot.
  // We skip sound + push for any docs present when the listener first attaches.
  const initialisedRef = useRef(false);

  /* ── Sound ── */

  const playNotificationSound = useCallback(async () => {
    try {
      const soundObject = new Audio.Sound();
      await soundObject.loadAsync(require("@/assets/sounds/notification.wav"));
      await soundObject.playAsync();
      setTimeout(() => soundObject.unloadAsync(), 1000);
    } catch (error) {
      console.error("Error playing notification sound:", error);
    }
  }, []);

  const showLocalNotification = useCallback(
    async (title: string, body: string, data?: any) => {
      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            data: data ?? {},
            sound: "notification.wav",
            badge: 1,
          },
          trigger: null,
        });
        await playNotificationSound();
      } catch (error) {
        console.error("Error showing local notification:", error);
      }
    },
    [playNotificationSound],
  );

  /* ── Permission + Android channel ── */

  useEffect(() => {
    const init = async () => {
      try {
        if (Platform.OS === "android") {
          await Notifications.setNotificationChannelAsync("default", {
            name: "Default",
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: "#E6F4FE",
            sound: "notification.wav",
            enableVibrate: true,
          });
        }
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== "granted")
          console.log("Notification permissions not granted");
      } catch (error) {
        console.error("Error initializing notifications:", error);
      }
    };
    init();
  }, []);

  /* ── Fetch (polling fallback) ── */

  const notificationsQuery = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const user = auth.currentUser;
      if (!user) return [];

      const snap = await getDocs(
        query(
          collection(db, "notifications"),
          where("receiver_id", "==", user.uid),
          orderBy("created_at", "desc"),
          limit(50),
        ),
      );

      return snap.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          ...data,
          created_at: tsToIso(data.created_at),
        } as Notification;
      });
    },
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  // ✅ Derived — never drifts out of sync with the list
  const unreadCount = (notificationsQuery.data ?? []).filter(
    (n) => !n.read,
  ).length;

  /* ── Real-time listener ──
     ✅ Re-attaches whenever auth state changes (handles late sign-in)
     ✅ Skips the initial snapshot so existing docs don't trigger sound/push
  ─────────────────────────────────────────────────────────────────────── */

  useEffect(() => {
    let unsubSnapshot: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      // Clean up any previous listener first
      unsubSnapshot?.();
      unsubSnapshot = null;
      initialisedRef.current = false;

      if (!user) return;

      const q = query(
        collection(db, "notifications"),
        where("receiver_id", "==", user.uid),
        orderBy("created_at", "desc"),
        limit(1),
      );

      unsubSnapshot = onSnapshot(q, (snap) => {
        // ✅ First snapshot = existing data — mark as initialised and skip
        if (!initialisedRef.current) {
          initialisedRef.current = true;
          return;
        }

        snap.docChanges().forEach(async (change) => {
          if (change.type === "added") {
            const data = change.doc.data() as any;
            const notification: Notification = {
              id: change.doc.id,
              ...data,
              created_at: tsToIso(data.created_at),
            };

            await showLocalNotification(
              getNotificationTitle(notification),
              getNotificationBody(notification),
              { notificationId: notification.id, type: notification.type },
            );

            queryClient.invalidateQueries({ queryKey: ["notifications"] });
          }

          if (change.type === "modified" || change.type === "removed") {
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
          }
        });
      });
    });

    return () => {
      unsubAuth();
      unsubSnapshot?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient, showLocalNotification]);

  /* ── Mutations ── */

  const markAsRead = useMutation({
    mutationFn: async (notificationId?: string) => {
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");

      if (notificationId) {
        await updateDoc(doc(db, "notifications", notificationId), {
          read: true,
        });
      } else {
        // Mark all unread
        const snap = await getDocs(
          query(
            collection(db, "notifications"),
            where("receiver_id", "==", user.uid),
            where("read", "==", false),
          ),
        );
        await Promise.all(
          snap.docs.map((d) => updateDoc(d.ref, { read: true })),
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      Notifications.setBadgeCountAsync(0);
    },
  });

  const deleteNotification = useMutation({
    mutationFn: async (notificationId: string) => {
      await deleteDoc(doc(db, "notifications", notificationId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const clearAllNotifications = useMutation({
    mutationFn: async () => {
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");

      const snap = await getDocs(
        query(
          collection(db, "notifications"),
          where("receiver_id", "==", user.uid),
          limit(200), // safety cap — call multiple times for very large sets
        ),
      );
      await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      Notifications.setBadgeCountAsync(0);
    },
  });

  /* ── Display helpers ── */

  const getNotificationTitle = useCallback(
    (notification: Notification): string => {
      const name =
        notification.sender?.full_name || notification.sender?.username;
      switch (notification.type) {
        case "like":
          return `❤️ ${name} liked your post`;
        case "comment":
          return `💬 ${name} commented on your post`;
        case "follow":
          return `👤 ${name} started following you`;
        case "mention":
          return `📍 ${name} mentioned you`;
        case "community_invite":
          return `🏘️ ${name} invited you to a community`;
        case "post_shared":
          return `🔁 ${name} shared your post`;
        case "story_comment":
          return `💬 ${name} commented on your story`;
        case "story_like":
          return `❤️ ${name} liked your story`;
        case "message":
          return `💌 ${name} sent you a message`;
        case "join_request":
          return `🙋 ${name} wants to join your community`;
        default:
          return "New notification";
      }
    },
    [],
  );

  const getNotificationBody = useCallback(
    (notification: Notification): string => {
      switch (notification.type) {
        case "like":
          return "Liked your content";
        case "comment":
          return notification.comment?.content
            ? notification.comment.content.substring(0, 100)
            : "Left a comment";
        case "follow":
          return "Started following you";
        case "mention":
          return "Mentioned you in a post";
        case "community_invite":
          return notification.community?.name
            ? `Invited you to join ${notification.community.name}`
            : "Invited you to join a community";
        case "post_shared":
          return "Shared your post with others";
        case "story_comment":
          return notification.comment?.content
            ? `Commented: ${notification.comment.content.substring(0, 80)}`
            : "Commented on your story";
        case "story_like":
          return "Liked your story";
        case "message":
          return "Sent you a new message";
        case "join_request":
          return "Requested to join your community";
        default:
          return "You have a new notification";
      }
    },
    [],
  );

  const getNotificationIcon = useCallback((type: Notification["type"]) => {
    switch (type) {
      case "like":
      case "story_like":
        return "heart";
      case "comment":
      case "story_comment":
      case "message":
        return "chatbubble";
      case "follow":
        return "person-add";
      case "mention":
        return "at";
      case "community_invite":
        return "people";
      case "post_shared":
        return "share";
      case "join_request":
        return "person";
      default:
        return "notifications";
    }
  }, []);

  const getNotificationColor = useCallback((type: Notification["type"]) => {
    switch (type) {
      case "like":
        return "#FF3B30";
      case "comment":
        return "#7C3AED";
      case "follow":
        return "#34C759";
      case "mention":
        return "#FF9500";
      case "community_invite":
        return "#5856D6";
      case "post_shared":
        return "#007AFF";
      case "story_comment":
        return "#AF52DE";
      case "story_like":
        return "#FF2D55";
      case "message":
        return "#32D74B";
      case "join_request":
        return "#5AC8FA";
      default:
        return "#7C3AED";
    }
  }, []);

  const groupNotificationsByDate = useCallback(
    (notifications: Notification[]) => {
      const groups: Record<string, Notification[]> = {};
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

      notifications.forEach((n) => {
        const date = new Date(n.created_at);
        let key = "Older";
        if (date.toDateString() === today.toDateString()) key = "Today";
        else if (date.toDateString() === yesterday.toDateString())
          key = "Yesterday";
        else if (date.getTime() > weekAgo.getTime()) key = "This Week";

        if (!groups[key]) groups[key] = [];
        groups[key].push(n);
      });

      return groups;
    },
    [],
  );

  /* ── Return ── */

  return {
    notifications: notificationsQuery.data ?? [],
    isLoading: notificationsQuery.isLoading,
    unreadCount, // ✅ derived, never stale
    markAsRead,
    deleteNotification,
    clearAllNotifications,
    refetch: notificationsQuery.refetch,
    playNotificationSound,
    showLocalNotification,
    getNotificationTitle,
    getNotificationBody,
    getNotificationIcon,
    getNotificationColor,
    groupNotificationsByDate,
  };
}
