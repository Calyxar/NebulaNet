// components/comments/CommentItem.tsx
import Avatar from "@/components/user/Avatar";
import { Ionicons } from "@expo/vector-icons";
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
  likeCount: number;
  isLiked: boolean;
  replies?: CommentItemProps[];
  isReply?: boolean;
  onLikePress?: (commentId: string) => void;
  onReplyPress?: (commentId: string, authorName: string) => void;
  onMorePress?: (commentId: string) => void;
}

export default function CommentItem({
  id,
  content,
  author,
  timestamp,
  likeCount,
  isLiked,
  replies = [],
  isReply = false,
  onLikePress,
  onReplyPress,
  onMorePress,
}: CommentItemProps) {
  const [showReplies, setShowReplies] = useState(false);

  const handleLike = () => {
    if (onLikePress) {
      onLikePress(id);
    }
  };

  const handleReply = () => {
    if (onReplyPress) {
      onReplyPress(id, author.name);
    }
  };

  const handleMore = () => {
    if (onMorePress) {
      onMorePress(id);
    }
  };

  return (
    <View style={[styles.container, isReply && styles.replyContainer]}>
      <View style={styles.commentHeader}>
        <Avatar
          size={isReply ? 28 : 32}
          name={author.name}
          image={author.avatar}
        />
        <View style={styles.commentInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.authorName}>{author.name}</Text>
            <Text style={styles.timestamp}>{timestamp}</Text>
          </View>
          <Text style={styles.content}>{content}</Text>
        </View>
        <TouchableOpacity onPress={handleMore} style={styles.moreButton}>
          <Ionicons name="ellipsis-horizontal" size={16} color="#666" />
        </TouchableOpacity>
      </View>

      <View style={styles.commentActions}>
        <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
          <Ionicons
            name={isLiked ? "heart" : "heart-outline"}
            size={16}
            color={isLiked ? "#ff375f" : "#666"}
          />
          <Text style={[styles.actionText, isLiked && styles.likedText]}>
            {likeCount > 0 ? likeCount : ""}{" "}
            {likeCount === 1 ? "Like" : likeCount > 1 ? "Likes" : "Like"}
          </Text>
        </TouchableOpacity>

        {!isReply && onReplyPress && (
          <TouchableOpacity style={styles.actionButton} onPress={handleReply}>
            <Ionicons name="arrow-undo-outline" size={16} color="#666" />
            <Text style={styles.actionText}>Reply</Text>
          </TouchableOpacity>
        )}
      </View>

      {replies.length > 0 && !isReply && (
        <View style={styles.repliesContainer}>
          <TouchableOpacity
            style={styles.showRepliesButton}
            onPress={() => setShowReplies(!showReplies)}
          >
            <View style={styles.replyLine} />
            <Text style={styles.showRepliesText}>
              {showReplies ? "Hide" : "Show"} {replies.length}{" "}
              {replies.length === 1 ? "reply" : "replies"}
            </Text>
          </TouchableOpacity>

          {showReplies && (
            <View style={styles.repliesList}>
              {replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  {...reply}
                  isReply={true}
                  onLikePress={onLikePress}
                  onReplyPress={onReplyPress}
                  onMorePress={onMorePress}
                />
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  replyContainer: {
    paddingLeft: 36,
    paddingVertical: 8,
    borderBottomWidth: 0,
  },
  commentHeader: {
    flexDirection: "row",
    marginBottom: 8,
  },
  commentInfo: {
    flex: 1,
    marginLeft: 12,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  authorName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
    marginRight: 8,
  },
  timestamp: {
    fontSize: 12,
    color: "#666",
  },
  content: {
    fontSize: 14,
    color: "#000",
    lineHeight: 20,
  },
  moreButton: {
    padding: 4,
  },
  commentActions: {
    flexDirection: "row",
    marginLeft: 44,
    marginTop: 4,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
  },
  actionText: {
    fontSize: 12,
    color: "#666",
    marginLeft: 4,
  },
  likedText: {
    color: "#ff375f",
  },
  repliesContainer: {
    marginTop: 8,
    marginLeft: 44,
  },
  showRepliesButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  replyLine: {
    width: 24,
    height: 1,
    backgroundColor: "#666",
    marginRight: 8,
  },
  showRepliesText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  repliesList: {
    marginTop: 8,
  },
});
