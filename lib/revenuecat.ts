// lib/revenuecat.ts
import { Platform } from "react-native";

export async function initRevenueCat(userId: string) {
  // RevenueCat requires a native build — skip in Expo Go
  if (!userId) return;

  try {
    const Purchases = require("react-native-purchases").default;
    // check native module exists before calling anything
    if (!Purchases || typeof Purchases.setLogLevel !== "function") return;

    await Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
    await Purchases.configure({
      apiKey:
        Platform.OS === "ios"
          ? process.env.EXPO_PUBLIC_RC_IOS_KEY!
          : process.env.EXPO_PUBLIC_RC_ANDROID_KEY!,
      appUserID: userId,
    });
  } catch (e) {
    console.warn(
      "RevenueCat init skipped (Expo Go or missing native module):",
      e,
    );
  }
}
