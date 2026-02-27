// lib/firestore/hashtags.ts
// Hashtag indexing, trending queries, and extraction

import { db } from "@/lib/firebase";
import {
    collection,
    doc,
    getDocs,
    increment,
    limit,
    orderBy,
    query,
    serverTimestamp,
    writeBatch,
} from "firebase/firestore";

const HASHTAGS = collection(db, "hashtags");

/* =====================================================
   TYPES
===================================================== */

export interface TrendingHashtag {
  tag: string;
  post_count: number;
  week_count: number;
}

/* =====================================================
   EXTRACT HASHTAGS FROM TEXT
===================================================== */

export function extractHashtags(text: string): string[] {
  const matches = text.match(/#[a-zA-Z0-9_]+/g) ?? [];
  return [
    ...new Set(matches.map((t) => t.toLowerCase().replace(/^#/, ""))),
  ].filter(Boolean);
}

/* =====================================================
   INDEX HASHTAGS (call on post create / update)
===================================================== */

/**
 * Increment counters for each tag in the `hashtags` collection.
 * Uses a batched write — safe for up to 30 unique tags per post.
 */
export async function indexHashtags(tags: string[]): Promise<void> {
  if (!tags.length) return;

  const unique = [
    ...new Set(tags.map((t) => t.toLowerCase().replace(/^#/, ""))),
  ].filter(Boolean);

  // Firestore batch supports up to 500 ops; 30 unique tags is well within limits
  const batch = writeBatch(db);

  for (const tag of unique) {
    const ref = doc(HASHTAGS, tag);
    batch.set(
      ref,
      {
        tag,
        post_count: increment(1),
        week_count: increment(1), // reset weekly via Cloud Function (optional)
        updated_at: serverTimestamp(),
      },
      { merge: true },
    );
  }

  await batch.commit();
}

/* =====================================================
   GET TRENDING HASHTAGS
===================================================== */

export async function getTrendingHashtags(
  limitN = 15,
): Promise<TrendingHashtag[]> {
  const q = query(HASHTAGS, orderBy("week_count", "desc"), limit(limitN));
  const snap = await getDocs(q);

  return snap.docs.map((d) => {
    const data = d.data() as any;
    return {
      tag: d.id,
      post_count: typeof data.post_count === "number" ? data.post_count : 0,
      week_count: typeof data.week_count === "number" ? data.week_count : 0,
    };
  });
}
