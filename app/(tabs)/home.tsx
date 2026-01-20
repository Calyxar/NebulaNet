// app/(tabs)/home.tsx (updated with story commenting)
import PostCard from "@/components/post/PostCard";
import StoryCommentModal from "@/components/stories/StoryCommentModal";
import { shareWithOptions } from "@/lib/share";
import {
  checkIfLiked,
  checkIfSaved,
  createComment,
  createStoryComment,
  getCurrentUserProfile,
  getFeedPosts,
  getSavesCount,
  likePost,
  savePost,
} from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
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
  story_content?: string;
  story_image?: string;
  story_type?: "text" | "image" | "video";
  created_at?: string;
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

  // Story modal state
  const [storyModalVisible, setStoryModalVisible] = useState(false);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [storyProgress, setStoryProgress] = useState(0);
  const [storyViewerVisible, setStoryViewerVisible] = useState(false);

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

      if (IS_DEV && (!feedPosts || feedPosts.length === 0)) {
        // Add sample posts for development
        const devPosts: Post[] = [
          {
            id: "dev-1",
            title: null,
            content:
              "Take that first step, explore new ideas, and see where it leads. The best time to start is now!",
            like_count: 10000,
            comment_count: 172,
            share_count: 80,
            view_count: 12500,
            created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
            user_id: "dev-user-kev",
            community_id: null,
            profiles: {
              username: "kevhelena",
              full_name: "Kev & Helena",
              avatar_url: null,
            },
            communities: null,
          },
          {
            id: "dev-2",
            title: null,
            content:
              "Get your hands dirty and create something beautiful! Discover the art of gerabah making – from shaping clay to adding the final touches.",
            like_count: 8500,
            comment_count: 324,
            share_count: 189,
            view_count: 18700,
            created_at: new Date(Date.now() - 3 * 3600000).toISOString(),
            user_id: "dev-user-valerie",
            community_id: null,
            profiles: {
              username: "valerieazer",
              full_name: "Valerie Azer",
              avatar_url: null,
            },
            communities: null,
          },
        ];
        setPosts(devPosts);

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
        // Development: Show mock stories with content
        const mockStories: Story[] = [
          {
            id: "add-story",
            username: "Add Story",
            hasStory: false,
            isAdd: true,
          },
          {
            id: "gia",
            username: "Gia Monroe",
            hasStory: true,
            isAdd: false,
            avatar_url: null,
            full_name: "Gia Monroe",
            story_content:
              "Just finished my morning workout! 💪 Ready to take on the day. What's everyone up to today?",
            story_image: "https://picsum.photos/400/800?random=1",
            story_type: "image",
            created_at: new Date(Date.now() - 1 * 3600000).toISOString(),
          },
          {
            id: "jeanne",
            username: "Jeanne I...",
            hasStory: true,
            isAdd: false,
            avatar_url: null,
            full_name: "Jeanne I",
            story_content: "Beautiful sunset at the beach today 🌅",
            story_image: "https://picsum.photos/400/800?random=2",
            story_type: "image",
            created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
          },
          {
            id: "keanu",
            username: "Keanu A...",
            hasStory: true,
            isAdd: false,
            avatar_url: null,
            full_name: "Keanu A",
            story_content:
              "New recipe alert! 🍝 Just made the best pasta ever!",
            story_image: "https://picsum.photos/400/800?random=3",
            story_type: "image",
            created_at: new Date(Date.now() - 3 * 3600000).toISOString(),
          },
          {
            id: "laila",
            username: "Laila Gib...",
            hasStory: true,
            isAdd: false,
            avatar_url: null,
            full_name: "Laila Gib",
            story_content:
              "Weekend vibes 🎶 What's your favorite weekend activity?",
            story_image: "https://picsum.photos/400/800?random=4",
            story_type: "image",
            created_at: new Date(Date.now() - 4 * 3600000).toISOString(),
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
            avatar_url: currentUser.avatar_url,
            full_name: currentUser.full_name,
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
      setPostLikes((prev) => ({
        ...prev,
        [postId]: liked,
      }));

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
      setPostSaves((prev) => ({
        ...prev,
        [postId]: saved,
      }));

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

  // Handle story view
  const handleViewStory = (story: Story) => {
    if (story.isAdd) {
      Alert.alert("Add Story", "Story creation feature coming soon!");
    } else {
      setSelectedStory(story);
      setStoryViewerVisible(true);
      setStoryProgress(0);

      // Start progress animation
      const interval = setInterval(() => {
        setStoryProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            handleNextStory();
            return 0;
          }
          return prev + 1;
        });
      }, 50); // 5 seconds total for story
    }
  };

  const handleNextStory = () => {
    const storyStories = stories.filter((s) => !s.isAdd && s.hasStory);
    if (storyStories.length > 0) {
      const nextIndex = (currentStoryIndex + 1) % storyStories.length;
      setCurrentStoryIndex(nextIndex);
      setSelectedStory(storyStories[nextIndex]);
      setStoryProgress(0);
    } else {
      setStoryViewerVisible(false);
      setSelectedStory(null);
    }
  };

  const handlePrevStory = () => {
    const storyStories = stories.filter((s) => !s.isAdd && s.hasStory);
    if (storyStories.length > 0) {
      const prevIndex =
        (currentStoryIndex - 1 + storyStories.length) % storyStories.length;
      setCurrentStoryIndex(prevIndex);
      setSelectedStory(storyStories[prevIndex]);
      setStoryProgress(0);
    }
  };

  // Handle story comment submission
  const handleStoryComment = async (commentText: string): Promise<boolean> => {
    if (!selectedStory || !commentText.trim()) return false;

    try {
      // Create story comment in Supabase
      await createStoryComment(selectedStory.id, commentText);

      Alert.alert("Success", "Comment sent to story!");
      return true;
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to send comment");
      return false;
    }
  };

  const handleCloseStory = () => {
    setStoryViewerVisible(false);
    setSelectedStory(null);
    setStoryProgress(0);
    setCurrentStoryIndex(0);
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
      {/* Header */}
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

        <TouchableOpacity
          style={styles.searchButton}
          onPress={() => router.push("/(tabs)/explore")}
        >
          <Ionicons name="search-outline" size={24} color="#000" />
        </TouchableOpacity>
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
                      <Ionicons name="add" size={24} color="#000" />
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
      </ScrollView>

      {/* Post Comment Modal */}
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

      {/* Story Viewer Modal */}
      <Modal
        visible={storyViewerVisible}
        animationType="fade"
        transparent={false}
        onRequestClose={handleCloseStory}
      >
        {selectedStory && (
          <View style={styles.storyContainer}>
            {/* Progress Bar */}
            <View style={styles.progressBarContainer}>
              <View
                style={[styles.progressBar, { width: `${storyProgress}%` }]}
              />
            </View>

            {/* Header */}
            <View style={styles.storyHeader}>
              <View style={styles.storyUserInfo}>
                <View style={styles.storyUserAvatar}>
                  {selectedStory.avatar_url ? (
                    <Image
                      source={{ uri: selectedStory.avatar_url }}
                      style={styles.storyHeaderAvatar}
                    />
                  ) : (
                    <Text style={styles.storyHeaderInitial}>
                      {selectedStory.username.charAt(0).toUpperCase()}
                    </Text>
                  )}
                </View>
                <View>
                  <Text style={styles.storyUserName}>
                    {selectedStory.full_name || selectedStory.username}
                  </Text>
                  <Text style={styles.storyTime}>
                    {selectedStory.created_at
                      ? formatTimestamp(selectedStory.created_at)
                      : "Recently"}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={handleCloseStory}
                style={styles.storyCloseBtn}
              >
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Story Content */}
            <View style={styles.storyContent}>
              {selectedStory.story_image ? (
                <Image
                  source={{ uri: selectedStory.story_image }}
                  style={styles.storyImageFull}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.storyTextContainer}>
                  <Text style={styles.storyTextContent}>
                    {selectedStory.story_content || "No story content"}
                  </Text>
                </View>
              )}

              {selectedStory.story_content && selectedStory.story_image && (
                <View style={styles.storyTextOverlay}>
                  <Text style={styles.storyCaption}>
                    {selectedStory.story_content}
                  </Text>
                </View>
              )}
            </View>

            {/* Navigation Buttons */}
            <TouchableOpacity
              style={[styles.navButton, styles.navButtonLeft]}
              onPress={handlePrevStory}
              activeOpacity={0.7}
            >
              <View style={styles.navButtonArea} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.navButton, styles.navButtonRight]}
              onPress={handleNextStory}
              activeOpacity={0.7}
            >
              <View style={styles.navButtonArea} />
            </TouchableOpacity>

            {/* Comment Input */}
            <StoryCommentModal
              visible={storyViewerVisible}
              onSendComment={handleStoryComment}
              onClose={handleCloseStory}
              placeholder="Send a reply..."
            />
          </View>
        )}
      </Modal>

      {/* FAB for creating new post */}
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
  storiesContent: {
    paddingRight: 16,
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
  storyAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
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
  // Story Viewer Styles
  storyContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  progressBarContainer: {
    height: 2,
    backgroundColor: "rgba(255,255,255,0.3)",
    marginTop: 8,
    marginHorizontal: 8,
    borderRadius: 1,
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#fff",
    borderRadius: 1,
  },
  storyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  storyUserInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  storyUserAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#333",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  storyHeaderAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  storyHeaderInitial: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  storyUserName: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  storyTime: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    marginTop: 2,
  },
  storyCloseBtn: {
    padding: 4,
  },
  storyContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  storyImageFull: {
    width: "100%",
    height: "100%",
  },
  storyTextContainer: {
    padding: 20,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 12,
    marginHorizontal: 20,
  },
  storyTextContent: {
    color: "#fff",
    fontSize: 18,
    textAlign: "center",
    lineHeight: 24,
  },
  storyTextOverlay: {
    position: "absolute",
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 16,
    borderRadius: 12,
  },
  storyCaption: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
    lineHeight: 22,
  },
  navButton: {
    position: "absolute",
    top: 0,
    bottom: 100,
    width: "30%",
  },
  navButtonLeft: {
    left: 0,
  },
  navButtonRight: {
    right: 0,
  },
  navButtonArea: {
    flex: 1,
  },
});
