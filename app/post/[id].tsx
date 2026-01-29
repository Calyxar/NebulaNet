// app/post/[id].tsx - Updated with usePosts hooks
import { useAuth } from "@/hooks/useAuth";
import {
  useAddComment,
  useComments,
  useIncrementShareCount,
  usePost,
  useToggleBookmark,
  useToggleCommentLike,
  useToggleLike,
} from "@/hooks/usePosts";
import { sharePost } from "@/lib/share";
import { Ionicons } from "@expo/vector-icons";
import { formatDistanceToNow } from "date-fns";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [comment, setComment] = useState("");
  const [showAllComments, setShowAllComments] = useState(false);

  // Fetch data using hooks
  const {
    data: post,
    isLoading: isLoadingPost,
    error: postError,
  } = usePost(id);
  const { data: comments = [], isLoading: isLoadingComments } = useComments(id);

  // Mutations
  const toggleLikeMutation = useToggleLike();
  const toggleBookmarkMutation = useToggleBookmark();
  const addCommentMutation = useAddComment();
  const toggleCommentLikeMutation = useToggleCommentLike();
  const incrementShareCountMutation = useIncrementShareCount();

  const displayedComments = showAllComments ? comments : comments.slice(0, 3);

  const handleLike = async () => {
    if (!post) return;

    try {
      await toggleLikeMutation.mutateAsync({
        postId: post.id,
        isLiked: post.user_has_liked || false,
      });
    } catch (error) {
      console.error("Error toggling like:", error);
      Alert.alert("Error", "Failed to update like");
    }
  };

  const handleBookmark = async () => {
    if (!post) return;

    try {
      await toggleBookmarkMutation.mutateAsync({
        postId: post.id,
        isBookmarked: post.user_has_bookmarked || false,
      });
    } catch (error) {
      console.error("Error toggling bookmark:", error);
      Alert.alert("Error", "Failed to update bookmark");
    }
  };

  const handlePostComment = async () => {
    if (!comment.trim() || !post) return;

    try {
      await addCommentMutation.mutateAsync({
        post_id: post.id,
        content: comment.trim(),
      });
      setComment("");
    } catch (error) {
      console.error("Error posting comment:", error);
      Alert.alert("Error", "Failed to post comment");
    }
  };

  const toggleCommentLike = async (commentId: string) => {
    if (!post) return;

    const commentToLike = comments.find((c) => c.id === commentId);
    if (!commentToLike) return;

    try {
      await toggleCommentLikeMutation.mutateAsync({
        commentId,
        postId: post.id,
        isLiked: commentToLike.user_has_liked || false,
      });
    } catch (error) {
      console.error("Error toggling comment like:", error);
      Alert.alert("Error", "Failed to update comment like");
    }
  };

  const handleShare = async () => {
    if (!post) return;

    try {
      await sharePost({
        id: post.id,
        title: post.title,
        content: post.content,
        author: {
          username: post.author.username,
          name: post.author.name,
        },
        community: post.community,
      });

      // Increment share count
      await incrementShareCountMutation.mutateAsync(post.id);
    } catch (error) {
      console.error("Error sharing post:", error);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return dateString;
    }
  };

  if (isLoadingPost) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Post</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </SafeAreaView>
    );
  }

  if (postError || !post) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Post</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#999" />
          <Text style={styles.errorText}>
            {postError ? "Failed to load post" : "Post not found"}
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backHomeButton}
          >
            <Text style={styles.backHomeText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Post</Text>
        <TouchableOpacity>
          <Ionicons name="ellipsis-horizontal" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Post Content */}
        <View style={styles.postContainer}>
          <View style={styles.postHeader}>
            <TouchableOpacity
              style={styles.authorInfo}
              onPress={() => router.push(`/user/${post.author.username}`)}
            >
              {post.author.avatar_url ? (
                <Image
                  source={{ uri: post.author.avatar_url }}
                  style={styles.authorAvatar}
                />
              ) : (
                <View style={styles.authorAvatar}>
                  <Text style={styles.authorAvatarText}>
                    {getInitials(post.author.name)}
                  </Text>
                </View>
              )}
              <View style={styles.authorDetails}>
                <Text style={styles.authorName}>{post.author.name}</Text>
                <Text style={styles.authorHandle}>@{post.author.username}</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity>
              <Ionicons name="ellipsis-horizontal" size={20} color="#666" />
            </TouchableOpacity>
          </View>

          {post.title && <Text style={styles.postTitle}>{post.title}</Text>}
          <Text style={styles.postContent}>{post.content}</Text>
          <Text style={styles.postTime}>{formatTime(post.created_at)}</Text>

          {/* Post Media */}
          {post.media_url && (
            <View style={styles.postMedia}>
              {post.media_type === "image" ? (
                <Image
                  source={{ uri: post.media_url }}
                  style={styles.postImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.videoPlaceholder}>
                  <Ionicons name="play-circle" size={60} color="#007AFF" />
                  <Text style={styles.videoText}>Video</Text>
                </View>
              )}
            </View>
          )}

          {/* Post Stats */}
          <View style={styles.postStats}>
            <View style={styles.statItem}>
              <Ionicons name="heart" size={20} color="#ff375f" />
              <Text style={styles.statText}>
                {post.likes_count.toLocaleString()}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="chatbubble-outline" size={20} color="#666" />
              <Text style={styles.statText}>
                {post.comments_count.toLocaleString()}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="arrow-redo-outline" size={20} color="#666" />
              <Text style={styles.statText}>
                {post.shares_count.toLocaleString()}
              </Text>
            </View>
          </View>

          {/* Post Actions */}
          <View style={styles.postActions}>
            <TouchableOpacity
              style={styles.postAction}
              onPress={handleLike}
              disabled={toggleLikeMutation.isPending}
            >
              <Ionicons
                name={post.user_has_liked ? "heart" : "heart-outline"}
                size={24}
                color={post.user_has_liked ? "#ff375f" : "#666"}
              />
              <Text
                style={[
                  styles.postActionText,
                  post.user_has_liked && styles.likedActionText,
                ]}
              >
                Like
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.postAction}>
              <Ionicons name="chatbubble-outline" size={24} color="#666" />
              <Text style={styles.postActionText}>Comment</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.postAction} onPress={handleShare}>
              <Ionicons name="arrow-redo-outline" size={24} color="#666" />
              <Text style={styles.postActionText}>Share</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.postAction}
              onPress={handleBookmark}
              disabled={toggleBookmarkMutation.isPending}
            >
              <Ionicons
                name={
                  post.user_has_bookmarked ? "bookmark" : "bookmark-outline"
                }
                size={24}
                color={post.user_has_bookmarked ? "#007AFF" : "#666"}
              />
              <Text
                style={[
                  styles.postActionText,
                  post.user_has_bookmarked && styles.bookmarkedActionText,
                ]}
              >
                Save
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Comments Section */}
        <View style={styles.commentsSection}>
          <View style={styles.commentsHeader}>
            <Text style={styles.commentsTitle}>Comments</Text>
            <Text style={styles.commentsCount}>{comments.length} comments</Text>
          </View>

          {/* Add Comment */}
          {user && (
            <View style={styles.addCommentContainer}>
              {user.avatar_url ? (
                <Image
                  source={{ uri: user.avatar_url }}
                  style={styles.userAvatarSmall}
                />
              ) : (
                <View style={styles.userAvatarSmall}>
                  <Text style={styles.userAvatarSmallText}>
                    {getInitials(user.name || user.email || "?")}
                  </Text>
                </View>
              )}
              <View style={styles.commentInputContainer}>
                <TextInput
                  style={styles.commentInput}
                  placeholder="Add a comment..."
                  value={comment}
                  onChangeText={setComment}
                  multiline
                />
                <TouchableOpacity
                  style={[
                    styles.postCommentButton,
                    (!comment.trim() || addCommentMutation.isPending) &&
                      styles.postCommentButtonDisabled,
                  ]}
                  onPress={handlePostComment}
                  disabled={!comment.trim() || addCommentMutation.isPending}
                >
                  {addCommentMutation.isPending ? (
                    <ActivityIndicator size="small" color="#007AFF" />
                  ) : (
                    <Ionicons name="send" size={20} color="#007AFF" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Comments List */}
          {isLoadingComments ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#007AFF" />
            </View>
          ) : (
            <View style={styles.commentsList}>
              {displayedComments.map((commentItem) => (
                <View key={commentItem.id} style={styles.commentItem}>
                  <View style={styles.commentAuthor}>
                    <TouchableOpacity
                      onPress={() =>
                        router.push(`/user/${commentItem.author.username}`)
                      }
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        flex: 1,
                      }}
                    >
                      {commentItem.author.avatar_url ? (
                        <Image
                          source={{ uri: commentItem.author.avatar_url }}
                          style={styles.commentAuthorAvatar}
                        />
                      ) : (
                        <View style={styles.commentAuthorAvatar}>
                          <Text style={styles.commentAuthorAvatarText}>
                            {getInitials(commentItem.author.name)}
                          </Text>
                        </View>
                      )}
                      <View style={styles.commentAuthorInfo}>
                        <Text style={styles.commentAuthorName}>
                          {commentItem.author.name}
                        </Text>
                        <Text style={styles.commentAuthorHandle}>
                          @{commentItem.author.username}
                        </Text>
                      </View>
                    </TouchableOpacity>
                    <Text style={styles.commentTime}>
                      {formatTime(commentItem.created_at)}
                    </Text>
                  </View>

                  <Text style={styles.commentContent}>
                    {commentItem.content}
                  </Text>

                  <View style={styles.commentActions}>
                    <TouchableOpacity
                      style={styles.commentAction}
                      onPress={() => toggleCommentLike(commentItem.id)}
                    >
                      <Ionicons
                        name={
                          commentItem.user_has_liked ? "heart" : "heart-outline"
                        }
                        size={16}
                        color={commentItem.user_has_liked ? "#ff375f" : "#666"}
                      />
                      <Text style={styles.commentActionText}>
                        {commentItem.likes_count}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.commentAction}>
                      <Ionicons
                        name="chatbubble-outline"
                        size={16}
                        color="#666"
                      />
                      <Text style={styles.commentActionText}>Reply</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Render replies if they exist */}
                  {commentItem.replies && commentItem.replies.length > 0 && (
                    <View style={styles.repliesContainer}>
                      {commentItem.replies.map((reply) => (
                        <View key={reply.id} style={styles.replyItem}>
                          <View style={styles.commentAuthor}>
                            <TouchableOpacity
                              onPress={() =>
                                router.push(`/user/${reply.author.username}`)
                              }
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                flex: 1,
                              }}
                            >
                              {reply.author.avatar_url ? (
                                <Image
                                  source={{ uri: reply.author.avatar_url }}
                                  style={styles.replyAuthorAvatar}
                                />
                              ) : (
                                <View style={styles.replyAuthorAvatar}>
                                  <Text style={styles.replyAuthorAvatarText}>
                                    {getInitials(reply.author.name)}
                                  </Text>
                                </View>
                              )}
                              <View style={styles.commentAuthorInfo}>
                                <Text style={styles.commentAuthorName}>
                                  {reply.author.name}
                                </Text>
                                <Text style={styles.commentAuthorHandle}>
                                  @{reply.author.username}
                                </Text>
                              </View>
                            </TouchableOpacity>
                            <Text style={styles.commentTime}>
                              {formatTime(reply.created_at)}
                            </Text>
                          </View>
                          <Text style={styles.commentContent}>
                            {reply.content}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ))}

              {comments.length > 3 && !showAllComments && (
                <TouchableOpacity
                  style={styles.viewAllComments}
                  onPress={() => setShowAllComments(true)}
                >
                  <Text style={styles.viewAllCommentsText}>
                    View All Comments
                  </Text>
                  <Ionicons name="chevron-down" size={16} color="#007AFF" />
                </TouchableOpacity>
              )}

              {showAllComments && comments.length > 3 && (
                <TouchableOpacity
                  style={styles.viewAllComments}
                  onPress={() => setShowAllComments(false)}
                >
                  <Text style={styles.viewAllCommentsText}>
                    Show Less Comments
                  </Text>
                  <Ionicons name="chevron-up" size={16} color="#007AFF" />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom Comment Input (Fixed) */}
      {user && (
        <View style={styles.bottomCommentContainer}>
          <View style={styles.bottomCommentInputContainer}>
            <TextInput
              style={styles.bottomCommentInput}
              placeholder="Add a comment..."
              value={comment}
              onChangeText={setComment}
            />
            <TouchableOpacity
              style={[
                styles.bottomPostButton,
                (!comment.trim() || addCommentMutation.isPending) &&
                  styles.bottomPostButtonDisabled,
              ]}
              onPress={handlePostComment}
              disabled={!comment.trim() || addCommentMutation.isPending}
            >
              {addCommentMutation.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.bottomPostButtonText}>Post</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: "#666",
    marginTop: 16,
    marginBottom: 24,
  },
  backHomeButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "#007AFF",
    borderRadius: 8,
  },
  backHomeText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e1e1e1",
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  content: {
    flex: 1,
  },
  postContainer: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e1e1e1",
  },
  postHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  authorInfo: {
    flexDirection: "row",
    flex: 1,
  },
  authorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  authorAvatarText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  authorDetails: {
    flex: 1,
  },
  authorName: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 2,
  },
  authorHandle: {
    fontSize: 14,
    color: "#666",
  },
  postTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#333",
  },
  postContent: {
    fontSize: 16,
    lineHeight: 24,
    color: "#333",
    marginBottom: 16,
  },
  postTime: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
  },
  postMedia: {
    marginBottom: 20,
    borderRadius: 12,
    overflow: "hidden",
  },
  postImage: {
    width: "100%",
    height: 300,
    backgroundColor: "#f5f5f5",
  },
  videoPlaceholder: {
    width: "100%",
    height: 300,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
  },
  videoText: {
    fontSize: 14,
    color: "#007AFF",
    marginTop: 8,
  },
  postStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#e1e1e1",
    borderBottomWidth: 1,
    borderBottomColor: "#e1e1e1",
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  statText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 6,
  },
  postActions: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  postAction: {
    alignItems: "center",
    padding: 8,
  },
  postActionText: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  likedActionText: {
    color: "#ff375f",
  },
  bookmarkedActionText: {
    color: "#007AFF",
  },
  commentsSection: {
    padding: 20,
  },
  commentsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  commentsTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  commentsCount: {
    fontSize: 14,
    color: "#666",
  },
  addCommentContainer: {
    flexDirection: "row",
    marginBottom: 24,
  },
  userAvatarSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  userAvatarSmallText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  commentInputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e1e1e1",
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  commentInput: {
    flex: 1,
    fontSize: 16,
    maxHeight: 80,
  },
  postCommentButton: {
    marginLeft: 8,
  },
  postCommentButtonDisabled: {
    opacity: 0.5,
  },
  commentsList: {
    marginBottom: 20,
  },
  commentItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  commentAuthor: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  commentAuthorAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  commentAuthorAvatarText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  commentAuthorInfo: {
    flex: 1,
  },
  commentAuthorName: {
    fontSize: 14,
    fontWeight: "600",
  },
  commentAuthorHandle: {
    fontSize: 12,
    color: "#666",
  },
  commentTime: {
    fontSize: 12,
    color: "#999",
  },
  commentContent: {
    fontSize: 15,
    lineHeight: 22,
    color: "#333",
    marginBottom: 12,
  },
  commentActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  commentAction: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
  },
  commentActionText: {
    fontSize: 12,
    color: "#666",
    marginLeft: 4,
  },
  repliesContainer: {
    marginLeft: 40,
    marginTop: 12,
    borderLeftWidth: 2,
    borderLeftColor: "#e1e1e1",
    paddingLeft: 12,
  },
  replyItem: {
    marginBottom: 12,
  },
  replyAuthorAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  replyAuthorAvatarText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  viewAllComments: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  viewAllCommentsText: {
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "500",
    marginRight: 4,
  },
  bottomCommentContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#e1e1e1",
    backgroundColor: "#fff",
  },
  bottomCommentInputContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  bottomCommentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e1e1e1",
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginRight: 12,
  },
  bottomPostButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#007AFF",
    borderRadius: 25,
  },
  bottomPostButtonDisabled: {
    opacity: 0.5,
  },
  bottomPostButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
