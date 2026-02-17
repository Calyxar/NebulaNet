// hooks/useSearch.ts — FINAL (accounts / posts / communities + visibility + post_type + debounce fixed)

import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

export type SearchType = "account" | "post" | "community";

/* =========================================================
   TYPES
========================================================= */

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
  post_type?: string | null; // ✅ FIXED (was missing before)
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
  avatar_url: string | null;
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

/* =========================================================
   DEBOUNCE
========================================================= */

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebounced(value);
    }, delayMs);

    return () => clearTimeout(timeout);
  }, [value, delayMs]);

  return debounced;
}

/* =========================================================
   SUPABASE SEARCH QUERIES
========================================================= */

async function searchAccounts(q: string, limit: number) {
  const like = `%${q}%`;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url")
    .or(`username.ilike.${like},full_name.ilike.${like}`)
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as SearchAccount[];
}

async function searchPosts(q: string, limit: number) {
  const like = `%${q}%`;

  const { data, error } = await supabase
    .from("posts")
    .select(
      `
      id,
      content,
      created_at,
      media_urls,
      like_count,
      comment_count,
      share_count,
      visibility,
      post_type,
      user:profiles!posts_user_id_fkey (
        id,
        username,
        full_name,
        avatar_url
      )
      `,
    )
    .ilike("content", like)
    .eq("visibility", "public") // ✅ IMPORTANT (prevents RLS issues)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as SearchPost[];
}

async function searchCommunities(q: string, limit: number) {
  const like = `%${q}%`;

  const { data, error } = await supabase
    .from("communities")
    .select("id, name, slug, description, avatar_url")
    .or(`name.ilike.${like},description.ilike.${like}`)
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as SearchCommunity[];
}

/* =========================================================
   MAIN HOOK
========================================================= */

export function useSearch(params: UseSearchParams): UseSearchReturn {
  const { type, query, limit = 20, minChars = 2, debounceMs = 350 } = params;

  const trimmed = (query ?? "").trim();
  const debouncedQuery = useDebouncedValue(trimmed, debounceMs);

  const enabled = debouncedQuery.length >= minChars;

  const queryKey = useMemo(
    () => ["search", type, debouncedQuery, limit] as const,
    [type, debouncedQuery, limit],
  );

  const q = useQuery({
    queryKey,
    enabled,
    staleTime: 30_000,
    queryFn: async () => {
      if (type === "account") {
        const accounts = await searchAccounts(debouncedQuery, limit);
        return { accounts, posts: [], communities: [] };
      }

      if (type === "post") {
        const posts = await searchPosts(debouncedQuery, limit);
        return { accounts: [], posts, communities: [] };
      }

      const communities = await searchCommunities(debouncedQuery, limit);
      return { accounts: [], posts: [], communities };
    },
  });

  const data = q.data ?? {
    accounts: [],
    posts: [],
    communities: [],
  };

  return {
    query: trimmed,
    debouncedQuery,
    isSearching: q.isFetching,
    isIdle: !enabled,
    error: (q.error as Error) ?? null,
    data,
    refetch: () => {
      void q.refetch();
    },
  };
}
