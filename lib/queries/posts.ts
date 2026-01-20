// lib/queries/posts.ts
import { MediaItem } from '@/components/media/MediaUpload';
import { supabase } from '@/lib/supabase';
import { deleteMediaItems, uploadMediaItems } from '@/lib/uploads';

// Define the actual response type from Supabase with joins
interface SupabasePostResponse {
  id: string;
  user_id: string;
  title?: string;
  content: string;
  media: MediaItem[];
  community_id?: string;
  is_public: boolean;
  like_count: number;
  comment_count: number;
  share_count: number;
  created_at: string;
  updated_at: string;
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
}

export interface Post extends SupabasePostResponse {
  is_liked?: boolean;
  is_saved?: boolean;
  is_owned?: boolean;
}

export interface CreatePostData {
  title?: string;
  content: string;
  media?: MediaItem[];
  community_id?: string;
  is_public: boolean;
}

export interface UpdatePostData {
  title?: string;
  content?: string;
  media?: MediaItem[];
  is_public?: boolean;
}

export interface PostFilters {
  limit?: number;
  offset?: number;
  communitySlug?: string;
  username?: string;
  userId?: string;
  isPublic?: boolean;
  sortBy?: 'newest' | 'popular' | 'trending';
  includeSaved?: boolean;
  includeLiked?: boolean;
}

export interface PaginatedPosts {
  posts: Post[];
  total: number;
  hasMore: boolean;
}

// Get posts with filters
export async function getPosts(filters: PostFilters = {}): Promise<PaginatedPosts> {
  const {
    limit = 20,
    offset = 0,
    communitySlug,
    username,
    userId,
    isPublic,
    sortBy = 'newest',
    // Removed unused variables: includeSaved, includeLiked
  } = filters;

  let query = supabase
    .from('posts')
    .select(`
      *,
      user:profiles!posts_user_id_fkey(id, username, full_name, avatar_url),
      community:communities!posts_community_id_fkey(id, name, slug, avatar_url)
    `, { count: 'exact' });

  // Apply filters
  if (communitySlug) {
    const { data: community } = await supabase
      .from('communities')
      .select('id')
      .eq('slug', communitySlug)
      .single();

    if (community) {
      query = query.eq('community_id', community.id);
    }
  }

  if (username) {
    const { data: user } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .single();

    if (user) {
      query = query.eq('user_id', user.id);
    }
  }

  if (userId) {
    query = query.eq('user_id', userId);
  }

  if (isPublic !== undefined) {
    query = query.eq('is_public', isPublic);
  }

  // Apply sorting
  switch (sortBy) {
    case 'popular':
      query = query.order('like_count', { ascending: false });
      break;
    case 'trending':
      // Trending = posts from last 7 days with most engagement
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      query = query.gte('created_at', weekAgo.toISOString());
      query = query.order('like_count', { ascending: false });
      break;
    case 'newest':
    default:
      query = query.order('created_at', { ascending: false });
  }

  // Apply pagination
  query = query.range(offset, offset + limit - 1);

  const { data: posts, error, count } = await query;

  if (error) {
    console.error('Error fetching posts:', error);
    return { posts: [], total: 0, hasMore: false };
  }

  // Get current user to check likes/saves
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user && posts && posts.length > 0) {
    // Check which posts are liked
    const { data: likedPosts } = await supabase
      .from('likes')
      .select('post_id')
      .eq('user_id', user.id)
      .in('post_id', posts.map(p => p.id));

    // Check which posts are saved
    const { data: savedPosts } = await supabase
      .from('saves')
      .select('post_id')
      .eq('user_id', user.id)
      .in('post_id', posts.map(p => p.id));

    const likedPostIds = likedPosts?.map(lp => lp.post_id) || [];
    const savedPostIds = savedPosts?.map(sp => sp.post_id) || [];

    // Add flags to posts with proper typing
    const postsWithFlags: Post[] = posts.map((post: SupabasePostResponse) => ({
      ...post,
      is_liked: likedPostIds.includes(post.id),
      is_saved: savedPostIds.includes(post.id),
      is_owned: post.user_id === user.id,
    }));

    return {
      posts: postsWithFlags,
      total: count || 0,
      hasMore: (count || 0) > offset + limit,
    };
  }

  return {
    posts: posts as Post[] || [],
    total: count || 0,
    hasMore: (count || 0) > offset + limit,
  };
}

// Get single post by ID
export async function getPostById(id: string): Promise<Post | null> {
  const { data: post, error } = await supabase
    .from('posts')
    .select(`
      *,
      user:profiles!posts_user_id_fkey(id, username, full_name, avatar_url),
      community:communities!posts_community_id_fkey(id, name, slug, avatar_url)
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching post:', error);
    return null;
  }

  // Get current user to check likes/saves
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user) {
    // Check if liked
    const { data: like } = await supabase
      .from('likes')
      .select('*')
      .eq('post_id', id)
      .eq('user_id', user.id)
      .single();

    // Check if saved
    const { data: save } = await supabase
      .from('saves')
      .select('*')
      .eq('post_id', id)
      .eq('user_id', user.id)
      .single();

    return {
      ...post,
      is_liked: !!like,
      is_saved: !!save,
      is_owned: post.user_id === user.id,
    } as Post;
  }

  return post as Post;
}

// Create a new post
export async function createPost(postData: CreatePostData): Promise<Post | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Upload media files if any
    let media = postData.media || [];
    if (media.length > 0) {
      media = await uploadMediaItems(media, {
        compressImages: true,
        generateThumbnails: true,
      });
    }

    const { data: post, error } = await supabase
      .from('posts')
      .insert({
        user_id: user.id,
        title: postData.title,
        content: postData.content,
        media,
        community_id: postData.community_id,
        is_public: postData.is_public,
        like_count: 0,
        comment_count: 0,
        share_count: 0,
      })
      .select(`
        *,
        user:profiles!posts_user_id_fkey(id, username, full_name, avatar_url),
        community:communities!posts_community_id_fkey(id, name, slug, avatar_url)
      `)
      .single();

    if (error) throw error;

    // Update user's post count
    await supabase.rpc('increment_post_count', { user_id: user.id });

    return {
      ...post,
      is_liked: false,
      is_saved: false,
      is_owned: true,
    } as Post;
  } catch (error) {
    console.error('Error creating post:', error);
    return null;
  }
}

// Update a post
export async function updatePost(
  id: string, 
  updates: UpdatePostData
): Promise<Post | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Verify ownership
    const { data: existingPost } = await supabase
      .from('posts')
      .select('user_id, media')
      .eq('id', id)
      .single();

    if (!existingPost || existingPost.user_id !== user.id) {
      throw new Error('Not authorized to update this post');
    }

    // Handle media updates
    let media = updates.media;
    if (media && media.length > 0) {
      // Delete old media files
      const oldMedia = existingPost.media || [];
      await deleteMediaItems(oldMedia);

      // Upload new media
      media = await uploadMediaItems(media, {
        compressImages: true,
        generateThumbnails: true,
      });
    }

    const updateData: any = { ...updates };
    if (media) updateData.media = media;

    const { data: post, error } = await supabase
      .from('posts')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(`
        *,
        user:profiles!posts_user_id_fkey(id, username, full_name, avatar_url),
        community:communities!posts_community_id_fkey(id, name, slug, avatar_url)
      `)
      .single();

    if (error) throw error;

    return {
      ...post,
      is_owned: true,
    } as Post;
  } catch (error) {
    console.error('Error updating post:', error);
    return null;
  }
}

// Delete a post
export async function deletePost(id: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get post to delete media files
    const { data: post } = await supabase
      .from('posts')
      .select('user_id, media')
      .eq('id', id)
      .single();

    if (!post) throw new Error('Post not found');
    if (post.user_id !== user.id) throw new Error('Not authorized');

    // Delete media files
    if (post.media && post.media.length > 0) {
      await deleteMediaItems(post.media);
    }

    // Delete post
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Decrement user's post count
    await supabase.rpc('decrement_post_count', { user_id: user.id });

    return true;
  } catch (error) {
    console.error('Error deleting post:', error);
    return false;
  }
}

// Toggle like on a post
export async function toggleLike(postId: string): Promise<{
  liked: boolean;
  like_count: number;
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Check if already liked
    const { data: existingLike } = await supabase
      .from('likes')
      .select('*')
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .single();

    if (existingLike) {
      // Unlike
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Decrement like count
      const { data: post } = await supabase.rpc('decrement_like_count', { 
        post_id: postId 
      });

      return {
        liked: false,
        like_count: post?.like_count || 0,
      };
    } else {
      // Like
      const { error } = await supabase
        .from('likes')
        .insert({
          post_id: postId,
          user_id: user.id,
        });

      if (error) throw error;

      // Increment like count
      const { data: post } = await supabase.rpc('increment_like_count', { 
        post_id: postId 
      });

      // Create notification for post owner
      const { data: postData } = await supabase
        .from('posts')
        .select('user_id')
        .eq('id', postId)
        .single();

      if (postData && postData.user_id !== user.id) {
        await supabase
          .from('notifications')
          .insert({
            type: 'like',
            sender_id: user.id,
            receiver_id: postData.user_id,
            post_id: postId,
          });
      }

      return {
        liked: true,
        like_count: post?.like_count || 0,
      };
    }
  } catch (error) {
    console.error('Error toggling like:', error);
    throw error;
  }
}

// Toggle save on a post
export async function toggleSave(postId: string): Promise<{
  saved: boolean;
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Check if already saved
    const { data: existingSave } = await supabase
      .from('saves')
      .select('*')
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .single();

    if (existingSave) {
      // Unsave
      const { error } = await supabase
        .from('saves')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', user.id);

      if (error) throw error;

      return { saved: false };
    } else {
      // Save
      const { error } = await supabase
        .from('saves')
        .insert({
          post_id: postId,
          user_id: user.id,
        });

      if (error) throw error;

      return { saved: true };
    }
  } catch (error) {
    console.error('Error toggling save:', error);
    throw error;
  }
}

// Share a post
export async function sharePost(postId: string): Promise<{
  share_count: number;
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Increment share count
    const { data: post } = await supabase.rpc('increment_share_count', { 
      post_id: postId 
    });

    // Create notification for post owner
    const { data: postData } = await supabase
      .from('posts')
      .select('user_id')
      .eq('id', postId)
      .single();

    if (postData && postData.user_id !== user.id) {
      await supabase
        .from('notifications')
        .insert({
          type: 'post_shared',
          sender_id: user.id,
          receiver_id: postData.user_id,
          post_id: postId,
        });
    }

    return {
      share_count: post?.share_count || 0,
    };
  } catch (error) {
    console.error('Error sharing post:', error);
    throw error;
  }
}

// Get user's liked posts - Fixed with proper typing
export async function getLikedPosts(userId: string, limit = 20, offset = 0): Promise<PaginatedPosts> {
  const { data: likes, error } = await supabase
    .from('likes')
    .select(`
      post:posts!inner(
        *,
        user:profiles!posts_user_id_fkey(id, username, full_name, avatar_url),
        community:communities!posts_community_id_fkey(id, name, slug, avatar_url)
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching liked posts:', error);
    return { posts: [], total: 0, hasMore: false };
  }

  // Type the response properly
  const posts: Post[] = (likes || []).map((like: any) => {
    const post = like.post as SupabasePostResponse;
    return {
      ...post,
      is_liked: true,
      is_owned: post.user_id === userId,
    };
  });

  return {
    posts,
    total: posts.length,
    hasMore: posts.length === limit,
  };
}

// Get user's saved posts - Fixed with proper typing
export async function getSavedPosts(userId: string, limit = 20, offset = 0): Promise<PaginatedPosts> {
  const { data: saves, error } = await supabase
    .from('saves')
    .select(`
      post:posts!inner(
        *,
        user:profiles!posts_user_id_fkey(id, username, full_name, avatar_url),
        community:communities!posts_community_id_fkey(id, name, slug, avatar_url)
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching saved posts:', error);
    return { posts: [], total: 0, hasMore: false };
  }

  // Type the response properly
  const posts: Post[] = (saves || []).map((save: any) => {
    const post = save.post as SupabasePostResponse;
    return {
      ...post,
      is_saved: true,
      is_owned: post.user_id === userId,
    };
  });

  return {
    posts,
    total: posts.length,
    hasMore: posts.length === limit,
  };
}

// Get trending posts (most liked in last 7 days)
export async function getTrendingPosts(limit = 10): Promise<Post[]> {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const { data: posts, error } = await supabase
    .from('posts')
    .select(`
      *,
      user:profiles!posts_user_id_fkey(id, username, full_name, avatar_url),
      community:communities!posts_community_id_fkey(id, name, slug, avatar_url)
    `)
    .gte('created_at', weekAgo.toISOString())
    .order('like_count', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching trending posts:', error);
    return [];
  }

  return (posts || []) as Post[];
}

// Subscribe to post updates
export function subscribeToPost(
  postId: string,
  callback: (post: Post) => void
) {
  return supabase
    .channel(`post:${postId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'posts',
        filter: `id=eq.${postId}`,
      },
      async (payload) => {
        const post = await getPostById(postId);
        if (post) callback(post);
      }
    )
    .subscribe();
}