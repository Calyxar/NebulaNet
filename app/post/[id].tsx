// app/post/[id].tsx
import CommentRow from "@/components/post/CommentRow";
import PollCard from "@/components/post/PollCard";
import RepostSheet, { type RepostSheetRef } from "@/components/RepostSheet";
import ShareSheet, { type ShareSheetRef } from "@/components/ShareSheet";
import Avatar from "@/components/user/Avatar";
import { useAuth } from "@/hooks/useAuth";
import {
  useAddComment,
  useComments,
  useDeleteComment,
  useDeletePost,
  usePost,
  useToggleBookmark,
  useToggleCommentLike,
  useToggleLike,
  useToggleRepost,
  type CommentWithAuthor,
} from "@/hooks/usePosts";
import { generatePostLink } from "@/lib/share";
import { useTheme } from "@/providers/ThemeProvider";
import { formatDate } from "@/utils/format";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type AlertButton,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

function coerceParamToString(v: unknown): string | null {
  if (typeof v === "string" && v.trim().length) return v;
  if (Array.isArray(v) && typeof v[0] === "string" && v[0].trim().length)
    return v[0];
  return null;
}

const isVideoUrl = (url?: string | null) => {
  if (!url) return false;
  const clean = url.split("?")[0].toLowerCase();
  return ["mp4", "mov", "m4v", "webm", "mkv", "avi"].some((e) =>
    clean.endsWith(`.${e}`),
  );
};

function findCommentById(
  comments: CommentWithAuthor[],
  id: string,
): CommentWithAuthor | null {
  for (const c of comments) {
    if (c.id === id) return c;
    if (c.replies?.length) {
      const found = findCommentById(c.replies, id);
      if (found) return found;
    }
  }
  return null;
}

export default function PostDetailScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const postId = coerceParamToString(params.id);

  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const { bottom: bottomInset } = useSafeAreaInsets();

  const [comment, setComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<CommentWithAuthor | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [isReposted, setIsReposted] = useState(false);
  const [repostCount, setRepostCount] = useState(0);
  const [isReposting, setIsReposting] = useState(false);

  const commentInputRef = useRef<TextInput>(null);
  const repostSheetRef = useRef<RepostSheetRef>(null);
  const shareSheetRef = useRef<ShareSheetRef>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const {
    data: post,
    isLoading: isLoadingPost,
    isError: isPostError,
  } = usePost(postId ?? "");
  const { data: comments = [], isLoading: isLoadingComments } = useComments(
    postId ?? undefined,
  );

  const toggleLikeMutation = useToggleLike();
  const toggleBookmarkMutation = useToggleBookmark();
  const toggleRepostMutation = useToggleRepost();
  const addCommentMutation = useAddComment();
  const toggleCommentLikeMutation = useToggleCommentLike();
  const deleteCommentMutation = useDeleteComment();
  const deletePostMutation = useDeletePost();

  const viewerId = user?.uid;
  const isOwner = !!post?.user_id && !!viewerId && post.user_id === viewerId;

  useEffect(() => {
    if (post) {
      setIsReposted(!!post.is_reposted);
      setRepostCount(post.repost_count ?? 0);
    }
  }, [post?.id, post?.is_reposted, post?.repost_count]);

  if (!postId) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.centeredBox}>
          <Ionicons
            name="alert-circle-outline"
            size={64}
            color={colors.border}
          />
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>
            No post specified
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.pillBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.pillBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoadingPost) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <Header title="Post" onBack={() => router.back()} colors={colors} />
        <View style={styles.centeredBox}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (isPostError || !post) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <Header title="Post" onBack={() => router.back()} colors={colors} />
        <View style={styles.centeredBox}>
          <Ionicons
            name="alert-circle-outline"
            size={64}
            color={colors.border}
          />
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>
            This post couldn't be found
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.pillBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.pillBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const authorName =
    post.user?.full_name?.trim() || post.user?.username?.trim() || "User";
  const isTruncated = (post.content?.length ?? 0) > 280;
  const displayContent =
    expanded || !isTruncated ? post.content : `${post.content.slice(0, 280)}…`;
  const isPoll = post.post_type === "poll" && !!(post as any).poll;

  const safeMedia: string[] = Array.isArray(post.media_urls)
    ? post.media_urls
    : [];
  const imageUrls = safeMedia.filter((url) => !isVideoUrl(url));

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

  const handleRepost = async () => {
    if (isReposting) return;
    setIsReposting(true);
    const prev = isReposted;
    const prevCount = repostCount;
    setIsReposted(!prev);
    setRepostCount(prev ? Math.max(0, prevCount - 1) : prevCount + 1);
    try {
      await toggleRepostMutation.mutateAsync({
        postId: post.id,
        isReposted: prev,
      });
    } catch {
      setIsReposted(prev);
      setRepostCount(prevCount);
      Alert.alert("Error", "Could not repost. Please try again.");
    } finally {
      setIsReposting(false);
    }
  };

  const handleQuoteRepost = () => {
    router.push({
      pathname: "/create/post",
      params: { quotePostId: post.id },
    } as any);
  };

  const handlePostComment = async () => {
    if (!comment.trim()) return;
    try {
      await addCommentMutation.mutateAsync({
        post_id: post.id,
        content: comment.trim(),
        parent_id: replyingTo?.id ?? null,
      });
      setComment("");
      setReplyingTo(null);
      setTimeout(
        () => scrollViewRef.current?.scrollToEnd({ animated: true }),
        150,
      );
    } catch {
      Alert.alert("Error", "Failed to post comment");
    }
  };

  const handleCommentLike = (commentId: string) => {
    const target = findCommentById(comments, commentId);
    if (!target) return;
    toggleCommentLikeMutation.mutate({
      postId: post.id,
      commentId,
      isLiked: target.user_has_liked,
    });
  };

  const handleCommentReply = (target: CommentWithAuthor) => {
    setReplyingTo(target);
    commentInputRef.current?.focus();
  };

  const handleCommentDelete = (commentId: string) => {
    deleteCommentMutation.mutate({ postId: post.id, commentId });
  };

  const handleDeletePost = () => {
    Alert.alert("Delete post?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          deletePostMutation.mutate(post.id);
          router.back();
        },
      },
    ]);
  };

  const handleMoreOptions = () => {
    const buttons: AlertButton[] = [
      {
        text: isReposted ? "Undo Repost" : "Repost",
        onPress: () => (repostSheetRef.current as any)?.present(),
      },
      {
        text: "Share Post",
        onPress: () => (shareSheetRef.current as any)?.present(),
      },
    ];
    if (isOwner) {
      buttons.push({
        text: "Delete Post",
        style: "destructive",
        onPress: handleDeletePost,
      });
    } else {
      buttons.push({
        text: "Report Post",
        style: "destructive",
        onPress: () =>
          Alert.alert("Report", "Reporting will be available soon."),
      });
    }
    Alert.alert("Post Options", undefined, [
      ...buttons,
      { text: "Cancel", style: "cancel" },
    ]);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={["top", "left", "right"]}
      >
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <Header title="Post" onBack={() => router.back()} colors={colors}>
          <TouchableOpacity
            onPress={handleMoreOptions}
            style={styles.headerBtn}
            hitSlop={12}
          >
            <Ionicons
              name="ellipsis-horizontal"
              size={20}
              color={colors.text}
            />
          </TouchableOpacity>
        </Header>

        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Post card */}
          <View
            style={[
              styles.postCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.authorRow}>
              <TouchableOpacity
                onPress={() => router.push(`/user/${post.user_id}` as any)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  flex: 1,
                  gap: 10,
                }}
                activeOpacity={0.85}
              >
                <Avatar
                  size={44}
                  name={authorName}
                  image={post.user?.avatar_url}
                />
                <View style={styles.authorInfo}>
                  <Text style={[styles.authorName, { color: colors.text }]}>
                    {authorName}
                  </Text>
                  {!!post.user?.username && (
                    <Text
                      style={[
                        styles.authorUsername,
                        { color: colors.textSecondary },
                      ]}
                    >
                      @{post.user.username}
                    </Text>
                  )}
                  {!!post.community && (
                    <Text
                      style={[
                        styles.community,
                        { color: colors.textSecondary },
                      ]}
                    >
                      in {post.community}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            </View>

            {!!post.title && (
              <Text style={[styles.postTitle, { color: colors.text }]}>
                {post.title}
              </Text>
            )}

            {isPoll ? (
              <PollCard
                postId={post.id}
                poll={(post as any).poll}
                accentColor={colors.primary}
                textColor={colors.text}
                subColor={colors.textSecondary}
                cardBg={colors.surface}
                borderColor={colors.border}
              />
            ) : (
              <>
                <Text style={[styles.postBody, { color: colors.text }]}>
                  {displayContent}
                </Text>
                {isTruncated && (
                  <Text
                    style={[styles.readMore, { color: colors.primary }]}
                    onPress={() => setExpanded((v) => !v)}
                  >
                    {expanded ? "Show less" : "Read more"}
                  </Text>
                )}
              </>
            )}

            {imageUrls.length > 0 && (
              <View style={{ marginTop: 10, gap: 6 }}>
                {imageUrls.map((url, idx) => (
                  <Image
                    key={url + idx}
                    source={{ uri: url }}
                    style={styles.postImage}
                    resizeMode="cover"
                  />
                ))}
              </View>
            )}

            <Text
              style={[
                styles.timestamp,
                { color: colors.textTertiary, marginTop: 10 },
              ]}
            >
              {formatDate(post.created_at)}
            </Text>
          </View>

          {/* Stats + actions card */}
          <View
            style={[
              styles.statsCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={[styles.statsRow, { borderColor: colors.border }]}>
              <Text style={[styles.statText, { color: colors.textSecondary }]}>
                <Text style={[styles.statNum, { color: colors.text }]}>
                  {post.like_count}
                </Text>{" "}
                Likes
              </Text>
              <Text style={[styles.statText, { color: colors.textSecondary }]}>
                <Text style={[styles.statNum, { color: colors.text }]}>
                  {post.comment_count}
                </Text>{" "}
                Comments
              </Text>
              <Text style={[styles.statText, { color: colors.textSecondary }]}>
                <Text style={[styles.statNum, { color: colors.text }]}>
                  {repostCount}
                </Text>{" "}
                Reposts
              </Text>
              <Text style={[styles.statText, { color: colors.textSecondary }]}>
                <Text style={[styles.statNum, { color: colors.text }]}>
                  {post.save_count}
                </Text>{" "}
                Saves
              </Text>
            </View>

            <View style={[styles.actionRow, { borderColor: colors.border }]}>
              <TouchableOpacity style={styles.actionBtn} onPress={handleLike}>
                <Ionicons
                  name={post.is_liked ? "heart" : "heart-outline"}
                  size={24}
                  color={post.is_liked ? "#FF375F" : colors.textSecondary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => commentInputRef.current?.focus()}
              >
                <Ionicons
                  name="chatbubble-outline"
                  size={22}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => (repostSheetRef.current as any)?.present()}
                disabled={isReposting}
              >
                <Ionicons
                  name={isReposted ? "repeat" : "repeat-outline"}
                  size={24}
                  color={isReposted ? colors.primary : colors.textSecondary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => (shareSheetRef.current as any)?.present()}
              >
                <Ionicons
                  name="share-outline"
                  size={22}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={handleBookmark}
              >
                <Ionicons
                  name={post.is_saved ? "bookmark" : "bookmark-outline"}
                  size={22}
                  color={post.is_saved ? colors.primary : colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Comments */}
          <View
            style={[
              styles.commentsSection,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.commentsSectionTitle, { color: colors.text }]}>
              Comments
            </Text>

            {isLoadingComments ? (
              <ActivityIndicator color={colors.primary} />
            ) : comments.length === 0 ? (
              <View style={styles.noComments}>
                <Ionicons
                  name="chatbubble-outline"
                  size={32}
                  color={colors.textTertiary}
                />
                <Text
                  style={[
                    styles.noCommentsText,
                    { color: colors.textSecondary },
                  ]}
                >
                  No comments yet — be the first to reply
                </Text>
              </View>
            ) : (
              comments.map((c) => (
                <CommentRow
                  key={c.id}
                  comment={c}
                  colors={colors}
                  formatDate={formatDate}
                  onLike={handleCommentLike}
                  onReply={handleCommentReply}
                  onDelete={handleCommentDelete}
                  currentUserId={viewerId}
                />
              ))
            )}
          </View>
        </ScrollView>

        {/* Composer */}
        <View
          style={[
            styles.commentInputBarWrap,
            { paddingBottom: Math.max(bottomInset, 10) },
          ]}
        >
          {replyingTo && (
            <View
              style={[styles.replyingBanner, { borderColor: colors.border }]}
            >
              <Text
                style={[styles.replyingText, { color: colors.textSecondary }]}
              >
                Replying to{" "}
                {replyingTo.author?.full_name ||
                  replyingTo.author?.username ||
                  "User"}
              </Text>
              <Pressable onPress={() => setReplyingTo(null)} hitSlop={8}>
                <Ionicons name="close" size={16} color={colors.textSecondary} />
              </Pressable>
            </View>
          )}
          <View
            style={[
              styles.commentInputBar,
              { borderColor: colors.border, backgroundColor: colors.card },
            ]}
          >
            <TextInput
              ref={commentInputRef}
              value={comment}
              onChangeText={setComment}
              placeholder="Add a comment..."
              placeholderTextColor={colors.textTertiary}
              style={[
                styles.commentInput,
                { color: colors.text, borderColor: colors.border },
              ]}
              multiline
            />
            <TouchableOpacity
              onPress={handlePostComment}
              disabled={!comment.trim() || addCommentMutation.isPending}
              style={[
                styles.sendBtn,
                { backgroundColor: colors.primary },
                (!comment.trim() || addCommentMutation.isPending) &&
                  styles.sendBtnDisabled,
              ]}
            >
              {addCommentMutation.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="arrow-up" size={18} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      <RepostSheet
        ref={repostSheetRef}
        isReposted={isReposted}
        onRepost={handleRepost}
        onQuoteRepost={handleQuoteRepost}
        onUndoRepost={handleRepost}
      />
      <ShareSheet
        ref={shareSheetRef}
        title="Share Post"
        url={generatePostLink(post.id)}
        text={post.content}
        shareMessage={`Check out this post on NebulaNet: ${post.content.slice(0, 100)}${
          post.content.length > 100 ? "..." : ""
        }`}
      />
    </KeyboardAvoidingView>
  );
}

function Header({
  title,
  onBack,
  colors,
  children,
}: {
  title: string;
  onBack: () => void;
  colors: any;
  children?: React.ReactNode;
}) {
  return (
    <View style={[styles.header, { borderColor: colors.border }]}>
      <TouchableOpacity onPress={onBack} style={styles.headerBtn} hitSlop={12}>
        <Ionicons name="arrow-back" size={22} color={colors.text} />
      </TouchableOpacity>
      <Text style={[styles.headerTitle, { color: colors.text }]}>{title}</Text>
      <View style={styles.headerBtn}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  headerBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 16, fontWeight: "800" },
  centeredBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 12,
  },
  errorText: { fontSize: 16, textAlign: "center" },
  pillBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
    marginTop: 8,
  },
  pillBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  scrollContent: { paddingTop: 12, paddingHorizontal: 14, paddingBottom: 24 },
  postCard: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  authorRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  authorInfo: { flex: 1 },
  authorName: { fontSize: 16, fontWeight: "700" },
  authorUsername: { fontSize: 13, marginTop: 1 },
  community: { fontSize: 13, fontWeight: "500", marginTop: 2 },
  timestamp: { fontSize: 12 },
  postTitle: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 8,
    lineHeight: 26,
  },
  postBody: { fontSize: 16, lineHeight: 24 },
  readMore: { fontWeight: "600", marginTop: 4 },
  postImage: {
    width: "100%",
    height: 260,
    borderRadius: 14,
  },
  statsCard: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  statsRow: {
    flexDirection: "row",
    gap: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    flexWrap: "wrap",
  },
  statText: { fontSize: 13 },
  statNum: { fontWeight: "700" },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 10,
  },
  actionBtn: { padding: 6 },
  commentsSection: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  commentsSectionTitle: { fontSize: 16, fontWeight: "800", marginBottom: 14 },
  noComments: { alignItems: "center", paddingVertical: 24, gap: 8 },
  noCommentsText: { fontSize: 14, textAlign: "center" },
  commentInputBarWrap: { paddingTop: 6 },
  replyingBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderTopWidth: 1,
  },
  replyingText: { fontSize: 12, fontWeight: "600" },
  commentInputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  commentInput: {
    flex: 1,
    fontSize: 14,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    maxHeight: 100,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: { opacity: 0.45 },
});
