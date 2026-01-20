// lib/notifications.ts (optional utility file)
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// Configure notification handler for newer Expo versions
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

// Setup Android notification channel
export async function setupNotificationChannels() {
  if (Platform.OS === "android") {
    try {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Default",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#E6F4FE",
        sound: "mixkit_sci_fi_click_900.wav",
        enableVibrate: true,
        lockscreenVisibility:
          Notifications.AndroidNotificationVisibility.PUBLIC,
      });
    } catch (error) {
      console.error("Error setting up notification channel:", error);
    }
  }
}
