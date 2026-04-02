// components/comments/CommentItem.tsx — UPDATED ✅ Twitter-style
// ✅ Avatar + thread line on left like Twitter
// ✅ Name bold, @username gray, timestamp gray on same line
// ✅ Tappable #hashtags and @mentions via HashtagText
// ✅ Heart turns pink/red when liked like Twitter
// ✅ Replies show with thread line connecting them

import HashtagText from "@/components/post/HashtagText";
import Avatar from "@/components/user/Avatar";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface CommentItemProps {
  id: string;
  content: string;
  author: {
    id: string;
    name: string;
    username: string;
    avatar?: string;
  };
  timestamp: string;
  likes: number;
  isLiked: boolean;
  replies?: CommentItemProps[];
  isReply?: boolean;
  onLikePress?: () => void;
  onReplyPress?: () => void;
  onMorePress?: () => void;
}

export default function CommentItem({
  id,
  content,
  author,
  timestamp,
  likes,
  isLiked,
  replies = [],
  isReply = false,
  onLikePress,
  onReplyPress,
  onMorePress,
}: CommentItemProps) {
  const { colors, isDark } = useTheme();
  const [showReplies, setShowReplies] = useState(false);
  const hasReplies = replies.length > 0;

  const threadColor = isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)";
  const metaColor = isDark ? "#8b98a5" : "#8b98a5";
  const nameColor = isDark ? "#e7e9ea" : "#0f1419";
  const contentColor = isDark ? "#e7e9ea" : "#0f1419";
  const dividerColor = isDark ? "rgba(255,255,255,0.08)" : "#eff3f4";

  return (
    <View style={styles.wrapper}>
      {/* Left column: avatar + thread line */}
      <View style={styles.leftCol}>
        <Link href={`/user/${author.username}`} asChild>
          <TouchableOpacity activeOpacity={0.85}>
            <Avatar
              size={isReply ? 32 : 40}
              name={author.name}
              image={author.avatar}
            />
          </TouchableOpacity>
        </Link>
        {(hasReplies || isReply) && (
          <View style={[styles.threadLine, { backgroundColor: threadColor }]} />
        )}
      </View>

      {/* Right column */}
      <View style={styles.rightCol}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Link href={`/user/${author.username}`} asChild>
            <TouchableOpacity style={styles.authorRow} activeOpacity={0.85}>
              <Text
                style={[styles.authorName, { color: nameColor }]}
                numberOfLines={1}
              >
                {author.name}
              </Text>
              <Text
                style={[styles.authorUsername, { color: metaColor }]}
                numberOfLines={1}
              >
                @{author.username}
              </Text>
              <Text style={[styles.dot, { color: metaColor }]}>·</Text>
              <Text style={[styles.timestamp, { color: metaColor }]}>
                {timestamp}
              </Text>
            </TouchableOpacity>
          </Link>
          <TouchableOpacity onPress={onMorePress} hitSlop={8}>
            <Ionicons name="ellipsis-horizontal" size={16} color={metaColor} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <HashtagText
          text={content}
          style={[styles.content, { color: contentColor }]}
        />

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={onLikePress}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isLiked ? "heart" : "heart-outline"}
              size={17}
              color={isLiked ? "#F91880" : metaColor}
            />
            {likes > 0 && (
              <Text
                style={[
                  styles.actionText,
                  { color: isLiked ? "#F91880" : metaColor },
                ]}
              >
                {likes}
              </Text>
            )}
          </TouchableOpacity>

          {!isReply && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={onReplyPress}
              activeOpacity={0.7}
            >
              <Ionicons name="chatbubble-outline" size={16} color={metaColor} />
              {replies.length > 0 && (
                <Text style={[styles.actionText, { color: metaColor }]}>
                  {replies.length}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Show/hide replies */}
        {hasReplies && !isReply && (
          <TouchableOpacity
            style={styles.showRepliesBtn}
            onPress={() => setShowReplies((v) => !v)}
            activeOpacity={0.7}
          >
            <Text style={styles.showRepliesText}>
              {showReplies
                ? "Hide replies"
                : `Show ${replies.length} ${replies.length === 1 ? "reply" : "replies"}`}
            </Text>
          </TouchableOpacity>
        )}

        {showReplies && hasReplies && (
          <View style={styles.repliesWrap}>
            {replies.map((reply) => (
              <CommentItem
                key={reply.id}
                {...reply}
                isReply
                onLikePress={reply.onLikePress}
                onReplyPress={onReplyPress}
                onMorePress={onMorePress}
              />
            ))}
          </View>
        )}

        <View
          style={[styles.bottomSpacer, { borderBottomColor: dividerColor }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
    paddingTop: 12,
    paddingHorizontal: 16,
  },
  leftCol: {
    alignItems: "center",
    marginRight: 12,
    width: 40,
  },
  threadLine: {
    width: 2,
    flex: 1,
    minHeight: 12,
    marginTop: 4,
    borderRadius: 1,
  },
  rightCol: { flex: 1 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 4,
    flexWrap: "nowrap",
  },
  authorName: {
    fontSize: 14,
    fontWeight: "700",
    flexShrink: 1,
  },
  authorUsername: {
    fontSize: 13,
    flexShrink: 1,
  },
  dot: { fontSize: 13 },
  timestamp: { fontSize: 13, flexShrink: 0 },
  content: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 10,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    marginBottom: 4,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 4,
    paddingRight: 8,
  },
  actionText: { fontSize: 13 },
  showRepliesBtn: { marginTop: 6, marginBottom: 4 },
  showRepliesText: { fontSize: 13, color: "#1D9BF0", fontWeight: "600" },
  repliesWrap: { marginTop: 4 },
  bottomSpacer: { height: 12, borderBottomWidth: 1 },
});
