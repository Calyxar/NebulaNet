// lib/monetization/boostPost.ts ✅ NEW
// Client-side purchase flow for post boosts. This file does NOT write
// boosted_until/is_boosted to Firestore directly — it triggers the
// RevenueCat purchase, then calls the applyPostBoost Cloud Function,
// which is the only code path allowed to write those fields (see
// functions/src/applyPostBoost.ts for why).

import functions from "@react-native-firebase/functions";
import Purchases, {
  type PurchasesPackage,
} from "react-native-purchases";

// ✅ PLACEHOLDER — must match the Package identifier you configure in
// RevenueCat's Offerings (Offerings → default → Packages), which in turn
// wraps the real product ID (post_boost_24h) created in App Store
// Connect / Google Play Console.
const BOOST_PACKAGE_IDENTIFIER = "post_boost_24h";

export type BoostResult =
  | { status: "success"; boostedUntilIso: string }
  | { status: "cancelled" }
  | { status: "error"; message: string };

async function getBoostPackage(): Promise<PurchasesPackage | null> {
  const offerings = await Purchases.getOfferings();
  const pkg = offerings.current?.availablePackages.find(
    (p) => p.identifier === BOOST_PACKAGE_IDENTIFIER,
  );
  return pkg ?? null;
}

export async function purchasePostBoost(postId: string): Promise<BoostResult> {
  try {
    const pkg = await getBoostPackage();
    if (!pkg) {
      return {
        status: "error",
        message: "Boosts aren't available right now. Please try again later.",
      };
    }

    // ✅ This is the real, store-validated purchase — Apple/Google's
    // payment sheet, real money, can't be faked from the client.
    await Purchases.purchasePackage(pkg);

    // ✅ Purchase succeeded on-device, but that alone doesn't mean the
    // post gets boosted — the Cloud Function verifies this purchase
    // server-side against RevenueCat's REST API before writing anything.
    const applyBoost = functions().httpsCallable("applyPostBoost");
    const result = await applyBoost({ postId });
    const responseData = result.data as {
      success: boolean;
      boostedUntilIso: string;
    };

    return { status: "success", boostedUntilIso: responseData.boostedUntilIso };
  } catch (error: any) {
    // react-native-purchases sets userCancelled on the error when the
    // user backs out of the payment sheet — not a real error.
    if (error?.userCancelled) {
      return { status: "cancelled" };
    }
    console.error("Boost purchase failed:", error);
    return {
      status: "error",
      message:
        error?.message === "failed-precondition"
          ? "No boost purchase found. Please try purchasing again."
          : "Something went wrong. Please try again.",
    };
  }
}
