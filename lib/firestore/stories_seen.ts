// lib/firestore/stories_seen.ts — FIRESTORE ✅ COMPLETED + UPDATED

import { db } from "@/lib/firebase";
import firestore from "@react-native-firebase/firestore";

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

/* -------------------- HELPERS -------------------- */

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function tsToIso(ts: any): string {
  if (!ts) return "";
  if (ts instanceof firestore.Timestamp) return ts.toDate().toISOString();
  if (typeof ts?.toDate === "function") return ts.toDate().toISOString();
  const d = new Date(ts);
  return isNaN(d.getTime()) ? "" : d.toISOString();
}

async function getProfilesMap(userIds: string[]) {
  const ids = Array.from(new Set(userIds.filter(Boolean)));
  const map = new Map<string, StorySeenViewer["profile"]>();

  for (const b of chunk(ids, 10)) {
    try {
      const docSnaps = await Promise.all(
        b.map((id) => db.collection("profiles").doc(id).get()),
      );
      docSnaps.forEach((d) => {
        if (!d.exists) return;
        const x = d.data() as any;
        map.set(d.id, {
          username: (x.username as string) ?? null,
          full_name: (x.full_name as string) ?? null,
          avatar_url: (x.avatar_url as string) ?? null,
        });
      });
    } catch (err) {
      console.warn("[getProfilesMap] failed to fetch batch:", err);
    }
  }

  return map;
}

/* -------------------- FETCH -------------------- */

export async function fetchStorySeenViewers(
  storyId: string,
): Promise<StorySeenViewer[]> {
  const sid = storyId.trim();
  if (!sid) return [];

  const snap = await db
    .collection("story_seen")
    .where("story_id", "==", sid)
    .orderBy("seen_at_ts", "desc")
    .limit(200)
    .get();

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
