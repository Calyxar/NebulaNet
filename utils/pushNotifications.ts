// utils/pushNotifications.ts ✅ FIXED
// Fix: accept uid as parameter instead of reading auth.currentUser inside
//      the function — avoids a race condition where auth.currentUser is null
//      even though the user hook already has the uid

import { db } from "@/lib/firebase";
import messaging from "@react-native-firebase/messaging";
import * as Device from "expo-device";
import { Platform } from "react-native";

export async function registerForPushNotificationsAsync(
  uid?: string,
): Promise<string | null> {
  if (!Device.isDevice) return null;

  try {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (!enabled) return null;

    const fcmToken = await messaging().getToken();
    if (!fcmToken) return null;

    // ✅ FIX: use the uid passed in rather than auth.currentUser
    // auth.currentUser can be null here due to async auth state hydration
    if (uid) {
      await db.collection("profiles").doc(uid).set(
        {
          fcm_token: fcmToken,
          fcm_token_platform: Platform.OS,
          fcm_token_updated_at: new Date().toISOString(),
        },
        { merge: true },
      );
      console.log("[FCM] Token saved for user", uid);
    }

    // ✅ Also refresh token when FCM rotates it
    messaging().onTokenRefresh(async (newToken: string) => {
      if (uid) {
        await db.collection("profiles").doc(uid).set(
          {
            fcm_token: newToken,
            fcm_token_platform: Platform.OS,
            fcm_token_updated_at: new Date().toISOString(),
          },
          { merge: true },
        );
        console.log("[FCM] Token refreshed for user", uid);
      }
    });

    return fcmToken;
  } catch (error) {
    console.warn("[FCM] Push notification registration failed:", error);
    return null;
  }
}
