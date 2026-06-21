// lib/notifications.ts ✅ FIXED
// Fix 1: registerPushNotifications now accepts and passes uid to avoid
//        auth.currentUser timing race condition
// Fix 2: channel IDs renamed to v2 — forces Android to create FRESH channels
//        since Android locks channel sound/vibration settings permanently
//        once a channel ID has been created on a device. Old "default" /
//        "messages" / "silent" channels may have been created with no sound
//        from earlier testing and Android ignores any code changes to them.

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const MUTED_KEY = "nebulanet:notifications_muted";

export async function getNotificationsMuted(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(MUTED_KEY);
    return val === "true";
  } catch {
    return false;
  }
}

export async function setNotificationsMuted(muted: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(MUTED_KEY, muted ? "true" : "false");
  } catch {}
}

export function setupNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

// ✅ FIX 2: this is now the SINGLE source of truth for channel creation.
// useNotifications.ts no longer creates its own channels — see that file's
// updated version which just reads these channel IDs instead.
export async function setupNotificationChannels() {
  if (Platform.OS !== "android") return;
  try {
    // ✅ Renamed default -> default_v2 to force a fresh channel
    await Notifications.setNotificationChannelAsync("default_v2", {
      name: "Default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#8A7CFA",
      sound: "notification.wav",
      enableVibrate: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      showBadge: true,
    });
    await Notifications.setNotificationChannelAsync("messages_v2", {
      name: "Messages",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#8A7CFA",
      sound: "notification.wav",
      enableVibrate: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      showBadge: true,
    });
    await Notifications.setNotificationChannelAsync("vibrate_v2", {
      name: "Vibrate Only",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 400, 200, 400],
      enableVibrate: true,
      showBadge: true,
    });
    await Notifications.setNotificationChannelAsync("silent_v2", {
      name: "Silent",
      importance: Notifications.AndroidImportance.LOW,
      enableVibrate: false,
      showBadge: false,
    });
    console.log("[Notifications] Channels v2 created successfully");
  } catch (error) {
    console.error("Error setting up notification channels:", error);
  }
}

export async function registerPushNotifications(uid?: string): Promise<void> {
  const { registerForPushNotificationsAsync } =
    await import("@/utils/pushNotifications");
  await registerForPushNotificationsAsync(uid);
}

export function setupNotificationListeners(
  onNotificationReceived?: (notification: Notifications.Notification) => void,
  onNotificationTapped?: (response: Notifications.NotificationResponse) => void,
) {
  const receivedSub = Notifications.addNotificationReceivedListener(
    (notification) => {
      console.log("Notification received:", notification);
      onNotificationReceived?.(notification);
    },
  );
  const responseSub = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      console.log("Notification tapped:", response);
      onNotificationTapped?.(response);
    },
  );
  return () => {
    receivedSub.remove();
    responseSub.remove();
  };
}

export async function clearNotificationBadge(): Promise<void> {
  try {
    await Notifications.setBadgeCountAsync(0);
  } catch {}
}

export async function setNotificationBadge(count: number): Promise<void> {
  try {
    await Notifications.setBadgeCountAsync(count);
  } catch {}
}
