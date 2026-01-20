// hooks/useSettings.ts
import { supabase } from '@/lib/supabase';
import {
    LinkedAccount,
    NotificationSettings,
    PrivacySettings,
    SecuritySettings,
    UserPreferences,
    UserSettings,
} from '@/types/settings';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useAuth } from './useAuth';

// Use the same defaults from useAuth for consistency
const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'system',
  language: 'en',
  region: 'US',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  show_nsfw: false,
  auto_play_media: true,
  reduce_animations: false,
  font_size: 'medium',
  email_notifications: true,
  push_notifications: true,
  default_sort: 'best',
  feed_density: 'normal',
  show_image_descriptions: true,
  hide_spoilers: true,
  group_similar_posts: true,
  collapse_long_threads: true,
  filtered_keywords: [],
  muted_communities: [],
};

const DEFAULT_PRIVACY: PrivacySettings = {
  profile_visibility: 'public',
  show_online_status: true,
  allow_search_indexing: true,
  allow_tagging: true,
  who_can_message_me: 'everyone',
  who_can_comment: 'everyone',
  hide_likes_count: false,
  hide_followers_count: false,
  hide_from_search: false,
  personalized_ads: false,
};

const DEFAULT_NOTIFICATIONS: NotificationSettings = {
  likes: true,
  comments: true,
  mentions: true,
  follows: true,
  direct_messages: true,
  community_updates: false,
  system_notifications: true,
  marketing_emails: false,
  push_frequency: 'immediate',
  weekly_newsletter: false,
  trending_posts: false,
  friend_activity: false,
  security_alerts: true,
  system_updates: true,
  account_activity: true,
  quiet_hours: null,
};

const DEFAULT_SECURITY: SecuritySettings = {
  email_verified: false,
  two_factor_enabled: false,
  last_login: null,
  login_alerts: true,
  trusted_devices: [],
  session_timeout: 30,
  last_password_change: undefined,
  two_factor_setup_at: undefined,
};

export function useSettings() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('profiles')
        .select('preferences, privacy_settings, notification_settings, security_settings, email_verified, two_factor_enabled, last_login')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      // Ensure all settings have default values for missing properties
      const userSettings: UserSettings = {
        preferences: { ...DEFAULT_PREFERENCES, ...(data.preferences || {}) },
        privacy: { ...DEFAULT_PRIVACY, ...(data.privacy_settings || {}) },
        notifications: { ...DEFAULT_NOTIFICATIONS, ...(data.notification_settings || {}) },
        security: {
          ...DEFAULT_SECURITY,
          ...(data.security_settings || {}),
          email_verified: data.email_verified || false,
          two_factor_enabled: data.two_factor_enabled || false,
          last_login: data.last_login || null,
        },
        linked_accounts: [], // You would fetch this from a separate table
      };

      return userSettings;
    },
    enabled: !!user,
  });

  // Update preferences
  const updatePreferences = useMutation({
    mutationFn: async (updates: Partial<UserPreferences>) => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('profiles')
        .update({
          preferences: { ...settings?.preferences, ...updates },
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', user?.id] });
    },
  });

  // Update privacy settings
  const updatePrivacy = useMutation({
    mutationFn: async (updates: Partial<PrivacySettings>) => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('profiles')
        .update({
          privacy_settings: { ...settings?.privacy, ...updates },
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', user?.id] });
    },
  });

  // Update notification settings
  const updateNotifications = useMutation({
    mutationFn: async (updates: Partial<NotificationSettings>) => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('profiles')
        .update({
          notification_settings: { ...settings?.notifications, ...updates },
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', user?.id] });
    },
  });

  // Update security settings
  const updateSecurity = useMutation({
    mutationFn: async (updates: Partial<SecuritySettings>) => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('profiles')
        .update({
          security_settings: { ...settings?.security, ...updates },
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', user?.id] });
    },
  });

  // Block user
  const blockUser = useMutation({
    mutationFn: async (userId: string) => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('blocked_users')
        .insert({
          blocker_id: user.id,
          blocked_id: userId,
          created_at: new Date().toISOString(),
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocked-users', user?.id] });
    },
  });

  // Unblock user
  const unblockUser = useMutation({
    mutationFn: async (userId: string) => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('blocked_users')
        .delete()
        .eq('blocker_id', user.id)
        .eq('blocked_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocked-users', user?.id] });
    },
  });

  // Mute user
  const muteUser = useMutation({
    mutationFn: async (userId: string) => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('muted_users')
        .insert({
          muter_id: user.id,
          muted_id: userId,
          created_at: new Date().toISOString(),
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['muted-users', user?.id] });
    },
  });

  // Unmute user
  const unmuteUser = useMutation({
    mutationFn: async (userId: string) => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('muted_users')
        .delete()
        .eq('muter_id', user.id)
        .eq('muted_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['muted-users', user?.id] });
    },
  });

  // Get blocked users
  const { data: blockedUsers } = useQuery({
    queryKey: ['blocked-users', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('blocked_users')
        .select(`
          id,
          blocked_id,
          created_at,
          profiles:blocked_id (
            username,
            full_name,
            avatar_url
          )
        `)
        .eq('blocker_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Get muted users
  const { data: mutedUsers } = useQuery({
    queryKey: ['muted-users', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('muted_users')
        .select(`
          id,
          muted_id,
          created_at,
          profiles:muted_id (
            username,
            full_name,
            avatar_url
          )
        `)
        .eq('muter_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Get linked accounts
  const { data: linkedAccounts } = useQuery({
    queryKey: ['linked-accounts', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('linked_accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as LinkedAccount[];
    },
    enabled: !!user,
  });

  // Link new account
  const linkAccount = useMutation({
    mutationFn: async (account: Omit<LinkedAccount, 'id' | 'connected_at'>) => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('linked_accounts')
        .insert({
          user_id: user.id,
          ...account,
          connected_at: new Date().toISOString(),
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['linked-accounts', user?.id] });
    },
  });

  // Unlink account
  const unlinkAccount = useMutation({
    mutationFn: async (accountId: string) => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('linked_accounts')
        .delete()
        .eq('id', accountId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['linked-accounts', user?.id] });
    },
  });

  // Clear search history
  const clearSearchHistory = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('search_history')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['search-history', user?.id] });
    },
  });

  // Clear activity history
  const clearActivityHistory = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('user_activity')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activity-history', user?.id] });
    },
  });

  // Export user data
  const exportUserData = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      
      // This would typically call a server function to generate and return a data export
      // For now, we'll return a mock export
      return {
        profile: profile,
        settings: settings,
        activity: [],
        posts: [],
        comments: [],
        likes: [],
        followers: [],
        following: [],
        exported_at: new Date().toISOString(),
      };
    },
  });

  // Get user preference helper
  const getPreference = useCallback((key: keyof UserPreferences) => {
    return settings?.preferences?.[key] ?? DEFAULT_PREFERENCES[key];
  }, [settings]);

  // Get privacy setting helper
  const getPrivacySetting = useCallback((key: keyof PrivacySettings) => {
    return settings?.privacy?.[key] ?? DEFAULT_PRIVACY[key];
  }, [settings]);

  // Get notification setting helper
  const getNotificationSetting = useCallback((key: keyof NotificationSettings) => {
    return settings?.notifications?.[key] ?? DEFAULT_NOTIFICATIONS[key];
  }, [settings]);

  // Get security setting helper
  const getSecuritySetting = useCallback((key: keyof SecuritySettings) => {
    return settings?.security?.[key] ?? DEFAULT_SECURITY[key];
  }, [settings]);

  // Check if user is blocked
  const isUserBlocked = useCallback((userId: string) => {
    return blockedUsers?.some(blocked => blocked.blocked_id === userId) || false;
  }, [blockedUsers]);

  // Check if user is muted
  const isUserMuted = useCallback((userId: string) => {
    return mutedUsers?.some(muted => muted.muted_id === userId) || false;
  }, [mutedUsers]);

  return {
    // State
    settings,
    isLoading,
    blockedUsers,
    mutedUsers,
    linkedAccounts,
    
    // Mutations
    updatePreferences,
    updatePrivacy,
    updateNotifications,
    updateSecurity,
    blockUser,
    unblockUser,
    muteUser,
    unmuteUser,
    linkAccount,
    unlinkAccount,
    clearSearchHistory,
    clearActivityHistory,
    exportUserData,
    
    // Helper functions
    getPreference,
    getPrivacySetting,
    getNotificationSetting,
    getSecuritySetting,
    isUserBlocked,
    isUserMuted,
    
    // Default settings for reference
    defaultPreferences: DEFAULT_PREFERENCES,
    defaultPrivacy: DEFAULT_PRIVACY,
    defaultNotifications: DEFAULT_NOTIFICATIONS,
    defaultSecurity: DEFAULT_SECURITY,
  };
}