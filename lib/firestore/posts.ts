// lib/firestore/posts.ts ✅
// ✅ FIXED: repost_count added to Post interface, docToPost, and createPost
// ✅ FIXED: getRepostFeedItems merges reposts into feed on first page

import type { MediaItem, MediaType } from "@/components/media/MediaUpload";
import { auth } from "@/lib/firebase";
import {
  decrementHashtagCounts,
  extractHashtags,
  indexHashtags,
} from "@/lib/firestore/hashtags";
import { detectLanguage } from "@/utils/detectLanguage";
import firestore, {
  FirebaseFirestoreTypes,
} from "@react-native-firebase/firestore";
import storage from "@react-native-firebase/storage";

/* =========================================================
   TYPES
========================================================= */

export type PostVisibility = "public" | "followers" | "private";
export type PostType = "text" | "image" | "video" | "mixed" | "poll";

export type ProfileRow = {
  id: string;
  username: string;
  full_name?: string | null;
  avatar_url?: string | null;
};

export type CommunityRow = {
  id: string;
  name: string;
  slug: string;
  avatar_url?: string | null;
};

export type PostLocation = {
  name: string;
  place_id: string;
};

export interface Post {
  id: string;
  user_id: string;
  title?: string | null;
  content: string;
  media_urls: string[];
  visibility: PostVisibility;
  community_id?: string | null;
  post_type?: PostType | null;
  is_visible?: boolean | null;
  hashtags?: string[];
  poll?: import("@/lib/firestore/polls").PollData | null;
  location?: PostLocation | null;
  like_count: number;
  comment_count: number;
  repost_count: number;
  share_count: number;
  created_at: string;
  updated_at: string;
  user: ProfileRow | null;
  community: CommunityRow | null;
  is_liked?: boolean;
  is_saved?: boolean;
  is_owned?: boolean;
}

export interface PostFilters {
  limit?: number;
  communitySlug?: string;
  communityIds?: string[];
  userIds?: string[];
  username?: string;
  userId?: string;
  hashtag?: string;
  visibility?: PostVisibility;
  sortBy?: "newest" | "popular" | "trending";
  language?: string | null;
  cursor?: { lastDocId?: string } | null;
}

export interface PaginatedPosts {
  posts: Post[];
  total: number;
  hasMore: boolean;
  nextCursor: PostFilters["cursor"];
}

export type CreatePostData = {
  title?: string;
  content: string;
  media?: MediaItem[];
  community_id?: string;
  visibility: PostVisibility;
  location?: PostLocation;
};

export type UpdatePostData = {
  title?: string | null;
  content?: string | null;
  media_urls?: string[] | null;
  visibility?: PostVisibility | null;
  community_id?: string | null;
  is_visible?: boolean | null;
  post_type?: PostType | null;
  location?: PostLocation | null;
};

/* =========================================================
   HELPERS
========================================================= */

const POST_MEDIA_TYPES: ReadonlySet<MediaType> = new Set([
  "image",
  "video",
  "gif",
]);

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function normalizeVisibility(v: any): PostVisibility {
  return v === "public" || v === "followers" || v === "private" ? v : "public";
}

function normalizePostType(p: { post_type?: any; media_urls?: any }): PostType {
  const t = p?.post_type;
  if (
    t === "text" ||
    t === "image" ||
    t === "video" ||
    t === "mixed" ||
    t === "poll"
  )
    return t;
  const urls = Array.isArray(p?.media_urls) ? (p.media_urls as string[]) : [];
  if (!urls.length) return "text";
  const hasVideo = urls.some((u) =>
    /\.(mp4|mov|m4v|webm|mkv|avi)$/i.test((u || "").split("?")[0] || ""),
  );
  if (hasVideo && urls.length > 1) return "mixed";
  if (hasVideo) return "video";
  return "image";
}

function tsToIso(ts: any): string {
  if (!ts) return new Date().toISOString();
  if (ts?.toDate) return ts.toDate().toISOString();
  if (ts?.seconds) return new Date(ts.seconds * 1000).toISOString();
  const d = new Date(ts);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function docToPost(id: string, d: any, extras?: Partial<Post>): Post {
  return {
    id,
    user_id: d.user_id,
    title: d.title ?? null,
    content: d.content ?? "",
    media_urls: Array.isArray(d.media_urls) ? d.media_urls : [],
    visibility: normalizeVisibility(d.visibility),
    community_id: d.community_id ?? null,
    post_type: normalizePostType(d),
    is_visible: typeof d.is_visible === "boolean" ? d.is_visible : true,
    hashtags: Array.isArray(d.hashtags) ? d.hashtags : [],
    poll: d.poll ?? null,
    location: d.location ?? null,
    like_count: typeof d.like_count === "number" ? d.like_count : 0,
    comment_count: typeof d.comment_count === "number" ? d.comment_count : 0,
    repost_count: typeof d.repost_count === "number" ? d.repost_count : 0,
    share_count: typeof d.share_count === "number" ? d.share_count : 0,
    created_at: tsToIso(d.created_at_ts ?? d.created_at),
    updated_at: tsToIso(d.updated_at_ts ?? d.updated_at),
    user: d.user ?? null,
    community: d.community ?? null,
    ...extras,
  };
}

async function resolveCommunityIdFromSlug(
  slug: string,
): Promise<string | null> {
  const s = slug.trim();
  if (!s) return null;
  const snap = await firestore()
    .collection("communities")
    .where("slug", "==", s)
    .limit(1)
    .get();
  return snap.docs[0]?.id ?? null;
}

async function resolveUserIdFromUsername(
  username: string,
): Promise<string | null> {
  const raw = username.trim();
  if (!raw) return null;
  const u = raw.toLowerCase();
  let snap = await firestore()
    .collection("profiles")
    .where("username_lc", "==", u)
    .limit(1)
    .get();
  if (!snap.empty) return snap.docs[0].id;
  snap = await firestore()
    .collection("profiles")
    .where("username", "==", raw)
    .limit(1)
    .get();
  return snap.docs[0]?.id ?? null;
}

async function getProfileSnapshot(uid: string): Promise<ProfileRow | null> {
  const snap = await firestore().collection("profiles").doc(uid).get();
  if (!snap.exists) return null;
  const d = snap.data() as any;
  return {
    id: uid,
    username: d.username ?? "",
    full_name: d.full_name ?? null,
    avatar_url: d.avatar_url ?? null,
  };
}

async function getCommunitySnapshot(
  communityId: string,
): Promise<CommunityRow | null> {
  const snap = await firestore()
    .collection("communities")
    .doc(communityId)
    .get();
  if (!snap.exists) return null;
  const d = snap.data() as any;
  return {
    id: communityId,
    name: d.name ?? "",
    slug: d.slug ?? "",
    avatar_url: d.avatar_url ?? d.image_url ?? null,
  };
}

/* =========================================================
   STORAGE UPLOAD
========================================================= */

function isRemoteUrl(u: string): boolean {
  return /^https?:\/\//i.test(u);
}

function guessExt(uri: string, fallback: string): string {
  const clean = uri.split("?")[0]?.split("#")[0] ?? uri;
  const last = clean.split(".").pop();
  if (!last || last.length > 8) return fallback;
  return last.toLowerCase();
}

function guessMimeType(ext: string, type: MediaType): string {
  if (type === "gif") return "image/gif";
  if (type === "video") return ext === "mov" ? "video/quicktime" : "video/mp4";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  return "image/jpeg";
}

function makeObjectPath(userId: string, ext: string): string {
  const rand = Math.random().toString(36).slice(2);
  return `post-media/${userId}/${Date.now()}-${rand}.${ext}`;
}

async function uploadMediaForPost(
  userId: string,
  media: MediaItem[] | undefined,
): Promise<string[]> {
  if (!media?.length) return [];
  const urls: string[] = [];
  for (const item of media) {
    if (!POST_MEDIA_TYPES.has(item.type)) continue;
    if (isRemoteUrl(item.uri)) {
      urls.push(item.uri);
      continue;
    }
    const fallbackExt =
      item.type === "video" ? "mp4" : item.type === "gif" ? "gif" : "jpg";
    const ext = guessExt(item.uri, fallbackExt);
    const mimeType = guessMimeType(ext, item.type);
    const path = makeObjectPath(userId, ext);
    const fileRef = storage().ref(path);
    await fileRef.putFile(item.uri, { contentType: mimeType });
    const dl = await fileRef.getDownloadURL();
    urls.push(dl);
  }
  return urls;
}

/* =========================================================
   LIKE/SAVE FLAGS
========================================================= */

async function fetchMyLikeSaveFlags(uid: string, postIds: string[]) {
  if (!uid || !postIds.length)
    return { liked: new Set<string>(), saved: new Set<string>() };
  const chunks = chunk(postIds, 10);
  const liked = new Set<string>();
  const saved = new Set<string>();
  await Promise.all([
    (async () => {
      for (const c of chunks) {
        const s = await firestore()
          .collection("likes")
          .where("user_id", "==", uid)
          .where("post_id", "in", c)
          .get();
        s.docs.forEach((d) => liked.add((d.data() as any).post_id));
      }
    })(),
    (async () => {
      for (const c of chunks) {
        const s = await firestore()
          .collection("saves")
          .where("user_id", "==", uid)
          .where("post_id", "in", c)
          .get();
        s.docs.forEach((d) => saved.add((d.data() as any).post_id));
      }
    })(),
  ]);
  return { liked, saved };
}

/* =========================================================
   REPOST FEED ITEMS
   ✅ Fetches posts the current user has reposted so they
   appear in their own feed with a "Reposted" label.
========================================================= */

async function getRepostFeedItems(uid: string, limit: number): Promise<Post[]> {
  try {
    const repostSnap = await firestore()
      .collection("reposts")
      .where("user_id", "==", uid)
      .orderBy("created_at_ts", "desc")
      .limit(limit)
      .get();

    if (repostSnap.empty) return [];

    const postIds = repostSnap.docs.map(
      (d) => (d.data() as any).post_id as string,
    );
    const repostedAtMap: Record<string, string> = {};
    repostSnap.docs.forEach((d) => {
      const data = d.data() as any;
      repostedAtMap[data.post_id] = data.created_at ?? new Date().toISOString();
    });

    const chunks2 = chunk(postIds, 10);
    const postDocs: Post[] = [];

    for (const c of chunks2) {
      const snap = await firestore()
        .collection("posts")
        .where(firestore.FieldPath.documentId(), "in", c)
        .get();
      snap.docs.forEach((d) => {
        if (!d.exists()) return;
        const data = d.data() as any;
        if (data.is_visible === false) return;
        const p = docToPost(d.id, data, {
          is_liked: false,
          is_saved: false,
          is_owned: data.user_id === uid,
        });
        // ✅ Tag so feed card can render "Reposted" label
        (p as any).is_repost = true;
        (p as any).reposted_at = repostedAtMap[d.id] ?? p.created_at;
        postDocs.push(p);
      });
    }

    return postDocs;
  } catch (e) {
    console.error("[getRepostFeedItems] error:", e);
    return [];
  }
}

/* =========================================================
   GET POSTS
========================================================= */

export async function getPosts(
  filters: PostFilters = {},
): Promise<PaginatedPosts> {
  const {
    limit = 20,
    communitySlug,
    communityIds,
    userIds,
    username,
    userId,
    hashtag,
    visibility,
    sortBy = "newest",
    language = null,
    cursor = null,
  } = filters;

  let resolvedCommunityIds = (communityIds ?? []).filter(Boolean);
  if (communitySlug && !resolvedCommunityIds.length) {
    const cid = await resolveCommunityIdFromSlug(communitySlug);
    if (cid) resolvedCommunityIds = [cid];
  }

  let resolvedUserId = userId ?? null;
  if (username && !resolvedUserId)
    resolvedUserId = await resolveUserIdFromUsername(username);

  let q: FirebaseFirestoreTypes.Query = firestore().collection("posts");

  if (resolvedCommunityIds.length)
    q = q.where("community_id", "in", resolvedCommunityIds.slice(0, 10));
  if (userIds && userIds.length > 0) {
    q = q.where("user_id", "in", userIds.slice(0, 30));
  } else if (resolvedUserId) {
    q = q.where("user_id", "==", resolvedUserId);
  }
  if (visibility) q = q.where("visibility", "==", visibility);
  if (hashtag)
    q = q.where(
      "hashtags",
      "array-contains",
      hashtag.toLowerCase().replace(/^#/, ""),
    );
  if (language && language !== "en") q = q.where("language", "==", language);

  if (sortBy === "trending") {
    const weekAgo = firestore.Timestamp.fromDate(
      new Date(Date.now() - 7 * 86400000),
    );
    q = q
      .where("created_at_ts", ">=", weekAgo)
      .orderBy("like_count", "desc")
      .orderBy("created_at_ts", "desc");
  } else if (sortBy === "popular") {
    q = q.orderBy("like_count", "desc").orderBy("created_at_ts", "desc");
  } else {
    q = q.orderBy("created_at_ts", "desc");
  }

  if (cursor?.lastDocId) {
    const lastSnap = await firestore()
      .collection("posts")
      .doc(cursor.lastDocId)
      .get();
    if (lastSnap.exists()) q = q.startAfter(lastSnap);
  }

  const snap = await q.limit(limit + 10).get();
  const viewerId = auth.currentUser?.uid ?? "";
  const raw = snap.docs
    .map((d) => docToPost(d.id, d.data()))
    .filter((p) => p.is_visible !== false)
    .slice(0, limit);
  const ids = raw.map((p) => p.id);
  const { liked, saved } = viewerId
    ? await fetchMyLikeSaveFlags(viewerId, ids)
    : { liked: new Set<string>(), saved: new Set<string>() };

  const posts = raw.map((p) =>
    docToPost(p.id, p, {
      is_liked: viewerId ? liked.has(p.id) : false,
      is_saved: viewerId ? saved.has(p.id) : false,
      is_owned: viewerId ? p.user_id === viewerId : false,
    }),
  );

  // ✅ On the first page only, merge in posts the viewer has reposted.
  // Pagination pages skip this to avoid duplicates.
  let merged = posts;
  if (viewerId && !cursor && !resolvedUserId && !resolvedCommunityIds.length) {
    const repostItems = await getRepostFeedItems(viewerId, limit);

    // Deduplicate — don't show a post twice if the user both owns and reposted it
    const ownPostIds = new Set(posts.map((p) => p.id));
    const newReposts = repostItems.filter((r) => !ownPostIds.has(r.id));

    if (newReposts.length > 0) {
      // Apply like/save flags to the repost items
      const repostIds = newReposts.map((p) => p.id);
      const { liked: rLiked, saved: rSaved } = await fetchMyLikeSaveFlags(
        viewerId,
        repostIds,
      );
      const flaggedReposts = newReposts.map((p) => ({
        ...p,
        is_liked: rLiked.has(p.id),
        is_saved: rSaved.has(p.id),
      }));

      // Sort combined feed: use reposted_at for reposts, created_at for originals
      merged = [...posts, ...flaggedReposts].sort((a, b) => {
        const aTime = (a as any).reposted_at ?? a.created_at;
        const bTime = (b as any).reposted_at ?? b.created_at;
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      });
    }
  }

  const last = snap.docs[snap.docs.length - 1];
  const nextCursor: PostFilters["cursor"] = last
    ? { lastDocId: last.id }
    : null;

  return {
    posts: merged,
    total: -1,
    hasMore: snap.docs.length >= limit,
    nextCursor,
  };
}

/* =========================================================
   GET SINGLE POST
========================================================= */

export async function getPostById(id: string): Promise<Post | null> {
  const clean = id?.trim();
  if (!clean) return null;
  const snap = await firestore().collection("posts").doc(clean).get();
  if (!snap.exists) return null;
  const d = snap.data() as any;
  if (d.is_visible === false) return null;
  const viewerId = auth.currentUser?.uid ?? "";
  let is_liked = false;
  let is_saved = false;
  if (viewerId) {
    const [likeSnap, saveSnap] = await Promise.all([
      firestore()
        .collection("likes")
        .where("user_id", "==", viewerId)
        .where("post_id", "==", clean)
        .limit(1)
        .get(),
      firestore()
        .collection("saves")
        .where("user_id", "==", viewerId)
        .where("post_id", "==", clean)
        .limit(1)
        .get(),
    ]);
    is_liked = !likeSnap.empty;
    is_saved = !saveSnap.empty;
  }
  return docToPost(snap.id, d, {
    is_liked,
    is_saved,
    is_owned: viewerId ? d.user_id === viewerId : false,
  });
}

/* =========================================================
   CREATE POST
========================================================= */

export async function createPost(
  postData: CreatePostData,
): Promise<Post | null> {
  const viewer = auth.currentUser;
  if (!viewer) throw new Error("User not authenticated");
  const uid = viewer.uid;
  const urls = await uploadMediaForPost(uid, postData.media);
  const hasVideo = urls.some((u) =>
    /\.(mp4|mov|m4v|webm|mkv|avi)$/i.test((u || "").split("?")[0] || ""),
  );
  const post_type: PostType = !urls.length
    ? "text"
    : hasVideo && urls.length > 1
      ? "mixed"
      : hasVideo
        ? "video"
        : "image";

  const textForDetection = [postData.title, postData.content]
    .filter(Boolean)
    .join(" ");
  const detectedLanguage = detectLanguage(textForDetection);
  const profileSnap = await getProfileSnapshot(uid);
  const communitySnap = postData.community_id
    ? await getCommunitySnapshot(postData.community_id)
    : null;
  const now = new Date().toISOString();
  const combinedText = [postData.title ?? "", postData.content].join(" ");
  const hashtags = extractHashtags(combinedText);

  const refDoc = await firestore()
    .collection("posts")
    .add({
      user_id: uid,
      title: postData.title ?? null,
      content: postData.content,
      community_id: postData.community_id ?? null,
      visibility: postData.visibility,
      media_urls: urls,
      post_type,
      is_visible: true,
      language: detectedLanguage ?? "en",
      location: postData.location ?? null,
      hashtags,
      like_count: 0,
      comment_count: 0,
      repost_count: 0,
      share_count: 0,
      user: profileSnap,
      community: communitySnap,
      created_at: now,
      updated_at: now,
      created_at_ts: firestore.FieldValue.serverTimestamp(),
      updated_at_ts: firestore.FieldValue.serverTimestamp(),
    });

  if (hashtags.length) {
    indexHashtags(hashtags).catch((e) =>
      console.warn("indexHashtags failed:", e),
    );
  }

  const createdSnap = await refDoc.get();
  if (!createdSnap.exists()) return null;
  return docToPost(createdSnap.id, createdSnap.data(), {
    is_owned: true,
    is_liked: false,
    is_saved: false,
  });
}

/* =========================================================
   UPDATE POST
========================================================= */

export async function updatePost(
  postId: string,
  patch: UpdatePostData,
): Promise<Post | null> {
  const viewer = auth.currentUser;
  if (!viewer) throw new Error("User not authenticated");
  const uid = viewer.uid;
  const refDoc = firestore().collection("posts").doc(postId);
  const snap = await refDoc.get();
  if (!snap.exists) return null;
  const d = snap.data() as any;
  if (d.user_id !== uid) throw new Error("Not allowed");

  let communitySnap: CommunityRow | null | undefined = undefined;
  if (patch.community_id !== undefined)
    communitySnap = patch.community_id
      ? await getCommunitySnapshot(patch.community_id)
      : null;

  let hashtagPatch: { hashtags?: string[] } = {};
  if (patch.content !== undefined && patch.content !== null) {
    const combinedText = [patch.title ?? d.title ?? "", patch.content].join(
      " ",
    );
    hashtagPatch = { hashtags: extractHashtags(combinedText) };
  }

  const now = new Date().toISOString();
  await refDoc.update({
    ...patch,
    ...hashtagPatch,
    ...(communitySnap !== undefined ? { community: communitySnap } : {}),
    updated_at: now,
    updated_at_ts: firestore.FieldValue.serverTimestamp(),
  });
  const updated = await refDoc.get();
  if (!updated.exists()) return null;
  return docToPost(updated.id, updated.data(), { is_owned: true });
}

/* =========================================================
   DELETE POST
========================================================= */

export async function deletePost(postId: string): Promise<boolean> {
  const viewer = auth.currentUser;
  if (!viewer) throw new Error("User not authenticated");
  const uid = viewer.uid;
  const refDoc = firestore().collection("posts").doc(postId);
  const snap = await refDoc.get();
  if (!snap.exists) return false;
  const d = snap.data() as any;
  if (d.user_id !== uid) throw new Error("Not allowed");

  const hashtags: string[] = Array.isArray(d.hashtags) ? d.hashtags : [];
  await refDoc.delete();

  if (hashtags.length) {
    decrementHashtagCounts(hashtags).catch((e) =>
      console.warn("decrementHashtagCounts failed:", e),
    );
  }

  return true;
}
