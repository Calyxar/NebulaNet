// lib/firestore/comments.ts — FIREBASE ✅
// Replaces Supabase comments + comment_likes

import { auth, db } from "@/lib/firebase";
import {
  Timestamp,
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";

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

const COMMENTS = collection(db, "comments");
const COMMENT_LIKES = collection(db, "comment_likes");

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

function tsToIso(ts: any): string {
  if (!ts) return new Date().toISOString();
  if (ts instanceof Timestamp) return ts.toDate().toISOString();
  return new Date(ts).toISOString();
}

async function fetchLikedCommentIds(uid: string, commentIds: string[]) {
  const liked = new Set<string>();
  if (!uid || !commentIds.length) return liked;

  // "in" max 30
  for (let i = 0; i < commentIds.length; i += 30) {
    const chunk = commentIds.slice(i, i + 30);
    const q1 = query(
      COMMENT_LIKES,
      where("user_id", "==", uid),
      where("comment_id", "in", chunk),
    );
    const snap = await getDocs(q1);
    snap.docs.forEach((d) => liked.add((d.data() as any).comment_id));
  }

  return liked;
}

export async function getComments(
  postId: string,
): Promise<CommentWithAuthor[]> {
  const clean = postId?.trim();
  if (!clean) return [];

  const q1 = query(
    COMMENTS,
    where("post_id", "==", clean),
    orderBy("created_at_ts", "asc"),
  );

  const snap = await getDocs(q1);
  const rows = snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as any),
  }));

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
    author: r.author ?? null, // we store snapshot on write
    replies: [],
  }));

  // build replies
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

  const refDoc = await addDoc(COMMENTS, {
    post_id: input.post_id,
    user_id: uid,
    content: input.content,
    parent_id: input.parent_id ?? null,
    like_count: 0,

    author, // denormalized snapshot
    created_at: now,
    created_at_ts: serverTimestamp(),
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

  // We store likes as docs with deterministic id: `${uid}_${commentId}`
  const likeId = `${uid}_${input.commentId}`;
  const likeRef = doc(db, "comment_likes", likeId);

  if (input.isLiked) {
    // unlike
    // decrement counter best handled by Cloud Function; but we can do naive read+write:
    const cRef = doc(db, "comments", input.commentId);
    const cSnap = await getDoc(cRef);
    if (cSnap.exists()) {
      const d = cSnap.data() as any;
      const cur = typeof d.like_count === "number" ? d.like_count : 0;
      await Promise.all([
        // delete like doc
        (await import("firebase/firestore")).deleteDoc(likeRef),
        (await import("firebase/firestore")).updateDoc(cRef, {
          like_count: Math.max(0, cur - 1),
        }),
      ]);
    } else {
      await (await import("firebase/firestore")).deleteDoc(likeRef);
    }
  } else {
    // like
    const cRef = doc(db, "comments", input.commentId);
    const cSnap = await getDoc(cRef);
    const d = cSnap.exists() ? (cSnap.data() as any) : {};
    const cur = typeof d.like_count === "number" ? d.like_count : 0;

    await Promise.all([
      (await import("firebase/firestore")).setDoc(
        likeRef,
        {
          user_id: uid,
          comment_id: input.commentId,
          post_id: input.postId,
          created_at_ts: serverTimestamp(),
        },
        { merge: true },
      ),
      (await import("firebase/firestore")).updateDoc(cRef, {
        like_count: cur + 1,
      }),
    ]);
  }

  return true;
}
