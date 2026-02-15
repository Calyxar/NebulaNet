// lib/queries/users.ts
import { supabase } from '@/lib/supabase';
import { uploadService } from '@/lib/uploads';

// Base interface for Supabase response
interface SupabaseUserProfileResponse {
  id: string;
  username: string;
  full_name?: string;
  avatar_url?: string;
  bio?: string;
  website?: string;
  location?: string;
  follower_count: number;
  following_count: number;
  post_count: number;
  created_at: string;
  updated_at: string;
}

export interface UserProfile extends SupabaseUserProfileResponse {
  is_following?: boolean;
  is_followed_by?: boolean;
  is_self?: boolean;
}

export interface UpdateProfileData {
  username?: string;
  full_name?: string;
  bio?: string;
  website?: string;
  location?: string;
  avatar_url?: string;
}

export interface UserStats {
  total_posts: number;
  total_likes: number;
  total_comments: number;
  total_followers: number;
  total_following: number;
}

// Get user profile by ID or username
export async function getUserProfile(
  identifier: string
): Promise<UserProfile | null> {
  let query = supabase
    .from('profiles')
    .select('*');

  // Determine if identifier is ID or username
  if (identifier.length === 36) { // UUID format
    query = query.eq('id', identifier);
  } else {
    query = query.eq('username', identifier);
  }

  const { data: profile, error } = await query.single();

  if (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }

  // Get current user to check follow status
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  
  if (currentUser) {
    const followStatus = await getFollowStatus(currentUser.id, profile.id);
    
    return {
      ...profile,
      is_following: followStatus.is_following,
      is_followed_by: followStatus.is_followed_by,
      is_self: profile.id === currentUser.id,
    } as UserProfile;
  }

  return profile as UserProfile;
}

// Get current user's profile
export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  return getUserProfile(user.id);
}

// Update user profile
export async function updateUserProfile(
  updates: UpdateProfileData
): Promise<UserProfile | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Check if username is being changed and is available
    if (updates.username) {
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', updates.username)
        .neq('id', user.id)
        .single();

      if (existingUser) {
        throw new Error('Username already taken');
      }
    }

    // Handle avatar upload if provided as local URI
    if (updates.avatar_url && updates.avatar_url.startsWith('file://')) {
      const uploadResult = await uploadService.uploadFile(
        updates.avatar_url,
        `avatar_${user.id}.jpg`,
        'image',
        {
          compressImages: true,
          maxWidth: 512,
          quality: 0.8,
          generateThumbnails: true,
        }
      );

      if (uploadResult.success) {
        updates.avatar_url = uploadResult.url;
      } else {
        console.error('Avatar upload failed:', uploadResult.error);
        delete updates.avatar_url;
      }
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select('*')
      .single();

    if (error) throw error;
    return profile as UserProfile;
  } catch (error) {
    console.error('Error updating profile:', error);
    throw error;
  }
}

// Get follow status between two users
export async function getFollowStatus(
  followerId: string,
  followingId: string
): Promise<{
  is_following: boolean;
  is_followed_by: boolean;
}> {
  // Check if follower is following following
  const { data: followData } = await supabase
    .from('follows')
    .select('*')
    .eq('follower_id', followerId)
    .eq('following_id', followingId)
    .single();

  // Check if following is following follower (mutual follow)
  const { data: mutualData } = await supabase
    .from('follows')
    .select('*')
    .eq('follower_id', followingId)
    .eq('following_id', followerId)
    .single();

  return {
    is_following: !!followData,
    is_followed_by: !!mutualData,
  };
}

// Toggle follow/unfollow
export async function toggleFollow(
  followingId: string
): Promise<{
  following: boolean;
  follower_count?: number;
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    if (user.id === followingId) {
      throw new Error('Cannot follow yourself');
    }

    // Check if already following
    const { data: existingFollow } = await supabase
      .from('follows')
      .select('*')
      .eq('follower_id', user.id)
      .eq('following_id', followingId)
      .single();

    if (existingFollow) {
      // Unfollow
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', followingId);

      if (error) throw error;

      // Decrement follower/following counts
      await Promise.all([
        supabase.rpc('decrement_follower_count', { user_id: followingId }),
        supabase.rpc('decrement_following_count', { user_id: user.id }),
      ]);

      return { following: false };
    } else {
      // Follow
      const { error } = await supabase
        .from('follows')
        .insert({
          follower_id: user.id,
          following_id: followingId,
        });

      if (error) throw error;

      // Increment follower/following counts
      await Promise.all([
        supabase.rpc('increment_follower_count', { user_id: followingId }),
        supabase.rpc('increment_following_count', { user_id: user.id }),
      ]);

      // Create notification
      await supabase
        .from('notifications')
        .insert({
          type: 'follow',
          sender_id: user.id,
          receiver_id: followingId,
        });

      return { following: true };
    }
  } catch (error) {
    console.error('Error toggling follow:', error);
    throw error;
  }
}

// Get user's followers
export async function getUserFollowers(
  userId: string,
  limit = 20,
  offset = 0
): Promise<{ users: UserProfile[]; total: number }> {
  const { data: followers, error, count } = await supabase
    .from('follows')
    .select(`
      follower:profiles!follows_follower_id_fkey(*)
    `, { count: 'exact' })
    .eq('following_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching followers:', error);
    return { users: [], total: 0 };
  }

  // Type the response properly
  const users: UserProfile[] = (followers || []).map((follower: any) => ({
    ...follower.follower,
    is_following: true, // These users are following the target user
  }));

  return {
    users,
    total: count || 0,
  };
}

// Get users that a user is following
export async function getUserFollowing(
  userId: string,
  limit = 20,
  offset = 0
): Promise<{ users: UserProfile[]; total: number }> {
  const { data: following, error, count } = await supabase
    .from('follows')
    .select(`
      following:profiles!follows_following_id_fkey(*)
    `, { count: 'exact' })
    .eq('follower_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching following:', error);
    return { users: [], total: 0 };
  }

  // Type the response properly
  const users: UserProfile[] = (following || []).map((follow: any) => ({
    ...follow.following,
    is_followed_by: true, // The target user is following these users
  }));

  return {
    users,
    total: count || 0,
  };
}

// Get user stats
export async function getUserStats(userId: string): Promise<UserStats> {
  const [
    { count: postCount },
    { count: likeCount },
    { count: commentCount },
    { count: followerCount },
    { count: followingCount },
  ] = await Promise.all([
    supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId),
    supabase
      .from('likes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId),
    supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId),
    supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', userId),
    supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', userId),
  ]);

  return {
    total_posts: postCount || 0,
    total_likes: likeCount || 0,
    total_comments: commentCount || 0,
    total_followers: followerCount || 0,
    total_following: followingCount || 0,
  };
}

// Search users by username or name
export async function searchUsers(
  query: string,
  limit = 10
): Promise<UserProfile[]> {
  if (!query.trim()) return [];

  const { data: users, error } = await supabase
    .from('profiles')
    .select('*')
    .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
    .order('follower_count', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error searching users:', error);
    return [];
  }

  return (users || []) as UserProfile[];
}

// Get suggested users to follow - FIXED VERSION
export async function getSuggestedUsers(
  limit = 10
): Promise<UserProfile[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // First, get users that the current user follows
  const { data: followingData } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', user.id);

  if (!followingData || followingData.length === 0) {
    // If user doesn't follow anyone, get popular users
    const { data: popularUsers } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', user.id)
      .order('follower_count', { ascending: false })
      .limit(limit);

    return (popularUsers || []) as UserProfile[];
  }

  // Extract the IDs of users that current user follows
  const followingIds = (followingData ?? []).map((f: { following_id: string }) => f.following_id);

  // Get users that are followed by people you follow
  const { data: suggestions } = await supabase
    .from('follows')
    .select(`
      following:profiles!follows_following_id_fkey(*)
    `)
    .in('follower_id', followingIds)
    .neq('following_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit * 2); // Get more to filter out duplicates

  if (!suggestions || suggestions.length === 0) {
    // Fallback: Get most followed users
    const { data: popularUsers } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', user.id)
      .order('follower_count', { ascending: false })
      .limit(limit);

    return (popularUsers || []) as UserProfile[];
  }

  // Remove duplicates and ensure proper typing
  const uniqueUsers: UserProfile[] = [];
  const seenIds = new Set<string>();

  for (const suggestion of suggestions) {
    const userProfile = suggestion.following as unknown as SupabaseUserProfileResponse;
    if (!seenIds.has(userProfile.id) && userProfile.id !== user.id) {
      seenIds.add(userProfile.id);
      uniqueUsers.push({
        ...userProfile,
        is_following: false, // User doesn't follow them yet
      });
    }
    
    if (uniqueUsers.length >= limit) break;
  }

  return uniqueUsers;
}

// Check if username is available
export async function isUsernameAvailable(
  username: string,
  excludeUserId?: string
): Promise<boolean> {
  let query = supabase
    .from('profiles')
    .select('username')
    .eq('username', username);

  if (excludeUserId) {
    query = query.neq('id', excludeUserId);
  }

  const { data, error } = await query.single();

  if (error?.code === 'PGRST116') { // No rows returned
    return true;
  }

  return !data;
}

// Get users by IDs
export async function getUsersByIds(
  userIds: string[]
): Promise<UserProfile[]> {
  if (userIds.length === 0) return [];

  const { data: users, error } = await supabase
    .from('profiles')
    .select('*')
    .in('id', userIds);

  if (error) {
    console.error('Error fetching users by IDs:', error);
    return [];
  }

  return (users || []) as UserProfile[];
}

// Delete user account
export async function deleteUserAccount(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Delete user's data (posts, comments, likes, follows, etc.)
    // Note: This should cascade based on your database schema
    const { error } = await supabase.auth.admin.deleteUser(user.id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting account:', error);
    return false;
  }
}

// Subscribe to user profile updates
export function subscribeToUserProfile(
  userId: string,
  callback: (profile: UserProfile) => void
) {
  return supabase
    .channel(`profile:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${userId}`,
      },
      async (payload: { new: Record<string, unknown>; old?: Record<string, unknown> }) => {
        const profile = await getUserProfile(userId);
        if (profile) callback(profile);
      }
    )
    .subscribe();
}