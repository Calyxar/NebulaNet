// lib/firestore/affinity.ts — FOR YOU RANKING ✅
// Tracks how much a viewer interacts with each author they engage with.
// Used by the For You feed ranking algorithm as the "author affinity"
// signal — the single highest-value, cheapest-to-compute personalization
// signal (do you actually engage with this person's content).
//
// Design choices:
// - One doc per (viewer, author) pair, doc ID mirrors the existing
//   likes/{uid}_{postId} pattern for consistency: author_affinity/{viewerId}_{authorId}
// - Score only ever increases. Unliking/un-reposting does NOT decrease
//   affinity — a moment of hesitation or accidental double-tap shouldn't
//   erase a real signal of interest. This matches how real platforms
//   treat negative actions (they're a separate, distinct signal, not an
//   undo of the positive one).
// - Weighted by interaction type: comments and reposts signal more
//   genuine interest than a like (more effort = stronger signal), so
//   they're weighted higher.
// - Self-affinity is never recorded (liking/commenting on your own post
//   tells us nothing about who else you're interested in).

import { auth, db } from "@/lib/firebase";
import firestore from "@react-native-firebase/firestore";

export const AFFINITY_WEIGHTS = {
  like: 1,
  comment: 3,
  repost: 4,
} as const;

export type AffinityInteractionType = keyof typeof AFFINITY_WEIGHTS;

function affinityDocId(viewerId: string, authorId: string): string {
  return `${viewerId}_${authorId}`;
}

/**
 * Records that the current viewer interacted with the given author's
 * content. Fire-and-forget by design — affinity tracking should never
 * block or fail the actual like/comment/repost action it's recording.
 * Call this AFTER the real interaction write has already succeeded.
 */
export async function recordAffinity(
  authorId: string,
  type: AffinityInteractionType,
): Promise<void> {
  try {
    const viewer = auth.currentUser;
    if (!viewer) return;
    const viewerId = viewer.uid;

    // Don't track affinity toward yourself — it's not a useful signal
    // for "who else should we show you more of."
    if (viewerId === authorId) return;

    const weight = AFFINITY_WEIGHTS[type];
    const ref = db
      .collection("author_affinity")
      .doc(affinityDocId(viewerId, authorId));

    await ref.set(
      {
        viewer_id: viewerId,
        author_id: authorId,
        score: firestore.FieldValue.increment(weight),
        updated_at_ts: firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  } catch (err) {
    // ✅ Never let affinity tracking failures surface to the user or
    // interrupt the real interaction (like/comment/repost) they took.
    console.warn("recordAffinity failed (non-fatal):", err);
  }
}

/**
 * Fetches the viewer's affinity scores for a given set of author ids.
 * Returns a map of authorId -> score (0 if no affinity doc exists yet).
 * Used by the For You ranking algorithm to score candidate posts.
 */
export async function getAffinityScores(
  viewerId: string,
  authorIds: string[],
): Promise<Map<string, number>> {
  const scores = new Map<string, number>();
  if (!viewerId || authorIds.length === 0) return scores;

  const uniqueAuthorIds = Array.from(new Set(authorIds));

  // Firestore "in" queries cap at 10 — chunk like the rest of the codebase does
  const chunks: string[][] = [];
  for (let i = 0; i < uniqueAuthorIds.length; i += 10) {
    chunks.push(uniqueAuthorIds.slice(i, i + 10));
  }

  await Promise.all(
    chunks.map(async (chunk) => {
      try {
        const snap = await db
          .collection("author_affinity")
          .where("viewer_id", "==", viewerId)
          .where("author_id", "in", chunk)
          .get();
        snap.docs.forEach((d) => {
          const data = d.data() as any;
          if (data?.author_id && typeof data?.score === "number") {
            scores.set(data.author_id, data.score);
          }
        });
      } catch (err) {
        console.warn("getAffinityScores chunk failed:", err);
      }
    }),
  );

  return scores;
}
