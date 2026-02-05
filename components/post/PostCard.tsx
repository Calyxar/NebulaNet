// components/post/PostCard.tsx
import Avatar from "@/components/user/Avatar";
import {
  copyLink,
  generatePostLink,
  shareToChat,
  shareWithOptions,
} from "@/lib/share";
import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
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

  /* interactions */
  onLikePress?: () => void | Promise<void>;
  onCommentPress?: () => void;
  onSharePress?: () => void | Promise<void>;
  onSavePress?: () => void | Promise<void>;
  onMorePress?: () => void;

  /* analytics */
  onVisible?: () => void;
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
  onVisible,
}: PostCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  // View tracking — fire once per mount
  const hasTrackedView = useRef(false);

  useEffect(() => {
    if (!hasTrackedView.current && onVisible) {
      hasTrackedView.current = true;
      onVisible();
    }
  }, [onVisible]);

  /* ------------------------------------------------------------------ */
  /* Handlers                                                           */
  /* ------------------------------------------------------------------ */

  const handleLike = async () => {
    await onLikePress?.();
  };

  const handleSave = async () => {
    await onSavePress?.();
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

      await onSharePress?.();
    } catch (e) {
      console.warn("Share failed:", e);
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

      await onSharePress?.();
    } catch (e) {
      console.warn("Share to chat failed:", e);
    } finally {
      setIsSharing(false);
    }
  };

  const handleMoreOptions = () => {
    Alert.alert("More Options", undefined, [
      {
        text: "Share to Chat",
        onPress: handleShareToChat,
      },
      {
        text: "Copy Link",
        onPress: async () => {
          const link = generatePostLink(id);
          await copyLink(link, "Post link");
          await onSharePress?.();
        },
      },
      {
        text: "Report Post",
        style: "destructive",
        onPress: () =>
          Alert.alert("Report", "Reporting will be available soon."),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const displayContent =
    expanded || content.length <= 150 ? content : `${content.slice(0, 150)}…`;

  /* ------------------------------------------------------------------ */
  /* Render                                                             */
  /* ------------------------------------------------------------------ */

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
            onPress={onMorePress ?? handleMoreOptions}
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
          {content.length > 150 && (
            <Text
              style={styles.readMore}
              onPress={() => setExpanded(!expanded)}
            >
              {expanded ? " Show less" : " Read more"}
            </Text>
          )}
        </Text>

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

      {/* Views */}
      {typeof viewCount === "number" && (
        <Text style={styles.viewCount}>{viewCount.toLocaleString()} views</Text>
      )}

      {/* Stats */}
      <View style={styles.stats}>
        <Stat icon="heart" value={likes} label="like" color="#ff375f" />
        <Stat icon="chatbubble-outline" value={comments} label="comment" />
        <Stat icon="arrow-redo-outline" value={shares} label="share" />
        <Stat icon="bookmark-outline" value={saves} label="save" />
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Action
          icon={isLiked ? "heart" : "heart-outline"}
          label="Like"
          color={isLiked ? "#ff375f" : "#666"}
          onPress={handleLike}
        />

        <Link href={`/post/${id}`} asChild>
          <Action icon="chatbubble-outline" label="Comment" />
        </Link>

        <Action
          icon={isSharing ? "sync" : "arrow-redo-outline"}
          label="Share"
          disabled={isSharing}
          onPress={handleShare}
        />

        <Action
          icon={isSaved ? "bookmark" : "bookmark-outline"}
          label="Save"
          color={isSaved ? "#000" : "#666"}
          onPress={handleSave}
        />
      </View>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Small helpers                                                              */
/* -------------------------------------------------------------------------- */

function Stat({
  icon,
  value,
  label,
  color = "#666",
}: {
  icon: any;
  value: number;
  label: string;
  color?: string;
}) {
  return (
    <View style={styles.statItem}>
      <Ionicons name={icon} size={16} color={color} />
      <Text style={styles.statText}>
        {value.toLocaleString()} {value === 1 ? label : `${label}s`}
      </Text>
    </View>
  );
}

function Action({
  icon,
  label,
  color = "#666",
  disabled,
  onPress,
  children,
}: {
  icon: any;
  label: string;
  color?: string;
  disabled?: boolean;
  onPress?: () => void;
  children?: React.ReactNode;
}) {
  const content = (
    <TouchableOpacity
      style={styles.actionButton}
      onPress={onPress}
      disabled={disabled}
    >
      <Ionicons name={icon} size={22} color={color} />
      <Text style={[styles.actionText, color !== "#666" && { color }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return children ? children : content;
}

/* -------------------------------------------------------------------------- */
/* Styles                                                                     */
/* -------------------------------------------------------------------------- */

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
    marginBottom: 12,
  },

  authorInfo: { flexDirection: "row", flex: 1 },
  authorDetails: { marginLeft: 12, flex: 1 },
  authorName: { fontSize: 16, fontWeight: "600" },
  authorUsername: { fontSize: 14, color: "#666" },
  community: { fontSize: 14, color: "#666", fontWeight: "500" },

  headerRight: { alignItems: "flex-end" },
  timestamp: { fontSize: 12, color: "#666" },
  moreButton: { padding: 4 },

  content: { marginBottom: 12 },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 8 },
  text: { fontSize: 16, lineHeight: 22 },
  readMore: { fontWeight: "500" },

  viewCount: { fontSize: 12, color: "#666", marginBottom: 8 },

  mediaContainer: { marginTop: 12 },
  mediaPreview: {
    height: 150,
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  mediaText: { marginTop: 8, color: "#666" },

  stats: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#e5e5e5",
    marginBottom: 12,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 20,
  },
  statText: { marginLeft: 4, color: "#666" },

  actions: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  actionButton: { alignItems: "center", padding: 4 },
  actionText: { fontSize: 12, marginTop: 4, color: "#666" },
});
