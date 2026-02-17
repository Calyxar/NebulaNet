// app/(tabs)/home.tsx — COMPLETED + UPDATED ✅
// ✅ Dark mode support
// ✅ Shows Video badge + Play overlay when post is video (uses post_type if present, else infers from media URL)
// ✅ Tapping a post opens /post/[id] so users can view, like, comment, share
// ✅ Comment icon opens the post too (common UX)

import AppHeader from "@/components/navigation/AppHeader";
import { getTabBarHeight } from "@/components/navigation/CurvedTabBar";
import { useFeedInteractions } from "@/hooks/useFeedInteractions";
import { useInfiniteFeedPosts } from "@/hooks/usePosts";
import { useUnreadNotificationsCount } from "@/hooks/useUnreadNotificationsCount";
import type { Post } from "@/lib/queries/posts";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  Bell,
  Bookmark,
  Heart,
  MessageCircle,
  MoreVertical,
  Repeat2,
} from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { useTheme } from "@/providers/ThemeProvider";

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const isVideoUrl = (url?: string | null) => {
  if (!url) return false;
  const clean = url.split("?")[0].toLowerCase();
  return (
    clean.endsWith(".mp4") ||
    clean.endsWith(".mov") ||
    clean.endsWith(".m4v") ||
    clean.endsWith(".webm") ||
    clean.endsWith(".mkv") ||
    clean.endsWith(".avi")
  );
};

const isVideoPost = (post: any) => {
  if (post?.post_type === "video") return true;
  if (post?.post_type === "mixed") return true;
  const first = post?.media_urls?.[0];
  return isVideoUrl(first);
};

type FeedTab = "for-you" | "following" | "my-community";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { colors, isDark } = useTheme();

  const mediaHeight = useMemo(
    () => Math.round(Math.min(420, Math.max(200, width * 0.62))),
    [width],
  );

  const bottomPad = useMemo(
    () => getTabBarHeight(insets.bottom) + 12,
    [insets.bottom],
  );

  const [activeTab, setActiveTab] = useState<FeedTab>("for-you");
  const unreadCount = useUnreadNotificationsCount();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    isRefetching,
    isLoading,
  } = useInfiniteFeedPosts(activeTab);

  const posts = useMemo(
    () => data?.pages.flatMap((p) => p.posts) ?? [],
    [data],
  );

  const { onLike, onSave, viewabilityConfig, onViewableItemsChanged } =
    useFeedInteractions();

  const Header = useMemo(() => {
    return (
      <>
        <AppHeader
          backgroundColor={colors.background}
          leftWide={
            <View style={styles.brandRow}>
              <Image
                source={require("@/assets/images/icon.png")}
                style={styles.brandLogo}
              />
              <Text
                style={[styles.brandText, { color: colors.text }]}
                numberOfLines={1}
              >
                NebulaNet
              </Text>
            </View>
          }
          right={
            <TouchableOpacity
              style={[
                styles.bellWrap,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              onPress={() => router.push("/notifications")}
              activeOpacity={0.7}
            >
              <Bell size={22} color={colors.primary} strokeWidth={2.5} />
              {unreadCount > 0 && (
                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor: colors.primary,
                      borderColor: colors.surface,
                    },
                  ]}
                >
                  <Text style={styles.badgeText}>
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          }
        />

        {/* Stories */}
        <View
          style={[styles.storiesWrap, { backgroundColor: colors.background }]}
        >
          <TouchableOpacity
            style={styles.storyItem}
            onPress={() => router.push("/create/story")}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.addStoryCircle,
                { borderColor: colors.primary, backgroundColor: colors.card },
              ]}
            >
              <Ionicons name="add" size={28} color={colors.primary} />
            </View>
            <Text style={[styles.storyLabel, { color: colors.text }]}>
              Add Story
            </Text>
          </TouchableOpacity>
        </View>

        {/* Segments */}
        <View
          style={[styles.segmentWrap, { backgroundColor: colors.background }]}
        >
          <View
            style={[
              styles.segment,
              {
                backgroundColor: colors.card,
                shadowOpacity: isDark ? 0.25 : 0.05,
              },
            ]}
          >
            <SegBtn
              label="For You"
              active={activeTab === "for-you"}
              onPress={() => setActiveTab("for-you")}
              colors={colors}
            />
            <SegBtn
              label="Following"
              active={activeTab === "following"}
              onPress={() => setActiveTab("following")}
              colors={colors}
            />
            <SegBtn
              label="My Community"
              active={activeTab === "my-community"}
              onPress={() => setActiveTab("my-community")}
              colors={colors}
            />
          </View>
        </View>
      </>
    );
  }, [activeTab, unreadCount, colors, isDark]);

  const openPost = (postId: string) => {
    router.push(`/post/${postId}` as any);
  };

  const renderPost = useCallback(
    ({ item }: { item: Post }) => {
      const author = item.user?.full_name || item.user?.username || "User";
      const avatar = item.user?.avatar_url;
      const media = item.media_urls?.[0];
      const video = isVideoPost(item);

      return (
        <TouchableOpacity
          activeOpacity={0.92}
          onPress={() => openPost(item.id)}
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              shadowOpacity: isDark ? 0.22 : 0.05,
            },
          ]}
        >
          <View style={styles.cardTop}>
            <View style={styles.authorRow}>
              {avatar ? (
                <Image source={{ uri: avatar }} style={styles.avatar} />
              ) : (
                <View
                  style={[
                    styles.avatar,
                    {
                      backgroundColor: colors.surface,
                      alignItems: "center",
                      justifyContent: "center",
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: colors.primary,
                      fontWeight: "700",
                      fontSize: 16,
                    }}
                  >
                    {author[0]?.toUpperCase()}
                  </Text>
                </View>
              )}

              <View>
                <Text style={[styles.author, { color: colors.text }]}>
                  {author}
                </Text>
                <Text style={[styles.time, { color: colors.textTertiary }]}>
                  {timeAgo(item.created_at)}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => openPost(item.id)}
            >
              <MoreVertical size={20} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>

          {!!item.content && (
            <Text
              style={[styles.content, { color: colors.text }]}
              numberOfLines={6}
            >
              {item.content}
            </Text>
          )}

          {!!media && (
            <View
              style={[
                styles.mediaWrap,
                { height: mediaHeight, backgroundColor: colors.surface },
              ]}
            >
              {/* For videos: Image may not always render a frame. Still fine as a “cover”.
                  If it fails to load, user can tap to open post where video plays. */}
              <Image
                source={{ uri: media }}
                style={styles.media}
                resizeMode="cover"
              />

              {video && (
                <>
                  <View
                    style={[
                      styles.videoBadge,
                      {
                        backgroundColor: isDark
                          ? "rgba(0,0,0,0.55)"
                          : "rgba(0,0,0,0.45)",
                      },
                    ]}
                  >
                    <Ionicons name="videocam" size={14} color="#fff" />
                    <Text style={styles.videoBadgeText}>Video</Text>
                  </View>

                  <View
                    style={[
                      styles.playOverlay,
                      {
                        backgroundColor: isDark
                          ? "rgba(0,0,0,0.45)"
                          : "rgba(0,0,0,0.35)",
                        borderColor: "rgba(255,255,255,0.35)",
                      },
                    ]}
                  >
                    <Ionicons name="play" size={28} color="#fff" />
                  </View>
                </>
              )}
            </View>
          )}

          {/* ACTIONS */}
          <View style={[styles.actions, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={(e) => {
                e.stopPropagation?.();
                onLike(item.id);
              }}
              activeOpacity={0.7}
            >
              <Heart
                size={20}
                color={colors.text}
                fill="none"
                strokeWidth={2.5}
              />
              <Text style={[styles.actionText, { color: colors.text }]}>
                {item.like_count ?? 0}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={(e) => {
                e.stopPropagation?.();
                openPost(item.id);
              }}
              activeOpacity={0.7}
            >
              <MessageCircle size={20} color={colors.text} strokeWidth={2.5} />
              <Text style={[styles.actionText, { color: colors.text }]}>
                {item.comment_count ?? 0}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={(e) => {
                e.stopPropagation?.();
                openPost(item.id); // sharing is available on detail page too
              }}
              activeOpacity={0.7}
            >
              <Repeat2 size={20} color={colors.text} strokeWidth={2.5} />
              <Text style={[styles.actionText, { color: colors.text }]}>
                {item.share_count ?? 0}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={(e) => {
                e.stopPropagation?.();
                onSave(item.id);
              }}
              activeOpacity={0.7}
            >
              <Bookmark
                size={20}
                color={colors.text}
                fill="none"
                strokeWidth={2.5}
              />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      );
    },
    [onLike, onSave, mediaHeight, colors, isDark],
  );

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={["left", "right"]}
    >
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={Header}
        renderItem={renderPost}
        onEndReached={() => hasNextPage && fetchNextPage()}
        onEndReachedThreshold={0.45}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={{ paddingVertical: 20 }}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : null
        }
        viewabilityConfig={viewabilityConfig}
        onViewableItemsChanged={onViewableItemsChanged}
        contentContainerStyle={{ paddingBottom: bottomPad }}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

function SegBtn({
  label,
  active,
  onPress,
  colors,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  colors: any;
}) {
  return (
    <TouchableOpacity
      style={[styles.segBtn, active && { backgroundColor: colors.primary }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text
        style={[
          styles.segText,
          { color: colors.textTertiary },
          active && { color: "#FFFFFF" },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexShrink: 1,
  },
  brandLogo: { width: 36, height: 36, borderRadius: 18 },
  brandText: {
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.5,
    flexShrink: 1,
  },

  bellWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    borderWidth: 1,
  },
  badge: {
    position: "absolute",
    top: 4,
    right: 4,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
    borderWidth: 2,
  },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "900" },

  storiesWrap: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  storyItem: { alignItems: "center", marginRight: 16 },
  addStoryCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  storyLabel: {
    fontSize: 12,
    fontWeight: "700",
    maxWidth: 72,
    textAlign: "center",
  },

  segmentWrap: { paddingHorizontal: 14, paddingBottom: 14 },
  segment: {
    borderRadius: 24,
    padding: 6,
    flexDirection: "row",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },

  segBtn: {
    flex: 1,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  segText: { fontSize: 13, fontWeight: "800" },

  card: {
    marginHorizontal: 14,
    marginBottom: 12,
    borderRadius: 22,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 16,
    elevation: 2,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  authorRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  author: { fontSize: 14, fontWeight: "900" },
  time: { fontSize: 12, fontWeight: "700", marginTop: 2 },

  content: { fontSize: 14, lineHeight: 20, marginBottom: 10 },

  mediaWrap: {
    width: "100%",
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 12,
    position: "relative",
  },
  media: { width: "100%", height: "100%" },

  videoBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  videoBadgeText: { color: "#fff", fontSize: 12, fontWeight: "900" },

  playOverlay: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: 56,
    height: 56,
    marginLeft: -28,
    marginTop: -28,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },

  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
  actionText: { fontSize: 12.5, fontWeight: "800" },
});
