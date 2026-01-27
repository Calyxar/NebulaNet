// app/user/[username].tsx
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
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

interface UserProfile {
  id: string;
  username: string;
  full_name: string;
  bio: string;
  avatar_url: string;
  location?: string;
}

interface UserStats {
  posts: number;
  followers: number;
  following: number;
}

const profileTabs = ["Activity", "Post", "Tagged", "Media"];

export default function UserProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const [isFollowing, setIsFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState("Activity");

  // Fetch user profile
  const { data: profile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ["user-profile", username],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("username", username?.replace("@", ""))
        .single();

      if (error) throw error;
      return data as UserProfile;
    },
    enabled: !!username,
  });

  // Fetch user stats
  const { data: userStats } = useQuery({
    queryKey: ["user-stats", profile?.id],
    queryFn: async (): Promise<UserStats> => {
      if (!profile) return { posts: 0, followers: 0, following: 0 };

      const { count: postsCount } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", profile.id);

      const { count: followersCount } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", profile.id);

      const { count: followingCount } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", profile.id);

      return {
        posts: postsCount || 0,
        followers: followersCount || 0,
        following: followingCount || 0,
      };
    },
    enabled: !!profile,
  });

  // Fetch user posts
  const { data: userPosts, isLoading: isLoadingPosts } = useQuery({
    queryKey: ["user-posts", profile?.id],
    queryFn: async () => {
      if (!profile) return [];

      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!profile,
  });

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  const handleFollowToggle = async () => {
    setIsFollowing(!isFollowing);
    // TODO: Implement follow/unfollow logic with Supabase
  };

  const handleShareProfile = async () => {
    try {
      await Share.share({
        message: `Check out @${username} on NebulaNet!`,
      });
    } catch (error) {
      console.error("Error sharing profile:", error);
    }
  };

  if (isLoadingProfile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7C3AED" />
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>User Not Found</Text>
          <View style={styles.menuButton} />
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="person-outline" size={64} color="#C5CAE9" />
          <Text style={styles.emptyTitle}>User Not Found</Text>
          <Text style={styles.emptyDescription}>
            This user doesn&apos;t exist or has been deleted.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#E8EAF6" />
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>@{profile.username}</Text>
          <TouchableOpacity style={styles.menuButton}>
            <Ionicons name="ellipsis-horizontal" size={24} color="#000" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Card */}
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
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {formatNumber(userStats?.posts || 0)}
                  </Text>
                  <Text style={styles.statLabel}>Post</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {formatNumber(userStats?.followers || 0)}
                  </Text>
                  <Text style={styles.statLabel}>Followers</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {formatNumber(userStats?.following || 0)}
                  </Text>
                  <Text style={styles.statLabel}>Following</Text>
                </View>
              </View>
            </View>

            <Text style={styles.displayName}>
              {profile.full_name || profile.username}
            </Text>
            {profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[
                  styles.followButton,
                  isFollowing && styles.followingButton,
                ]}
                onPress={handleFollowToggle}
              >
                <Text
                  style={[
                    styles.followButtonText,
                    isFollowing && styles.followingButtonText,
                  ]}
                >
                  {isFollowing ? "Following" : "Follow"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.messageButton}>
                <Text style={styles.messageButtonText}>Message</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.shareButton}
                onPress={handleShareProfile}
              >
                <Ionicons name="share-outline" size={18} color="#000" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Tabs */}
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

          {/* Content */}
          <View style={styles.contentSection}>
            {activeTab === "Activity" && (
              <View style={styles.emptyState}>
                <Ionicons name="pulse-outline" size={64} color="#C5CAE9" />
                <Text style={styles.emptyTitle}>No Activity Yet</Text>
                <Text style={styles.emptyDescription}>
                  This user&apos;s recent activity will appear here
                </Text>
              </View>
            )}

            {activeTab === "Post" && (
              <>
                {isLoadingPosts ? (
                  <ActivityIndicator size="small" color="#7C3AED" />
                ) : userPosts && userPosts.length > 0 ? (
                  <View style={styles.postsGrid}>
                    {userPosts.map((post: any) => (
                      <View key={post.id} style={styles.postCard}>
                        <Text style={styles.postContent}>{post.content}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.emptyState}>
                    <Ionicons
                      name="document-text-outline"
                      size={64}
                      color="#C5CAE9"
                    />
                    <Text style={styles.emptyTitle}>No Posts Yet</Text>
                    <Text style={styles.emptyDescription}>
                      This user hasn&apos;t posted anything yet
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
                  Posts where this user is tagged will appear here
                </Text>
              </View>
            )}

            {activeTab === "Media" && (
              <View style={styles.emptyState}>
                <Ionicons name="images-outline" size={64} color="#C5CAE9" />
                <Text style={styles.emptyTitle}>No Media</Text>
                <Text style={styles.emptyDescription}>
                  Photos and videos will appear here
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
  container: {
    flex: 1,
    backgroundColor: "#E8EAF6",
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
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
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
  },
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
  profileImageContainer: {
    marginRight: 20,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  profileImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#7C3AED",
    justifyContent: "center",
    alignItems: "center",
  },
  profileImageText: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  statsRow: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000",
  },
  statLabel: {
    fontSize: 13,
    color: "#666",
    marginTop: 4,
  },
  displayName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
    marginBottom: 8,
  },
  bio: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
  },
  followButton: {
    flex: 1,
    backgroundColor: "#7C3AED",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  followingButton: {
    backgroundColor: "#F5F5F5",
  },
  followButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  followingButtonText: {
    color: "#666",
  },
  messageButton: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  messageButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
  },
  shareButton: {
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
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 22,
  },
  activeTab: {
    backgroundColor: "#7C3AED",
  },
  tabText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  activeTabText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  contentSection: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  postsGrid: {
    gap: 12,
  },
  postCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
  },
  postContent: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
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
