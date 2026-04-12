// app/(tabs)/home.tsx — UPDATED ✅
// ✅ FIXED: Added skeleton loading states
// ✅ FIXED: Added NSFW/spoiler content filtering based on user preferences
// ✅ FIXED: Heart turns red when liked, Bookmark turns colored when saved

import AppHeader from "@/components/navigation/AppHeader";
import { getTabBarHeight } from "@/components/navigation/CurvedTabBar";
import PollCard from "@/components/post/PollCard";
import StoryAvatar from "@/components/StoryAvatar";
import { BANNER_AD_UNIT_ID, useInterstitialAd } from "@/hooks/useAdMob";
import { useAuth } from "@/hooks/useAuth";
import { useCommunities } from "@/hooks/useCommunities";
import { useFeedInteractions } from "@/hooks/useFeedInteractions";
import { useFeedDensity, useInfiniteFeedPosts } from "@/hooks/usePosts";
import { useActiveStories } from "@/hooks/useStories";
import { useUnreadNotificationsCount } from "@/hooks/useUnreadNotificationsCount";
import type { Post } from "@/lib/firestore/posts";
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
import { BannerAd, BannerAdSize } from "react-native-google-mobile-ads";
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

const AD_EVERY_N_POSTS = 5;

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
  return isVideoUrl(post?.media_urls?.[0]);
};

// ✅ NEW: Check if post contains NSFW/spoiler hashtags
const hasNSFWContent = (post: Post): boolean => {
  const content = (post.content || "").toLowerCase();
  const title = (post.title || "").toLowerCase();
  const combined = `${content} ${title}`;
  return (
    combined.includes("#nsfw") ||
    combined.includes("#spoiler") ||
    combined.includes("# nsfw") ||
    combined.includes("# spoiler")
  );
};

// ✅ NEW: Animated skeleton component
function SkeletonBox({ style }: { style: any }) {
  const opacity = useSharedValue(0.3);

  React.useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 800 }),
        withTiming(0.3, { duration: 800 })
      ),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

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

// ✅ NEW: Skeleton post card
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
            <SkeletonBox style={{ width: "40%", height: 12, marginBottom: 6 }} />
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

function FeedBannerAd({ colors }: { colors: any }) {
  return (
    <View style={[adStyles.wrap, { backgroundColor: colors.card }]}>
      <Text style={[adStyles.label, { color: colors.textTertiary }]}>
        Sponsored
      </Text>
      <BannerAd
        unitId={BANNER_AD_UNIT_ID}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: false }}
      />
    </View>
  );
}

const adStyles = StyleSheet.create({
  wrap: {
    marginHorizontal: 14,
    marginBottom: 12,
    borderRadius: 22,
    overflow: "hidden",
    alignItems: "center",
    paddingTop: 6,
  },
  label: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 4,
  },
});

type FeedItem = Post | { __type: "ad"; id: string };

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const { maybeShowInterstitial } = useInterstitialAd();
  const feedDensity = useFeedDensity();

  const mediaHeight = useMemo(
    () => Math.round(Math.min(420, Math.max(200, width * 0.62))),
    [width],
  );

  const bottomPad = useMemo(
    () => getTabBarHeight(insets.bottom) + 12,
    [insets.bottom],
  );

  const [activeTab, setActiveTab] = useState<FeedTab>("for-you");
  const [communitySearch, setCommunitySearch] = useState("");

  const unreadCount = useUnreadNotificationsCount();
  const { data: storiesRaw } = useActiveStories();
  const { myCommunities, myCommunityIds } = useCommunities();

  // ✅ NEW: Fetch user preferences for NSFW filtering
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

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    isRefetching,
    isLoading,
  } = useInfiniteFeedPosts(activeTab, { communityIds: myCommunityIds });

  const posts = useMemo(
    () => data?.pages.flatMap((p) => p.posts) ?? [],
    [data],
  );

  // ✅ NEW: Filter NSFW/spoiler content based on user preferences
  const filteredPosts = useMemo(() => {
    if (showNSFW) return posts;
    return posts.filter((post) => !hasNSFWContent(post));
  }, [posts, showNSFW]);

  const feedItems = useMemo<FeedItem[]>(() => {
    const items: FeedItem[] = [];
    filteredPosts.forEach((post, i) => {
      items.push(post);
      if ((i + 1) % AD_EVERY_N_POSTS === 0) {
        items.push({ __type: "ad", id: `ad_${i}` });
      }
    });
    return items;
  }, [filteredPosts]);

  const { onLike, onSave, viewabilityConfig, onViewableItemsChanged } =
    useFeedInteractions();

  const openPost = (postId: string) => {
    maybeShowInterstitial();
    router.push(`/post/${postId}` as any);
  };

  const stories = useMemo(() => {
    const list = storiesRaw ?? [];
    const map = new Map<string, any>();
    for (const s of list) {
      const uid = s.user_id;
      const existing = map.get(uid);
      if (!existing) map.set(uid, s);
      else {
        const a = new Date(existing.created_at).getTime();
        const b = new Date(s.created_at).getTime();
        if (b > a) map.set(uid, s);
      }
    }
    return Array.from(map.values()).sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }, [storiesRaw]);

  const filteredCommunities = useMemo(() => {
    const q = communitySearch.trim().toLowerCase();
    if (!q) return myCommunities;
    return myCommunities.filter((c) =>
      (c.name ?? "").toLowerCase().includes(q),
    );
  }, [communitySearch, myCommunities]);

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
                      <Ionicons name="add" size={28} color={colors.primary} />
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
                    size={64}
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

        {/* My Communities row */}
        {activeTab === "my-community" && (
          <View
            style={[
              styles.myCommunityPanel,
              { backgroundColor: colors.background },
            ]}
          >
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
                  style={[
                    styles.clearBtnSmall,
                    { backgroundColor: colors.surface },
                  ]}
                >
                  <Ionicons
                    name="close"
                    size={16}
                    color={colors.textTertiary}
                  />
                </TouchableOpacity>
              )}
            </View>

            {filteredCommunities.length > 0 ? (
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={filteredCommunities}
                keyExtractor={(c) => c.id}
                contentContainerStyle={{ paddingRight: 16, paddingLeft: 16 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.communityPill}
                    onPress={() =>
                      router.push(`/community/${item.slug}` as any)
                    }
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
                        <Text
                          style={{ color: colors.primary, fontWeight: "900" }}
                        >
                          {(item.name?.[0] ?? "C").toUpperCase()}
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
                style={{
                  paddingHorizontal: 16,
                  paddingTop: 8,
                  paddingBottom: 2,
                }}
              >
                <Text style={{ color: colors.textTertiary, fontWeight: "800" }}>
                  No communities match "{communitySearch.trim()}".
                </Text>
              </View>
            )}
          </View>
        )}
      </>
    );
  }, [
    activeTab,
    unreadCount,
    colors,
    isDark,
    stories,
    filteredCommunities,
    communitySearch,
  ]);

  const renderItem = useCallback(
    ({ item }: { item: FeedItem }) => {
      if ("__type" in item && item.__type === "ad") {
        return <FeedBannerAd colors={colors} />;
      }

      const post = item as Post;
      const author = post.user?.full_name || post.user?.username || "User";
      const avatar = post.user?.avatar_url;
      const media = post.media_urls?.[0];
      const video = isVideoPost(post);
      const isPoll = post.post_type === "poll" && !!(post as any).poll;

      const liked = !!post.is_liked;
      const saved = !!post.is_saved;
      const likeColor = liked ? "#FF375F" : colors.text;
      const saveColor = saved ? colors.primary : colors.text;

      return (
        <TouchableOpacity
          activeOpacity={isPoll ? 1 : 0.92}
          onPress={() => !isPoll && openPost(post.id)}
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              shadowOpacity: isDark ? 0.22 : 0.05,
              padding:
                feedDensity === "compact"
                  ? 10
                  : feedDensity === "relaxed"
                    ? 20
                    : 14,
              marginBottom:
                feedDensity === "compact"
                  ? 6
                  : feedDensity === "relaxed"
                    ? 18
                    : 12,
            },
          ]}
        >
          <View style={styles.cardTop}>
            <TouchableOpacity
              style={styles.authorRow}
              onPress={() =>
                post.user?.username &&
                router.push(`/user/${post.user.username}` as any)
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
              onPress={() => openPost(post.id)}
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
                <Text
                  style={[styles.content, { color: colors.text }]}
                  numberOfLines={6}
                >
                  {post.content}
                </Text>
              )}
              {!!media && (
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
                openPost(post.id);
              }}
              activeOpacity={0.7}
            >
              <Repeat2 size={20} color={colors.text} strokeWidth={2.5} />
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
    },
    [
      onLike,
      onSave,
      mediaHeight,
      colors,
      isDark,
      maybeShowInterstitial,
      feedDensity,
    ],
  );

  // ✅ NEW: Show skeleton loading
  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        {Header}
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
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={["left", "right"]}
    >
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <FlatList
        data={feedItems}
        keyExtractor={(item) => ("__type" in item ? item.id : item.id)}
        ListHeaderComponent={Header}
        renderItem={renderItem}
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
  storiesWrap: { paddingLeft: 16, paddingVertical: 12 },
  storyItem: { alignItems: "center", marginRight: 16, width: 76 },
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
    maxWidth: 76,
    textAlign: "center",
    marginTop: 6,
  },
  segmentWrap: { paddingHorizontal: 14, paddingBottom: 12 },
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
  myCommunityPanel: { paddingBottom: 10 },
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
  pollQuestion: {
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 22,
    marginBottom: 4,
  },
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