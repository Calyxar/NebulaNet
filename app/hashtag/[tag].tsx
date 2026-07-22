// app/hashtag/[tag].tsx ✅ FIXED
// ✅ FIXED: this file imported `getPosts` from "@/lib/firestore/posts" —
// that function doesn't exist anywhere in this project. It also imported
// `Post` from the same module, which only imports Post from hooks/useFeed
// for its own internal use and never re-exports it (same wrong-import-
// source mistake found and fixed earlier in hooks/useFeedInteractions.ts).
// Combined, this meant the file likely didn't even compile — which fully
// explains "nothing found" on every hashtag tap, independent of the
// separate case-sensitivity fix already made in HashtagText.tsx.
// ✅ Now does a real Firestore query (`hashtags` array-contains the
// lowercased tag — matches how hashtags are stored/matched everywhere
// else in this project) and renders results with the canonical PostCard,
// consistent with the rest of the app after the profile.tsx consolidation.

import AppHeader from "@/components/navigation/AppHeader";
import PostCard from "@/components/post/PostCard";
import { useAuth } from "@/hooks/useAuth";
import type { Post } from "@/hooks/useFeed";
import { useToggleBookmark, useToggleLike } from "@/hooks/usePosts";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import firestore, {
  FirebaseFirestoreTypes,
} from "@react-native-firebase/firestore";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type HashtagPost = Post & {
  title?: string;
  repost_count?: number;
  save_count?: number;
  is_reposted?: boolean;
  is_repost?: boolean;
  quote_post_id?: string | null;
  quote_post?: any;
};

function tsToIso(v: any): string {
  if (!v) return new Date().toISOString();
  if (typeof v === "string") return v;
  if (typeof v?.toDate === "function") return v.toDate().toISOString();
  return new Date().toISOString();
}

function docToHashtagPost(
  doc: FirebaseFirestoreTypes.QueryDocumentSnapshot,
): HashtagPost {
  const x = doc.data() as any;
  return {
    id: doc.id,
    user_id: x.user_id,
    user: x.user ?? null,
    content: x.content ?? "",
    media_urls: Array.isArray(x.media_urls) ? x.media_urls : null,
    post_type: x.post_type ?? null,
    created_at: tsToIso(x.created_at_ts ?? x.created_at),
    like_count: x.like_count ?? 0,
    comment_count: x.comment_count ?? 0,
    share_count: x.share_count ?? 0,
    repost_count: x.repost_count ?? 0,
    save_count: x.save_count ?? 0,
    is_reposted: x.is_reposted ?? false,
    is_repost: x.is_repost ?? false,
    is_nsfw: x.is_nsfw ?? false,
    title: x.title ?? undefined,
    quote_post_id: x.quote_post_id ?? null,
    quote_post: x.quote_post ?? null,
  } as HashtagPost;
}

function useHashtagPosts(tag: string) {
  return useQuery({
    queryKey: ["hashtag-posts", tag],
    enabled: !!tag,
    staleTime: 30_000,
    queryFn: async (): Promise<HashtagPost[]> => {
      const snap = await firestore()
        .collection("posts")
        .where("hashtags", "array-contains", tag)
        .orderBy("created_at_ts", "desc")
        .limit(50)
        .get();
      return snap.docs.map(docToHashtagPost);
    },
  });
}

export default function HashtagScreen() {
  const { tag: rawTag } = useLocalSearchParams<{ tag: string }>();
  // ✅ Defensive lowercase here too — the tag arrives already lowercased
  // from HashtagText.tsx's fix, but this guards against any other
  // caller (deep links, share URLs) that might not lowercase first.
  const tag = (rawTag ?? "").toLowerCase();

  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const toggleLikeMutation = useToggleLike();
  const toggleBookmarkMutation = useToggleBookmark();

  const {
    data: posts,
    isLoading,
    isError,
    isRefetching,
    refetch,
  } = useHashtagPosts(tag);

  const postIds = useMemo(() => (posts ?? []).map((p) => p.id), [posts]);

  const { data: likeSaveStatus } = useQuery({
    queryKey: ["hashtag-like-save-status", user?.uid, postIds.join(",")],
    enabled: !!user?.uid && postIds.length > 0,
    staleTime: 30_000,
    queryFn: async () => {
      const liked = new Set<string>();
      const saved = new Set<string>();
      await Promise.all(
        postIds.map(async (postId) => {
          const [likeSnap, saveSnap] = await Promise.all([
            firestore()
              .collection("posts")
              .doc(postId)
              .collection("likes")
              .doc(user!.uid)
              .get(),
            firestore()
              .collection("posts")
              .doc(postId)
              .collection("saves")
              .doc(user!.uid)
              .get(),
          ]);
          if (likeSnap.exists()) liked.add(postId);
          if (saveSnap.exists()) saved.add(postId);
        }),
      );
      return { liked, saved };
    },
  });

  const isLikedPost = (id: string) => !!likeSaveStatus?.liked.has(id);
  const isSavedPost = (id: string) => !!likeSaveStatus?.saved.has(id);

  const gradientColors = isDark
    ? [colors.background, colors.background, colors.background]
    : (["#DCEBFF", "#EEF4FF", "#FFFFFF"] as const);

  return (
    <LinearGradient
      colors={gradientColors as any}
      locations={[0, 0.42, 1]}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
        <AppHeader
          title={`#${tag}`}
          backgroundColor="transparent"
          leftWide={
            <TouchableOpacity
              onPress={() => router.back()}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colors.card,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Ionicons name="arrow-back" size={20} color={colors.text} />
            </TouchableOpacity>
          }
        />

        {isLoading ? (
          <View
            style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
          >
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : isError ? (
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
              Couldn't load posts
            </Text>
            <TouchableOpacity
              onPress={() => refetch()}
              style={{
                marginTop: 8,
                backgroundColor: colors.primary,
                paddingHorizontal: 18,
                paddingVertical: 10,
                borderRadius: 14,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "800" }}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={posts ?? []}
            keyExtractor={(p) => p.id}
            contentContainerStyle={{ padding: 14, paddingBottom: 32 }}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={refetch}
                tintColor={colors.primary}
              />
            }
            ListEmptyComponent={
              <View
                style={{
                  alignItems: "center",
                  paddingTop: 60,
                  paddingHorizontal: 32,
                  gap: 8,
                }}
              >
                <Ionicons
                  name="pricetag-outline"
                  size={44}
                  color={colors.textTertiary}
                />
                <Text
                  style={{
                    color: colors.text,
                    fontWeight: "800",
                    fontSize: 16,
                  }}
                >
                  No posts found
                </Text>
                <Text
                  style={{
                    color: colors.textTertiary,
                    textAlign: "center",
                    fontSize: 13,
                  }}
                >
                  Nobody's posted with #{tag} yet.
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const isQuote = !!item.quote_post_id;
              return (
                <PostCard
                  id={item.id}
                  title={item.title}
                  content={item.content}
                  post_type={item.post_type ?? undefined}
                  author={{
                    id: item.user_id,
                    name: item.user?.full_name || item.user?.username || "User",
                    username: item.user?.username || "",
                    avatar: item.user?.avatar_url ?? undefined,
                  }}
                  timestamp={new Date(item.created_at).toLocaleDateString()}
                  likes={item.like_count ?? 0}
                  comments={item.comment_count ?? 0}
                  shares={item.share_count ?? 0}
                  reposts={item.repost_count ?? 0}
                  saves={item.save_count ?? 0}
                  isLiked={isLikedPost(item.id)}
                  isSaved={isSavedPost(item.id)}
                  isReposted={!!item.is_reposted}
                  isRepostByMe={!!item.is_repost}
                  quotedPost={isQuote ? item.quote_post : undefined}
                  media={item.media_urls ?? undefined}
                  onLikePress={() =>
                    toggleLikeMutation.mutate({
                      postId: item.id,
                      isLiked: isLikedPost(item.id),
                    })
                  }
                  onSavePress={() =>
                    toggleBookmarkMutation.mutate({
                      postId: item.id,
                      isSaved: isSavedPost(item.id),
                    })
                  }
                />
              );
            }}
          />
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}
