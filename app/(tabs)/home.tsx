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
  savePost
} from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
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
  StatusBar,
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
  story_content?: string;
  story_image?: string;
  story_type?: "text" | "image" | "video";
  created_at?: string;
}

export default function HomeScreen() {
  // ✅ Fixed: Removed unused 'user' from useAuth() destructuring
  const [activeTab, setActiveTab] = useState<
    "for-you" | "following" | "my-community"
  >("for-you");
  const [posts, setPosts] = useState<Post[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [postLikes, setPostLikes] = useState<Record<string, boolean>>({});
  const [postSaves, setPostSaves] = useState<Record<string, boolean>>({});
  const [postSavesCount, setPostSavesCount] = useState<Record<string, number>>(
    {},
  );
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [commentText, setCommentText] = useState("");
  const [isCommenting, setIsCommenting] = useState(false);

  const loadPosts = useCallback(async () => {
    try {
      setLoading(true);
      const feedPosts = await getFeedPosts();
      setPosts(feedPosts || []);

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
    } catch (error) {
      console.error("Error loading posts:", error);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStories = useCallback(async () => {
    try {
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
          avatar_url: currentUser.avatar_url,
          full_name: currentUser.full_name,
        },
      ];
      setStories(realStories);
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
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

      if (diffHours < 1) {
        const diffMins = Math.floor(diffMs / (1000 * 60));
        return `${diffMins} min ago`;
      } else if (diffHours < 24) {
        return `${diffHours} hr ago`;
      } else {
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        return `${diffDays} days ago`;
      }
    } catch {
      return "Recently";
    }
  };

  const getAuthorName = (post: Post) => {
    return post.profiles?.full_name || post.profiles?.username || "Anonymous";
  };

  const handleLikePress = async (postId: string) => {
    try {
      const liked = await likePost(postId);
      setPostLikes((prev) => ({ ...prev, [postId]: liked }));
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
      setPostSaves((prev) => ({ ...prev, [postId]: saved }));
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

  const handleSubmitComment = async () => {
    if (!selectedPost || !commentText.trim() || isCommenting) return;

    setIsCommenting(true);
    try {
      await createComment(selectedPost.id, commentText);
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

      setCommentText("");
      setCommentModalVisible(false);
      Alert.alert("Success", "Comment posted successfully!");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to post comment");
    } finally {
      setIsCommenting(false);
    }
  };

  const handleViewStory = (story: Story) => {
    if (story.isAdd) {
      router.push("/create/story");
    }
  };

  if (loading && !refreshing) {
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
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <View style={styles.logoIcon}>
              <Text style={styles.logoIconText}>N</Text>
            </View>
            <Text style={styles.logoText}>NebulaNet</Text>
          </View>

          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.notificationButton}>
              <Ionicons name="notifications-outline" size={24} color="#000" />
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>6</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Stories Row */}
          {stories.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.storiesContainer}
              contentContainerStyle={styles.storiesContent}
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
                        <Ionicons name="add" size={24} color="#7C3AED" />
                      </View>
                    ) : (
                      <View style={styles.storyImage}>
                        {story.avatar_url ? (
                          <Image
                            source={{ uri: story.avatar_url }}
                            style={styles.storyAvatar}
                          />
                        ) : (
                          <Text style={styles.storyInitial}>
                            {story.username.charAt(0).toUpperCase()}
                          </Text>
                        )}
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
              style={[
                styles.tab,
                activeTab === "following" && styles.activeTab,
              ]}
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
                <Ionicons name="newspaper-outline" size={64} color="#C5CAE9" />
                <Text style={styles.emptyTitle}>Welcome to NebulaNet!</Text>
                <Text style={styles.emptySubtitle}>
                  Follow users and communities to see posts in your feed
                </Text>
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
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#7C3AED",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  logoIconText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
  },
  logoText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  notificationButton: {
    position: "relative",
  },
  notificationBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#7C3AED",
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  notificationBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
  storiesContainer: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  storiesContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  storyItem: {
    alignItems: "center",
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
    borderColor: "#E0E0E0",
    borderStyle: "dashed",
  },
  addStoryInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
  },
  storyImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#7C3AED",
    justifyContent: "center",
    alignItems: "center",
  },
  storyAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  storyInitial: {
    color: "#FFFFFF",
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
    borderColor: "#7C3AED",
  },
  storyUsername: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
    textAlign: "center",
    width: "100%",
  },
  tabContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    backgroundColor: "#F8F8F8",
    borderRadius: 25,
    padding: 4,
    marginHorizontal: 16,
    marginTop: 16,
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
  postsContainer: {
    paddingTop: 16,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#000",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: "#9FA8DA",
    textAlign: "center",
    lineHeight: 22,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
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
    backgroundColor: "#F8F8F8",
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
    borderColor: "#E0E0E0",
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
    backgroundColor: "#7C3AED",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  submitButtonDisabled: {
    backgroundColor: "#C5CAE9",
  },
  submitButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
});
