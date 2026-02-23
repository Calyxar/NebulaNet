// hooks/useFeed.ts — FIREBASE ✅

import { auth, db } from "@/lib/firebase";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  addDoc,
  collection,
  deleteDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  where,
} from "firebase/firestore";

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

function tsToIso(ts: any): string {
  if (!ts) return new Date().toISOString();
  if (ts instanceof Timestamp) return ts.toDate().toISOString();
  return new Date(ts).toISOString();
}

function normalizeVisibility(v: any): PostVisibility {
  if (v === "public" || v === "followers" || v === "private") return v;
  return "public";
}

export function useFeed(filters: FeedFilters = { type: "home" }) {
  const queryClient = useQueryClient();
  const PAGE_SIZE = 10;

  const fetchPosts = async ({ pageParam = 0 }) => {
    const user = auth.currentUser;

    let postIds: string[] | null = null;

    // Home feed: get posts from followed users + joined communities
    if (filters.type === "home" && user) {
      const [followSnap, memberSnap] = await Promise.all([
        getDocs(
          query(
            collection(db, "follows"),
            where("follower_id", "==", user.uid),
            where("status", "==", "accepted"),
          ),
        ),
        getDocs(
          query(
            collection(db, "community_members"),
            where("user_id", "==", user.uid),
          ),
        ),
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
      const snap = await getDocs(
        query(
          collection(db, "communities"),
          where("slug", "==", filters.communitySlug),
          limit(1),
        ),
      );
      communityId = snap.empty ? null : snap.docs[0].id;
    }

    // User filter by username
    let filterUserId: string | null = null;
    if (filters.type === "user" && filters.username) {
      const snap = await getDocs(
        query(
          collection(db, "profiles"),
          where("username", "==", filters.username),
          limit(1),
        ),
      );
      filterUserId = snap.empty ? null : snap.docs[0].id;
    }

    // Build query
    let q = query(
      collection(db, "posts"),
      where("is_visible", "==", true),
      orderBy(
        filters.sort === "popular" || filters.sort === "trending"
          ? "like_count"
          : "created_at",
        "desc",
      ),
      limit(PAGE_SIZE * (pageParam + 1)),
    );

    if (communityId) {
      q = query(
        collection(db, "posts"),
        where("community_id", "==", communityId),
        where("is_visible", "==", true),
        orderBy("created_at", "desc"),
        limit(PAGE_SIZE * (pageParam + 1)),
      );
    } else if (filterUserId) {
      q = query(
        collection(db, "posts"),
        where("user_id", "==", filterUserId),
        where("is_visible", "==", true),
        orderBy("created_at", "desc"),
        limit(PAGE_SIZE * (pageParam + 1)),
      );
    }

    const snap = await getDocs(q);
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
    if (filters.sort === "trending") {
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      docs = docs.filter((d) => {
        const ts = (d.data() as any).created_at;
        return tsToIso(ts) > new Date(weekAgo).toISOString();
      });
    }

    // Slice for pagination
    const page = docs.slice(pageParam * PAGE_SIZE, (pageParam + 1) * PAGE_SIZE);

    // Fetch profiles for authors
    const profileCache = new Map<string, any>();
    for (const d of page) {
      const userId = (d.data() as any).user_id;
      if (userId && !profileCache.has(userId)) {
        const pSnap = await getDocs(
          query(collection(db, "profiles"), where("__name__", "in", [userId])),
        );
        if (!pSnap.empty)
          profileCache.set(userId, {
            id: pSnap.docs[0].id,
            ...pSnap.docs[0].data(),
          });
      }
    }

    const posts: Post[] = page.map((d) => {
      const data = d.data() as any;
      return {
        id: d.id,
        content: data.content ?? "",
        title: data.title ?? null,
        user_id: data.user_id,
        community_id: data.community_id ?? null,
        visibility: normalizeVisibility(data.visibility),
        created_at: tsToIso(data.created_at),
        updated_at: tsToIso(data.updated_at),
        like_count: data.like_count ?? 0,
        comment_count: data.comment_count ?? 0,
        share_count: data.share_count ?? 0,
        media_urls: data.media_urls ?? [],
        user: profileCache.get(data.user_id) ?? {
          id: data.user_id,
          username: "unknown",
        },
        community: null,
        is_liked: false,
        is_saved: false,
      };
    });

    return {
      posts,
      nextPage: page.length === PAGE_SIZE ? pageParam + 1 : undefined,
    };
  };

  const feedQuery = useInfiniteQuery({
    queryKey: ["feed", filters],
    queryFn: fetchPosts,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
  });

  const createPost = useMutation({
    mutationFn: async (postData: CreatePostData) => {
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");

      const ref = await addDoc(collection(db, "posts"), {
        user_id: user.uid,
        title: postData.title ?? null,
        content: postData.content,
        community_id: postData.community_id ?? null,
        media_urls: postData.media_urls ?? [],
        visibility: postData.visibility ?? "public",
        is_visible: true,
        like_count: 0,
        comment_count: 0,
        share_count: 0,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
      return { id: ref.id };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["feed"] }),
  });

  const toggleLike = useMutation({
    mutationFn: async (postId: string) => {
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");

      const snap = await getDocs(
        query(
          collection(db, "likes"),
          where("user_id", "==", user.uid),
          where("post_id", "==", postId),
        ),
      );
      if (!snap.empty) {
        await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
        return "unliked";
      } else {
        await addDoc(collection(db, "likes"), {
          user_id: user.uid,
          post_id: postId,
          created_at: serverTimestamp(),
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
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");

      const snap = await getDocs(
        query(
          collection(db, "saves"),
          where("user_id", "==", user.uid),
          where("post_id", "==", postId),
        ),
      );
      if (!snap.empty) {
        await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
        return "unsaved";
      } else {
        await addDoc(collection(db, "saves"), {
          user_id: user.uid,
          post_id: postId,
          created_at: serverTimestamp(),
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
  };
}
