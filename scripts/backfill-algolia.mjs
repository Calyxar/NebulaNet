// scripts/backfill-algolia.mjs
// Run from project root:
//   node scripts/backfill-algolia.mjs

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { liteClient } from "algoliasearch/lite";
import { createReadStream } from "fs";
import { readFile } from "fs/promises";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import dotenv from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env.local") });

const ALGOLIA_APP_ID = process.env.EXPO_PUBLIC_ALGOLIA_APP_ID ?? "";
const ALGOLIA_ADMIN_KEY = process.env.ALGOLIA_ADMIN_KEY ?? "";

if (!ALGOLIA_APP_ID || !ALGOLIA_ADMIN_KEY) {
  console.error("Missing ALGOLIA_APP_ID or ALGOLIA_ADMIN_KEY in .env.local");
  process.exit(1);
}

// Use the algoliasearch package directly with fetch
async function algoliaRequest(indexName, objects) {
  const url = `https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/${indexName}/batch`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "X-Algolia-Application-Id": ALGOLIA_APP_ID,
      "X-Algolia-API-Key": ALGOLIA_ADMIN_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      requests: objects.map((obj) => ({ action: "addObject", body: obj })),
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Algolia batch failed: ${err}`);
  }
  return res.json();
}

// Load service account
const serviceAccountPath = join(__dirname, "../google-services.json");
let serviceAccount;
try {
  const raw = await readFile(serviceAccountPath, "utf8");
  // google-services.json is not a service account — try the Firebase admin SDK key instead
  // If you have a serviceAccountKey.json, point to that instead
  serviceAccount = JSON.parse(raw);
} catch {
  console.error(
    "Could not read google-services.json — for Firebase Admin SDK you need a service account key JSON file.",
    "\nDownload it from Firebase Console → Project Settings → Service Accounts → Generate new private key",
    "\nSave it as serviceAccountKey.json in your project root",
  );
  process.exit(1);
}

// Try serviceAccountKey.json first, fall back to env vars
let app;
try {
  const keyPath = join(__dirname, "../serviceAccountKey.json");
  const keyRaw = await readFile(keyPath, "utf8");
  const key = JSON.parse(keyRaw);
  app = initializeApp({ credential: cert(key) });
  console.log("Using serviceAccountKey.json for Firebase Admin SDK");
} catch {
  console.error(
    "Could not find serviceAccountKey.json.",
    "\nPlease download your Firebase service account key:",
    "\n  Firebase Console → Project Settings → Service Accounts → Generate new private key",
    "\nSave as serviceAccountKey.json in your project root, then re-run this script.",
  );
  process.exit(1);
}

const db = getFirestore(app);

async function backfillPosts() {
  console.log("Backfilling posts...");
  const snap = await db.collection("posts").get();
  const objects = snap.docs
    .filter((d) => d.data().is_visible !== false)
    .map((d) => {
      const data = d.data();
      return {
        objectID: d.id,
        content: data.content ?? "",
        title: data.title ?? "",
        hashtags: Array.isArray(data.hashtags) ? data.hashtags : [],
        user_id: data.user_id ?? null,
        username: data.user?.username ?? null,
        full_name: data.user?.full_name ?? null,
        community_id: data.community_id ?? null,
        visibility: data.visibility ?? "public",
        is_nsfw: data.is_nsfw === true,
        is_visible: true,
        media_urls: Array.isArray(data.media_urls) ? data.media_urls : [],
        created_at_ts: data.created_at_ts?.toMillis?.() ?? Date.now(),
      };
    });

  // Batch in chunks of 1000 (Algolia limit)
  for (let i = 0; i < objects.length; i += 1000) {
    const chunk = objects.slice(i, i + 1000);
    await algoliaRequest("posts", chunk);
    console.log(`  Posts: indexed ${Math.min(i + 1000, objects.length)}/${objects.length}`);
  }
  console.log(`Posts done: ${objects.length} records.`);
}

async function backfillProfiles() {
  console.log("Backfilling profiles...");
  const snap = await db.collection("profiles").get();
  const objects = snap.docs.map((d) => {
    const data = d.data();
    return {
      objectID: d.id,
      username: data.username ?? "",
      full_name: data.full_name ?? "",
      bio: data.bio ?? "",
      avatar_url: data.avatar_url ?? null,
      follower_count: data.follower_count ?? 0,
      is_private: data.is_private === true,
      is_suspended: data.is_suspended === true,
    };
  });

  for (let i = 0; i < objects.length; i += 1000) {
    const chunk = objects.slice(i, i + 1000);
    await algoliaRequest("profiles", chunk);
    console.log(`  Profiles: indexed ${Math.min(i + 1000, objects.length)}/${objects.length}`);
  }
  console.log(`Profiles done: ${objects.length} records.`);
}

async function backfillCommunities() {
  console.log("Backfilling communities...");
  const snap = await db.collection("communities").get();
  const objects = snap.docs.map((d) => {
    const data = d.data();
    return {
      objectID: d.id,
      name: data.name ?? "",
      slug: data.slug ?? "",
      description: data.description ?? "",
      member_count: data.member_count ?? 0,
      is_private: data.is_private === true,
    };
  });

  for (let i = 0; i < objects.length; i += 1000) {
    const chunk = objects.slice(i, i + 1000);
    await algoliaRequest("communities", chunk);
    console.log(`  Communities: indexed ${Math.min(i + 1000, objects.length)}/${objects.length}`);
  }
  console.log(`Communities done: ${objects.length} records.`);
}

console.log("Starting Algolia backfill...");
await backfillPosts();
await backfillProfiles();
await backfillCommunities();
console.log("Backfill complete.");
