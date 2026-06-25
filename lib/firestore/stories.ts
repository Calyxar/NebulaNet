// lib/firestore/stories.ts — React Native Firebase ✅ FIXED
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import storage from "@react-native-firebase/storage";

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

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function tsToIso(ts: any): string {
  if (!ts) return "";
  if (ts?.toDate) return ts.toDate().toISOString();
  if (ts?.seconds) return new Date(ts.seconds * 1000).toISOString();
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

function guessContentType(ext: string, mediaType: "image" | "video" | "gif") {
  if (mediaType === "gif") return "image/gif";
  if (mediaType === "video")
    return ext === "mov" ? "video/quicktime" : "video/mp4";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  return "image/jpeg";
}

async function getProfilesMap(userIds: string[]) {
  const map = new Map<string, StoryProfile>();
  const ids = Array.from(new Set(userIds.filter(Boolean)));
  for (const batch of chunk(ids, 10)) {
    try {
      const docSnaps = await Promise.all(
        batch.map((id) => firestore().collection("profiles").doc(id).get()),
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

function sortByCreatedAt(stories: StoryRow[]): StoryRow[] {
  return [...stories].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

export async function fetchStoryById(
  storyId: string,
): Promise<StoryRow | null> {
  const id = storyId.trim();
  if (!id) return null;
  try {
    const snap = await firestore().collection("stories").doc(id).get();
    if (!snap.exists()) return null;
    const d = snap.data() as any;
    const pSnap = await firestore().collection("profiles").doc(d.user_id).get();
    const pd = pSnap.exists() ? (pSnap.data() as any) : null;
    const profile: StoryProfile | null = pd
      ? {
          username: pd.username ?? null,
          full_name: pd.full_name ?? null,
          avatar_url: pd.avatar_url ?? null,
        }
      : null;
    return normalizeStory(snap.id, d, profile);
  } catch (e: any) {
    console.error("[fetchStoryById] ERROR:", e?.code, e?.message);
    return null;
  }
}

export async function fetchActiveStories(): Promise<StoryRow[]> {
  try {
    const now = firestore.Timestamp.fromDate(new Date());
    console.log(
      "[fetchActiveStories] querying, now =",
      now.toDate().toISOString(),
    );
    const snap = await firestore()
      .collection("stories")
      .where("expires_at_ts", ">", now)
      // ✅ FIX: orderBy required for range queries
      .orderBy("expires_at_ts", "asc")
      .limit(200)
      .get();
    console.log("[fetchActiveStories] got", snap.size, "docs");
    if (snap.empty) return [];
    const base = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    const profiles = await getProfilesMap(base.map((s) => s.user_id));
    return sortByCreatedAt(
      base.map((s) => normalizeStory(s.id, s, profiles.get(s.user_id) ?? null)),
    );
  } catch (e: any) {
    console.error("[fetchActiveStories] ERROR:", e?.code, e?.message);
    return [];
  }
}

export async function fetchActiveStoriesByUser(
  userId: string,
): Promise<StoryRow[]> {
  const uid = userId.trim();
  if (!uid) return [];
  try {
    const now = firestore.Timestamp.fromDate(new Date());
    const snap = await firestore()
      .collection("stories")
      .where("user_id", "==", uid)
      .where("expires_at_ts", ">", now)
      // ✅ FIX: orderBy required for range queries
      .orderBy("expires_at_ts", "asc")
      .limit(100)
      .get();
    const pSnap = await firestore().collection("profiles").doc(uid).get();
    const pd = pSnap.exists() ? (pSnap.data() as any) : null;
    const profile: StoryProfile | null = pd
      ? {
          username: pd.username ?? null,
          full_name: pd.full_name ?? null,
          avatar_url: pd.avatar_url ?? null,
        }
      : null;
    return sortByCreatedAt(
      snap.docs.map((d) => normalizeStory(d.id, d.data(), profile)),
    );
  } catch (e: any) {
    console.error("[fetchActiveStoriesByUser] ERROR:", e?.code, e?.message);
    return [];
  }
}

export async function markStorySeen(storyId: string) {
  const viewer = auth().currentUser;
  if (!viewer) return;
  const sid = storyId.trim();
  if (!sid) return;
  const key = `${sid}_${viewer.uid}`;
  await firestore().collection("story_seen").doc(key).set(
    {
      story_id: sid,
      viewer_id: viewer.uid,
      seen_at_ts: firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

export async function uploadStoryMedia(
  arg1: any,
  arg2?: any,
): Promise<{ publicUrl: string; path: string }> {
  const params =
    typeof arg1 === "string" ? { uri: arg1, mediaType: arg2 } : arg1;
  const viewer = auth().currentUser;
  if (!viewer) throw new Error("Not authenticated");
  const { uri, mediaType } = params as {
    uri: string;
    mediaType: "image" | "video" | "gif";
  };
  const ext = guessExt(uri, mediaType);
  const contentType = guessContentType(ext, mediaType);
  const path = `stories/${viewer.uid}/${Date.now()}.${ext}`;
  const fileRef = storage().ref(path);
  await fileRef.putFile(uri, { contentType });
  const publicUrl = await fileRef.getDownloadURL();
  return { publicUrl, path };
}

export async function createStory(params: {
  media_url: string;
  media_type: "image" | "video" | "gif";
  caption?: string | null;
  expires_in_hours?: number;
}): Promise<StoryRow> {
  const viewer = auth().currentUser;
  if (!viewer) throw new Error("Not authenticated");
  const expiresAt = new Date(
    Date.now() + (params.expires_in_hours ?? 24) * 60 * 60 * 1000,
  );
  const nowIso = new Date().toISOString();
  const profileSnap = await firestore()
    .collection("profiles")
    .doc(viewer.uid)
    .get();
  const pd = profileSnap.exists() ? (profileSnap.data() as any) : null;
  const profile: StoryProfile | null = pd
    ? {
        username: pd.username ?? null,
        full_name: pd.full_name ?? null,
        avatar_url: pd.avatar_url ?? null,
      }
    : null;
  const created = await firestore()
    .collection("stories")
    .add({
      user_id: viewer.uid,
      media_url: params.media_url,
      media_type: params.media_type,
      caption: params.caption ?? null,
      created_at: nowIso,
      expires_at: expiresAt.toISOString(),
      created_at_ts: firestore.FieldValue.serverTimestamp(),
      expires_at_ts: firestore.Timestamp.fromDate(expiresAt),
      profile,
    });
  const snap = await created.get();
  return normalizeStory(snap.id, snap.data(), profile);
}

export async function sendStoryReply(
  storyId: string,
  content: string,
): Promise<void> {
  const viewer = auth().currentUser;
  if (!viewer) throw new Error("Not authenticated");
  const sid = storyId.trim();
  const text = content.trim();
  if (!sid || !text) return;
  await firestore().collection("story_comments").add({
    story_id: sid,
    user_id: viewer.uid,
    content: text,
    created_at_ts: firestore.FieldValue.serverTimestamp(),
  });
}

export async function fetchStorySeenViewers(
  storyId: string,
): Promise<StorySeenViewer[]> {
  const sid = storyId.trim();
  if (!sid) return [];
  const snap = await firestore()
    .collection("story_seen")
    .where("story_id", "==", sid)
    .limit(200)
    .get();
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

export function subscribeActiveStories(
  callback: (stories: StoryRow[]) => void,
) {
  const now = firestore.Timestamp.fromDate(new Date());
  return firestore()
    .collection("stories")
    .where("expires_at_ts", ">", now)
    .orderBy("expires_at_ts", "asc")
    .limit(200)
    .onSnapshot(async (snap) => {
      try {
        const base = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        const profiles = await getProfilesMap(base.map((s) => s.user_id));
        callback(
          sortByCreatedAt(
            base.map((s) =>
              normalizeStory(s.id, s, profiles.get(s.user_id) ?? null),
            ),
          ),
        );
      } catch (e) {
        console.error("[subscribeActiveStories] ERROR:", e);
      }
    });
}
