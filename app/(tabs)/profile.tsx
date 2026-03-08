// app/(tabs)/profile.tsx — COMPLETED + UPDATED ✅
// ✅ Removed orderBy("created_at_ts") — silently returned 0 results on migrated posts
// ✅ JS-side sort instead — works regardless of timestamp field
// ✅ Default tab "Post"
// ✅ Full theme support + LinearGradient

import AppHeader from "@/components/navigation/AppHeader";
import { getTabBarHeight } from "@/components/navigation/CurvedTabBar";
import { db } from "@/lib/firebase";
import { shareProfileLink } from "@/lib/shareProfile";
import { useAuth } from "@/providers/AuthProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { useActionSheet } from "@expo/react-native-action-sheet";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import {
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  query,
  Timestamp,
  where,
} from "firebase/firestore";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Share,
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
  created_at: string;
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
  if (v instanceof Timestamp) return v.toDate().toISOString();
  if (typeof v?.toDate === "function") return v.toDate().toISOString();
  return new Date().toISOString();
}

export default function ProfileTabScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { showActionSheetWithOptions } = useActionSheet();
  const { colors, isDark } = useTheme();
  const { user, profile, isProfileLoading } = useAuth();

  const uid = user?.uid ?? null;

  // ✅ Default to Post so posts are immediately visible
  const [activeTab, setActiveTab] = useState<ProfileTab>("Post");

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

      console.log("🔍 Profile posts query — uid:", uid);

      // ✅ No orderBy — migrated posts may lack created_at_ts field.
      // Firestore silently returns 0 results when orderBy field is missing.
      const snap = await getDocs(
        query(collection(db, "posts"), where("user_id", "==", uid)),
      );

      console.log("📦 Posts found:", snap.size);

      return (
        snap.docs
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
              created_at: tsToIso(x.created_at_ts ?? x.created_at),
            } as UserPost;
          })
          // ✅ Sort newest first in JS — works for both ISO strings and Timestamps
          .sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime(),
          )
      );
    },
  });

  const { data: userStats, isLoading: isLoadingStats } = useQuery({
    queryKey: ["user-stats", uid],
    enabled: !!uid,
    queryFn: async (): Promise<UserStats> => {
      if (!uid) return { posts: 0, followers: 0, following: 0 };

      const [postsAgg, followersAgg, followingAgg] = await Promise.all([
        getCountFromServer(
          query(collection(db, "posts"), where("user_id", "==", uid)),
        ),
        getCountFromServer(
          query(collection(db, "follows"), where("following_id", "==", uid)),
        ),
        getCountFromServer(
          query(collection(db, "follows"), where("follower_id", "==", uid)),
        ),
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
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffH = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffH < 1) return "Just now";
      if (diffH < 24) return `${diffH}h ago`;
      const diffD = Math.floor(diffH / 24);
      return `${diffD}d ago`;
    } catch {
      return "Recently";
    }
  };

  const handleShareProfile = async () => {
    try {
      await shareProfileLink({
        username: profile?.username,
        userId: profile?.id ?? uid ?? "",
        fullName: profile?.full_name,
      });
    } catch {
      await Share.share({
        message: `Check out my NebulaNet profile: @${profile?.username || "user"}`,
      });
    }
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
              const ref = doc(db, "posts", postId);
              const snap = await getDoc(ref);
              if (!snap.exists()) return;
              const d = snap.data() as any;
              if (d.user_id !== uid) {
                Alert.alert(
                  "Not allowed",
                  "You can only delete your own posts.",
                );
                return;
              }
              await deleteDoc(ref);
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

  const renderPostCard = (post: UserPost) => {
    const img = post.media_urls?.[0];
    return (
      <Pressable
        key={post.id}
        onPress={() => router.push(`/post/${post.id}` as any)}
        style={[
          styles.postCard,
          { backgroundColor: colors.card, shadowOpacity: isDark ? 0.22 : 0.05 },
        ]}
      >
        <View style={styles.postHeader}>
          <View style={styles.postHeaderLeft}>
            {profile?.avatar_url ? (
              <Image
                source={{ uri: profile.avatar_url }}
                style={styles.postAvatar}
              />
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
                  {getInitial()}
                </Text>
              </View>
            )}
            <View>
              <Text style={[styles.postUserName, { color: colors.text }]}>
                {profile?.full_name || profile?.username || "User"}
              </Text>
              <Text style={[styles.postTime, { color: colors.textTertiary }]}>
                {formatPostTime(post.created_at)}
              </Text>
            </View>
          </View>

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
          <Image
            source={{ uri: img }}
            style={[styles.postMedia, { backgroundColor: colors.surface }]}
            resizeMode="cover"
          />
        ) : null}

        <View style={[styles.postFooterRow, { borderTopColor: colors.border }]}>
          <View style={styles.postFooterItem}>
            <Ionicons
              name="heart-outline"
              size={18}
              color={colors.textTertiary}
            />
            <Text
              style={[styles.postFooterText, { color: colors.textTertiary }]}
            >
              {post.like_count}
            </Text>
          </View>
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
          <View style={styles.postFooterItem}>
            <Ionicons
              name="arrow-redo-outline"
              size={18}
              color={colors.textTertiary}
            />
            <Text
              style={[styles.postFooterText, { color: colors.textTertiary }]}
            >
              {post.share_count}
            </Text>
          </View>
        </View>
      </Pressable>
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
            {/* Profile Card */}
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
                    { label: "Post", value: userStats?.posts ?? 0 },
                    { label: "Followers", value: userStats?.followers ?? 0 },
                    { label: "Following", value: userStats?.following ?? 0 },
                  ].map((s) => (
                    <View key={s.label} style={styles.statItem}>
                      <Text style={[styles.statValue, { color: colors.text }]}>
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
                  ))}
                </View>
              </View>

              <Text style={[styles.displayName, { color: colors.text }]}>
                {profile.full_name || profile.username}
              </Text>

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

            {/* Tabs */}
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

            {/* Content */}
            <View style={styles.contentArea}>
              {activeTab === "Activity" && (
                <EmptyPanel
                  colors={colors}
                  icon="pulse-outline"
                  title="No Activity Yet"
                  subtitle="Your recent activity will appear here."
                />
              )}

              {activeTab === "Post" && (
                <>
                  {isLoadingPosts || isLoadingStats ? (
                    <View style={styles.loadingInline}>
                      <ActivityIndicator size="small" color={colors.primary} />
                    </View>
                  ) : userPosts.length > 0 ? (
                    userPosts.map(renderPostCard)
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

              {activeTab === "Media" && (
                <EmptyPanel
                  colors={colors}
                  icon="images-outline"
                  title="No Media"
                  subtitle="Photos and videos from your posts will appear here."
                />
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
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
  displayName: {
    fontSize: 16,
    fontWeight: "900",
    marginTop: 2,
    marginBottom: 6,
  },
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
  postMedia: { width: "100%", height: 180, borderRadius: 16, marginBottom: 12 },
  postFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  postFooterItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  postFooterText: { fontSize: 12.5, fontWeight: "800" },
});
