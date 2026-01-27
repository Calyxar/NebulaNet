// hooks/useNotifications.ts - COMPLETE FIXED VERSION
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
  story?: {
    id: string;
    content: string | null;
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
            badge: 1,
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

        // Request permissions
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== "granted") {
          console.log("Notification permissions not granted");
        }
      } catch (error) {
        console.error("Error initializing notification sound:", error);
      }
    };

    initializeNotificationSound();
  }, []);

  // Fetch notifications with pagination
  const notificationsQuery = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data: userData, error: userError } =
        await supabase.auth.getUser();
      if (userError || !userData?.user) return [];

      const user = userData.user;

      const { data, error } = await supabase
        .from("notifications")
        .select(
          `
          *,
          sender:profiles!notifications_sender_id_fkey(id, username, full_name, avatar_url),
          post:posts!notifications_post_id_fkey(id, title, content, media),
          comment:comments!notifications_comment_id_fkey(id, content),
          community:communities!notifications_community_id_fkey(id, name, slug, avatar_url),
          story:stories!notifications_story_id_fkey(id, content, media_url),
          conversation:conversations!notifications_conversation_id_fkey(id, name, avatar_url)
        `,
        )
        .eq("receiver_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as Notification[];
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    refetchOnWindowFocus: true,
  });

  // Mark as read
  const markAsRead = useMutation({
    mutationFn: async (notificationId?: string) => {
      const { data: userData, error: userError } =
        await supabase.auth.getUser();
      if (userError || !userData?.user) throw new Error("Not authenticated");

      const user = userData.user;

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

      // Update badge count
      Notifications.setBadgeCountAsync(0);
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

  // CLEAR ALL NOTIFICATIONS
  const clearAllNotifications = useMutation({
    mutationFn: async () => {
      const { data: userData, error: userError } =
        await supabase.auth.getUser();
      if (userError || !userData?.user) throw new Error("Not authenticated");

      const user = userData.user;

      // Delete all notifications for the current user
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("receiver_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "unread"] });

      // Clear badge
      Notifications.setBadgeCountAsync(0);
    },
  });

  // Get unread count
  const unreadCountQuery = useQuery({
    queryKey: ["notifications", "unread"],
    queryFn: async () => {
      const { data: userData, error: userError } =
        await supabase.auth.getUser();
      if (userError || !userData?.user) return 0;

      const user = userData.user;

      const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("receiver_id", user.id)
        .eq("read", false);

      if (error) throw error;

      // Update badge count
      Notifications.setBadgeCountAsync(count || 0);

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
        case "story_comment":
          return `💬 ${senderName} commented on your story`;
        case "story_like":
          return `❤️ ${senderName} liked your story`;
        case "message":
          return `💌 ${senderName} sent you a message`;
        case "join_request":
          return `🙋 ${senderName} wants to join your community`;
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
        case "story_comment":
          return notification.comment?.content
            ? `Commented: ${notification.comment.content.substring(0, 80)}...`
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
        return "heart";
      case "comment":
        return "chatbubble";
      case "follow":
        return "person-add";
      case "mention":
        return "at";
      case "community_invite":
        return "people";
      case "post_shared":
        return "share";
      case "story_comment":
        return "camera";
      case "story_like":
        return "heart";
      case "message":
        return "chatbubble";
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

  // Real-time subscription for new notifications
  useEffect(() => {
    let channel: any;

    const setupRealtimeSubscription = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;

      if (!user) return;

      channel = supabase
        .channel("notifications-realtime")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `receiver_id=eq.${user.id}`,
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
              senderId: newNotification.sender_id,
            });

            // Invalidate queries to refresh data
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
            queryClient.invalidateQueries({
              queryKey: ["notifications", "unread"],
            });
          },
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "notifications",
            filter: `receiver_id=eq.${user.id}`,
          },
          () => {
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
            queryClient.invalidateQueries({
              queryKey: ["notifications", "unread"],
            });
          },
        )
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table: "notifications",
            filter: `receiver_id=eq.${user.id}`,
          },
          () => {
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
            queryClient.invalidateQueries({
              queryKey: ["notifications", "unread"],
            });
          },
        )
        .subscribe();
    };

    setupRealtimeSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [
    queryClient,
    playNotificationSound,
    showLocalNotification,
    getNotificationTitle,
    getNotificationBody,
  ]);

  // Group notifications by date
  const groupNotificationsByDate = useCallback(
    (notifications: Notification[]) => {
      const groups: { [key: string]: Notification[] } = {};

      notifications.forEach((notification) => {
        const date = new Date(notification.created_at);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        let groupKey = "";

        if (date.toDateString() === today.toDateString()) {
          groupKey = "Today";
        } else if (date.toDateString() === yesterday.toDateString()) {
          groupKey = "Yesterday";
        } else if (date.getTime() > today.getTime() - 7 * 24 * 60 * 60 * 1000) {
          groupKey = "This Week";
        } else {
          groupKey = "Older";
        }

        if (!groups[groupKey]) {
          groups[groupKey] = [];
        }
        groups[groupKey].push(notification);
      });

      return groups;
    },
    [],
  );

  return {
    notifications: notificationsQuery.data || [],
    isLoading: notificationsQuery.isLoading,
    unreadCount: unreadCountQuery.data || 0,
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
