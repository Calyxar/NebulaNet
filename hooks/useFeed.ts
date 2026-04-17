// hooks/useFeed.ts — REACT NATIVE FIREBASE ✅
// ✅ Migrated from web SDK to @react-native-firebase
// ✅ Reads feed preferences (show_nsfw, default_sort) from user settings

import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

export type PostVisibility = "public" | "followers" | "private";

export interface Post {
  id: string;
  content: string;
  title?: string | null;
  user_id: string;
  community_id?: string | null;
  visibility: PostVisibility;
  created_at: string;
  updated_at: string;
  like_count: number;
  comment_count: number;
  share_count: number;
  media_urls?: string[];
  user: {
    id: string;
    username: string;
    full_name?: string | null;
    avatar_url?: string | null;
  };
  community?: {
    id: string;
    name: string;
    slug: string;
    avatar_url?: string | null;
  } | null;
  is_liked?: boolean;
  is_saved?: boolean;
  is_nsfw?: boolean;
  post_type?: string | null;
}

interface CreatePostData {
  title?: string;
  content: string;
  community_id?: string | null;
  visibility?: PostVisibility;
  media_urls?: string[];
}

interface FeedFilters {
  type?: "home" | "community" | "user";
  communitySlug?: string;
  username?: string;
  sort?: "newest" | "popular" | "trending";
}

export interface FeedPreferences {
  show_nsfw: boolean;
  default_sort: "best" | "hot" | "new" | "top";
  auto_play_media: boolean;
  feed_density: "compact" | "normal" | "relaxed";
  hide_spoilers: boolean;
  group_similar_posts: boolean;
  collapse_long_threads: boolean;
}

const DEFAULT_PREFS: FeedPreferences = {
  show_nsfw: false,
  default_sort: "best",
  auto_play_media: true,
  feed_density: "normal",
  hide_spoilers: false,
  group_similar_posts: false,
  collapse_long_threads: false,
};

function tsToIso(ts: any): string {
  if (!ts) return new Date().toISOString();
  if (typeof ts?.toDate === "function") return ts.toDate().toISOString();
  if (typeof ts?.seconds === "number")
    return new Date(ts.seconds * 1000).toISOString();
  const d = new Date(ts);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function normalizeVisibility(v: any): PostVisibility {
  if (v === "public" || v === "followers" || v === "private") return v;
  return "public";
}

// Profile cache to avoid N+1 lookups
const profileCache = new Map<string, any>();

async function getProfilesBatch(userIds: string[]): Promise<Map<string, any>> {
  const toFetch = userIds.filter((id) => !profileCache.has(id));

  for (let i = 0; i < toFetch.length; i += 10) {
    const batch = toFetch.slice(i, i + 10);
    const snap = await firestore()
      .collection("profiles")
      .where(firestore.FieldPath.documentId(), "in", batch)
      .get();
    snap.docs.forEach((d) => {
      profileCache.set(d.id, { id: d.id, ...d.data() });
    });
  }

  const out = new Map<string, any>();
  userIds.forEach((id) => {
    if (profileCache.has(id)) out.set(id, profileCache.get(id));
  });
  return out;
}

export function useFeedPreferences(): FeedPreferences {
  const uid = auth().currentUser?.uid;

  const { data } = useQuery({
    queryKey: ["feed-preferences", uid],
    enabled: !!uid,
    staleTime: 60_000,
    queryFn: async (): Promise<FeedPreferences> => {
      if (!uid) return DEFAULT_PREFS;
      try {
        const snap = await firestore()
          .collection("user_settings")
          .doc(uid)
          .get();
        if (!snap.exists()) return DEFAULT_PREFS;
        const prefs = (snap.data() as any)?.preferences;
        if (!prefs) return DEFAULT_PREFS;
        return {
          show_nsfw: !!prefs.show_nsfw,
          default_sort: prefs.default_sort ?? "best",
          auto_play_media: prefs.auto_play_media !== false,
          feed_density: prefs.feed_density ?? "normal",
          hide_spoilers: !!prefs.hide_spoilers,
          group_similar_posts: !!prefs.group_similar_posts,
          collapse_long_threads: !!prefs.collapse_long_threads,
        };
      } catch {
        return DEFAULT_PREFS;
      }
    },
  });

  return data ?? DEFAULT_PREFS;
}

export function useFeed(filters: FeedFilters = { type: "home" }) {
  const queryClient = useQueryClient();
  const prefs = useFeedPreferences();
  const PAGE_SIZE = 10;

  // Determine effective sort: explicit filter overrides, then pref, then "newest"
  const effectiveSort = filters.sort
    ? filters.sort
    : prefs.default_sort === "new"
      ? "newest"
      : prefs.default_sort === "hot" || prefs.default_sort === "top"
        ? "popular"
        : "newest";

  const fetchPosts = async ({ pageParam = 0 }) => {
    const user = auth().currentUser;

    let postIds: string[] | null = null;

    // Home feed: get posts from followed users + joined communities
    if (filters.type === "home" && user) {
      const [followSnap, memberSnap] = await Promise.all([
        firestore()
          .collection("follows")
          .where("follower_id", "==", user.uid)
          .where("status", "==", "accepted")
          .get(),
        firestore()
          .collection("community_members")
          .where("user_id", "==", user.uid)
          .get(),
      ]);
      const followedIds = followSnap.docs.map(
        (d) => (d.data() as any).following_id as string,
      );
      const communityIds = memberSnap.docs.map(
        (d) => (d.data() as any).community_id as string,
      );
      // Include own posts
      followedIds.push(user.uid);
      postIds = [...followedIds, ...communityIds];
    }

    // Community filter by slug
    let communityId: string | null = null;
    if (filters.type === "community" && filters.communitySlug) {
      const snap = await firestore()
        .collection("communities")
        .where("slug", "==", filters.communitySlug)
        .limit(1)
        .get();
      communityId = snap.empty ? null : snap.docs[0].id;
    }

    // User filter by username
    let filterUserId: string | null = null;
    if (filters.type === "user" && filters.username) {
      const snap = await firestore()
        .collection("profiles")
        .where("username", "==", filters.username)
        .limit(1)
        .get();
      filterUserId = snap.empty ? null : snap.docs[0].id;
    }

    // Determine sort field
    const sortField =
      effectiveSort === "popular" || effectiveSort === "trending"
        ? "like_count"
        : "created_at_ts";

    // Build query
    let ref = firestore().collection("posts");
    let q;

    if (communityId) {
      q = ref
        .where("community_id", "==", communityId)
        .where("is_visible", "==", true)
        .orderBy("created_at_ts", "desc")
        .limit(PAGE_SIZE * (pageParam + 1));
    } else if (filterUserId) {
      q = ref
        .where("user_id", "==", filterUserId)
        .where("is_visible", "==", true)
        .orderBy("created_at_ts", "desc")
        .limit(PAGE_SIZE * (pageParam + 1));
    } else {
      q = ref
        .where("is_visible", "==", true)
        .orderBy(sortField, "desc")
        .limit(PAGE_SIZE * (pageParam + 1));
    }

    const snap = await q.get();
    let docs = snap.docs;

    // Filter to home feed relevant posts
    if (filters.type === "home" && postIds) {
      docs = docs.filter((d) => {
        const data = d.data() as any;
        return (
          postIds!.includes(data.user_id) ||
          postIds!.includes(data.community_id)
        );
      });
    }

    // Trending: last 7 days only
    if (effectiveSort === "trending") {
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      docs = docs.filter((d) => {
        const ts =
          (d.data() as any).created_at_ts ?? (d.data() as any).created_at;
        return new Date(tsToIso(ts)).getTime() > weekAgo;
      });
    }

    // NSFW filter — apply from preferences
    if (!prefs.show_nsfw) {
      docs = docs.filter((d) => !(d.data() as any).is_nsfw);
    }

    // Slice for pagination
    const page = docs.slice(pageParam * PAGE_SIZE, (pageParam + 1) * PAGE_SIZE);

    // Batch-fetch profiles for authors
    const authorIds = Array.from(
      new Set(page.map((d) => (d.data() as any).user_id as string)),
    );
    await getProfilesBatch(authorIds);

    const posts: Post[] = page.map((d) => {
      const data = d.data() as any;
      const profile = profileCache.get(data.user_id);
      return {
        id: d.id,
        content: data.content ?? "",
        title: data.title ?? null,
        user_id: data.user_id,
        community_id: data.community_id ?? null,
        visibility: normalizeVisibility(data.visibility),
        created_at: tsToIso(data.created_at_ts ?? data.created_at),
        updated_at: tsToIso(data.updated_at_ts ?? data.updated_at),
        like_count: data.like_count ?? 0,
        comment_count: data.comment_count ?? 0,
        share_count: data.share_count ?? 0,
        media_urls: data.media_urls ?? [],
        user: profile ?? {
          id: data.user_id,
          username: "unknown",
        },
        community: null,
        is_liked: false,
        is_saved: false,
        is_nsfw: !!data.is_nsfw,
        post_type: data.post_type ?? null,
      };
    });

    return {
      posts,
      nextPage: page.length === PAGE_SIZE ? pageParam + 1 : undefined,
    };
  };

  const feedQuery = useInfiniteQuery({
    queryKey: ["feed", filters, effectiveSort, prefs.show_nsfw],
    queryFn: fetchPosts,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
  });

  const createPost = useMutation({
    mutationFn: async (postData: CreatePostData) => {
      const user = auth().currentUser;
      if (!user) throw new Error("Not authenticated");

      const ref = await firestore()
        .collection("posts")
        .add({
          user_id: user.uid,
          title: postData.title ?? null,
          content: postData.content,
          community_id: postData.community_id ?? null,
          media_urls: postData.media_urls ?? [],
          visibility: postData.visibility ?? "public",
          is_visible: true,
          is_nsfw: false,
          like_count: 0,
          comment_count: 0,
          share_count: 0,
          created_at: new Date().toISOString(),
          created_at_ts: firestore.FieldValue.serverTimestamp(),
          updated_at: new Date().toISOString(),
          updated_at_ts: firestore.FieldValue.serverTimestamp(),
        });
      return { id: ref.id };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["feed"] }),
  });

  const toggleLike = useMutation({
    mutationFn: async (postId: string) => {
      const user = auth().currentUser;
      if (!user) throw new Error("Not authenticated");

      const snap = await firestore()
        .collection("likes")
        .where("user_id", "==", user.uid)
        .where("post_id", "==", postId)
        .get();

      if (!snap.empty) {
        await Promise.all(snap.docs.map((d) => d.ref.delete()));
        return "unliked";
      } else {
        await firestore().collection("likes").add({
          user_id: user.uid,
          post_id: postId,
          created_at: firestore.FieldValue.serverTimestamp(),
        });
        return "liked";
      }
    },
    onSuccess: (_result, postId) => {
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      queryClient.invalidateQueries({ queryKey: ["post", postId] });
    },
  });

  const toggleSave = useMutation({
    mutationFn: async (postId: string) => {
      const user = auth().currentUser;
      if (!user) throw new Error("Not authenticated");

      const snap = await firestore()
        .collection("saves")
        .where("user_id", "==", user.uid)
        .where("post_id", "==", postId)
        .get();

      if (!snap.empty) {
        await Promise.all(snap.docs.map((d) => d.ref.delete()));
        return "unsaved";
      } else {
        await firestore().collection("saves").add({
          user_id: user.uid,
          post_id: postId,
          created_at: firestore.FieldValue.serverTimestamp(),
        });
        return "saved";
      }
    },
    onSuccess: (_result, postId) => {
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      queryClient.invalidateQueries({ queryKey: ["post", postId] });
    },
  });

  return {
    posts: feedQuery.data?.pages.flatMap((p) => p.posts) || [],
    isLoading: feedQuery.isLoading,
    isFetchingNextPage: feedQuery.isFetchingNextPage,
    hasNextPage: !!feedQuery.hasNextPage,
    fetchNextPage: feedQuery.fetchNextPage,
    refetch: feedQuery.refetch,
    createPost,
    toggleLike,
    toggleSave,
    preferences: prefs,
  };
}
