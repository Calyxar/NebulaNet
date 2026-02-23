// app/post/[id].tsx — FIRESTORE delete (no Supabase)

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
import { db } from "@/lib/firebase"; // ✅ Firestore
import { sharePost } from "@/lib/share";
import { Ionicons } from "@expo/vector-icons";
import { formatDistanceToNow } from "date-fns";
import { router, useLocalSearchParams } from "expo-router";
import { deleteDoc, doc, getDoc } from "firebase/firestore";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type AlertButton
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function coerceParamToString(v: unknown): string | null {
  if (typeof v === "string" && v.trim().length) return v;
  if (Array.isArray(v) && typeof v[0] === "string" && v[0].trim().length)
    return v[0];
  return null;
}

export default function PostDetailScreen() {
  const params = useLocalSearchParams();
  const postId = useMemo(
    () => coerceParamToString((params as any)?.id),
    [params],
  );

  const { user } = useAuth();

  const [comment, setComment] = useState("");
  const [showAllComments, setShowAllComments] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const viewerId = useMemo(() => {
    const u = user as any;
    return (u?.id as string | undefined) || (u?.user?.id as string | undefined);
  }, [user]);

  const isOwner = useMemo(() => {
    return !!post?.user_id && !!viewerId && post.user_id === viewerId;
  }, [post?.user_id, viewerId]);

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
    typeof mediaUrl === "string" && /\.(mp4|mov|m4v|webm|avi|mkv)$/i.test(ext);

  const doDelete = async () => {
    if (!post) return;

    setIsDeleting(true);
    try {
      if (!viewerId) throw new Error("Not logged in");

      // ✅ optional ownership verification (rules should enforce too)
      const ref = doc(db, "posts", post.id);
      const snap = await getDoc(ref);
      if (!snap.exists()) throw new Error("Post not found");

      const data: any = snap.data();
      if (data?.user_id && data.user_id !== viewerId) {
        throw new Error("You can only delete your own post");
      }

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
    if (!post) return;

    const buttons: AlertButton[] = [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: doDelete },
    ];

    Alert.alert(
      "Delete post?",
      "This will permanently delete your post.",
      buttons,
    );
  };

  const openMenu = () => {
    if (!post) return;

    const buttons: AlertButton[] = [];
    if (isOwner) {
      buttons.push({
        text: isDeleting ? "Deleting..." : "Delete Post",
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

  if (!postId) {
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
          <Text style={styles.errorText}>Invalid post link</Text>
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

  // ------------------- UI below unchanged -------------------

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

      {/* ...rest of your UI unchanged ... */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* (keep everything below exactly as you already had it) */}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // ✅ keep your existing styles (unchanged)
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
});
