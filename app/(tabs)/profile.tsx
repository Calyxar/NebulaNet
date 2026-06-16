// app/(tabs)/profile.tsx ✅ FIXED
// Fix 1: my-posts query uses orderBy("created_at_ts") to match existing index
// Fix 2: my-reposts query uses staleTime:0 + gcTime:0 to bypass stale cache
// Fix 3: reposts query drops orderBy entirely and sorts client-side (safest)

import HashtagText from "@/components/HashtagText";
import { getTabBarHeight } from "@/components/navigation/CurvedTabBar";
import ShareSheet, { type ShareSheetRef } from "@/components/ShareSheet";
import FounderBadge from "@/components/user/FounderBadge";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import firestore from "@react-native-firebase/firestore";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
  Pressable,
  RefreshControl,
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

const { width: SCREEN_W } = Dimensions.get("window");
const GRID_GAP = 2;
const CELL_SIZE = (SCREEN_W - 32 - GRID_GAP * 2) / 3;

type ProfileTab = "Post" | "Activity" | "Media";

type ActivityItem = {
  id: string;
  type: "repost" | "quote";
  content: string;
  media_urls: string[] | null;
  created_at: string;
  post_type?: string | null;
  original_user?: {
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  quoted_post?: {
    id: string;
    content: string | null;
    user: {
      username: string | null;
      full_name: string | null;
      avatar_url: string | null;
    } | null;
  } | null;
  activity_at: string;
};

type PostRow = {
  id: string;
  content: string;
  media_urls: string[] | null;
  created_at: string;
  post_type?: string | null;
};

function formatNumber(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function tsToIso(v: any): string {
  if (!v) return new Date().toISOString();
  if (typeof v === "string") return v;
  if (typeof v?.toDate === "function") return v.toDate().toISOString();
  if (typeof v?.seconds === "number")
    return new Date(v.seconds * 1000).toISOString();
  return new Date().toISOString();
}

const isVideoUrl = (url?: string | null) => {
  if (!url) return false;
  return ["mp4", "mov", "m4v", "webm", "mkv", "avi"].some((e) =>
    url.split("?")[0].toLowerCase().endsWith(`.${e}`),
  );
};

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { user, profile } = useAuth();
  const shareSheetRef = useRef<ShareSheetRef>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab>("Post");
  const [refreshing, setRefreshing] = useState(false);

  const scrollY = useRef(new Animated.Value(0)).current;
  const HEADER_FADE_START = 160;
  const HEADER_FADE_END = 220;

  const headerUsernameOpacity = scrollY.interpolate({
    inputRange: [HEADER_FADE_START, HEADER_FADE_END],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });
  const headerBgOpacity = scrollY.interpolate({
    inputRange: [HEADER_FADE_START, HEADER_FADE_END],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const bottomPad = useMemo(
    () => getTabBarHeight(insets.bottom) + 12,
    [insets.bottom],
  );
  const uid = user?.uid;

  // ── Stats ──────────────────────────────────────────────────────────────────
  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ["my-stats", uid],
    enabled: !!uid,
    staleTime: 60_000,
    queryFn: async () => {
      const [p, fo, fi] = await Promise.all([
        firestore()
          .collection("posts")
          .where("user_id", "==", uid)
          .count()
          .get(),
        firestore()
          .collection("follows")
          .where("following_id", "==", uid)
          .where("status", "==", "accepted")
          .count()
          .get(),
        firestore()
          .collection("follows")
          .where("follower_id", "==", uid)
          .where("status", "==", "accepted")
          .count()
          .get(),
      ]);
      return {
        posts: p.data().count,
        followers: fo.data().count,
        following: fi.data().count,
      };
    },
  });

  // ── Posts ──────────────────────────────────────────────────────────────────
  const { data: posts, refetch: refetchPosts } = useQuery({
    queryKey: ["my-posts", uid],
    enabled: !!uid,
    staleTime: 30_000,
    queryFn: async () => {
      const snap = await firestore()
        .collection("posts")
        .where("user_id", "==", uid)
        // ✅ FIX 1: use created_at_ts to match the existing Firestore index
        .orderBy("created_at_ts", "desc")
        .get();
      return snap.docs.map((d) => {
        const x = d.data() as any;
        return {
          id: d.id,
          content: x.content ?? "",
          media_urls: Array.isArray(x.media_urls) ? x.media_urls : null,
          created_at: tsToIso(x.created_at_ts ?? x.created_at),
          post_type: x.post_type ?? null,
        } as PostRow;
      });
    },
  });

  // ── Activity: simple reposts + quote reposts merged ────────────────────────
  const { data: activity, refetch: refetchActivity } = useQuery({
    queryKey: ["my-reposts", uid],
    enabled: !!uid,
    // ✅ FIX 2: no cache — always fetch fresh so stale empty cache doesn't block
    staleTime: 0,
    gcTime: 0,
    queryFn: async (): Promise<ActivityItem[]> => {
      const items: ActivityItem[] = [];

      // ── 1. Simple reposts ──────────────────────────────────────────────────
      try {
        // ✅ FIX 3: no orderBy — fetch all user's reposts and sort client-side
        // This avoids the composite index requirement entirely
        const repostSnap = await firestore()
          .collection("reposts")
          .where("user_id", "==", uid)
          .limit(50)
          .get();

        if (!repostSnap.empty) {
          const postIds: string[] = [];
          const repostedAt: Record<string, string> = {};

          repostSnap.docs.forEach((d) => {
            const data = d.data() as any;
            if (data.post_id) {
              postIds.push(data.post_id);
              repostedAt[data.post_id] = tsToIso(
                data.created_at ?? data.created_at_ts,
              );
            }
          });

          // Fetch the actual post docs in batches of 10
          const chunks: string[][] = [];
          for (let i = 0; i < postIds.length; i += 10)
            chunks.push(postIds.slice(i, i + 10));

          for (const chunk of chunks) {
            const snap = await firestore()
              .collection("posts")
              .where(firestore.FieldPath.documentId(), "in", chunk)
              .get();
            snap.docs.forEach((d) => {
              const x = d.data() as any;
              items.push({
                id: d.id,
                type: "repost",
                content: x.content ?? "",
                media_urls: Array.isArray(x.media_urls) ? x.media_urls : null,
                created_at: tsToIso(x.created_at_ts ?? x.created_at),
                post_type: x.post_type ?? null,
                original_user: x.user ?? null,
                activity_at:
                  repostedAt[d.id] ?? tsToIso(x.created_at_ts ?? x.created_at),
              });
            });
          }
        }
      } catch (e) {
        console.warn("[Activity] reposts fetch failed:", e);
      }

      // ── 2. Quote reposts ───────────────────────────────────────────────────
      try {
        // ✅ FIX 3: no orderBy on quote_post_id — just filter client-side
        const quoteSnap = await firestore()
          .collection("posts")
          .where("user_id", "==", uid)
          .orderBy("created_at_ts", "desc")
          .limit(50)
          .get();

        await Promise.all(
          quoteSnap.docs
            .filter((d) => !!(d.data() as any).quote_post_id)
            .map(async (d) => {
              const x = d.data() as any;
              if (!x.quote_post_id) return;

              let quotedContent: string | null = x.quote_post?.content ?? null;
              let quotedUser = x.quote_post?.user ?? null;

              if (!quotedContent) {
                try {
                  const quotedSnap = await firestore()
                    .collection("posts")
                    .doc(x.quote_post_id)
                    .get();
                  const quotedData = quotedSnap.data() as any;
                  if (quotedData) {
                    quotedContent = quotedData.content ?? null;
                    quotedUser = quotedData.user ?? null;
                  }
                } catch {}
              }

              items.push({
                id: d.id,
                type: "quote",
                content: x.content ?? "",
                media_urls: Array.isArray(x.media_urls) ? x.media_urls : null,
                created_at: tsToIso(x.created_at_ts ?? x.created_at),
                post_type: x.post_type ?? null,
                quoted_post: {
                  id: x.quote_post_id,
                  content: quotedContent,
                  user: quotedUser,
                },
                activity_at: tsToIso(x.created_at_ts ?? x.created_at),
              });
            }),
        );
      } catch (e) {
        console.warn("[Activity] quote reposts fetch failed:", e);
      }

      // Sort merged list newest first
      return items.sort(
        (a, b) =>
          new Date(b.activity_at).getTime() - new Date(a.activity_at).getTime(),
      );
    },
  });

  const mediaPosts = useMemo(
    () => (posts ?? []).filter((p) => p.media_urls && p.media_urls.length > 0),
    [posts],
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchStats(), refetchPosts(), refetchActivity()]);
    setRefreshing(false);
  };

  const gradientColors = isDark
    ? [colors.background, colors.background, colors.background]
    : (["#DCEBFF", "#EEF4FF", "#FFFFFF"] as const);

  const avatarUrl = profile?.avatar_url;
  const displayName = profile?.full_name || profile?.username || "User";

  return (
    <>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />
      <LinearGradient
        colors={gradientColors as any}
        locations={[0, 0.42, 1]}
        style={{ flex: 1 }}
      >
        <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
          {/* Animated sticky header */}
          <View style={styles.header}>
            <Animated.View
              style={[
                StyleSheet.absoluteFillObject,
                {
                  backgroundColor: isDark ? colors.background : "#EEF4FF",
                  opacity: headerBgOpacity,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                },
              ]}
              pointerEvents="none"
            />
            <TouchableOpacity
              style={[
                styles.headerBtn,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              onPress={() => router.push("/notifications" as any)}
              activeOpacity={0.85}
            >
              <Ionicons
                name="notifications-outline"
                size={20}
                color={colors.text}
              />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Animated.Text
                style={[
                  styles.headerUsername,
                  { color: colors.text, opacity: headerUsernameOpacity },
                ]}
                numberOfLines={1}
              >
                {profile?.username ? `@${profile.username}` : "Profile"}
              </Animated.Text>
              {!!(profile as any)?.is_founder && (
                <Animated.View
                  style={[
                    styles.headerBadge,
                    {
                      backgroundColor: colors.primary + "20",
                      opacity: headerUsernameOpacity,
                    },
                  ]}
                >
                  <Text
                    style={[styles.headerBadgeText, { color: colors.primary }]}
                  >
                    Founder
                  </Text>
                </Animated.View>
              )}
            </View>
            <TouchableOpacity
              style={[
                styles.headerBtn,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              onPress={() => router.push("/settings")}
              activeOpacity={0.85}
            >
              <Ionicons name="settings-outline" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          <Animated.ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: bottomPad }}
            scrollEventThrottle={16}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              { useNativeDriver: true },
            )}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            }
          >
            {/* Profile card */}
            <View
              style={[
                styles.profileCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={styles.topRow}>
                <TouchableOpacity
                  onPress={() => router.push("/profile/edit")}
                  activeOpacity={0.9}
                >
                  {avatarUrl ? (
                    <Image source={{ uri: avatarUrl }} style={styles.avatar} />
                  ) : (
                    <View
                      style={[
                        styles.avatarFallback,
                        { backgroundColor: colors.primary },
                      ]}
                    >
                      <Text style={styles.avatarFallbackText}>
                        {(displayName[0] || "U").toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View
                    style={[
                      styles.editBadge,
                      {
                        backgroundColor: colors.primary,
                        borderColor: colors.card,
                      },
                    ]}
                  >
                    <Ionicons name="pencil" size={11} color="#fff" />
                  </View>
                </TouchableOpacity>

                <View style={styles.statsRow}>
                  <Pressable
                    style={styles.statItem}
                    onPress={() => router.push(`/profile/followers` as any)}
                  >
                    <Text style={[styles.statValue, { color: colors.text }]}>
                      {formatNumber(
                        stats?.followers ??
                          (profile as any)?.follower_count ??
                          0,
                      )}
                    </Text>
                    <Text
                      style={[styles.statLabel, { color: colors.textTertiary }]}
                    >
                      Followers
                    </Text>
                  </Pressable>
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: colors.text }]}>
                      {formatNumber(stats?.posts ?? 0)}
                    </Text>
                    <Text
                      style={[styles.statLabel, { color: colors.textTertiary }]}
                    >
                      Posts
                    </Text>
                  </View>
                  <Pressable
                    style={styles.statItem}
                    onPress={() => router.push(`/profile/following` as any)}
                  >
                    <Text style={[styles.statValue, { color: colors.text }]}>
                      {formatNumber(
                        stats?.following ??
                          (profile as any)?.following_count ??
                          0,
                      )}
                    </Text>
                    <Text
                      style={[styles.statLabel, { color: colors.textTertiary }]}
                    >
                      Following
                    </Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.nameRow}>
                <Text style={[styles.displayName, { color: colors.text }]}>
                  {displayName}
                </Text>
                {!!(profile as any)?.is_founder && <FounderBadge />}
              </View>
              {!!profile?.username && (
                <Text
                  style={[styles.username, { color: colors.textSecondary }]}
                >
                  @{profile.username}
                </Text>
              )}
              {!!profile?.bio && (
                <Text style={[styles.bio, { color: colors.textSecondary }]}>
                  {profile.bio}
                </Text>
              )}
              {!!(profile as any)?.location && (
                <View style={styles.locationRow}>
                  <Ionicons
                    name="location-outline"
                    size={14}
                    color={colors.textTertiary}
                  />
                  <Text
                    style={[
                      styles.locationText,
                      { color: colors.textTertiary },
                    ]}
                  >
                    {(profile as any).location}
                  </Text>
                </View>
              )}

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[
                    styles.editBtn,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => router.push("/profile/edit")}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.editBtnText, { color: colors.text }]}>
                    Edit Profile
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.shareBtn,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => shareSheetRef.current?.present()}
                  activeOpacity={0.85}
                >
                  <Ionicons
                    name="share-outline"
                    size={18}
                    color={colors.text}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Tabs */}
            <View
              style={[styles.tabsContainer, { backgroundColor: colors.card }]}
            >
              {(["Post", "Activity", "Media"] as ProfileTab[]).map((tab) => {
                const active = activeTab === tab;
                return (
                  <TouchableOpacity
                    key={tab}
                    style={[
                      styles.tab,
                      active && { backgroundColor: colors.primary },
                    ]}
                    onPress={() => setActiveTab(tab)}
                    activeOpacity={0.85}
                  >
                    <Text
                      style={[
                        styles.tabText,
                        { color: colors.textTertiary },
                        active && { color: "#fff", fontWeight: "800" },
                      ]}
                    >
                      {tab}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Tab content */}
            <View style={styles.contentSection}>
              {/* POSTS */}
              {activeTab === "Post" &&
                (posts && posts.length > 0 ? (
                  <View style={{ gap: 12 }}>
                    {posts.map((p) => {
                      const img = p.media_urls?.[0];
                      const isVid = isVideoUrl(img) || p.post_type === "video";
                      return (
                        <TouchableOpacity
                          key={p.id}
                          style={[
                            styles.postCard,
                            { backgroundColor: colors.card },
                          ]}
                          onPress={() => router.push(`/post/${p.id}` as any)}
                          activeOpacity={0.9}
                        >
                          {!!p.content && (
                            <HashtagText
                              content={p.content}
                              style={[
                                styles.postContent,
                                { color: colors.text },
                              ]}
                              numberOfLines={4}
                              hashtagColor={colors.primary}
                              onPress={() =>
                                router.push(`/post/${p.id}` as any)
                              }
                            />
                          )}
                          {!!img && (
                            <View
                              style={[
                                styles.postMediaWrap,
                                { backgroundColor: colors.surface },
                              ]}
                            >
                              <Image
                                source={{ uri: img }}
                                style={styles.postMedia}
                                resizeMode="cover"
                              />
                              {isVid && (
                                <View style={styles.videoOverlay}>
                                  <Ionicons
                                    name="play-circle"
                                    size={32}
                                    color="#fff"
                                  />
                                </View>
                              )}
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : (
                  <View
                    style={[styles.emptyCard, { backgroundColor: colors.card }]}
                  >
                    <Ionicons
                      name="document-text-outline"
                      size={40}
                      color={colors.textTertiary}
                    />
                    <Text style={[styles.emptyTitle, { color: colors.text }]}>
                      No Posts Yet
                    </Text>
                    <Text
                      style={[styles.emptyDesc, { color: colors.textTertiary }]}
                    >
                      Your posts will appear here.
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.createPostBtn,
                        { backgroundColor: colors.primary },
                      ]}
                      onPress={() => router.push("/create/post")}
                      activeOpacity={0.88}
                    >
                      <Text style={styles.createPostBtnText}>Create Post</Text>
                    </TouchableOpacity>
                  </View>
                ))}

              {/* ACTIVITY */}
              {activeTab === "Activity" &&
                (activity && activity.length > 0 ? (
                  <View style={{ gap: 12 }}>
                    {activity.map((item) => {
                      const img = item.media_urls?.[0];
                      const isVid =
                        isVideoUrl(img) || item.post_type === "video";

                      return (
                        <TouchableOpacity
                          key={`${item.type}-${item.id}`}
                          style={[
                            styles.postCard,
                            { backgroundColor: colors.card },
                          ]}
                          onPress={() => router.push(`/post/${item.id}` as any)}
                          activeOpacity={0.9}
                        >
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 6,
                              marginBottom: 8,
                            }}
                          >
                            <Ionicons
                              name={
                                item.type === "quote"
                                  ? "chatbubble-ellipses-outline"
                                  : "repeat-outline"
                              }
                              size={14}
                              color={colors.primary}
                            />
                            <Text
                              style={{
                                fontSize: 12,
                                fontWeight: "700",
                                color: colors.primary,
                              }}
                            >
                              {item.type === "quote"
                                ? `Quoted · @${item.quoted_post?.user?.username ?? item.quoted_post?.user?.full_name ?? "someone"}`
                                : `Reposted · @${item.original_user?.username ?? item.original_user?.full_name ?? "someone"}`}
                            </Text>
                          </View>

                          {item.type === "quote" && !!item.content && (
                            <Text
                              style={[
                                styles.postContent,
                                { color: colors.text, marginBottom: 8 },
                              ]}
                              numberOfLines={4}
                            >
                              {item.content}
                            </Text>
                          )}

                          {item.type === "repost" && !!item.content && (
                            <Text
                              style={[
                                styles.postContent,
                                { color: colors.text },
                              ]}
                              numberOfLines={4}
                            >
                              {item.content}
                            </Text>
                          )}

                          {item.type === "quote" && item.quoted_post && (
                            <View
                              style={[
                                styles.quotedCard,
                                {
                                  borderColor: colors.border,
                                  backgroundColor: colors.surface,
                                },
                              ]}
                            >
                              {item.quoted_post.user && (
                                <Text
                                  style={[
                                    styles.quotedAuthor,
                                    { color: colors.textSecondary },
                                  ]}
                                >
                                  @
                                  {item.quoted_post.user.username ??
                                    item.quoted_post.user.full_name ??
                                    "User"}
                                </Text>
                              )}
                              {!!item.quoted_post.content && (
                                <Text
                                  style={[
                                    styles.quotedContent,
                                    { color: colors.textSecondary },
                                  ]}
                                  numberOfLines={3}
                                >
                                  {item.quoted_post.content}
                                </Text>
                              )}
                            </View>
                          )}

                          {!!img && (
                            <View
                              style={[
                                styles.postMediaWrap,
                                { backgroundColor: colors.surface },
                              ]}
                            >
                              <Image
                                source={{ uri: img }}
                                style={styles.postMedia}
                                resizeMode="cover"
                              />
                              {isVid && (
                                <View style={styles.videoOverlay}>
                                  <Ionicons
                                    name="play-circle"
                                    size={32}
                                    color="#fff"
                                  />
                                </View>
                              )}
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : (
                  <View
                    style={[styles.emptyCard, { backgroundColor: colors.card }]}
                  >
                    <Ionicons
                      name="repeat-outline"
                      size={40}
                      color={colors.textTertiary}
                    />
                    <Text style={[styles.emptyTitle, { color: colors.text }]}>
                      No Activity Yet
                    </Text>
                    <Text
                      style={[styles.emptyDesc, { color: colors.textTertiary }]}
                    >
                      Posts you repost or quote will appear here.
                    </Text>
                  </View>
                ))}

              {/* MEDIA grid */}
              {activeTab === "Media" &&
                (mediaPosts.length > 0 ? (
                  <View
                    style={{
                      gap: GRID_GAP,
                      borderRadius: 18,
                      overflow: "hidden",
                    }}
                  >
                    {(() => {
                      const rows: PostRow[][] = [];
                      for (let i = 0; i < mediaPosts.length; i += 3)
                        rows.push(mediaPosts.slice(i, i + 3));
                      return rows.map((row, ri) => (
                        <View
                          key={ri}
                          style={{ flexDirection: "row", gap: GRID_GAP }}
                        >
                          {row.map((post) => {
                            const img = post.media_urls![0];
                            const isVid =
                              isVideoUrl(img) || post.post_type === "video";
                            return (
                              <TouchableOpacity
                                key={post.id}
                                style={{
                                  width: CELL_SIZE,
                                  height: CELL_SIZE,
                                  backgroundColor: colors.surface,
                                  overflow: "hidden",
                                  position: "relative",
                                }}
                                activeOpacity={0.85}
                                onPress={() =>
                                  router.push(`/post/${post.id}` as any)
                                }
                              >
                                <Image
                                  source={{ uri: img }}
                                  style={{ width: "100%", height: "100%" }}
                                  resizeMode="cover"
                                />
                                {isVid && (
                                  <View
                                    style={{
                                      position: "absolute",
                                      top: 6,
                                      right: 6,
                                      backgroundColor: "rgba(0,0,0,0.55)",
                                      borderRadius: 8,
                                      paddingHorizontal: 5,
                                      paddingVertical: 3,
                                    }}
                                  >
                                    <Ionicons
                                      name="play"
                                      size={10}
                                      color="#fff"
                                    />
                                  </View>
                                )}
                              </TouchableOpacity>
                            );
                          })}
                          {row.length < 3 &&
                            Array(3 - row.length)
                              .fill(null)
                              .map((_, i) => (
                                <View
                                  key={`sp-${i}`}
                                  style={{
                                    width: CELL_SIZE,
                                    height: CELL_SIZE,
                                    backgroundColor: "transparent",
                                  }}
                                />
                              ))}
                        </View>
                      ));
                    })()}
                  </View>
                ) : (
                  <View
                    style={[styles.emptyCard, { backgroundColor: colors.card }]}
                  >
                    <Ionicons
                      name="images-outline"
                      size={40}
                      color={colors.textTertiary}
                    />
                    <Text style={[styles.emptyTitle, { color: colors.text }]}>
                      No Media Yet
                    </Text>
                    <Text
                      style={[styles.emptyDesc, { color: colors.textTertiary }]}
                    >
                      Photos and videos from your posts will appear here.
                    </Text>
                  </View>
                ))}
            </View>
          </Animated.ScrollView>
        </SafeAreaView>
      </LinearGradient>

      <ShareSheet
        ref={shareSheetRef}
        title="Share Profile"
        url={`https://nebulanet.space/user/${profile?.username ?? ""}`}
        text={`Check out ${displayName} on NebulaNet!`}
        shareMessage={`Check out ${displayName} on NebulaNet!`}
      />
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingTop: 14,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  headerUsername: { fontSize: 17, fontWeight: "900", letterSpacing: -0.3 },
  headerBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  headerBadgeText: { fontSize: 11, fontWeight: "800" },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  profileCard: {
    borderRadius: 22,
    padding: 18,
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 2,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    gap: 16,
  },
  avatar: { width: 76, height: 76, borderRadius: 38 },
  avatarFallback: {
    width: 76,
    height: 76,
    borderRadius: 38,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarFallbackText: { fontSize: 30, fontWeight: "800", color: "#fff" },
  editBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  statsRow: { flex: 1, flexDirection: "row", justifyContent: "space-around" },
  statItem: { alignItems: "center" },
  statValue: { fontSize: 18, fontWeight: "900" },
  statLabel: { fontSize: 12, marginTop: 3, fontWeight: "700" },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  displayName: { fontSize: 17, fontWeight: "900" },
  username: { fontSize: 14, marginBottom: 6 },
  bio: { fontSize: 13.5, lineHeight: 19, marginBottom: 8 },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 8,
  },
  locationText: { fontSize: 13 },
  actionRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  editBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 22,
    alignItems: "center",
    borderWidth: 1,
  },
  editBtnText: { fontSize: 14, fontWeight: "800" },
  shareBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  tabsContainer: {
    flexDirection: "row",
    borderRadius: 22,
    padding: 5,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 18 },
  tabText: { fontSize: 13, fontWeight: "700" },
  contentSection: { paddingHorizontal: 16, paddingBottom: 32 },
  postCard: {
    borderRadius: 18,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  postContent: { fontSize: 14, lineHeight: 20 },
  postMediaWrap: {
    width: "100%",
    height: 180,
    borderRadius: 14,
    overflow: "hidden",
    marginTop: 10,
    position: "relative",
  },
  postMedia: { width: "100%", height: "100%" },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  quotedCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginTop: 8,
    gap: 4,
  },
  quotedAuthor: { fontSize: 12, fontWeight: "700" },
  quotedContent: { fontSize: 13, lineHeight: 18 },
  emptyCard: {
    borderRadius: 22,
    paddingVertical: 32,
    paddingHorizontal: 18,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "900",
    marginTop: 12,
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 16,
  },
  createPostBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
  },
  createPostBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
