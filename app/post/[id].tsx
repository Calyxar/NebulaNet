// app/post/[id].tsx ✅
// ⚠️ RECONSTRUCTED — I don't have this file's original literal source
// captured; this is built from everything confirmed via TypeScript
// errors and the crash log across our back-and-forth: the hooks this
// screen uses (usePost, useComments, useAddComment, useToggleCommentLike,
// CommentWithAuthor from @/hooks/usePosts), useAddComment's post_id/
// parent_id params, CommentWithAuthor's user_has_liked field, and the
// community-rendering crash. Diff this against your real file rather
// than assuming it's an exact match.
//
// ✅ FIX: community is rendered as its own plain-text line
// (`in {post.community}`) — usePost now returns community as a string
// (community.name), not the raw {id,name,slug} object, which is what
// crashed React Native trying to render an object as a JSX child. NOT
// passed into PostCard's `community` prop, since that prop expects the
// full object — passing a string there would just move the crash.

import AppHeader from "@/components/navigation/AppHeader";
import PostCard from "@/components/post/PostCard";
import { useAuth } from "@/hooks/useAuth";
import {
  useAddComment,
  useComments,
  usePost,
  useToggleBookmark,
  useToggleCommentLike,
  useToggleLike,
  type CommentWithAuthor,
} from "@/hooks/usePosts";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

// Builds a top-level-first, replies-nested-under-parent ordering from a
// flat CommentWithAuthor[] — matches this app's established nested-
// comments feature (parent_id support added to useAddComment).
function buildCommentTree(comments: CommentWithAuthor[]) {
  const topLevel = comments.filter((c) => !c.parent_id);
  const repliesByParent = new Map<string, CommentWithAuthor[]>();
  comments.forEach((c) => {
    if (c.parent_id) {
      const list = repliesByParent.get(c.parent_id) ?? [];
      list.push(c);
      repliesByParent.set(c.parent_id, list);
    }
  });

  const ordered: { comment: CommentWithAuthor; depth: number }[] = [];
  const walk = (list: CommentWithAuthor[], depth: number) => {
    list.forEach((c) => {
      ordered.push({ comment: c, depth });
      const replies = repliesByParent.get(c.id);
      if (replies?.length) walk(replies, depth + 1);
    });
  };
  walk(topLevel, 0);
  return ordered;
}

function CommentRow({
  comment,
  depth,
  colors,
  onReply,
  onToggleLike,
}: {
  comment: CommentWithAuthor;
  depth: number;
  colors: any;
  onReply: () => void;
  onToggleLike: () => void;
}) {
  const name = comment.author?.full_name || comment.author?.username || "User";

  return (
    <View
      style={{
        flexDirection: "row",
        gap: 10,
        paddingHorizontal: 16,
        paddingLeft: 16 + depth * 28,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      {comment.author?.avatar_url ? (
        <Image
          source={{ uri: comment.author.avatar_url }}
          style={{ width: 34, height: 34, borderRadius: 17 }}
        />
      ) : (
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: colors.surface,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: colors.primary, fontWeight: "900" }}>
            {(name[0] || "U").toUpperCase()}
          </Text>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={{ color: colors.text, fontWeight: "800", fontSize: 13 }}>
            {name}
          </Text>
          <Text style={{ color: colors.textTertiary, fontSize: 11 }}>
            {timeAgo(comment.created_at)}
          </Text>
        </View>
        <Text style={{ color: colors.text, fontSize: 14, marginTop: 2 }}>
          {comment.content}
        </Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 16,
            marginTop: 6,
          }}
        >
          <TouchableOpacity
            onPress={onToggleLike}
            style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
          >
            <Ionicons
              name={comment.user_has_liked ? "heart" : "heart-outline"}
              size={14}
              color={comment.user_has_liked ? "#FF375F" : colors.textTertiary}
            />
            {comment.likes_count > 0 && (
              <Text style={{ color: colors.textTertiary, fontSize: 12 }}>
                {comment.likes_count}
              </Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={onReply}>
            <Text
              style={{
                color: colors.textTertiary,
                fontSize: 12,
                fontWeight: "700",
              }}
            >
              Reply
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const { data: post, isLoading, isError, error } = usePost(id!);
  const { data: comments, isLoading: commentsLoading } = useComments(id!);

  const toggleLikeMutation = useToggleLike();
  const toggleBookmarkMutation = useToggleBookmark();
  const addCommentMutation = useAddComment();
  const toggleCommentLikeMutation = useToggleCommentLike();

  const [commentText, setCommentText] = useState("");
  const [replyTo, setReplyTo] = useState<CommentWithAuthor | null>(null);

  const orderedComments = useMemo(
    () => buildCommentTree(comments ?? []),
    [comments],
  );

  const handleSendComment = () => {
    const text = commentText.trim();
    if (!text || !id) return;
    addCommentMutation.mutate({
      post_id: id,
      content: text,
      parent_id: replyTo?.id ?? null,
    });
    setCommentText("");
    setReplyTo(null);
  };

  const gradientColors = isDark
    ? [colors.background, colors.background, colors.background]
    : (["#DCEBFF", "#EEF4FF", "#FFFFFF"] as const);

  const isQuote = !!post?.quote_post_id;

  if (isLoading) {
    return (
      <LinearGradient
        colors={gradientColors as any}
        locations={[0, 0.42, 1]}
        style={{ flex: 1 }}
      >
        <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
          <View
            style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
          >
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (isError) {
    return (
      <LinearGradient
        colors={gradientColors as any}
        locations={[0, 0.42, 1]}
        style={{ flex: 1 }}
      >
        <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
          <AppHeader
            title="Post"
            backgroundColor="transparent"
            onBack={() => router.back()}
          />
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              paddingHorizontal: 32,
            }}
          >
            <Ionicons
              name="alert-circle-outline"
              size={44}
              color={colors.textTertiary}
            />
            <Text
              style={{ color: colors.text, fontWeight: "800", fontSize: 16 }}
            >
              Couldn't load this post
            </Text>
            {/* ✅ NEW: raw error text shown directly on screen — this is
                deliberately not pretty. The point is that a screenshot of
                THIS screen now contains the actual diagnostic text
                (e.g. "permission-denied", "not-found", a JS error
                message), instead of needing console/logcat access that
                wasn't working. */}
            <Text
              selectable
              style={{
                color: colors.textTertiary,
                textAlign: "center",
                fontSize: 12,
                fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
                marginTop: 4,
              }}
            >
              {String((error as any)?.code ?? "")}
              {(error as any)?.code ? "\n" : ""}
              {String((error as any)?.message ?? error ?? "Unknown error")}
            </Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (!post) {
    return (
      <LinearGradient
        colors={gradientColors as any}
        locations={[0, 0.42, 1]}
        style={{ flex: 1 }}
      >
        <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
          <AppHeader
            title="Post"
            backgroundColor="transparent"
            onBack={() => router.back()}
          />
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              paddingHorizontal: 32,
            }}
          >
            <Ionicons
              name="alert-circle-outline"
              size={44}
              color={colors.textTertiary}
            />
            <Text
              style={{ color: colors.text, fontWeight: "800", fontSize: 16 }}
            >
              Post not found
            </Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={gradientColors as any}
      locations={[0, 0.42, 1]}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
        <AppHeader
          title="Post"
          backgroundColor="transparent"
          onBack={() => router.back()}
        />
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          // ✅ FIX: Android was getting `behavior={undefined}`, which
          // means KeyboardAvoidingView does NOTHING on Android — it was
          // silently relying entirely on the OS's windowSoftInputMode to
          // push content up, which isn't reliable combined with this
          // app's translucent/edge-to-edge status bar setup. "height" is
          // the standard, more predictable choice for Android.
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        >
          <FlatList
            data={orderedComments}
            keyExtractor={({ comment }) => comment.id}
            ListHeaderComponent={
              <View style={{ paddingHorizontal: 14, paddingTop: 20 }}>
                <PostCard
                  id={post.id}
                  title={post.title}
                  content={post.content}
                  post_type={post.post_type ?? undefined}
                  author={{
                    id: post.user_id,
                    name: post.user?.full_name || post.user?.username || "User",
                    username: post.user?.username || "",
                    avatar: post.user?.avatar_url ?? undefined,
                  }}
                  timestamp={new Date(post.created_at).toLocaleDateString()}
                  likes={post.like_count ?? 0}
                  comments={post.comment_count ?? 0}
                  shares={post.share_count ?? 0}
                  reposts={post.repost_count ?? 0}
                  saves={post.save_count ?? 0}
                  isLiked={!!post.is_liked}
                  isSaved={!!post.is_saved}
                  isReposted={!!post.is_reposted}
                  isRepostByMe={!!post.is_repost}
                  isBoosted={!!post.is_boosted}
                  boostedUntil={post.boosted_until}
                  quotedPost={isQuote ? post.quote_post : undefined}
                  media={post.media_urls ?? undefined}
                  onLikePress={() =>
                    toggleLikeMutation.mutate({
                      postId: post.id,
                      isLiked: !!post.is_liked,
                    })
                  }
                  onSavePress={() =>
                    toggleBookmarkMutation.mutate({
                      postId: post.id,
                      isSaved: !!post.is_saved,
                    })
                  }
                />

                {/* ✅ FIX: community rendered as its own safe plain-text
                    line — post.community is now a string (the name),
                    not the raw object that crashed before. */}
                {!!post.community && (
                  <Text
                    style={{
                      color: colors.textTertiary,
                      fontSize: 12,
                      fontWeight: "700",
                      marginTop: 6,
                    }}
                  >
                    in {post.community}
                  </Text>
                )}

                <Text
                  style={{
                    color: colors.text,
                    fontWeight: "800",
                    fontSize: 15,
                    marginTop: 12,
                    marginBottom: 4,
                  }}
                >
                  Comments
                </Text>

                {replyTo && (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      backgroundColor: colors.surface,
                      borderRadius: 10,
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      marginBottom: 6,
                    }}
                  >
                    <Text style={{ color: colors.textTertiary, fontSize: 12 }}>
                      Replying to{" "}
                      {replyTo.author?.full_name ||
                        replyTo.author?.username ||
                        "comment"}
                    </Text>
                    <TouchableOpacity onPress={() => setReplyTo(null)}>
                      <Ionicons
                        name="close"
                        size={16}
                        color={colors.textTertiary}
                      />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            }
            renderItem={({ item }) => (
              <CommentRow
                comment={item.comment}
                depth={item.depth}
                colors={colors}
                onReply={() => setReplyTo(item.comment)}
                onToggleLike={() =>
                  toggleCommentLikeMutation.mutate({
                    postId: id!,
                    commentId: item.comment.id,
                    isLiked: item.comment.user_has_liked,
                  })
                }
              />
            )}
            ListEmptyComponent={
              !commentsLoading ? (
                <View
                  style={{
                    alignItems: "center",
                    paddingVertical: 32,
                    paddingHorizontal: 32,
                  }}
                >
                  <Text
                    style={{ color: colors.textTertiary, fontWeight: "700" }}
                  >
                    No comments yet — be the first to reply.
                  </Text>
                </View>
              ) : (
                <View style={{ paddingVertical: 24, alignItems: "center" }}>
                  <ActivityIndicator color={colors.primary} />
                </View>
              )
            }
            contentContainerStyle={{ paddingBottom: 20 }}
          />

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              paddingHorizontal: 14,
              paddingVertical: 10,
              // ✅ FIX: SafeAreaView above deliberately excludes "bottom"
              // from its edges (so KeyboardAvoidingView's own padding
              // behavior isn't double-applied when the keyboard opens),
              // but that meant nothing was compensating for the system
              // nav controls when the keyboard is CLOSED — the composer
              // sat flush against the physical screen bottom, same
              // overlap bug as CurvedTabBar had. Explicit insets.bottom
              // padding here instead, independent of SafeAreaView.
              paddingBottom: 10 + insets.bottom,
              borderTopWidth: 1,
              borderTopColor: colors.border,
              backgroundColor: colors.card,
            }}
          >
            <TextInput
              value={commentText}
              onChangeText={setCommentText}
              placeholder={replyTo ? "Write a reply..." : "Write a comment..."}
              placeholderTextColor={colors.textTertiary}
              style={{
                flex: 1,
                backgroundColor: colors.surface,
                borderRadius: 20,
                paddingHorizontal: 14,
                paddingVertical: 10,
                color: colors.text,
                fontSize: 14,
              }}
              multiline
            />
            <TouchableOpacity
              onPress={handleSendComment}
              disabled={!commentText.trim() || addCommentMutation.isPending}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colors.primary,
                opacity:
                  !commentText.trim() || addCommentMutation.isPending ? 0.5 : 1,
              }}
            >
              {addCommentMutation.isPending ? (
                <ActivityIndicator size={16} color="#fff" />
              ) : (
                <Ionicons name="send" size={18} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}
