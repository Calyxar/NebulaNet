// app/post/[id].tsx — COMPLETED + UPDATED ✅ full theme support
import { PostCardSkeleton } from "@/components/Skeleton";
import HashtagText from "@/components/post/HashtagText";
import PollCard from "@/components/post/PollCard";
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
import { db } from "@/lib/firebase";
import { sharePost } from "@/lib/share";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { formatDistanceToNow } from "date-fns";
import { router, useLocalSearchParams } from "expo-router";
import { deleteDoc, doc, getDoc } from "firebase/firestore";
import React, { useMemo, useRef, useState } from "react";
import {
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
import { SafeAreaView } from "react-native-safe-area-context";

function coerceParamToString(v: unknown): string | null {
  if (typeof v === "string" && v.trim().length) return v;
  if (Array.isArray(v) && typeof v[0] === "string" && v[0].trim().length)
    return v[0];
  return null;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatTime(dateString: string): string {
  try {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  } catch {
    return dateString;
  }
}

function Avatar({
  uri,
  name,
  size,
  fallbackColor,
}: {
  uri?: string | null;
  name: string;
  size: number;
  fallbackColor?: string;
}) {
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: fallbackColor ?? "#7C3AED",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text
        style={{ color: "#fff", fontSize: size * 0.36, fontWeight: "bold" }}
      >
        {getInitials(name || "?")}
      </Text>
    </View>
  );
}

export default function PostDetailScreen() {
  const params = useLocalSearchParams();
  const postId = useMemo(
    () => coerceParamToString((params as any)?.id),
    [params],
  );

  const { user } = useAuth();
  const { colors, isDark } = useTheme();

  const [comment, setComment] = useState("");
  const [showAllComments, setShowAllComments] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const commentInputRef = useRef<TextInput>(null);

  const {
    data: post,
    isLoading: isLoadingPost,
    error: postError,
  } = usePost(postId ?? "");

  const { data: comments = [], isLoading: isLoadingComments } = useComments(
    postId ?? "",
  );

  const toggleLikeMutation = useToggleLike();
  const toggleBookmarkMutation = useToggleBookmark();
  const addCommentMutation = useAddComment();
  const toggleCommentLikeMutation = useToggleCommentLike();
  const incrementShareCountMutation = useIncrementShareCount();

  const displayedComments = useMemo(
    () => (showAllComments ? comments : comments.slice(0, 3)),
    [showAllComments, comments],
  );

  const viewerId = useMemo(() => {
    const u = user as any;
    return (u?.uid as string | undefined) || (u?.id as string | undefined);
  }, [user]);

  const isOwner = useMemo(
    () => !!post?.user_id && !!viewerId && post.user_id === viewerId,
    [post?.user_id, viewerId],
  );

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

  const handleCommentLike = async (commentId: string) => {
    if (!post) return;
    const c = comments.find((x: CommentWithAuthor) => x.id === commentId);
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

  const doDelete = async () => {
    if (!post) return;
    setIsDeleting(true);
    try {
      if (!viewerId) throw new Error("Not logged in");
      const ref = doc(db, "posts", post.id);
      const snap = await getDoc(ref);
      if (!snap.exists()) throw new Error("Post not found");
      const data: any = snap.data();
      if (data?.user_id && data.user_id !== viewerId)
        throw new Error("You can only delete your own post");
      await deleteDoc(ref);
      Alert.alert("Deleted", "Your post was deleted.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to delete post");
    } finally {
      setIsDeleting(false);
    }
  };

  const confirmDelete = () => {
    Alert.alert("Delete post?", "This will permanently delete your post.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: doDelete },
    ] as AlertButton[]);
  };

  const openMenu = () => {
    if (!post) return;
    const buttons: AlertButton[] = [];
    if (isOwner) {
      buttons.push({
        text: isDeleting ? "Deleting…" : "Delete Post",
        style: "destructive",
        onPress: confirmDelete,
      });
    }
    buttons.push(
      { text: "Share", onPress: handleShare },
      { text: "Cancel", style: "cancel" },
    );
    Alert.alert("Post Options", undefined, buttons);
  };

  const mediaUrl = post?.media_urls?.[0];
  const mediaExt = typeof mediaUrl === "string" ? mediaUrl.split("?")[0] : "";
  const isImage =
    typeof mediaUrl === "string" &&
    /\.(png|jpg|jpeg|webp|gif|heic)$/i.test(mediaExt);
  const isVideo =
    typeof mediaUrl === "string" &&
    /\.(mp4|mov|m4v|webm|avi|mkv)$/i.test(mediaExt);

  const isPoll = (post as any)?.post_type === "poll";

  const HeaderBar = ({ showMenu = true }: { showMenu?: boolean }) => (
    <View
      style={[
        styles.header,
        {
          backgroundColor: colors.card,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <TouchableOpacity
        onPress={() => router.back()}
        style={styles.backButton}
        hitSlop={8}
      >
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </TouchableOpacity>
      <Text style={[styles.headerTitle, { color: colors.text }]}>
        {isPoll ? "Poll" : "Post"}
      </Text>
      {showMenu ? (
        <TouchableOpacity onPress={openMenu} disabled={isDeleting} hitSlop={8}>
          <Ionicons name="ellipsis-horizontal" size={24} color={colors.text} />
        </TouchableOpacity>
      ) : (
        <View style={{ width: 32 }} />
      )}
    </View>
  );

  if (!postId) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <HeaderBar showMenu={false} />
        <View style={styles.centeredBox}>
          <Ionicons
            name="alert-circle-outline"
            size={64}
            color={colors.border}
          />
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>
            Invalid post link
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
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <HeaderBar showMenu={false} />
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <PostCardSkeleton />
          <PostCardSkeleton />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (postError || !post) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <HeaderBar showMenu={false} />
        <View style={styles.centeredBox}>
          <Ionicons
            name="alert-circle-outline"
            size={64}
            color={colors.border}
          />
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>
            {postError ? "Failed to load post" : "Post not found"}
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

  const postAuthorName =
    post.user?.full_name?.trim() || post.user?.username?.trim() || "Unknown";

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <HeaderBar />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Post card ── */}
          <View
            style={[
              styles.postCard,
              {
                backgroundColor: colors.card,
                shadowOpacity: isDark ? 0.25 : 0.06,
              },
            ]}
          >
            {/* Author */}
            <Pressable
              style={styles.authorRow}
              onPress={() =>
                post.user?.username
                  ? router.push(`/user/${post.user.username}` as any)
                  : undefined
              }
            >
              <Avatar
                uri={post.user?.avatar_url}
                name={postAuthorName}
                size={44}
                fallbackColor={colors.primary}
              />
              <View style={styles.authorInfo}>
                <Text style={[styles.authorName, { color: colors.text }]}>
                  {postAuthorName}
                </Text>
                {post.user?.username && (
                  <Text
                    style={[
                      styles.authorUsername,
                      { color: colors.textSecondary },
                    ]}
                  >
                    @{post.user.username}
                  </Text>
                )}
              </View>
              <Text style={[styles.timestamp, { color: colors.textTertiary }]}>
                {formatTime(post.created_at)}
              </Text>
            </Pressable>

            {/* Community badge */}
            {post.community && (
              <Pressable
                style={[
                  styles.communityBadge,
                  { backgroundColor: colors.primary + "18" },
                ]}
                onPress={() =>
                  router.push(`/community/${post.community!.slug}` as any)
                }
              >
                <Ionicons name="people" size={13} color={colors.primary} />
                <Text style={[styles.communityText, { color: colors.primary }]}>
                  {post.community.name}
                </Text>
              </Pressable>
            )}

            {/* Title */}
            {!!post.title && !isPoll && (
              <Text style={[styles.postTitle, { color: colors.text }]}>
                {post.title}
              </Text>
            )}

            {/* Poll title */}
            {isPoll && (
              <Text style={[styles.pollQuestion, { color: colors.text }]}>
                {post.title || post.content}
              </Text>
            )}

            {/* Body */}
            {!isPoll && !!post.content && (
              <HashtagText
                text={post.content}
                style={[styles.postBody, { color: colors.textSecondary }] as any}
              />
            )}

            {/* Poll card */}
            {isPoll && (post as any).poll && (
              <PollCard
                postId={post.id}
                poll={(post as any).poll}
                accentColor={colors.primary}
                textColor={colors.text}
                subColor={colors.textTertiary}
                cardBg={colors.surface}
                borderColor={colors.border}
              />
            )}

            {/* Image */}
            {isImage && mediaUrl && (
              <Image
                source={{ uri: mediaUrl }}
                style={[styles.media, { backgroundColor: colors.surface }]}
                resizeMode="cover"
              />
            )}

            {/* Video badge */}
            {isVideo && mediaUrl && (
              <View style={styles.videoBadgeWrap}>
                <Ionicons name="videocam" size={20} color="#fff" />
                <Text style={styles.videoBadgeText}>Video attachment</Text>
              </View>
            )}

            {(post.media_urls?.length ?? 0) > 1 && (
              <Text style={[styles.moreMedia, { color: colors.textTertiary }]}>
                +{post.media_urls.length - 1} more{" "}
                {post.media_urls.length - 1 === 1 ? "file" : "files"}
              </Text>
            )}

            {/* Stats */}
            <View style={[styles.statsRow, { borderTopColor: colors.border }]}>
              <Text style={[styles.statText, { color: colors.textSecondary }]}>
                <Text style={[styles.statNum, { color: colors.text }]}>
                  {(post.like_count ?? 0).toLocaleString()}
                </Text>{" "}
                {post.like_count === 1 ? "like" : "likes"}
              </Text>
              <Text style={[styles.statText, { color: colors.textSecondary }]}>
                <Text style={[styles.statNum, { color: colors.text }]}>
                  {(post.comment_count ?? 0).toLocaleString()}
                </Text>{" "}
                {post.comment_count === 1 ? "comment" : "comments"}
              </Text>
              <Text style={[styles.statText, { color: colors.textSecondary }]}>
                <Text style={[styles.statNum, { color: colors.text }]}>
                  {(post.share_count ?? 0).toLocaleString()}
                </Text>{" "}
                {post.share_count === 1 ? "share" : "shares"}
              </Text>
            </View>

            {/* Actions */}
            <View style={[styles.actionRow, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={handleLike}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={post.is_liked ? "heart" : "heart-outline"}
                  size={22}
                  color={post.is_liked ? colors.like : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.actionLabel,
                    {
                      color: post.is_liked ? colors.like : colors.textSecondary,
                    },
                  ]}
                >
                  Like
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => commentInputRef.current?.focus()}
                activeOpacity={0.75}
              >
                <Ionicons
                  name="chatbubble-outline"
                  size={22}
                  color={colors.textSecondary}
                />
                <Text
                  style={[styles.actionLabel, { color: colors.textSecondary }]}
                >
                  Comment
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionBtn}
                onPress={handleShare}
                activeOpacity={0.75}
              >
                <Ionicons
                  name="arrow-redo-outline"
                  size={22}
                  color={colors.textSecondary}
                />
                <Text
                  style={[styles.actionLabel, { color: colors.textSecondary }]}
                >
                  Share
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionBtn}
                onPress={handleBookmark}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={post.is_saved ? "bookmark" : "bookmark-outline"}
                  size={22}
                  color={post.is_saved ? colors.save : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.actionLabel,
                    {
                      color: post.is_saved ? colors.save : colors.textSecondary,
                    },
                  ]}
                >
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Comments ── */}
          <View
            style={[
              styles.commentsSection,
              {
                backgroundColor: colors.card,
                shadowOpacity: isDark ? 0.25 : 0.05,
              },
            ]}
          >
            <Text style={[styles.commentsSectionTitle, { color: colors.text }]}>
              Comments
              {comments.length > 0 && (
                <Text style={{ color: colors.textTertiary, fontWeight: "600" }}>
                  {" "}
                  ({comments.length})
                </Text>
              )}
            </Text>

            {isLoadingComments ? (
              <View style={styles.commentsLoading}>
                {Array(3)
                  .fill(null)
                  .map((_, i) => (
                    <View key={i} style={styles.commentSkeletonRow}>
                      <View
                        style={[
                          styles.commentSkeletonAvatar,
                          { backgroundColor: colors.border },
                        ]}
                      />
                      <View style={styles.commentSkeletonLines}>
                        <View
                          style={[
                            styles.commentSkeletonName,
                            { backgroundColor: colors.border },
                          ]}
                        />
                        <View
                          style={[
                            styles.commentSkeletonBody,
                            { backgroundColor: colors.border },
                          ]}
                        />
                      </View>
                    </View>
                  ))}
              </View>
            ) : comments.length === 0 ? (
              <View style={styles.noComments}>
                <Ionicons
                  name="chatbubble-outline"
                  size={32}
                  color={colors.border}
                />
                <Text
                  style={[
                    styles.noCommentsText,
                    { color: colors.textTertiary },
                  ]}
                >
                  No comments yet. Be first!
                </Text>
              </View>
            ) : (
              <>
                {displayedComments.map((c: CommentWithAuthor, idx: number) => {
                  const authorName =
                    c.author?.full_name?.trim() ||
                    c.author?.username?.trim() ||
                    "User";

                  return (
                    <View
                      key={c.id}
                      style={[
                        styles.commentRow,
                        idx !== 0 && [
                          styles.commentBorder,
                          { borderTopColor: colors.border },
                        ],
                      ]}
                    >
                      <Avatar
                        uri={c.author?.avatar_url}
                        name={authorName}
                        size={34}
                        fallbackColor={colors.primary}
                      />
                      <View style={styles.commentBody}>
                        <View style={styles.commentHeader}>
                          <Text
                            style={[
                              styles.commentAuthor,
                              { color: colors.text },
                            ]}
                          >
                            {authorName}
                          </Text>
                          <Text
                            style={[
                              styles.commentTime,
                              { color: colors.textTertiary },
                            ]}
                          >
                            {formatTime(c.created_at)}
                          </Text>
                        </View>
                        <HashtagText
                          text={c.content}
                          style={StyleSheet.flatten([
                            styles.commentText,
                            { color: colors.textSecondary },
                          ])}
                        />
                        <TouchableOpacity
                          style={styles.commentLikeBtn}
                          onPress={() => handleCommentLike(c.id)}
                          activeOpacity={0.75}
                        >
                          <Ionicons
                            name={c.user_has_liked ? "heart" : "heart-outline"}
                            size={14}
                            color={
                              c.user_has_liked
                                ? colors.like
                                : colors.textTertiary
                            }
                          />
                          {(c.likes_count ?? 0) > 0 && (
                            <Text
                              style={[
                                styles.commentLikeCount,
                                { color: colors.textTertiary },
                              ]}
                            >
                              {c.likes_count}
                            </Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}

                {comments.length > 3 && (
                  <TouchableOpacity
                    style={styles.showMoreBtn}
                    onPress={() => setShowAllComments((v) => !v)}
                    activeOpacity={0.85}
                  >
                    <Text
                      style={[styles.showMoreText, { color: colors.primary }]}
                    >
                      {showAllComments
                        ? "Show less"
                        : `Show ${comments.length - 3} more comment${
                            comments.length - 3 === 1 ? "" : "s"
                          }`}
                    </Text>
                    <Ionicons
                      name={showAllComments ? "chevron-up" : "chevron-down"}
                      size={14}
                      color={colors.primary}
                    />
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>

          <View style={{ height: 80 }} />
        </ScrollView>

        {/* ── Comment input ── */}
        <View
          style={[
            styles.commentInputBar,
            {
              backgroundColor: colors.card,
              borderTopColor: colors.border,
            },
          ]}
        >
          <Avatar
            uri={(user as any)?.avatar_url}
            name={(user as any)?.full_name || (user as any)?.email || "Me"}
            size={32}
            fallbackColor={colors.primary}
          />
          <TextInput
            ref={commentInputRef}
            style={[
              styles.commentInput,
              {
                backgroundColor: colors.inputBackground,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
            placeholder="Write a comment…"
            placeholderTextColor={colors.placeholder}
            value={comment}
            onChangeText={setComment}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={handlePostComment}
          />
          <TouchableOpacity
            style={[
              styles.sendBtn,
              { backgroundColor: colors.primary + "20" },
              (!comment.trim() || addCommentMutation.isPending) &&
                styles.sendBtnDisabled,
            ]}
            onPress={handlePostComment}
            disabled={!comment.trim() || addCommentMutation.isPending}
            activeOpacity={0.85}
          >
            <Ionicons
              name="send"
              size={18}
              color={
                comment.trim() && !addCommentMutation.isPending
                  ? colors.primary
                  : colors.border
              }
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: "700" },

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

  scrollContent: { paddingTop: 12, paddingHorizontal: 14 },

  postCard: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },

  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 10,
  },
  authorInfo: { flex: 1 },
  authorName: { fontSize: 15, fontWeight: "700" },
  authorUsername: { fontSize: 13, marginTop: 1 },
  timestamp: { fontSize: 12 },

  communityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 10,
  },
  communityText: { fontSize: 12, fontWeight: "700" },

  postTitle: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 8,
    lineHeight: 26,
  },
  pollQuestion: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 4,
    lineHeight: 24,
  },
  postBody: { fontSize: 16, lineHeight: 24, marginBottom: 8 },

  media: {
    width: "100%",
    height: 240,
    borderRadius: 14,
    marginTop: 12,
  },
  videoBadgeWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    alignSelf: "flex-start",
    marginTop: 12,
  },
  videoBadgeText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  moreMedia: { marginTop: 6, fontSize: 12, fontWeight: "600" },

  statsRow: {
    flexDirection: "row",
    gap: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    marginTop: 12,
  },
  statText: { fontSize: 13 },
  statNum: { fontWeight: "700" },

  actionRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 4,
    borderTopWidth: 1,
  },
  actionBtn: {
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 8,
    gap: 4,
  },
  actionLabel: { fontSize: 11, fontWeight: "600" },

  commentsSection: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  commentsSectionTitle: { fontSize: 16, fontWeight: "800", marginBottom: 14 },

  commentsLoading: { gap: 16 },
  commentSkeletonRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  commentSkeletonAvatar: { width: 34, height: 34, borderRadius: 17 },
  commentSkeletonLines: { flex: 1, gap: 6 },
  commentSkeletonName: { height: 12, width: "35%", borderRadius: 6 },
  commentSkeletonBody: { height: 12, width: "80%", borderRadius: 6 },

  noComments: { alignItems: "center", paddingVertical: 24, gap: 8 },
  noCommentsText: { fontSize: 14, fontWeight: "500" },

  commentRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    paddingVertical: 10,
  },
  commentBorder: { borderTopWidth: 1 },
  commentBody: { flex: 1 },
  commentHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    marginBottom: 3,
  },
  commentAuthor: { fontSize: 13, fontWeight: "700" },
  commentTime: { fontSize: 11 },
  commentText: { fontSize: 14, lineHeight: 20 },
  commentLikeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
    alignSelf: "flex-start",
  },
  commentLikeCount: { fontSize: 11, fontWeight: "600" },

  showMoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingTop: 12,
    justifyContent: "center",
  },
  showMoreText: { fontSize: 13, fontWeight: "700" },

  commentInputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
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
