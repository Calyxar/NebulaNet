// lib/firestore/posts.ts — For You feed section ✅
// ✅ FIXED: getForYouFeed() used to fetch a large scored candidate pool
// but slice it down to one page and discard the rest, with no real
// pagination. Split into computeForYouRankedPool() (candidate fetch +
// scoring, returns the full pool) and sliceForYouFeedPage() (pure
// in-memory pagination via numeric cursor).
// ✅ NEW: computeForYouRankedPool now reads user_affinity and hard-
// excludes muted authors from the candidate pool entirely, and soft-
// penalizes (0.15x score) posts matching muted hashtags — see
// lib/firestore/affinity.ts.

import type { Post } from "@/hooks/useFeed";
import { getAuthorViewCounts, getUserAffinity } from "@/lib/firestore/affinity";
import firestore, {
  FirebaseFirestoreTypes,
} from "@react-native-firebase/firestore";
export type { Post };

export type PaginatedPosts = {
  posts: Post[];
  // ✅ Two different pagination strategies share this type: the For You
  // pool's sliceForYouFeedPage uses a numeric index; getPosts() below
  // uses Firestore's own document-cursor pagination. Broadened to accept
  // both rather than forcing one shape onto the other.
  nextCursor: number | FirebaseFirestoreTypes.QueryDocumentSnapshot | null;
  // ✅ NEW: lib/queries/posts.ts's adapter layer expects this — a plain
  // boolean equivalent of `nextCursor !== null`, convenient for callers
  // that just want a simple "is there more" check without inspecting
  // the cursor's shape.
  hasMore?: boolean;
  total?: number;
};

// Post doesn't natively carry these fields — the rest of the codebase
// already reads them via `(item as any).<field>` (see home.tsx's
// renderItem), confirming they're real Firestore fields that were just
// never added to the official Post interface. Representing them as an
// intersection here instead of pretending they're part of Post itself,
// rather than repeating the `as any` workaround.
type PostWithExtras = Post & {
  title?: string;
  poll?: unknown;
  repost_count: number;
  save_count: number;
  is_reposted: boolean;
  is_repost: boolean;
  quote_post_id?: string | null;
  quote_post?: unknown;
  // ✅ NEW: monetization — paid post boosts (see functions/src/applyPostBoost.ts).
  // Only ever set by that Cloud Function, never by client writes.
  is_boosted?: boolean;
  boosted_until?: string | null;
};

// Internal — a scored candidate before it's trimmed back down to a plain
// Post for the UI layer. `_score` never leaves this file.
type ScoredPost = PostWithExtras & { _score: number };

const RANKED_POOL_SIZE = 150;
const RECENT_CANDIDATE_LIMIT = 100;
const POPULAR_CANDIDATE_LIMIT = 60;
const FOLLOWING_CANDIDATE_LIMIT = 60;
// Penalty multiplier for posts matching a muted hashtag — soft, not a
// hard exclude, since hashtag matching is fuzzier than an explicit
// author mute and a false-positive shouldn't fully hide a post.
const MUTED_TOPIC_PENALTY = 0.15;

function tsToIso(ts: any): string {
  if (!ts) return new Date().toISOString();
  if (typeof ts?.toDate === "function") return ts.toDate().toISOString();
  return new Date(ts).toISOString();
}

function docToPost(
  doc: FirebaseFirestoreTypes.DocumentSnapshot,
): PostWithExtras {
  const x = doc.data() as any;
  return {
    id: doc.id,
    user_id: x.user_id,
    user: x.user ?? null,
    content: x.content ?? "",
    media_urls: Array.isArray(x.media_urls) ? x.media_urls : null,
    post_type: x.post_type ?? null,
    created_at: tsToIso(x.created_at_ts ?? x.created_at),
    // ✅ FIX: Post requires these — omitted before, which is why the
    // object literal couldn't convert to Post at all ("neither type
    // sufficiently overlaps with the other").
    updated_at: tsToIso(x.updated_at_ts ?? x.updated_at ?? x.created_at),
    visibility: x.visibility ?? "public",
    like_count: x.like_count ?? 0,
    comment_count: x.comment_count ?? 0,
    share_count: x.share_count ?? 0,
    // ✅ FIX: none of these are real Post fields (confirmed against
    // home.tsx's `(item as any).<field>` reads) — carried via the
    // PostWithExtras intersection instead of an invalid `as Post` cast.
    title: x.title ?? undefined,
    poll: x.poll ?? undefined,
    repost_count: x.repost_count ?? 0,
    save_count: x.save_count ?? 0,
    is_liked: x.is_liked ?? false,
    is_saved: x.is_saved ?? false,
    is_reposted: x.is_reposted ?? false,
    is_repost: x.is_repost ?? false,
    is_nsfw: x.is_nsfw ?? false,
    quote_post_id: x.quote_post_id ?? null,
    quote_post: x.quote_post ?? null,
    // ✅ NEW: monetization — paid post boosts
    is_boosted: x.is_boosted ?? false,
    boosted_until: x.boosted_until ? tsToIso(x.boosted_until) : null,
  };
}

function extractHashtags(content: string | null | undefined): string[] {
  if (!content) return [];
  return (content.match(/#[a-zA-Z0-9_]+/g) ?? []).map((h) =>
    h.slice(1).toLowerCase(),
  );
}

// ✅ NEW: true only while an active, non-expired boost is on the post.
// Checking the expiry client-side here (rather than trusting is_boosted
// alone) means an expired boost naturally stops affecting ranking
// without needing a separate cleanup job to flip is_boosted back to
// false — the flag can go stale, the timestamp check can't.
function hasActiveBoost(post: PostWithExtras): boolean {
  if (!post.is_boosted || !post.boosted_until) return false;
  return new Date(post.boosted_until).getTime() > Date.now();
}

// Recency-decayed engagement score. Half-life ~18h so a post's rank drops
// off meaningfully within a day, but a strong performer from yesterday can
// still beat a mediocre post from an hour ago.
function scorePost(post: PostWithExtras, followingBoost: boolean): number {
  const ageHours =
    (Date.now() - new Date(post.created_at).getTime()) / 3_600_000;
  const decay = Math.pow(0.5, ageHours / 18);

  const engagement =
    (post.like_count ?? 0) * 1 +
    (post.comment_count ?? 0) * 2 +
    (post.repost_count ?? 0) * 2.5 +
    (post.save_count ?? 0) * 1.5;

  const base = Math.log10(engagement + 1) * decay;
  const withFollowingBoost = followingBoost ? base * 1.4 : base;

  // ✅ NEW: paid boost — a strong, clearly-noticeable multiplier (3x),
  // deliberately much larger than the following-boost (1.4x) or the
  // view-count boost (max 1.2x) elsewhere in this file, since someone
  // paid real money specifically for increased visibility. Still
  // multiplicative rather than an override, though — a boosted post with
  // zero engagement and zero relevance doesn't jump to the very top of
  // everyone's feed; it gets a meaningful lift on top of whatever
  // baseline relevance it already has.
  return hasActiveBoost(post) ? withFollowingBoost * 3 : withFollowingBoost;
}

// Fetches candidates (recent, popular, and following-boosted), dedupes,
// and scores the FULL pool. Muted authors are excluded outright; posts
// matching a muted topic are kept but heavily penalized.
async function computeForYouRankedPool(userId?: string): Promise<ScoredPost[]> {
  const seen = new Map<string, ScoredPost>();

  const [recentSnap, popularSnap, affinity, viewCounts] = await Promise.all([
    firestore()
      .collection("posts")
      .orderBy("created_at_ts", "desc")
      .limit(RECENT_CANDIDATE_LIMIT)
      .get(),
    firestore()
      .collection("posts")
      .orderBy("like_count", "desc")
      .limit(POPULAR_CANDIDATE_LIMIT)
      .get(),
    userId
      ? getUserAffinity(userId)
      : Promise.resolve({ muted_authors: [], muted_topics: [] }),
    // ✅ Phase C: view-count-based positive signal, kept deliberately
    // separate from affinity — catches "reads without liking" behavior
    // (someone who reliably reads a given author's posts but has never
    // tapped like/repost/save on them), which the existing engagement-
    // based scoring can't see at all.
    userId ? getAuthorViewCounts(userId) : Promise.resolve(new Map()),
  ]);

  let followingIds: string[] = [];
  if (userId) {
    const followSnap = await firestore()
      .collection("follows")
      .where("follower_id", "==", userId)
      .where("status", "==", "accepted")
      .limit(500)
      .get();
    followingIds = followSnap.docs.map((d) => (d.data() as any).following_id);
  }

  let followingSnap: FirebaseFirestoreTypes.QuerySnapshot | null = null;
  if (followingIds.length > 0) {
    const chunk = followingIds.slice(0, 10); // Firestore "in" cap
    followingSnap = await firestore()
      .collection("posts")
      .where("user_id", "in", chunk)
      .orderBy("created_at_ts", "desc")
      .limit(FOLLOWING_CANDIDATE_LIMIT)
      .get();
  }

  const mutedAuthors = new Set(affinity.muted_authors);
  const mutedTopics = new Set(affinity.muted_topics);

  const addCandidates = (
    snap: FirebaseFirestoreTypes.QuerySnapshot,
    isFollowing: boolean,
  ) => {
    snap.docs.forEach((doc) => {
      if (seen.has(doc.id)) return; // first source to see a post wins

      // ✅ Hard-exclude muted authors — never enters the pool at all.
      const authorId = (doc.data() as any).user_id;
      if (mutedAuthors.has(authorId)) return;

      const post = docToPost(doc);
      let score = scorePost(post, isFollowing);

      // ✅ Soft-penalize muted topics rather than excluding.
      const postHashtags = extractHashtags(post.content);
      if (postHashtags.some((h) => mutedTopics.has(h))) {
        score *= MUTED_TOPIC_PENALTY;
      }

      // ✅ Phase C: small positive boost for authors this user views
      // often. Capped low (max +20%) and log-scaled so it can nudge the
      // ranking for an under-the-radar favorite author, but can never
      // outweigh real engagement signals (likes/comments/reposts) —
      // views are a much weaker signal than an explicit action.
      const viewCount = viewCounts.get(authorId) ?? 0;
      if (viewCount > 0) {
        const viewBoost = Math.min(0.2, Math.log10(viewCount + 1) * 0.08);
        score *= 1 + viewBoost;
      }

      seen.set(doc.id, { ...post, _score: score });
    });
  };

  addCandidates(recentSnap, false);
  addCandidates(popularSnap, false);
  if (followingSnap) addCandidates(followingSnap, true);

  return Array.from(seen.values())
    .sort((a, b) => b._score - a._score)
    .slice(0, RANKED_POOL_SIZE);
}

// Pure in-memory slice of an already-computed pool — no Firestore reads.
// `cursor` is just an index into the pool array.
function sliceForYouFeedPage(
  pool: ScoredPost[],
  cursor: number,
  pageSize: number,
): PaginatedPosts {
  const slice = pool.slice(cursor, cursor + pageSize);
  const posts: Post[] = slice.map(({ _score, ...post }) => post);
  const nextCursor = cursor + pageSize < pool.length ? cursor + pageSize : null;
  return { posts, nextCursor };
}

// ✅ NEW: CRUD functions + types — lib/queries/posts.ts (a react-query
// wrapper layer around this file), app/create/media.tsx, and
// app/create/quote.tsx all expect these to exist here.

export type CreatePostData = {
  user_id: string;
  content: string;
  title?: string;
  media_urls?: string[];
  post_type?: string;
  community_id?: string;
  quote_post_id?: string | null;
  // ✅ NEW: app/create/quote.tsx sends the full quoted-post object
  // alongside quote_post_id, matching Post's own quote_post field
  // elsewhere (PostWithExtras in this file) — likely a denormalized
  // snapshot so the quote card can render without a second fetch.
  quote_post?: unknown;
  hashtags?: string[];
  // ✅ NEW: app/create/quote.tsx sends this — matches Post's own
  // visibility field (see docToPost's `visibility: x.visibility ??
  // "public"`), which this type had never included before.
  visibility?: string;
};

export type UpdatePostData = Partial<
  Pick<
    CreatePostData,
    "content" | "title" | "media_urls" | "hashtags" | "visibility"
  >
>;

export type PostFilters = {
  userId?: string;
  communityId?: string;
  limit?: number;
  cursor?: FirebaseFirestoreTypes.QueryDocumentSnapshot | null;
};

export async function createPost(data: CreatePostData): Promise<string> {
  const ref = await firestore()
    .collection("posts")
    .add({
      user_id: data.user_id,
      content: data.content,
      title: data.title ?? null,
      media_urls: data.media_urls ?? null,
      post_type: data.post_type ?? "text",
      community_id: data.community_id ?? null,
      quote_post_id: data.quote_post_id ?? null,
      quote_post: data.quote_post ?? null,
      hashtags: data.hashtags ?? extractHashtags(data.content),
      // ✅ NEW
      visibility: data.visibility ?? "public",
      like_count: 0,
      comment_count: 0,
      share_count: 0,
      repost_count: 0,
      save_count: 0,
      is_nsfw: false,
      is_boosted: false,
      created_at: new Date().toISOString(),
      created_at_ts: firestore.FieldValue.serverTimestamp(),
      updated_at: new Date().toISOString(),
      updated_at_ts: firestore.FieldValue.serverTimestamp(),
    });
  return ref.id;
}

export async function updatePost(
  postId: string,
  data: UpdatePostData,
): Promise<void> {
  const updates: Record<string, unknown> = {
    ...data,
    updated_at: new Date().toISOString(),
    updated_at_ts: firestore.FieldValue.serverTimestamp(),
  };
  // Recompute hashtags if content changed and none were explicitly given.
  if (data.content && !data.hashtags) {
    updates.hashtags = extractHashtags(data.content);
  }
  await firestore().collection("posts").doc(postId).update(updates);
}

export async function deletePost(postId: string): Promise<void> {
  await firestore().collection("posts").doc(postId).delete();
}

export async function getPosts(
  filters: PostFilters = {},
): Promise<PaginatedPosts> {
  const pageSize = filters.limit ?? 20;
  let ref = firestore()
    .collection("posts")
    .orderBy("created_at_ts", "desc")
    .limit(pageSize);

  if (filters.userId) {
    ref = ref.where("user_id", "==", filters.userId) as any;
  }
  if (filters.communityId) {
    ref = ref.where("community_id", "==", filters.communityId) as any;
  }
  if (filters.cursor) {
    ref = ref.startAfter(filters.cursor) as any;
  }

  const snap = await ref.get();
  const posts = snap.docs.map((d) => docToPost(d));
  const lastDoc =
    snap.docs.length === pageSize ? snap.docs[snap.docs.length - 1] : null;

  return {
    posts,
    nextCursor: lastDoc,
    hasMore: lastDoc !== null,
  };
}

// ✅ NEW: fetches a single post by ID — backs app/create/boost.tsx, which
// needs to load/preview the post being boosted. Reuses docToPost so the
// returned shape is identical to every other post-reading path in this
// file (including the boost fields it presumably needs to check/display:
// is_boosted, boosted_until).
export async function getPostById(
  postId: string,
): Promise<PostWithExtras | null> {
  const snap = await firestore().collection("posts").doc(postId).get();
  if (!snap.exists()) return null;
  return docToPost(snap);
}

export const forYouFeed = {
  computeForYouRankedPool,
  sliceForYouFeedPage,
};
