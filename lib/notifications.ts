// lib/notifications.ts
import { auth, db } from "@/lib/firebase";
import firestore from "@react-native-firebase/firestore";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

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
    // ✅ FIX: sound string must match filename without extension in res/raw
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#6D8BFF",
      sound: "notification.wav",
      enableVibrate: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      showBadge: true,
    });

    // Separate silent channel for muted users
    await Notifications.setNotificationChannelAsync("silent", {
      name: "Silent",
      importance: Notifications.AndroidImportance.LOW,
      sound: undefined,
      enableVibrate: false,
      showBadge: false,
    });

    console.log("Notification channels created");
  } catch (error) {
    console.error("Error setting up notification channels:", error);
  }
}

export async function registerForPushNotificationsAsync(): Promise<
  string | null
> {
  if (Platform.OS === "android") {
    await setupNotificationChannels();
  }

  if (!Device.isDevice) {
    console.log("Push notifications require a physical device");
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("Push notification permission denied");
    return null;
  }

  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) {
      console.warn("EAS project ID not found in expo config");
      return null;
    }
    const token = (await Notifications.getExpoPushTokenAsync({ projectId }))
      .data;
    console.log("Push token:", token);
    return token;
  } catch (error) {
    console.error("Error getting push token:", error);
    return null;
  }
}

export async function savePushTokenToFirestore(
  userId: string,
  token: string,
): Promise<void> {
  try {
    await db.collection("profiles").doc(userId).set(
      {
        push_token: token,
        push_enabled: true,
        updated_at: firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  } catch (error) {
    console.error("Error saving push token:", error);
  }
}

export async function removePushTokenFromFirestore(
  userId: string,
): Promise<void> {
  try {
    await db.collection("profiles").doc(userId).set(
      {
        push_token: null,
        push_enabled: false,
        updated_at: firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  } catch (error) {
    console.error("Error removing push token:", error);
  }
}

export async function registerPushNotifications(): Promise<void> {
  const userId = auth.currentUser?.uid;
  if (!userId) return;

  // ✅ Respect mute preference — don't register if muted
  const profileSnap = await db.collection("profiles").doc(userId).get();
  const muted = profileSnap.data()?.notifications_muted === true;
  if (muted) {
    console.log("Notifications muted — skipping push registration");
    return;
  }

  const token = await registerForPushNotificationsAsync();
  if (token) {
    await savePushTokenToFirestore(userId, token);
  }
}

/**
 * Toggle mute for the current user.
 * When muted: removes push token so Cloud Functions have nothing to send to.
 * When unmuted: re-registers and saves the token.
 */
export async function setNotificationsMuted(muted: boolean): Promise<void> {
  const userId = auth.currentUser?.uid;
  if (!userId) return;

  await db.collection("profiles").doc(userId).set(
    {
      notifications_muted: muted,
      updated_at: firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  if (muted) {
    await removePushTokenFromFirestore(userId);
  } else {
    const token = await registerForPushNotificationsAsync();
    if (token) await savePushTokenToFirestore(userId, token);
  }
}

export async function getNotificationsMuted(): Promise<boolean> {
  const userId = auth.currentUser?.uid;
  if (!userId) return false;
  const snap = await db.collection("profiles").doc(userId).get();
  return snap.data()?.notifications_muted === true;
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
  } catch (error) {
    console.error("Error clearing badge:", error);
  }
}

export async function setNotificationBadge(count: number): Promise<void> {
  try {
    await Notifications.setBadgeCountAsync(count);
  } catch (error) {
    console.error("Error setting badge:", error);
  }
}
