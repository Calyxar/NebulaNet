// components/comments/CommentsSection.tsx
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import CommentInput from "./CommentInput";
import CommentItem from "./CommentItem";

interface Comment {
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
  replies?: Comment[];
}

interface CommentsSectionProps {
  postId: string;
  onCommentSubmit: (content: string, parentId?: string) => Promise<void>;
  onCommentLike: (commentId: string) => Promise<void>;
  initialComments?: Comment[];
  loading?: boolean;
}

export default function CommentsSection({
  postId,
  onCommentSubmit,
  onCommentLike,
  initialComments = [],
  loading = false,
}: CommentsSectionProps) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [replyingTo, setReplyingTo] = useState<{
    commentId: string;
    username: string;
    name: string;
  } | null>(null);
  const [showComments, setShowComments] = useState(false);

  useEffect(() => {
    setComments(initialComments);
  }, [initialComments]);

  const handleSubmitComment = async (content: string) => {
    try {
      if (replyingTo) {
        await onCommentSubmit(content, replyingTo.commentId);
      } else {
        await onCommentSubmit(content);
      }

      // Clear reply state
      setReplyingTo(null);
    } catch (error) {
      console.error("Error submitting comment:", error);
      throw error;
    }
  };

  const handleLikeComment = async (commentId: string) => {
    try {
      await onCommentLike(commentId);

      // Update local state
      setComments((prev) => updateCommentLikes(prev, commentId));
    } catch (error) {
      console.error("Error liking comment:", error);
    }
  };

  const updateCommentLikes = (
    commentsList: Comment[],
    commentId: string,
  ): Comment[] => {
    return commentsList.map((comment) => {
      if (comment.id === commentId) {
        return {
          ...comment,
          isLiked: !comment.isLiked,
          likeCount: comment.isLiked
            ? comment.likeCount - 1
            : comment.likeCount + 1,
        };
      }

      if (comment.replies) {
        return {
          ...comment,
          replies: updateCommentLikes(comment.replies, commentId),
        };
      }

      return comment;
    });
  };

  const handleReplyPress = (commentId: string, authorName: string) => {
    const comment = findCommentById(comments, commentId);
    if (comment) {
      setReplyingTo({
        commentId,
        username: comment.author.username,
        name: comment.author.name,
      });
    }
  };

  const findCommentById = (
    commentsList: Comment[],
    id: string,
  ): Comment | null => {
    for (const comment of commentsList) {
      if (comment.id === id) {
        return comment;
      }
      if (comment.replies) {
        const found = findCommentById(comment.replies, id);
        if (found) return found;
      }
    }
    return null;
  };

  const handleMorePress = (commentId: string) => {
    // Show options menu for comment
    console.log("More options for comment:", commentId);
  };

  const totalComments = comments.reduce((total, comment) => {
    return total + 1 + (comment.replies?.length || 0);
  }, 0);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setShowComments(!showComments)}
      >
        <Text style={styles.headerTitle}>Comments ({totalComments})</Text>
        <Ionicons
          name={showComments ? "chevron-up" : "chevron-down"}
          size={20}
          color="#666"
        />
      </TouchableOpacity>

      {showComments && (
        <>
          <ScrollView
            style={styles.commentsList}
            showsVerticalScrollIndicator={false}
          >
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#000" />
              </View>
            ) : comments.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="chatbubble-outline" size={48} color="#ccc" />
                <Text style={styles.emptyText}>No comments yet</Text>
                <Text style={styles.emptySubtext}>
                  Be the first to comment!
                </Text>
              </View>
            ) : (
              comments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  {...comment}
                  onLikePress={() => handleLikeComment(comment.id)}
                  onReplyPress={handleReplyPress}
                  onMorePress={handleMorePress}
                />
              ))
            )}
          </ScrollView>

          <CommentInput
            onSubmit={handleSubmitComment}
            placeholder={
              replyingTo ? `Reply to ${replyingTo.name}...` : "Add a comment..."
            }
            replyTo={
              replyingTo
                ? {
                    username: replyingTo.username,
                    name: replyingTo.name,
                  }
                : undefined
            }
            onCancelReply={() => setReplyingTo(null)}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#e5e5e5",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
  },
  commentsList: {
    maxHeight: 400,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
  },
});
