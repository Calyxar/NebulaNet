// app/(tabs)/home.tsx
import PostCard from "@/components/post/PostCard";
import { shareWithOptions } from "@/lib/share";
import {
  checkIfLiked,
  checkIfSaved,
  createComment,
  getCurrentUserProfile,
  getFeedPosts,
  getSavesCount,
  likePost,
  savePost,
} from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { formatDistanceToNow } from "date-fns";
import { Link, router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface Post {
  id: string;
  title: string | null;
  content: string;
  like_count: number;
  comment_count: number;
  share_count: number;
  view_count: number;
  created_at: string;
  user_id: string;
  community_id: string | null;
  profiles: {
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  };
  communities: {
    name: string;
    slug: string;
  } | null;
}

interface Story {
  id: string;
  username: string;
  hasStory: boolean;
  isAdd: boolean;
  user_id?: string;
  avatar_url?: string | null;
  full_name?: string | null;
}

// Check if we're in development mode
const IS_DEV = __DEV__;

export default function HomeScreen() {
  const [activeTab, setActiveTab] = useState<
    "for-you" | "following" | "my-community"
  >("for-you");
  const [posts, setPosts] = useState<Post[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState("9:41");
  const [postLikes, setPostLikes] = useState<Record<string, boolean>>({});
  const [postSaves, setPostSaves] = useState<Record<string, boolean>>({});
  const [postSavesCount, setPostSavesCount] = useState<Record<string, number>>(
    {},
  );

  // Comment modal state
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [commentText, setCommentText] = useState("");
  const [isCommenting, setIsCommenting] = useState(false);
  const [storyModalVisible, setStoryModalVisible] = useState(false);
  const [storyCommentText, setStoryCommentText] = useState("");

  // Update current time
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const timeString = now.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      setCurrentTime(timeString);
    };

    updateTime();
    const interval = setInterval(updateTime, 60000);

    return () => clearInterval(interval);
  }, []);

  const loadPosts = useCallback(async () => {
    try {
      setLoading(true);
      const feedPosts = await getFeedPosts();

      // In production, only show actual posts
      // In development, we can add mock posts if needed
      if (IS_DEV && (!feedPosts || feedPosts.length === 0)) {
        // Add sample posts for development preview only
        const devPosts: Post[] = [
          {
            id: "dev-1",
            title:
              "Energy's rising 🟡️ PartyPlanet Crew is taking over the night 🟢",
            content: "Let's vibe, dance, and shine together",
            like_count: 723,
            comment_count: 532,
            share_count: 250,
            view_count: 10000,
            created_at: new Date(Date.now() - 3600000).toISOString(),
            user_id: "dev-user-1",
            community_id: null,
            profiles: {
              username: "bennyblankon",
              full_name: "Benny Blankon",
              avatar_url: null,
            },
            communities: null,
          },
          {
            id: "dev-2",
            title: "Tomato Progress is thriving! 🟢",
            content:
              "New leaves, strong stems, and steady growth ahead 🟢 #PlantProgress #GrowStrong",
            like_count: 420,
            comment_count: 89,
            share_count: 45,
            view_count: 5000,
            created_at: new Date(Date.now() - 7200000).toISOString(),
            user_id: "dev-user-2",
            community_id: "dev-comm-1",
            profiles: {
              username: "aidenfrost",
              full_name: "Aiden Froz",
              avatar_url: null,
            },
            communities: {
              name: "Farm Harmony",
              slug: "farm-harmony",
            },
          },
        ];
        setPosts(devPosts);

        // Set default like/save states for dev posts
        const likes: Record<string, boolean> = {};
        const saves: Record<string, boolean> = {};
        const savesCount: Record<string, number> = {};

        devPosts.forEach((post) => {
          likes[post.id] = false;
          saves[post.id] = false;
          savesCount[post.id] = 0;
        });

        setPostLikes(likes);
        setPostSaves(saves);
        setPostSavesCount(savesCount);
      } else {
        // Production - only real data
        setPosts(feedPosts || []);

        // Check like/save status for real posts
        if (feedPosts && feedPosts.length > 0) {
          const likes: Record<string, boolean> = {};
          const saves: Record<string, boolean> = {};
          const savesCount: Record<string, number> = {};

          for (const post of feedPosts) {
            likes[post.id] = await checkIfLiked(post.id);
            saves[post.id] = await checkIfSaved(post.id);
            savesCount[post.id] = await getSavesCount(post.id);
          }

          setPostLikes(likes);
          setPostSaves(saves);
          setPostSavesCount(savesCount);
        }
      }
    } catch (error) {
      console.error("Error loading posts:", error);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStories = useCallback(async () => {
    try {
      if (IS_DEV) {
        // Development: Show mock stories for preview
        const mockStories: Story[] = [
          {
            id: "add-story",
            username: "Add Story",
            hasStory: false,
            isAdd: true,
          },
          { id: "gia", username: "Gia Monroe", hasStory: true, isAdd: false },
          {
            id: "jeanne",
            username: "Jeanne I...",
            hasStory: true,
            isAdd: false,
          },
          { id: "keanu", username: "Keanu A...", hasStory: true, isAdd: false },
          {
            id: "laila",
            username: "Laila Gib...",
            hasStory: true,
            isAdd: false,
          },
        ];
        setStories(mockStories);
      } else {
        const currentUser = await getCurrentUserProfile();
        if (!currentUser) {
          setStories([]);
          return;
        }

        const realStories: Story[] = [
          {
            id: "add-story",
            username: "Add Story",
            hasStory: false,
            isAdd: true,
            user_id: currentUser.id,
          },
        ];
        setStories(realStories);
      }
    } catch (error) {
      console.error("Error loading stories:", error);
      setStories([]);
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      await Promise.all([loadPosts(), loadStories()]);
    } catch (error) {
      console.error("Error loading data:", error);
    }
  }, [loadPosts, loadStories]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return "Recently";
    }
  };

  const getAuthorName = (post: Post) => {
    return post.profiles?.full_name || post.profiles?.username || "Anonymous";
  };

  // Function to handle post interactions
  const handleLikePress = async (postId: string) => {
    try {
      const liked = await likePost(postId);
      setPostLikes((prev) => ({
        ...prev,
        [postId]: liked,
      }));

      // Update like count in local state
      setPosts((prev) =>
        prev.map((post) => {
          if (post.id === postId) {
            return {
              ...post,
              like_count: liked ? post.like_count + 1 : post.like_count - 1,
            };
          }
          return post;
        }),
      );
    } catch (error) {
      console.error("Error liking post:", error);
    }
  };

  const handleCommentPress = (post: Post) => {
    setSelectedPost(post);
    setCommentModalVisible(true);
  };

  const handleSharePress = async (postId: string, postData: any) => {
    try {
      await shareWithOptions({
        id: postId,
        title: postData.title,
        content: postData.content,
        author: postData.author,
      });

      // Update share count in local state
      setPosts((prev) =>
        prev.map((post) => {
          if (post.id === postId) {
            return {
              ...post,
              share_count: post.share_count + 1,
            };
          }
          return post;
        }),
      );
    } catch (error) {
      console.error("Share failed:", error);
    }
  };

  const handleSavePress = async (postId: string) => {
    try {
      const saved = await savePost(postId);
      setPostSaves((prev) => ({
        ...prev,
        [postId]: saved,
      }));

      // Update saves count
      setPostSavesCount((prev) => ({
        ...prev,
        [postId]: saved
          ? (prev[postId] || 0) + 1
          : Math.max(0, (prev[postId] || 1) - 1),
      }));
    } catch (error) {
      console.error("Error saving post:", error);
    }
  };

  // Handle comment submission
  const handleSubmitComment = async () => {
    if (!selectedPost || !commentText.trim() || isCommenting) return;

    setIsCommenting(true);
    try {
      await createComment(selectedPost.id, commentText);

      // Update comment count in local state
      setPosts((prev) =>
        prev.map((post) => {
          if (post.id === selectedPost.id) {
            return {
              ...post,
              comment_count: post.comment_count + 1,
            };
          }
          return post;
        }),
      );

      // Reset and close modal
      setCommentText("");
      setCommentModalVisible(false);

      Alert.alert("Success", "Comment posted successfully!");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to post comment");
    } finally {
      setIsCommenting(false);
    }
  };

  // Handle story comment
  const handleStoryComment = async (storyId: string) => {
    if (!storyCommentText.trim()) return;

    try {
      // Here you would implement story commenting logic
      // For now, just show a success message
      Alert.alert("Success", `Comment sent to story: ${storyCommentText}`);
      setStoryCommentText("");
      setStoryModalVisible(false);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to send comment");
    }
  };

  // View story
  const handleViewStory = (story: Story) => {
    if (story.isAdd) {
      // Create new story
      Alert.alert("Add Story", "Story creation feature coming soon!");
    } else {
      // View story
      setStoryModalVisible(true);
    }
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000000" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with time and logo */}
      <View style={styles.header}>
        <View style={styles.timeContainer}>
          <Text style={styles.time}>{currentTime}</Text>
        </View>

        <View style={styles.logoContainer}>
          <Image
            source={require("@/assets/images/icon.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.logoText}>NebulaNet</Text>
        </View>

        <TouchableOpacity style={styles.searchButton}>
          <Ionicons name="search" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Stories Row - Only show if there are stories */}
        {stories.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.storiesContainer}
          >
            {stories.map((story) => (
              <TouchableOpacity
                key={story.id}
                style={styles.storyItem}
                onPress={() => handleViewStory(story)}
              >
                <View
                  style={[
                    styles.storyCircle,
                    story.isAdd && styles.addStoryCircle,
                  ]}
                >
                  {story.isAdd ? (
                    <View style={styles.addStoryInner}>
                      <Ionicons name="add" size={24} color="#000" />
                    </View>
                  ) : (
                    <View style={styles.storyImage}>
                      <Text style={styles.storyInitial}>
                        {story.username
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </Text>
                    </View>
                  )}
                  {story.hasStory && !story.isAdd && (
                    <View style={styles.storyRing} />
                  )}
                </View>
                <Text style={styles.storyUsername} numberOfLines={1}>
                  {story.username}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Feed Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "for-you" && styles.activeTab]}
            onPress={() => setActiveTab("for-you")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "for-you" && styles.activeTabText,
              ]}
            >
              For You
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === "following" && styles.activeTab]}
            onPress={() => setActiveTab("following")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "following" && styles.activeTabText,
              ]}
            >
              Following
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === "my-community" && styles.activeTab,
            ]}
            onPress={() => setActiveTab("my-community")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "my-community" && styles.activeTabText,
              ]}
            >
              My Community
            </Text>
          </TouchableOpacity>
        </View>

        {/* Posts */}
        <View style={styles.postsContainer}>
          {posts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="newspaper-outline" size={60} color="#999" />
              <Text style={styles.emptyTitle}>
                {IS_DEV ? "No posts found" : "Welcome to NebulaNet!"}
              </Text>
              <Text style={styles.emptySubtitle}>
                {IS_DEV
                  ? "Start by creating your first post or following some users"
                  : "Follow users and communities to see posts in your feed"}
              </Text>

              {IS_DEV && posts.length === 0 && (
                <TouchableOpacity
                  style={styles.createFirstPostButton}
                  onPress={() => router.push("/post/create")}
                >
                  <Text style={styles.createFirstPostText}>
                    Create Your First Post
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            posts.map((post) => (
              <PostCard
                key={post.id}
                id={post.id}
                title={post.title || undefined}
                content={post.content}
                author={{
                  id: post.user_id,
                  name: getAuthorName(post),
                  username: post.profiles?.username || "anonymous",
                  avatar: post.profiles?.avatar_url || undefined,
                }}
                community={
                  post.communities
                    ? {
                        id: post.community_id!,
                        name: post.communities.name,
                        slug: post.communities.slug,
                      }
                    : undefined
                }
                timestamp={formatTimestamp(post.created_at)}
                likes={post.like_count}
                comments={post.comment_count}
                shares={post.share_count}
                saves={postSavesCount[post.id] || 0}
                isLiked={postLikes[post.id] || false}
                isSaved={postSaves[post.id] || false}
                viewCount={post.view_count}
                onLikePress={() => handleLikePress(post.id)}
                onCommentPress={() => handleCommentPress(post)}
                onSharePress={() =>
                  handleSharePress(post.id, {
                    title: post.title,
                    content: post.content,
                    author: {
                      name: getAuthorName(post),
                      username: post.profiles?.username || "anonymous",
                    },
                  })
                }
                onSavePress={() => handleSavePress(post.id)}
              />
            ))
          )}
        </View>

        {/* Call to Action - Only show in production when user is new */}
        {!IS_DEV && posts.length === 0 && (
          <View style={styles.ctaContainer}>
            <Text style={styles.ctaTitle}>
              Take that first step, explore new ideas, and see where it leads.
            </Text>
            <Text style={styles.ctaSubtitle}>
              The best time to start is now!
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Comment Modal */}
      <Modal
        visible={commentModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCommentModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Comment</Text>
              <TouchableOpacity
                onPress={() => setCommentModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            {selectedPost && (
              <View style={styles.postPreview}>
                <Text style={styles.postAuthor}>
                  {getAuthorName(selectedPost)}
                </Text>
                <Text style={styles.postContent} numberOfLines={3}>
                  {selectedPost.content}
                </Text>
              </View>
            )}

            <TextInput
              style={styles.commentInput}
              placeholder="Write your comment..."
              value={commentText}
              onChangeText={setCommentText}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={500}
            />

            <View style={styles.commentActions}>
              <Text style={styles.charCount}>{commentText.length}/500</Text>
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (!commentText.trim() || isCommenting) &&
                    styles.submitButtonDisabled,
                ]}
                onPress={handleSubmitComment}
                disabled={!commentText.trim() || isCommenting}
              >
                <Text style={styles.submitButtonText}>
                  {isCommenting ? "Posting..." : "Post Comment"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Story Modal */}
      <Modal
        visible={storyModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setStoryModalVisible(false)}
      >
        <View style={styles.storyModalContainer}>
          <View style={styles.storyModalContent}>
            <View style={styles.storyModalHeader}>
              <TouchableOpacity
                onPress={() => setStoryModalVisible(false)}
                style={styles.storyCloseButton}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.storyModalTitle}>Story</Text>
              <View style={styles.storyHeaderSpacer} />
            </View>

            <View style={styles.storyView}>
              <Text style={styles.storyText}>
                Story content would appear here
              </Text>
            </View>

            <View style={styles.storyCommentContainer}>
              <TextInput
                style={styles.storyCommentInput}
                placeholder="Send a reply..."
                placeholderTextColor="rgba(255,255,255,0.6)"
                value={storyCommentText}
                onChangeText={setStoryCommentText}
                onSubmitEditing={() => handleStoryComment("story-id")}
              />
              <TouchableOpacity
                style={styles.storySendButton}
                onPress={() => handleStoryComment("story-id")}
              >
                <Ionicons
                  name="send"
                  size={20}
                  color={
                    storyCommentText.trim() ? "#fff" : "rgba(255,255,255,0.3)"
                  }
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* FAB for creating new post - Always visible */}
      <Link href="/post/create" asChild>
        <TouchableOpacity style={styles.fab}>
          <Ionicons name="add" size={30} color="#fff" />
        </TouchableOpacity>
      </Link>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
    backgroundColor: "#ffffff",
  },
  timeContainer: {
    width: 60,
    alignItems: "flex-start",
  },
  time: {
    fontSize: 17,
    fontWeight: "600",
    color: "#000000",
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 32,
    height: 32,
    marginRight: 8,
  },
  logoText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000000",
    letterSpacing: -0.5,
  },
  searchButton: {
    width: 40,
    alignItems: "flex-end",
  },
  content: {
    flex: 1,
  },
  storiesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
  },
  storyItem: {
    alignItems: "center",
    marginRight: 20,
    width: 68,
  },
  storyCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
    position: "relative",
  },
  addStoryCircle: {
    borderWidth: 2,
    borderColor: "#e5e5e5",
    borderStyle: "dashed",
  },
  addStoryInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
  },
  storyImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
  },
  storyInitial: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "bold",
  },
  storyRing: {
    position: "absolute",
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 38,
    borderWidth: 2,
    borderColor: "#000000",
  },
  storyUsername: {
    fontSize: 12,
    color: "#666666",
    fontWeight: "500",
    textAlign: "center",
    width: "100%",
  },
  tabContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
    backgroundColor: "#ffffff",
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: "center",
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: "#000000",
  },
  tabText: {
    fontSize: 16,
    color: "#999999",
    fontWeight: "500",
  },
  activeTabText: {
    color: "#000000",
    fontWeight: "700",
  },
  postsContainer: {
    padding: 16,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666666",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#999999",
    textAlign: "center",
    lineHeight: 20,
  },
  createFirstPostButton: {
    marginTop: 20,
    backgroundColor: "#000000",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createFirstPostText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 14,
  },
  ctaContainer: {
    backgroundColor: "#f8f8f8",
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e5e5",
  },
  ctaTitle: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 8,
    color: "#000000",
    lineHeight: 24,
  },
  ctaSubtitle: {
    fontSize: 14,
    color: "#666666",
    textAlign: "center",
    fontWeight: "500",
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000",
  },
  closeButton: {
    padding: 4,
  },
  postPreview: {
    backgroundColor: "#f8f8f8",
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  postAuthor: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
    marginBottom: 4,
  },
  postContent: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: "#000",
    minHeight: 100,
    textAlignVertical: "top",
    marginBottom: 16,
  },
  commentActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  charCount: {
    fontSize: 12,
    color: "#999",
  },
  submitButton: {
    backgroundColor: "#000",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  submitButtonDisabled: {
    backgroundColor: "#ccc",
  },
  submitButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  // Story Modal styles
  storyModalContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  storyModalContent: {
    flex: 1,
    justifyContent: "space-between",
  },
  storyModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingTop: 40,
  },
  storyCloseButton: {
    padding: 4,
  },
  storyModalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
  },
  storyHeaderSpacer: {
    width: 32,
  },
  storyView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  storyText: {
    fontSize: 18,
    color: "#fff",
    textAlign: "center",
  },
  storyCommentContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "rgba(0,0,0,0.8)",
  },
  storyCommentInput: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: "#fff",
    marginRight: 8,
  },
  storySendButton: {
    padding: 8,
  },
});
