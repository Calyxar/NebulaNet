// lib/queries/comments.ts
import { supabase } from '@/lib/supabase';

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  parent_id?: string;
  like_count: number;
  reply_count: number;
  created_at: string;
  updated_at: string;
  user: {
    id: string;
    username: string;
    full_name?: string;
    avatar_url?: string;
  };
  is_liked?: boolean;
  is_owned?: boolean;
  replies?: Comment[];
}

export interface CreateCommentData {
  post_id: string;
  content: string;
  parent_id?: string;
}

export interface UpdateCommentData {
  content: string;
}

// Get comments for a post
export async function getComments(
  postId: string,
  includeReplies = true
): Promise<Comment[]> {
  const { data: comments, error } = await supabase
    .from('comments')
    .select(`
      *,
      user:profiles!comments_user_id_fkey(id, username, full_name, avatar_url)
    `)
    .eq('post_id', postId)
    .is('parent_id', null) // Only top-level comments
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching comments:', error);
    return [];
  }

  // Get current user to check likes
  const { data: { user: currentUser } } = await supabase.auth.getUser();

  const commentsWithLikes = await Promise.all(
    (comments || []).map(async (comment) => {
      let is_liked = false;
      let replies: Comment[] = [];

      if (currentUser) {
        const { data: like } = await supabase
          .from('comment_likes')
          .select('*')
          .eq('comment_id', comment.id)
          .eq('user_id', currentUser.id)
          .single();

        is_liked = !!like;
      }

      if (includeReplies) {
        replies = await getCommentReplies(comment.id);
      }

      return {
        ...comment,
        is_liked,
        is_owned: comment.user_id === currentUser?.id,
        replies,
      };
    })
  );

  return commentsWithLikes;
}

// Get replies for a comment
export async function getCommentReplies(parentId: string): Promise<Comment[]> {
  const { data: replies, error } = await supabase
    .from('comments')
    .select(`
      *,
      user:profiles!comments_user_id_fkey(id, username, full_name, avatar_url)
    `)
    .eq('parent_id', parentId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching comment replies:', error);
    return [];
  }

  // Get current user to check likes
  const { data: { user: currentUser } } = await supabase.auth.getUser();

  const repliesWithLikes = await Promise.all(
    (replies || []).map(async (reply) => {
      let is_liked = false;

      if (currentUser) {
        const { data: like } = await supabase
          .from('comment_likes')
          .select('*')
          .eq('comment_id', reply.id)
          .eq('user_id', currentUser.id)
          .single();

        is_liked = !!like;
      }

      return {
        ...reply,
        is_liked,
        is_owned: reply.user_id === currentUser?.id,
      };
    })
  );

  return repliesWithLikes;
}

// Create a comment
export async function createComment(
  commentData: CreateCommentData
): Promise<Comment | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: comment, error } = await supabase
      .from('comments')
      .insert({
        post_id: commentData.post_id,
        user_id: user.id,
        content: commentData.content,
        parent_id: commentData.parent_id,
        like_count: 0,
        reply_count: 0,
      })
      .select(`
        *,
        user:profiles!comments_user_id_fkey(id, username, full_name, avatar_url)
      `)
      .single();

    if (error) throw error;

    // Increment post comment count
    await supabase.rpc('increment_comment_count', { 
      post_id: commentData.post_id 
    });

    // If this is a reply, increment parent comment reply count
    if (commentData.parent_id) {
      await supabase.rpc('increment_reply_count', { 
        comment_id: commentData.parent_id 
      });
    }

    // Create notification for post owner or parent comment owner
    const { data: post } = await supabase
      .from('posts')
      .select('user_id')
      .eq('id', commentData.post_id)
      .single();

    if (post) {
      let receiverId = post.user_id;
      let notificationType = 'comment';

      if (commentData.parent_id) {
        // This is a reply to a comment
        const { data: parentComment } = await supabase
          .from('comments')
          .select('user_id')
          .eq('id', commentData.parent_id)
          .single();

        if (parentComment && parentComment.user_id !== user.id) {
          receiverId = parentComment.user_id;
          notificationType = 'comment_reply';
        }
      }

      // Don't create notification if commenting on own post/comment
      if (receiverId !== user.id) {
        await supabase
          .from('notifications')
          .insert({
            type: notificationType as any,
            sender_id: user.id,
            receiver_id: receiverId,
            post_id: commentData.post_id,
            comment_id: comment.id,
          });
      }
    }

    return {
      ...comment,
      is_liked: false,
      is_owned: true,
      replies: [],
    };
  } catch (error) {
    console.error('Error creating comment:', error);
    return null;
  }
}

// Update a comment
export async function updateComment(
  commentId: string,
  updates: UpdateCommentData
): Promise<Comment | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Verify ownership
    const { data: existingComment } = await supabase
      .from('comments')
      .select('user_id')
      .eq('id', commentId)
      .single();

    if (!existingComment || existingComment.user_id !== user.id) {
      throw new Error('Not authorized to update this comment');
    }

    const { data: comment, error } = await supabase
      .from('comments')
      .update({
        content: updates.content,
        updated_at: new Date().toISOString(),
      })
      .eq('id', commentId)
      .select(`
        *,
        user:profiles!comments_user_id_fkey(id, username, full_name, avatar_url)
      `)
      .single();

    if (error) throw error;

    return {
      ...comment,
      is_owned: true,
    };
  } catch (error) {
    console.error('Error updating comment:', error);
    return null;
  }
}

// Delete a comment
export async function deleteComment(commentId: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get comment info
    const { data: comment } = await supabase
      .from('comments')
      .select('post_id, parent_id, user_id')
      .eq('id', commentId)
      .single();

    if (!comment) throw new Error('Comment not found');
    if (comment.user_id !== user.id) throw new Error('Not authorized');

    // Delete comment and all replies (cascade)
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId);

    if (error) throw error;

    // Decrement post comment count
    await supabase.rpc('decrement_comment_count', { 
      post_id: comment.post_id 
    });

    // If this was a reply, decrement parent comment reply count
    if (comment.parent_id) {
      await supabase.rpc('decrement_reply_count', { 
        comment_id: comment.parent_id 
      });
    }

    return true;
  } catch (error) {
    console.error('Error deleting comment:', error);
    return false;
  }
}

// Toggle like on a comment
export async function toggleCommentLike(commentId: string): Promise<{
  liked: boolean;
  like_count: number;
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Check if already liked
    const { data: existingLike } = await supabase
      .from('comment_likes')
      .select('*')
      .eq('comment_id', commentId)
      .eq('user_id', user.id)
      .single();

    if (existingLike) {
      // Unlike
      const { error } = await supabase
        .from('comment_likes')
        .delete()
        .eq('comment_id', commentId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Decrement like count
      const { data: comment } = await supabase.rpc('decrement_comment_like_count', { 
        comment_id: commentId 
      });

      return {
        liked: false,
        like_count: comment?.like_count || 0,
      };
    } else {
      // Like
      const { error } = await supabase
        .from('comment_likes')
        .insert({
          comment_id: commentId,
          user_id: user.id,
        });

      if (error) throw error;

      // Increment like count
      const { data: comment } = await supabase.rpc('increment_comment_like_count', { 
        comment_id: commentId 
      });

      // Create notification for comment owner
      const { data: commentData } = await supabase
        .from('comments')
        .select('user_id, post_id')
        .eq('id', commentId)
        .single();

      if (commentData && commentData.user_id !== user.id) {
        await supabase
          .from('notifications')
          .insert({
            type: 'comment_like',
            sender_id: user.id,
            receiver_id: commentData.user_id,
            post_id: commentData.post_id,
            comment_id: commentId,
          });
      }

      return {
        liked: true,
        like_count: comment?.like_count || 0,
      };
    }
  } catch (error) {
    console.error('Error toggling comment like:', error);
    throw error;
  }
}

// Get comment by ID
export async function getCommentById(commentId: string): Promise<Comment | null> {
  const { data: comment, error } = await supabase
    .from('comments')
    .select(`
      *,
      user:profiles!comments_user_id_fkey(id, username, full_name, avatar_url)
    `)
    .eq('id', commentId)
    .single();

  if (error) {
    console.error('Error fetching comment:', error);
    return null;
  }

  // Get current user to check likes
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  
  let is_liked = false;
  if (currentUser) {
    const { data: like } = await supabase
      .from('comment_likes')
      .select('*')
      .eq('comment_id', commentId)
      .eq('user_id', currentUser.id)
      .single();

    is_liked = !!like;
  }

  return {
    ...comment,
    is_liked,
    is_owned: comment.user_id === currentUser?.id,
  };
}

// Get user's comments
export async function getUserComments(
  userId: string,
  limit = 20,
  offset = 0
): Promise<{ comments: Comment[]; total: number }> {
  const { data: comments, error, count } = await supabase
    .from('comments')
    .select(`
      *,
      user:profiles!comments_user_id_fkey(id, username, full_name, avatar_url),
      post:posts!comments_post_id_fkey(id, title, content)
    `, { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching user comments:', error);
    return { comments: [], total: 0 };
  }

  const commentsWithLikes = await Promise.all(
    (comments || []).map(async (comment) => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      let is_liked = false;

      if (currentUser) {
        const { data: like } = await supabase
          .from('comment_likes')
          .select('*')
          .eq('comment_id', comment.id)
          .eq('user_id', currentUser.id)
          .single();

        is_liked = !!like;
      }

      return {
        ...comment,
        is_liked,
        is_owned: comment.user_id === userId,
      };
    })
  );

  return {
    comments: commentsWithLikes,
    total: count || 0,
  };
}

// Subscribe to comment updates for a post
export function subscribeToPostComments(
  postId: string,
  callback: (comment: Comment) => void
) {
  return supabase
    .channel(`post-comments:${postId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'comments',
        filter: `post_id=eq.${postId}`,
      },
      async (payload) => {
        const comment = await getCommentById(payload.new.id);
        if (comment) callback(comment);
      }
    )
    .subscribe();
}

// Get comment count for a post
export async function getCommentCount(postId: string): Promise<number> {
  const { count, error } = await supabase
    .from('comments')
    .select('*', { count: 'exact', head: true })
    .eq('post_id', postId);

  if (error) {
    console.error('Error getting comment count:', error);
    return 0;
  }

  return count || 0;
}