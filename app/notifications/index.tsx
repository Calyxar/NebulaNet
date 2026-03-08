// app/notifications/index.tsx — CREATED ✅ full theme support
import AppHeader from "@/components/navigation/AppHeader";
import { getTabBarHeight } from "@/components/navigation/CurvedTabBar";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
    collection,
    doc,
    onSnapshot,
    orderBy,
    query,
    updateDoc,
    where,
    writeBatch,
} from "firebase/firestore";
import React, { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import {
    SafeAreaView,
    useSafeAreaInsets,
} from "react-native-safe-area-context";

type NotificationType =
  | "like"
  | "comment"
  | "follow"
  | "mention"
  | "reply"
  | "repost"
  | "boost"
  | "system";

interface AppNotification {
  id: string;
  type: NotificationType;
  title?: string;
  body: string;
  is_read: boolean;
  created_at: string;
  actor_id?: string;
  actor_username?: string;
  actor_avatar?: string;
  post_id?: string;
  comment_id?: string;
}

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString();
};

const NOTIFICATION_META: {
  [key in NotificationType]: { icon: string; color: string };
} = {
  like: { icon: "heart", color: "#FF375F" },
  comment: { icon: "chatbubble", color: "#6D5DF6" },
  follow: { icon: "person-add", color: "#10B981" },
  mention: { icon: "at", color: "#F59E0B" },
  reply: { icon: "return-down-forward", color: "#6D5DF6" },
  repost: { icon: "repeat", color: "#10B981" },
  boost: { icon: "rocket", color: "#F59E0B" },
  system: { icon: "notifications", color: "#6B7280" },
};

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const bottomPad = useMemo(
    () => getTabBarHeight(insets.bottom) + 12,
    [insets.bottom],
  );

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications],
  );

  // ── Real-time listener ──
  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, "notifications"),
      where("user_id", "==", user.uid),
      orderBy("created_at", "desc"),
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const items: AppNotification[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<AppNotification, "id">),
        }));
        setNotifications(items);
        setLoading(false);
      },
      (err) => {
        console.warn("notifications listener error:", err);
        setLoading(false);
      },
    );

    return unsub;
  }, [user?.uid]);

  // ── Mark single as read ──
  const markRead = async (id: string) => {
    try {
      await updateDoc(doc(db, "notifications", id), { is_read: true });
    } catch (e) {
      console.warn("markRead failed:", e);
    }
  };

  // ── Mark all as read ──
  const markAllRead = async () => {
    const unread = notifications.filter((n) => !n.is_read);
    if (!unread.length) return;
    try {
      const batch = writeBatch(db);
      unread.forEach((n) => {
        batch.update(doc(db, "notifications", n.id), { is_read: true });
      });
      await batch.commit();
    } catch (e) {
      console.warn("markAllRead failed:", e);
    }
  };

  // ── Navigate on tap ──
  const handlePress = (item: AppNotification) => {
    if (!item.is_read) markRead(item.id);

    if (item.post_id) {
      router.push(`/post/${item.post_id}` as any);
    } else if (item.actor_username) {
      router.push(`/user/${item.actor_username}` as any);
    }
  };

  const renderItem = ({ item }: { item: AppNotification }) => {
    const meta = NOTIFICATION_META[item.type] ?? NOTIFICATION_META.system;

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => handlePress(item)}
        style={[
          styles.row,
          {
            backgroundColor: item.is_read ? colors.card : colors.primary + "10",
            borderBottomColor: colors.border,
          },
        ]}
      >
        {/* Icon bubble */}
        <View
          style={[styles.iconBubble, { backgroundColor: meta.color + "18" }]}
        >
          <Ionicons name={meta.icon as any} size={20} color={meta.color} />
        </View>

        {/* Text */}
        <View style={styles.rowText}>
          {!!item.title && (
            <Text
              style={[styles.rowTitle, { color: colors.text }]}
              numberOfLines={1}
            >
              {item.title}
            </Text>
          )}
          <Text
            style={[styles.rowBody, { color: colors.textSecondary }]}
            numberOfLines={2}
          >
            {item.body}
          </Text>
          <Text style={[styles.rowTime, { color: colors.textTertiary }]}>
            {timeAgo(item.created_at)}
          </Text>
        </View>

        {/* Unread dot */}
        {!item.is_read && (
          <View
            style={[styles.unreadDot, { backgroundColor: colors.primary }]}
          />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />

      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={["left", "right"]}
      >
        <AppHeader
          title="Notifications"
          backgroundColor={colors.background}
          rightWide={
            unreadCount > 0 ? (
              <TouchableOpacity
                onPress={markAllRead}
                activeOpacity={0.8}
                style={[
                  styles.markAllBtn,
                  {
                    backgroundColor: colors.primary + "18",
                    borderColor: colors.primary + "30",
                  },
                ]}
              >
                <Ionicons
                  name="checkmark-done"
                  size={16}
                  color={colors.primary}
                />
                <Text style={[styles.markAllText, { color: colors.primary }]}>
                  Mark all read
                </Text>
              </TouchableOpacity>
            ) : undefined
          }
        />

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <View
              style={[
                styles.emptyIconCircle,
                { backgroundColor: colors.surface },
              ]}
            >
              <Ionicons
                name="notifications-off-outline"
                size={32}
                color={colors.primary}
              />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No notifications yet
            </Text>
            <Text
              style={[styles.emptySubtitle, { color: colors.textTertiary }]}
            >
              When people like, comment, or follow you, it'll show up here.
            </Text>
          </View>
        ) : (
          <FlatList
            data={notifications}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: bottomPad },
            ]}
            ListHeaderComponent={
              unreadCount > 0 ? (
                <View
                  style={[
                    styles.unreadBanner,
                    {
                      backgroundColor: colors.primary + "12",
                      borderBottomColor: colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[styles.unreadBannerText, { color: colors.primary }]}
                  >
                    {unreadCount} unread notification
                    {unreadCount !== 1 ? "s" : ""}
                  </Text>
                </View>
              ) : null
            }
          />
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  markAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  markAllText: { fontSize: 13, fontWeight: "700" },

  unreadBanner: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  unreadBannerText: { fontSize: 13, fontWeight: "700" },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 1,
  },

  iconBubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  rowText: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: 14, fontWeight: "800", marginBottom: 2 },
  rowBody: { fontSize: 13, lineHeight: 18 },
  rowTime: { fontSize: 11, fontWeight: "600", marginTop: 4 },

  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },

  listContent: { paddingTop: 0 },

  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 280,
  },
});
