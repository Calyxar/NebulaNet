// hooks/useSettings.ts — REACT NATIVE FIREBASE ✅
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/providers/ThemeProvider";
import {
  LinkedAccount,
  NotificationSettings,
  PrivacySettings,
  SecuritySettings,
  UserPreferences,
  UserSettings,
} from "@/types/settings";
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  if (typeof ts?.toDate === "function") return ts.toDate().toISOString();
  if (typeof ts?.seconds === "number")
    return new Date(ts.seconds * 1000).toISOString();
  const d = new Date(ts);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
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
  const uid = user?.uid;

  // ✅ FIX: wire into ThemeProvider so font/animation changes apply immediately
  const { applyFontSize, applyReduceAnimations } = useTheme();

  const { data: settings, isLoading } = useQuery<UserSettings>({
    queryKey: ["settings", uid],
    enabled: !!uid,
    queryFn: async () => {
      if (!uid) throw new Error("Not authenticated");
      const snap = await firestore().collection("profiles").doc(uid).get();
      const d = snap.exists() ? (snap.data() as any) : {};
      const currentUser = auth().currentUser;
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
          email_verified: currentUser?.emailVerified || false,
          two_factor_enabled: d.two_factor_enabled || false,
          last_login: d.last_login || null,
        },
        linked_accounts: [],
      };
    },
  });

  // ✅ FIX: all generics on one line to prevent TSX parse ambiguity in .ts files
  const updatePreferences = useMutation<void, Error, Partial<UserPreferences>>({
    mutationFn: async (updates: Partial<UserPreferences>) => {
      if (!uid) throw new Error("Not authenticated");
      await firestore()
        .collection("profiles")
        .doc(uid)
        .set(
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
    onSuccess: (_: void, updates: Partial<UserPreferences>) => {
      // ✅ push font/animation into ThemeProvider immediately — no re-login needed
      if (updates.font_size) applyFontSize(updates.font_size);
      if (typeof updates.reduce_animations === "boolean") {
        applyReduceAnimations(updates.reduce_animations);
      }
      queryClient.invalidateQueries({ queryKey: ["settings", uid] });
      queryClient.invalidateQueries({ queryKey: ["feed-preferences", uid] });
    },
  });

  const updatePrivacy = useMutation<void, Error, Partial<PrivacySettings>>({
    mutationFn: async (updates: Partial<PrivacySettings>) => {
      if (!uid) throw new Error("Not authenticated");
      await firestore()
        .collection("profiles")
        .doc(uid)
        .set(
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
      queryClient.invalidateQueries({ queryKey: ["settings", uid] }),
  });

  const updateNotifications = useMutation<
    void,
    Error,
    Partial<NotificationSettings>
  >({
    mutationFn: async (updates: Partial<NotificationSettings>) => {
      if (!uid) throw new Error("Not authenticated");
      await firestore()
        .collection("profiles")
        .doc(uid)
        .set(
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
      queryClient.invalidateQueries({ queryKey: ["settings", uid] }),
  });

  const updateSecurity = useMutation<void, Error, Partial<SecuritySettings>>({
    mutationFn: async (updates: Partial<SecuritySettings>) => {
      if (!uid) throw new Error("Not authenticated");
      await firestore()
        .collection("profiles")
        .doc(uid)
        .set(
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
      queryClient.invalidateQueries({ queryKey: ["settings", uid] }),
  });

  const blockUser = useMutation<void, Error, string>({
    mutationFn: async (targetId: string) => {
      if (!uid) throw new Error("Not authenticated");
      await firestore().collection("blocked_users").add({
        blocker_id: uid,
        blocked_id: targetId,
        created_at: firestore.FieldValue.serverTimestamp(),
      });
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["blocked-users", uid] }),
  });

  const unblockUser = useMutation<void, Error, string>({
    mutationFn: async (targetId: string) => {
      if (!uid) throw new Error("Not authenticated");
      const snap = await firestore()
        .collection("blocked_users")
        .where("blocker_id", "==", uid)
        .where("blocked_id", "==", targetId)
        .get();
      await Promise.all(snap.docs.map((d) => d.ref.delete()));
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["blocked-users", uid] }),
  });

  const muteUser = useMutation<void, Error, string>({
    mutationFn: async (targetId: string) => {
      if (!uid) throw new Error("Not authenticated");
      await firestore().collection("muted_users").add({
        muter_id: uid,
        muted_id: targetId,
        created_at: firestore.FieldValue.serverTimestamp(),
      });
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["muted-users", uid] }),
  });

  const unmuteUser = useMutation<void, Error, string>({
    mutationFn: async (targetId: string) => {
      if (!uid) throw new Error("Not authenticated");
      const snap = await firestore()
        .collection("muted_users")
        .where("muter_id", "==", uid)
        .where("muted_id", "==", targetId)
        .get();
      await Promise.all(snap.docs.map((d) => d.ref.delete()));
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["muted-users", uid] }),
  });

  const { data: blockedUsers } = useQuery<BlockedUserRow[]>({
    queryKey: ["blocked-users", uid],
    enabled: !!uid,
    queryFn: async () => {
      if (!uid) return [];
      const snap = await firestore()
        .collection("blocked_users")
        .where("blocker_id", "==", uid)
        .orderBy("created_at", "desc")
        .get();
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
    queryKey: ["muted-users", uid],
    enabled: !!uid,
    queryFn: async () => {
      if (!uid) return [];
      const snap = await firestore()
        .collection("muted_users")
        .where("muter_id", "==", uid)
        .orderBy("created_at", "desc")
        .get();
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
    queryKey: ["linked-accounts", uid],
    enabled: !!uid,
    queryFn: async () => {
      if (!uid) return [];
      const snap = await firestore()
        .collection("linked_accounts")
        .where("user_id", "==", uid)
        .orderBy("created_at", "desc")
        .get();
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
    mutationFn: async (account: Omit<LinkedAccount, "id" | "connected_at">) => {
      if (!uid) throw new Error("Not authenticated");
      await firestore()
        .collection("linked_accounts")
        .add({
          user_id: uid,
          ...account,
          connected_at: firestore.FieldValue.serverTimestamp(),
        });
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["linked-accounts", uid] }),
  });

  const unlinkAccount = useMutation<void, Error, string>({
    mutationFn: async (accountId: string) => {
      if (!uid) throw new Error("Not authenticated");
      await firestore().collection("linked_accounts").doc(accountId).delete();
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["linked-accounts", uid] }),
  });

  const clearSearchHistory = useMutation<void, Error, void>({
    mutationFn: async () => {
      if (!uid) throw new Error("Not authenticated");
      const snap = await firestore()
        .collection("search_history")
        .where("user_id", "==", uid)
        .get();
      await Promise.all(snap.docs.map((d) => d.ref.delete()));
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["search-history", uid] }),
  });

  const clearActivityHistory = useMutation<void, Error, void>({
    mutationFn: async () => {
      if (!uid) throw new Error("Not authenticated");
      const snap = await firestore()
        .collection("user_activity")
        .where("user_id", "==", uid)
        .get();
      await Promise.all(snap.docs.map((d) => d.ref.delete()));
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["activity-history", uid] }),
  });

  const exportUserData = useMutation({
    mutationFn: async () => {
      if (!uid) throw new Error("Not authenticated");
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
