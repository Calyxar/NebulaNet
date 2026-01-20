// components/stories/StoryCommentsList.tsx
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface StoryComment {
  id: string;
  content: string;
  created_at: string;
  profiles: {
    username: string;
    full_name?: string;
    avatar_url?: string;
  };
}

interface StoryCommentsListProps {
  comments: StoryComment[];
  isLoading?: boolean;
  onCommentLike?: (commentId: string) => void;
}

export default function StoryCommentsList({
  comments,
  isLoading,
  onCommentLike,
}: StoryCommentsListProps) {
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const renderComment = ({ item }: { item: StoryComment }) => (
    <View style={styles.commentItem}>
      <View style={styles.commentAvatar}>
        {item.profiles.avatar_url ? (
          <Image
            source={{ uri: item.profiles.avatar_url }}
            style={styles.avatar}
          />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>
              {item.profiles.username?.charAt(0).toUpperCase() || "U"}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.commentContent}>
        <View style={styles.commentHeader}>
          <Text style={styles.commentUsername}>
            {item.profiles.full_name || item.profiles.username}
          </Text>
          <Text style={styles.commentTime}>{formatTime(item.created_at)}</Text>
        </View>
        <Text style={styles.commentText}>{item.content}</Text>
      </View>

      {onCommentLike && (
        <TouchableOpacity
          style={styles.commentLikeButton}
          onPress={() => onCommentLike(item.id)}
        >
          <Ionicons name="heart-outline" size={16} color="#666" />
        </TouchableOpacity>
      )}
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons
          name="chatbubble-outline"
          size={32}
          color="rgba(255,255,255,0.3)"
        />
        <Text style={styles.loadingText}>Loading comments...</Text>
      </View>
    );
  }

  if (comments.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons
          name="chatbubble-outline"
          size={48}
          color="rgba(255,255,255,0.3)"
        />
        <Text style={styles.emptyText}>No comments yet</Text>
        <Text style={styles.emptySubtext}>Be the first to comment!</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={comments}
      renderItem={renderComment}
      keyExtractor={(item) => item.id}
      style={styles.commentsList}
      contentContainerStyle={styles.commentsContent}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  commentItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  commentAvatar: {
    marginRight: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  commentUsername: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginRight: 8,
  },
  commentTime: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
  },
  commentText: {
    color: "#fff",
    fontSize: 15,
    lineHeight: 20,
  },
  commentLikeButton: {
    padding: 4,
    marginLeft: 8,
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },
  loadingText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
    marginTop: 12,
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 16,
    fontWeight: "600",
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtext: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 14,
  },
  commentsList: {
    maxHeight: 300,
  },
  commentsContent: {
    paddingBottom: 16,
  },
});
