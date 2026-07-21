// functions/src/applyPostBoost.ts ✅ FIXED for Firebase Functions v2
// ✅ FIXED: this project uses the v2 Cloud Functions SDK
// (firebase-functions/v2/https), which has a different onCall signature
// than v1 — a single `request: CallableRequest<T>` parameter combining
// both auth and data, not separate (data, context) parameters. My
// original v1-style code left `context` typed as something invalid
// (hence "Property 'auth' does not exist on type 'CallableResponse'"),
// and `data` was actually inferred as the whole CallableRequest object,
// not a plain { postId } payload.
//
// Callable Cloud Function — the ONLY place that's allowed to set
// boosted_until/is_boosted on a post. Client-side code must never write
// those fields directly (enforced in firestore.rules too, as defense in
// depth — this function being the sole writer is the real guarantee,
// the rules are a backstop in case that's ever bypassed).
//
// Security model: a client completing a RevenueCat purchase proves
// nothing to Firestore by itself — RevenueCat's SDK finishing a purchase
// happens entirely on-device. Anyone with a valid login could otherwise
// just call firestore().collection("posts").doc(id).update({boosted_until})
// directly and get a free boost with no real payment. This function closes
// that gap by verifying the purchase against RevenueCat's server-side REST
// API (which only RevenueCat and Apple/Google's payment systems can
// produce), and by marking the specific transaction as consumed in
// Firestore so the same purchase can't be replayed to boost multiple
// posts or boost the same post twice.

import * as admin from "firebase-admin";
import {
  CallableRequest,
  HttpsError,
  onCall,
} from "firebase-functions/v2/https";

if (!admin.apps.length) admin.initializeApp();

// ✅ PLACEHOLDER — swap for your real production product ID once it's
// created and approved in App Store Connect / Google Play Console. Must
// match exactly what you set as the Product ID in both stores and what
// you configure as a Package in RevenueCat's Offerings.
const BOOST_PRODUCT_ID = "post_boost_24h";
const BOOST_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

// ✅ RevenueCat's server-side Secret API key — set via Firebase Functions
// config/secrets, NEVER as a plain env var committed anywhere, and
// completely separate from the client-facing public SDK key already in
// the app. Set with:
//   firebase functions:secrets:set REVENUECAT_SECRET_API_KEY
const REVENUECAT_SECRET_API_KEY = process.env.REVENUECAT_SECRET_API_KEY;

interface ApplyPostBoostData {
  postId: string;
}

interface RevenueCatNonSubscription {
  id: string; // transaction id — unique per purchase
  product_id: string;
  purchase_date: string;
  store: string;
}

interface RevenueCatSubscriberResponse {
  subscriber: {
    non_subscriptions: Record<string, RevenueCatNonSubscription[]>;
  };
}

interface PostDoc {
  user_id: string;
}

export const applyPostBoost = onCall(
  async (request: CallableRequest<ApplyPostBoostData>) => {
    // ── Auth check ──────────────────────────────────────────────────────
    if (!request.auth?.uid) {
      throw new HttpsError(
        "unauthenticated",
        "You must be signed in to boost a post.",
      );
    }
    const userId = request.auth.uid;
    const postId = request.data?.postId;

    if (!postId || typeof postId !== "string") {
      throw new HttpsError("invalid-argument", "postId is required.");
    }

    if (!REVENUECAT_SECRET_API_KEY) {
      console.error("REVENUECAT_SECRET_API_KEY is not configured.");
      throw new HttpsError(
        "internal",
        "Boost purchases are temporarily unavailable.",
      );
    }

    const db = admin.firestore();

    // ── Ownership check — you can only boost your own post ─────────────
    const postRef = db.collection("posts").doc(postId);
    const postSnap = await postRef.get();
    if (!postSnap.exists) {
      throw new HttpsError("not-found", "Post not found.");
    }
    const postData = postSnap.data() as PostDoc;
    if (postData.user_id !== userId) {
      throw new HttpsError(
        "permission-denied",
        "You can only boost your own posts.",
      );
    }

    // ── Verify a real, unredeemed purchase exists via RevenueCat's
    // server-side REST API ──────────────────────────────────────────────
    const encodedUserId = encodeURIComponent(userId);
    const rcResponse = await fetch(
      `https://api.revenuecat.com/v1/subscribers/${encodedUserId}`,
      {
        headers: {
          Authorization: `Bearer ${REVENUECAT_SECRET_API_KEY}`,
          Accept: "application/json",
        },
      },
    );

    if (!rcResponse.ok) {
      const errorText = await rcResponse.text().catch(() => "");
      console.error("RevenueCat API error:", rcResponse.status, errorText);
      throw new HttpsError(
        "internal",
        "Could not verify purchase. Please try again.",
      );
    }

    const rcData = (await rcResponse.json()) as RevenueCatSubscriberResponse;
    const boostTransactions =
      rcData.subscriber?.non_subscriptions?.[BOOST_PRODUCT_ID] ?? [];

    if (boostTransactions.length === 0) {
      throw new HttpsError(
        "failed-precondition",
        "No boost purchase found. Please purchase a boost first.",
      );
    }

    // ── Find a transaction that hasn't already been redeemed, using a
    // Firestore transaction so two simultaneous calls can't both claim
    // the same purchase (or the same post) ─────────────────────────────
    const usedBoostsRef = db.collection("used_boost_transactions");

    const result = await db.runTransaction(async (tx) => {
      // Sort newest-first so the most recent purchase gets used first —
      // arbitrary but deterministic, avoids always retrying the oldest
      // (possibly already-checked) one.
      const sorted = [...boostTransactions].sort(
        (a, b) =>
          new Date(b.purchase_date).getTime() -
          new Date(a.purchase_date).getTime(),
      );

      let claimedTransactionId: string | null = null;

      for (const txn of sorted) {
        const usedRef = usedBoostsRef.doc(txn.id);
        const usedSnap = await tx.get(usedRef);
        if (!usedSnap.exists) {
          claimedTransactionId = txn.id;
          tx.set(usedRef, {
            user_id: userId,
            post_id: postId,
            product_id: BOOST_PRODUCT_ID,
            redeemed_at: admin.firestore.FieldValue.serverTimestamp(),
          });
          break;
        }
      }

      if (!claimedTransactionId) {
        throw new HttpsError(
          "already-exists",
          "All your boost purchases have already been used. " +
            "Please purchase another boost.",
        );
      }

      const boostedUntil = admin.firestore.Timestamp.fromMillis(
        Date.now() + BOOST_DURATION_MS,
      );

      tx.update(postRef, {
        is_boosted: true,
        boosted_until: boostedUntil,
        boosted_at: admin.firestore.FieldValue.serverTimestamp(),
      });

      return { boostedUntil, transactionId: claimedTransactionId };
    });

    return {
      success: true,
      boostedUntilIso: result.boostedUntil.toDate().toISOString(),
    };
  },
);

