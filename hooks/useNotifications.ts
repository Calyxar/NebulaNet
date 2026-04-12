// hooks/useNotifications.ts — React Native Firebase ✅
// ✅ FIXED: Migrated from web SDK to React Native Firebase
// ✅ FIXED: All queries, listeners, and mutations use React Native Firebase

import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Audio } from "expo-av";
import * as Notifications from "expo-notifications";
import { useCallback, useEffect, useRef } from "react";
import { Platform } from "react-native";

export interface Notification {
  id: string;
  type:
    | "like"
    | "comment"
    | "follow"
    | "follow_request"
    | "mention"
    | "community_invite"
    | "post_shared"
    | "story_comment"
    | "story_like"
    | "message"
    | "join_request"
    | "repost";
  sender_id: string;
  receiver_id: string;
  post_id?: string;
  comment_id?: string;
  community_id?: string;
  story_id?: string;
  conversation_id?: string;
  is_read: boolean;
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

function tsToIso(ts: any): string {
  if (!ts) return new Date().toISOString();
  if (ts?.toDate) return ts.toDate().toISOString();
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

export function useNotifications() {
  const queryClient = useQueryClient();
  const initialisedRef = useRef(false);

  const playNotificationSound = useCallback(async () => {
    try {
      const soundObject = new Audio.Sound();
      await soundObject.loadAsync(require("@/assets/sounds/notification.wav"));
      await soundObject.playAsync();
      setTimeout(() => soundObject.unloadAsync(), 1000);
    } catch {}
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
      } catch {}
    },
    [playNotificationSound],
  );

  useEffect(() => {
    const init = async () => {
      try {
        if (Platform.OS === "android") {
          await Notifications.setNotificationChannelAsync("default", {
            name: "Default",
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: "#7C3AED",
            sound: "notification.wav",
            enableVibrate: true,
          });
        }
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== "granted")
          console.log("Notification permissions not granted");
      } catch {}
    };
    init();
  }, []);

  const notificationsQuery = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const user = auth().currentUser;
      if (!user) return [];

      const snap = await firestore()
        .collection("notifications")
        .where("receiver_id", "==", user.uid)
        .orderBy("created_at_ts", "desc")
        .limit(50)
        .get();

      return snap.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          ...data,
          is_read: data.is_read ?? data.read ?? false,
          created_at: tsToIso(data.created_at_ts ?? data.created_at),
        } as Notification;
      });
    },
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  const unreadCount = (notificationsQuery.data ?? []).filter(
    (n) => !n.is_read,
  ).length;

  useEffect(() => {
    let unsubSnapshot: (() => void) | null = null;

    const unsubAuth = auth().onAuthStateChanged((user) => {
      unsubSnapshot?.();
      unsubSnapshot = null;
      initialisedRef.current = false;

      if (!user) return;

      unsubSnapshot = firestore()
        .collection("notifications")
        .where("receiver_id", "==", user.uid)
        .orderBy("created_at_ts", "desc")
        .limit(1)
        .onSnapshot((snap) => {
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
                is_read: data.is_read ?? data.read ?? false,
                created_at: tsToIso(data.created_at_ts ?? data.created_at),
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
  }, [queryClient, showLocalNotification]);

  const markAsRead = useMutation({
    mutationFn: async (notificationId?: string) => {
      const user = auth().currentUser;
      if (!user) throw new Error("Not authenticated");

      if (notificationId) {
        await firestore()
          .collection("notifications")
          .doc(notificationId)
          .update({
            is_read: true,
          });
      } else {
        const snap = await firestore()
          .collection("notifications")
          .where("receiver_id", "==", user.uid)
          .where("is_read", "==", false)
          .get();

        const batch = firestore().batch();
        snap.docs.forEach((doc) => {
          batch.update(doc.ref, { is_read: true });
        });
        await batch.commit();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      Notifications.setBadgeCountAsync(0);
    },
  });

  const deleteNotification = useMutation({
    mutationFn: async (notificationId: string) => {
      await firestore()
        .collection("notifications")
        .doc(notificationId)
        .delete();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const clearAllNotifications = useMutation({
    mutationFn: async () => {
      const user = auth().currentUser;
      if (!user) throw new Error("Not authenticated");

      const snap = await firestore()
        .collection("notifications")
        .where("receiver_id", "==", user.uid)
        .limit(200)
        .get();

      const batch = firestore().batch();
      snap.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      Notifications.setBadgeCountAsync(0);
    },
  });

  const getNotificationTitle = useCallback(
    (notification: Notification): string => {
      const name =
        notification.sender?.full_name ||
        notification.sender?.username ||
        "Someone";
      switch (notification.type) {
        case "like":
          return `${name} liked your post`;
        case "comment":
          return `${name} commented on your post`;
        case "follow":
          return `${name} started following you`;
        case "follow_request":
          return `${name} requested to follow you`;
        case "mention":
          return `${name} mentioned you`;
        case "community_invite":
          return `${name} invited you to a community`;
        case "post_shared":
          return `${name} shared your post`;
        case "repost":
          return `${name} reposted your post`;
        case "story_comment":
          return `${name} commented on your story`;
        case "story_like":
          return `${name} liked your story`;
        case "message":
          return `${name} sent you a message`;
        case "join_request":
          return `${name} wants to join your community`;
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
          return "Tap to view your post";
        case "comment":
          return notification.comment?.content
            ? notification.comment.content.substring(0, 100)
            : "Tap to see the comment";
        case "follow":
          return "Tap to view their profile";
        case "follow_request":
          return "Tap to review the request";
        case "mention":
          return "Tap to see where you were mentioned";
        case "repost":
          return "Tap to see the repost";
        case "community_invite":
          return notification.community?.name
            ? `Invited you to join ${notification.community.name}`
            : "Tap to join the community";
        case "post_shared":
          return "Shared your post with others";
        case "story_comment":
          return notification.comment?.content
            ? `Commented: ${notification.comment.content.substring(0, 80)}`
            : "Tap to see the comment";
        case "story_like":
          return "Liked your story";
        case "message":
          return "Tap to reply";
        case "join_request":
          return "Tap to review the request";
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
      case "follow_request":
        return "person-add";
      case "mention":
        return "at";
      case "community_invite":
        return "people";
      case "post_shared":
      case "repost":
        return "repeat";
      case "join_request":
        return "person";
      default:
        return "notifications";
    }
  }, []);

  const getNotificationColor = useCallback((type: Notification["type"]) => {
    switch (type) {
      case "like":
      case "story_like":
        return "#FF3B30";
      case "comment":
      case "story_comment":
        return "#7C3AED";
      case "follow":
      case "follow_request":
        return "#34C759";
      case "mention":
        return "#FF9500";
      case "community_invite":
        return "#5856D6";
      case "post_shared":
      case "repost":
        return "#007AFF";
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

  return {
    notifications: notificationsQuery.data ?? [],
    isLoading: notificationsQuery.isLoading,
    unreadCount,
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
