// app/(tabs)/profile.tsx
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { Link, router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
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
  likes_count: number;
  comments_count: number;
  shares_count: number;
  created_at: string;
}

interface UserStats {
  posts: number;
  followers: number;
  following: number;
}

const profileTabs = ["Post", "Tagged", "Media", "Saved"];

export default function ProfileTabScreen() {
  const { user, profile, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("Post");

  // Fetch user posts
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
          likes_count,
          comments_count,
          shares_count,
          created_at
        `
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as UserPost[];
    },
    enabled: !!user,
  });

  // Fetch user stats
  const { data: userStats } = useQuery({
    queryKey: ["user-stats", user?.id],
    queryFn: async (): Promise<UserStats> => {
      if (!user) return { posts: 0, followers: 0, following: 0 };

      // Get posts count
      const { count: postsCount } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      // Get followers count
      const { count: followersCount } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", user.id);

      // Get following count
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

  const stats = [
    { label: "Post", value: userStats?.posts.toString() || "0" },
    { label: "Followers", value: userStats?.followers.toString() || "0" },
    { label: "Following", value: userStats?.following.toString() || "0" },
  ];

  const handleEditProfile = () => {
    // Use relative path from tabs
    router.push("../profile/edit");
  };

  const handleSettings = () => {
    router.push("./settings");
  };

  const handleLogout = () => {
    logout.mutate();
  };

  const handleCreatePost = () => {
    router.push("../create");
  };

  const renderPostItem = (post: UserPost) => (
    <View key={post.id} style={styles.postItem}>
      <View style={styles.postHeader}>
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

      <Text style={styles.postTitle} numberOfLines={2}>
        {post.title}
      </Text>
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
        <TouchableOpacity style={styles.postAction}>
          <Ionicons name="heart-outline" size={20} color="#666" />
          <Text style={styles.postActionText}>{post.likes_count}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.postAction}>
          <Ionicons name="chatbubble-outline" size={20} color="#666" />
          <Text style={styles.postActionText}>{post.comments_count}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.postAction}>
          <Ionicons name="share-outline" size={20} color="#666" />
          <Text style={styles.postActionText}>{post.shares_count}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (!user || !profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with settings */}
        <View style={styles.header}>
          <Text style={styles.time}>
            {new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={handleCreatePost}
            >
              <Ionicons name="add-circle-outline" size={24} color="#007AFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={handleSettings}
            >
              <Ionicons name="settings-outline" size={24} color="#000" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Profile Header */}
        <View style={styles.profileHeader}>
          {/* Profile Picture and Info */}
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

            <View style={styles.profileInfo}>
              <Text style={styles.username}>@{profile.username}</Text>
              <View style={styles.statsContainer}>
                {stats.map((stat) => (
                  <View key={stat.label} style={styles.statItem}>
                    <Text style={styles.statValue}>{stat.value}</Text>
                    <Text style={styles.statLabel}>{stat.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* User Info */}
          <View style={styles.userInfo}>
            <Text style={styles.displayName}>
              {profile.full_name || profile.username}
            </Text>
            {profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}
            {profile.email && (
              <Text style={styles.email}>
                <Ionicons name="mail-outline" size={14} color="#666" />{" "}
                {profile.email}
              </Text>
            )}
          </View>

          {/* Profile Actions */}
          <View style={styles.profileActions}>
            <TouchableOpacity
              style={styles.editButton}
              onPress={handleEditProfile}
            >
              <Ionicons name="create-outline" size={18} color="#007AFF" />
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
            >
              <Ionicons name="log-out-outline" size={18} color="#ff3b30" />
              <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Profile Tabs */}
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

        {/* Content based on active tab */}
        {activeTab === "Post" && (
          <View style={styles.contentSection}>
            {isLoadingPosts ? (
              <ActivityIndicator size="small" color="#007AFF" />
            ) : userPosts && userPosts.length > 0 ? (
              userPosts.map(renderPostItem)
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="document-text-outline" size={64} color="#ccc" />
                <Text style={styles.emptyTitle}>No Posts Yet</Text>
                <Text style={styles.emptyDescription}>
                  Share your first post with the NebulaNet community
                </Text>
                <TouchableOpacity
                  style={styles.createPostButton}
                  onPress={handleCreatePost}
                >
                  <Text style={styles.createPostButtonText}>
                    Create First Post
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {activeTab === "Saved" && (
          <View style={styles.emptyTab}>
            <Ionicons name="bookmark-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No Saved Posts</Text>
            <Text style={styles.emptyDescription}>
              Posts you save will appear here
            </Text>
            <Link href="/(tabs)/home" asChild>
              <TouchableOpacity style={styles.exploreButton}>
                <Text style={styles.exploreButtonText}>Explore Posts</Text>
              </TouchableOpacity>
            </Link>
          </View>
        )}

        {activeTab === "Tagged" && (
          <View style={styles.emptyTab}>
            <Ionicons name="people-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No Tags Yet</Text>
            <Text style={styles.emptyDescription}>
              When others mention you in posts, they&apos;ll appear here
            </Text>
          </View>
        )}

        {activeTab === "Media" && (
          <View style={styles.emptyTab}>
            <Ionicons name="images-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No Media</Text>
            <Text style={styles.emptyDescription}>
              Photos and videos from your posts will appear here
            </Text>
          </View>
        )}

        {/* Account Info */}
        <View style={styles.accountInfo}>
          <Text style={styles.accountInfoTitle}>Account Information</Text>

          <View style={styles.infoItem}>
            <Ionicons name="person-circle-outline" size={20} color="#666" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Member Since</Text>
              <Text style={styles.infoValue}>
                {new Date(profile.created_at || Date.now()).toLocaleDateString(
                  "en-US",
                  {
                    year: "numeric",
                    month: "long",
                  }
                )}
              </Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <Ionicons name="shield-checkmark-outline" size={20} color="#666" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Account Status</Text>
              <Text
                style={[
                  styles.infoValue,
                  { color: profile.email_verified ? "#34c759" : "#ff9500" },
                ]}
              >
                {profile.email_verified ? "Verified" : "Unverified"}
              </Text>
            </View>
            {!profile.email_verified && (
              <TouchableOpacity style={styles.verifyButton}>
                <Text style={styles.verifyButtonText}>Verify</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={styles.viewAllButton}
            onPress={() => router.push("./settings")}
          >
            <Text style={styles.viewAllButtonText}>View All Settings</Text>
            <Ionicons name="chevron-forward" size={20} color="#007AFF" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  time: {
    fontSize: 17,
    fontWeight: "600",
  },
  headerActions: {
    flexDirection: "row",
    gap: 12,
  },
  headerButton: {
    padding: 4,
  },
  profileHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e1e1e1",
  },
  profileTopRow: {
    flexDirection: "row",
    marginBottom: 20,
  },
  profileImageContainer: {
    marginRight: 20,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: "#007AFF",
  },
  profileImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
  },
  profileImageText: {
    fontSize: 32,
    fontWeight: "bold",
    color: "white",
  },
  profileInfo: {
    flex: 1,
    justifyContent: "center",
  },
  username: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 12,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
  },
  statLabel: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  userInfo: {
    marginBottom: 20,
  },
  displayName: {
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 8,
  },
  bio: {
    fontSize: 15,
    color: "#333",
    lineHeight: 22,
    marginBottom: 8,
  },
  email: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  profileActions: {
    flexDirection: "row",
    gap: 12,
  },
  editButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0f8ff",
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#007AFF",
    gap: 8,
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#007AFF",
  },
  logoutButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff0f0",
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ff3b30",
    gap: 8,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ff3b30",
  },
  tabsContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e1e1e1",
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: "center",
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: "#007AFF",
  },
  tabText: {
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
  activeTabText: {
    color: "#007AFF",
    fontWeight: "600",
  },
  contentSection: {
    padding: 16,
  },
  postItem: {
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  postHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  postUser: {
    fontSize: 16,
    fontWeight: "600",
  },
  postTime: {
    fontSize: 14,
    color: "#666",
  },
  postTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#000",
  },
  postContent: {
    fontSize: 16,
    color: "#333",
    marginBottom: 16,
    lineHeight: 22,
  },
  postImage: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    marginBottom: 16,
  },
  postActions: {
    flexDirection: "row",
    justifyContent: "space-around",
    borderTopWidth: 1,
    borderTopColor: "#e1e1e1",
    paddingTop: 12,
  },
  postAction: {
    flexDirection: "row",
    alignItems: "center",
  },
  postActionText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 6,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  emptyTab: {
    alignItems: "center",
    justifyContent: "center",
    padding: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  createPostButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createPostButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },
  exploreButton: {
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  exploreButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#007AFF",
  },
  accountInfo: {
    padding: 16,
    backgroundColor: "#f9f9f9",
    marginTop: 16,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 20,
  },
  accountInfoTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "500",
    color: "#000",
  },
  verifyButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  verifyButtonText: {
    fontSize: 12,
    color: "white",
    fontWeight: "500",
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#e1e1e1",
    marginTop: 8,
  },
  viewAllButtonText: {
    fontSize: 16,
    color: "#007AFF",
    fontWeight: "500",
  },
});
