// hooks/useSearch.ts
import { auth, db } from "@/lib/firebase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery } from "@tanstack/react-query";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  Timestamp,
  where,
} from "firebase/firestore";
import { useCallback, useEffect, useMemo, useState } from "react";

export type SearchType = "account" | "post" | "community";

export type SearchAccount = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  follower_count: number;
  is_private: boolean;
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
};

export type SuggestedUser = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  follower_count: number;
  is_private: boolean;
};

export type DiscoveryPost = {
  id: string;
  media_url: string;
  is_video: boolean;
};

export type UseSearchParams = {
  type: SearchType;
  query: string;
  limit?: number;
  minChars?: number;
  debounceMs?: number;
};

type UseSearchReturn = {
  query: string;
  debouncedQuery: string;
  isSearching: boolean;
  isIdle: boolean;
  error: Error | null;
  data: {
    accounts: SearchAccount[];
    posts: SearchPost[];
    communities: SearchCommunity[];
  };
  refetch: () => void;
};

function tsToIso(ts: any): string {
  if (!ts) return new Date().toISOString();
  if (ts instanceof Timestamp) return ts.toDate().toISOString();
  return new Date(ts).toISOString();
}

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

async function searchAccounts(
  q: string,
  lim: number,
): Promise<SearchAccount[]> {
  console.log("🔍 SEARCH DEBUG - Query:", q);
  console.log("🔍 SEARCH DEBUG - User ID:", auth.currentUser?.uid);
  console.log("🔍 SEARCH DEBUG - Is authenticated:", !!auth.currentUser);
  const lower = q.toLowerCase();

  console.log("🔍 SEARCH DEBUG - Starting Firestore query...");

  try {
    const snap = await getDocs(query(collection(db, "profiles"), limit(200)));
    console.log("🔍 SEARCH DEBUG - Query completed!");
    console.log("🔍 SEARCH DEBUG - Total profiles fetched:", snap.docs.length);

    const allProfiles = snap.docs.map(
      (d) => ({ id: d.id, ...d.data() }) as any,
    );
    console.log(
      "🔍 SEARCH DEBUG - Sample usernames:",
      allProfiles.slice(0, 5).map((p) => p.username),
    );

    const filtered = allProfiles.filter(
      (p: any) =>
        p.username?.toLowerCase().includes(lower) ||
        p.full_name?.toLowerCase().includes(lower),
    );
    console.log("🔍 SEARCH DEBUG - Filtered results:", filtered.length);
    console.log(
      "🔍 SEARCH DEBUG - Matching usernames:",
      filtered.map((p) => p.username),
    );

    return filtered.slice(0, lim).map((p: any) => ({
      id: p.id,
      username: p.username ?? null,
      full_name: p.full_name ?? null,
      avatar_url: p.avatar_url ?? null,
      follower_count: p.follower_count ?? 0,
      is_private: !!p.is_private,
    }));
  } catch (error) {
    console.error("🔍 SEARCH DEBUG - ERROR:", error);
    console.error("🔍 SEARCH DEBUG - ERROR CODE:", (error as any)?.code);
    console.error("🔍 SEARCH DEBUG - ERROR MESSAGE:", (error as any)?.message);
    throw error;
  }
}

async function searchPosts(q: string, lim: number): Promise<SearchPost[]> {
  const lower = q.toLowerCase();

  const snap = await getDocs(
    query(
      collection(db, "posts"),
      where("visibility", "==", "public"),
      orderBy("created_at_ts", "desc"),
      limit(200),
    ),
  );

  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as any)
    .filter((p: any) => p.is_visible !== false)
    .filter((p: any) => p.content?.toLowerCase().includes(lower))
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
}

async function searchCommunities(
  q: string,
  lim: number,
): Promise<SearchCommunity[]> {
  const lower = q.toLowerCase();
  const snap = await getDocs(
    query(collection(db, "communities"), orderBy("name"), limit(200)),
  );
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as any)
    .filter(
      (c: any) =>
        c.name?.toLowerCase().includes(lower) ||
        c.slug?.toLowerCase().includes(lower) ||
        c.description?.toLowerCase().includes(lower),
    )
    .slice(0, lim)
    .map((c: any) => ({
      id: c.id,
      name: c.name ?? "",
      slug: c.slug ?? "",
      description: c.description ?? null,
      image_url: c.image_url ?? null,
      avatar_url: c.avatar_url ?? null,
    }));
}

export async function fetchSuggestedUsers(lim = 8): Promise<SuggestedUser[]> {
  const uid = auth.currentUser?.uid;

  const followingSet = new Set<string>();
  if (uid) {
    try {
      const followSnap = await getDocs(
        query(
          collection(db, "follows"),
          where("follower_id", "==", uid),
          where("status", "==", "accepted"),
          limit(500),
        ),
      );
      followSnap.docs.forEach((d) => {
        const x = d.data() as any;
        if (x.following_id) followingSet.add(x.following_id);
      });
    } catch {}
  }

  const snap = await getDocs(
    query(
      collection(db, "profiles"),
      orderBy("follower_count", "desc"),
      limit(50),
    ),
  );

  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as any)
    .filter((p: any) => p.id !== uid && !followingSet.has(p.id))
    .slice(0, lim)
    .map((p: any) => ({
      id: p.id,
      username: p.username ?? null,
      full_name: p.full_name ?? null,
      avatar_url: p.avatar_url ?? null,
      follower_count: p.follower_count ?? 0,
      is_private: !!p.is_private,
    }));
}

export async function fetchDiscoveryPosts(lim = 30): Promise<DiscoveryPost[]> {
  const snap = await getDocs(
    query(
      collection(db, "posts"),
      where("visibility", "==", "public"),
      orderBy("created_at_ts", "desc"),
      limit(lim + 20),
    ),
  );

  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as any)
    .filter((p: any) => p.is_visible !== false)
    .filter(
      (p: any) =>
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

const RECENT_SEARCHES_KEY = "nebulanet:recent_searches_v1";
const MAX_RECENT = 8;

export function useRecentSearches() {
  const [recents, setRecents] = useState<string[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(RECENT_SEARCHES_KEY)
      .then((v) => {
        if (v) {
          try {
            const parsed = JSON.parse(v);
            if (Array.isArray(parsed)) setRecents(parsed);
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
  } = params;

  const trimmed = (rawQuery ?? "").trim();
  const debouncedQuery = useDebouncedValue(trimmed, debounceMs);
  const enabled = debouncedQuery.length >= minChars;

  const queryKey = useMemo(
    () => ["search", type, debouncedQuery, lim] as const,
    [type, debouncedQuery, lim],
  );

  const q = useQuery({
    queryKey,
    enabled,
    staleTime: 30_000,
    queryFn: async () => {
      if (type === "account")
        return {
          accounts: await searchAccounts(debouncedQuery, lim),
          posts: [],
          communities: [],
        };
      if (type === "post")
        return {
          accounts: [],
          posts: await searchPosts(debouncedQuery, lim),
          communities: [],
        };
      return {
        accounts: [],
        posts: [],
        communities: await searchCommunities(debouncedQuery, lim),
      };
    },
  });

  return {
    query: trimmed,
    debouncedQuery,
    isSearching: q.isFetching,
    isIdle: !enabled,
    error: (q.error as Error) ?? null,
    data: q.data ?? { accounts: [], posts: [], communities: [] },
    refetch: () => void q.refetch(),
  };
}
