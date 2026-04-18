// lib/firestore/hashtags.ts
// Hashtag indexing, trending queries, and extraction

import { db } from "@/lib/firebase";
import firestore from "@react-native-firebase/firestore";

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

export async function indexHashtags(tags: string[]): Promise<void> {
  if (!tags.length) return;

  const unique = [
    ...new Set(tags.map((t) => t.toLowerCase().replace(/^#/, ""))),
  ].filter(Boolean);

  const batch = db.batch();

  for (const tag of unique) {
    const ref = db.collection("hashtags").doc(tag);
    batch.set(
      ref,
      {
        tag,
        post_count: firestore.FieldValue.increment(1),
        week_count: firestore.FieldValue.increment(1),
        updated_at: firestore.FieldValue.serverTimestamp(),
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
  const snap = await db
    .collection("hashtags")
    .orderBy("week_count", "desc")
    .limit(limitN)
    .get();

  return snap.docs.map((d) => {
    const data = d.data() as any;
    return {
      tag: d.id,
      post_count: typeof data.post_count === "number" ? data.post_count : 0,
      week_count: typeof data.week_count === "number" ? data.week_count : 0,
    };
  });
}
