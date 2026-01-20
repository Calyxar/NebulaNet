// types/settings.ts - Ensure this matches
export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  region: string;
  timezone: string;
  show_nsfw: boolean;
  auto_play_media: boolean;
  reduce_animations: boolean;
  font_size: 'small' | 'medium' | 'large';
  email_notifications: boolean;
  push_notifications: boolean;
  default_sort: 'best' | 'hot' | 'new' | 'top';
  feed_density: 'compact' | 'normal' | 'relaxed';
  show_image_descriptions: boolean;
  hide_spoilers: boolean;
  group_similar_posts: boolean;
  collapse_long_threads: boolean;
  filtered_keywords: string[];
  muted_communities: string[];
}

export interface PrivacySettings {
  profile_visibility: 'public' | 'private' | 'friends_only';
  show_online_status: boolean;
  allow_search_indexing: boolean;
  allow_tagging: boolean;
  who_can_message_me: 'everyone' | 'friends' | 'nobody';
  who_can_comment: 'everyone' | 'friends' | 'nobody';
  hide_likes_count: boolean;
  hide_followers_count: boolean;
  hide_from_search: boolean;
  personalized_ads: boolean;
}

export interface NotificationSettings {
  likes: boolean;
  comments: boolean;
  mentions: boolean;
  follows: boolean;
  direct_messages: boolean;
  community_updates: boolean;
  system_notifications: boolean;
  marketing_emails: boolean;
  push_frequency: 'immediate' | 'daily' | 'weekly';
  weekly_newsletter: boolean;
  trending_posts: boolean;
  friend_activity: boolean;
  security_alerts: boolean;
  system_updates: boolean;
  account_activity: boolean;
  quiet_hours: { start: string; end: string } | null;
}

export interface SecuritySettings {
  email_verified: boolean;
  two_factor_enabled: boolean;
  last_login: string | null;
  login_alerts: boolean;
  trusted_devices: {
    id: string;
    name: string;
    last_used: string;
    location?: string;
  }[];
  session_timeout: number; // days
  last_password_change?: string;
  two_factor_setup_at?: string;
}

export interface LinkedAccount {
  id: string;
  provider: 'google' | 'github' | 'twitter' | 'discord' | 'spotify' | 'apple';
  provider_id: string;
  email?: string;
  username?: string;
  connected_at: string;
  scopes: string[];
}

export interface UserSettings {
  preferences: UserPreferences;
  privacy: PrivacySettings;
  notifications: NotificationSettings;
  security: SecuritySettings;
  linked_accounts: LinkedAccount[];
}