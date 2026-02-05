// app/(tabs)/home.tsx
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useMemo, useRef } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ViewToken,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { getTabBarHeight } from "@/components/navigation/CurvedTabBar";
import { useLikePost } from "@/hooks/useLikes";
import { useInfiniteFeedPosts } from "@/hooks/usePosts";
import { useSavePost } from "@/hooks/useSaves";
import type { Post } from "@/lib/queries/posts";
import { trackPostView } from "@/lib/supabase";

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
};

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = getTabBarHeight(insets.bottom);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    isRefetching,
    isLoading,
  } = useInfiniteFeedPosts("for-you");

  const likeMutation = useLikePost();
  const saveMutation = useSavePost();

  const posts = useMemo<Post[]>(
    () => data?.pages.flatMap((p) => p.posts) ?? [],
    [data],
  );

  // -------------------- View tracking (once per session) --------------------
  const viewedRef = useRef<Set<string>>(new Set());

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      for (const v of viewableItems) {
        const item = v.item as Post | undefined;
        if (!item?.id) continue;

        if (v.isViewable && !viewedRef.current.has(item.id)) {
          viewedRef.current.add(item.id);
          // fire-and-forget (your trackPostView already catches)
          trackPostView(item.id);
        }
      }
    },
    [],
  );

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 60,
    minimumViewTime: 350,
  }).current;

  // -------------------- Actions --------------------

  const onLike = useCallback(
    (postId: string) => likeMutation.mutate(postId),
    [likeMutation],
  );

  const onSave = useCallback(
    (postId: string) => saveMutation.mutate(postId),
    [saveMutation],
  );

  const renderPost = useCallback(
    ({ item }: { item: Post }) => {
      const author = item.user?.full_name || item.user?.username || "User";
      const media = item.media_urls?.[0];

      return (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.authorRow}>
              <Image
                source={
                  item.user?.avatar_url
                    ? { uri: item.user.avatar_url }
                    : require("@/assets/images/icon.png")
                }
                style={styles.avatar}
              />
              <View>
                <Text style={styles.author}>{author}</Text>
                <Text style={styles.time}>{timeAgo(item.created_at)}</Text>
              </View>
            </View>

            <Ionicons name="ellipsis-horizontal" size={18} color="#111827" />
          </View>

          {!!item.content && <Text style={styles.content}>{item.content}</Text>}

          {!!media && <Image source={{ uri: media }} style={styles.media} />}

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.action}
              onPress={() => onLike(item.id)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={item.is_liked ? "heart" : "heart-outline"}
                size={20}
                color={item.is_liked ? "#EF4444" : "#111827"}
              />
              <Text style={styles.actionText}>{item.like_count}</Text>
            </TouchableOpacity>

            <View style={styles.action}>
              <Ionicons name="chatbubble-outline" size={20} color="#111827" />
              <Text style={styles.actionText}>{item.comment_count}</Text>
            </View>

            <TouchableOpacity
              style={styles.action}
              onPress={() => onSave(item.id)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={item.is_saved ? "bookmark" : "bookmark-outline"}
                size={20}
                color="#111827"
              />
            </TouchableOpacity>
          </View>
        </View>
      );
    },
    [onLike, onSave],
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <Image
            source={require("@/assets/images/icon.png")}
            style={styles.logo}
          />
          <Text style={styles.brand}>NebulaNet</Text>
        </View>

        <TouchableOpacity activeOpacity={0.85} style={styles.headerIconBtn}>
          <Ionicons name="notifications-outline" size={22} color="#111827" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        onEndReached={() => hasNextPage && fetchNextPage()}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={{ paddingVertical: 10 }}>
              <ActivityIndicator />
            </View>
          ) : null
        }
        viewabilityConfig={viewabilityConfig}
        onViewableItemsChanged={onViewableItemsChanged}
        windowSize={9}
        removeClippedSubviews
        contentContainerStyle={[
          styles.list,
          { paddingBottom: tabBarHeight + 10 }, // ✅ prevents overlap with curved tab bar
        ]}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },

  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  brandRow: { flexDirection: "row", alignItems: "center" },
  logo: { width: 30, height: 30, marginRight: 8 },
  brand: { fontSize: 20, fontWeight: "900", color: "#111827" },

  list: { padding: 12 },

  card: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 16,
    padding: 12,
    marginBottom: 14,
  },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  authorRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18 },

  author: { fontWeight: "800", color: "#111827" },
  time: { fontSize: 12, color: "#6B7280" },

  content: { marginTop: 10, fontSize: 15, color: "#111827" },

  media: {
    marginTop: 12,
    height: 240,
    borderRadius: 14,
    backgroundColor: "#f3f4f6",
  },

  actions: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
  },

  action: { flexDirection: "row", alignItems: "center", gap: 6 },
  actionText: { color: "#111827", fontWeight: "600" },
});
