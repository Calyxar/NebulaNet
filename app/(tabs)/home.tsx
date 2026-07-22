// app/(tabs)/home.tsx ✅
// ✅ NEW: isBoosted/boostedUntil now passed through to PostCard from the
// post data, same (item as any).<field> pattern already used for
// repost_count/is_reposted/etc. Closes the last gap in the boost feature —
// without this, PostCard's boost badge and "Boosted" menu state never
// reflected real data even though is_boosted/boosted_until exist on the
// post doc.

import AnnouncementCard from "@/components/feed/AnnouncementCard";
import AppHeader from "@/components/navigation/AppHeader";
import { getTabBarHeight } from "@/components/navigation/CurvedTabBar";
import PostCard from "@/components/post/PostCard";
import StoryAvatar from "@/components/StoryAvatar";
import { useAuth } from "@/hooks/useAuth";
import { useCommunities } from "@/hooks/useCommunities";
import type { Post } from "@/hooks/useFeed";
import { useFeedInteractions } from "@/hooks/useFeedInteractions";
import {
  useCurrentUserProfileSync,
  useFeedDensity,
  useInfiniteFeedPosts,
} from "@/hooks/usePosts";
import { useActiveStories } from "@/hooks/useStories";
import { useUnreadNotificationsCount } from "@/hooks/useUnreadNotificationsCount";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import firestore from "@react-native-firebase/firestore";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Bell } from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialTabBar, Tabs } from "react-native-collapsible-tab-view";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

type FeedTab = "for-you" | "following" | "my-community";

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const hasNSFWContent = (post: Post): boolean => {
  const combined =
    `${post.content || ""} ${(post as any).title || ""}`.toLowerCase();
  return ["#nsfw", "#spoiler", "# nsfw", "# spoiler"].some((k) =>
    combined.includes(k),
  );
};

function SkeletonBox({ style }: { style: any }) {
  const opacity = useSharedValue(0.3);
  React.useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 800 }),
        withTiming(0.3, { duration: 800 }),
      ),
      -1,
      false,
    );
  }, []);
  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      style={[
        { backgroundColor: "#E5E7EB", borderRadius: 8 },
        style,
        animatedStyle,
      ]}
    />
  );
}

function SkeletonPost({ colors, isDark, feedDensity }: any) {
  const padding =
    feedDensity === "compact" ? 10 : feedDensity === "relaxed" ? 20 : 14;
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          shadowOpacity: isDark ? 0.22 : 0.05,
          padding,
          marginBottom:
            feedDensity === "compact" ? 6 : feedDensity === "relaxed" ? 18 : 12,
        },
      ]}
    >
      <View style={styles.cardTop}>
        <View style={styles.authorRow}>
          <SkeletonBox style={{ width: 40, height: 40, borderRadius: 20 }} />
          <View style={{ flex: 1 }}>
            <SkeletonBox
              style={{ width: "40%", height: 12, marginBottom: 6 }}
            />
            <SkeletonBox style={{ width: "25%", height: 10 }} />
          </View>
        </View>
      </View>
      <SkeletonBox style={{ width: "90%", height: 14, marginBottom: 8 }} />
      <SkeletonBox style={{ width: "75%", height: 14, marginBottom: 12 }} />
      <SkeletonBox style={{ width: "100%", height: 200, borderRadius: 18 }} />
    </View>
  );
}

function FeedList({
  tab,
  communityIds,
  showNSFW,
  ListHeaderComponent,
  storiesElement,
  emptyTitle,
  emptySubtitle,
  uiScale,
  fontScale,
}: {
  tab: FeedTab;
  communityIds: string[];
  showNSFW: boolean;
  ListHeaderComponent?: React.ReactElement | null;
  storiesElement?: React.ReactElement | null;
  emptyTitle: string;
  emptySubtitle: string;
  uiScale: number;
  fontScale: number;
}) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const feedDensity = useFeedDensity();

  const bottomPad = useMemo(
    () => getTabBarHeight(insets.bottom) + 12,
    [insets.bottom],
  );

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    isRefetching,
    isLoading,
  } = useInfiniteFeedPosts(tab, { communityIds });

  const posts = useMemo(
    () => data?.pages.flatMap((p) => p.posts) ?? [],
    [data],
  );
  const filteredPosts = useMemo(
    () => (showNSFW ? posts : posts.filter((post) => !hasNSFWContent(post))),
    [posts, showNSFW],
  );

  const { onLike, onSave, viewabilityConfig, onViewableItemsChanged } =
    useFeedInteractions();

  const renderItem = useCallback(
    ({ item }: { item: Post }) => {
      const isQuote = !!(item as any).quote_post_id;
      return (
        <View style={{ marginHorizontal: 14 * uiScale }}>
          <PostCard
            id={item.id}
            title={(item as any).title}
            content={item.content}
            post_type={item.post_type ?? undefined}
            poll={(item as any).poll}
            author={{
              id: item.user_id,
              name: item.user?.full_name || item.user?.username || "User",
              username: item.user?.username || "",
              avatar: item.user?.avatar_url ?? undefined,
            }}
            timestamp={timeAgo(item.created_at)}
            likes={item.like_count ?? 0}
            comments={item.comment_count ?? 0}
            shares={item.share_count ?? 0}
            reposts={(item as any).repost_count ?? 0}
            saves={(item as any).save_count ?? 0}
            isLiked={!!item.is_liked}
            isSaved={!!item.is_saved}
            isReposted={!!(item as any).is_reposted}
            isRepostByMe={!!(item as any).is_repost}
            quotedPost={isQuote ? (item as any).quote_post : undefined}
            media={item.media_urls}
            isBoosted={!!(item as any).is_boosted}
            boostedUntil={(item as any).boosted_until ?? null}
            onLikePress={() => onLike(item.id)}
            onSavePress={() => onSave(item.id)}
          />
        </View>
      );
    },
    [onLike, onSave, uiScale],
  );

  return (
    <Tabs.FlatList
      data={filteredPosts}
      keyExtractor={(item: Post) => item.id}
      renderItem={renderItem}
      ListHeaderComponent={
        <View>
          {storiesElement}
          {ListHeaderComponent}
        </View>
      }
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
      ListEmptyComponent={
        isLoading ? (
          <View style={{ paddingTop: 8 }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonPost
                key={i}
                colors={colors}
                isDark={isDark}
                feedDensity={feedDensity}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyFeed}>
            <Ionicons
              name="planet-outline"
              size={34}
              color={colors.textTertiary}
            />
            <Text style={[styles.emptyFeedTitle, { color: colors.text }]}>
              {emptyTitle}
            </Text>
            <Text
              style={[styles.emptyFeedSubtitle, { color: colors.textTertiary }]}
            >
              {emptySubtitle}
            </Text>
          </View>
        )
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
      contentContainerStyle={{
        paddingTop: 24 * uiScale,
        paddingBottom: bottomPad,
      }}
      showsVerticalScrollIndicator={false}
    />
  );
}

function StoriesRow({
  stories,
  colors,
  uiScale,
  fontScale,
}: {
  stories: any[];
  colors: any;
  uiScale: number;
  fontScale: number;
}) {
  return (
    <View style={styles.storiesWrap}>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={[{ id: "add" }, ...(stories ?? [])] as any[]}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingRight: 16 }}
        renderItem={({ item }) => {
          if (item.id === "add") {
            return (
              <TouchableOpacity
                style={[
                  styles.storyItem,
                  { marginRight: 14 * uiScale, width: 64 * uiScale },
                ]}
                onPress={() => router.push("/create/story")}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.addStoryCircle,
                    {
                      borderColor: colors.primary,
                      backgroundColor: colors.card,
                      width: 56 * uiScale,
                      height: 56 * uiScale,
                      borderRadius: 28 * uiScale,
                    },
                  ]}
                >
                  <Ionicons name="add" size={24} color={colors.primary} />
                </View>
                <Text
                  style={[
                    styles.storyLabel,
                    {
                      color: colors.text,
                      fontSize: 11 * fontScale,
                      marginTop: 2 * uiScale,
                    },
                  ]}
                >
                  Add Story
                </Text>
              </TouchableOpacity>
            );
          }
          const p = item.profiles;
          const label = p?.username || p?.full_name || "User";
          return (
            <View style={styles.storyItem}>
              <StoryAvatar
                userId={item.user_id}
                avatarUrl={p?.avatar_url}
                name={label}
                size={52}
                onPress={() => router.push(`/story/${item.id}` as any)}
              />
              <Text
                style={[styles.storyLabel, { color: colors.text }]}
                numberOfLines={1}
              >
                {label}
              </Text>
            </View>
          );
        }}
      />
    </View>
  );
}

function CommunityPanel({
  communitySearch,
  setCommunitySearch,
  filteredCommunities,
  colors,
  isDark,
  uiScale,
  fontScale,
}: any) {
  return (
    <View style={styles.myCommunityPanel}>
      <View
        style={[
          styles.communitySearchWrap,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            shadowOpacity: isDark ? 0.22 : 0.06,
            marginHorizontal: 14 * uiScale,
            marginBottom: 10 * uiScale,
            borderRadius: 22 * uiScale,
            paddingHorizontal: 14 * uiScale,
            height: 44 * uiScale,
            gap: 10 * uiScale,
          },
        ]}
      >
        <Ionicons name="search" size={18} color={colors.textTertiary} />
        <TextInput
          value={communitySearch}
          onChangeText={setCommunitySearch}
          placeholder="Search your communities..."
          placeholderTextColor={colors.textTertiary}
          style={[
            styles.communitySearchInput,
            { color: colors.text, fontSize: 14.5 * fontScale },
          ]}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
        />
        {!!communitySearch.trim() && (
          <TouchableOpacity
            onPress={() => setCommunitySearch("")}
            activeOpacity={0.85}
            style={[styles.clearBtnSmall, { backgroundColor: colors.surface }]}
          >
            <Ionicons name="close" size={16} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>
      {filteredCommunities.length > 0 ? (
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={filteredCommunities}
          keyExtractor={(c: any) => c.id}
          contentContainerStyle={{ paddingRight: 16, paddingLeft: 16 }}
          renderItem={({ item }: any) => (
            <TouchableOpacity
              style={[
                styles.communityPill,
                { width: 86 * uiScale, marginRight: 12 * uiScale },
              ]}
              onPress={() => router.push(`/community/${item.slug}` as any)}
              activeOpacity={0.85}
            >
              {item.image_url ? (
                <Image
                  source={{ uri: item.image_url }}
                  style={[
                    styles.communityAvatar,
                    {
                      width: 46 * uiScale,
                      height: 46 * uiScale,
                      borderRadius: 23 * uiScale,
                      marginBottom: 6 * uiScale,
                    },
                  ]}
                />
              ) : (
                <View
                  style={[
                    styles.communityAvatar,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text style={{ color: colors.primary, fontWeight: "900" }}>
                    {(item.name?.[0] ?? "?").toUpperCase()}
                  </Text>
                </View>
              )}
              <Text
                style={[
                  styles.communityName,
                  {
                    color: colors.text,
                    fontSize: 12 * fontScale,
                    maxWidth: 86 * uiScale,
                  },
                ]}
                numberOfLines={1}
              >
                {item.name}
              </Text>
            </TouchableOpacity>
          )}
        />
      ) : (
        <View
          style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 2 }}
        >
          <Text style={{ color: colors.textTertiary, fontWeight: "800" }}>
            {communitySearch.trim()
              ? `No communities match "${communitySearch.trim()}".`
              : "You haven't joined any communities yet."}
          </Text>
        </View>
      )}
    </View>
  );
}

export default function HomeScreen() {
  const { colors, isDark, uiScale, fontScale } = useTheme();
  const { user } = useAuth();

  useCurrentUserProfileSync();
  const unreadCount = useUnreadNotificationsCount();

  const [communitySearch, setCommunitySearch] = useState("");

  const { data: storiesRaw } = useActiveStories();
  const { myCommunities, myCommunityIds } = useCommunities();

  const { data: userPrefs } = useQuery({
    queryKey: ["user-preferences", user?.uid],
    enabled: !!user?.uid,
    queryFn: async () => {
      if (!user?.uid) return null;
      const doc = await firestore()
        .collection("user_preferences")
        .doc(user.uid)
        .get();
      return doc.exists() ? (doc.data() as any) : null;
    },
  });

  const showNSFW = userPrefs?.show_nsfw ?? false;

  const stories = useMemo(() => {
    const list = storiesRaw ?? [];
    const map = new Map<string, any>();
    for (const s of list) {
      const uid = s.user_id;
      const existing = map.get(uid);
      if (!existing) map.set(uid, s);
      else if (
        new Date(s.created_at).getTime() >
        new Date(existing.created_at).getTime()
      )
        map.set(uid, s);
    }
    return Array.from(map.values()).sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }, [storiesRaw]);

  const filteredCommunities = useMemo(() => {
    const q = communitySearch.trim().toLowerCase();
    const named = myCommunities.filter((c) => !!c.name?.trim());
    if (!q) return named;
    return named.filter((c) => (c.name ?? "").toLowerCase().includes(q));
  }, [communitySearch, myCommunities]);

  const renderHeader = useCallback(
    () => (
      <View
        style={{ backgroundColor: colors.background }}
        pointerEvents="box-none"
      >
        <AppHeader
          compact
          backgroundColor={colors.background}
          leftWide={
            <View style={styles.brandRow}>
              <Image
                source={require("@/assets/images/icon.png")}
                style={styles.brandLogo}
              />
              <Text style={[styles.brandName, { color: colors.text }]}>
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
                    styles.bellBadge,
                    {
                      backgroundColor: colors.primary,
                      borderColor: colors.surface,
                    },
                  ]}
                >
                  <Text style={styles.bellBadgeText}>
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          }
        />
      </View>
    ),
    [colors, unreadCount],
  );

  const renderTabBar = useCallback(
    (props: any) => (
      <MaterialTabBar
        {...props}
        scrollEnabled={false}
        activeColor={colors.text}
        inactiveColor={colors.textTertiary}
        indicatorStyle={{
          backgroundColor: colors.primary,
          height: 3,
          borderRadius: 2,
        }}
        labelStyle={{
          fontSize: 13,
          fontWeight: "800",
          textTransform: "none",
        }}
        style={{
          backgroundColor: colors.background,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          shadowOpacity: 0,
          elevation: 0,
        }}
      />
    ),
    [colors],
  );

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={["top", "left", "right"]}
    >
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <Tabs.Container
        renderHeader={renderHeader}
        renderTabBar={renderTabBar}
        headerContainerStyle={{
          backgroundColor: colors.background,
          shadowOpacity: 0,
          elevation: 0,
        }}
        containerStyle={{ backgroundColor: colors.background }}
        lazy
      >
        <Tabs.Tab name="For You">
          <FeedList
            uiScale={uiScale}
            fontScale={fontScale}
            tab="for-you"
            communityIds={myCommunityIds}
            showNSFW={showNSFW}
            storiesElement={
              <StoriesRow
                stories={stories}
                colors={colors}
                uiScale={uiScale}
                fontScale={fontScale}
              />
            }
            ListHeaderComponent={<AnnouncementCard />}
            emptyTitle="Nothing here yet"
            emptySubtitle="Posts from across NebulaNet will appear here."
          />
        </Tabs.Tab>
        <Tabs.Tab name="Following">
          <FeedList
            uiScale={uiScale}
            fontScale={fontScale}
            tab="following"
            communityIds={myCommunityIds}
            showNSFW={showNSFW}
            emptyTitle="No posts from people you follow"
            emptySubtitle="Follow more people to fill this feed with their posts."
          />
        </Tabs.Tab>
        <Tabs.Tab name="Communities">
          <FeedList
            uiScale={uiScale}
            fontScale={fontScale}
            tab="my-community"
            communityIds={myCommunityIds}
            showNSFW={showNSFW}
            ListHeaderComponent={
              <CommunityPanel
                communitySearch={communitySearch}
                setCommunitySearch={setCommunitySearch}
                filteredCommunities={filteredCommunities}
                colors={colors}
                isDark={isDark}
                uiScale={uiScale}
                fontScale={fontScale}
              />
            }
            emptyTitle="No community posts yet"
            emptySubtitle="Join communities to see their posts here."
          />
        </Tabs.Tab>
      </Tabs.Container>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexShrink: 1,
  },
  brandLogo: { width: 32, height: 32, borderRadius: 9 },
  brandName: { fontSize: 19, fontWeight: "900", letterSpacing: -0.5 },
  bellWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    borderWidth: 1,
  },
  bellBadge: {
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
  bellBadgeText: { color: "#fff", fontSize: 10, fontWeight: "900" },
  storiesWrap: { paddingLeft: 16, paddingTop: 6, paddingBottom: 8 },
  storyItem: { alignItems: "center", marginRight: 14, width: 64 },
  addStoryCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  storyLabel: {
    fontSize: 11,
    fontWeight: "700",
    maxWidth: 64,
    textAlign: "center",
    marginTop: 2,
  },
  myCommunityPanel: { paddingBottom: 10, paddingTop: 2 },
  communitySearchWrap: {
    marginHorizontal: 14,
    marginBottom: 10,
    borderRadius: 22,
    paddingHorizontal: 14,
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 14,
    elevation: 2,
  },
  communitySearchInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 14.5,
    fontWeight: "700",
  },
  clearBtnSmall: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  communityPill: { alignItems: "center", marginRight: 12, width: 86 },
  communityAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    marginBottom: 6,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  communityName: {
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
    maxWidth: 86,
  },
  emptyFeed: {
    alignItems: "center",
    paddingHorizontal: 32,
    paddingTop: 48,
    gap: 8,
  },
  emptyFeedTitle: { fontSize: 16, fontWeight: "900", textAlign: "center" },
  emptyFeedSubtitle: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 18,
  },
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
});
