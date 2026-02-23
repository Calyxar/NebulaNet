// lib/firestore/stories_seen.ts — FIRESTORE ✅ COMPLETED + UPDATED
// ✅ exports StorySeenViewer
// ✅ exports fetchStorySeenViewers(storyId)
// ✅ "join" viewer -> profiles (chunked where __name__ in <= 10)

import { db } from "@/lib/firebase";
import {
    collection,
    limit as fsLimit,
    getDocs,
    orderBy,
    query,
    Timestamp,
    where
} from "firebase/firestore";

/* -------------------- TYPES -------------------- */

export type StorySeenViewer = {
  viewer_id: string;
  seen_at: string;
  profile: {
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
};

/* -------------------- COLLECTIONS -------------------- */

const STORY_SEEN = collection(db, "story_seen");
const PROFILES = collection(db, "profiles");

/* -------------------- HELPERS -------------------- */

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function tsToIso(ts: any): string {
  if (!ts) return "";
  if (ts instanceof Timestamp) return ts.toDate().toISOString();
  if (typeof ts?.toDate === "function") return ts.toDate().toISOString();
  const d = new Date(ts);
  return isNaN(d.getTime()) ? "" : d.toISOString();
}

async function getProfilesMap(userIds: string[]) {
  const ids = Array.from(new Set(userIds.filter(Boolean)));
  const map = new Map<string, StorySeenViewer["profile"]>();

  // Firestore "in" supports max 10 values
  for (const b of chunk(ids, 10)) {
    const qy = query(PROFILES, where("__name__", "in", b), fsLimit(10));
    const snap = await getDocs(qy);

    snap.docs.forEach((d) => {
      const x = d.data() as any;
      map.set(d.id, {
        username: (x.username as string) ?? null,
        full_name: (x.full_name as string) ?? null,
        avatar_url: (x.avatar_url as string) ?? null,
      });
    });
  }

  return map;
}

/* -------------------- FETCH -------------------- */

export async function fetchStorySeenViewers(
  storyId: string,
): Promise<StorySeenViewer[]> {
  const sid = storyId.trim();
  if (!sid) return [];

  // IMPORTANT:
  // This assumes your story_seen docs have:
  // { story_id, viewer_id, seen_at_ts }
  const qy = query(
    STORY_SEEN,
    where("story_id", "==", sid),
    orderBy("seen_at_ts", "desc"),
    fsLimit(200),
  );

  const snap = await getDocs(qy);

  const rows = snap.docs.map((d) => {
    const x = d.data() as any;
    return {
      viewer_id: (x.viewer_id as string) ?? "",
      seen_at: tsToIso(x.seen_at_ts) || "",
    };
  });

  const profiles = await getProfilesMap(rows.map((r) => r.viewer_id));

  return rows.map((r) => ({
    viewer_id: r.viewer_id,
    seen_at: r.seen_at,
    profile: profiles.get(r.viewer_id) ?? null,
  }));
}
