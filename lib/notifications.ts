// lib/notifications.ts — PUSH NOTIFICATION UTILITIES ✅
import { auth, db } from "@/lib/firebase";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { doc, setDoc } from "firebase/firestore";
import { Platform } from "react-native";

/**
 * Configure notification handler
 */
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

/**
 * Setup Android notification channel
 */
export async function setupNotificationChannels() {
  if (Platform.OS === "android") {
    try {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#6D8BFF",
        sound: "notification.wav",
        enableVibrate: true,
        lockscreenVisibility:
          Notifications.AndroidNotificationVisibility.PUBLIC,
      });
      console.log("Android notification channel created");
    } catch (error) {
      console.error("Error setting up notification channel:", error);
    }
  }
}

/**
 * Register for push notifications
 */
export async function registerForPushNotificationsAsync(): Promise<
  string | null
> {
  let token: string | null = null;

  if (Platform.OS === "android") {
    await setupNotificationChannels();
  }

  if (Device.isDevice) {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("Failed to get push token - permission denied");
      return null;
    }

    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      if (!projectId) {
        console.log("Project ID not found in expo config");
        return null;
      }

      token = (
        await Notifications.getExpoPushTokenAsync({
          projectId,
        })
      ).data;

      console.log("Push token obtained:", token);
    } catch (error) {
      console.error("Error getting push token:", error);
    }
  } else {
    console.log("Must use physical device for Push Notifications");
  }

  return token;
}

/**
 * Save push token to Firestore
 */
export async function savePushTokenToFirestore(
  userId: string,
  token: string,
): Promise<void> {
  try {
    await setDoc(
      doc(db, "profiles", userId),
      {
        push_token: token,
        push_enabled: true,
        updated_at: new Date().toISOString(),
      },
      { merge: true },
    );
    console.log("Push token saved to Firestore");
  } catch (error) {
    console.error("Error saving push token:", error);
  }
}

/**
 * Register push notifications (call when user logs in)
 */
export async function registerPushNotifications(): Promise<void> {
  const userId = auth.currentUser?.uid;
  if (!userId) {
    console.log("No user authenticated, skipping push registration");
    return;
  }

  const token = await registerForPushNotificationsAsync();
  if (token) {
    await savePushTokenToFirestore(userId, token);
  }
}

/**
 * Setup notification listeners
 */
export function setupNotificationListeners(
  onNotificationReceived?: (notification: Notifications.Notification) => void,
  onNotificationTapped?: (response: Notifications.NotificationResponse) => void,
) {
  // Notification received while app is foregrounded
  const receivedSubscription = Notifications.addNotificationReceivedListener(
    (notification) => {
      console.log("Notification received:", notification);
      onNotificationReceived?.(notification);
    },
  );

  // Notification tapped
  const responseSubscription =
    Notifications.addNotificationResponseReceivedListener((response) => {
      console.log("Notification tapped:", response);
      onNotificationTapped?.(response);
    });

  return () => {
    receivedSubscription.remove();
    responseSubscription.remove();
  };
}

/**
 * Clear notification badge
 */
export async function clearNotificationBadge(): Promise<void> {
  try {
    await Notifications.setBadgeCountAsync(0);
  } catch (error) {
    console.error("Error clearing notification badge:", error);
  }
}

/**
 * Set notification badge count
 */
export async function setNotificationBadge(count: number): Promise<void> {
  try {
    await Notifications.setBadgeCountAsync(count);
  } catch (error) {
    console.error("Error setting notification badge:", error);
  }
}
