// scripts/backfill-hashtags.mjs
// One-time migration: extracts hashtags from post content/title and writes
// them back onto each post document + indexes them in the hashtags collection.
// Run with: node scripts/backfill-hashtags.mjs

import { cert, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const serviceAccount = require("../serviceAccountKey.json");

initializeApp({ credential: cert(serviceAccount) });

const db = getFirestore();

function extractHashtags(text) {
  if (!text) return [];
  const matches = text.match(/#[a-zA-Z0-9_]+/g) ?? [];
  return [
    ...new Set(matches.map((t) => t.toLowerCase().replace(/^#/, ""))),
  ].filter(Boolean);
}

async function backfill() {
  console.log("Fetching all posts...");
  const snap = await db.collection("posts").get();
  console.log(`Found ${snap.size} posts`);

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  const hashtagCounts = new Map();

  for (const doc of snap.docs) {
    try {
      const data = doc.data();

      // Skip posts that already have a non-empty hashtags array
      if (Array.isArray(data.hashtags) && data.hashtags.length > 0) {
        skipped++;
        continue;
      }

      const combined = [data.title ?? "", data.content ?? ""].join(" ");
      const hashtags = extractHashtags(combined);

      await doc.ref.update({ hashtags });

      // Tally counts for the hashtags collection
      for (const tag of hashtags) {
        hashtagCounts.set(tag, (hashtagCounts.get(tag) ?? 0) + 1);
      }

      updated++;
      if (updated % 50 === 0) console.log(`  Updated ${updated} posts...`);
    } catch (e) {
      console.error(`Error updating post ${doc.id}:`, e.message);
      errors++;
    }
  }

  console.log(
    `\nBackfilling hashtags collection (${hashtagCounts.size} unique tags)...`,
  );

  // Write hashtag counts in batches of 500
  const tags = Array.from(hashtagCounts.entries());
  for (let i = 0; i < tags.length; i += 500) {
    const batch = db.batch();
    for (const [tag, count] of tags.slice(i, i + 500)) {
      const ref = db.collection("hashtags").doc(tag);
      batch.set(
        ref,
        {
          tag,
          post_count: FieldValue.increment(count),
          week_count: FieldValue.increment(count),
          updated_at: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }
    await batch.commit();
  }

  console.log("\n--- Done ---");
  console.log(`Posts updated:  ${updated}`);
  console.log(`Posts skipped:  ${skipped} (already had hashtags)`);
  console.log(`Errors:         ${errors}`);
  console.log(`Unique tags indexed: ${hashtagCounts.size}`);
  process.exit(0);
}

backfill().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
