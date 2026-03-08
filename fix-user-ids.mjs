// fix-user-ids.mjs
// Replaces old Supabase UIDs with Firebase Auth UIDs in posts
// Run: node fix-user-ids.mjs

import admin from "firebase-admin";
import { readFileSync } from "fs";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
require("dotenv").config({ path: ".env.migration" });

admin.initializeApp({
  credential: admin.credential.cert(
    JSON.parse(readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT_PATH, "utf8")),
  ),
});

const db = admin.firestore();

// 🔑 Map: supabase_uid → firebase_uid
const UID_MAP = {
  "063ba9d2-228d-454f-b987-05e4fd2d8242":
    "063ba9d2-228d-454f-b987-05e4fd2d8242",
};

const COLLECTIONS_WITH_USER_ID = [
  "posts",
  "follows",
  "likes",
  "saves",
  "comments",
  "community_members",
  "stories",
  "notifications",
  "blocks",
  "boosts",
];

async function fixCollection(collectionName) {
  const snap = await db.collection(collectionName).get();
  if (snap.empty) {
    console.log(`⏭  ${collectionName}: empty`);
    return;
  }

  let fixed = 0;
  const batch = db.batch();

  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    const updates = {};

    for (const field of [
      "user_id",
      "follower_id",
      "following_id",
      "receiver_id",
      "sender_id",
      "owner_id",
      "blocker_id",
      "blocked_id",
    ]) {
      if (data[field] && UID_MAP[data[field]]) {
        updates[field] = UID_MAP[data[field]];
      }
    }

    if (Object.keys(updates).length) {
      batch.update(docSnap.ref, updates);
      fixed++;
    }
  }

  await batch.commit();
  console.log(`✅ ${collectionName}: fixed ${fixed} docs`);
}

async function fixProfileDocId() {
  for (const [oldUid, newUid] of Object.entries(UID_MAP)) {
    if (oldUid === newUid) {
      console.log(`⏭  profiles: UIDs already match, skipping rename`);
      continue;
    }

    const oldRef = db.collection("profiles").doc(oldUid);
    const snap = await oldRef.get();

    if (!snap.exists) {
      console.log(`⏭  profile ${oldUid}: not found`);
      continue;
    }

    const data = snap.data();

    await db
      .collection("profiles")
      .doc(newUid)
      .set({ ...data, user_id: newUid }, { merge: true });

    await oldRef.delete();
    console.log(`✅ profiles: renamed ${oldUid} → ${newUid}`);
  }
}

async function main() {
  console.log("🔧 Fixing UIDs...\n");

  await fixProfileDocId();

  for (const col of COLLECTIONS_WITH_USER_ID) {
    await fixCollection(col);
  }

  console.log("\n🎉 Done!");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
