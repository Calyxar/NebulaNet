// app/hashtag/[tag].tsx ✅
// ✅ Uses getPosts with hashtag filter — works with array-contains index
import { PostCardSkeleton } from "@/components/Skeleton";
import { getTrendingHashtags } from "@/lib/firestore/hashtags";
import { getPosts, type Post } from "@/lib/firestore/posts";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const PAGE_SIZE = 15;

const isVideoUrl = (url?: string | null) => {
  if (!url) return false;
  const clean = url.split("?")[0].toLowerCase();
  return ["mp4", "mov", "m4v", "webm", "mkv", "avi"].some((e) =>
    clean.endsWith(`.${e}`),
  );
};

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

export default function HashtagScreen() {
  const { tag } = useLocalSearchParams<{ tag: string }>();
  const { colors, isDark } = useTheme();

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState<{ lastDocId?: string } | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [postCount, setPostCount] = useState<number | null>(null);

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
        // Set post count from first page
        if (!append && !existingCursor) {
          setPostCount(result.posts.length);
        }
      } catch (e) {
        console.warn("HashtagScreen fetch error:", e);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [cleanTag],
  );

  // Also fetch actual count from hashtags collection
  useEffect(() => {
    if (!cleanTag) return;
    getTrendingHashtags(100)
      .then((tags) => {
        const found = tags.find((t) => t.tag === cleanTag);
        if (found) setPostCount(found.post_count);
      })
      .catch(() => {});
  }, [cleanTag]);

  useEffect(() => {
    setPosts([]);
    setCursor(null);
    setHasMore(true);
    fetchPage(null, false);
  }, [fetchPage]);

  const loadMore = () => {
    if (!loadingMore && hasMore && cursor) fetchPage(cursor, true);
  };

  const onBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/explore" as any);
  };

  const renderPost = ({ item }: { item: Post }) => {
    const avatar = item.user?.avatar_url;
    const name = item.user?.full_name || item.user?.username || "User";
    const username = item.user?.username || "";
    const media = item.media_urls?.[0];
    const isVideo = isVideoUrl(media);

    return (
      <TouchableOpacity
        style={[styles.postCard, { backgroundColor: colors.card }]}
        onPress={() => router.push(`/post/${item.id}` as any)}
        activeOpacity={0.88}
      >
        <View style={styles.authorRow}>
          <TouchableOpacity
            onPress={() => username && router.push(`/user/${username}` as any)}
            activeOpacity={0.85}
            style={styles.authorInner}
          >
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatar} />
            ) : (
              <View
                style={[
                  styles.avatarFallback,
                  { backgroundColor: colors.surface },
                ]}
              >
                <Text style={[styles.avatarLetter, { color: colors.primary }]}>
                  {name[0]?.toUpperCase()}
                </Text>
              </View>
            )}
            <View>
              <Text style={[styles.authorName, { color: colors.text }]}>
                {name}
              </Text>
              <Text style={[styles.authorTime, { color: colors.textTertiary }]}>
                {timeAgo(item.created_at)}
              </Text>
            </View>
          </TouchableOpacity>
          <Ionicons
            name="chevron-forward"
            size={18}
            color={colors.textTertiary}
          />
        </View>

        {!!item.content && (
          <Text
            style={[styles.content, { color: colors.text }]}
            numberOfLines={4}
          >
            {item.content}
          </Text>
        )}

        {!!media && (
          <View style={[styles.mediaWrap, { backgroundColor: colors.surface }]}>
            <Image
              source={{ uri: media }}
              style={styles.media}
              resizeMode="cover"
            />
            {isVideo && (
              <View style={styles.videoOverlay}>
                <Ionicons name="play-circle" size={36} color="#fff" />
              </View>
            )}
          </View>
        )}

        <View style={[styles.statsRow, { borderTopColor: colors.border }]}>
          <View style={styles.stat}>
            <Ionicons
              name={item.is_liked ? "heart" : "heart-outline"}
              size={16}
              color={item.is_liked ? "#FF375F" : colors.textTertiary}
            />
            <Text
              style={[
                styles.statText,
                { color: item.is_liked ? "#FF375F" : colors.textTertiary },
              ]}
            >
              {item.like_count ?? 0}
            </Text>
          </View>
          <View style={styles.stat}>
            <Ionicons
              name="chatbubble-outline"
              size={16}
              color={colors.textTertiary}
            />
            <Text style={[styles.statText, { color: colors.textTertiary }]}>
              {item.comment_count ?? 0}
            </Text>
          </View>
          <View style={styles.stat}>
            <Ionicons
              name="repeat-outline"
              size={16}
              color={colors.textTertiary}
            />
            <Text style={[styles.statText, { color: colors.textTertiary }]}>
              {(item as any).repost_count ?? 0}
            </Text>
          </View>
          <Text style={[styles.tapHint, { color: colors.textTertiary }]}>
            Tap to interact →
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

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
      {postCount !== null && !loading && (
        <Text style={[styles.hashtagCount, { color: colors.textTertiary }]}>
          {postCount.toLocaleString()}
          {hasMore ? "+" : ""} posts
        </Text>
      )}
      {/* ✅ Search this hashtag button */}
      <TouchableOpacity
        style={[
          styles.searchHashtagBtn,
          {
            backgroundColor: colors.primary + "18",
            borderColor: colors.primary + "40",
          },
        ]}
        onPress={() =>
          router.push({
            pathname: "/(tabs)/explore",
            params: { q: `#${cleanTag}` },
          } as any)
        }
        activeOpacity={0.85}
      >
        <Ionicons name="search-outline" size={14} color={colors.primary} />
        <Text style={[styles.searchHashtagText, { color: colors.primary }]}>
          Search #{cleanTag}
        </Text>
      </TouchableOpacity>
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
            ListFooterComponent={
              loadingMore ? (
                <View style={styles.footerLoader}>
                  <ActivityIndicator size="small" color={colors.primary} />
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
  hashtagCount: { fontSize: 13, fontWeight: "600", marginBottom: 10 },
  searchHashtagBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    marginTop: 4,
  },
  searchHashtagText: { fontSize: 13, fontWeight: "700" },
  postCard: {
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  authorInner: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  avatar: { width: 38, height: 38, borderRadius: 19 },
  avatarFallback: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: { fontSize: 15, fontWeight: "900" },
  authorName: { fontSize: 14, fontWeight: "800" },
  authorTime: { fontSize: 12, marginTop: 1 },
  content: { fontSize: 14, lineHeight: 20, marginBottom: 10 },
  mediaWrap: {
    width: "100%",
    height: 200,
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 10,
    position: "relative",
  },
  media: { width: "100%", height: "100%" },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 10,
    borderTopWidth: 1,
    gap: 14,
  },
  stat: { flexDirection: "row", alignItems: "center", gap: 5 },
  statText: { fontSize: 13, fontWeight: "700" },
  tapHint: { marginLeft: "auto", fontSize: 11, fontWeight: "600" },
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
