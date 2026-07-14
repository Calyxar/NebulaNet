// app/(tabs)/home.tsx ✅
// ✅ Twitter-style collapsible header: logo/bell scrolls away (pinned tab
//    bar below it). Stories now live INSIDE the For You feed's list header
//    instead of the sticky Tabs.Container header — they scroll away with
//    the first post instead of permanently reserving space above the tabs.
// ✅ Tabs are swipeable between feeds (react-native-collapsible-tab-view).
// ✅ Each tab is its own lazily-mounted feed list — no more nested scroll
//    conflicts from the old single-FlatList-with-giant-header approach.
// ✅ ALL ads removed (banner ads in feed + interstitial on post open).
// ✅ Quote repost cards, reposted-by-you label, polls, NSFW filter,
//    feed density, announcement card (For You only) all preserved.

import AnnouncementCard from "@/components/feed/AnnouncementCard";
import VideoPlayer from "@/components/media/VideoPlayer";
import MentionHashtagText from "@/components/MentionHashtagText";
import AppHeader from "@/components/navigation/AppHeader";
import { getTabBarHeight } from "@/components/navigation/CurvedTabBar";
import PollCard from "@/components/post/PollCard";
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
  Alert,
  FlatList,
  Image,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
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

const isVideoUrl = (url?: string | null) => {
  if (!url) return false;
  const clean = url.split("?")[0].toLowerCase();
  return ["mp4", "mov", "m4v", "webm", "mkv", "avi"].some((e) =>
    clean.endsWith(`.${e}`),
  );
};

const isVideoPost = (post: any) => {
  if (post?.post_type === "video") return true;
  if (post?.post_type === "mixed") return true;
  return isVideoUrl(post?.media_urls?.[0]);
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

function QuotedPostCard({
  quotedPost,
  colors,
}: {
  quotedPost: any;
  colors: any;
}) {
  const author =
    quotedPost?.user?.full_name || quotedPost?.user?.username || "User";
  return (
    <TouchableOpacity
      style={[
        styles.quotedCard,
        { borderColor: colors.border, backgroundColor: colors.surface },
      ]}
      onPress={() =>
        quotedPost?.id && router.push(`/post/${quotedPost.id}` as any)
      }
      activeOpacity={0.85}
    >
      <View style={styles.quotedHeader}>
        {quotedPost?.user?.avatar_url ? (
          <Image
            source={{ uri: quotedPost.user.avatar_url }}
            style={styles.quotedAvatar}
          />
        ) : (
          <View
            style={[
              styles.quotedAvatarFallback,
              { backgroundColor: colors.primary + "30" },
            ]}
          >
            <Text
              style={[styles.quotedAvatarLetter, { color: colors.primary }]}
            >
              {(author[0] || "U").toUpperCase()}
            </Text>
          </View>
        )}
        <Text
          style={[styles.quotedAuthor, { color: colors.text }]}
          numberOfLines={1}
        >
          {author}
        </Text>
        {quotedPost?.user?.username && (
          <Text
            style={[styles.quotedHandle, { color: colors.textTertiary }]}
            numberOfLines={1}
          >
            @{quotedPost.user.username}
          </Text>
        )}
      </View>
      {!!quotedPost?.content && (
        <Text
          style={[styles.quotedContent, { color: colors.textSecondary }]}
          numberOfLines={3}
        >
          {quotedPost.content}
        </Text>
      )}
      {quotedPost?.media_urls?.[0] && (
        <Image
          source={{ uri: quotedPost.media_urls[0] }}
          style={styles.quotedMedia}
          resizeMode="cover"
        />
      )}
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Post card — extracted so all three tab feeds share one renderer.
// ─────────────────────────────────────────────────────────────────────────────

function PostCard({
  post,
  colors,
  isDark,
  feedDensity,
  mediaHeight,
  onLike,
  onSave,
  onRepost,
}: {
  post: Post;
  colors: any;
  isDark: boolean;
  feedDensity: string;
  mediaHeight: number;
  onLike: (id: string) => void;
  onSave: (id: string) => void;
  onRepost: (id: string) => void;
}) {
  const isRepost = !!(post as any).is_repost;
  const isQuote = !!(post as any).quote_post_id;
  const quotedPost = (post as any).quote_post;
  const author = post.user?.full_name || post.user?.username || "User";
  const avatar = post.user?.avatar_url;
  const media = post.media_urls?.[0];
  const video = isVideoPost(post);
  const isPoll = post.post_type === "poll" && !!(post as any).poll;
  const liked = !!post.is_liked;
  const saved = !!post.is_saved;
  const likeColor = liked ? "#FF375F" : colors.text;
  const saveColor = saved ? colors.primary : colors.text;
  const repostCount = (post as any).repost_count ?? 0;
  const reposted = !!(post as any).is_reposted;
  const repostColor = reposted ? "#00BA7C" : colors.text;
  const padding =
    feedDensity === "compact" ? 10 : feedDensity === "relaxed" ? 20 : 14;
  const mb =
    feedDensity === "compact" ? 6 : feedDensity === "relaxed" ? 18 : 12;

  // ✅ Ads removed: opening a post no longer triggers an interstitial.
  const openPost = (postId: string) => router.push(`/post/${postId}` as any);

  return (
    <TouchableOpacity
      activeOpacity={isPoll ? 1 : 0.92}
      onPress={() => !isPoll && openPost(post.id)}
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          shadowOpacity: isDark ? 0.22 : 0.05,
          padding,
          marginBottom: mb,
        },
      ]}
    >
      {isRepost && (
        <View style={styles.repostLabel}>
          <Repeat2 size={13} color={colors.textTertiary} strokeWidth={2.5} />
          <Text
            style={[styles.repostLabelText, { color: colors.textTertiary }]}
          >
            You reposted
          </Text>
        </View>
      )}

      <View style={styles.cardTop}>
        <TouchableOpacity
          style={styles.authorRow}
          onPress={() =>
            post.user_id && router.push(`/user/${post.user_id}` as any)
          }
          activeOpacity={0.85}
        >
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
              {timeAgo(post.created_at)}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={(e) => {
            e.stopPropagation?.();
            Alert.alert("Post Options", undefined, [
              { text: "View Post", onPress: () => openPost(post.id) },
              { text: "Cancel", style: "cancel" },
            ]);
          }}
        >
          <MoreVertical size={20} color={colors.textTertiary} />
        </TouchableOpacity>
      </View>

      {isPoll ? (
        <>
          {!!post.title && (
            <Text
              style={[styles.pollQuestion, { color: colors.text }]}
              numberOfLines={3}
            >
              {post.title}
            </Text>
          )}
          <PollCard
            postId={post.id}
            poll={(post as any).poll}
            accentColor={colors.primary}
            textColor={colors.text}
            subColor={colors.textTertiary}
            cardBg={colors.surface}
            borderColor={colors.border}
          />
        </>
      ) : (
        <>
          {!!post.content && (
            <MentionHashtagText
              content={post.content}
              style={[styles.content, { color: colors.text }]}
              numberOfLines={6}
              hashtagColor={colors.primary}
              onPress={() => openPost(post.id)}
            />
          )}

          {isQuote && quotedPost && (
            <QuotedPostCard quotedPost={quotedPost} colors={colors} />
          )}

          {!!media &&
            !isQuote &&
            (video ? (
              <VideoPlayer
                uri={media}
                style={{
                  height: mediaHeight,
                  borderRadius: 18,
                  marginBottom: 12,
                }}
              />
            ) : (
              <View
                style={[
                  styles.mediaWrap,
                  { height: mediaHeight, backgroundColor: colors.surface },
                ]}
              >
                <Image
                  source={{ uri: media }}
                  style={styles.media}
                  resizeMode="cover"
                />
              </View>
            ))}
        </>
      )}

      <View style={[styles.actions, { borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={(e) => {
            e.stopPropagation?.();
            onLike(post.id);
          }}
          activeOpacity={0.7}
        >
          <Heart
            size={20}
            color={likeColor}
            fill={liked ? "#FF375F" : "none"}
            strokeWidth={2.5}
          />
          <Text style={[styles.actionText, { color: likeColor }]}>
            {post.like_count ?? 0}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={(e) => {
            e.stopPropagation?.();
            openPost(post.id);
          }}
          activeOpacity={0.7}
        >
          <MessageCircle size={20} color={colors.text} strokeWidth={2.5} />
          <Text style={[styles.actionText, { color: colors.text }]}>
            {post.comment_count ?? 0}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={(e) => {
            e.stopPropagation?.();
            Alert.alert(reposted ? "Undo Repost?" : "Repost", undefined, [
              {
                text: reposted ? "Undo Repost" : "Repost",
                style: reposted ? "destructive" : "default",
                onPress: () => onRepost(post.id),
              },
              {
                text: "Quote",
                onPress: () =>
                  router.push(`/create/quote?postId=${post.id}` as any),
              },
              { text: "Cancel", style: "cancel" },
            ]);
          }}
          activeOpacity={0.7}
        >
          <Repeat2 size={20} color={repostColor} strokeWidth={2.5} />
          <Text style={[styles.actionText, { color: repostColor }]}>
            {repostCount}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={(e) => {
            e.stopPropagation?.();
            openPost(post.id);
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="share-outline" size={20} color={colors.text} />
          <Text style={[styles.actionText, { color: colors.text }]}>
            {post.share_count ?? 0}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={(e) => {
            e.stopPropagation?.();
            onSave(post.id);
          }}
          activeOpacity={0.7}
        >
          <Bookmark
            size={20}
            color={saveColor}
            fill={saved ? colors.primary : "none"}
            strokeWidth={2.5}
          />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Stories row — used to live in the sticky Tabs.Container header (renderHeader
// below). Moved here so it can be rendered as the top of the For You tab's
// ListHeaderComponent instead: it now scrolls away with the feed on the very
// first swipe, rather than permanently reserving ~90px above the tab bar on
// every tab. Only the For You tab passes this in (see storiesElement prop
// on FeedList below) — matches Twitter/Bluesky, which don't repeat a stories
// shelf across every tab.
// ─────────────────────────────────────────────────────────────────────────────

function StoriesRow({ stories, colors }: { stories: any[]; colors: any }) {
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
                style={styles.storyItem}
                onPress={() => router.push("/create/story")}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.addStoryCircle,
                    {
                      borderColor: colors.primary,
                      backgroundColor: colors.card,
                    },
                  ]}
                >
                  <Ionicons name="add" size={24} color={colors.primary} />
                </View>
                <Text style={[styles.storyLabel, { color: colors.text }]}>
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

// ─────────────────────────────────────────────────────────────────────────────
// One feed list per tab. Each mounts lazily and owns its own query,
// pagination, refresh, and skeletons. Uses Tabs.FlatList so scrolling
// drives the collapsible header.
// ─────────────────────────────────────────────────────────────────────────────

function FeedList({
  tab,
  communityIds,
  showNSFW,
  ListHeaderComponent,
  storiesElement,
  emptyTitle,
  emptySubtitle,
}: {
  tab: FeedTab;
  communityIds: string[];
  showNSFW: boolean;
  ListHeaderComponent?: React.ReactElement | null;
  storiesElement?: React.ReactElement | null;
  emptyTitle: string;
  emptySubtitle: string;
}) {
  const { colors, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const feedDensity = useFeedDensity();

  const mediaHeight = useMemo(
    () => Math.round(Math.min(420, Math.max(200, width * 0.62))),
    [width],
  );
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

  const {
    onLike,
    onSave,
    onRepost,
    viewabilityConfig,
    onViewableItemsChanged,
  } = useFeedInteractions();

  const renderItem = useCallback(
    ({ item }: { item: Post }) => (
      <PostCard
        post={item}
        colors={colors}
        isDark={isDark}
        feedDensity={feedDensity}
        mediaHeight={mediaHeight}
        onLike={onLike}
        onSave={onSave}
        onRepost={onRepost}
      />
    ),
    [colors, isDark, feedDensity, mediaHeight, onLike, onSave, onRepost],
  );

  return (
    <Tabs.FlatList
      data={filteredPosts}
      keyExtractor={(item: Post) => item.id}
      renderItem={renderItem}
      ListHeaderComponent={
        <>
          {storiesElement}
          {ListHeaderComponent}
        </>
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
      contentContainerStyle={{ paddingTop: 12, paddingBottom: bottomPad }}
      showsVerticalScrollIndicator={false}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Communities tab header: search box + horizontal community pills.
// Lives INSIDE the Communities tab list (not the global header) so it
// only appears on that tab, exactly like before.
// ─────────────────────────────────────────────────────────────────────────────

function CommunityPanel({
  communitySearch,
  setCommunitySearch,
  filteredCommunities,
  colors,
  isDark,
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
          },
        ]}
      >
        <Ionicons name="search" size={18} color={colors.textTertiary} />
        <TextInput
          value={communitySearch}
          onChangeText={setCommunitySearch}
          placeholder="Search your communities..."
          placeholderTextColor={colors.textTertiary}
          style={[styles.communitySearchInput, { color: colors.text }]}
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
              style={styles.communityPill}
              onPress={() => router.push(`/community/${item.slug}` as any)}
              activeOpacity={0.85}
            >
              {item.image_url ? (
                <Image
                  source={{ uri: item.image_url }}
                  style={styles.communityAvatar}
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
                style={[styles.communityName, { color: colors.text }]}
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

// ─────────────────────────────────────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { colors, isDark } = useTheme();
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

  // Collapsible header: logo row only now — stories moved into the For You
  // tab's ListHeaderComponent (see StoriesRow above) so they scroll away
  // with the feed instead of permanently sitting above the pinned tab bar.
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

  // Pinned tab bar — Twitter-style even-width tabs with sliding underline.
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
        allowHeaderOverscroll
      >
        <Tabs.Tab name="For You">
          <FeedList
            tab="for-you"
            communityIds={myCommunityIds}
            showNSFW={showNSFW}
            storiesElement={<StoriesRow stories={stories} colors={colors} />}
            ListHeaderComponent={<AnnouncementCard />}
            emptyTitle="Nothing here yet"
            emptySubtitle="Posts from across NebulaNet will appear here."
          />
        </Tabs.Tab>
        <Tabs.Tab name="Following">
          <FeedList
            tab="following"
            communityIds={myCommunityIds}
            showNSFW={showNSFW}
            emptyTitle="No posts from people you follow"
            emptySubtitle="Follow more people to fill this feed with their posts."
          />
        </Tabs.Tab>
        <Tabs.Tab name="Communities">
          <FeedList
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
  brandName: {
    fontSize: 19,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
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
  repostLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 6,
  },
  repostLabelText: { fontSize: 12, fontWeight: "600" },
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
  pollQuestion: {
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 22,
    marginBottom: 4,
  },
  content: { fontSize: 14, lineHeight: 20, marginBottom: 10 },
  quotedCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginTop: 8,
    marginBottom: 10,
    gap: 6,
  },
  quotedHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  quotedAvatar: { width: 18, height: 18, borderRadius: 9 },
  quotedAvatarFallback: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  quotedAvatarLetter: { fontSize: 9, fontWeight: "900" },
  quotedAuthor: { fontSize: 13, fontWeight: "700", flexShrink: 1 },
  quotedHandle: { fontSize: 12, flexShrink: 1 },
  quotedContent: { fontSize: 13, lineHeight: 18 },
  quotedMedia: { width: "100%", height: 120, borderRadius: 10, marginTop: 4 },
  mediaWrap: {
    width: "100%",
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 12,
    position: "relative",
  },
  media: { width: "100%", height: "100%" },
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
