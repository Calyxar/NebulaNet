// lib/queries/stories.ts — UPDATED ✅ removed orderBy to avoid index requirement, sort in JS
import { auth, db, storage } from "@/lib/firebase";
import {
  Timestamp,
  addDoc,
  collection,
  doc,
  documentId,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

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

const STORIES = collection(db, "stories");
const STORY_SEEN = collection(db, "story_seen");
const STORY_COMMENTS = collection(db, "story_comments");
const PROFILES = collection(db, "profiles");

function tsToIso(ts: any): string {
  if (!ts) return new Date().toISOString();
  if (ts instanceof Timestamp) return ts.toDate().toISOString();
  return new Date(ts).toISOString();
}

function chunk<T>(arr: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function batchGetProfiles(
  userIds: string[],
): Promise<Map<string, StoryProfile>> {
  const map = new Map<string, StoryProfile>();
  const ids = Array.from(new Set(userIds.filter(Boolean)));
  if (!ids.length) return map;
  for (const group of chunk(ids, 30)) {
    const q = query(PROFILES, where(documentId(), "in", group));
    const snap = await getDocs(q);
    snap.docs.forEach((d) => {
      const data = d.data() as any;
      map.set(d.id, {
        username: data.username ?? null,
        full_name: data.full_name ?? null,
        avatar_url: data.avatar_url ?? null,
      });
    });
  }
  return map;
}

function guessExt(uri: string, mediaType: "image" | "video" | "gif") {
  const clean = uri.split("?")[0]?.split("#")[0] ?? uri;
  const parts = clean.split(".");
  const ext = parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
  if (mediaType === "gif") return "gif";
  return ext || (mediaType === "video" ? "mp4" : "jpg");
}

function guessContentType(ext: string, mediaType: "image" | "video" | "gif") {
  if (mediaType === "gif") return "image/gif";
  if (mediaType === "video") {
    if (ext === "mov") return "video/quicktime";
    return "video/mp4";
  }
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  return "image/jpeg";
}

async function uriToBlob(uri: string): Promise<Blob> {
  const res = await fetch(uri);
  if (!res.ok) throw new Error("Failed to read file");
  return await res.blob();
}

export async function fetchStoryById(
  storyId: string,
): Promise<StoryRow | null> {
  const snap = await getDoc(doc(db, "stories", storyId));
  if (!snap.exists()) return null;
  const d = snap.data() as any;
  const profileSnap = await getDoc(doc(db, "profiles", d.user_id));
  const p = profileSnap.exists() ? (profileSnap.data() as any) : null;
  return {
    id: snap.id,
    user_id: d.user_id,
    media_url: d.media_url,
    media_type: d.media_type,
    caption: d.caption ?? null,
    created_at: tsToIso(d.created_at_ts),
    expires_at: tsToIso(d.expires_at_ts),
    profiles: p
      ? {
          username: p.username ?? null,
          full_name: p.full_name ?? null,
          avatar_url: p.avatar_url ?? null,
        }
      : null,
  };
}

// ✅ No orderBy — sort in JS to avoid composite index requirement
export async function fetchActiveStories(): Promise<StoryRow[]> {
  const now = Timestamp.fromDate(new Date());
  const q = query(STORIES, where("expires_at_ts", ">", now), limit(200));
  const snap = await getDocs(q);
  if (snap.empty) return [];
  const docs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
  const profilesMap = await batchGetProfiles(docs.map((d) => d.user_id));
  return (
    docs
      .map((d) => ({
        id: d.id,
        user_id: d.user_id,
        media_url: d.media_url,
        media_type: d.media_type,
        caption: d.caption ?? null,
        created_at: tsToIso(d.created_at_ts),
        expires_at: tsToIso(d.expires_at_ts),
        profiles: profilesMap.get(d.user_id) ?? null,
      }))
      // ✅ Sort newest first in JS
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
  );
}

// ✅ No orderBy — sort in JS to avoid composite index requirement
export async function fetchActiveStoriesByUser(
  userId: string,
): Promise<StoryRow[]> {
  const now = Timestamp.fromDate(new Date());
  const q = query(
    STORIES,
    where("user_id", "==", userId),
    where("expires_at_ts", ">", now),
    limit(100),
  );
  const snap = await getDocs(q);
  if (snap.empty) return [];
  const profileSnap = await getDoc(doc(db, "profiles", userId));
  const p = profileSnap.exists() ? (profileSnap.data() as any) : null;
  const profile: StoryProfile | null = p
    ? {
        username: p.username ?? null,
        full_name: p.full_name ?? null,
        avatar_url: p.avatar_url ?? null,
      }
    : null;
  return (
    snap.docs
      .map((docSnap) => {
        const d = docSnap.data() as any;
        return {
          id: docSnap.id,
          user_id: d.user_id,
          media_url: d.media_url,
          media_type: d.media_type,
          caption: d.caption ?? null,
          created_at: tsToIso(d.created_at_ts),
          expires_at: tsToIso(d.expires_at_ts),
          profiles: profile,
        };
      })
      // ✅ Sort newest first in JS
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
  );
}

export async function markStorySeen(storyId: string) {
  const user = auth.currentUser;
  if (!user) return;
  const key = `${storyId}_${user.uid}`;
  await setDoc(
    doc(db, "story_seen", key),
    {
      story_id: storyId,
      viewer_id: user.uid,
      seen_at_ts: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function uploadStoryMedia(
  uri: string,
  mediaType: "image" | "video" | "gif",
): Promise<{ publicUrl: string; path: string }> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  const ext = guessExt(uri, mediaType);
  const contentType = guessContentType(ext, mediaType);
  const path = `stories/${user.uid}/${Date.now()}.${ext}`;
  const storageRef = ref(storage, path);
  const blob = await uriToBlob(uri);
  await uploadBytes(storageRef, blob, { contentType });
  const publicUrl = await getDownloadURL(storageRef);
  return { publicUrl, path };
}

export async function createStory(params: {
  media_url: string;
  media_type: "image" | "video" | "gif";
  caption?: string | null;
  expires_in_hours?: number;
}): Promise<StoryRow> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  const expiresAt = new Date(
    Date.now() + (params.expires_in_hours ?? 24) * 60 * 60 * 1000,
  );
  const refDoc = await addDoc(STORIES, {
    user_id: user.uid,
    media_url: params.media_url,
    media_type: params.media_type,
    caption: params.caption ?? null,
    created_at_ts: serverTimestamp(),
    expires_at_ts: Timestamp.fromDate(expiresAt),
  });
  const profileSnap = await getDoc(doc(db, "profiles", user.uid));
  const p = profileSnap.exists() ? (profileSnap.data() as any) : null;
  return {
    id: refDoc.id,
    user_id: user.uid,
    media_url: params.media_url,
    media_type: params.media_type,
    caption: params.caption ?? null,
    created_at: new Date().toISOString(),
    expires_at: expiresAt.toISOString(),
    profiles: p
      ? {
          username: p.username ?? null,
          full_name: p.full_name ?? null,
          avatar_url: p.avatar_url ?? null,
        }
      : null,
  };
}

export async function sendStoryReply(
  storyId: string,
  content: string,
): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  await addDoc(STORY_COMMENTS, {
    story_id: storyId,
    user_id: user.uid,
    content: content.trim(),
    created_at_ts: serverTimestamp(),
  });
}
