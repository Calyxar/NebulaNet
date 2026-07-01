// components/post/CommentRow.tsx
// ✅ NEW: onDelete prop added — long-pressing your own comment shows a
//    delete option via Alert. The prop is optional so existing call
//    sites that don't pass it still work without change.
// Renders a single comment AND recursively renders its nested replies
// (c.replies, already populated by getComments() in lib/firestore/comments.ts).
// Draws a Twitter-style vertical connector line down the left side of any
// comment that has replies, linking it visually to its children.

import MentionHashtagText from "@/components/MentionHashtagText";
import type { CommentWithAuthor } from "@/hooks/usePosts";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

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
  onDelete?: (commentId: string) => void;
  isLast?: boolean;
  currentUserId?: string;
}

export default function CommentRow({
  comment: c,
  colors,
  depth = 0,
  formatDate,
  onLike,
  onReply,
  onDelete,
  isLast = false,
  currentUserId,
}: CommentRowProps) {
  const authorName =
    c.author?.full_name?.trim() || c.author?.username?.trim() || "User";
  const hasReplies = !!c.replies?.length;
  const avatarSize = depth === 0 ? 34 : 28;
  const isOwner = !!currentUserId && c.user_id === currentUserId;

  const handleLongPress = () => {
    if (!isOwner || !onDelete) return;
    Alert.alert("Delete comment?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => onDelete(c.id),
      },
    ]);
  };

  return (
    <View style={{ flexDirection: "row" }}>
      {/* Vertical connector line for nested replies */}
      {depth > 0 && (
        <View style={styles.connectorColumn}>
          <View
            style={[styles.connectorLine, { backgroundColor: colors.border }]}
          />
        </View>
      )}

      <View style={{ flex: 1 }}>
        <TouchableOpacity
          activeOpacity={isOwner && onDelete ? 0.7 : 1}
          onLongPress={handleLongPress}
          delayLongPress={350}
          style={[styles.commentRow, depth > 0 && { paddingLeft: 4 }]}
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
              <Text
                style={[styles.commentTime, { color: colors.textTertiary }]}
              >
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

              {/* ✅ Delete button — only visible on your own comments */}
              {isOwner && onDelete && (
                <TouchableOpacity
                  style={styles.replyBtn}
                  onPress={handleLongPress}
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name="trash-outline"
                    size={13}
                    color={colors.textTertiary}
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </TouchableOpacity>

        {/* Recursive render for nested replies */}
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
                onDelete={onDelete}
                currentUserId={currentUserId}
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
