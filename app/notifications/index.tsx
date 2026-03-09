// app/notifications/index.tsx — FIREBASE ✅ COMPLETED + REWRITTEN
// ✅ Uses useNotifications hook — single source of truth, no inline listener
// ✅ Sender avatar shown with icon badge overlay (not just icon bubble)
// ✅ Date grouping: Today / Yesterday / This Week / Older
// ✅ Filter tabs: All | Unread — pill segment, mirrors explore style
// ✅ Long-press row → action sheet: Mark read · Delete
// ✅ Skeleton loading states — no raw spinner on initial load
// ✅ Linear gradient background (light mode only, dark stays flat)
// ✅ Unread count badge on tab header
// ✅ Mark all read button (hidden when nothing unread)
// ✅ Empty state per filter (All vs Unread)
// ✅ Press navigates: post_id → /post/:id, actor → /user/:username
// ✅ Full theme support via useTheme
// ✅ SafeAreaView edges top — prevents camera punch-hole overlap

import AppHeader from "@/components/navigation/AppHeader";
import { getTabBarHeight } from "@/components/navigation/CurvedTabBar";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications, type Notification } from "@/hooks/useNotifications";
import { useTheme } from "@/providers/ThemeProvider";
import { useActionSheet } from "@expo/react-native-action-sheet";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  SectionList,
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

/* =========================
   FILTER TABS
========================= */

type FilterTab = "all" | "unread";

/* =========================
   SKELETON ROW
========================= */

function NotificationRowSkeleton({ colors }: { colors: any }) {
  return (
    <View
      style={[
        styles.row,
        { backgroundColor: colors.card, borderBottomColor: colors.border },
      ]}
    >
      {/* Avatar placeholder */}
      <View style={[styles.avatarWrap]}>
        <View style={[styles.avatar, { backgroundColor: colors.surface }]} />
      </View>
      {/* Text placeholders */}
      <View style={{ flex: 1, gap: 7 }}>
        <View
          style={[
            styles.skeletonLine,
            { width: "72%", backgroundColor: colors.surface },
          ]}
        />
        <View
          style={[
            styles.skeletonLine,
            { width: "52%", backgroundColor: colors.surface, height: 10 },
          ]}
        />
      </View>
    </View>
  );
}

/* =========================
   NOTIFICATION ROW
========================= */

function NotificationRow({
  item,
  colors,
  isDark,
  onPress,
  onLongPress,
  getIcon,
  getColor,
}: {
  item: Notification;
  colors: any;
  isDark: boolean;
  onPress: () => void;
  onLongPress: () => void;
  getIcon: (type: Notification["type"]) => string;
  getColor: (type: Notification["type"]) => string;
}) {
  const iconName = getIcon(item.type);
  const iconColor = getColor(item.type);
  const senderName =
    item.sender?.full_name || item.sender?.username || "Someone";

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d}d`;
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  // Derive readable body text from notification fields
  const bodyText = useMemo(() => {
    const base = item.sender?.full_name || item.sender?.username || "Someone";
    switch (item.type) {
      case "like":
        return `${base} liked your post`;
      case "comment":
        return item.comment?.content
          ? `${base}: "${item.comment.content.slice(0, 80)}"`
          : `${base} commented on your post`;
      case "follow":
        return `${base} started following you`;
      case "mention":
        return `${base} mentioned you in a post`;
      case "community_invite":
        return item.community?.name
          ? `${base} invited you to ${item.community.name}`
          : `${base} invited you to a community`;
      case "post_shared":
        return `${base} shared your post`;
      case "story_comment":
        return item.comment?.content
          ? `${base}: "${item.comment.content.slice(0, 80)}"`
          : `${base} replied to your story`;
      case "story_like":
        return `${base} liked your story`;
      case "message":
        return `${base} sent you a message`;
      case "join_request":
        return `${base} wants to join your community`;
      default:
        return item.comment?.content || "New notification";
    }
  }, [item]);

  return (
    <TouchableOpacity
      activeOpacity={0.82}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={350}
      style={[
        styles.row,
        {
          backgroundColor: item.read
            ? colors.card
            : colors.primary + (isDark ? "14" : "0D"),
          borderBottomColor: colors.border,
        },
      ]}
    >
      {/* Avatar + icon badge */}
      <View style={styles.avatarWrap}>
        {item.sender?.avatar_url ? (
          <Image
            source={{ uri: item.sender.avatar_url }}
            style={[styles.avatar, { backgroundColor: colors.surface }]}
          />
        ) : (
          <View
            style={[
              styles.avatar,
              styles.avatarFallback,
              { backgroundColor: colors.surface },
            ]}
          >
            <Text
              style={[styles.avatarFallbackText, { color: colors.primary }]}
            >
              {(senderName[0] || "?").toUpperCase()}
            </Text>
          </View>
        )}
        {/* Small icon badge overlaid bottom-right of avatar */}
        <View style={[styles.iconBadge, { backgroundColor: iconColor }]}>
          <Ionicons name={iconName as any} size={10} color="#fff" />
        </View>
      </View>

      {/* Body */}
      <View style={styles.rowBody}>
        <Text
          style={[styles.rowText, { color: colors.text }]}
          numberOfLines={2}
        >
          {bodyText}
        </Text>
        <Text style={[styles.rowTime, { color: colors.textTertiary }]}>
          {timeAgo(item.created_at)}
        </Text>
      </View>

      {/* Unread dot */}
      {!item.read && (
        <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
      )}
    </TouchableOpacity>
  );
}

/* =========================
   SECTION HEADER
========================= */

function SectionHeader({ title, colors }: { title: string; colors: any }) {
  return (
    <View style={[styles.sectionHeader, { backgroundColor: "transparent" }]}>
      <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>
        {title}
      </Text>
    </View>
  );
}

/* =========================
   EMPTY STATE
========================= */

function EmptyState({ filter, colors }: { filter: FilterTab; colors: any }) {
  return (
    <View style={styles.emptyState}>
      <View
        style={[styles.emptyIconCircle, { backgroundColor: colors.surface }]}
      >
        <Ionicons
          name={
            filter === "unread"
              ? "checkmark-circle-outline"
              : "notifications-off-outline"
          }
          size={32}
          color={colors.primary}
        />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        {filter === "unread" ? "You're all caught up" : "No notifications yet"}
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.textTertiary }]}>
        {filter === "unread"
          ? "No unread notifications right now."
          : "When people like, comment, or follow you, it'll show up here."}
      </Text>
    </View>
  );
}

/* =========================
   MAIN SCREEN
========================= */

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const { showActionSheetWithOptions } = useActionSheet();

  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");

  const {
    notifications,
    isLoading,
    unreadCount,
    markAsRead,
    deleteNotification,
    getNotificationIcon,
    getNotificationColor,
    groupNotificationsByDate,
  } = useNotifications();

  const bottomPad = useMemo(
    () => getTabBarHeight(insets.bottom) + 12,
    [insets.bottom],
  );

  const gradientColors = isDark
    ? [colors.background, colors.background, colors.background]
    : ["#EEF0FF", "#F5F3FF", "#FFFFFF"];

  // Apply filter
  const filtered = useMemo(() => {
    if (activeFilter === "unread") return notifications.filter((n) => !n.read);
    return notifications;
  }, [notifications, activeFilter]);

  // Group filtered notifications by date
  const sections = useMemo(() => {
    const groups = groupNotificationsByDate(filtered);
    const ORDER = ["Today", "Yesterday", "This Week", "Older"];
    return ORDER.filter((k) => groups[k]?.length).map((k) => ({
      title: k,
      data: groups[k],
    }));
  }, [filtered, groupNotificationsByDate]);

  // Navigate on tap
  const handlePress = (item: Notification) => {
    if (!item.read) markAsRead.mutate(item.id);
    if (item.post_id) {
      router.push(`/post/${item.post_id}` as any);
    } else if (item.sender?.username) {
      router.push(`/user/${item.sender.username}` as any);
    }
  };

  // Long press → action sheet
  const handleLongPress = (item: Notification) => {
    const options: string[] = [];
    if (!item.read) options.push("Mark as read");
    options.push("Delete");
    options.push("Cancel");

    const cancelIndex = options.length - 1;
    const destructiveIndex = options.indexOf("Delete");

    showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex: cancelIndex,
        destructiveButtonIndex: destructiveIndex,
      },
      (selectedIndex) => {
        if (selectedIndex == null || selectedIndex === cancelIndex) return;
        const action = options[selectedIndex];
        if (action === "Mark as read") markAsRead.mutate(item.id);
        if (action === "Delete") deleteNotification.mutate(item.id);
      },
    );
  };

  return (
    <>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        translucent
        backgroundColor="transparent"
      />

      <LinearGradient
        colors={gradientColors as any}
        locations={[0, 0.35, 1]}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
          {/* Header */}
          <AppHeader
            title="Notifications"
            backgroundColor="transparent"
            rightWide={
              unreadCount > 0 ? (
                <TouchableOpacity
                  onPress={() => markAsRead.mutate(undefined)}
                  activeOpacity={0.8}
                  style={[
                    styles.markAllBtn,
                    {
                      backgroundColor: colors.primary + "18",
                      borderColor: colors.primary + "30",
                    },
                  ]}
                >
                  {markAsRead.isPending ? (
                    <ActivityIndicator size={12} color={colors.primary} />
                  ) : (
                    <Ionicons
                      name="checkmark-done"
                      size={15}
                      color={colors.primary}
                    />
                  )}
                  <Text style={[styles.markAllText, { color: colors.primary }]}>
                    Mark all read
                  </Text>
                </TouchableOpacity>
              ) : undefined
            }
          />

          {/* Filter tabs */}
          <View style={styles.tabsWrap}>
            <View
              style={[
                styles.tabsRow,
                {
                  backgroundColor: colors.card,
                  shadowOpacity: isDark ? 0.2 : 0.05,
                },
              ]}
            >
              {(["all", "unread"] as FilterTab[]).map((tab) => {
                const isActive = activeFilter === tab;
                const label =
                  tab === "all"
                    ? "All"
                    : `Unread${unreadCount > 0 ? ` (${unreadCount})` : ""}`;
                return (
                  <TouchableOpacity
                    key={tab}
                    onPress={() => setActiveFilter(tab)}
                    activeOpacity={0.85}
                    style={[
                      styles.tabItem,
                      isActive && { backgroundColor: colors.primary },
                    ]}
                  >
                    <Text
                      style={[
                        styles.tabText,
                        { color: colors.textTertiary },
                        isActive && { color: "#fff" },
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Content */}
          {isLoading ? (
            // Skeleton loading
            <View
              style={[
                styles.skeletonCard,
                {
                  backgroundColor: colors.card,
                  shadowOpacity: isDark ? 0.2 : 0.05,
                },
              ]}
            >
              {Array(6)
                .fill(null)
                .map((_, i) => (
                  <NotificationRowSkeleton key={i} colors={colors} />
                ))}
            </View>
          ) : sections.length === 0 ? (
            <EmptyState filter={activeFilter} colors={colors} />
          ) : (
            <SectionList
              sections={sections}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              stickySectionHeadersEnabled={false}
              contentContainerStyle={[
                styles.listContent,
                { paddingBottom: bottomPad, paddingHorizontal: 18 },
              ]}
              renderSectionHeader={({ section }) => (
                <SectionHeader title={section.title} colors={colors} />
              )}
              renderItem={({ item, index, section }) => {
                const isFirst = index === 0;
                const isLast = index === section.data.length - 1;
                return (
                  <View
                    style={[
                      styles.cardWrap,
                      {
                        backgroundColor: colors.card,
                        shadowOpacity: isDark ? 0.2 : 0.05,
                        borderTopLeftRadius: isFirst ? 22 : 0,
                        borderTopRightRadius: isFirst ? 22 : 0,
                        borderBottomLeftRadius: isLast ? 22 : 0,
                        borderBottomRightRadius: isLast ? 22 : 0,
                      },
                    ]}
                  >
                    <NotificationRow
                      item={item}
                      colors={colors}
                      isDark={isDark}
                      onPress={() => handlePress(item)}
                      onLongPress={() => handleLongPress(item)}
                      getIcon={getNotificationIcon}
                      getColor={getNotificationColor}
                    />
                  </View>
                );
              }}
              // Separator inside card (between rows, not between sections)
              ItemSeparatorComponent={() => (
                <View
                  style={[
                    styles.separator,
                    {
                      backgroundColor: colors.card,
                      borderBottomColor: colors.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.separatorLine,
                      { backgroundColor: colors.border, marginLeft: 74 },
                    ]}
                  />
                </View>
              )}
            />
          )}
        </SafeAreaView>
      </LinearGradient>
    </>
  );
}

/* =========================
   STYLES
========================= */

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1, backgroundColor: "transparent" },

  // Mark all button in header
  markAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  markAllText: { fontSize: 13, fontWeight: "700" },

  // Filter tabs
  tabsWrap: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 4,
  },
  tabsRow: {
    flexDirection: "row",
    borderRadius: 22,
    padding: 5,
    gap: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 14,
    elevation: 2,
    alignSelf: "flex-start", // don't stretch full width
  },
  tabItem: {
    paddingHorizontal: 16,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  tabText: { fontSize: 13, fontWeight: "700" },

  // List
  listContent: { paddingTop: 8 },

  // Section header
  sectionHeader: {
    paddingHorizontal: 4,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },

  // Card wrap — groups rows per section into a rounded card
  cardWrap: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 14,
    elevation: 2,
    overflow: "hidden",
  },

  // Notification row
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 12,
    borderBottomWidth: 0, // separator handled by ItemSeparatorComponent
  },

  // Avatar + badge
  avatarWrap: { position: "relative", width: 48, height: 48, flexShrink: 0 },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  avatarFallbackText: { fontSize: 17, fontWeight: "900" },
  iconBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff", // overridden by card bg at runtime — works on white
  },

  // Row body
  rowBody: { flex: 1, minWidth: 0, gap: 3 },
  rowText: { fontSize: 13.5, lineHeight: 19, fontWeight: "600" },
  rowTime: { fontSize: 11.5, fontWeight: "600" },

  // Unread dot
  unreadDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },

  // Separator line (inside card, between rows)
  separator: { backgroundColor: "transparent" },
  separatorLine: { height: 1 },

  // Skeleton
  skeletonCard: {
    marginHorizontal: 18,
    marginTop: 20,
    borderRadius: 22,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 14,
    elevation: 2,
  },
  skeletonLine: {
    height: 12,
    borderRadius: 6,
  },

  // Empty state
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
  emptyTitle: { fontSize: 20, fontWeight: "800", textAlign: "center" },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 280,
  },
});
