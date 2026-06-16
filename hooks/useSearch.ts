// hooks/useSearch.ts — ✅ FIXED
// Fix 1: fetchSuggestedCommunities returns is_joined (not just filters out joined)
// Fix 2: searchCommunities returns is_joined for search results
// Fix 3: Media search is Twitter-style — searches by title, hashtag, or #tag
//        and only returns posts that actually have media attached

import { auth } from "@/lib/firebase";
import { qk } from "@/lib/queryKeys/social";
import AsyncStorage from "@react-native-async-storage/async-storage";
import firestore from "@react-native-firebase/firestore";
import type { QueryClient } from "@tanstack/react-query";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";

export type SearchType = "top" | "account" | "post" | "community";
export type FollowStatusLite = "none" | "pending" | "accepted";
export type MediaFilterType = "all" | "images" | "videos" | "gifs";

export type SearchAccount = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  follower_count: number;
  is_private: boolean;
  follow_status: FollowStatusLite;
};

export type SearchPost = {
  id: string;
  content: string | null;
  created_at: string;
  media_urls: string[] | null;
  like_count: number | null;
  comment_count: number | null;
  share_count: number | null;
  visibility: "public" | "followers" | "private";
  user: {
    id: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
};

export type SearchCommunity = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url?: string | null;
  avatar_url?: string | null;
  member_count?: number;
  is_joined?: boolean; // ✅ FIX 1: joined state
};

export type SuggestedUser = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  follower_count: number;
  is_private: boolean;
};

export type SearchSuggestion = {
  type: "account" | "hashtag" | "recent";
  id: string;
  label: string;
  sublabel?: string;
  avatar_url?: string | null;
};

export type DiscoveryPost = {
  id: string;
  media_url: string;
  is_video: boolean;
};

export type TrendingPost = {
  id: string;
  content: string | null;
  media_url: string | null;
  is_video: boolean;
  like_count: number;
  comment_count: number;
  repost_count: number;
  share_count: number;
  score: number;
  created_at: string;
  user: {
    id: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
};

export type UseSearchParams = {
  type: SearchType;
  query: string;
  limit?: number;
  minChars?: number;
  debounceMs?: number;
  mediaType?: MediaFilterType;
  mediaOnly?: boolean;
};

type UseSearchReturn = {
  query: string;
  debouncedQuery: string;
  isSearching: boolean;
  isIdle: boolean;
  error: Error | null;
  suggestions: SearchSuggestion[];
  detectedType: "account" | "hashtag" | "general" | null;
  data: {
    accounts: SearchAccount[];
    posts: SearchPost[];
    communities: SearchCommunity[];
    top: { accounts: SearchAccount[]; posts: SearchPost[] };
  };
  refetch: () => void;
};

function tsToIso(ts: any): string {
  if (!ts) return new Date().toISOString();
  if (ts?.toDate) return ts.toDate().toISOString();
  if (ts?.seconds) return new Date(ts.seconds * 1000).toISOString();
  return new Date(ts).toISOString();
}

function isVideoUrl(url?: string | null | undefined): boolean {
  if (!url) return false;
  const clean = url.split("?")[0].toLowerCase();
  return ["mp4", "mov", "m4v", "webm", "mkv", "avi"].some((e) =>
    clean.endsWith(`.${e}`),
  );
}

function isImageUrl(url?: string | null | undefined): boolean {
  if (!url) return false;
  const clean = url.split("?")[0].toLowerCase();
  return ["jpg", "jpeg", "png", "webp"].some((e) => clean.endsWith(`.${e}`));
}

function isGifUrl(url?: string | null | undefined): boolean {
  if (!url) return false;
  return url.split("?")[0].toLowerCase().endsWith(".gif");
}

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

async function fetchMyFollowMap(
  uid: string,
): Promise<Map<string, FollowStatusLite>> {
  const snap = await firestore()
    .collection("follows")
    .where("follower_id", "==", uid)
    .limit(1000)
    .get();
  const map = new Map<string, FollowStatusLite>();
  snap.docs.forEach((d) => {
    const data = d.data() as any;
    if (data.following_id) {
      map.set(
        data.following_id,
        (data.status ?? "accepted") as FollowStatusLite,
      );
    }
  });
  return map;
}

async function searchAccounts(
  q: string,
  lim: number,
  uid: string | null,
): Promise<SearchAccount[]> {
  const lower = q.replace(/^@/, "").toLowerCase().trim();
  if (!lower) return [];
  const end =
    lower.slice(0, -1) +
    String.fromCharCode(lower.charCodeAt(lower.length - 1) + 1);

  const [byUsername, byFullName, followMap] = await Promise.all([
    firestore()
      .collection("profiles")
      .where("username", ">=", lower)
      .where("username", "<", end)
      .limit(lim)
      .get(),
    firestore()
      .collection("profiles")
      .where("full_name", ">=", q.replace(/^@/, ""))
      .where(
        "full_name",
        "<",
        q.replace(/^@/, "").slice(0, -1) +
          String.fromCharCode(
            q.replace(/^@/, "").charCodeAt(q.replace(/^@/, "").length - 1) + 1,
          ),
      )
      .limit(lim)
      .get(),
    uid
      ? fetchMyFollowMap(uid)
      : Promise.resolve(new Map<string, FollowStatusLite>()),
  ]);

  const seen = new Set<string>();
  const results: any[] = [];
  [...byUsername.docs, ...byFullName.docs].forEach((d) => {
    if (!seen.has(d.id)) {
      seen.add(d.id);
      results.push({ id: d.id, ...d.data() });
    }
  });

  return results
    .filter((p) => p.id !== uid)
    .slice(0, lim)
    .map((p) => ({
      id: p.id,
      username: p.username ?? null,
      full_name: p.full_name ?? null,
      avatar_url: p.avatar_url ?? null,
      follower_count: p.follower_count ?? 0,
      is_private: !!p.is_private,
      follow_status: followMap.get(p.id) ?? "none",
    }));
}

// ✅ FIX 3: Twitter-style media search
// - Searches by title, hashtag array, or #tag prefix in query
// - Only returns posts that have media attached
// - Falls back to general content scan when no query matches hashtags
async function searchPosts(
  q: string,
  lim: number,
  mediaType: MediaFilterType = "all",
  mediaOnly = false,
): Promise<SearchPost[]> {
  const lower = q.toLowerCase().trim();
  if (!lower) return [];

  // Strip leading # for hashtag searches
  const isHashtagSearch = lower.startsWith("#");
  const tag = lower.replace(/^#/, "");

  let docs: any[] = [];
  const seen = new Set<string>();

  if (mediaOnly) {
    // ── Twitter-style media search ──────────────────────────────────────────
    // Step 1: search by hashtag match (exact array-contains)
    try {
      const hashtagSnap = await firestore()
        .collection("posts")
        .where("visibility", "==", "public")
        .where("hashtags", "array-contains", tag)
        .orderBy("created_at_ts", "desc")
        .limit(lim * 2)
        .get();

      hashtagSnap.docs.forEach((d) => {
        const p = { id: d.id, ...(d.data() as any) };
        // ✅ Only include posts that actually have media
        if (
          Array.isArray(p.media_urls) &&
          p.media_urls.length > 0 &&
          !seen.has(d.id)
        ) {
          seen.add(d.id);
          docs.push(p);
        }
      });
    } catch {}

    // Step 2: search by title or content containing the query
    // (same as Twitter — typing "cats" shows media posts about cats)
    try {
      const contentSnap = await firestore()
        .collection("posts")
        .where("visibility", "==", "public")
        .orderBy("created_at_ts", "desc")
        .limit(300)
        .get();

      contentSnap.docs
        .filter((d) => !seen.has(d.id))
        .forEach((d) => {
          const p = { id: d.id, ...(d.data() as any) };
          const hasMedia =
            Array.isArray(p.media_urls) && p.media_urls.length > 0;
          if (!hasMedia) return; // ✅ media-only filter

          const titleMatch = p.title?.toLowerCase().includes(lower);
          const contentMatch = p.content?.toLowerCase().includes(lower);
          const tagMatch = (p.hashtags as string[] | undefined)?.some((h) =>
            h.toLowerCase().includes(tag),
          );

          if (titleMatch || contentMatch || tagMatch) {
            seen.add(d.id);
            docs.push(p);
          }
        });
    } catch {}
  } else {
    // ── Standard post search (Latest tab, Top tab) ──────────────────────────
    const [hashtagSnap, contentSnap] = await Promise.all([
      firestore()
        .collection("posts")
        .where("visibility", "==", "public")
        .where("hashtags", "array-contains", tag)
        .orderBy("created_at_ts", "desc")
        .limit(lim)
        .get(),

      isHashtagSearch
        ? Promise.resolve(null)
        : firestore()
            .collection("posts")
            .where("visibility", "==", "public")
            .orderBy("created_at_ts", "desc")
            .limit(100)
            .get(),
    ]);

    hashtagSnap.docs.forEach((d) => {
      seen.add(d.id);
      docs.push({ id: d.id, ...d.data() });
    });

    if (contentSnap) {
      contentSnap.docs
        .filter((d) => !seen.has(d.id))
        .map((d) => ({ id: d.id, ...(d.data() as any) }))
        .filter(
          (p: any) =>
            p.content?.toLowerCase().includes(lower) ||
            p.title?.toLowerCase().includes(lower),
        )
        .forEach((p) => {
          seen.add(p.id);
          docs.push(p);
        });
    }
  }

  let results = docs
    .filter((p: any) => p.is_visible !== false)
    .slice(0, lim)
    .map((p: any) => ({
      id: p.id,
      content: p.content ?? null,
      created_at: tsToIso(p.created_at_ts ?? p.created_at),
      media_urls: Array.isArray(p.media_urls) ? p.media_urls : null,
      like_count: p.like_count ?? null,
      comment_count: p.comment_count ?? null,
      share_count: p.share_count ?? null,
      visibility: p.visibility ?? "public",
      user: p.user ?? null,
    }));

  // Apply media type filter on top of results
  if (mediaType === "images") {
    results = results.filter((p) =>
      p.media_urls?.some((url: string) => isImageUrl(url)),
    );
  } else if (mediaType === "videos") {
    results = results.filter((p) =>
      p.media_urls?.some((url: string) => isVideoUrl(url)),
    );
  } else if (mediaType === "gifs") {
    results = results.filter((p) =>
      p.media_urls?.some((url: string) => isGifUrl(url)),
    );
  }

  return results;
}

// ✅ FIX 2: returns is_joined for search results
async function searchCommunities(
  q: string,
  lim: number,
): Promise<SearchCommunity[]> {
  const lower = q.toLowerCase().trim();
  if (!lower) return [];
  const end =
    lower.slice(0, -1) +
    String.fromCharCode(lower.charCodeAt(lower.length - 1) + 1);

  const uid = auth.currentUser?.uid ?? null;

  const [snap, nameSnap] = await Promise.all([
    firestore()
      .collection("communities")
      .where("slug", ">=", lower)
      .where("slug", "<", end)
      .limit(lim)
      .get(),
    firestore()
      .collection("communities")
      .orderBy("member_count", "desc")
      .limit(50)
      .get(),
  ]);

  const seen = new Set<string>();
  const results: any[] = [];
  snap.docs.forEach((d) => {
    seen.add(d.id);
    results.push({ id: d.id, ...d.data() });
  });
  nameSnap.docs
    .filter((d) => !seen.has(d.id))
    .map((d) => ({ id: d.id, ...(d.data() as any) }))
    .filter(
      (c: any) =>
        c.name?.toLowerCase().includes(lower) ||
        c.slug?.toLowerCase().includes(lower),
    )
    .forEach((c) => results.push(c));

  const sliced = results.slice(0, lim);

  // ✅ FIX 2: check membership so the button shows "Joined" correctly
  const joinedSet = new Set<string>();
  if (uid && sliced.length > 0) {
    try {
      const ids = sliced.map((c) => c.id);
      for (let i = 0; i < ids.length; i += 10) {
        const batch = ids.slice(i, i + 10);
        const memberSnap = await firestore()
          .collection("community_members")
          .where("community_id", "in", batch)
          .where("user_id", "==", uid)
          .get();
        memberSnap.docs.forEach((d) =>
          joinedSet.add((d.data() as any).community_id),
        );
      }
    } catch {}
  }

  return sliced.map((c: any) => ({
    id: c.id,
    name: c.name ?? "",
    slug: c.slug ?? "",
    description: c.description ?? null,
    image_url: c.image_url ?? null,
    avatar_url: c.avatar_url ?? null,
    member_count: c.member_count ?? 0,
    is_joined: joinedSet.has(c.id), // ✅
  }));
}

function seedFollowStatusCache(
  qc: QueryClient,
  uid: string,
  accounts: SearchAccount[],
) {
  accounts.forEach((a) => {
    qc.setQueryData(qk.social.followStatus(uid, a.id), a.follow_status);
  });
}

export async function fetchSuggestedUsers(lim = 8): Promise<SuggestedUser[]> {
  const uid = auth.currentUser?.uid;
  const followingSet = new Set<string>();

  if (uid) {
    try {
      const followSnap = await firestore()
        .collection("follows")
        .where("follower_id", "==", uid)
        .where("status", "==", "accepted")
        .limit(500)
        .get();
      followSnap.docs.forEach((d) => {
        const x = d.data() as any;
        if (x.following_id) followingSet.add(x.following_id);
      });
    } catch {}
  }

  const suggestedIds = new Set<string>();

  if (uid) {
    try {
      const interestsSnap = await firestore()
        .collection("user_interests")
        .doc(uid)
        .get();
      const interestsData = interestsSnap.data() as any;
      const interests: string[] = interestsData?.interests ?? [];

      if (interests.length > 0) {
        const matchSnap = await firestore()
          .collection("user_interests")
          .where("interests", "array-contains-any", interests.slice(0, 10))
          .limit(30)
          .get();
        matchSnap.docs.forEach((d) => {
          const matchUid = (d.data() as any).user_id;
          if (matchUid && matchUid !== uid && !followingSet.has(matchUid)) {
            suggestedIds.add(matchUid);
          }
        });
      }
    } catch {}
  }

  const topSnap = await firestore()
    .collection("profiles")
    .orderBy("follower_count", "desc")
    .limit(50)
    .get();
  topSnap.docs.forEach((d) => {
    if (d.id !== uid && !followingSet.has(d.id)) suggestedIds.add(d.id);
  });

  const ids = Array.from(suggestedIds).slice(0, lim * 2);
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += 10) chunks.push(ids.slice(i, i + 10));

  const profiles: SuggestedUser[] = [];
  for (const chunk of chunks) {
    const snap = await firestore()
      .collection("profiles")
      .where(firestore.FieldPath.documentId(), "in", chunk)
      .get();
    snap.docs.forEach((d) => {
      const p = d.data() as any;
      profiles.push({
        id: d.id,
        username: p.username ?? null,
        full_name: p.full_name ?? null,
        avatar_url: p.avatar_url ?? null,
        follower_count: p.follower_count ?? 0,
        is_private: !!p.is_private,
      });
    });
  }

  return profiles.slice(0, lim);
}

// ✅ FIX 1: keeps joined communities in the list and marks them is_joined: true
// instead of filtering them out entirely (so users can see what they've joined)
export async function fetchSuggestedCommunities(
  lim = 5,
): Promise<SearchCommunity[]> {
  const uid = auth.currentUser?.uid;

  // Build joined set (including owned)
  const joinedSet = new Set<string>();
  if (uid) {
    try {
      const [memberSnap, ownedSnap] = await Promise.all([
        firestore()
          .collection("community_members")
          .where("user_id", "==", uid)
          .get(),
        firestore()
          .collection("communities")
          .where("owner_id", "==", uid)
          .get(),
      ]);
      memberSnap.docs.forEach((d) => {
        const communityId = (d.data() as any).community_id;
        if (communityId) joinedSet.add(communityId);
      });
      ownedSnap.docs.forEach((d) => joinedSet.add(d.id));
    } catch {}
  }

  let interests: string[] = [];
  if (uid) {
    try {
      const interestsSnap = await firestore()
        .collection("user_interests")
        .doc(uid)
        .get();
      const interestsData = interestsSnap.data() as any;
      interests = interestsData?.interests ?? [];
    } catch {}
  }

  const snap = await firestore()
    .collection("communities")
    .orderBy("member_count", "desc")
    .limit(50)
    .get();

  const communities = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as any);

  const scored = communities.map((c: any) => {
    let score = c.member_count ?? 0;
    if (interests.length > 0) {
      const nameAndDesc =
        `${c.name ?? ""} ${c.description ?? ""}`.toLowerCase();
      const matches = interests.filter((i) =>
        nameAndDesc.includes(i.toLowerCase()),
      );
      score += matches.length * 1000;
    }
    return { c, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, lim)
    .map(({ c }) => ({
      id: c.id,
      name: c.name ?? "",
      slug: c.slug ?? "",
      description: c.description ?? null,
      image_url: c.image_url ?? null,
      avatar_url: c.avatar_url ?? null,
      member_count: c.member_count ?? 0,
      is_joined: joinedSet.has(c.id), // ✅ FIX 1
    }));
}

export async function fetchDiscoveryPosts(lim = 30): Promise<DiscoveryPost[]> {
  const snap = await firestore()
    .collection("posts")
    .where("visibility", "==", "public")
    .orderBy("created_at_ts", "desc")
    .limit(lim + 20)
    .get();
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as any)
    .filter(
      (p: any) =>
        p.is_visible !== false &&
        Array.isArray(p.media_urls) &&
        p.media_urls.length > 0 &&
        typeof p.media_urls[0] === "string",
    )
    .slice(0, lim)
    .map((p: any) => {
      const url: string = p.media_urls[0];
      const clean = (url || "").split("?")[0].toLowerCase();
      const isVideo = ["mp4", "mov", "m4v", "webm", "mkv", "avi"].some((e) =>
        clean.endsWith(`.${e}`),
      );
      return { id: p.id, media_url: url, is_video: isVideo };
    });
}

export async function fetchTrendingPosts(lim = 20): Promise<TrendingPost[]> {
  const fortyEightHoursAgo = firestore.Timestamp.fromDate(
    new Date(Date.now() - 48 * 60 * 60 * 1000),
  );
  const snap = await firestore()
    .collection("posts")
    .where("visibility", "==", "public")
    .where("created_at_ts", ">=", fortyEightHoursAgo)
    .orderBy("created_at_ts", "desc")
    .limit(100)
    .get();
  const docs = snap.empty
    ? (
        await firestore()
          .collection("posts")
          .where("visibility", "==", "public")
          .orderBy("like_count", "desc")
          .limit(100)
          .get()
      ).docs
    : snap.docs;

  return docs
    .map((d) => ({ id: d.id, ...d.data() }) as any)
    .filter((p: any) => p.is_visible !== false)
    .map((p: any) => {
      const likes = p.like_count ?? 0;
      const comments = p.comment_count ?? 0;
      const reposts = p.repost_count ?? 0;
      const shares = p.share_count ?? 0;
      const score = likes + comments * 2 + reposts * 3 + shares * 2;
      const url = Array.isArray(p.media_urls)
        ? (p.media_urls[0] ?? null)
        : null;
      const clean = (url || "").split("?")[0].toLowerCase();
      const isVideo = ["mp4", "mov", "m4v", "webm", "mkv", "avi"].some((e) =>
        clean.endsWith(`.${e}`),
      );
      return {
        id: p.id,
        content: p.content ?? null,
        media_url: url,
        is_video: isVideo,
        like_count: likes,
        comment_count: comments,
        repost_count: reposts,
        share_count: shares,
        score,
        created_at: tsToIso(p.created_at_ts ?? p.created_at),
        user: p.user ?? null,
      } as TrendingPost;
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, lim);
}

const RECENT_SEARCHES_KEY = "nebulanet:recent_searches_v1";
const MAX_RECENT = 8;

export function useRecentSearches() {
  const [recents, setRecents] = useState<string[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(RECENT_SEARCHES_KEY)
      .then((v) => {
        if (v) {
          try {
            const p = JSON.parse(v);
            if (Array.isArray(p)) setRecents(p);
          } catch {}
        }
      })
      .catch(() => {});
  }, []);

  const persist = useCallback(async (next: string[]) => {
    try {
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
    } catch {}
  }, []);

  const add = useCallback(
    async (term: string) => {
      const t = term.trim();
      if (!t || t.length < 2) return;
      const next = [t, ...recents.filter((r) => r !== t)].slice(0, MAX_RECENT);
      setRecents(next);
      await persist(next);
    },
    [recents, persist],
  );

  const remove = useCallback(
    async (term: string) => {
      const next = recents.filter((r) => r !== term);
      setRecents(next);
      await persist(next);
    },
    [recents, persist],
  );

  const clear = useCallback(async () => {
    setRecents([]);
    try {
      await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch {}
  }, []);

  return { recents, add, remove, clear };
}

export function useSearch(params: UseSearchParams): UseSearchReturn {
  const {
    type,
    query: rawQuery,
    limit: lim = 20,
    minChars = 2,
    debounceMs = 350,
    mediaType = "all",
    mediaOnly = false,
  } = params;
  const qc = useQueryClient();
  const trimmed = (rawQuery ?? "").trim();
  const debouncedQuery = useDebouncedValue(trimmed, debounceMs);
  const enabled = debouncedQuery.length >= minChars;

  const detectedType: "account" | "hashtag" | "general" = trimmed.startsWith(
    "@",
  )
    ? "account"
    : trimmed.startsWith("#")
      ? "hashtag"
      : "general";

  const queryKey = useMemo(
    () => ["search", type, debouncedQuery, lim, mediaType, mediaOnly] as const,
    [type, debouncedQuery, lim, mediaType, mediaOnly],
  );

  const q = useQuery({
    queryKey,
    enabled,
    staleTime: 30_000,
    queryFn: async () => {
      const uid = auth.currentUser?.uid ?? null;

      if (type === "top") {
        const [accounts, posts] = await Promise.all([
          searchAccounts(debouncedQuery, 3, uid),
          searchPosts(debouncedQuery, lim - 3, mediaType, false),
        ]);
        if (uid) seedFollowStatusCache(qc, uid, accounts);
        return {
          accounts,
          posts,
          communities: [] as SearchCommunity[],
          top: { accounts, posts },
        };
      }
      if (type === "account") {
        const accounts = await searchAccounts(debouncedQuery, lim, uid);
        if (uid) seedFollowStatusCache(qc, uid, accounts);
        return {
          accounts,
          posts: [] as SearchPost[],
          communities: [] as SearchCommunity[],
          top: { accounts, posts: [] as SearchPost[] },
        };
      }
      if (type === "post") {
        const posts = await searchPosts(
          debouncedQuery,
          lim,
          mediaType,
          mediaOnly,
        );
        return {
          accounts: [] as SearchAccount[],
          posts,
          communities: [] as SearchCommunity[],
          top: { accounts: [] as SearchAccount[], posts },
        };
      }
      const communities = await searchCommunities(debouncedQuery, lim);
      return {
        accounts: [] as SearchAccount[],
        posts: [] as SearchPost[],
        communities,
        top: { accounts: [] as SearchAccount[], posts: [] as SearchPost[] },
      };
    },
  });

  return {
    query: trimmed,
    debouncedQuery,
    isSearching: q.isFetching,
    isIdle: !enabled,
    error: (q.error as Error) ?? null,
    suggestions: [],
    detectedType,
    data: q.data ?? {
      accounts: [],
      posts: [],
      communities: [],
      top: { accounts: [], posts: [] },
    },
    refetch: () => void q.refetch(),
  };
}
