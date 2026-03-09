// lib/revenuecat.ts
import { Platform } from "react-native";

/* ─────────────────────────────────────────
   SAFE REQUIRE
   react-native-purchases is a native module.
   It is NOT available in Expo Go — any call
   will throw. We require lazily so the JS
   bundle loads fine in Expo Go / web.
───────────────────────────────────────── */

function getPurchases() {
  try {
    const mod = require("react-native-purchases");
    const Purchases = mod?.default ?? mod;
    if (!Purchases || typeof Purchases.setLogLevel !== "function") return null;
    return Purchases;
  } catch {
    return null;
  }
}

/* ─────────────────────────────────────────
   INIT
───────────────────────────────────────── */

export async function initRevenueCat(userId: string) {
  if (!userId) return;

  const Purchases = getPurchases();
  if (!Purchases) {
    console.warn("RevenueCat: native module not available (Expo Go?)");
    return;
  }

  try {
    await Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
    await Purchases.configure({
      apiKey:
        Platform.OS === "ios"
          ? process.env.EXPO_PUBLIC_RC_IOS_KEY!
          : process.env.EXPO_PUBLIC_RC_ANDROID_KEY!,
      appUserID: userId,
    });
  } catch (e) {
    console.warn("RevenueCat init failed:", e);
  }
}

/* ─────────────────────────────────────────
   TYPES (light wrappers — avoids importing
   the native types at the module level)
───────────────────────────────────────── */

export type RCOffering = {
  identifier: string;
  availablePackages: RCPackage[];
};

export type RCPackage = {
  identifier: string;
  packageType: string;
  product: {
    identifier: string;
    priceString: string;
    price: number;
    currencyCode: string;
    title: string;
    description: string;
  };
};

export type RCCustomerInfo = {
  activeSubscriptions: string[];
  entitlements: { active: Record<string, any> };
  latestExpirationDate: string | null;
};

/* ─────────────────────────────────────────
   GET BOOST OFFERING
   Fetches the "boost" offering from
   RevenueCat. Falls back to the default
   offering if "boost" isn't configured.
   Returns null in Expo Go / dev builds
   without a native module.
───────────────────────────────────────── */

export async function getBoostOffering(): Promise<RCOffering | null> {
  const Purchases = getPurchases();
  if (!Purchases) return null;

  try {
    const offerings = await Purchases.getOfferings();

    // Prefer a dedicated "boost" offering; fall back to current (default)
    const boost: RCOffering | null =
      offerings?.all?.["boost"] ?? offerings?.current ?? null;

    return boost;
  } catch (e) {
    console.warn("RevenueCat getBoostOffering failed:", e);
    return null;
  }
}

/* ─────────────────────────────────────────
   PURCHASE BOOST PACKAGE
   Wraps Purchases.purchasePackage.
   Re-throws so the caller can distinguish
   user cancellation from real errors.
───────────────────────────────────────── */

export async function purchaseBoostPackage(
  pkg: RCPackage,
): Promise<RCCustomerInfo | null> {
  const Purchases = getPurchases();
  if (!Purchases) throw new Error("RevenueCat native module not available.");

  // purchasePackage returns { customerInfo, productIdentifier }
  const result = await Purchases.purchasePackage(pkg);
  return (result?.customerInfo as RCCustomerInfo) ?? null;
}

/* ─────────────────────────────────────────
   GET CUSTOMER INFO
   Useful for checking entitlements without
   triggering a purchase flow.
───────────────────────────────────────── */

export async function getCustomerInfo(): Promise<RCCustomerInfo | null> {
  const Purchases = getPurchases();
  if (!Purchases) return null;

  try {
    return (await Purchases.getCustomerInfo()) as RCCustomerInfo;
  } catch (e) {
    console.warn("RevenueCat getCustomerInfo failed:", e);
    return null;
  }
}
