// utils/pushNotifications.ts
import { supabase } from "@/lib/supabase";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";

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

  // Store token in Supabase
  const user = await supabase.auth.getUser();
  if (user.data.user) {
    await supabase
      .from("profiles")
      .update({ push_token: token })
      .eq("id", user.data.user.id);
  }

  return token;
}
