// hooks/useSearch.ts — FIREBASE ✅

import { db } from "@/lib/firebase";
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
import { useEffect, useMemo, useState } from "react";

export type SearchType = "account" | "post" | "community";

export type SearchAccount = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
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

// Firestore doesn't support ilike — we fetch and filter client-side for small collections
async function searchAccounts(
  q: string,
  lim: number,
): Promise<SearchAccount[]> {
  const lower = q.toLowerCase();
  const snap = await getDocs(query(collection(db, "profiles"), limit(200)));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as any)
    .filter(
      (p: any) =>
        p.username?.toLowerCase().includes(lower) ||
        p.full_name?.toLowerCase().includes(lower),
    )
    .slice(0, lim)
    .map((p: any) => ({
      id: p.id,
      username: p.username ?? null,
      full_name: p.full_name ?? null,
      avatar_url: p.avatar_url ?? null,
    }));
}

async function searchPosts(q: string, lim: number): Promise<SearchPost[]> {
  const lower = q.toLowerCase();
  const snap = await getDocs(
    query(
      collection(db, "posts"),
      where("visibility", "==", "public"),
      where("is_visible", "==", true),
      orderBy("created_at", "desc"),
      limit(200),
    ),
  );
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as any)
    .filter((p: any) => p.content?.toLowerCase().includes(lower))
    .slice(0, lim)
    .map((p: any) => ({
      id: p.id,
      content: p.content ?? null,
      created_at: tsToIso(p.created_at),
      media_urls: p.media_urls ?? null,
      like_count: p.like_count ?? null,
      comment_count: p.comment_count ?? null,
      share_count: p.share_count ?? null,
      visibility: p.visibility ?? "public",
      user: null,
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
