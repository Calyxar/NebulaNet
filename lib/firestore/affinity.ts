// lib/firestore/affinity.ts ✅
// Backs the "Not interested" post action. Stores per-user muted authors
// and muted hashtags, read by computeForYouRankedPool() in posts.ts to
// hard-exclude muted authors and soft-penalize muted topics when ranking
// the For You feed.

import firestore from "@react-native-firebase/firestore";

export type UserAffinity = {
  muted_authors: string[];
  muted_topics: string[];
};

const EMPTY_AFFINITY: UserAffinity = { muted_authors: [], muted_topics: [] };
export async function getUserAffinity(userId: string): Promise<UserAffinity> {
  const snap = await firestore().collection("user_affinity").doc(userId).get();
  if (!snap.exists()) return EMPTY_AFFINITY;
  const d = snap.data() as any;
  return {
    muted_authors: Array.isArray(d.muted_authors) ? d.muted_authors : [],
    muted_topics: Array.isArray(d.muted_topics) ? d.muted_topics : [],
  };
}

// Extracts #hashtags from post content, lowercased, no dupes.
function extractHashtags(content: string | null | undefined): string[] {
  if (!content) return [];
  const matches = content.match(/#[a-zA-Z0-9_]+/g) ?? [];
  return Array.from(new Set(matches.map((h) => h.slice(1).toLowerCase())));
}

// Marks a post's author (always) and its hashtags (if any) as
// not-interested. Uses arrayUnion so repeated taps on different posts by
// the same muted author, or with overlapping hashtags, don't create
// duplicates.
export async function markNotInterested(
  userId: string,
  authorId: string,
  postContent: string | null | undefined,
): Promise<void> {
  const hashtags = extractHashtags(postContent);
  await firestore()
    .collection("user_affinity")
    .doc(userId)
    .set(
      {
        muted_authors: firestore.FieldValue.arrayUnion(authorId),
        ...(hashtags.length > 0 && {
          muted_topics: firestore.FieldValue.arrayUnion(...hashtags),
        }),
        updated_at: firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
}

// ✅ Phase C — dwell-time signal (positive, implicit). Kept as its own
// subcollection rather than a field on user_affinity: view counts churn
// far more often than an explicit mute list (every scroll vs. an
// occasional tap), so writing them into the same doc as muted_authors/
// muted_topics would mean every view write risks clobbering a concurrent
// mute write (or vice versa) without a transaction. A per-author doc
// keyed by authorId avoids that entirely — each view just increments its
// own doc, independent of anything else in this collection.
//
// This is intentionally a much weaker signal than an explicit mute or
// like: it only means "this was in view for at least the configured
// minimumViewTime," not that the user liked or even read it closely.
export async function trackPostView(
  userId: string,
  authorId: string,
): Promise<void> {
  await firestore()
    .collection("user_affinity")
    .doc(userId)
    .collection("author_views")
    .doc(authorId)
    .set(
      {
        view_count: firestore.FieldValue.increment(1),
        last_viewed_at: firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
}

// Returns a Map of authorId -> view_count for the given user. Only
// fetches authors with at least MIN_VIEWS_FOR_SIGNAL views, since a
// single view is noise, not a signal — keeps the read small and the
// ranking boost meaningful rather than applying to every author a user
// has ever scrolled past once.
const MIN_VIEWS_FOR_SIGNAL = 3;

export async function getAuthorViewCounts(
  userId: string,
): Promise<Map<string, number>> {
  const snap = await firestore()
    .collection("user_affinity")
    .doc(userId)
    .collection("author_views")
    .where("view_count", ">=", MIN_VIEWS_FOR_SIGNAL)
    .get();

  const counts = new Map<string, number>();
  snap.docs.forEach((d) => {
    counts.set(d.id, (d.data() as any).view_count ?? 0);
  });
  return counts;
}

// ✅ NEW: generalized positive-signal recorder, called from
// hooks/useLikes.ts (on like) and lib/firestore/comments.ts (on
// comment) — same underlying idea as trackPostView's author_views
// counter above, just triggered by explicit actions (which are stronger
// signals than a passive view) rather than dwell time. Kept in the same
// author_views subcollection rather than a separate one, since both are
// ultimately "how much does this user engage with this author" signals
// feeding the same For You ranking boost — no need to duplicate the
// storage/read path for a difference that's really just "how it was
// triggered," not a different kind of data.
export async function recordAffinity(
  userId: string,
  authorId: string,
  _interactionType?: "like" | "comment" | "repost" | "save",
): Promise<void> {
  if (userId === authorId) return; // don't build affinity toward yourself
  await firestore()
    .collection("user_affinity")
    .doc(userId)
    .collection("author_views")
    .doc(authorId)
    .set(
      {
        view_count: firestore.FieldValue.increment(1),
        last_viewed_at: firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
}
