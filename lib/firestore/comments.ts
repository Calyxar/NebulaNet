// lib/firestore/comments.ts — UPDATED ✅
// ✅ FIXED: removed orderBy("created_at_ts") — requires a composite index that
//           doesn't exist, causing getComments to silently return 0 results
// ✅ Sort is now done in JS after fetch — works without any index

import { auth, db } from "@/lib/firebase";
import firestore from "@react-native-firebase/firestore";

type ProfileRow = {
  id: string;
  username: string;
  full_name?: string | null;
  avatar_url?: string | null;
};

export type CommentWithAuthor = {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  parent_id?: string | null;
  likes_count: number;
  user_has_liked: boolean;
  author: ProfileRow | null;
  replies?: CommentWithAuthor[];
};

async function getProfileSnapshot(uid: string): Promise<ProfileRow | null> {
  const snap = await db.collection("profiles").doc(uid).get();
  if (!snap.exists()) return null;
  const d = snap.data() as any;
  return {
    id: uid,
    username: d.username ?? "",
    full_name: d.full_name ?? null,
    avatar_url: d.avatar_url ?? null,
  };
}

function tsToIso(ts: any): string {
  if (!ts) return new Date().toISOString();
  if (ts instanceof firestore.Timestamp) return ts.toDate().toISOString();
  return new Date(ts).toISOString();
}

async function fetchLikedCommentIds(uid: string, commentIds: string[]) {
  const liked = new Set<string>();
  if (!uid || !commentIds.length) return liked;
  for (let i = 0; i < commentIds.length; i += 30) {
    const chunk = commentIds.slice(i, i + 30);
    const snap = await db
      .collection("comment_likes")
      .where("user_id", "==", uid)
      .where("comment_id", "in", chunk)
      .get();
    snap.docs.forEach((d) => liked.add((d.data() as any).comment_id));
  }
  return liked;
}

export async function getComments(
  postId: string,
): Promise<CommentWithAuthor[]> {
  const clean = postId?.trim();
  if (!clean) return [];

  // ✅ FIXED: no orderBy — avoids missing composite index error
  const snap = await db
    .collection("comments")
    .where("post_id", "==", clean)
    .get();

  const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));

  // ✅ Sort by created_at in JS instead
  rows.sort((a, b) => {
    const aTime =
      a.created_at_ts?.toMillis?.() ?? new Date(a.created_at ?? 0).getTime();
    const bTime =
      b.created_at_ts?.toMillis?.() ?? new Date(b.created_at ?? 0).getTime();
    return aTime - bTime;
  });

  const uid = auth.currentUser?.uid ?? "";
  const ids = rows.map((r) => r.id);
  const likedSet = uid
    ? await fetchLikedCommentIds(uid, ids)
    : new Set<string>();

  const normalized: CommentWithAuthor[] = rows.map((r) => ({
    id: r.id,
    post_id: r.post_id,
    user_id: r.user_id,
    content: r.content ?? "",
    created_at: tsToIso(r.created_at_ts ?? r.created_at),
    parent_id: r.parent_id ?? null,
    likes_count: typeof r.like_count === "number" ? r.like_count : 0,
    user_has_liked: uid ? likedSet.has(r.id) : false,
    author: r.author ?? null,
    replies: [],
  }));

  // Build reply tree
  const byId = new Map(normalized.map((c) => [c.id, c]));
  const top: CommentWithAuthor[] = [];
  for (const c of normalized) {
    if (c.parent_id && byId.has(c.parent_id)) {
      byId.get(c.parent_id)!.replies!.push(c);
    } else {
      top.push(c);
    }
  }

  return top;
}

export async function addComment(input: {
  post_id: string;
  content: string;
  parent_id?: string | null;
}) {
  const viewer = auth.currentUser;
  if (!viewer) throw new Error("Not authenticated");

  const uid = viewer.uid;
  const now = new Date().toISOString();
  const author = await getProfileSnapshot(uid);

  const refDoc = await db.collection("comments").add({
    post_id: input.post_id,
    user_id: uid,
    content: input.content,
    parent_id: input.parent_id ?? null,
    like_count: 0,
    author,
    created_at: now,
    created_at_ts: firestore.FieldValue.serverTimestamp(),
  });

  return { id: refDoc.id };
}

export async function toggleCommentLike(input: {
  commentId: string;
  postId: string;
  isLiked: boolean;
}) {
  const viewer = auth.currentUser;
  if (!viewer) throw new Error("Not authenticated");

  const uid = viewer.uid;
  const likeId = `${uid}_${input.commentId}`;
  const likeRef = db.collection("comment_likes").doc(likeId);
  const cRef = db.collection("comments").doc(input.commentId);

  if (input.isLiked) {
    const cSnap = await cRef.get();
    if (cSnap.exists()) {
      const d = cSnap.data() as any;
      const cur = typeof d.like_count === "number" ? d.like_count : 0;
      await Promise.all([
        likeRef.delete(),
        cRef.update({ like_count: Math.max(0, cur - 1) }),
      ]);
    } else {
      await likeRef.delete();
    }
  } else {
    const cSnap = await cRef.get();
    const d = cSnap.exists() ? (cSnap.data() as any) : {};
    const cur = typeof d.like_count === "number" ? d.like_count : 0;
    await Promise.all([
      likeRef.set(
        {
          user_id: uid,
          comment_id: input.commentId,
          post_id: input.postId,
          created_at_ts: firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      ),
      cRef.update({ like_count: cur + 1 }),
    ]);
  }

  return true;
}