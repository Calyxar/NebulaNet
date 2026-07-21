// app/notifications/index.tsx ✅ — tab screen with back handler
// ✅ Tabs switched from pill-background to underline style, matching
//    Explore and Profile, so the whole app uses one consistent tab pattern.
// ✅ UI CONSISTENCY PASS: gradient aligned to the shared blue tokens used
//    by Profile/Explore/Communities (was a different purple tint), and
//    uiScale/fontScale threaded through row/avatar/tab/card sizing.
// ✅ FIXED: NotificationRow's bodyText switch was missing a "repost"
//    case — fell through to the generic default even though push
//    notifications (hooks/useNotifications.ts's getNotificationTitle)
//    already handled it correctly. Now matches that wording.

import AppHeader from "@/components/navigation/AppHeader";
import { getTabBarHeight } from "@/components/navigation/CurvedTabBar";
import { useNotifications, type Notification } from "@/hooks/useNotifications";
import { useTheme } from "@/providers/ThemeProvider";
import { useActionSheet } from "@expo/react-native-action-sheet";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
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

type FilterTab = "all" | "unread";

function NotificationRowSkeleton({
  colors,
  uiScale,
}: {
  colors: any;
  uiScale: number;
}) {
  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: colors.card,
          paddingHorizontal: 14 * uiScale,
          paddingVertical: 13 * uiScale,
          gap: 12 * uiScale,
        },
      ]}
    >
      <View
        style={[
          styles.avatarWrap,
          { width: 48 * uiScale, height: 48 * uiScale },
        ]}
      >
        <View
          style={[
            styles.avatar,
            {
              backgroundColor: colors.surface,
              width: 48 * uiScale,
              height: 48 * uiScale,
              borderRadius: 24 * uiScale,
            },
          ]}
        />
      </View>
      <View style={{ flex: 1, gap: 7 * uiScale }}>
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

function NotificationRow({
  item,
  colors,
  isDark,
  uiScale,
  fontScale,
  onPress,
  onLongPress,
  getIcon,
  getColor,
}: {
  item: Notification;
  colors: any;
  isDark: boolean;
  uiScale: number;
  fontScale: number;
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
      case "follow_request":
        return `${base} requested to follow you`;
      case "mention":
        return `${base} mentioned you in a post`;
      case "community_invite":
        return item.community?.name
          ? `${base} invited you to ${item.community.name}`
          : `${base} invited you to a community`;
      case "post_shared":
        return `${base} shared your post`;
      // ✅ FIXED: was missing — matches getNotificationTitle's wording in
      // hooks/useNotifications.ts, which push notifications already used.
      case "repost":
        return `${base} reposted your post`;
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
          backgroundColor: item.is_read
            ? colors.card
            : colors.primary + (isDark ? "14" : "0D"),
          borderBottomColor: colors.border,
          paddingHorizontal: 14 * uiScale,
          paddingVertical: 13 * uiScale,
          gap: 12 * uiScale,
        },
      ]}
    >
      <View
        style={[
          styles.avatarWrap,
          { width: 48 * uiScale, height: 48 * uiScale },
        ]}
      >
        {item.sender?.avatar_url ? (
          <Image
            source={{ uri: item.sender.avatar_url }}
            style={[
              styles.avatar,
              {
                backgroundColor: colors.surface,
                width: 48 * uiScale,
                height: 48 * uiScale,
                borderRadius: 24 * uiScale,
              },
            ]}
          />
        ) : (
          <View
            style={[
              styles.avatar,
              styles.avatarFallback,
              {
                backgroundColor: colors.surface,
                width: 48 * uiScale,
                height: 48 * uiScale,
                borderRadius: 24 * uiScale,
              },
            ]}
          >
            <Text
              style={[
                styles.avatarFallbackText,
                { color: colors.primary, fontSize: 17 * fontScale },
              ]}
            >
              {(senderName[0] || "?").toUpperCase()}
            </Text>
          </View>
        )}
        <View
          style={[
            styles.iconBadge,
            {
              backgroundColor: iconColor,
              width: 20 * uiScale,
              height: 20 * uiScale,
              borderRadius: 10 * uiScale,
            },
          ]}
        >
          <Ionicons name={iconName as any} size={10} color="#fff" />
        </View>
      </View>
      <View style={[styles.rowBody, { gap: 3 * uiScale }]}>
        <Text
          style={[
            styles.rowText,
            { color: colors.text, fontSize: 13.5 * fontScale },
          ]}
          numberOfLines={2}
        >
          {bodyText}
        </Text>
        <Text
          style={[
            styles.rowTime,
            { color: colors.textTertiary, fontSize: 11.5 * fontScale },
          ]}
        >
          {timeAgo(item.created_at)}
        </Text>
      </View>
      {!item.is_read && (
        <View
          style={[
            styles.unreadDot,
            {
              backgroundColor: colors.primary,
              width: 8 * uiScale,
              height: 8 * uiScale,
              borderRadius: 4 * uiScale,
            },
          ]}
        />
      )}
    </TouchableOpacity>
  );
}

function SectionHeader({
  title,
  colors,
  uiScale,
  fontScale,
}: {
  title: string;
  colors: any;
  uiScale: number;
  fontScale: number;
}) {
  return (
    <View
      style={[
        styles.sectionHeader,
        { paddingTop: 16 * uiScale, paddingBottom: 8 * uiScale },
      ]}
    >
      <Text
        style={[
          styles.sectionTitle,
          { color: colors.textTertiary, fontSize: 12 * fontScale },
        ]}
      >
        {title}
      </Text>
    </View>
  );
}

function EmptyState({
  filter,
  colors,
  uiScale,
  fontScale,
}: {
  filter: FilterTab;
  colors: any;
  uiScale: number;
  fontScale: number;
}) {
  return (
    <View style={styles.emptyState}>
      <View
        style={[
          styles.emptyIconCircle,
          {
            backgroundColor: colors.surface,
            width: 72 * uiScale,
            height: 72 * uiScale,
            borderRadius: 36 * uiScale,
          },
        ]}
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
      <Text
        style={[
          styles.emptyTitle,
          { color: colors.text, fontSize: 20 * fontScale },
        ]}
      >
        {filter === "unread" ? "You're all caught up" : "No notifications yet"}
      </Text>
      <Text
        style={[
          styles.emptySubtitle,
          { color: colors.textTertiary, fontSize: 14 * fontScale },
        ]}
      >
        {filter === "unread"
          ? "No unread notifications right now."
          : "When people like, comment, or follow you, it'll show up here."}
      </Text>
    </View>
  );
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark, uiScale, fontScale } = useTheme();
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

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        () => {
          router.replace("/(tabs)/home");
          return true;
        },
      );
      return () => subscription.remove();
    }, []),
  );

  const gradientColors = isDark
    ? [colors.background, colors.background, colors.background]
    : (["#DCEBFF", "#EEF4FF", "#FFFFFF"] as const);

  const filtered = useMemo(() => {
    if (activeFilter === "unread")
      return notifications.filter((n) => !n.is_read);
    return notifications;
  }, [notifications, activeFilter]);

  const sections = useMemo(() => {
    if (!filtered.length) return [];
    const groups = groupNotificationsByDate(filtered);
    const ORDER = ["Today", "Yesterday", "This Week", "Older"];
    return ORDER.filter((k) => groups[k]?.length).map((k) => ({
      title: k,
      data: groups[k],
    }));
  }, [filtered, groupNotificationsByDate]);

  const handlePress = useCallback(
    (item: Notification) => {
      if (!item.is_read) markAsRead.mutate(item.id);
      if (item.post_id) router.push(`/post/${item.post_id}` as any);
      else if (item.sender?.username)
        router.push(`/user/${item.sender.username}` as any);
    },
    [markAsRead],
  );

  const handleLongPress = useCallback(
    (item: Notification) => {
      const options: string[] = [];
      if (!item.is_read) options.push("Mark as read");
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
          if (options[selectedIndex] === "Mark as read")
            markAsRead.mutate(item.id);
          if (options[selectedIndex] === "Delete")
            deleteNotification.mutate(item.id);
        },
      );
    },
    [markAsRead, deleteNotification, showActionSheetWithOptions],
  );

  return (
    <>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        translucent
        backgroundColor="transparent"
      />
      <LinearGradient
        colors={gradientColors as any}
        locations={[0, 0.42, 1]}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
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
                      paddingHorizontal: 12 * uiScale,
                      paddingVertical: 8 * uiScale,
                      gap: 5 * uiScale,
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
                  <Text
                    style={[
                      styles.markAllText,
                      { color: colors.primary, fontSize: 13 * fontScale },
                    ]}
                  >
                    Mark all read
                  </Text>
                </TouchableOpacity>
              ) : undefined
            }
          />

          <View
            style={[
              styles.tabsRow,
              {
                borderBottomColor: colors.border,
                marginHorizontal: 18 * uiScale,
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
                  activeOpacity={0.7}
                  style={[styles.tabItem, { paddingVertical: 13 * uiScale }]}
                >
                  <Text
                    style={[
                      styles.tabText,
                      {
                        color: isActive ? colors.text : colors.textTertiary,
                        fontSize: 13.5 * fontScale,
                      },
                      isActive && styles.tabTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                  {isActive && (
                    <View
                      style={[
                        styles.tabUnderline,
                        { backgroundColor: colors.primary },
                      ]}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {isLoading ? (
            <View
              style={[
                styles.skeletonCard,
                {
                  backgroundColor: colors.card,
                  shadowOpacity: isDark ? 0.2 : 0.05,
                  marginHorizontal: 18 * uiScale,
                  borderRadius: 22 * uiScale,
                },
              ]}
            >
              {Array(6)
                .fill(null)
                .map((_, i) => (
                  <NotificationRowSkeleton
                    key={i}
                    colors={colors}
                    uiScale={uiScale}
                  />
                ))}
            </View>
          ) : sections.length === 0 ? (
            <EmptyState
              filter={activeFilter}
              colors={colors}
              uiScale={uiScale}
              fontScale={fontScale}
            />
          ) : (
            <SectionList
              sections={sections}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              stickySectionHeadersEnabled={false}
              contentContainerStyle={[
                styles.listContent,
                {
                  paddingBottom: bottomPad,
                  paddingHorizontal: 18 * uiScale,
                },
              ]}
              renderSectionHeader={({ section }) => (
                <SectionHeader
                  title={section.title}
                  colors={colors}
                  uiScale={uiScale}
                  fontScale={fontScale}
                />
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
                        borderTopLeftRadius: isFirst ? 22 * uiScale : 0,
                        borderTopRightRadius: isFirst ? 22 * uiScale : 0,
                        borderBottomLeftRadius: isLast ? 22 * uiScale : 0,
                        borderBottomRightRadius: isLast ? 22 * uiScale : 0,
                      },
                    ]}
                  >
                    <NotificationRow
                      item={item}
                      colors={colors}
                      isDark={isDark}
                      uiScale={uiScale}
                      fontScale={fontScale}
                      onPress={() => handlePress(item)}
                      onLongPress={() => handleLongPress(item)}
                      getIcon={getNotificationIcon}
                      getColor={getNotificationColor}
                    />
                  </View>
                );
              }}
              ItemSeparatorComponent={() => (
                <View
                  style={[styles.separator, { backgroundColor: colors.card }]}
                >
                  <View
                    style={[
                      styles.separatorLine,
                      {
                        backgroundColor: colors.border,
                        marginLeft: 74 * uiScale,
                      },
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

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1, backgroundColor: "transparent" },
  markAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
  },
  markAllText: { fontWeight: "700" },
  tabsRow: {
    flexDirection: "row",
    paddingTop: 4,
    borderBottomWidth: 1,
  },
  tabItem: { flex: 1, alignItems: "center" },
  tabText: { fontWeight: "700" },
  tabTextActive: { fontWeight: "900" },
  tabUnderline: {
    position: "absolute",
    bottom: -1,
    height: 3,
    width: "56%",
    borderRadius: 2,
  },
  listContent: { paddingTop: 8 },
  sectionHeader: { paddingHorizontal: 4 },
  sectionTitle: {
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  cardWrap: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 14,
    elevation: 2,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarWrap: { position: "relative", flexShrink: 0 },
  avatar: {},
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  avatarFallbackText: { fontWeight: "900" },
  iconBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  rowBody: { flex: 1, minWidth: 0 },
  rowText: { lineHeight: 19, fontWeight: "600" },
  rowTime: { fontWeight: "600" },
  unreadDot: { flexShrink: 0 },
  separator: { backgroundColor: "transparent" },
  separatorLine: { height: 1 },
  skeletonCard: {
    marginTop: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 14,
    elevation: 2,
  },
  skeletonLine: { height: 12, borderRadius: 6 },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
  },
  emptyIconCircle: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: { fontWeight: "800", textAlign: "center" },
  emptySubtitle: {
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 280,
  },
});
