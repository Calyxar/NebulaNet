// app/post/[id].tsx — COMPLETED + UPDATED ✅
// - Shows IMAGE or VIDEO correctly
// - Adds Delete Post (owner only)
// - Keeps like/save/share/comments working via your hooks

import { useAuth } from "@/hooks/useAuth";
import {
  useAddComment,
  useComments,
  useIncrementShareCount,
  usePost,
  useToggleBookmark,
  useToggleCommentLike,
  useToggleLike,
  type CommentWithAuthor,
} from "@/hooks/usePosts";
import { sharePost } from "@/lib/share";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { formatDistanceToNow } from "date-fns";
import { ResizeMode, Video } from "expo-av";
import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
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
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    data: post,
    isLoading: isLoadingPost,
    error: postError,
  } = usePost(id);

  const { data: comments = [], isLoading: isLoadingComments } = useComments(id);

  const toggleLikeMutation = useToggleLike();
  const toggleBookmarkMutation = useToggleBookmark();
  const addCommentMutation = useAddComment();
  const toggleCommentLikeMutation = useToggleCommentLike();
  const incrementShareCountMutation = useIncrementShareCount();

  const displayedComments = useMemo(
    () => (showAllComments ? comments : comments.slice(0, 3)),
    [showAllComments, comments],
  );

  const getInitials = (name: string) =>
    name
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const formatTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return dateString;
    }
  };

  const postAuthorName =
    post?.user?.full_name?.trim() || post?.user?.username?.trim() || "Unknown";

  const isOwner = useMemo(() => {
    const viewerId = (user as any)?.id || (user as any)?.user?.id;
    return !!post?.user_id && !!viewerId && post.user_id === viewerId;
  }, [post?.user_id, user]);

  const handleLike = async () => {
    if (!post) return;
    try {
      await toggleLikeMutation.mutateAsync({
        postId: post.id,
        isLiked: !!post.is_liked,
      });
    } catch {
      Alert.alert("Error", "Failed to update like");
    }
  };

  const handleBookmark = async () => {
    if (!post) return;
    try {
      await toggleBookmarkMutation.mutateAsync({
        postId: post.id,
        isSaved: !!post.is_saved,
      });
    } catch {
      Alert.alert("Error", "Failed to update save");
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
    } catch {
      Alert.alert("Error", "Failed to post comment");
    }
  };

  const toggleCommentLike = async (commentId: string) => {
    if (!post) return;
    const c = comments.find((x) => x.id === commentId);
    if (!c) return;

    try {
      await toggleCommentLikeMutation.mutateAsync({
        commentId,
        postId: post.id,
        isLiked: !!c.user_has_liked,
      });
    } catch {
      Alert.alert("Error", "Failed to update comment like");
    }
  };

  const handleShare = async () => {
    if (!post) return;

    try {
      await sharePost({
        id: post.id,
        title: post.title ?? undefined,
        content: post.content,
        author: {
          username: post.user?.username ?? "unknown",
          name: post.user?.full_name ?? post.user?.username ?? "Unknown",
        },
        community: post.community
          ? { name: post.community.name, slug: post.community.slug }
          : undefined,
      });

      await incrementShareCountMutation.mutateAsync(post.id);
    } catch (e) {
      console.warn("share failed", e);
    }
  };

  const renderAvatar = (
    avatarUrl: string | null | undefined,
    nameForInitials: string,
    size: number,
    textSize: number,
    styleOverride?: object,
    textStyleOverride?: object,
  ) => {
    if (avatarUrl) {
      return (
        <Image
          source={{ uri: avatarUrl }}
          style={[
            { width: size, height: size, borderRadius: size / 2 },
            styleOverride,
          ]}
        />
      );
    }
    return (
      <View
        style={[
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: "#007AFF",
            justifyContent: "center",
            alignItems: "center",
          },
          styleOverride,
        ]}
      >
        <Text
          style={[
            { color: "#fff", fontSize: textSize, fontWeight: "bold" },
            textStyleOverride,
          ]}
        >
          {getInitials(nameForInitials)}
        </Text>
      </View>
    );
  };

  const mediaUrl = post?.media_urls?.[0];
  const ext = typeof mediaUrl === "string" ? mediaUrl.split("?")[0] : "";
  const isImage =
    typeof mediaUrl === "string" &&
    /\.(png|jpg|jpeg|webp|gif|heic)$/i.test(ext);
  const isVideo =
    typeof mediaUrl === "string" && /\.(mp4|mov|m4v|webm|avi)$/i.test(ext);

  const openMenu = () => {
    if (!post) return;

    const buttons: any[] = [];

    if (isOwner) {
      buttons.push({
        text: isDeleting ? "Deleting..." : "Delete Post",
        style: "destructive",
        onPress: () => confirmDelete(),
      });
    }

    buttons.push(
      { text: "Share", onPress: handleShare },
      { text: "Cancel", style: "cancel" },
    );

    Alert.alert("Post Options", undefined, buttons);
  };

  const confirmDelete = () => {
    if (!post) return;
    Alert.alert("Delete post?", "This will permanently delete your post.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => doDelete(),
      },
    ]);
  };

  const doDelete = async () => {
    if (!post) return;

    setIsDeleting(true);
    try {
      // owner-only delete (RLS should also enforce)
      const viewerId = (user as any)?.id || (user as any)?.user?.id;
      if (!viewerId) throw new Error("Not logged in");

      const { error } = await supabase
        .from("posts")
        .delete()
        .eq("id", post.id)
        .eq("user_id", viewerId);

      if (error) throw error;

      Alert.alert("Deleted", "Your post was deleted.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to delete post");
    } finally {
      setIsDeleting(false);
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

        <TouchableOpacity onPress={openMenu} disabled={isDeleting}>
          <Ionicons name="ellipsis-horizontal" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.postContainer}>
          <View style={styles.postHeader}>
            <TouchableOpacity
              style={styles.authorInfo}
              onPress={() =>
                post.user?.username
                  ? router.push(`/user/${post.user.username}` as any)
                  : undefined
              }
              disabled={!post.user?.username}
            >
              {renderAvatar(post.user?.avatar_url, postAuthorName, 48, 20, {
                marginRight: 12,
              })}

              <View style={styles.authorDetails}>
                <Text style={styles.authorName}>{postAuthorName}</Text>
                {post.user?.username ? (
                  <Text style={styles.authorHandle}>@{post.user.username}</Text>
                ) : null}
              </View>
            </TouchableOpacity>

            <TouchableOpacity onPress={openMenu} activeOpacity={0.7}>
              <Ionicons name="ellipsis-horizontal" size={20} color="#666" />
            </TouchableOpacity>
          </View>

          {post.title ? (
            <Text style={styles.postTitle}>{post.title}</Text>
          ) : null}
          {!!post.content && (
            <Text style={styles.postContent}>{post.content}</Text>
          )}
          <Text style={styles.postTime}>{formatTime(post.created_at)}</Text>

          {!!mediaUrl && (
            <View style={styles.postMedia}>
              {isImage ? (
                <Image
                  source={{ uri: mediaUrl }}
                  style={styles.postImage}
                  resizeMode="cover"
                />
              ) : isVideo ? (
                <Video
                  source={{ uri: mediaUrl }}
                  style={styles.postVideo}
                  useNativeControls
                  resizeMode={ResizeMode.COVER}
                  isLooping={false}
                />
              ) : (
                <View style={styles.videoPlaceholder}>
                  <Ionicons name="document-outline" size={46} color="#007AFF" />
                  <Text style={styles.videoText}>Unsupported media</Text>
                </View>
              )}
            </View>
          )}

          <View style={styles.postStats}>
            <View style={styles.statItem}>
              <Ionicons name="heart" size={20} color="#ff375f" />
              <Text style={styles.statText}>
                {(post.like_count ?? 0).toLocaleString()}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="chatbubble-outline" size={20} color="#666" />
              <Text style={styles.statText}>
                {(post.comment_count ?? 0).toLocaleString()}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="arrow-redo-outline" size={20} color="#666" />
              <Text style={styles.statText}>
                {(post.share_count ?? 0).toLocaleString()}
              </Text>
            </View>
          </View>

          <View style={styles.postActions}>
            <TouchableOpacity
              style={styles.postAction}
              onPress={handleLike}
              disabled={toggleLikeMutation.isPending}
            >
              <Ionicons
                name={post.is_liked ? "heart" : "heart-outline"}
                size={24}
                color={post.is_liked ? "#ff375f" : "#666"}
              />
              <Text
                style={[
                  styles.postActionText,
                  post.is_liked && styles.likedActionText,
                ]}
              >
                Like
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.postAction}
              onPress={() => {
                // scroll to comment box feel (optional)
              }}
            >
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
                name={post.is_saved ? "bookmark" : "bookmark-outline"}
                size={24}
                color={post.is_saved ? "#007AFF" : "#666"}
              />
              <Text
                style={[
                  styles.postActionText,
                  post.is_saved && styles.bookmarkedActionText,
                ]}
              >
                Save
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* COMMENTS */}
        <View style={styles.commentsSection}>
          <View style={styles.commentsHeader}>
            <Text style={styles.commentsTitle}>Comments</Text>
            <Text style={styles.commentsCount}>{comments.length} comments</Text>
          </View>

          {user ? (
            <View style={styles.addCommentContainer}>
              {renderAvatar(
                (user as any)?.user_metadata?.avatar_url,
                ((user as any)?.user_metadata?.full_name as string) ||
                  ((user as any)?.email as string) ||
                  "?",
                40,
                16,
                { marginRight: 12 },
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
          ) : null}

          {isLoadingComments ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#007AFF" />
            </View>
          ) : (
            <View style={styles.commentsList}>
              {displayedComments.map((commentItem: CommentWithAuthor) => (
                <View key={commentItem.id} style={styles.commentItem}>
                  <View style={styles.commentAuthor}>
                    <TouchableOpacity
                      onPress={() =>
                        commentItem.author?.username
                          ? router.push(
                              `/user/${commentItem.author.username}` as any,
                            )
                          : undefined
                      }
                      disabled={!commentItem.author?.username}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        flex: 1,
                      }}
                    >
                      {renderAvatar(
                        commentItem.author?.avatar_url,
                        commentItem.author?.full_name ||
                          commentItem.author?.username ||
                          "User",
                        32,
                        14,
                        { marginRight: 8 },
                      )}
                      <View style={styles.commentAuthorInfo}>
                        <Text style={styles.commentAuthorName}>
                          {commentItem.author?.full_name ||
                            commentItem.author?.username ||
                            "User"}
                        </Text>
                        {commentItem.author?.username ? (
                          <Text style={styles.commentAuthorHandle}>
                            @{commentItem.author.username}
                          </Text>
                        ) : null}
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
                        {commentItem.likes_count ?? 0}
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
                </View>
              ))}

              {comments.length > 3 && !showAllComments ? (
                <TouchableOpacity
                  style={styles.viewAllComments}
                  onPress={() => setShowAllComments(true)}
                >
                  <Text style={styles.viewAllCommentsText}>
                    View All Comments
                  </Text>
                  <Ionicons name="chevron-down" size={16} color="#007AFF" />
                </TouchableOpacity>
              ) : null}

              {showAllComments && comments.length > 3 ? (
                <TouchableOpacity
                  style={styles.viewAllComments}
                  onPress={() => setShowAllComments(false)}
                >
                  <Text style={styles.viewAllCommentsText}>
                    Show Less Comments
                  </Text>
                  <Ionicons name="chevron-up" size={16} color="#007AFF" />
                </TouchableOpacity>
              ) : null}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  loadingContainer: {
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
  errorText: { fontSize: 18, color: "#666", marginTop: 16, marginBottom: 24 },
  backHomeButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "#007AFF",
    borderRadius: 8,
  },
  backHomeText: { color: "#fff", fontSize: 16, fontWeight: "600" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e1e1e1",
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: "bold" },

  content: { flex: 1 },

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
  authorInfo: { flexDirection: "row", flex: 1 },
  authorDetails: { flex: 1 },
  authorName: { fontSize: 18, fontWeight: "600", marginBottom: 2 },
  authorHandle: { fontSize: 14, color: "#666" },

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
  postTime: { fontSize: 14, color: "#666", marginBottom: 20 },

  postMedia: { marginBottom: 20, borderRadius: 12, overflow: "hidden" },
  postImage: { width: "100%", height: 300, backgroundColor: "#f5f5f5" },
  postVideo: { width: "100%", height: 300, backgroundColor: "#000" },

  videoPlaceholder: {
    width: "100%",
    height: 300,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
  },
  videoText: { fontSize: 14, color: "#007AFF", marginTop: 8 },

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
  statItem: { flexDirection: "row", alignItems: "center" },
  statText: { fontSize: 14, color: "#666", marginLeft: 6 },

  postActions: { flexDirection: "row", justifyContent: "space-around" },
  postAction: { alignItems: "center", padding: 8 },
  postActionText: { fontSize: 12, color: "#666", marginTop: 4 },
  likedActionText: { color: "#ff375f" },
  bookmarkedActionText: { color: "#007AFF" },

  commentsSection: { padding: 20 },
  commentsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  commentsTitle: { fontSize: 20, fontWeight: "bold" },
  commentsCount: { fontSize: 14, color: "#666" },

  addCommentContainer: { flexDirection: "row", marginBottom: 24 },
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
  commentInput: { flex: 1, fontSize: 16, maxHeight: 80 },
  postCommentButton: { marginLeft: 8 },
  postCommentButtonDisabled: { opacity: 0.5 },

  commentsList: { marginBottom: 20 },
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
  commentAuthorInfo: { flex: 1 },
  commentAuthorName: { fontSize: 14, fontWeight: "600" },
  commentAuthorHandle: { fontSize: 12, color: "#666" },
  commentTime: { fontSize: 12, color: "#999" },

  commentContent: {
    fontSize: 15,
    lineHeight: 22,
    color: "#333",
    marginBottom: 12,
  },

  commentActions: { flexDirection: "row", alignItems: "center" },
  commentAction: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
  },
  commentActionText: { fontSize: 12, color: "#666", marginLeft: 4 },

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
});
