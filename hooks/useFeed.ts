// hooks/useFeed.ts
import { MediaItem } from '@/components/media/MediaUpload';
import { supabase } from '@/lib/supabase';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface Post {
  id: string;
  content: string;
  title?: string;
  user_id: string;
  community_id?: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  like_count: number;
  comment_count: number;
  share_count: number;
  media: MediaItem[];
  user: {
    id: string;
    username: string;
    full_name?: string;
    avatar_url?: string;
  };
  community?: {
    id: string;
    name: string;
    slug: string;
    avatar_url?: string;
  };
  is_liked?: boolean;
  is_saved?: boolean;
}

interface CreatePostData {
  title?: string;
  content: string;
  community_id?: string;
  is_public: boolean;
  media?: MediaItem[];
}

interface FeedFilters {
  type?: 'home' | 'community' | 'user';
  communitySlug?: string;
  username?: string;
  sort?: 'newest' | 'popular' | 'trending';
}

export function useFeed(filters: FeedFilters = { type: 'home' }) {
  const queryClient = useQueryClient();
  const PAGE_SIZE = 10;

  const fetchPosts = async ({ pageParam = 0 }) => {
    let query = supabase
      .from('posts')
      .select(`
        *,
        user:profiles!posts_user_id_fkey(id, username, full_name, avatar_url),
        community:communities!posts_community_id_fkey(id, name, slug, avatar_url),
        likes!left(*),
        saves!left(*)
      `)
      .order('created_at', { ascending: false })
      .range(pageParam * PAGE_SIZE, (pageParam + 1) * PAGE_SIZE - 1);

    // Apply filters
    if (filters.type === 'community' && filters.communitySlug) {
      const { data: community } = await supabase
        .from('communities')
        .select('id')
        .eq('slug', filters.communitySlug)
        .single();

      if (community) {
        query = query.eq('community_id', community.id);
      }
    }

    if (filters.type === 'user' && filters.username) {
      const { data: user } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', filters.username)
        .single();

      if (user) {
        query = query.eq('user_id', user.id);
      }
    }

    if (filters.type === 'home') {
      // For home feed, get posts from followed users and communities
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Get followed users
        const { data: followedUsers } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id);

        // Get joined communities
        const { data: joinedCommunities } = await supabase
          .from('community_members')
          .select('community_id')
          .eq('user_id', user.id);

        const userIds = followedUsers?.map(f => f.following_id) || [];
        const communityIds = joinedCommunities?.map(j => j.community_id) || [];

        query = query.or(`user_id.in.(${userIds.join(',')}),community_id.in.(${communityIds.join(',')})`);
      }
    }

    // Apply sort
    if (filters.sort === 'popular') {
      query = query.order('like_count', { ascending: false });
    } else if (filters.sort === 'trending') {
      // Trending = recent posts with high engagement
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      query = query.gte('created_at', weekAgo.toISOString());
      query = query.order('like_count', { ascending: false });
    }

    const { data, error } = await query;

    if (error) throw error;

    // Check if user liked/saved each post
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const postsWithStatus = data?.map(post => ({
        ...post,
        is_liked: post.likes?.some((like: any) => like.user_id === user.id),
        is_saved: post.saves?.some((save: any) => save.user_id === user.id),
      })) || [];

      return {
        posts: postsWithStatus,
        nextPage: data?.length === PAGE_SIZE ? pageParam + 1 : undefined,
      };
    }

    return {
      posts: data || [],
      nextPage: data?.length === PAGE_SIZE ? pageParam + 1 : undefined,
    };
  };

  const feedQuery = useInfiniteQuery({
    queryKey: ['feed', filters],
    queryFn: fetchPosts,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
  });

  const createPost = useMutation({
    mutationFn: async (postData: CreatePostData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('posts')
        .insert({
          ...postData,
          user_id: user.id,
          media: postData.media || [],
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });

  const toggleLike = useMutation({
    mutationFn: async (postId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check if already liked
      const { data: existingLike } = await supabase
        .from('likes')
        .select('*')
        .eq('user_id', user.id)
        .eq('post_id', postId)
        .single();

      if (existingLike) {
        // Unlike
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('user_id', user.id)
          .eq('post_id', postId);
        
        if (error) throw error;
        return 'unliked';
      } else {
        // Like
        const { error } = await supabase
          .from('likes')
          .insert({
            user_id: user.id,
            post_id: postId,
          });
        
        if (error) throw error;
        return 'liked';
      }
    },
    onSuccess: (result, postId) => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['post', postId] });
    },
  });

  const toggleSave = useMutation({
    mutationFn: async (postId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check if already saved
      const { data: existingSave } = await supabase
        .from('saves')
        .select('*')
        .eq('user_id', user.id)
        .eq('post_id', postId)
        .single();

      if (existingSave) {
        // Unsave
        const { error } = await supabase
          .from('saves')
          .delete()
          .eq('user_id', user.id)
          .eq('post_id', postId);
        
        if (error) throw error;
        return 'unsaved';
      } else {
        // Save
        const { error } = await supabase
          .from('saves')
          .insert({
            user_id: user.id,
            post_id: postId,
          });
        
        if (error) throw error;
        return 'saved';
      }
    },
    onSuccess: (result, postId) => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['post', postId] });
    },
  });

  return {
    posts: feedQuery.data?.pages.flatMap(page => page.posts) || [],
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