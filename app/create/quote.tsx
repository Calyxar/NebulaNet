// app/create/quote.tsx ✅
// Twitter-style quote repost screen
// Accessed via router.push(`/create/quote?postId=${post.id}`)

import { postKeys, useCreatePost } from "@/hooks/usePosts";
import { auth } from "@/lib/firebase";
import { getPostById } from "@/lib/firestore/posts";
import { toggleRepost } from "@/lib/firestore/reposts";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

export default function QuoteRepostScreen() {
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const createPost = useCreatePost();

  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);

  const { data: quotedPost, isLoading } = useQuery({
    queryKey: postKeys.detail(postId ?? "no-id"),
    enabled: !!postId,
    queryFn: () => getPostById(postId!),
  });

  const canPost = text.trim().length > 0 && !posting;

  const handlePost = async () => {
    if (!canPost || !quotedPost) return;
    setPosting(true);
    try {
      // 1. Create the new post with quote reference
      await createPost.mutateAsync({
        content: text.trim(),
        visibility: "public",
        quote_post_id: quotedPost.id,
        quote_post: {
          id: quotedPost.id,
          content: quotedPost.content,
          user: quotedPost.user,
          created_at: quotedPost.created_at,
          media_urls: quotedPost.media_urls,
        },
      });

      // 2. Also mark as reposted so it shows in activity tab
      //    (skip if already reposted — deterministic doc IDs mean set()
      //    would silently overwrite but still double-increment the count)
      if (!quotedPost.is_reposted) {
        try {
          await toggleRepost(quotedPost.id, false);
        } catch {}
      }
      router.back();
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to post quote");
    } finally {
      setPosting(false);
    }
  };

  const quotedAuthor =
    quotedPost?.user?.full_name || quotedPost?.user?.username || "User";

  return (
    <>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={["top"]}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.headerBtn}
              disabled={posting}
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              Quote Post
            </Text>
            <TouchableOpacity
              style={[
                styles.postBtn,
                { backgroundColor: canPost ? colors.primary : colors.border },
              ]}
              onPress={handlePost}
              disabled={!canPost}
              activeOpacity={0.88}
            >
              {posting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.postBtnText}>Post</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.content}
          >
            {/* User avatar + text input */}
            <View style={styles.composeRow}>
              <View
                style={[
                  styles.avatarPlaceholder,
                  { backgroundColor: colors.primary },
                ]}
              >
                <Text style={styles.avatarLetter}>
                  {(auth.currentUser?.displayName?.[0] || "U").toUpperCase()}
                </Text>
              </View>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Add a comment..."
                placeholderTextColor={colors.textTertiary}
                value={text}
                onChangeText={setText}
                multiline
                autoFocus
                maxLength={500}
              />
            </View>

            {/* Quoted post card — Twitter style */}
            {isLoading ? (
              <View
                style={[
                  styles.quotedCard,
                  { borderColor: colors.border, backgroundColor: colors.card },
                ]}
              >
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : quotedPost ? (
              <View
                style={[
                  styles.quotedCard,
                  { borderColor: colors.border, backgroundColor: colors.card },
                ]}
              >
                <View style={styles.quotedHeader}>
                  {quotedPost.user?.avatar_url ? (
                    <Image
                      source={{ uri: quotedPost.user.avatar_url }}
                      style={styles.quotedAvatar}
                    />
                  ) : (
                    <View
                      style={[
                        styles.quotedAvatarFallback,
                        { backgroundColor: colors.surface },
                      ]}
                    >
                      <Text
                        style={[
                          styles.quotedAvatarLetter,
                          { color: colors.primary },
                        ]}
                      >
                        {(quotedAuthor[0] || "U").toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <Text
                    style={[styles.quotedAuthor, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    {quotedAuthor}
                  </Text>
                  {quotedPost.user?.username && (
                    <Text
                      style={[
                        styles.quotedHandle,
                        { color: colors.textTertiary },
                      ]}
                      numberOfLines={1}
                    >
                      @{quotedPost.user.username}
                    </Text>
                  )}
                </View>
                {!!quotedPost.content && (
                  <Text
                    style={[
                      styles.quotedContent,
                      { color: colors.textSecondary },
                    ]}
                    numberOfLines={4}
                  >
                    {quotedPost.content}
                  </Text>
                )}
                {quotedPost.media_urls?.[0] && (
                  <Image
                    source={{ uri: quotedPost.media_urls[0] }}
                    style={styles.quotedMedia}
                    resizeMode="cover"
                  />
                )}
              </View>
            ) : null}
          </ScrollView>

          <View
            style={[
              styles.bottomBar,
              {
                borderTopColor: colors.border,
                paddingBottom: Math.max(insets.bottom, 12),
              },
            ]}
          >
            <Text
              style={[
                styles.charCount,
                {
                  color: text.length > 450 ? colors.error : colors.textTertiary,
                },
              ]}
            >
              {500 - text.length}
            </Text>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 17, fontWeight: "800" },
  postBtn: { paddingHorizontal: 20, paddingVertical: 9, borderRadius: 999 },
  postBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  content: { padding: 16, gap: 16 },
  composeRow: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: { fontSize: 16, fontWeight: "900", color: "#fff" },
  input: { flex: 1, fontSize: 17, lineHeight: 24, minHeight: 80 },
  quotedCard: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 8 },
  quotedHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  quotedAvatar: { width: 20, height: 20, borderRadius: 10 },
  quotedAvatarFallback: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  quotedAvatarLetter: { fontSize: 10, fontWeight: "900" },
  quotedAuthor: { fontSize: 14, fontWeight: "700", flexShrink: 1 },
  quotedHandle: { fontSize: 13, flexShrink: 1 },
  quotedContent: { fontSize: 14, lineHeight: 20 },
  quotedMedia: { width: "100%", height: 160, borderRadius: 12, marginTop: 4 },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  charCount: { fontSize: 13, fontWeight: "600" },
});
