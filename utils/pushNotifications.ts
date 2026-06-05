import { auth, db } from "@/lib/firebase";
import messaging from "@react-native-firebase/messaging";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export async function registerForPushNotificationsAsync(): Promise<
  string | null
> {
  if (!Device.isDevice) return null;

  try {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (!enabled) return null;

    const fcmToken = await messaging().getToken();
    if (!fcmToken) return null;

    const user = auth.currentUser;
    if (user) {
      await db.collection("profiles").doc(user.uid).set(
        {
          fcm_token: fcmToken,
          fcm_token_platform: Platform.OS,
          fcm_token_updated_at: new Date().toISOString(),
        },
        { merge: true },
      );
    }

    // Show notification when app is in foreground
    messaging().onMessage(async (remoteMessage) => {
      const title = remoteMessage.notification?.title;
      const body = remoteMessage.notification?.body;
      if (!title && !body) return;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: title ?? "NebulaNet",
          body: body ?? "",
          sound: "notification.wav",
          data: remoteMessage.data ?? {},
        },
        trigger: null,
      });
    });

    // Refresh token when it changes
    messaging().onTokenRefresh(async (newToken: string) => {
      const currentUser = auth.currentUser;
      if (currentUser) {
        await db.collection("profiles").doc(currentUser.uid).set(
          {
            fcm_token: newToken,
            fcm_token_platform: Platform.OS,
            fcm_token_updated_at: new Date().toISOString(),
          },
          { merge: true },
        );
      }
    });

    return fcmToken;
  } catch (error) {
    console.warn("Push notification registration failed:", error);
    return null;
  }
}
