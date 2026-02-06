// app/(tabs)/home.tsx
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { router } from "expo-router";
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

import { useFeedInteractions } from "@/hooks/useFeedInteractions";
import { useInfiniteFeedPosts } from "@/hooks/usePosts";
import { useUnreadNotificationsCount } from "@/hooks/useUnreadNotificationsCount";
import type { Post } from "@/lib/queries/posts";

import {
  Bell,
  Bookmark,
  Heart,
  MessageCircle,
  MoreVertical,
  Send,
} from "lucide-react-native";

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

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const bottomTabBarHeight = useBottomTabBarHeight();
  const { width } = useWindowDimensions();

  // ✅ Responsive media height across screen sizes (phones/tablets)
  const mediaHeight = useMemo(
    () => Math.round(Math.min(420, Math.max(200, width * 0.62))),
    [width],
  );

  const [activeTab, setActiveTab] = useState<FeedTab>("for-you");

  // ✅ Get unread notifications count (hook returns a number)
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

  const posts = useMemo<Post[]>(
    () => data?.pages.flatMap((p) => p.posts) ?? [],
    [data],
  );

  const { onLike, onSave, viewabilityConfig, onViewableItemsChanged } =
    useFeedInteractions();

  const Header = useMemo(() => {
    return (
      <View>
        <View
          style={[styles.topHeader, { paddingTop: Math.max(insets.top, 10) }]}
        >
          <View style={styles.brandRow}>
            <Image
              source={require("@/assets/images/icon.png")}
              style={styles.brandLogo}
            />
            <Text
              style={styles.brandText}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              NebulaNet
            </Text>
          </View>

          {/* ✅ Bell with notification badge */}
          <TouchableOpacity
            style={styles.bellWrap}
            activeOpacity={0.85}
            onPress={() => router.push("/notifications")}
          >
            <Bell size={20} color="#111827" />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {unreadCount > 99 ? "99+" : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

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
      </View>
    );
  }, [activeTab, unreadCount, insets.top]);

  const renderPost = useCallback(
    ({ item }: { item: Post }) => {
      const author = item.user?.full_name || item.user?.username || "User";
      const avatar = item.user?.avatar_url;
      const media = item.media_urls?.[0];

      return (
        <View style={styles.card}>
          <View style={styles.cardTop}>
            <View style={styles.authorRow}>
              <Image
                source={
                  avatar ? { uri: avatar } : require("@/assets/images/icon.png")
                }
                style={styles.avatar}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.author} numberOfLines={1}>
                  {author}
                </Text>
                <Text style={styles.time}>{timeAgo(item.created_at)}</Text>
              </View>
            </View>

            <TouchableOpacity activeOpacity={0.8}>
              <MoreVertical size={18} color="#111827" />
            </TouchableOpacity>
          </View>

          {!!item.content && <Text style={styles.content}>{item.content}</Text>}

          {!!media && (
            <Image
              source={{ uri: media }}
              style={[styles.media, { height: mediaHeight }]}
              resizeMode="cover"
            />
          )}

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.actionBtn}
              activeOpacity={0.85}
              onPress={() => onLike(item.id)}
            >
              <Heart
                size={20}
                color={item.is_liked ? "#EF4444" : "#111827"}
                fill={item.is_liked ? "#EF4444" : "transparent"}
              />
              <Text style={styles.actionText}>{item.like_count ?? 0}</Text>
            </TouchableOpacity>

            <View style={styles.actionBtn}>
              <MessageCircle size={20} color="#111827" />
              <Text style={styles.actionText}>{item.comment_count ?? 0}</Text>
            </View>

            <View style={styles.actionBtn}>
              <Send size={20} color="#111827" />
              <Text style={styles.actionText}>{item.share_count ?? 0}</Text>
            </View>

            <TouchableOpacity
              style={styles.actionBtn}
              activeOpacity={0.85}
              onPress={() => onSave(item.id)}
            >
              <Bookmark
                size={20}
                color="#111827"
                fill={item.is_saved ? "#111827" : "transparent"}
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
      <SafeAreaView style={styles.center}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={Header}
        onEndReached={() => hasNextPage && fetchNextPage()}
        onEndReachedThreshold={0.45}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={{ paddingVertical: 16 }}>
              <ActivityIndicator />
            </View>
          ) : null
        }
        viewabilityConfig={viewabilityConfig}
        onViewableItemsChanged={onViewableItemsChanged}
        contentContainerStyle={{
          paddingBottom: bottomTabBarHeight + 16, // ✅ matches default Tabs height
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
      onPress={onPress}
      activeOpacity={0.9}
      style={[styles.segBtn, active && styles.segBtnActive]}
    >
      <Text style={[styles.segText, active && styles.segTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F5F7FF" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  topHeader: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  brandLogo: { width: 34, height: 34 },
  brandText: { fontSize: 22, fontWeight: "900", color: "#111827" },

  bellWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F2EAFE",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    marginLeft: 12,
  },
  badge: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "#7C3AED",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: "#F2EAFE",
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "900",
  },

  segmentWrap: { paddingHorizontal: 14, paddingBottom: 12 },
  segment: {
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 6,
    flexDirection: "row",
    gap: 8,
  },
  segBtn: {
    flex: 1,
    height: 38,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  segBtnActive: { backgroundColor: "#7C3AED" },
  segText: { color: "#9CA3AF", fontWeight: "900", fontSize: 13 },
  segTextActive: { color: "#fff" },

  card: {
    marginHorizontal: 14,
    marginBottom: 14,
    padding: 14,
    borderRadius: 22,
    backgroundColor: "#fff",
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  authorRow: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  avatar: { width: 38, height: 38, borderRadius: 19 },
  author: { fontWeight: "900", color: "#111827" },
  time: { fontSize: 12, color: "#9CA3AF" },

  content: { marginTop: 12, fontSize: 14.5, color: "#111827" },
  media: {
    marginTop: 12,
    borderRadius: 18,
    backgroundColor: "#EDEBFF",
  },

  actions: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
  actionText: { fontWeight: "800", fontSize: 12.5, color: "#111827" },
});
