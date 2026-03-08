// migrate.mjs — Full Supabase → Firestore migration
// Run: node migrate.mjs

import { createClient } from "@supabase/supabase-js";
import admin from "firebase-admin";
import { readFileSync } from "fs";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
require("dotenv").config({ path: ".env.migration" });

/* =========================================================
   INIT
========================================================= */

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false } },
);

const serviceAccount = JSON.parse(
  readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT_PATH, "utf8"),
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

/* =========================================================
   HELPERS
========================================================= */

// Firestore max batch size
const BATCH_SIZE = 400;

async function batchWrite(collection, rows, mapFn) {
  if (!rows.length) {
    console.log(`  ⏭  ${collection}: nothing to migrate`);
    return;
  }

  let count = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const chunk = rows.slice(i, i + BATCH_SIZE);
    const batch = db.batch();

    for (const row of chunk) {
      const { id, data } = mapFn(row);
      const ref = db.collection(collection).doc(id);
      batch.set(ref, data, { merge: true });
    }

    await batch.commit();
    count += chunk.length;
    console.log(`  ✅ ${collection}: ${count}/${rows.length}`);
  }
}

// Fetch all rows from a Supabase table (handles pagination)
async function fetchAll(table, select = "*") {
  const rows = [];
  let from = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .range(from, from + pageSize - 1);

    if (error) {
      console.warn(`  ⚠️  ${table} fetch error:`, error.message);
      break;
    }
    if (!data?.length) break;

    rows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  console.log(`  📦 Fetched ${rows.length} rows from ${table}`);
  return rows;
}

function toIso(val) {
  if (!val) return new Date().toISOString();
  const d = new Date(val);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function serverTs(isoString) {
  return admin.firestore.Timestamp.fromDate(new Date(isoString));
}

/* =========================================================
   PROFILES
========================================================= */

async function migrateProfiles() {
  console.log("\n👤 Migrating profiles...");
  const rows = await fetchAll("profiles");

  await batchWrite("profiles", rows, (row) => ({
    id: row.id, // same as Firebase Auth UID
    data: {
      username: row.username ?? "",
      username_lc: (row.username ?? "").toLowerCase(),
      full_name: row.full_name ?? null,
      bio: row.bio ?? null,
      avatar_url: row.avatar_url ?? null,
      banner_url: row.banner_url ?? null,
      website: row.website ?? null,
      location: row.location ?? null,
      is_private: row.is_private ?? false,
      is_verified: row.is_verified ?? false,
      is_suspended: row.is_suspended ?? false,
      role: row.role ?? "user",
      follower_count: row.follower_count ?? 0,
      following_count: row.following_count ?? 0,
      post_count: row.post_count ?? 0,
      created_at: toIso(row.created_at),
      updated_at: toIso(row.updated_at),
      created_at_ts: serverTs(toIso(row.created_at)),
    },
  }));
}

/* =========================================================
   POSTS
========================================================= */

async function migratePosts() {
  console.log("\n📝 Migrating posts...");
  const rows = await fetchAll("posts");

  await batchWrite("posts", rows, (row) => ({
    id: row.id,
    data: {
      user_id: row.user_id,
      title: row.title ?? null,
      content: row.content ?? "",
      media_urls: row.media_urls ?? [],
      post_type: row.post_type ?? "text",
      visibility: row.visibility ?? "public",
      is_visible: row.is_visible ?? true,
      community_id: row.community_id ?? null,
      hashtags: row.hashtags ?? [],
      like_count: row.like_count ?? row.likes_count ?? 0,
      comment_count: row.comment_count ?? row.comments_count ?? 0,
      share_count: row.share_count ?? row.shares_count ?? 0,
      poll: row.poll ?? null,
      created_at: toIso(row.created_at),
      updated_at: toIso(row.updated_at),
      created_at_ts: serverTs(toIso(row.created_at)),
      updated_at_ts: serverTs(toIso(row.updated_at)),
    },
  }));
}

/* =========================================================
   FOLLOWS
========================================================= */

async function migrateFollows() {
  console.log("\n👥 Migrating follows...");
  const rows = await fetchAll("follows");

  await batchWrite("follows", rows, (row) => ({
    // deterministic ID so re-runs are idempotent
    id: row.id ?? `${row.follower_id}_${row.following_id}`,
    data: {
      follower_id: row.follower_id,
      following_id: row.following_id,
      created_at: toIso(row.created_at),
      created_at_ts: serverTs(toIso(row.created_at)),
    },
  }));
}

/* =========================================================
   LIKES
========================================================= */

async function migrateLikes() {
  console.log("\n❤️  Migrating likes...");
  const rows = await fetchAll("likes");

  await batchWrite("likes", rows, (row) => ({
    id: row.id ?? `${row.user_id}_${row.post_id}`,
    data: {
      user_id: row.user_id,
      post_id: row.post_id,
      created_at: toIso(row.created_at),
      created_at_ts: serverTs(toIso(row.created_at)),
    },
  }));
}

/* =========================================================
   SAVES
========================================================= */

async function migrateSaves() {
  console.log("\n🔖 Migrating saves...");
  const rows = await fetchAll("saves");

  await batchWrite("saves", rows, (row) => ({
    id: row.id ?? `${row.user_id}_${row.post_id}`,
    data: {
      user_id: row.user_id,
      post_id: row.post_id,
      created_at: toIso(row.created_at),
      created_at_ts: serverTs(toIso(row.created_at)),
    },
  }));
}

/* =========================================================
   COMMENTS
========================================================= */

async function migrateComments() {
  console.log("\n💬 Migrating comments...");
  const rows = await fetchAll("comments");

  await batchWrite("comments", rows, (row) => ({
    id: row.id,
    data: {
      post_id: row.post_id,
      user_id: row.user_id,
      content: row.content ?? "",
      parent_id: row.parent_id ?? null,
      like_count: row.like_count ?? row.likes_count ?? 0,
      created_at: toIso(row.created_at),
      updated_at: toIso(row.updated_at ?? row.created_at),
      created_at_ts: serverTs(toIso(row.created_at)),
    },
  }));
}

/* =========================================================
   COMMUNITIES
========================================================= */

async function migrateCommunities() {
  console.log("\n🏘️  Migrating communities...");
  const rows = await fetchAll("communities");

  await batchWrite("communities", rows, (row) => ({
    id: row.id,
    data: {
      name: row.name ?? "",
      slug: row.slug ?? "",
      description: row.description ?? null,
      image_url: row.image_url ?? null,
      owner_id: row.owner_id ?? null,
      member_count: row.member_count ?? 0,
      is_private: row.is_private ?? false,
      created_at: toIso(row.created_at),
      updated_at: toIso(row.updated_at ?? row.created_at),
      created_at_ts: serverTs(toIso(row.created_at)),
    },
  }));
}

/* =========================================================
   COMMUNITY MEMBERS
========================================================= */

async function migrateCommunityMembers() {
  console.log("\n👪 Migrating community_members...");
  const rows = await fetchAll("community_members");

  await batchWrite("community_members", rows, (row) => ({
    id: row.id ?? `${row.community_id}_${row.user_id}`,
    data: {
      community_id: row.community_id,
      user_id: row.user_id,
      role: row.role ?? "member",
      created_at: toIso(row.created_at),
      created_at_ts: serverTs(toIso(row.created_at)),
    },
  }));
}

/* =========================================================
   STORIES
========================================================= */

async function migrateStories() {
  console.log("\n📸 Migrating stories...");
  const rows = await fetchAll("stories");

  // Only migrate non-expired stories
  const now = new Date();
  const active = rows.filter((r) => new Date(r.expires_at) > now);
  console.log(
    `  🗂  ${active.length} active (${rows.length - active.length} expired, skipping)`,
  );

  await batchWrite("stories", active, (row) => ({
    id: row.id,
    data: {
      user_id: row.user_id,
      media_url: row.media_url,
      media_type: row.media_type ?? "image",
      caption: row.caption ?? null,
      created_at: toIso(row.created_at),
      expires_at: toIso(row.expires_at),
      created_at_ts: serverTs(toIso(row.created_at)),
      expires_at_ts: serverTs(toIso(row.expires_at)),
    },
  }));
}

/* =========================================================
   NOTIFICATIONS
========================================================= */

async function migrateNotifications() {
  console.log("\n🔔 Migrating notifications...");
  const rows = await fetchAll("notifications");

  await batchWrite("notifications", rows, (row) => ({
    id: row.id,
    data: {
      receiver_id: row.receiver_id ?? row.user_id,
      sender_id: row.sender_id ?? null,
      type: row.type ?? "generic",
      post_id: row.post_id ?? null,
      comment_id: row.comment_id ?? null,
      is_read: row.is_read ?? false,
      message: row.message ?? null,
      created_at: toIso(row.created_at),
      created_at_ts: serverTs(toIso(row.created_at)),
    },
  }));
}

/* =========================================================
   MESSAGES & CHATS
========================================================= */

async function migrateChats() {
  console.log("\n💌 Migrating chats...");
  const rows = await fetchAll("chats");

  await batchWrite("chats", rows, (row) => ({
    id: row.id,
    data: {
      participant_ids: row.participant_ids ?? [],
      last_message: row.last_message ?? null,
      last_message_at: toIso(
        row.last_message_at ?? row.updated_at ?? row.created_at,
      ),
      created_at: toIso(row.created_at),
      updated_at: toIso(row.updated_at ?? row.created_at),
      updated_at_ts: serverTs(toIso(row.updated_at ?? row.created_at)),
    },
  }));
}

async function migrateMessages() {
  console.log("\n✉️  Migrating messages...");
  const rows = await fetchAll("messages");

  await batchWrite("messages", rows, (row) => ({
    id: row.id,
    data: {
      chat_id: row.chat_id,
      sender_id: row.sender_id ?? row.user_id,
      content: row.content ?? "",
      media_url: row.media_url ?? null,
      is_read: row.is_read ?? false,
      created_at: toIso(row.created_at),
      created_at_ts: serverTs(toIso(row.created_at)),
    },
  }));
}

/* =========================================================
   BLOCKS
========================================================= */

async function migrateBlocks() {
  console.log("\n🚫 Migrating blocks...");
  const rows = await fetchAll("blocks");

  await batchWrite("blocks", rows, (row) => ({
    id: row.id ?? `${row.blocker_id}_${row.blocked_id}`,
    data: {
      blocker_id: row.blocker_id,
      blocked_id: row.blocked_id,
      created_at: toIso(row.created_at),
      created_at_ts: serverTs(toIso(row.created_at)),
    },
  }));
}

/* =========================================================
   HASHTAGS
========================================================= */

async function migrateHashtags() {
  console.log("\n#️⃣  Migrating hashtags...");
  const rows = await fetchAll("hashtags");

  await batchWrite("hashtags", rows, (row) => ({
    id: row.id ?? row.tag,
    data: {
      tag: row.tag ?? row.name ?? "",
      post_count: row.post_count ?? row.count ?? 0,
      created_at: toIso(row.created_at),
    },
  }));
}

/* =========================================================
   MAIN
========================================================= */

async function main() {
  console.log("🚀 Starting Supabase → Firestore migration...\n");
  const start = Date.now();

  try {
    await migrateProfiles();
    await migratePosts();
    await migrateFollows();
    await migrateLikes();
    await migrateSaves();
    await migrateComments();
    await migrateCommunities();
    await migrateCommunityMembers();
    await migrateStories();
    await migrateNotifications();
    await migrateChats();
    await migrateMessages();
    await migrateBlocks();
    await migrateHashtags();

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`\n🎉 Migration complete in ${elapsed}s`);
  } catch (e) {
    console.error("\n❌ Migration failed:", e);
    process.exit(1);
  }
}

main();
