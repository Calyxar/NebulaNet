// scripts/reconcile-follow-counts.mjs
// Run: node scripts/reconcile-follow-counts.mjs
// Reconciles profile.follower_count / profile.following_count against the
// actual follows collection. Safe to run multiple times (idempotent).

import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";

const serviceAccount = JSON.parse(
  readFileSync("./serviceAccountKey.json", "utf8"),
);
initializeApp({ credential: cert(serviceAccount) });

const db = getFirestore();

async function main() {
  console.log("Scanning follows collection...");
  const followsSnap = await db.collection("follows").get();
  console.log(`Found ${followsSnap.size} follow docs`);

  const followerCounts = new Map(); // following_id -> accepted follower count
  const followingCounts = new Map(); // follower_id -> accepted following count
  let skippedPending = 0;
  let skippedMalformed = 0;

  for (const doc of followsSnap.docs) {
    const data = doc.data();
    if (data.status !== "accepted") {
      skippedPending++;
      continue;
    }
    const { follower_id, following_id } = data;
    if (!follower_id || !following_id) {
      skippedMalformed++;
      continue;
    }
    followerCounts.set(
      following_id,
      (followerCounts.get(following_id) ?? 0) + 1,
    );
    followingCounts.set(
      follower_id,
      (followingCounts.get(follower_id) ?? 0) + 1,
    );
  }

  console.log(
    `Accepted: ${followsSnap.size - skippedPending - skippedMalformed}, ` +
      `pending/other: ${skippedPending}, malformed: ${skippedMalformed}`,
  );

  console.log("\nScanning profiles collection...");
  const profilesSnap = await db.collection("profiles").get();
  console.log(`Found ${profilesSnap.size} profiles`);

  let updated = 0;
  let unchanged = 0;
  let batch = db.batch();
  let batchCount = 0;

  for (const doc of profilesSnap.docs) {
    const profile = doc.data();
    const correctFollowers = followerCounts.get(doc.id) ?? 0;
    const correctFollowing = followingCounts.get(doc.id) ?? 0;
    const currentFollowers = profile.follower_count ?? 0;
    const currentFollowing = profile.following_count ?? 0;

    if (
      correctFollowers === currentFollowers &&
      correctFollowing === currentFollowing
    ) {
      unchanged++;
      continue;
    }

    console.log(
      `${profile.username ?? doc.id}: ` +
        `followers ${currentFollowers}->${correctFollowers}, ` +
        `following ${currentFollowing}->${correctFollowing}`,
    );

    batch.update(doc.ref, {
      follower_count: correctFollowers,
      following_count: correctFollowing,
    });
    batchCount++;
    updated++;

    if (batchCount >= 400) {
      await batch.commit();
      batch = db.batch();
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  console.log(`\nDone. Updated: ${updated}, already correct: ${unchanged}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Reconciliation failed:", err);
  process.exit(1);
});
