// hooks/useUser.ts
import { supabase } from '@/lib/supabase';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

interface UserProfile {
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
  is_following?: boolean;
}

interface UpdateProfileData {
  full_name?: string;
  bio?: string;
  website?: string;
  location?: string;
  avatar_url?: string;
}

export function useUser(username?: string) {
  const queryClient = useQueryClient();

  // Get user by username
  const userQuery = useQuery({
    queryKey: ['user', username],
    queryFn: async () => {
      if (!username) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .single();

      if (error) throw error;
      return data as UserProfile;
    },
    enabled: !!username,
  });

  // Get current user's profile
  const currentUserQuery = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return data as UserProfile;
    },
  });

  // Toggle follow
  const toggleFollow = useMutation({
    mutationFn: async (targetUserId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check if already following
      const { data: existingFollow } = await supabase
        .from('follows')
        .select('*')
        .eq('follower_id', user.id)
        .eq('following_id', targetUserId)
        .single();

      if (existingFollow) {
        // Unfollow
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', targetUserId);
        
        if (error) throw error;
        return 'unfollowed';
      } else {
        // Follow
        const { error } = await supabase
          .from('follows')
          .insert({
            follower_id: user.id,
            following_id: targetUserId,
          });
        
        if (error) throw error;
        return 'followed';
      }
    },
    onSuccess: (result, targetUserId) => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      queryClient.invalidateQueries({ queryKey: ['followers', targetUserId] });
      queryClient.invalidateQueries({ queryKey: ['following', targetUserId] });
    },
  });

  // Get followers
  const followersQuery = useQuery({
    queryKey: ['followers', userQuery.data?.id],
    queryFn: async () => {
      if (!userQuery.data?.id) return [];

      const { data, error } = await supabase
        .from('follows')
        .select(`
          follower:profiles!follows_follower_id_fkey(*)
        `)
        .eq('following_id', userQuery.data.id);

      if (error) throw error;
      return (data ?? []).map((item: { follower: UserProfile }) => item.follower);
    },
    enabled: !!userQuery.data?.id,
  });

  // Get following
  const followingQuery = useQuery({
    queryKey: ['following', userQuery.data?.id],
    queryFn: async () => {
      if (!userQuery.data?.id) return [];

      const { data, error } = await supabase
        .from('follows')
        .select(`
          following:profiles!follows_following_id_fkey(*)
        `)
        .eq('follower_id', userQuery.data.id);

      if (error) throw error;
      return (data ?? []).map((item: { following: UserProfile }) => item.following);
    },
    enabled: !!userQuery.data?.id,
  });

  // Update profile
  const updateProfile = useMutation({
    mutationFn: async (updates: UpdateProfileData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data as UserProfile;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['currentUser'], data);
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });

  return {
    user: userQuery.data,
    currentUser: currentUserQuery.data,
    isLoading: userQuery.isLoading || currentUserQuery.isLoading,
    isFetching: userQuery.isFetching,
    followers: followersQuery.data,
    following: followingQuery.data,
    toggleFollow,
    updateProfile,
    refetch: () => {
      userQuery.refetch();
      currentUserQuery.refetch();
    },
  };
}