// scripts/backfill-algolia.ts ✅ FIXED for algoliasearch v5
// Run once from your project root:
//   npx ts-node scripts/backfill-algolia.ts
//
// Reads all existing posts, profiles, and communities from Firestore
// and pushes them into the corresponding Algolia indices.
// Safe to re-run — saveObjects() is idempotent (upsert).
//
// ✅ FIXED: this project has algoliasearch v5 installed (same issue
// already fixed once in scripts/algolia-sync-synonyms.ts) — v5 removed
// the default export (named export instead) and removed
// client.initIndex(name).saveObjects(objects) entirely in favor of
// client.saveObjects({ indexName, objects }) directly on the client.

import { algoliasearch } from "algoliasearch";
import * as dotenv from "dotenv";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

dotenv.config({ path: ".env.local" });

const serviceAccount = require("../google-services.json");

initializeApp({ credential: cert(serviceAccount) });

const db = getFirestore();

const ALGOLIA_APP_ID = process.env.EXPO_PUBLIC_ALGOLIA_APP_ID ?? "";
const ALGOLIA_ADMIN_KEY = process.env.ALGOLIA_ADMIN_KEY ?? "";

if (!ALGOLIA_APP_ID || !ALGOLIA_ADMIN_KEY) {
  console.error("Missing ALGOLIA_APP_ID or ALGOLIA_ADMIN_KEY in .env.local");
  process.exit(1);
}

const client = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY);

async function backfillPosts() {
  console.log("Backfilling posts...");
  const snap = await db.collection("posts").get();
  const objects = snap.docs
    .filter((d) => (d.data() as any).is_visible !== false)
    .map((d) => {
      const data = d.data() as any;
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
        created_at_ts: data.created_at_ts?.toMillis?.() ?? Date.now(),
      };
    });
  // ✅ FIX: v5 — client.saveObjects({ indexName, objects }), not
  // client.initIndex(name).saveObjects(objects).
  await client.saveObjects({ indexName: "posts", objects });
  console.log(`Posts: ${objects.length} records indexed.`);
}

async function backfillProfiles() {
  console.log("Backfilling profiles...");
  const snap = await db.collection("profiles").get();
  const objects = snap.docs.map((d) => {
    const data = d.data() as any;
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
  await client.saveObjects({ indexName: "profiles", objects });
  console.log(`Profiles: ${objects.length} records indexed.`);
}

async function backfillCommunities() {
  console.log("Backfilling communities...");
  const snap = await db.collection("communities").get();
  const objects = snap.docs.map((d) => {
    const data = d.data() as any;
    return {
      objectID: d.id,
      name: data.name ?? "",
      slug: data.slug ?? "",
      description: data.description ?? "",
      member_count: data.member_count ?? 0,
      is_private: data.is_private === true,
    };
  });
  await client.saveObjects({ indexName: "communities", objects });
  console.log(`Communities: ${objects.length} records indexed.`);
}

async function main() {
  console.log("Starting Algolia backfill...");
  await backfillPosts();
  await backfillProfiles();
  await backfillCommunities();
  console.log("Backfill complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
