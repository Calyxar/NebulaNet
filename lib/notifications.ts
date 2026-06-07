// lib/notifications.ts ✅
// ✅ FIXED: added getNotificationsMuted / setNotificationsMuted using AsyncStorage
//           so notifications.tsx no longer crashes on import

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const MUTED_KEY = "nebulanet:notifications_muted";

// ✅ These were missing — notifications.tsx imports them
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

export async function setupNotificationChannels() {
  if (Platform.OS !== "android") return;
  try {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#8A7CFA",
      sound: "notification.wav",
      enableVibrate: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      showBadge: true,
    });
    await Notifications.setNotificationChannelAsync("messages", {
      name: "Messages",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#8A7CFA",
      sound: "notification.wav",
      enableVibrate: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      showBadge: true,
    });
    await Notifications.setNotificationChannelAsync("silent", {
      name: "Silent",
      importance: Notifications.AndroidImportance.LOW,
      sound: undefined,
      enableVibrate: false,
      showBadge: false,
    });
  } catch (error) {
    console.error("Error setting up notification channels:", error);
  }
}

export async function registerPushNotifications(): Promise<void> {
  const { registerForPushNotificationsAsync } =
    await import("@/utils/pushNotifications");
  await registerForPushNotificationsAsync();
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
