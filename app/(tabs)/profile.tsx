// app/(tabs)/profile.tsx ✅
// ✅ CONSOLIDATED: this screen used to have its own independent inline
// repost/quote card renderer — the 4th separate copy of that UI in the
// codebase (alongside components/post/PostCard.tsx and
// app/user/[username]/index.tsx's version, both already using the
// canonical PostCard). Replaced with <PostCard /> for every entry in
// mergedFeed:
//   - "post" kind → normal PostCard render, author = you
//   - "quote" kind → author = you, quotedPost = the original post
//   - "repost" kind → author = the ORIGINAL post's author (matching how
//     home.tsx already renders reposts-in-feed), isRepostByMe = true
// ✅ NEW: added a one-time batched is_liked/is_saved check across the
// visible post set (not per-card — same anti-N+1 reasoning as the fix
// that made PostCard stop doing its own per-card repost-status fetch).
// ⚠️ KNOWN LIMITATION: useToggleLike/useToggleBookmark's optimistic cache
// patch (in hooks/usePosts.ts) only touches postKeys.lists() — the query
// keys home.tsx's feed uses. This screen's own query keys (user-own-posts,
// user-reposts) aren't covered, so liking/saving here works correctly on
// the server but won't visually update instantly the way it does on Home;
// it catches up on the next refetch (staleTime: 0 here, so next focus).
// Fixing this properly means generalizing patchPostInLists to match
// arbitrary query shapes — flagged as a follow-up, not silently ignored.
// ✅ FIXED: RefreshControl was previously misused as
// Animated.ScrollView.RefreshControl (not a real API) — now imported and
// used as a normal RefreshControl passed to the refreshControl prop.

import PostCard from "@/components/post/PostCard";
import ShareSheet, { type ShareSheetRef } from "@/components/ShareSheet";
import FounderBadge from "@/components/user/FounderBadge";
import { useAuth } from "@/hooks/useAuth";
import { usePersistedState } from "@/hooks/usePersistedState";
import { useToggleBookmark, useToggleLike } from "@/hooks/usePosts";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import firestore from "@react-native-firebase/firestore";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import LottieView from "lottie-react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
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
const BANNER_HEIGHT = 150;
const AVATAR_SIZE = 84;
const AVATAR_OVERLAP = AVATAR_SIZE / 2;

type ProfileTab = "Post" | "Media";

type ActivityItem = {
  id: string;
  type: "repost" | "quote";
  content: string;
  media_urls: string[] | null;
  created_at: string;
  post_type?: string | null;
  like_count?: number;
  comment_count?: number;
  share_count?: number;
  repost_count?: number;
  save_count?: number;
  is_boosted?: boolean;
  boosted_until?: string | null;
  original_user?: {
    id: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  quoted_post?: {
    id: string;
    content: string | null;
    media_urls?: string[] | null;
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
  like_count?: number;
  comment_count?: number;
  share_count?: number;
  repost_count?: number;
  save_count?: number;
  is_boosted?: boolean;
  boosted_until?: string | null;
};

type FeedEntry =
  | { kind: "post"; sortAt: string; post: PostRow }
  | { kind: "activity"; sortAt: string; activity: ActivityItem };

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

function todayMMDD() {
  const now = new Date();
  return `${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { user, profile } = useAuth();
  const shareSheetRef = useRef<ShareSheetRef>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab>("Post");
  const [refreshing, setRefreshing] = useState(false);

  const toggleLikeMutation = useToggleLike();
  const toggleBookmarkMutation = useToggleBookmark();

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

  const uid = user?.uid;

  // ── Birthday ──────────────────────────────────────────────────────────────
  const birthDate = (profile as any)?.birthDate;
  const showBirthdayFlag = (profile as any)?.showBirthday;

  const isBirthday = useMemo(() => {
    if (!birthDate || !showBirthdayFlag) return false;
    const b =
      typeof birthDate?.toDate === "function" ? birthDate.toDate() : null;
    if (!b) return false;
    const now = new Date();
    return b.getMonth() === now.getMonth() && b.getDate() === now.getDate();
  }, [birthDate, showBirthdayFlag]);

  const [showBalloons, setShowBalloons] = useState(false);
  const playedRef = useRef(false);

  useEffect(() => {
    if (isBirthday && !playedRef.current) {
      playedRef.current = true;
      setShowBalloons(true);
    }
  }, [isBirthday]);

  const promptKey = uid
    ? `birthday-prompt-dismissed-${uid}-${todayMMDD()}`
    : "birthday-prompt-dismissed-fallback";
  const {
    value: promptDismissed,
    setValue: setPromptDismissed,
    isReady: promptReady,
  } = usePersistedState<boolean>(promptKey, false);

  const handleShareBirthday = () => {
    setPromptDismissed(true);
    router.push({
      pathname: "/create/post",
      params: { prefill: "🎉 It's my birthday today!" },
    } as any);
  };

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
        .get();
      return snap.docs
        .map((d) => {
          const x = d.data() as any;
          return {
            id: d.id,
            content: x.content ?? "",
            media_urls: Array.isArray(x.media_urls) ? x.media_urls : null,
            created_at: tsToIso(x.created_at_ts ?? x.created_at),
            post_type: x.post_type ?? null,
            like_count: x.like_count ?? 0,
            comment_count: x.comment_count ?? 0,
            share_count: x.share_count ?? 0,
            repost_count: x.repost_count ?? 0,
            save_count: x.save_count ?? 0,
            is_boosted: x.is_boosted ?? false,
            boosted_until: x.boosted_until ? tsToIso(x.boosted_until) : null,
          } as PostRow;
        })
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
    },
  });

  // ── Activity: simple reposts + quote reposts merged ────────────────────────
  const { data: activity, refetch: refetchActivity } = useQuery({
    queryKey: ["my-reposts", uid],
    enabled: !!uid,
    staleTime: 0,
    gcTime: 0,
    queryFn: async (): Promise<ActivityItem[]> => {
      const items: ActivityItem[] = [];

      try {
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

          const chunks: string[][] = [];
          for (let i = 0; i < postIds.length; i += 10)
            chunks.push(postIds.slice(i, i + 10));

          for (const chunk of chunks) {
            const docSnaps = await Promise.all(
              chunk.map((postId) =>
                firestore().collection("posts").doc(postId).get(),
              ),
            );
            docSnaps.forEach((d) => {
              if (!d.exists()) return;
              const x = d.data() as any;
              items.push({
                id: d.id,
                type: "repost",
                content: x.content ?? "",
                media_urls: Array.isArray(x.media_urls) ? x.media_urls : null,
                created_at: tsToIso(x.created_at_ts ?? x.created_at),
                post_type: x.post_type ?? null,
                like_count: x.like_count ?? 0,
                comment_count: x.comment_count ?? 0,
                share_count: x.share_count ?? 0,
                repost_count: x.repost_count ?? 0,
                save_count: x.save_count ?? 0,
                is_boosted: x.is_boosted ?? false,
                boosted_until: x.boosted_until
                  ? tsToIso(x.boosted_until)
                  : null,
                original_user: x.user
                  ? {
                      id: x.user_id,
                      username: x.user.username ?? null,
                      full_name: x.user.full_name ?? null,
                      avatar_url: x.user.avatar_url ?? null,
                    }
                  : null,
                activity_at:
                  repostedAt[d.id] ?? tsToIso(x.created_at_ts ?? x.created_at),
              });
            });
          }
        }
      } catch (e) {
        console.warn("[Activity] reposts fetch failed:", e);
      }

      try {
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
              let quotedMediaUrls: string[] | null = Array.isArray(
                x.quote_post?.media_urls,
              )
                ? x.quote_post.media_urls
                : null;

              if (!quotedContent) {
                try {
                  const quotedSnap = await firestore()
                    .collection("posts")
                    .doc(x.quote_post_id)
                    .get();
                  const quotedData = quotedSnap.exists()
                    ? (quotedSnap.data() as any)
                    : null;
                  if (quotedData) {
                    quotedContent = quotedData.content ?? null;
                    quotedUser = quotedData.user ?? null;
                    quotedMediaUrls = Array.isArray(quotedData.media_urls)
                      ? quotedData.media_urls
                      : null;
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
                like_count: x.like_count ?? 0,
                comment_count: x.comment_count ?? 0,
                share_count: x.share_count ?? 0,
                repost_count: x.repost_count ?? 0,
                save_count: x.save_count ?? 0,
                is_boosted: x.is_boosted ?? false,
                boosted_until: x.boosted_until
                  ? tsToIso(x.boosted_until)
                  : null,
                quoted_post: {
                  id: x.quote_post_id,
                  content: quotedContent,
                  media_urls: quotedMediaUrls,
                  user: quotedUser,
                },
                activity_at: tsToIso(x.created_at_ts ?? x.created_at),
              });
            }),
        );
      } catch (e) {
        console.warn("[Activity] quote reposts fetch failed:", e);
      }

      return items.sort(
        (a, b) =>
          new Date(b.activity_at).getTime() - new Date(a.activity_at).getTime(),
      );
    },
  });

  const mergedFeed: FeedEntry[] = useMemo(() => {
    const quoteIds = new Set(
      (activity ?? []).filter((a) => a.type === "quote").map((a) => a.id),
    );
    const plainPosts = (posts ?? []).filter((p) => !quoteIds.has(p.id));

    const entries: FeedEntry[] = [
      ...plainPosts.map(
        (post): FeedEntry => ({ kind: "post", sortAt: post.created_at, post }),
      ),
      ...(activity ?? []).map(
        (activityItem): FeedEntry => ({
          kind: "activity",
          sortAt: activityItem.activity_at,
          activity: activityItem,
        }),
      ),
    ];

    return entries.sort(
      (a, b) => new Date(b.sortAt).getTime() - new Date(a.sortAt).getTime(),
    );
  }, [posts, activity]);

  const mediaPosts = useMemo(
    () => (posts ?? []).filter((p) => p.media_urls && p.media_urls.length > 0),
    [posts],
  );

  // ✅ NEW: one-time batched is_liked/is_saved check across the visible
  // post set — the relevant "other post" for a repost is the ORIGINAL
  // post id, not the repost activity doc's own id.
  const likeSaveTargetIds = useMemo(() => {
    const ids = new Set<string>();
    (posts ?? []).forEach((p) => ids.add(p.id));
    (activity ?? []).forEach((a) => ids.add(a.id));
    return Array.from(ids);
  }, [posts, activity]);

  const { data: likeSaveStatus } = useQuery({
    queryKey: ["my-profile-like-save-status", uid, likeSaveTargetIds.join(",")],
    enabled: !!uid && likeSaveTargetIds.length > 0,
    staleTime: 30_000,
    queryFn: async () => {
      const liked = new Set<string>();
      const saved = new Set<string>();
      await Promise.all(
        likeSaveTargetIds.map(async (postId) => {
          const [likeSnap, saveSnap] = await Promise.all([
            firestore()
              .collection("posts")
              .doc(postId)
              .collection("likes")
              .doc(uid!)
              .get(),
            firestore()
              .collection("posts")
              .doc(postId)
              .collection("saves")
              .doc(uid!)
              .get(),
          ]);
          if (likeSnap.exists()) liked.add(postId);
          if (saveSnap.exists()) saved.add(postId);
        }),
      );
      return { liked, saved };
    },
  });

  const isLikedPost = (postId: string) => !!likeSaveStatus?.liked.has(postId);
  const isSavedPost = (postId: string) => !!likeSaveStatus?.saved.has(postId);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchStats(), refetchPosts(), refetchActivity()]);
    setRefreshing(false);
  };

  const gradientColors = isDark
    ? [colors.background, colors.background, colors.background]
    : (["#DCEBFF", "#EEF4FF", "#FFFFFF"] as const);

  const avatarUrl = profile?.avatar_url;
  const bannerUrl = (profile as any)?.banner_url as string | null | undefined;
  const displayName = profile?.full_name || profile?.username || "User";

  const renderFeedEntry = (entry: FeedEntry) => {
    if (entry.kind === "post") {
      const p = entry.post;
      return (
        <PostCard
          key={`post-${p.id}`}
          id={p.id}
          content={p.content}
          media={p.media_urls ?? undefined}
          post_type={p.post_type ?? undefined}
          author={{
            id: uid!,
            name: displayName,
            username: profile?.username ?? "",
            avatar: avatarUrl ?? undefined,
          }}
          timestamp={new Date(p.created_at).toLocaleDateString()}
          likes={p.like_count ?? 0}
          comments={p.comment_count ?? 0}
          shares={p.share_count ?? 0}
          reposts={p.repost_count ?? 0}
          saves={p.save_count ?? 0}
          isLiked={isLikedPost(p.id)}
          isSaved={isSavedPost(p.id)}
          isBoosted={p.is_boosted}
          boostedUntil={p.boosted_until}
          onLikePress={() =>
            toggleLikeMutation.mutate({
              postId: p.id,
              isLiked: isLikedPost(p.id),
            })
          }
          onSavePress={() =>
            toggleBookmarkMutation.mutate({
              postId: p.id,
              isSaved: isSavedPost(p.id),
            })
          }
        />
      );
    }

    const item = entry.activity;

    if (item.type === "repost") {
      // ✅ Reposts render with the ORIGINAL author/content, matching how
      // home.tsx already renders reposts-in-feed — isRepostByMe carries
      // the "You reposted" label.
      return (
        <PostCard
          key={`repost-${item.id}`}
          id={item.id}
          content={item.content}
          media={item.media_urls ?? undefined}
          post_type={item.post_type ?? undefined}
          author={{
            id: item.original_user?.id ?? "",
            name:
              item.original_user?.full_name ||
              item.original_user?.username ||
              "User",
            username: item.original_user?.username ?? "",
            avatar: item.original_user?.avatar_url ?? undefined,
          }}
          timestamp={new Date(item.created_at).toLocaleDateString()}
          likes={item.like_count ?? 0}
          comments={item.comment_count ?? 0}
          shares={item.share_count ?? 0}
          reposts={item.repost_count ?? 0}
          saves={item.save_count ?? 0}
          isLiked={isLikedPost(item.id)}
          isSaved={isSavedPost(item.id)}
          isRepostByMe
          isBoosted={item.is_boosted}
          boostedUntil={item.boosted_until}
          onLikePress={() =>
            toggleLikeMutation.mutate({
              postId: item.id,
              isLiked: isLikedPost(item.id),
            })
          }
          onSavePress={() =>
            toggleBookmarkMutation.mutate({
              postId: item.id,
              isSaved: isSavedPost(item.id),
            })
          }
        />
      );
    }

    // "quote" — your own post, quoting someone else's
    return (
      <PostCard
        key={`quote-${item.id}`}
        id={item.id}
        content={item.content}
        media={item.media_urls ?? undefined}
        post_type={item.post_type ?? undefined}
        author={{
          id: uid!,
          name: displayName,
          username: profile?.username ?? "",
          avatar: avatarUrl ?? undefined,
        }}
        timestamp={new Date(item.created_at).toLocaleDateString()}
        likes={item.like_count ?? 0}
        comments={item.comment_count ?? 0}
        shares={item.share_count ?? 0}
        reposts={item.repost_count ?? 0}
        saves={item.save_count ?? 0}
        isLiked={isLikedPost(item.id)}
        isSaved={isSavedPost(item.id)}
        isBoosted={item.is_boosted}
        boostedUntil={item.boosted_until}
        quotedPost={
          item.quoted_post
            ? {
                id: item.quoted_post.id,
                content: item.quoted_post.content ?? undefined,
                media_urls: item.quoted_post.media_urls ?? undefined,
                user: item.quoted_post.user
                  ? {
                      full_name: item.quoted_post.user.full_name ?? undefined,
                      username: item.quoted_post.user.username ?? undefined,
                      avatar_url: item.quoted_post.user.avatar_url ?? undefined,
                    }
                  : undefined,
              }
            : undefined
        }
        onLikePress={() =>
          toggleLikeMutation.mutate({
            postId: item.id,
            isLiked: isLikedPost(item.id),
          })
        }
        onSavePress={() =>
          toggleBookmarkMutation.mutate({
            postId: item.id,
            isSaved: isSavedPost(item.id),
          })
        }
      />
    );
  };

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
          <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
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
            contentContainerStyle={{ paddingBottom: 100 }}
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
            <View style={styles.bannerWrap}>
              {bannerUrl ? (
                <Image source={{ uri: bannerUrl }} style={styles.bannerImage} />
              ) : (
                <LinearGradient
                  colors={[colors.primary, colors.primary + "60"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.bannerImage}
                />
              )}
            </View>

            {/* ✅ CHANGED: avatar now sits fully below the banner in normal
                flow, not absolutely positioned overlapping it — per
                explicit preference over the previous X/Twitter-style
                bottom-left overlap. */}
            <View style={styles.avatarRow}>
              <TouchableOpacity
                onPress={() => router.push("/profile/edit")}
                activeOpacity={0.9}
                style={[styles.avatarWrap, { borderColor: colors.background }]}
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
                      borderColor: colors.background,
                    },
                  ]}
                >
                  <Ionicons name="pencil" size={11} color="#fff" />
                </View>
              </TouchableOpacity>
            </View>

            <View
              style={[
                styles.profileCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
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
                  onPress={() => router.push("/profile/analytics" as any)}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="View analytics"
                >
                  <Ionicons
                    name="bar-chart-outline"
                    size={18}
                    color={colors.text}
                  />
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

              <View style={styles.nameRow}>
                <Text style={[styles.displayName, { color: colors.text }]}>
                  {displayName}
                </Text>
                {!!(profile as any)?.is_founder && <FounderBadge />}
                {isBirthday && (
                  <TouchableOpacity
                    onPress={() => setShowBalloons(true)}
                    activeOpacity={0.7}
                    hitSlop={8}
                  >
                    <Text style={{ fontSize: 18 }}>🎈</Text>
                  </TouchableOpacity>
                )}
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

              {/* ✅ NEW: "Joined <Month Year>" row, matching X's
                  location+joined pattern below the bio. */}
              {!!(profile as any)?.created_at && (
                <View style={styles.locationRow}>
                  <Ionicons
                    name="calendar-outline"
                    size={14}
                    color={colors.textTertiary}
                  />
                  <Text
                    style={[
                      styles.locationText,
                      { color: colors.textTertiary },
                    ]}
                  >
                    Joined{" "}
                    {new Date(
                      typeof (profile as any).created_at?.toDate === "function"
                        ? (profile as any).created_at.toDate()
                        : (profile as any).created_at,
                    ).toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    })}
                  </Text>
                </View>
              )}

              <View style={styles.statsRow}>
                <TouchableOpacity
                  style={styles.statItem}
                  onPress={() => router.push(`/profile/followers` as any)}
                >
                  <Text style={[styles.statValue, { color: colors.text }]}>
                    {formatNumber(
                      stats?.followers ?? (profile as any)?.follower_count ?? 0,
                    )}
                  </Text>
                  <Text
                    style={[styles.statLabel, { color: colors.textTertiary }]}
                  >
                    Followers
                  </Text>
                </TouchableOpacity>
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
                <TouchableOpacity
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
                </TouchableOpacity>
              </View>
            </View>

            {isBirthday && promptReady && !promptDismissed && (
              <View
                style={[
                  styles.birthdayPrompt,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={[styles.birthdayPromptTitle, { color: colors.text }]}
                  >
                    🎉 It's your birthday!
                  </Text>
                  <Text
                    style={[
                      styles.birthdayPromptDesc,
                      { color: colors.textTertiary },
                    ]}
                  >
                    Want to let your followers know?
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.birthdayPromptBtn,
                    { backgroundColor: colors.primary },
                  ]}
                  onPress={handleShareBirthday}
                  activeOpacity={0.85}
                >
                  <Text style={styles.birthdayPromptBtnText}>Post</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setPromptDismissed(true)}
                  activeOpacity={0.7}
                  hitSlop={8}
                  style={{ marginLeft: 4 }}
                >
                  <Ionicons
                    name="close"
                    size={18}
                    color={colors.textTertiary}
                  />
                </TouchableOpacity>
              </View>
            )}

            <View
              style={[
                styles.tabsContainer,
                { borderBottomColor: colors.border },
              ]}
            >
              {(
                [
                  { key: "Post", icon: "reader-outline" },
                  { key: "Media", icon: "images-outline" },
                ] as { key: ProfileTab; icon: string }[]
              ).map(({ key: tab, icon }) => {
                const active = activeTab === tab;
                return (
                  <TouchableOpacity
                    key={tab}
                    onPress={() => setActiveTab(tab)}
                    activeOpacity={0.7}
                    style={styles.tab}
                  >
                    <View style={styles.tabIconLabel}>
                      <Ionicons
                        name={icon as any}
                        size={16}
                        color={active ? colors.text : colors.textTertiary}
                      />
                      <Text
                        style={[
                          styles.tabText,
                          { color: active ? colors.text : colors.textTertiary },
                          active && styles.tabTextActive,
                        ]}
                      >
                        {tab}
                      </Text>
                    </View>
                    {active && (
                      <View
                        style={[
                          styles.tabUnderline,
                          { backgroundColor: colors.primary },
                        ]}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.contentSection}>
              {activeTab === "Post" &&
                (mergedFeed.length > 0 ? (
                  <View style={{ gap: 4 }}>
                    {mergedFeed.map((entry) => renderFeedEntry(entry))}
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
                            return (
                              <TouchableOpacity
                                key={post.id}
                                style={{
                                  width: CELL_SIZE,
                                  height: CELL_SIZE,
                                  backgroundColor: colors.surface,
                                  overflow: "hidden",
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

        {showBalloons && (
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <LottieView
              source={require("@/assets/animations/balloons.json")}
              autoPlay
              loop={false}
              onAnimationFinish={() => setShowBalloons(false)}
              style={StyleSheet.absoluteFill}
            />
          </View>
        )}
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
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
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
  bannerWrap: { width: "100%", height: BANNER_HEIGHT },
  bannerImage: { width: "100%", height: BANNER_HEIGHT },
  avatarRow: {
    paddingHorizontal: 16,
    marginTop: 14,
    marginBottom: 8,
  },
  avatarWrap: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 4,
  },
  avatar: { width: "100%", height: "100%", borderRadius: AVATAR_SIZE / 2 },
  avatarFallback: {
    width: "100%",
    height: "100%",
    borderRadius: AVATAR_SIZE / 2,
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
  profileCard: {
    borderRadius: 22,
    padding: 18,
    marginHorizontal: 16,
    marginTop: 0,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 2,
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "flex-end",
    marginBottom: 12,
  },
  editBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
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
    marginBottom: 10,
  },
  locationText: { fontSize: 13 },
  statsRow: { flexDirection: "row", gap: 20, marginTop: 4 },
  statItem: { flexDirection: "row", alignItems: "baseline", gap: 4 },
  statValue: { fontSize: 15, fontWeight: "900" },
  statLabel: { fontSize: 13, fontWeight: "600" },
  birthdayPrompt: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  birthdayPromptTitle: { fontSize: 14, fontWeight: "800" },
  birthdayPromptDesc: { fontSize: 12.5, marginTop: 2 },
  birthdayPromptBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
  },
  birthdayPromptBtnText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  tabsContainer: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 12,
    borderBottomWidth: 1,
  },
  tab: { flex: 1, alignItems: "center", paddingVertical: 13 },
  tabIconLabel: { flexDirection: "row", alignItems: "center", gap: 6 },
  tabText: { fontSize: 13.5, fontWeight: "700" },
  tabTextActive: { fontWeight: "900" },
  tabUnderline: {
    position: "absolute",
    bottom: -1,
    height: 3,
    width: "56%",
    borderRadius: 2,
  },
  contentSection: { paddingHorizontal: 16, paddingBottom: 32 },
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
