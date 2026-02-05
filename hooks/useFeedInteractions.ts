// hooks/useFeedInteractions.ts
import {
  incrementShareCount,
  likePost,
  savePost,
  trackPostView,
} from "@/lib/supabase";

type UpdateAllFeeds<T> = (updater: (posts: T[]) => T[]) => void;

type FeedPostLikeShape = {
  id: string;
  like_count: number;
  is_liked?: boolean;
  save_count: number;
  is_saved?: boolean;
  share_count: number;
  view_count: number;
};

export function useFeedInteractions<T extends FeedPostLikeShape>({
  updateAllFeeds,
}: {
  updateAllFeeds: UpdateAllFeeds<T>;
}) {
  const toggleLike = async (postId: string, currentlyLiked: boolean) => {
    // optimistic
    updateAllFeeds((posts) =>
      posts.map((p) =>
        p.id === postId
          ? {
              ...p,
              is_liked: !currentlyLiked,
              like_count: p.like_count + (currentlyLiked ? -1 : 1),
            }
          : p,
      ),
    );

    try {
      await likePost(postId);
    } catch {
      // rollback
      updateAllFeeds((posts) =>
        posts.map((p) =>
          p.id === postId
            ? {
                ...p,
                is_liked: currentlyLiked,
                like_count:
                  p.like_count +
                  (currentlyLiked ? 0 : -1) +
                  (currentlyLiked ? 1 : 0),
              }
            : p,
        ),
      );
    }
  };

  const toggleSave = async (postId: string, currentlySaved: boolean) => {
    updateAllFeeds((posts) =>
      posts.map((p) =>
        p.id === postId
          ? {
              ...p,
              is_saved: !currentlySaved,
              save_count: p.save_count + (currentlySaved ? -1 : 1),
            }
          : p,
      ),
    );

    try {
      await savePost(postId);
    } catch {
      updateAllFeeds((posts) =>
        posts.map((p) =>
          p.id === postId
            ? {
                ...p,
                is_saved: currentlySaved,
                save_count:
                  p.save_count +
                  (currentlySaved ? 0 : -1) +
                  (currentlySaved ? 1 : 0),
              }
            : p,
        ),
      );
    }
  };

  const bumpShare = async (postId: string) => {
    updateAllFeeds((posts) =>
      posts.map((p) =>
        p.id === postId ? { ...p, share_count: p.share_count + 1 } : p,
      ),
    );

    try {
      await incrementShareCount(postId);
    } catch {
      updateAllFeeds((posts) =>
        posts.map((p) =>
          p.id === postId ? { ...p, share_count: p.share_count - 1 } : p,
        ),
      );
    }
  };

  const trackView = async (postId: string) => {
    // optimistic bump (optional)
    updateAllFeeds((posts) =>
      posts.map((p) =>
        p.id === postId ? { ...p, view_count: p.view_count + 1 } : p,
      ),
    );

    try {
      await trackPostView(postId);
    } catch {
      // rollback view bump if your backend rejected it
      updateAllFeeds((posts) =>
        posts.map((p) =>
          p.id === postId
            ? { ...p, view_count: Math.max(0, p.view_count - 1) }
            : p,
        ),
      );
    }
  };

  return { toggleLike, toggleSave, bumpShare, trackView };
}
