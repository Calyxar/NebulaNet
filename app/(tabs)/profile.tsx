// app/(tabs)/profile.tsx — COMPLETED + UPDATED (theme + dark mode)
import AppHeader from "@/components/navigation/AppHeader";
import { getTabBarHeight } from "@/components/navigation/CurvedTabBar";
import { shareProfileLink } from "@/lib/shareProfile";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
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

export default function ProfileTabScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { user, profile, isProfileLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<ProfileTab>("Activity");

  const profileTabs: ProfileTab[] = useMemo(
    () => ["Activity", "Post", "Tagged", "Media"],
    [],
  );

  const bottomPad = useMemo(
    () => getTabBarHeight(insets.bottom) + 12,
    [insets.bottom],
  );

  const { data: userPosts = [], isLoading: isLoadingPosts } = useQuery({
    queryKey: ["user-posts", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("posts")
        .select(
          `
          id,
          title,
          content,
          media_urls,
          like_count,
          comment_count,
          share_count,
          created_at
        `,
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data as UserPost[]) || [];
    },
    enabled: !!user?.id,
  });

  const { data: userStats, isLoading: isLoadingStats } = useQuery({
    queryKey: ["user-stats", user?.id],
    queryFn: async (): Promise<UserStats> => {
      if (!user?.id) return { posts: 0, followers: 0, following: 0 };

      const { count: postsCount } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      const { count: followersCount } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", user.id);

      const { count: followingCount } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", user.id);

      return {
        posts: postsCount || 0,
        followers: followersCount || 0,
        following: followingCount || 0,
      };
    },
    enabled: !!user?.id,
  });

  const gradientColors = isDark
    ? [colors.background, colors.background, colors.background]
    : ["#DCEBFF", "#EEF4FF", "#FFFFFF"];

  const formatNumber = (num: number) => {
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return `${num}`;
  };

  const handleEditProfile = () => router.push("../profile/edit");
  const handleSettings = () => router.push("../settings");

  const handleShareProfile = async () => {
    try {
      await shareProfileLink({
        username: profile?.username,
        userId: user!.id,
        fullName: profile?.full_name,
      });
    } catch {
      const username = profile?.username || "user";
      await Share.share({
        message: `Check out my NebulaNet profile: @${username}`,
      });
    }
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
      if (diffH < 24) return `${diffH} hr ago`;
      const diffD = Math.floor(diffH / 24);
      return `${diffD} days ago`;
    } catch {
      return "Recently";
    }
  };

  const renderPostCard = (post: UserPost) => {
    const img = post.media_urls?.[0];

    return (
      <View
        key={post.id}
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

          <TouchableOpacity activeOpacity={0.8}>
            <Ionicons
              name="ellipsis-vertical"
              size={18}
              color={colors.textTertiary}
            />
          </TouchableOpacity>
        </View>

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
            <Ionicons name="heart-outline" size={18} color={colors.text} />
            <Text style={[styles.postFooterText, { color: colors.text }]}>
              {post.like_count}
            </Text>
          </View>
          <View style={styles.postFooterItem}>
            <Ionicons name="chatbubble-outline" size={18} color={colors.text} />
            <Text style={[styles.postFooterText, { color: colors.text }]}>
              {post.comment_count}
            </Text>
          </View>
          <View style={styles.postFooterItem}>
            <Ionicons name="arrow-redo-outline" size={18} color={colors.text} />
            <Text style={[styles.postFooterText, { color: colors.text }]}>
              {post.share_count}
            </Text>
          </View>
        </View>
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
                onPress={handleSettings}
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
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: colors.text }]}>
                      {formatNumber(userStats?.posts || 0)}
                    </Text>
                    <Text
                      style={[styles.statLabel, { color: colors.textTertiary }]}
                    >
                      Post
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: colors.text }]}>
                      {formatNumber(userStats?.followers || 0)}
                    </Text>
                    <Text
                      style={[styles.statLabel, { color: colors.textTertiary }]}
                    >
                      Followers
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: colors.text }]}>
                      {formatNumber(userStats?.following || 0)}
                    </Text>
                    <Text
                      style={[styles.statLabel, { color: colors.textTertiary }]}
                    >
                      Following
                    </Text>
                  </View>
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
                    styles.primaryButton,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={handleEditProfile}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[styles.primaryButtonText, { color: colors.text }]}
                  >
                    Edit Profile
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.secondaryButton,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={handleShareProfile}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[styles.secondaryButtonText, { color: colors.text }]}
                  >
                    Share profile
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.iconButton,
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
                        active && { color: "#FFFFFF" },
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
                  subtitle="Posts where you’re tagged will appear here."
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 18,
    elevation: 2,
    marginBottom: 14,
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
  primaryButton: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: { fontSize: 13, fontWeight: "800" },
  secondaryButton: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: { fontSize: 13, fontWeight: "800" },
  iconButton: {
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
