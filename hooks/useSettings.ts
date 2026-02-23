// hooks/useSettings.ts — FIREBASE ✅

import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import {
  LinkedAccount,
  NotificationSettings,
  PrivacySettings,
  SecuritySettings,
  UserPreferences,
  UserSettings,
} from "@/types/settings";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
} from "firebase/firestore";
import { useCallback } from "react";

type BlockedUserRow = {
  id: string;
  blocked_id: string;
  created_at: string;
  profiles?: {
    username?: string | null;
    full_name?: string | null;
    avatar_url?: string | null;
  } | null;
};

type MutedUserRow = {
  id: string;
  muted_id: string;
  created_at: string;
  profiles?: {
    username?: string | null;
    full_name?: string | null;
    avatar_url?: string | null;
  } | null;
};

function tsToIso(ts: any): string {
  if (!ts) return new Date().toISOString();
  if (ts instanceof Timestamp) return ts.toDate().toISOString();
  return new Date(ts).toISOString();
}

const DEFAULT_PREFERENCES: UserPreferences = {
  theme: "system",
  language: "en",
  region: "US",
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  show_nsfw: false,
  auto_play_media: true,
  reduce_animations: false,
  font_size: "medium",
  email_notifications: true,
  push_notifications: true,
  default_sort: "best",
  feed_density: "normal",
  show_image_descriptions: true,
  hide_spoilers: true,
  group_similar_posts: true,
  collapse_long_threads: true,
  filtered_keywords: [],
  muted_communities: [],
};

const DEFAULT_PRIVACY: PrivacySettings = {
  profile_visibility: "public",
  show_online_status: true,
  allow_search_indexing: true,
  allow_tagging: true,
  who_can_message_me: "everyone",
  who_can_comment: "everyone",
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
  push_frequency: "immediate",
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

  const { data: settings, isLoading } = useQuery<UserSettings>({
    queryKey: ["settings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const snap = await getDoc(doc(db, "profiles", user.uid));
      const d = snap.exists() ? (snap.data() as any) : {};
      return {
        preferences: { ...DEFAULT_PREFERENCES, ...(d.preferences || {}) },
        privacy: { ...DEFAULT_PRIVACY, ...(d.privacy_settings || {}) },
        notifications: {
          ...DEFAULT_NOTIFICATIONS,
          ...(d.notification_settings || {}),
        },
        security: {
          ...DEFAULT_SECURITY,
          ...(d.security_settings || {}),
          email_verified: user.emailVerified || false,
          two_factor_enabled: d.two_factor_enabled || false,
          last_login: d.last_login || null,
        },
        linked_accounts: [],
      };
    },
  });

  const updatePreferences = useMutation<void, Error, Partial<UserPreferences>>({
    mutationFn: async (updates) => {
      if (!user) throw new Error("Not authenticated");
      await setDoc(
        doc(db, "profiles", user.uid),
        {
          preferences: {
            ...(settings?.preferences ?? DEFAULT_PREFERENCES),
            ...updates,
          },
          updated_at: new Date().toISOString(),
        },
        { merge: true },
      );
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["settings", user?.id] }),
  });

  const updatePrivacy = useMutation<void, Error, Partial<PrivacySettings>>({
    mutationFn: async (updates) => {
      if (!user) throw new Error("Not authenticated");
      await setDoc(
        doc(db, "profiles", user.uid),
        {
          privacy_settings: {
            ...(settings?.privacy ?? DEFAULT_PRIVACY),
            ...updates,
          },
          updated_at: new Date().toISOString(),
        },
        { merge: true },
      );
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["settings", user?.id] }),
  });

  const updateNotifications = useMutation<
    void,
    Error,
    Partial<NotificationSettings>
  >({
    mutationFn: async (updates) => {
      if (!user) throw new Error("Not authenticated");
      await setDoc(
        doc(db, "profiles", user.uid),
        {
          notification_settings: {
            ...(settings?.notifications ?? DEFAULT_NOTIFICATIONS),
            ...updates,
          },
          updated_at: new Date().toISOString(),
        },
        { merge: true },
      );
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["settings", user?.id] }),
  });

  const updateSecurity = useMutation<void, Error, Partial<SecuritySettings>>({
    mutationFn: async (updates) => {
      if (!user) throw new Error("Not authenticated");
      await setDoc(
        doc(db, "profiles", user.uid),
        {
          security_settings: {
            ...(settings?.security ?? DEFAULT_SECURITY),
            ...updates,
          },
          updated_at: new Date().toISOString(),
        },
        { merge: true },
      );
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["settings", user?.id] }),
  });

  const blockUser = useMutation<void, Error, string>({
    mutationFn: async (targetId) => {
      if (!user) throw new Error("Not authenticated");
      await addDoc(collection(db, "blocked_users"), {
        blocker_id: user.uid,
        blocked_id: targetId,
        created_at: serverTimestamp(),
      });
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["blocked-users", user?.id] }),
  });

  const unblockUser = useMutation<void, Error, string>({
    mutationFn: async (targetId) => {
      if (!user) throw new Error("Not authenticated");
      const snap = await getDocs(
        query(
          collection(db, "blocked_users"),
          where("blocker_id", "==", user.uid),
          where("blocked_id", "==", targetId),
        ),
      );
      await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["blocked-users", user?.id] }),
  });

  const muteUser = useMutation<void, Error, string>({
    mutationFn: async (targetId) => {
      if (!user) throw new Error("Not authenticated");
      await addDoc(collection(db, "muted_users"), {
        muter_id: user.uid,
        muted_id: targetId,
        created_at: serverTimestamp(),
      });
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["muted-users", user?.id] }),
  });

  const unmuteUser = useMutation<void, Error, string>({
    mutationFn: async (targetId) => {
      if (!user) throw new Error("Not authenticated");
      const snap = await getDocs(
        query(
          collection(db, "muted_users"),
          where("muter_id", "==", user.uid),
          where("muted_id", "==", targetId),
        ),
      );
      await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["muted-users", user?.id] }),
  });

  const { data: blockedUsers } = useQuery<BlockedUserRow[]>({
    queryKey: ["blocked-users", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [];
      const snap = await getDocs(
        query(
          collection(db, "blocked_users"),
          where("blocker_id", "==", user.uid),
          orderBy("created_at", "desc"),
        ),
      );
      return snap.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          blocked_id: data.blocked_id,
          created_at: tsToIso(data.created_at),
        };
      }) as BlockedUserRow[];
    },
  });

  const { data: mutedUsers } = useQuery<MutedUserRow[]>({
    queryKey: ["muted-users", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [];
      const snap = await getDocs(
        query(
          collection(db, "muted_users"),
          where("muter_id", "==", user.uid),
          orderBy("created_at", "desc"),
        ),
      );
      return snap.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          muted_id: data.muted_id,
          created_at: tsToIso(data.created_at),
        };
      }) as MutedUserRow[];
    },
  });

  const { data: linkedAccounts } = useQuery<LinkedAccount[]>({
    queryKey: ["linked-accounts", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [];
      const snap = await getDocs(
        query(
          collection(db, "linked_accounts"),
          where("user_id", "==", user.uid),
          orderBy("created_at", "desc"),
        ),
      );
      return snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as LinkedAccount[];
    },
  });

  const linkAccount = useMutation<
    void,
    Error,
    Omit<LinkedAccount, "id" | "connected_at">
  >({
    mutationFn: async (account) => {
      if (!user) throw new Error("Not authenticated");
      await addDoc(collection(db, "linked_accounts"), {
        user_id: user.uid,
        ...account,
        connected_at: serverTimestamp(),
      });
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["linked-accounts", user?.id],
      }),
  });

  const unlinkAccount = useMutation<void, Error, string>({
    mutationFn: async (accountId) => {
      if (!user) throw new Error("Not authenticated");
      await deleteDoc(doc(db, "linked_accounts", accountId));
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["linked-accounts", user?.id],
      }),
  });

  const clearSearchHistory = useMutation<void, Error, void>({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const snap = await getDocs(
        query(
          collection(db, "search_history"),
          where("user_id", "==", user.uid),
        ),
      );
      await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["search-history", user?.id] }),
  });

  const clearActivityHistory = useMutation<void, Error, void>({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const snap = await getDocs(
        query(
          collection(db, "user_activity"),
          where("user_id", "==", user.uid),
        ),
      );
      await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["activity-history", user?.id],
      }),
  });

  const exportUserData = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      return {
        profile,
        settings,
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

  const getPreference = useCallback(
    (key: keyof UserPreferences) =>
      settings?.preferences?.[key] ?? DEFAULT_PREFERENCES[key],
    [settings],
  );
  const getPrivacySetting = useCallback(
    (key: keyof PrivacySettings) =>
      settings?.privacy?.[key] ?? DEFAULT_PRIVACY[key],
    [settings],
  );
  const getNotificationSetting = useCallback(
    (key: keyof NotificationSettings) =>
      settings?.notifications?.[key] ?? DEFAULT_NOTIFICATIONS[key],
    [settings],
  );
  const getSecuritySetting = useCallback(
    (key: keyof SecuritySettings) =>
      settings?.security?.[key] ?? DEFAULT_SECURITY[key],
    [settings],
  );
  const isUserBlocked = useCallback(
    (userId: string) =>
      blockedUsers?.some((b: BlockedUserRow) => b.blocked_id === userId) ||
      false,
    [blockedUsers],
  );
  const isUserMuted = useCallback(
    (userId: string) =>
      mutedUsers?.some((m: MutedUserRow) => m.muted_id === userId) || false,
    [mutedUsers],
  );

  return {
    settings,
    isLoading,
    blockedUsers,
    mutedUsers,
    linkedAccounts,
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
    getPreference,
    getPrivacySetting,
    getNotificationSetting,
    getSecuritySetting,
    isUserBlocked,
    isUserMuted,
    defaultPreferences: DEFAULT_PREFERENCES,
    defaultPrivacy: DEFAULT_PRIVACY,
    defaultNotifications: DEFAULT_NOTIFICATIONS,
    defaultSecurity: DEFAULT_SECURITY,
  };
}
