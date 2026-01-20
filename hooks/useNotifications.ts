// hooks/useNotifications.ts
import { supabase } from "@/lib/supabase";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Audio } from "expo-av";
import * as Notifications from "expo-notifications";
import { useCallback, useEffect } from "react";
import { Platform } from "react-native";

export interface Notification {
  id: string;
  type:
    | "like"
    | "comment"
    | "follow"
    | "mention"
    | "community_invite"
    | "post_shared";
  sender_id: string;
  receiver_id: string;
  post_id?: string;
  comment_id?: string;
  community_id?: string;
  read: boolean;
  created_at: string;
  sender: {
    id: string;
    username: string;
    full_name?: string;
    avatar_url?: string;
  };
  post?: {
    id: string;
    title?: string;
    content: string;
  };
  comment?: {
    id: string;
    content: string;
  };
  community?: {
    id: string;
    name: string;
    slug: string;
  };
}

// Configure notification handler for newer Expo versions
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

  // Play custom notification sound
  const playNotificationSound = useCallback(async () => {
    try {
      const soundObject = new Audio.Sound();
      await soundObject.loadAsync(
        require("@/assets/sounds/mixkit_sci_fi_click_900.wav"),
      );
      await soundObject.playAsync();

      // Unload sound after playing
      setTimeout(() => {
        soundObject.unloadAsync();
      }, 1000);
    } catch (error) {
      console.error("Error playing notification sound:", error);
    }
  }, []);

  // Show local notification with custom sound
  const showLocalNotification = useCallback(
    async (title: string, body: string, data?: any) => {
      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            data: data || {},
            sound:
              Platform.OS === "android"
                ? "mixkit_sci_fi_click_900.wav"
                : "mixkit_sci_fi_click_900.wav",
          },
          trigger: null, // Show immediately
        });

        // Also play sound for immediate feedback
        await playNotificationSound();
      } catch (error) {
        console.error("Error showing local notification:", error);
      }
    },
    [playNotificationSound],
  );

  // Initialize notification sound
  useEffect(() => {
    const initializeNotificationSound = async () => {
      try {
        // Create Android notification channel with custom sound
        if (Platform.OS === "android") {
          await Notifications.setNotificationChannelAsync("default", {
            name: "Default",
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: "#E6F4FE",
            sound: "mixkit_sci_fi_click_900.wav",
            enableVibrate: true,
          });
        }
      } catch (error) {
        console.error("Error initializing notification sound:", error);
      }
    };

    initializeNotificationSound();
  }, []);

  // Fetch notifications
  const notificationsQuery = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("notifications")
        .select(
          `
          *,
          sender:profiles!notifications_sender_id_fkey(id, username, full_name, avatar_url),
          post:posts!notifications_post_id_fkey(id, title, content),
          comment:comments!notifications_comment_id_fkey(id, content),
          community:communities!notifications_community_id_fkey(id, name, slug)
        `,
        )
        .eq("receiver_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as Notification[];
    },
    refetchInterval: 30000,
  });

  // Mark as read
  const markAsRead = useMutation({
    mutationFn: async (notificationId?: string) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (notificationId) {
        // Mark single notification as read
        const { error } = await supabase
          .from("notifications")
          .update({ read: true })
          .eq("id", notificationId)
          .eq("receiver_id", user.id);

        if (error) throw error;
      } else {
        // Mark all notifications as read
        const { error } = await supabase
          .from("notifications")
          .update({ read: true })
          .eq("receiver_id", user.id)
          .eq("read", false);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "unread"] });
    },
  });

  // Delete notification
  const deleteNotification = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "unread"] });
    },
  });

  // Get unread count
  const unreadCountQuery = useQuery({
    queryKey: ["notifications", "unread"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return 0;

      const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("receiver_id", user.id)
        .eq("read", false);

      if (error) throw error;
      return count || 0;
    },
    refetchInterval: 30000,
  });

  // Helper functions for notification content
  const getNotificationTitle = useCallback(
    (notification: Notification): string => {
      const senderName =
        notification.sender.full_name || notification.sender.username;

      switch (notification.type) {
        case "like":
          return `❤️ ${senderName} liked your post`;
        case "comment":
          return `💬 ${senderName} commented on your post`;
        case "follow":
          return `👤 ${senderName} started following you`;
        case "mention":
          return `📍 ${senderName} mentioned you`;
        case "community_invite":
          return `🏘️ ${senderName} invited you to a community`;
        case "post_shared":
          return `🔁 ${senderName} shared your post`;
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
          return "Someone liked your content";
        case "comment":
          return notification.comment?.content
            ? notification.comment.content.length > 100
              ? `${notification.comment.content.substring(0, 100)}...`
              : notification.comment.content
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
        default:
          return "You have a new notification";
      }
    },
    [],
  );

  // Real-time subscription for new notifications
  useEffect(() => {
    if (!notificationsQuery.data || notificationsQuery.data.length === 0)
      return;

    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `receiver_id=eq.${notificationsQuery.data[0].receiver_id}`,
        },
        async (payload) => {
          // Play sound for new notification
          await playNotificationSound();

          // Show local notification
          const newNotification = payload.new as Notification;
          const notificationTitle = getNotificationTitle(newNotification);
          const notificationBody = getNotificationBody(newNotification);

          await showLocalNotification(notificationTitle, notificationBody, {
            notificationId: newNotification.id,
            type: newNotification.type,
            postId: newNotification.post_id,
          });

          // Invalidate queries to refresh data
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
          queryClient.invalidateQueries({
            queryKey: ["notifications", "unread"],
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [
    notificationsQuery.data,
    queryClient,
    playNotificationSound,
    showLocalNotification,
    getNotificationTitle,
    getNotificationBody,
  ]);

  // Function to send a test notification
  const sendTestNotification = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Create a test notification
    const { error } = await supabase.from("notifications").insert({
      type: "follow",
      sender_id: user.id,
      receiver_id: user.id,
      read: false,
    });

    if (error) {
      console.error("Error creating test notification:", error);
    }
  };

  return {
    notifications: notificationsQuery.data || [],
    isLoading: notificationsQuery.isLoading,
    unreadCount: unreadCountQuery.data || 0,
    markAsRead,
    deleteNotification,
    refetch: notificationsQuery.refetch,
    playNotificationSound,
    showLocalNotification,
    sendTestNotification,
  };
}
