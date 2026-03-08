// lib/firestore/posts.ts — FIREBASE ✅ (COMPLETED + UPDATED)
// ✅ Removed where("is_visible", "==", true) from Firestore query
//    — was causing silent 0 results (requires composite index with orderBy)
// ✅ Filter is_visible in JS after fetch instead
// ✅ communityIds filter (Firestore "in" limit respected)
// ✅ media_urls + visibility + post_type
// ✅ newest / popular / trending
// ✅ returns is_liked / is_saved / is_owned for current user
// ✅ cursor pagination for infinite feed
// ✅ Boost injection on first page
// ✅ uploadString base64 — works in Expo Go and production builds
// ✅ Android content:// URI copy before read

import type { MediaItem, MediaType } from "@/components/media/MediaUpload";
import { auth, db, storage } from "@/lib/firebase";
import { getActiveBoostsPostIds } from "@/lib/firestore/boosts";
import * as FileSystemLegacy from "expo-file-system/legacy";
import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  limit as fsLimit,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  updateDoc,
  where,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadString } from "firebase/storage";

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

  like_count: number;
  comment_count: number;
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

  username?: string;
  userId?: string;

  hashtag?: string;

  visibility?: PostVisibility;
  sortBy?: "newest" | "popular" | "trending";

  cursor?: {
    lastDocId?: string;
  } | null;
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
};

export type UpdatePostData = {
  title?: string | null;
  content?: string | null;
  media_urls?: string[] | null;
  visibility?: PostVisibility | null;
  community_id?: string | null;
  is_visible?: boolean | null;
  post_type?: PostType | null;
};

/* =========================================================
   COLLECTION REFS
========================================================= */

const POSTS = collection(db, "posts");
const PROFILES = collection(db, "profiles");
const COMMUNITIES = collection(db, "communities");
const LIKES = collection(db, "likes");
const SAVES = collection(db, "saves");

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
  if (ts instanceof Timestamp) return ts.toDate().toISOString();
  const d = new Date(ts);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function docToPost(id: string, d: any, extras?: Partial<Post>): Post {
  const createdIso = tsToIso(d.created_at_ts ?? d.created_at);
  const updatedIso = tsToIso(d.updated_at_ts ?? d.updated_at);

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
    like_count: typeof d.like_count === "number" ? d.like_count : 0,
    comment_count: typeof d.comment_count === "number" ? d.comment_count : 0,
    share_count: typeof d.share_count === "number" ? d.share_count : 0,
    created_at: createdIso,
    updated_at: updatedIso,
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
  const q = query(COMMUNITIES, where("slug", "==", s), fsLimit(1));
  const snap = await getDocs(q);
  return snap.docs[0]?.id ?? null;
}

async function resolveUserIdFromUsername(
  username: string,
): Promise<string | null> {
  const raw = username.trim();
  if (!raw) return null;

  const u = raw.toLowerCase();

  let q = query(PROFILES, where("username_lc", "==", u), fsLimit(1));
  let snap = await getDocs(q);
  if (!snap.empty) return snap.docs[0].id;

  q = query(PROFILES, where("username", "==", raw), fsLimit(1));
  snap = await getDocs(q);
  return snap.docs[0]?.id ?? null;
}

async function getProfileSnapshot(uid: string): Promise<ProfileRow | null> {
  const snap = await getDoc(doc(db, "profiles", uid));
  if (!snap.exists()) return null;
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
  const snap = await getDoc(doc(db, "communities", communityId));
  if (!snap.exists()) return null;
  const d = snap.data() as any;
  return {
    id: communityId,
    name: d.name ?? "",
    slug: d.slug ?? "",
    avatar_url: d.avatar_url ?? d.image_url ?? null,
  };
}

/* =========================================================
   STORAGE UPLOAD (Firebase Storage)
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
    const path = makeObjectPath(userId, ext);
    const storageRef = ref(storage, path);

    let readUri = item.uri;

    // ✅ Android content:// URIs must be copied to a local file first
    if (item.uri.startsWith("content://")) {
      const localPath = `${FileSystemLegacy.cacheDirectory}upload-${Date.now()}.${ext}`;
      await FileSystemLegacy.copyAsync({ from: item.uri, to: localPath });
      readUri = localPath;
    }

    // ✅ Upload as base64 string — works in Expo Go and production builds
    const base64 = await FileSystemLegacy.readAsStringAsync(readUri, {
      encoding: "base64" as any,
    });
    await uploadString(storageRef, base64, "base64");

    const dl = await getDownloadURL(storageRef);
    urls.push(dl);
  }

  return urls;
}

/* =========================================================
   LIKE/SAVE FLAGS (batch for list)
========================================================= */

async function fetchMyLikeSaveFlags(uid: string, postIds: string[]) {
  if (!uid || !postIds.length) {
    return { liked: new Set<string>(), saved: new Set<string>() };
  }

  const chunks = chunk(postIds, 10);
  const liked = new Set<string>();
  const saved = new Set<string>();

  await Promise.all([
    (async () => {
      for (const c of chunks) {
        const q1 = query(
          LIKES,
          where("user_id", "==", uid),
          where("post_id", "in", c),
        );
        const s1 = await getDocs(q1);
        s1.docs.forEach((d) => liked.add((d.data() as any).post_id));
      }
    })(),
    (async () => {
      for (const c of chunks) {
        const q2 = query(
          SAVES,
          where("user_id", "==", uid),
          where("post_id", "in", c),
        );
        const s2 = await getDocs(q2);
        s2.docs.forEach((d) => saved.add((d.data() as any).post_id));
      }
    })(),
  ]);

  return { liked, saved };
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
    username,
    userId,
    hashtag,
    visibility,
    sortBy = "newest",
    cursor = null,
  } = filters;

  let resolvedCommunityIds = (communityIds ?? []).filter(Boolean);
  if (communitySlug && !resolvedCommunityIds.length) {
    const cid = await resolveCommunityIdFromSlug(communitySlug);
    if (cid) resolvedCommunityIds = [cid];
  }

  let resolvedUserId = userId ?? null;
  if (username && !resolvedUserId) {
    resolvedUserId = await resolveUserIdFromUsername(username);
  }

  // ✅ No where("is_visible", "==", true) here — that field + orderBy("created_at_ts")
  // requires a composite Firestore index that doesn't exist, causing silent 0 results.
  // We filter is_visible in JS below instead.
  const wheres: any[] = [];

  if (resolvedCommunityIds.length) {
    wheres.push(where("community_id", "in", resolvedCommunityIds.slice(0, 10)));
  }

  if (resolvedUserId) wheres.push(where("user_id", "==", resolvedUserId));
  if (visibility) wheres.push(where("visibility", "==", visibility));
  if (hashtag)
    wheres.push(
      where(
        "hashtags",
        "array-contains",
        hashtag.toLowerCase().replace(/^#/, ""),
      ),
    );

  const extra: any[] = [];
  if (sortBy === "trending") {
    const weekAgo = Timestamp.fromDate(new Date(Date.now() - 7 * 86400000));
    extra.push(where("created_at_ts", ">=", weekAgo));
    extra.push(orderBy("like_count", "desc"));
    extra.push(orderBy("created_at_ts", "desc"));
  } else if (sortBy === "popular") {
    extra.push(orderBy("like_count", "desc"));
    extra.push(orderBy("created_at_ts", "desc"));
  } else {
    extra.push(orderBy("created_at_ts", "desc"));
  }

  let qBase = query(POSTS, ...wheres, ...extra);

  if (cursor?.lastDocId) {
    const lastSnap = await getDoc(doc(db, "posts", cursor.lastDocId));
    if (lastSnap.exists()) qBase = query(qBase, startAfter(lastSnap));
  }

  // ✅ Fetch slightly more than limit to account for is_visible filtering in JS
  const snap = await getDocs(query(qBase, fsLimit(limit + 10)));

  const viewerId = auth.currentUser?.uid ?? "";

  // ✅ Filter is_visible in JS — avoids the composite index requirement
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

  const last = snap.docs[snap.docs.length - 1];
  const nextCursor: PostFilters["cursor"] = last
    ? { lastDocId: last.id }
    : null;

  // ✅ Boost injection — only on first page (no cursor)
  if (!cursor) {
    try {
      const boostedIds = await getActiveBoostsPostIds();
      if (boostedIds.length > 0) {
        const boosted = posts.filter((p) => boostedIds.includes(p.id));
        const normal = posts.filter((p) => !boostedIds.includes(p.id));
        return {
          posts: [...boosted, ...normal],
          total: -1,
          hasMore: snap.docs.length >= limit,
          nextCursor,
        };
      }
    } catch {
      // boost fetch failed — fall through to normal return
    }
  }

  return {
    posts,
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

  const snap = await getDoc(doc(db, "posts", clean));
  if (!snap.exists()) return null;

  const d = snap.data() as any;
  if (d.is_visible === false) return null;

  const viewerId = auth.currentUser?.uid ?? "";

  let is_liked = false;
  let is_saved = false;

  if (viewerId) {
    const [likeSnap, saveSnap] = await Promise.all([
      getDocs(
        query(
          LIKES,
          where("user_id", "==", viewerId),
          where("post_id", "==", clean),
          fsLimit(1),
        ),
      ),
      getDocs(
        query(
          SAVES,
          where("user_id", "==", viewerId),
          where("post_id", "==", clean),
          fsLimit(1),
        ),
      ),
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

  const profileSnap = await getProfileSnapshot(uid);
  const communitySnap = postData.community_id
    ? await getCommunitySnapshot(postData.community_id)
    : null;

  const now = new Date().toISOString();

  const refDoc = await addDoc(POSTS, {
    user_id: uid,
    title: postData.title ?? null,
    content: postData.content,
    community_id: postData.community_id ?? null,
    visibility: postData.visibility,
    media_urls: urls,
    post_type,
    is_visible: true,

    like_count: 0,
    comment_count: 0,
    share_count: 0,

    user: profileSnap,
    community: communitySnap,

    created_at: now,
    updated_at: now,
    created_at_ts: serverTimestamp(),
    updated_at_ts: serverTimestamp(),
  });

  const createdSnap = await getDoc(refDoc);
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

  const refDoc = doc(db, "posts", postId);
  const snap = await getDoc(refDoc);
  if (!snap.exists()) return null;

  const d = snap.data() as any;
  if (d.user_id !== uid) throw new Error("Not allowed");

  let communitySnap: CommunityRow | null | undefined = undefined;
  if (patch.community_id !== undefined) {
    communitySnap = patch.community_id
      ? await getCommunitySnapshot(patch.community_id)
      : null;
  }

  const now = new Date().toISOString();

  await updateDoc(refDoc, {
    ...patch,
    ...(communitySnap !== undefined ? { community: communitySnap } : {}),
    updated_at: now,
    updated_at_ts: serverTimestamp(),
  });

  const updated = await getDoc(refDoc);
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

  const refDoc = doc(db, "posts", postId);
  const snap = await getDoc(refDoc);
  if (!snap.exists()) return false;

  const d = snap.data() as any;
  if (d.user_id !== uid) throw new Error("Not allowed");

  await deleteDoc(refDoc);
  return true;
}
