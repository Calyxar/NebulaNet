// app/profile/index.tsx
import { useAuth } from "@/hooks/useAuth";
import { useMyPrivacySettings } from "@/hooks/useMyPrivacySettings";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import React, { useState } from "react";
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
import { SafeAreaView } from "react-native-safe-area-context";

interface UserPost {
  id: string;
  title: string;
  content: string;
  media_urls: string[];
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

const profileTabs = ["Activity", "Post", "Tagged", "Media"];

export default function ProfileScreen() {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState("Activity");

  const { data: privacy, isLoading: privacyLoading } = useMyPrivacySettings();

  const { data: userPosts, isLoading: isLoadingPosts } = useQuery({
    queryKey: ["user-posts", user?.id],
    queryFn: async () => {
      if (!user) return [];

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
      return data as UserPost[];
    },
    enabled: !!user,
  });

  const { data: userStats } = useQuery({
    queryKey: ["user-stats", user?.id],
    queryFn: async (): Promise<UserStats> => {
      if (!user) return { posts: 0, followers: 0, following: 0 };

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
    enabled: !!user,
  });

  const formatNumber = (num: number) => {
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const handleEditProfile = () => {
    router.push("./edit");
  };

  const handleSettings = () => {
    router.push("../settings");
  };

  const handleShareProfile = async () => {
    try {
      await Share.share({
        message: `Check out my NebulaNet profile: @${profile?.username}`,
      });
    } catch (error) {
      console.error("Error sharing profile:", error);
    }
  };

  const renderPostItem = (post: UserPost) => (
    <View key={post.id} style={styles.postItem}>
      <View style={styles.postHeader}>
        <View style={styles.postHeaderLeft}>
          {profile?.avatar_url ? (
            <Image
              source={{ uri: profile.avatar_url }}
              style={styles.postAvatar}
            />
          ) : (
            <View style={styles.postAvatarPlaceholder}>
              <Text style={styles.postAvatarText}>
                {profile?.username?.charAt(0).toUpperCase() || "U"}
              </Text>
            </View>
          )}
          <View>
            <Text style={styles.postUser}>
              {profile?.full_name || profile?.username}
            </Text>
            <Text style={styles.postTime}>
              {new Date(post.created_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </Text>
          </View>
        </View>
        <TouchableOpacity>
          <Ionicons name="ellipsis-vertical" size={20} color="#666" />
        </TouchableOpacity>
      </View>

      {post.title && (
        <Text style={styles.postTitle} numberOfLines={2}>
          {post.title}
        </Text>
      )}
      <Text style={styles.postContent} numberOfLines={3}>
        {post.content}
      </Text>

      {post.media_urls?.[0] && (
        <Image
          source={{ uri: post.media_urls[0] }}
          style={styles.postImage}
          resizeMode="cover"
        />
      )}

      <View style={styles.postActions}>
        <View style={styles.postAction}>
          <Ionicons name="heart-outline" size={20} color="#666" />
          <Text style={styles.postActionText}>{post.like_count}</Text>
        </View>
        <View style={styles.postAction}>
          <Ionicons name="chatbubble-outline" size={20} color="#666" />
          <Text style={styles.postActionText}>{post.comment_count}</Text>
        </View>
        <View style={styles.postAction}>
          <Ionicons name="share-outline" size={20} color="#666" />
          <Text style={styles.postActionText}>{post.share_count}</Text>
        </View>
      </View>
    </View>
  );

  if (!user || !profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7C3AED" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#E8EAF6" />
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>@{profile.username}</Text>

          <TouchableOpacity style={styles.menuButton} onPress={handleSettings}>
            <Ionicons name="ellipsis-horizontal" size={24} color="#000" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.profileCard}>
            <View style={styles.profileTopRow}>
              <View style={styles.profileImageContainer}>
                {profile.avatar_url ? (
                  <Image
                    source={{ uri: profile.avatar_url }}
                    style={styles.profileImage}
                  />
                ) : (
                  <View style={styles.profileImagePlaceholder}>
                    <Text style={styles.profileImageText}>
                      {profile.username?.charAt(0).toUpperCase() || "U"}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.statsRow}>
                {/* Posts */}
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {formatNumber(userStats?.posts || 0)}
                  </Text>
                  <Text style={styles.statLabel}>Post</Text>
                </View>

                {/* Followers */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  disabled={privacyLoading || !!privacy?.hide_followers}
                  onPress={() => router.push("./followers")}
                  style={[
                    styles.statItem,
                    (privacyLoading || privacy?.hide_followers) &&
                      styles.statItemDisabled,
                  ]}
                >
                  <Text style={styles.statValue}>
                    {privacyLoading
                      ? "—"
                      : privacy?.hide_followers
                        ? "—"
                        : formatNumber(userStats?.followers || 0)}
                  </Text>

                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Text style={styles.statLabel}>Followers</Text>
                    {!!privacy?.hide_followers && (
                      <Ionicons
                        name="lock-closed-outline"
                        size={14}
                        color="#7C3AED"
                      />
                    )}
                  </View>
                </TouchableOpacity>

                {/* Following */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  disabled={privacyLoading || !!privacy?.hide_following}
                  onPress={() => router.push("./following")}
                  style={[
                    styles.statItem,
                    (privacyLoading || privacy?.hide_following) &&
                      styles.statItemDisabled,
                  ]}
                >
                  <Text style={styles.statValue}>
                    {privacyLoading
                      ? "—"
                      : privacy?.hide_following
                        ? "—"
                        : formatNumber(userStats?.following || 0)}
                  </Text>

                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Text style={styles.statLabel}>Following</Text>
                    {!!privacy?.hide_following && (
                      <Ionicons
                        name="lock-closed-outline"
                        size={14}
                        color="#7C3AED"
                      />
                    )}
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.displayName}>
              {profile.full_name || profile.username}
            </Text>
            {profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.editButton}
                onPress={handleEditProfile}
              >
                <Text style={styles.editButtonText}>Edit Profile</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.shareButton}
                onPress={handleShareProfile}
              >
                <Text style={styles.shareButtonText}>Share profile</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.addFriendButton}>
                <Ionicons name="person-add-outline" size={18} color="#000" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.tabsContainer}>
            {profileTabs.map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, activeTab === tab && styles.activeTab]}
                onPress={() => setActiveTab(tab)}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === tab && styles.activeTabText,
                  ]}
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.contentSection}>
            {activeTab === "Activity" && (
              <View style={styles.emptyState}>
                <Ionicons name="pulse-outline" size={64} color="#C5CAE9" />
                <Text style={styles.emptyTitle}>No Activity Yet</Text>
                <Text style={styles.emptyDescription}>
                  Your recent activity will appear here
                </Text>
              </View>
            )}

            {activeTab === "Post" && (
              <>
                {isLoadingPosts ? (
                  <ActivityIndicator size="small" color="#7C3AED" />
                ) : userPosts && userPosts.length > 0 ? (
                  userPosts.map(renderPostItem)
                ) : (
                  <View style={styles.emptyState}>
                    <Ionicons
                      name="document-text-outline"
                      size={64}
                      color="#C5CAE9"
                    />
                    <Text style={styles.emptyTitle}>No Posts Yet</Text>
                    <Text style={styles.emptyDescription}>
                      Share your first post with the NebulaNet community
                    </Text>
                  </View>
                )}
              </>
            )}

            {activeTab === "Tagged" && (
              <View style={styles.emptyState}>
                <Ionicons name="pricetag-outline" size={64} color="#C5CAE9" />
                <Text style={styles.emptyTitle}>No Tags Yet</Text>
                <Text style={styles.emptyDescription}>
                  Posts where you&apos;re tagged will appear here
                </Text>
              </View>
            )}

            {activeTab === "Media" && (
              <View style={styles.emptyState}>
                <Ionicons name="images-outline" size={64} color="#C5CAE9" />
                <Text style={styles.emptyTitle}>No Media</Text>
                <Text style={styles.emptyDescription}>
                  Photos and videos from your posts will appear here
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#E8EAF6" },
  scrollView: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#E8EAF6",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 16, fontWeight: "600", color: "#000" },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  profileCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
  },
  profileTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  profileImageContainer: { marginRight: 20 },
  profileImage: { width: 80, height: 80, borderRadius: 40 },
  profileImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#7C3AED",
    justifyContent: "center",
    alignItems: "center",
  },
  profileImageText: { fontSize: 32, fontWeight: "bold", color: "#FFFFFF" },

  statsRow: { flex: 1, flexDirection: "row", justifyContent: "space-around" },
  statItem: { alignItems: "center" },
  statItemDisabled: { opacity: 0.55 },
  statValue: { fontSize: 20, fontWeight: "700", color: "#000" },
  statLabel: { fontSize: 13, color: "#666", marginTop: 4 },

  displayName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
    marginBottom: 8,
  },
  bio: { fontSize: 14, color: "#666", lineHeight: 20, marginBottom: 16 },

  actionButtons: { flexDirection: "row", gap: 8 },
  editButton: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  editButtonText: { fontSize: 14, fontWeight: "600", color: "#000" },
  shareButton: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  shareButtonText: { fontSize: 14, fontWeight: "600", color: "#000" },
  addFriendButton: {
    backgroundColor: "#F5F5F5",
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  tabsContainer: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 25,
    padding: 4,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 22 },
  activeTab: { backgroundColor: "#7C3AED" },
  tabText: { fontSize: 14, color: "#666", fontWeight: "500" },
  activeTabText: { color: "#FFFFFF", fontWeight: "600" },

  contentSection: { paddingHorizontal: 16, paddingBottom: 20 },

  postItem: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  postHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  postHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  postAvatar: { width: 40, height: 40, borderRadius: 20 },
  postAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#7C3AED",
    justifyContent: "center",
    alignItems: "center",
  },
  postAvatarText: { fontSize: 16, fontWeight: "bold", color: "#FFFFFF" },
  postUser: { fontSize: 15, fontWeight: "600", color: "#000" },
  postTime: { fontSize: 12, color: "#999", marginTop: 2 },

  postTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    color: "#000",
  },
  postContent: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
    lineHeight: 20,
  },
  postImage: { width: "100%", height: 200, borderRadius: 12, marginBottom: 12 },

  postActions: {
    flexDirection: "row",
    gap: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  postAction: { flexDirection: "row", alignItems: "center", gap: 6 },
  postActionText: { fontSize: 14, color: "#666" },

  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: "#9FA8DA",
    textAlign: "center",
    lineHeight: 20,
  },
});
