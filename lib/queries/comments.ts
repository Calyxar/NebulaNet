// lib/queries/comments.ts — FIRESTORE ✅ MIGRATED FROM SUPABASE

import { db } from "@/lib/firebase";
import { getAuth } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  Timestamp,
  where,
} from "firebase/firestore";

const auth = getAuth();

/* -------------------- TYPES -------------------- */

export interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  parent_comment_id?: string | null;
  created_at: string;
  updated_at: string;
  author: {
    id: string;
    username: string;
    full_name?: string | null;
    avatar_url?: string | null;
  } | null;
  user_has_liked?: boolean;
  replies?: Comment[];
}

/* -------------------- HELPERS -------------------- */

function tsToIso(ts: any): string {
  if (!ts) return new Date().toISOString();
  if (ts instanceof Timestamp) return ts.toDate().toISOString();
  if (typeof ts?.toDate === "function") return ts.toDate().toISOString();
  const d = new Date(ts);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function getProfilesMap(
  userIds: string[],
): Promise<Map<string, Comment["author"]>> {
  const map = new Map<string, Comment["author"]>();
  const ids = Array.from(new Set(userIds.filter(Boolean)));

  for (const batch of chunk(ids, 10)) {
    const snaps = await Promise.all(
      batch.map((id) => getDoc(doc(db, "profiles", id))),
    );
    snaps.forEach((snap) => {
      if (snap.exists()) {
        const p = snap.data() as any;
        map.set(snap.id, {
          id: snap.id,
          username: p.username ?? "",
          full_name: p.full_name ?? null,
          avatar_url: p.avatar_url ?? null,
        });
      }
    });
  }

  return map;
}

/* -------------------- QUERIES -------------------- */

export async function getComments(postId: string): Promise<Comment[]> {
  try {
    const snap = await getDocs(
      query(
        collection(db, "comments"),
        where("post_id", "==", postId),
        where("parent_comment_id", "==", null),
        orderBy("created_at", "desc"),
        limit(100),
      ),
    );

    if (snap.empty) return [];

    const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    const authorIds = rows.map((r) => r.author_id).filter(Boolean);
    const profilesMap = await getProfilesMap(authorIds);

    return rows.map((r) => ({
      id: r.id,
      post_id: r.post_id,
      author_id: r.author_id,
      content: r.content ?? "",
      parent_comment_id: r.parent_comment_id ?? null,
      created_at: tsToIso(r.created_at),
      updated_at: tsToIso(r.updated_at),
      author: profilesMap.get(r.author_id) ?? null,
      user_has_liked: false,
    }));
  } catch {
    return [];
  }
}
