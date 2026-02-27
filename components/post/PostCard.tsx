// components/post/PostCard.tsx — UPDATED (tap-to-open + ActionSheet + Android-safe menu + tappable hashtags)
import HashtagText from "@/components/post/HashtagText";
import Avatar from "@/components/user/Avatar";
import {
  copyLink,
  generatePostLink,
  shareToChat,
  shareWithOptions,
} from "@/lib/share";
import { useActionSheet } from "@expo/react-native-action-sheet";
import { Ionicons } from "@expo/vector-icons";
import { Link, router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type AlertButton,
} from "react-native";

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

  /**
   * Optional: allow parent to ADD actions (not replace).
   * Return extra Alert-like buttons to append.
   */
  getMoreActions?: () => AlertButton[];

  /* analytics */
  onVisible?: () => void;
}

export default function PostCard(props: PostCardProps) {
  const {
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
    onSharePress,
    onSavePress,
    getMoreActions,
    onVisible,
  } = props;

  const { showActionSheetWithOptions } = useActionSheet();

  const [expanded, setExpanded] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const hasTrackedView = useRef(false);

  useEffect(() => {
    if (!hasTrackedView.current && onVisible) {
      hasTrackedView.current = true;
      onVisible();
    }
  }, [onVisible]);

  const openPost = () => {
    router.push(`/post/${id}` as any);
  };

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
      await shareWithOptions({ id, title, content, author });
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
      await shareToChat({ id, title, content, author });
      await onSharePress?.();
    } catch (e) {
      console.warn("Share to chat failed:", e);
    } finally {
      setIsSharing(false);
    }
  };

  const handleBoost = () => {
    router.push(`/boost/${id}` as any);
  };

  const handleCopyLink = async () => {
    const link = generatePostLink(id);
    await copyLink(link, "Post link");
    await onSharePress?.();
  };

  const handleReport = () => {
    Alert.alert("Report", "Reporting will be available soon.");
  };

  const handleMoreOptions = () => {
    const baseButtons: AlertButton[] = [
      { text: "View Post", onPress: openPost },
      { text: "Boost Post", onPress: handleBoost },
      { text: "Share to Chat", onPress: () => void handleShareToChat() },
      { text: "Copy Link", onPress: () => void handleCopyLink() },
      { text: "Report Post", style: "destructive", onPress: handleReport },
    ];

    const extraButtons = getMoreActions?.() ?? [];
    const allButtons = [...baseButtons, ...extraButtons];
    const options = [...allButtons.map((b) => b.text ?? "Option"), "Cancel"];
    const cancelButtonIndex = options.length - 1;
    const destructiveIndex = allButtons.findIndex(
      (b) => b.style === "destructive",
    );
    const destructiveButtonIndex =
      destructiveIndex >= 0 ? destructiveIndex : undefined;

    showActionSheetWithOptions(
      { options, cancelButtonIndex, destructiveButtonIndex },
      (selectedIndex) => {
        if (selectedIndex == null) return;
        if (selectedIndex === cancelButtonIndex) return;
        const btn = allButtons[selectedIndex];
        btn?.onPress?.();
      },
    );
  };

  const isTruncated = content.length > 150;
  const displayContent =
    expanded || !isTruncated ? content : `${content.slice(0, 150)}…`;

  return (
    <Pressable onPress={openPost} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Link href={`/user/${author.username}`} asChild>
          <TouchableOpacity
            style={styles.authorInfo}
            onPress={(e) => e.stopPropagation?.()}
            activeOpacity={0.85}
          >
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
            onPress={(e) => {
              e.stopPropagation?.();
              handleMoreOptions();
            }}
            style={styles.moreButton}
            hitSlop={12}
            activeOpacity={0.8}
          >
            <Ionicons name="ellipsis-horizontal" size={20} color="#666" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {title && <Text style={styles.title}>{title}</Text>}

        {/* ✅ HashtagText renders #tags as tappable links */}
        <HashtagText
          text={displayContent}
          style={styles.text}
          onPress={openPost}
        />

        {isTruncated && (
          <Text
            style={styles.readMore}
            onPress={(e) => {
              e.stopPropagation?.();
              setExpanded((v) => !v);
            }}
          >
            {expanded ? " Show less" : " Read more"}
          </Text>
        )}

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
        <Action
          icon="chatbubble-outline"
          label="Comment"
          onPress={() => openPost()}
        />
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
    </Pressable>
  );
}

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
}: {
  icon: any;
  label: string;
  color?: string;
  disabled?: boolean;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.actionButton}
      onPress={(e) => {
        e.stopPropagation?.();
        onPress?.();
      }}
      disabled={disabled}
      activeOpacity={0.85}
    >
      <Ionicons name={icon} size={22} color={color} />
      <Text style={[styles.actionText, color !== "#666" && { color }]}>
        {label}
      </Text>
    </TouchableOpacity>
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
  readMore: { fontWeight: "500", marginTop: 4 },
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
  statItem: { flexDirection: "row", alignItems: "center", marginRight: 20 },
  statText: { marginLeft: 4, color: "#666" },
  actions: { flexDirection: "row", justifyContent: "space-around" },
  actionButton: { alignItems: "center", padding: 4 },
  actionText: { fontSize: 12, marginTop: 4, color: "#666" },
});
