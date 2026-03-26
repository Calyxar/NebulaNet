// lib/firestore/stories.ts — UPDATED ✅ removed orderBy to fix index error, sort in JS
// ✅ fetchStoryById
// ✅ fetchActiveStories
// ✅ fetchActiveStoriesByUser
// ✅ markStorySeen (idempotent)
// ✅ uploadStoryMedia (uploadString base64 — Expo Go + Android safe)
// ✅ createStory (writes story doc)
// ✅ sendStoryReply (writes story_comments doc)
// ✅ fetchStorySeenViewers (join via profile fetch, chunked "in" <= 10)

import { auth, db, storage } from "@/lib/firebase";
import * as FileSystemLegacy from "expo-file-system/legacy";
import {
  Timestamp,
  addDoc,
  collection,
  doc,
  limit as fsLimit,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadString } from "firebase/storage";

/* -------------------- TYPES -------------------- */

export type StoryProfile = {
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
};

export type StoryRow = {
  id: string;
  user_id: string;
  media_url: string;
  media_type: "image" | "video" | "gif";
  caption: string | null;
  created_at: string;
  expires_at: string;
  profiles: StoryProfile | null;
};

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

const STORIES = collection(db, "stories");
const PROFILES = collection(db, "profiles");
const STORY_SEEN = collection(db, "story_seen");
const STORY_COMMENTS = collection(db, "story_comments");

/* -------------------- HELPERS -------------------- */

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function tsToIso(ts: any): string {
  if (!ts) return "";
  if (ts instanceof Timestamp) return ts.toDate().toISOString();
  const d = new Date(ts);
  return isNaN(d.getTime()) ? "" : d.toISOString();
}

function normalizeStory(
  id: string,
  d: any,
  profile?: StoryProfile | null,
): StoryRow {
  const created_at =
    tsToIso(d.created_at_ts ?? d.created_at) || new Date().toISOString();
  const expires_at =
    tsToIso(d.expires_at_ts ?? d.expires_at) || d.expires_at || "";
  const mediaType =
    d.media_type === "video"
      ? "video"
      : d.media_type === "gif"
        ? "gif"
        : "image";
  return {
    id,
    user_id: d.user_id,
    media_url: d.media_url,
    media_type: mediaType,
    caption: d.caption ?? null,
    created_at,
    expires_at,
    profiles: profile ?? d.profile ?? null,
  };
}

function guessExt(uri: string, mediaType: "image" | "video" | "gif") {
  if (mediaType === "gif") return "gif";
  const clean = uri.split("?")[0]?.split("#")[0] ?? uri;
  const parts = clean.split(".");
  const ext =
    parts.length > 1 ? (parts[parts.length - 1] || "").toLowerCase() : "";
  return ext || (mediaType === "video" ? "mp4" : "jpg");
}

async function getProfilesMap(userIds: string[]) {
  const map = new Map<string, StoryProfile>();
  const ids = Array.from(new Set(userIds.filter(Boolean)));
  for (const b of chunk(ids, 10)) {
    const q = query(PROFILES, where("__name__", "in", b));
    const snap = await getDocs(q);
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

// ✅ Sort by created_at descending in JS — avoids composite index requirement
function sortByCreatedAt(stories: StoryRow[]): StoryRow[] {
  return [...stories].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

/* -------------------- FETCH -------------------- */

export async function fetchStoryById(
  storyId: string,
): Promise<StoryRow | null> {
  const id = storyId.trim();
  if (!id) return null;

  const snap = await getDoc(doc(db, "stories", id));
  if (!snap.exists()) return null;

  const d = snap.data() as any;
  const pSnap = await getDoc(doc(db, "profiles", d.user_id));
  const profile = pSnap.exists()
    ? ({
        username: ((pSnap.data() as any).username as string) ?? null,
        full_name: ((pSnap.data() as any).full_name as string) ?? null,
        avatar_url: ((pSnap.data() as any).avatar_url as string) ?? null,
      } satisfies StoryProfile)
    : null;

  return normalizeStory(snap.id, d, profile);
}

// ✅ No orderBy — sort in JS to avoid composite index requirement
export async function fetchActiveStories(): Promise<StoryRow[]> {
  const now = Timestamp.fromDate(new Date());
  const q = query(STORIES, where("expires_at_ts", ">", now), fsLimit(200));
  const snap = await getDocs(q);
  const base = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
  const profiles = await getProfilesMap(base.map((s) => s.user_id));
  const rows = base.map((s) =>
    normalizeStory(s.id, s, profiles.get(s.user_id) ?? null),
  );
  return sortByCreatedAt(rows);
}

// ✅ No orderBy — sort in JS to avoid composite index requirement
export async function fetchActiveStoriesByUser(
  userId: string,
): Promise<StoryRow[]> {
  const uid = userId.trim();
  if (!uid) return [];

  const now = Timestamp.fromDate(new Date());
  const q = query(
    STORIES,
    where("user_id", "==", uid),
    where("expires_at_ts", ">", now),
    fsLimit(100),
  );
  const snap = await getDocs(q);

  const pSnap = await getDoc(doc(db, "profiles", uid));
  const profile = pSnap.exists()
    ? ({
        username: ((pSnap.data() as any).username as string) ?? null,
        full_name: ((pSnap.data() as any).full_name as string) ?? null,
        avatar_url: ((pSnap.data() as any).avatar_url as string) ?? null,
      } satisfies StoryProfile)
    : null;

  const rows = snap.docs.map((d) => normalizeStory(d.id, d.data(), profile));
  return sortByCreatedAt(rows);
}

/* -------------------- SEEN -------------------- */

export async function markStorySeen(storyId: string) {
  const viewer = auth.currentUser;
  if (!viewer) return;
  const sid = storyId.trim();
  if (!sid) return;
  const key = `${sid}_${viewer.uid}`;
  await setDoc(
    doc(db, "story_seen", key),
    { story_id: sid, viewer_id: viewer.uid, seen_at_ts: serverTimestamp() },
    { merge: true },
  );
}

/* -------------------- UPLOAD (Firebase Storage) -------------------- */

export async function uploadStoryMedia(
  arg1: any,
  arg2?: any,
): Promise<{ publicUrl: string; path: string }> {
  const params =
    typeof arg1 === "string" ? { uri: arg1, mediaType: arg2 } : arg1;
  const viewer = auth.currentUser;
  if (!viewer) throw new Error("Not authenticated");

  const { uri, mediaType } = params as {
    uri: string;
    mediaType: "image" | "video" | "gif";
  };
  const ext = guessExt(uri, mediaType);
  const path = `stories/${viewer.uid}/${Date.now()}.${ext}`;
  const storageRef = ref(storage, path);

  let readUri = uri;
  if (uri.startsWith("content://")) {
    const localPath = `${FileSystemLegacy.cacheDirectory}story-upload-${Date.now()}.${ext}`;
    await FileSystemLegacy.copyAsync({ from: uri, to: localPath });
    readUri = localPath;
  }

  const base64 = await FileSystemLegacy.readAsStringAsync(readUri, {
    encoding: "base64" as any,
  });
  await uploadString(storageRef, base64, "base64");
  const publicUrl = await getDownloadURL(storageRef);
  return { publicUrl, path };
}

/* -------------------- CREATE -------------------- */

export async function createStory(params: {
  media_url: string;
  media_type: "image" | "video" | "gif";
  caption?: string | null;
  expires_in_hours?: number;
}): Promise<StoryRow> {
  const viewer = auth.currentUser;
  if (!viewer) throw new Error("Not authenticated");

  const expiresAt = new Date(
    Date.now() + (params.expires_in_hours ?? 24) * 60 * 60 * 1000,
  );
  const nowIso = new Date().toISOString();

  const profileSnap = await getDoc(doc(db, "profiles", viewer.uid));
  const profile: StoryProfile | null = profileSnap.exists()
    ? ({
        username: ((profileSnap.data() as any).username as string) ?? null,
        full_name: ((profileSnap.data() as any).full_name as string) ?? null,
        avatar_url: ((profileSnap.data() as any).avatar_url as string) ?? null,
      } satisfies StoryProfile)
    : null;

  const created = await addDoc(STORIES, {
    user_id: viewer.uid,
    media_url: params.media_url,
    media_type: params.media_type,
    caption: params.caption ?? null,
    created_at: nowIso,
    expires_at: expiresAt.toISOString(),
    created_at_ts: serverTimestamp(),
    expires_at_ts: Timestamp.fromDate(expiresAt),
    profile,
  });

  const snap = await getDoc(created);
  return normalizeStory(snap.id, snap.data(), profile);
}

/* -------------------- REPLIES -------------------- */

export async function sendStoryReply(
  storyId: string,
  content: string,
): Promise<void> {
  const viewer = auth.currentUser;
  if (!viewer) throw new Error("Not authenticated");
  const sid = storyId.trim();
  const text = content.trim();
  if (!sid || !text) return;
  await addDoc(STORY_COMMENTS, {
    story_id: sid,
    user_id: viewer.uid,
    content: text,
    created_at_ts: serverTimestamp(),
  });
}

/* -------------------- SEEN VIEWERS -------------------- */

// ✅ No orderBy — sort in JS
export async function fetchStorySeenViewers(
  storyId: string,
): Promise<StorySeenViewer[]> {
  const sid = storyId.trim();
  if (!sid) return [];

  const q = query(STORY_SEEN, where("story_id", "==", sid), fsLimit(200));
  const snap = await getDocs(q);

  const rows = snap.docs
    .map((d) => {
      const x = d.data() as any;
      return {
        viewer_id: (x.viewer_id as string) ?? "",
        seen_at: tsToIso(x.seen_at_ts) || "",
      };
    })
    .sort(
      (a, b) => new Date(b.seen_at).getTime() - new Date(a.seen_at).getTime(),
    );

  const profiles = await getProfilesMap(rows.map((r) => r.viewer_id));
  return rows.map((r) => ({
    viewer_id: r.viewer_id,
    seen_at: r.seen_at,
    profile: profiles.get(r.viewer_id) ?? null,
  }));
}

/* -------------------- REALTIME -------------------- */

// ✅ No orderBy — sort in JS
export function subscribeActiveStories(
  callback: (stories: StoryRow[]) => void,
) {
  const now = Timestamp.fromDate(new Date());
  const q = query(STORIES, where("expires_at_ts", ">", now), fsLimit(200));

  return onSnapshot(q, async (snap) => {
    const base = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    const profiles = await getProfilesMap(base.map((s) => s.user_id));
    const rows = base.map((s) =>
      normalizeStory(s.id, s, profiles.get(s.user_id) ?? null),
    );
    callback(sortByCreatedAt(rows));
  });
}
