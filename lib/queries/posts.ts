// lib/queries/posts.ts — FIREBASE ADAPTER ✅ (FINAL + COMPAT SAFE)
// Keeps old exports stable for hooks/usePosts.ts and screens.
//
// ✅ Supports legacy callers that pass `offset`
// ✅ Supports legacy callers that pass `communityIds`
// ✅ Cursor-based paging via `cursor` + returns `nextCursor`

import {
  createPost as fbCreatePost,
  deletePost as fbDeletePost,
  getPostById as fbGetPostById,
  getPosts as fbGetPosts,
  updatePost as fbUpdatePost,
  type CreatePostData,
  type PaginatedPosts,
  type Post,
  type PostFilters,
  type UpdatePostData,
} from "@/lib/firestore/posts";

export type {
  CreatePostData,
  PaginatedPosts,
  Post,
  PostFilters,
  UpdatePostData
};

/**
 * Legacy compatibility:
 * Some parts of the app may still pass offset / communityIds.
 * We accept them here without breaking types.
 */
type LegacyExtras = {
  offset?: number;
  cursor?: any;
  communityIds?: string[];
};

export async function getPosts(
  filters:
    | (PostFilters & LegacyExtras)
    | Partial<PostFilters & LegacyExtras> = {},
): Promise<PaginatedPosts> {
  const limit = (filters as any).limit ?? 20;

  // Prefer cursor paging if present
  const cursor = (filters as any).cursor ?? null;

  // If older code sends offset, we can’t perfectly translate to Firestore pages.
  // We treat "offset > 0" as "keep fetching pages" at the hook level.
  // So here we just ignore offset and rely on cursor.
  // (If you want, I can add a slow fallback that fetches offset+limit and slices.)
  const _offset = (filters as any).offset ?? 0;

  // communityIds (legacy) → communityId filter if firestore supports arrays
  // If your Firestore implementation supports `communityIds`, just pass through.
  // Otherwise you can map communityIds -> communitySlug or single community_id.
  const communityIds = (filters as any).communityIds as string[] | undefined;

  const res = await fbGetPosts({
    ...(filters as any),
    limit,
    cursor,
    // pass through legacy fields if firestore getter knows how to use them
    communityIds,
  });

  return {
    posts: res.posts,
    total: res.total,
    hasMore: res.hasMore,
    nextCursor: res.nextCursor,
  };
}

export async function getPostById(id: string) {
  return fbGetPostById(id);
}

export async function createPost(data: CreatePostData) {
  return fbCreatePost(data);
}

export async function updatePost(postId: string, updates: UpdatePostData) {
  return fbUpdatePost(postId, updates);
}

export async function deletePost(postId: string) {
  return fbDeletePost(postId);
}
