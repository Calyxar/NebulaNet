// fix-post-user-ids.mjs
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";

const serviceAccount = JSON.parse(
  readFileSync("./serviceAccountKey.json", "utf8"),
);
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// firebase_users.json should be: { "supabase-uuid": "firebase-uid", ... }
const userMap = JSON.parse(readFileSync("./firebase_users.json", "utf8"));

async function fixPostUserIds() {
  const snap = await db.collection("posts").get();
  console.log(`Found ${snap.size} posts total`);

  let fixed = 0;
  let skipped = 0;
  let notFound = 0;

  const batch = db.batch();
  let batchCount = 0;

  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    const oldId = data.user_id;

    // Already a Firebase UID — skip
    if (!oldId || !oldId.includes("-")) {
      skipped++;
      continue;
    }

    const newUid = userMap[oldId];
    if (!newUid) {
      console.warn(
        `⚠️  No Firebase UID found for Supabase ID: ${oldId} (post: ${docSnap.id})`,
      );
      notFound++;
      continue;
    }

    batch.update(docSnap.ref, {
      user_id: newUid,
      "user.id": newUid,
    });

    fixed++;
    batchCount++;

    // Firestore batch limit is 500
    if (batchCount === 499) {
      await batch.commit();
      console.log(`✅ Committed batch of 499`);
      batchCount = 0;
    }
  }

  if (batchCount > 0) await batch.commit();

  console.log(`\n✅ Fixed: ${fixed}`);
  console.log(`⏭️  Skipped (already Firebase UID): ${skipped}`);
  console.log(`❌ Not found in map: ${notFound}`);
}

fixPostUserIds().catch(console.error);
