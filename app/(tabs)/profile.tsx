// app/(tabs)/profile.tsx — ✅ FIXED: Activity tab shows reposts, likes in color
import AppHeader from "@/components/navigation/AppHeader";
import { getTabBarHeight } from "@/components/navigation/CurvedTabBar";
import ShareSheet, { type ShareSheetRef } from "@/components/ShareSheet";
import FounderBadge from "@/components/user/FounderBadge";
import { useToggleLike } from "@/hooks/usePosts";
import { db } from "@/lib/firebase";
import { getUserReposts } from "@/lib/firestore/reposts";
import { useAuth } from "@/providers/AuthProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { useActionSheet } from "@expo/react-native-action-sheet";
import { Ionicons } from "@expo/vector-icons";
import firestore from "@react-native-firebase/firestore";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
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

interface UserPost {
  id: string;
  title: string | null;
  content: string;
  media_urls: string[] | null;
  like_count: number;
  comment_count: number;
  share_count: number;
  repost_count: number;
  created_at: string;
  is_liked?: boolean;
  user?: { username?: string; full_name?: string; avatar_url?: string } | null;
}

interface UserStats {
  posts: number;
  followers: number;
  following: number;
}
type ProfileTab = "Activity" | "Post" | "Tagged" | "Media";

function tsToIso(v: any): string {
  if (!v) return new Date().toISOString();
  if (typeof v === "string") return v;
  if (v instanceof Date) return v.toISOString();
  if (typeof v?.toDate === "function") return v.toDate().toISOString();
  if (typeof v?.seconds === "number")
    return new Date(v.seconds * 1000).toISOString();
  return new Date().toISOString();
}

const isVideoUrl = (url?: string | null) => {
  if (!url) return false;
  const clean = url.split("?")[0].toLowerCase();
  return ["mp4", "mov", "m4v", "webm", "mkv", "avi"].some((e) =>
    clean.endsWith(`.${e}`),
  );
};

export default function ProfileTabScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { showActionSheetWithOptions } = useActionSheet();
  const { colors, isDark } = useTheme();
  const { user, profile, isProfileLoading } = useAuth();

  const uid = user?.uid ?? null;
  const [activeTab, setActiveTab] = useState<ProfileTab>("Post");
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const toggleLikeMutation = useToggleLike();
  const shareSheetRef = useRef<ShareSheetRef>(null);

  const profileTabs: ProfileTab[] = useMemo(
    () => ["Activity", "Post", "Tagged", "Media"],
    [],
  );
  const bottomPad = useMemo(
    () => getTabBarHeight(insets.bottom) + 12,
    [insets.bottom],
  );

  const { data: userPosts = [], isLoading: isLoadingPosts } = useQuery({
    queryKey: ["user-posts", uid],
    enabled: !!uid,
    queryFn: async () => {
      if (!uid) return [];
      const snap = await db
        .collection("posts")
        .where("user_id", "==", uid)
        .get();
      return snap.docs
        .map((d) => {
          const x: any = d.data();
          return {
            id: d.id,
            title: x.title ?? null,
            content: x.content ?? "",
            media_urls: Array.isArray(x.media_urls) ? x.media_urls : null,
            like_count: Number(x.like_count ?? 0),
            comment_count: Number(x.comment_count ?? 0),
            share_count: Number(x.share_count ?? 0),
            repost_count: Number(x.repost_count ?? 0),
            created_at: tsToIso(x.created_at_ts ?? x.created_at),
            is_liked: false,
          } as UserPost;
        })
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
    },
  });

  const { data: likedPostIds } = useQuery({
    queryKey: ["user-liked-posts", uid],
    enabled: !!uid && userPosts.length > 0,
    queryFn: async () => {
      if (!uid || userPosts.length === 0) return new Set<string>();
      const postIds = userPosts.map((p) => p.id);
      const chunks: string[][] = [];
      for (let i = 0; i < postIds.length; i += 30)
        chunks.push(postIds.slice(i, i + 30));
      const likedIds = new Set<string>();
      for (const chunk of chunks) {
        const snap = await db
          .collection("likes")
          .where("user_id", "==", uid)
          .where("post_id", "in", chunk)
          .get();
        snap.docs.forEach((d) => likedIds.add((d.data() as any).post_id));
      }
      return likedIds;
    },
  });

  // ✅ NEW: fetch user's reposts and the original posts
  const { data: repostedPosts = [], isLoading: isLoadingReposts } = useQuery({
    queryKey: ["user-reposts", uid],
    enabled: !!uid && activeTab === "Activity",
    queryFn: async () => {
      if (!uid) return [];
      const reposts = await getUserReposts(uid);
      if (!reposts.length) return [];
      const postIds = reposts.map((r) => r.postId);
      const chunks: string[][] = [];
      for (let i = 0; i < postIds.length; i += 10)
        chunks.push(postIds.slice(i, i + 10));
      const posts: UserPost[] = [];
      for (const chunk of chunks) {
        const snap = await firestore()
          .collection("posts")
          .where(firestore.FieldPath.documentId(), "in", chunk)
          .get();
        snap.docs.forEach((d) => {
          const x = d.data() as any;
          posts.push({
            id: d.id,
            title: x.title ?? null,
            content: x.content ?? "",
            media_urls: Array.isArray(x.media_urls) ? x.media_urls : null,
            like_count: Number(x.like_count ?? 0),
            comment_count: Number(x.comment_count ?? 0),
            share_count: Number(x.share_count ?? 0),
            repost_count: Number(x.repost_count ?? 0),
            created_at: tsToIso(x.created_at_ts ?? x.created_at),
            user: x.user ?? null,
          });
        });
      }
      // Sort by repost time
      return posts.sort((a, b) => {
        const ra =
          reposts.find((r) => r.postId === a.id)?.created_at ?? a.created_at;
        const rb =
          reposts.find((r) => r.postId === b.id)?.created_at ?? b.created_at;
        return new Date(rb).getTime() - new Date(ra).getTime();
      });
    },
  });

  const mediaPosts = useMemo(
    () => userPosts.filter((p) => p.media_urls && p.media_urls.length > 0),
    [userPosts],
  );

  const { data: userStats, isLoading: isLoadingStats } = useQuery({
    queryKey: ["user-stats", uid],
    enabled: !!uid,
    staleTime: 0,
    queryFn: async (): Promise<UserStats> => {
      if (!uid) return { posts: 0, followers: 0, following: 0 };
      const [postsAgg, followersAgg, followingAgg] = await Promise.all([
        db.collection("posts").where("user_id", "==", uid).count().get(),
        db.collection("follows").where("following_id", "==", uid).count().get(),
        db.collection("follows").where("follower_id", "==", uid).count().get(),
      ]);
      return {
        posts: postsAgg.data().count ?? 0,
        followers: followersAgg.data().count ?? 0,
        following: followingAgg.data().count ?? 0,
      };
    },
  });

  const gradientColors = isDark
    ? [colors.background, colors.background, colors.background]
    : ["#DCEBFF", "#EEF4FF", "#FFFFFF"];

  const formatNumber = (num: number) => {
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return `${num}`;
  };

  const getInitial = () =>
    (profile?.username?.charAt(0) || profile?.full_name?.charAt(0) || "U")
      .toUpperCase()
      .slice(0, 1);

  const formatPostTime = (iso: string) => {
    try {
      const d = new Date(iso);
      const diffH = Math.floor((Date.now() - d.getTime()) / 3600000);
      if (diffH < 1) return "Just now";
      if (diffH < 24) return `${diffH}h ago`;
      return `${Math.floor(diffH / 24)}d ago`;
    } catch {
      return "Recently";
    }
  };

  const handleShareProfile = () => {
    (shareSheetRef.current as any)?.present();
  };

  const handleLike = (postId: string, currentIsLiked: boolean) => {
    setLikedPosts((prev) => {
      const next = new Set(prev);
      currentIsLiked ? next.delete(postId) : next.add(postId);
      return next;
    });
    toggleLikeMutation.mutate({ postId, isLiked: currentIsLiked });
  };

  const deletePost = async (postId: string) => {
    if (!uid) return;
    Alert.alert("Delete post?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void (async () => {
            try {
              const ref = db.collection("posts").doc(postId);
              const snap = await ref.get();
              if (!snap.exists) return;
              const d = snap.data() as any;
              if (d.user_id !== uid) {
                Alert.alert(
                  "Not allowed",
                  "You can only delete your own posts.",
                );
                return;
              }
              await ref.delete();
              await queryClient.invalidateQueries({
                queryKey: ["user-posts", uid],
              });
              await queryClient.invalidateQueries({
                queryKey: ["user-stats", uid],
              });
            } catch (e: any) {
              Alert.alert("Delete failed", e?.message ?? "Unknown error");
            }
          })();
        },
      },
    ]);
  };

  const openPostMenu = (postId: string) => {
    showActionSheetWithOptions(
      {
        options: ["View Post", "Boost Post", "Delete Post", "Cancel"],
        cancelButtonIndex: 3,
        destructiveButtonIndex: 2,
      },
      (index) => {
        if (index === 0) router.push(`/post/${postId}` as any);
        if (index === 1) router.push(`/boost/${postId}` as any);
        if (index === 2) void deletePost(postId);
      },
    );
  };

  const renderPostCard = (post: UserPost, showRepostBadge = false) => {
    const img = post.media_urls?.[0];
    const isVideo = isVideoUrl(img);
    const isLiked =
      likedPosts.has(post.id) || likedPostIds?.has(post.id) || false;
    const likeColor = isLiked ? "#FF375F" : colors.textTertiary;
    const authorName = showRepostBadge
      ? post.user?.full_name || post.user?.username || "User"
      : profile?.full_name || profile?.username || "User";
    const authorAvatar = showRepostBadge
      ? post.user?.avatar_url
      : profile?.avatar_url;

    return (
      <Pressable
        key={post.id + (showRepostBadge ? "_repost" : "")}
        onPress={() => router.push(`/post/${post.id}` as any)}
        style={[
          styles.postCard,
          { backgroundColor: colors.card, shadowOpacity: isDark ? 0.22 : 0.05 },
        ]}
      >
        {/* Repost badge */}
        {showRepostBadge && (
          <View
            style={[
              styles.repostBadge,
              { backgroundColor: colors.primary + "15" },
            ]}
          >
            <Ionicons name="repeat" size={13} color={colors.primary} />
            <Text style={[styles.repostBadgeText, { color: colors.primary }]}>
              You reposted
            </Text>
          </View>
        )}

        <View style={styles.postHeader}>
          <View style={styles.postHeaderLeft}>
            {authorAvatar ? (
              <Image source={{ uri: authorAvatar }} style={styles.postAvatar} />
            ) : (
              <View
                style={[
                  styles.postAvatarPlaceholder,
                  { backgroundColor: colors.surface },
                ]}
              >
                <Text
                  style={[styles.postAvatarText, { color: colors.primary }]}
                >
                  {authorName[0]?.toUpperCase()}
                </Text>
              </View>
            )}
            <View>
              <Text style={[styles.postUserName, { color: colors.text }]}>
                {authorName}
              </Text>
              <Text style={[styles.postTime, { color: colors.textTertiary }]}>
                {formatPostTime(post.created_at)}
              </Text>
            </View>
          </View>
          {!showRepostBadge && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={(e) => {
                e.stopPropagation?.();
                openPostMenu(post.id);
              }}
              hitSlop={12}
            >
              <Ionicons
                name="ellipsis-vertical"
                size={18}
                color={colors.textTertiary}
              />
            </TouchableOpacity>
          )}
        </View>

        {post.title ? (
          <Text
            style={[styles.postTitle, { color: colors.text }]}
            numberOfLines={2}
          >
            {post.title}
          </Text>
        ) : null}
        {post.content ? (
          <Text
            style={[styles.postBodyText, { color: colors.text }]}
            numberOfLines={4}
          >
            {post.content}
          </Text>
        ) : null}

        {img ? (
          <View
            style={[styles.postMediaWrap, { backgroundColor: colors.surface }]}
          >
            <Image
              source={{ uri: img }}
              style={styles.postMedia}
              resizeMode="cover"
            />
            {isVideo && (
              <>
                <View
                  style={[
                    styles.videoBadge,
                    { backgroundColor: "rgba(0,0,0,0.5)" },
                  ]}
                >
                  <Ionicons name="videocam" size={13} color="#fff" />
                  <Text style={styles.videoBadgeText}>Video</Text>
                </View>
                <View style={styles.playOverlay}>
                  <Ionicons name="play" size={24} color="#fff" />
                </View>
              </>
            )}
          </View>
        ) : null}

        <View style={[styles.postFooterRow, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={styles.postFooterItem}
            onPress={(e) => {
              e.stopPropagation?.();
              handleLike(post.id, isLiked);
            }}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isLiked ? "heart" : "heart-outline"}
              size={18}
              color={likeColor}
            />
            <Text style={[styles.postFooterText, { color: likeColor }]}>
              {post.like_count}
            </Text>
          </TouchableOpacity>
          <View style={styles.postFooterItem}>
            <Ionicons
              name="chatbubble-outline"
              size={18}
              color={colors.textTertiary}
            />
            <Text
              style={[styles.postFooterText, { color: colors.textTertiary }]}
            >
              {post.comment_count}
            </Text>
          </View>
          {/* ✅ repost count shown and colored when > 0 */}
          <View style={styles.postFooterItem}>
            <Ionicons
              name="repeat-outline"
              size={18}
              color={
                post.repost_count > 0 ? colors.primary : colors.textTertiary
              }
            />
            <Text
              style={[
                styles.postFooterText,
                {
                  color:
                    post.repost_count > 0
                      ? colors.primary
                      : colors.textTertiary,
                },
              ]}
            >
              {post.repost_count}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  };

  const renderMediaGrid = () => {
    if (isLoadingPosts)
      return (
        <View style={styles.loadingInline}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      );
    if (mediaPosts.length === 0)
      return (
        <EmptyPanel
          colors={colors}
          icon="images-outline"
          title="No Media Yet"
          subtitle="Photos and videos from your posts will appear here."
        />
      );
    const rows: UserPost[][] = [];
    for (let i = 0; i < mediaPosts.length; i += 3)
      rows.push(mediaPosts.slice(i, i + 3));
    return (
      <View style={styles.mediaGrid}>
        {rows.map((row, ri) => (
          <View key={ri} style={styles.mediaGridRow}>
            {row.map((post) => {
              const img = post.media_urls![0];
              const isVid = isVideoUrl(img);
              return (
                <TouchableOpacity
                  key={post.id}
                  style={[
                    styles.mediaGridCell,
                    { backgroundColor: colors.surface },
                  ]}
                  activeOpacity={0.85}
                  onPress={() => router.push(`/post/${post.id}` as any)}
                >
                  <Image
                    source={{ uri: img }}
                    style={styles.mediaGridImage}
                    resizeMode="cover"
                  />
                  {isVid && (
                    <View style={styles.mediaGridVideoBadge}>
                      <Ionicons name="play" size={10} color="#fff" />
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
                    style={[
                      styles.mediaGridCell,
                      { backgroundColor: "transparent" },
                    ]}
                  />
                ))}
          </View>
        ))}
      </View>
    );
  };

  if (!user || (!profile && isProfileLoading)) {
    return (
      <>
        <StatusBar
          barStyle={isDark ? "light-content" : "dark-content"}
          translucent
          backgroundColor="transparent"
        />
        <LinearGradient
          colors={gradientColors as any}
          locations={[0, 0.42, 1]}
          style={styles.gradient}
        >
          <SafeAreaView style={styles.safe} edges={["left", "right"]}>
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          </SafeAreaView>
        </LinearGradient>
      </>
    );
  }

  if (!user || !profile) return null;

  return (
    <>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        translucent
        backgroundColor="transparent"
      />
      <LinearGradient
        colors={gradientColors as any}
        locations={[0, 0.42, 1]}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.safe} edges={["left", "right"]}>
          <AppHeader
            title={profile.username || "Profile"}
            backgroundColor="transparent"
            onBack={() => router.back()}
            right={
              <TouchableOpacity
                style={[
                  styles.headerCircle,
                  {
                    backgroundColor: colors.card,
                    shadowOpacity: isDark ? 0.22 : 0.08,
                  },
                ]}
                onPress={() => router.push("/settings")}
                activeOpacity={0.85}
              >
                <Ionicons
                  name="ellipsis-horizontal"
                  size={22}
                  color={colors.text}
                />
              </TouchableOpacity>
            }
          />

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.scroll,
              { paddingBottom: bottomPad },
            ]}
          >
            <View
              style={[
                styles.profileCard,
                {
                  backgroundColor: colors.card,
                  shadowOpacity: isDark ? 0.22 : 0.06,
                },
              ]}
            >
              <View style={styles.profileTop}>
                {profile.avatar_url ? (
                  <Image
                    source={{ uri: profile.avatar_url }}
                    style={styles.avatar}
                  />
                ) : (
                  <View
                    style={[
                      styles.avatarPlaceholder,
                      { backgroundColor: colors.surface },
                    ]}
                  >
                    <Text
                      style={[
                        styles.avatarPlaceholderText,
                        { color: colors.primary },
                      ]}
                    >
                      {getInitial()}
                    </Text>
                  </View>
                )}
                <View style={styles.statsRow}>
                  {[
                    {
                      label: "Post",
                      value: userStats?.posts ?? 0,
                      route: null,
                    },
                    {
                      label: "Followers",
                      value: userStats?.followers ?? 0,
                      route: profile.username
                        ? `/user/${profile.username}/followers`
                        : null,
                    },
                    {
                      label: "Following",
                      value: userStats?.following ?? 0,
                      route: profile.username
                        ? `/user/${profile.username}/following`
                        : null,
                    },
                  ].map((s) =>
                    s.route ? (
                      <Pressable
                        key={s.label}
                        style={styles.statItem}
                        onPress={() => router.push(s.route as any)}
                      >
                        <Text
                          style={[styles.statValue, { color: colors.text }]}
                        >
                          {formatNumber(s.value)}
                        </Text>
                        <Text
                          style={[
                            styles.statLabel,
                            { color: colors.textTertiary },
                          ]}
                        >
                          {s.label}
                        </Text>
                      </Pressable>
                    ) : (
                      <View key={s.label} style={styles.statItem}>
                        <Text
                          style={[styles.statValue, { color: colors.text }]}
                        >
                          {formatNumber(s.value)}
                        </Text>
                        <Text
                          style={[
                            styles.statLabel,
                            { color: colors.textTertiary },
                          ]}
                        >
                          {s.label}
                        </Text>
                      </View>
                    ),
                  )}
                </View>
              </View>

              <View style={styles.nameRow}>
                <Text style={[styles.displayName, { color: colors.text }]}>
                  {profile.full_name || profile.username}
                </Text>
                {!!(profile as any).is_founder && <FounderBadge />}
              </View>

              {profile.bio ? (
                <Text
                  style={[styles.bio, { color: colors.textTertiary }]}
                  numberOfLines={3}
                >
                  {profile.bio}
                </Text>
              ) : (
                <Text
                  style={[
                    styles.bioPlaceholder,
                    { color: colors.textTertiary },
                  ]}
                >
                  Add a bio to tell people about you.
                </Text>
              )}

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => router.push("/profile/edit")}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.actionBtnText, { color: colors.text }]}>
                    Edit Profile
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={handleShareProfile}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.actionBtnText, { color: colors.text }]}>
                    Share profile
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.iconBtn,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                  activeOpacity={0.85}
                >
                  <Ionicons
                    name="person-outline"
                    size={18}
                    color={colors.text}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View
              style={[
                styles.tabsWrap,
                {
                  backgroundColor: colors.card,
                  shadowOpacity: isDark ? 0.22 : 0.05,
                },
              ]}
            >
              {profileTabs.map((tab) => {
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
                        active && { color: "#fff" },
                      ]}
                    >
                      {tab}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.contentArea}>
              {activeTab === "Activity" && (
                <>
                  {isLoadingReposts ? (
                    <View style={styles.loadingInline}>
                      <ActivityIndicator size="small" color={colors.primary} />
                    </View>
                  ) : repostedPosts.length > 0 ? (
                    <>
                      <Text
                        style={[
                          styles.sectionLabel,
                          { color: colors.textTertiary },
                        ]}
                      >
                        REPOSTED
                      </Text>
                      {repostedPosts.map((post) => renderPostCard(post, true))}
                    </>
                  ) : (
                    <EmptyPanel
                      colors={colors}
                      icon="repeat-outline"
                      title="No Reposts Yet"
                      subtitle="Posts you repost will appear here."
                    />
                  )}
                </>
              )}
              {activeTab === "Post" && (
                <>
                  {isLoadingPosts || isLoadingStats ? (
                    <View style={styles.loadingInline}>
                      <ActivityIndicator size="small" color={colors.primary} />
                    </View>
                  ) : userPosts.length > 0 ? (
                    userPosts.map((p) => renderPostCard(p, false))
                  ) : (
                    <EmptyPanel
                      colors={colors}
                      icon="document-text-outline"
                      title="No Posts Yet"
                      subtitle="Share your first post with the NebulaNet community."
                    />
                  )}
                </>
              )}
              {activeTab === "Tagged" && (
                <EmptyPanel
                  colors={colors}
                  icon="pricetag-outline"
                  title="No Tags Yet"
                  subtitle="Posts where you're tagged will appear here."
                />
              )}
              {activeTab === "Media" && renderMediaGrid()}
            </View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>

      <ShareSheet
        ref={shareSheetRef}
        title="Share Profile"
        url={`https://nebulanet.space/user/${profile.username}`}
        text={`Check out my profile on NebulaNet!${profile.full_name ? ` (${profile.full_name})` : ""}`}
        shareMessage={`Check out @${profile.username} on NebulaNet!`}
      />
    </>
  );
}

function EmptyPanel({
  icon,
  title,
  subtitle,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  colors: any;
}) {
  return (
    <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
      <View
        style={[styles.emptyIconCircle, { backgroundColor: colors.surface }]}
      >
        <Ionicons name={icon} size={24} color={colors.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.emptySubtitle, { color: colors.textTertiary }]}>
        {subtitle}
      </Text>
    </View>
  );
}

const GRID_GAP = 2;
const CELL_SIZE =
  (require("react-native").Dimensions.get("window").width - 36 - GRID_GAP * 2) /
  3;

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: { flex: 1, backgroundColor: "transparent" },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingInline: { paddingVertical: 16, alignItems: "center" },
  headerCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 3,
  },
  scroll: { paddingHorizontal: 18, paddingBottom: 24 },
  profileCard: {
    borderRadius: 26,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 18,
    elevation: 2,
  },
  profileTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 12,
  },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarPlaceholderText: { fontSize: 20, fontWeight: "800" },
  statsRow: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingRight: 4,
  },
  statItem: { alignItems: "center", flex: 1 },
  statValue: { fontSize: 16, fontWeight: "900" },
  statLabel: { fontSize: 12, marginTop: 2, fontWeight: "700" },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  displayName: { fontSize: 16, fontWeight: "900", marginTop: 2 },
  bio: { fontSize: 12.5, lineHeight: 18, marginBottom: 12 },
  bioPlaceholder: { fontSize: 12.5, lineHeight: 18, marginBottom: 12 },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  actionBtn: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnText: { fontSize: 13, fontWeight: "800" },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  tabsWrap: {
    borderRadius: 22,
    padding: 6,
    flexDirection: "row",
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 16,
    elevation: 2,
    marginBottom: 14,
  },
  tab: {
    flex: 1,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  tabText: { fontSize: 13, fontWeight: "800" },
  contentArea: { gap: 12 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    paddingHorizontal: 4,
  },
  repostBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginBottom: 10,
  },
  repostBadgeText: { fontSize: 12, fontWeight: "700" },
  emptyCard: {
    borderRadius: 22,
    paddingVertical: 24,
    paddingHorizontal: 18,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 16,
    elevation: 2,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 6,
    textAlign: "center",
  },
  emptySubtitle: { fontSize: 13, lineHeight: 18, textAlign: "center" },
  postCard: {
    borderRadius: 22,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 16,
    elevation: 2,
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  postHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  postAvatar: { width: 34, height: 34, borderRadius: 17 },
  postAvatarPlaceholder: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  postAvatarText: { fontSize: 14, fontWeight: "900" },
  postUserName: { fontSize: 13.5, fontWeight: "900" },
  postTime: { fontSize: 11.5, marginTop: 2, fontWeight: "700" },
  postTitle: { fontSize: 14, fontWeight: "800", marginBottom: 6 },
  postBodyText: { fontSize: 13.5, lineHeight: 19, marginBottom: 10 },
  postMediaWrap: {
    width: "100%",
    height: 200,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 12,
    position: "relative",
  },
  postMedia: { width: "100%", height: "100%" },
  videoBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  videoBadgeText: { color: "#fff", fontSize: 12, fontWeight: "900" },
  playOverlay: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: 48,
    height: 48,
    marginLeft: -24,
    marginTop: -24,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
  },
  postFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  postFooterItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  postFooterText: { fontSize: 12.5, fontWeight: "800" },
  mediaGrid: { gap: GRID_GAP, borderRadius: 18, overflow: "hidden" },
  mediaGridRow: { flexDirection: "row", gap: GRID_GAP },
  mediaGridCell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    overflow: "hidden",
    position: "relative",
  },
  mediaGridImage: { width: "100%", height: "100%" },
  mediaGridVideoBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 3,
  },
});
