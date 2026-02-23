// utils/pushNotifications.ts — FIREBASE ✅

import { auth, db } from "@/lib/firebase";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { doc, setDoc } from "firebase/firestore";

export async function registerForPushNotificationsAsync() {
  if (!Device.isDevice) {
    alert("Must use physical device for Push Notifications");
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    alert("Failed to get push token for push notification!");
    return null;
  }

  const token = (await Notifications.getExpoPushTokenAsync()).data;
  console.log("Push Token:", token);

  const user = auth.currentUser;
  if (user) {
    await setDoc(
      doc(db, "profiles", user.uid),
      { push_token: token },
      { merge: true },
    );
  }

  return token;
}
