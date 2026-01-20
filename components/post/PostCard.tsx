// components/post/PostCard.tsx
import Avatar from "@/components/user/Avatar";
import {
  copyLink,
  generatePostLink,
  shareToChat,
  shareWithOptions,
} from "@/lib/share"; // Fixed imports
import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import React, { useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface PostCardProps {
  id: string;
  title?: string;
  content: string;
  author: {
    id: string;
    name: string;
    username: string;
    avatar?: string;
  };
  community?: {
    id: string;
    name: string;
    slug: string;
  };
  timestamp: string;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  isLiked: boolean;
  isSaved: boolean;
  media?: string[];
  viewCount?: number;
  onLikePress?: () => Promise<void> | void;
  onCommentPress?: () => void;
  onSharePress?: () => Promise<void> | void;
  onSavePress?: () => Promise<void> | void;
  onMorePress?: () => void;
}

export default function PostCard({
  id,
  title,
  content,
  author,
  community,
  timestamp,
  likes,
  comments,
  shares,
  saves,
  isLiked,
  isSaved,
  media,
  viewCount,
  onLikePress,
  onCommentPress,
  onSharePress,
  onSavePress,
  onMorePress,
}: PostCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const handleLike = async () => {
    if (onLikePress) {
      await onLikePress();
    }
  };

  const handleSave = async () => {
    if (onSavePress) {
      await onSavePress();
    }
  };

  const handleShare = async () => {
    if (isSharing) return;

    setIsSharing(true);
    try {
      await shareWithOptions({
        id,
        title,
        content,
        author,
      });
      if (onSharePress) {
        await onSharePress();
      }
    } catch (error) {
      console.log("Share error:", error);
    } finally {
      setIsSharing(false);
    }
  };

  const handleShareToChat = async () => {
    if (isSharing) return;

    setIsSharing(true);
    try {
      await shareToChat({
        id,
        title,
        content,
        author,
      });
      if (onSharePress) {
        await onSharePress();
      }
    } catch (error) {
      console.log("Share to chat error:", error);
    } finally {
      setIsSharing(false);
    }
  };

  const handleMoreOptions = () => {
    Alert.alert("More Options", "Choose an action", [
      {
        text: "Share to Chat",
        onPress: handleShareToChat,
      },
      {
        text: "Copy Link",
        onPress: async () => {
          // Use the imported functions directly
          const link = generatePostLink(id);
          await copyLink(link, "Post link");
          if (onSharePress) {
            await onSharePress();
          }
        },
      },
      {
        text: "Report Post",
        onPress: () => Alert.alert("Report", "Report feature coming soon"),
        style: "destructive",
      },
      {
        text: "Cancel",
        style: "cancel",
      },
    ]);
  };

  const toggleExpand = () => {
    setExpanded(!expanded);
  };

  const displayContent =
    expanded || content.length <= 150
      ? content
      : `${content.substring(0, 150)}...`;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Link href={`/user/${author.username}`} asChild>
          <TouchableOpacity style={styles.authorInfo}>
            <Avatar size={40} name={author.name} image={author.avatar} />
            <View style={styles.authorDetails}>
              <Text style={styles.authorName}>{author.name}</Text>
              <Text style={styles.authorUsername}>@{author.username}</Text>
              {community && (
                <Text style={styles.community}>in {community.name}</Text>
              )}
            </View>
          </TouchableOpacity>
        </Link>

        <View style={styles.headerRight}>
          <Text style={styles.timestamp}>{timestamp}</Text>
          <TouchableOpacity
            onPress={handleMoreOptions}
            style={styles.moreButton}
          >
            <Ionicons name="ellipsis-horizontal" size={20} color="#666" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {title && <Text style={styles.title}>{title}</Text>}

        <Text style={styles.text}>
          {displayContent}
          {content.length > 150 && !expanded && (
            <Text style={styles.readMore} onPress={toggleExpand}>
              {" "}
              Read more
            </Text>
          )}
          {expanded && (
            <Text style={styles.readMore} onPress={toggleExpand}>
              {" "}
              Show less
            </Text>
          )}
        </Text>

        {/* Media Preview */}
        {media && media.length > 0 && (
          <View style={styles.mediaContainer}>
            <View style={styles.mediaPreview}>
              <Ionicons name="image-outline" size={40} color="#999" />
              <Text style={styles.mediaText}>
                {media.length} {media.length === 1 ? "photo" : "photos"}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* View Count */}
      {viewCount !== undefined && (
        <Text style={styles.viewCount}>{viewCount.toLocaleString()} views</Text>
      )}

      {/* Stats */}
      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Ionicons name="heart" size={16} color="#ff375f" />
          <Text style={styles.statText}>
            {likes.toLocaleString()} {likes === 1 ? "like" : "likes"}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="chatbubble-outline" size={16} color="#666" />
          <Text style={styles.statText}>
            {comments.toLocaleString()}{" "}
            {comments === 1 ? "comment" : "comments"}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="arrow-redo-outline" size={16} color="#666" />
          <Text style={styles.statText}>
            {shares.toLocaleString()} {shares === 1 ? "share" : "shares"}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="bookmark-outline" size={16} color="#666" />
          <Text style={styles.statText}>
            {saves.toLocaleString()} {saves === 1 ? "save" : "saves"}
          </Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
          <Ionicons
            name={isLiked ? "heart" : "heart-outline"}
            size={22}
            color={isLiked ? "#ff375f" : "#666"}
          />
          <Text style={[styles.actionText, isLiked && styles.likedText]}>
            Like
          </Text>
        </TouchableOpacity>

        <Link href={`/post/${id}`} asChild>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="chatbubble-outline" size={22} color="#666" />
            <Text style={styles.actionText}>Comment</Text>
          </TouchableOpacity>
        </Link>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleShare}
          disabled={isSharing}
        >
          {isSharing ? (
            <Ionicons name="sync" size={20} color="#666" />
          ) : (
            <Ionicons name="arrow-redo-outline" size={22} color="#666" />
          )}
          <Text style={styles.actionText}>Share</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleSave}>
          <Ionicons
            name={isSaved ? "bookmark" : "bookmark-outline"}
            size={22}
            color={isSaved ? "#000" : "#666"}
          />
          <Text style={[styles.actionText, isSaved && styles.savedText]}>
            Save
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e5e5e5",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  authorInfo: {
    flexDirection: "row",
    flex: 1,
  },
  authorDetails: {
    flex: 1,
    marginLeft: 12,
  },
  authorName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
    color: "#000",
  },
  authorUsername: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
  },
  community: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  headerRight: {
    alignItems: "flex-end",
  },
  timestamp: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  moreButton: {
    padding: 4,
  },
  content: {
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#000",
  },
  text: {
    fontSize: 16,
    lineHeight: 22,
    color: "#000",
  },
  readMore: {
    color: "#000",
    fontWeight: "500",
  },
  viewCount: {
    fontSize: 12,
    color: "#666",
    marginBottom: 8,
  },
  mediaContainer: {
    marginTop: 12,
  },
  mediaPreview: {
    height: 150,
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  mediaText: {
    fontSize: 14,
    color: "#666",
    marginTop: 8,
  },
  stats: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#e5e5e5",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
    marginBottom: 12,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 20,
    marginBottom: 4,
  },
  statText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 4,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  actionButton: {
    alignItems: "center",
    padding: 4,
  },
  actionText: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  likedText: {
    color: "#ff375f",
  },
  savedText: {
    color: "#000",
  },
});
