// app/hashtag/[tag].tsx
// Shows all posts containing a specific hashtag, with skeleton loading

import { PostCardSkeleton } from "@/components/Skeleton";
import PostCard from "@/components/post/PostCard";
import { getPosts, type Post } from "@/lib/firestore/posts";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const PAGE_SIZE = 15;

export default function HashtagScreen() {
  const { tag } = useLocalSearchParams<{ tag: string }>();
  const { colors, isDark } = useTheme();

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState<{ lastDocId?: string } | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const cleanTag = tag?.trim().toLowerCase().replace(/^#/, "") ?? "";

  const fetchPage = useCallback(
    async (existingCursor: typeof cursor, append: boolean) => {
      if (!cleanTag) return;

      if (append) setLoadingMore(true);
      else setLoading(true);

      try {
        const result = await getPosts({
          limit: PAGE_SIZE,
          hashtag: cleanTag,
          sortBy: "newest",
          cursor: existingCursor,
        });

        setPosts((prev) =>
          append ? [...prev, ...result.posts] : result.posts,
        );
        setHasMore(result.hasMore);
        setCursor(result.nextCursor ?? null);
      } catch (e) {
        console.warn("HashtagScreen fetch error:", e);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [cleanTag],
  );

  useEffect(() => {
    setPosts([]);
    setCursor(null);
    setHasMore(true);
    fetchPage(null, false);
  }, [fetchPage]);

  const loadMore = () => {
    if (!loadingMore && hasMore && cursor) {
      fetchPage(cursor, true);
    }
  };

  const onBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/explore" as any);
  };

  const renderPost = ({ item }: { item: Post }) => (
    <PostCard
      id={item.id}
      title={item.title ?? undefined}
      content={item.content}
      author={{
        id: item.user_id,
        name: item.user?.full_name ?? item.user?.username ?? "User",
        username: item.user?.username ?? "",
        avatar: item.user?.avatar_url ?? undefined,
      }}
      community={
        item.community
          ? {
              id: item.community.id,
              name: item.community.name,
              slug: item.community.slug,
            }
          : undefined
      }
      timestamp={new Date(item.created_at).toLocaleDateString()}
      likes={item.like_count}
      comments={item.comment_count}
      shares={item.share_count}
      saves={0}
      isLiked={item.is_liked ?? false}
      isSaved={item.is_saved ?? false}
      media={item.media_urls}
    />
  );

  const ListHeader = () => (
    <View style={[styles.hashtagHeader, { backgroundColor: colors.card }]}>
      <View
        style={[
          styles.hashtagIconCircle,
          { backgroundColor: colors.primary + "22" },
        ]}
      >
        <Text style={[styles.hashtagSymbol, { color: colors.primary }]}>#</Text>
      </View>
      <Text style={[styles.hashtagTitle, { color: colors.text }]}>
        {cleanTag}
      </Text>
      {posts.length > 0 && !loading && (
        <Text style={[styles.hashtagCount, { color: colors.textTertiary }]}>
          {posts.length}
          {hasMore ? "+" : ""} posts
        </Text>
      )}
    </View>
  );

  const ListEmpty = () => {
    if (loading) return null;
    return (
      <View style={[styles.emptyWrap, { backgroundColor: colors.card }]}>
        <View
          style={[styles.emptyIconCircle, { backgroundColor: colors.surface }]}
        >
          <Ionicons name="pricetag-outline" size={26} color={colors.primary} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>
          No posts yet
        </Text>
        <Text style={[styles.emptySubtitle, { color: colors.textTertiary }]}>
          Be the first to post with #{cleanTag}
        </Text>
      </View>
    );
  };

  const ListFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  };

  return (
    <>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        translucent
        backgroundColor="transparent"
      />
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={["top", "left", "right"]}
      >
        {/* Top bar */}
        <View style={[styles.topBar, { backgroundColor: colors.background }]}>
          <TouchableOpacity
            onPress={onBack}
            style={[styles.backCircle, { backgroundColor: colors.card }]}
            activeOpacity={0.85}
          >
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.topBarTitle, { color: colors.text }]}>
            #{cleanTag}
          </Text>
          <View style={styles.topBarRight} />
        </View>

        {/* Skeleton while loading first page */}
        {loading ? (
          <FlatList
            data={Array(5).fill(null)}
            keyExtractor={(_, i) => `skel-${i}`}
            renderItem={() => <PostCardSkeleton />}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={<ListHeader />}
          />
        ) : (
          <FlatList
            data={posts}
            keyExtractor={(p) => p.id}
            renderItem={renderPost}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            ListHeaderComponent={<ListHeader />}
            ListEmptyComponent={<ListEmpty />}
            ListFooterComponent={<ListFooter />}
          />
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  backCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  topBarTitle: { fontSize: 18, fontWeight: "800", flex: 1 },
  topBarRight: { width: 42 },

  listContent: { paddingHorizontal: 16, paddingBottom: 32, paddingTop: 8 },

  hashtagHeader: {
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 2,
  },
  hashtagIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  hashtagSymbol: { fontSize: 28, fontWeight: "900" },
  hashtagTitle: { fontSize: 22, fontWeight: "900", marginBottom: 4 },
  hashtagCount: { fontSize: 13, fontWeight: "600" },

  emptyWrap: {
    borderRadius: 22,
    paddingVertical: 32,
    paddingHorizontal: 18,
    alignItems: "center",
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  emptyTitle: { fontSize: 16, fontWeight: "800", marginBottom: 6 },
  emptySubtitle: { fontSize: 13, lineHeight: 18, textAlign: "center" },

  footerLoader: { paddingVertical: 20, alignItems: "center" },
});
