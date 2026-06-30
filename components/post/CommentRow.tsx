// components/post/CommentRow.tsx — NEW
// Renders a single comment AND recursively renders its nested replies
// (c.replies, already populated by getComments() in lib/firestore/comments.ts
// but never previously rendered anywhere). Draws a Twitter-style vertical
// connector line down the left side of any comment that has replies,
// linking it visually to its children — matches the thread-line pattern
// in Twitter's reply view.

import MentionHashtagText from "@/components/MentionHashtagText";
import type { CommentWithAuthor } from "@/hooks/usePosts";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
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
  if (uri)
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
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

interface CommentRowProps {
  comment: CommentWithAuthor;
  colors: any;
  depth?: number;
  formatDate: (iso: string) => string;
  onLike: (commentId: string) => void;
  onReply: (comment: CommentWithAuthor) => void;
  isLast?: boolean;
}

export default function CommentRow({
  comment: c,
  colors,
  depth = 0,
  formatDate,
  onLike,
  onReply,
  isLast = false,
}: CommentRowProps) {
  const authorName =
    c.author?.full_name?.trim() || c.author?.username?.trim() || "User";
  const hasReplies = !!c.replies?.length;
  // Nested replies get a smaller avatar and indent, same as Twitter's
  // visual de-emphasis of deeper thread levels.
  const avatarSize = depth === 0 ? 34 : 28;

  return (
    <View style={{ flexDirection: "row" }}>
      {/* ✅ Vertical connector line — only rendered for nested replies
          (depth > 0), running up from this row to its parent. A single
          continuous-looking line is built by stacking each depth level's
          own short segment, since each CommentRow only knows about its
          immediate parent, not the whole chain. */}
      {depth > 0 && (
        <View style={styles.connectorColumn}>
          <View
            style={[styles.connectorLine, { backgroundColor: colors.border }]}
          />
        </View>
      )}

      <View style={{ flex: 1 }}>
        <View
          style={[
            styles.commentRow,
            depth > 0 && { paddingLeft: 4 },
          ]}
        >
          <Avatar
            uri={c.author?.avatar_url}
            name={authorName}
            size={avatarSize}
            fallbackColor={colors.primary}
          />
          <View style={styles.commentBody}>
            <View style={styles.commentHeader}>
              <Text style={[styles.commentAuthor, { color: colors.text }]}>
                {authorName}
              </Text>
              <Text style={[styles.commentTime, { color: colors.textTertiary }]}>
                {formatDate(c.created_at)}
              </Text>
            </View>
            <MentionHashtagText
              content={c.content ?? ""}
              style={StyleSheet.flatten([
                styles.commentText,
                { color: colors.textSecondary },
              ])}
              hashtagColor="#7c3aed"
            />
            <View style={styles.commentActions}>
              <TouchableOpacity
                style={styles.commentLikeBtn}
                onPress={() => onLike(c.id)}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={c.user_has_liked ? "heart" : "heart-outline"}
                  size={14}
                  color={c.user_has_liked ? colors.like : colors.textTertiary}
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

              <TouchableOpacity
                style={styles.replyBtn}
                onPress={() => onReply(c)}
                activeOpacity={0.75}
              >
                <Ionicons
                  name="arrow-undo-outline"
                  size={14}
                  color={colors.textTertiary}
                />
                <Text
                  style={[styles.replyBtnText, { color: colors.textTertiary }]}
                >
                  Reply
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ✅ Recursive render — each reply gets the same treatment,
            including its own replies if any exist (arbitrary depth). */}
        {hasReplies && (
          <View style={{ marginTop: 4 }}>
            {c.replies!.map((reply, i) => (
              <CommentRow
                key={reply.id}
                comment={reply}
                colors={colors}
                depth={depth + 1}
                formatDate={formatDate}
                onLike={onLike}
                onReply={onReply}
                isLast={i === c.replies!.length - 1}
              />
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  connectorColumn: {
    width: 20,
    alignItems: "center",
  },
  connectorLine: {
    width: 2,
    flex: 1,
    marginTop: -8,
    marginBottom: 4,
  },
  commentRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    paddingVertical: 8,
  },
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
  commentActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginTop: 6,
  },
  commentLikeBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  commentLikeCount: { fontSize: 11, fontWeight: "600" },
  replyBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  replyBtnText: { fontSize: 11, fontWeight: "700" },
});
