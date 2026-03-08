// fix-posts-user.mjs
// Backfills the denormalized `user` field on migrated posts
// Run: node fix-posts-user.mjs

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

async function main() {
  console.log("🔧 Backfilling user snapshots on posts...\n");

  const postsSnap = await db.collection("posts").get();
  if (postsSnap.empty) {
    console.log("No posts found.");
    return;
  }

  // Collect unique user_ids
  const userIds = [
    ...new Set(postsSnap.docs.map((d) => d.data().user_id).filter(Boolean)),
  ];
  console.log(`Found ${postsSnap.size} posts from ${userIds.length} users`);

  // Fetch all profiles
  const profileMap = new Map();
  for (const uid of userIds) {
    const profileSnap = await db.collection("profiles").doc(uid).get();
    if (profileSnap.exists) {
      const d = profileSnap.data();
      profileMap.set(uid, {
        id: uid,
        username: d.username ?? "",
        full_name: d.full_name ?? null,
        avatar_url: d.avatar_url ?? null,
      });
      console.log(`  ✅ Found profile for ${uid}: @${d.username}`);
    } else {
      console.log(`  ⚠️  No profile found for ${uid}`);
    }
  }

  // Batch update posts
  const BATCH_SIZE = 400;
  const docs = postsSnap.docs;
  let fixed = 0;

  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const chunk = docs.slice(i, i + BATCH_SIZE);
    const batch = db.batch();

    for (const docSnap of chunk) {
      const data = docSnap.data();
      const userSnapshot = profileMap.get(data.user_id);

      if (userSnapshot) {
        batch.update(docSnap.ref, {
          user: userSnapshot,
          // Also ensure is_visible is set
          is_visible: data.is_visible ?? true,
        });
        fixed++;
      }
    }

    await batch.commit();
    console.log(
      `\n✅ Updated ${Math.min(i + BATCH_SIZE, docs.length)}/${docs.length} posts`,
    );
  }

  console.log(`\n🎉 Done! Backfilled user snapshots on ${fixed} posts.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
