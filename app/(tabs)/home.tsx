// app/(tabs)/home.tsx
// ✅ Matches NebulaNet design from screenshot
// ✅ No mocks - real functionality only
// ✅ Fixed tab bar spacing for Samsung A54 and gesture navigation

import {
  EXTRA_BOTTOM_PADDING,
  TAB_BAR_HEIGHT,
} from "@/components/navigation/CurvedTabBar";
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

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

type FeedTab = "for-you" | "following" | "my-community";

// ✅ Stories section with Add Story button (no mocks)
function StoriesHeader() {
  return (
    <View style={styles.storiesWrap}>
      {/* Add Story Button */}
      <TouchableOpacity
        style={styles.storyItem}
        onPress={() => router.push("/create/story")}
        activeOpacity={0.7}
      >
        <View style={styles.addStoryCircle}>
          <Ionicons name="add" size={28} color="#7C3AED" />
        </View>
        <Text style={styles.storyLabel}>Add Story</Text>
      </TouchableOpacity>

      {/* Real stories will be loaded here via your stories hook */}
    </View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  // ✅ Responsive media height for different screen sizes
  const mediaHeight = useMemo(
    () => Math.round(Math.min(420, Math.max(200, width * 0.62))),
    [width],
  );

  const [activeTab, setActiveTab] = useState<FeedTab>("for-you");

  // ✅ Get unread notifications count
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
        {/* Top Header */}
        <View style={[styles.topHeader, { paddingTop: insets.top }]}>
          <View style={styles.brandRow}>
            <Image
              source={require("@/assets/images/icon.png")}
              style={styles.brandLogo}
            />
            <Text style={styles.brandText}>NebulaNet</Text>
          </View>

          {/* Notification Bell */}
          <TouchableOpacity
            style={styles.bellWrap}
            onPress={() => router.push("/notifications")}
            activeOpacity={0.7}
          >
            <Bell size={22} color="#7C3AED" strokeWidth={2.5} />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {unreadCount > 99 ? "99+" : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Stories Section */}
        <StoriesHeader />

        {/* Tab Segments */}
        <View style={styles.segmentWrap}>
          <View style={styles.segment}>
            <SegBtn
              label="For You"
              active={activeTab === "for-you"}
              onPress={() => setActiveTab("for-you")}
            />
            <SegBtn
              label="Following"
              active={activeTab === "following"}
              onPress={() => setActiveTab("following")}
            />
            <SegBtn
              label="My Community"
              active={activeTab === "my-community"}
              onPress={() => setActiveTab("my-community")}
            />
          </View>
        </View>
      </>
    );
  }, [activeTab, unreadCount, insets.top]);

  const renderPost = useCallback(
    ({ item }: { item: Post }) => {
      const author = item.user?.full_name || item.user?.username || "User";
      const avatar = item.user?.avatar_url;
      const media = item.media_urls?.[0];

      return (
        <View style={styles.card}>
          {/* Post Header */}
          <View style={styles.cardTop}>
            <View style={styles.authorRow}>
              {avatar ? (
                <Image source={{ uri: avatar }} style={styles.avatar} />
              ) : (
                <View
                  style={[
                    styles.avatar,
                    {
                      backgroundColor: "#E0E7FF",
                      alignItems: "center",
                      justifyContent: "center",
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: "#7C3AED",
                      fontWeight: "700",
                      fontSize: 16,
                    }}
                  >
                    {author[0]?.toUpperCase()}
                  </Text>
                </View>
              )}
              <View>
                <Text style={styles.author}>{author}</Text>
                <Text style={styles.time}>{timeAgo(item.created_at)}</Text>
              </View>
            </View>
            <TouchableOpacity>
              <MoreVertical size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          {/* Post Content */}
          {!!item.content && <Text style={styles.content}>{item.content}</Text>}

          {/* Post Media */}
          {!!media && (
            <Image
              source={{ uri: media }}
              style={[styles.media, { height: mediaHeight }]}
              resizeMode="cover"
            />
          )}

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => onLike(item.id)}
              activeOpacity={0.7}
            >
              <Heart size={20} color="#111827" fill="none" strokeWidth={2.5} />
              <Text style={styles.actionText}>{item.like_count ?? 0}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}>
              <MessageCircle size={20} color="#111827" strokeWidth={2.5} />
              <Text style={styles.actionText}>{item.comment_count ?? 0}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}>
              <Repeat2 size={20} color="#111827" strokeWidth={2.5} />
              <Text style={styles.actionText}>{item.share_count ?? 0}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => onSave(item.id)}
              activeOpacity={0.7}
            >
              <Bookmark
                size={20}
                color="#111827"
                fill="none"
                strokeWidth={2.5}
              />
            </TouchableOpacity>
          </View>
        </View>
      );
    },
    [onLike, onSave, mediaHeight],
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#7C3AED" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["left", "right"]}>
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
            colors={["#7C3AED"]}
            tintColor="#7C3AED"
          />
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={{ paddingVertical: 20 }}>
              <ActivityIndicator size="small" color="#7C3AED" />
            </View>
          ) : null
        }
        viewabilityConfig={viewabilityConfig}
        onViewableItemsChanged={onViewableItemsChanged}
        contentContainerStyle={{
          // ✅ FIXED: Padding for tab bar height (68px) + bottom spacing (20px) + extra buffer (12px)
          paddingBottom: TAB_BAR_HEIGHT + EXTRA_BOTTOM_PADDING + 12,
        }}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

function SegBtn({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.segBtn, active && styles.segBtnActive]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.segText, active && styles.segTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F5F7FF",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  // Top Header
  topHeader: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F5F7FF",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  brandLogo: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  brandText: {
    fontSize: 22,
    fontWeight: "900",
    color: "#111827",
    letterSpacing: -0.5,
  },
  bellWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E0E7FF",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    marginLeft: 12,
  },
  badge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "#7C3AED",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: "#E0E7FF",
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "900",
  },

  // Stories Section
  storiesWrap: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#F5F7FF",
  },
  storyItem: {
    alignItems: "center",
    marginRight: 16,
  },
  addStoryCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#7C3AED",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
    backgroundColor: "#FFFFFF",
  },
  storyLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
    maxWidth: 72,
    textAlign: "center",
  },

  // Tab Segments
  segmentWrap: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    backgroundColor: "#F5F7FF",
  },
  segment: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 6,
    flexDirection: "row",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  segBtn: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  segBtnActive: {
    backgroundColor: "#7C3AED",
  },
  segText: {
    color: "#9CA3AF",
    fontWeight: "700",
    fontSize: 13,
  },
  segTextActive: {
    color: "#fff",
  },

  // Post Card
  card: {
    marginHorizontal: 14,
    marginBottom: 14,
    padding: 16,
    borderRadius: 24,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  author: {
    fontWeight: "800",
    color: "#111827",
    fontSize: 15,
  },
  time: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 2,
  },
  content: {
    marginTop: 12,
    fontSize: 15,
    color: "#111827",
    lineHeight: 22,
  },
  media: {
    marginTop: 14,
    borderRadius: 20,
    backgroundColor: "#F5F7FF",
  },

  // Action Buttons
  actions: {
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 2,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  actionText: {
    fontWeight: "700",
    fontSize: 13,
    color: "#111827",
  },
});
