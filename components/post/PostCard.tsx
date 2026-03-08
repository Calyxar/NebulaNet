// components/post/PostCard.tsx — COMPLETED + UPDATED ✅
import HashtagText from "@/components/post/HashtagText";
import PollCard from "@/components/post/PollCard";
import Avatar from "@/components/user/Avatar";
import { type PollData } from "@/lib/firestore/polls";
import { copyLink, generatePostLink, shareToChat, shareWithOptions } from "@/lib/share";
import { useTheme } from "@/providers/ThemeProvider";
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
  post_type?: "text" | "poll" | "image" | "video" | string;
  poll?: PollData;
  author: { id: string; name: string; username: string; avatar?: string };
  community?: { id: string; name: string; slug: string };
  timestamp: string;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  isLiked: boolean;
  isSaved: boolean;
  media?: string[];
  viewCount?: number;
  onLikePress?: () => void | Promise<void>;
  onCommentPress?: () => void;
  onSharePress?: () => void | Promise<void>;
  onSavePress?: () => void | Promise<void>;
  getMoreActions?: () => AlertButton[];
  onVisible?: () => void;
}

export default function PostCard(props: PostCardProps) {
  const {
    id, title, content, post_type, poll, author, community,
    timestamp, likes, comments, shares, saves, isLiked, isSaved,
    media, viewCount, onLikePress, onSharePress, onSavePress,
    getMoreActions, onVisible,
  } = props;

  const { colors, isDark } = useTheme();
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

  const isPoll = post_type === "poll" && !!poll;
  const openPost = () => router.push(`/post/${id}` as any);

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

  const handleCopyLink = async () => {
    const link = generatePostLink(id);
    await copyLink(link, "Post link");
    await onSharePress?.();
  };

  const handleMoreOptions = () => {
    const baseButtons: AlertButton[] = [
      { text: "View Post", onPress: openPost },
      { text: "Boost Post", onPress: () => router.push(`/boost/${id}` as any) },
      { text: "Share to Chat", onPress: () => void handleShareToChat() },
      { text: "Copy Link", onPress: () => void handleCopyLink() },
      { text: "Report Post", style: "destructive", onPress: () => Alert.alert("Report", "Reporting will be available soon.") },
    ];

    const extraButtons = getMoreActions?.() ?? [];
    const allButtons = [...baseButtons, ...extraButtons];
    const options = [...allButtons.map((b) => b.text ?? "Option"), "Cancel"];
    const cancelButtonIndex = options.length - 1;
    const destructiveIndex = allButtons.findIndex((b) => b.style === "destructive");

    showActionSheetWithOptions(
      { options, cancelButtonIndex, destructiveButtonIndex: destructiveIndex >= 0 ? destructiveIndex : undefined },
      (selectedIndex) => {
        if (selectedIndex == null || selectedIndex === cancelButtonIndex) return;
        allButtons[selectedIndex]?.onPress?.();
      },
    );
  };

  const isTruncated = !isPoll && content.length > 150;
  const displayContent = expanded || !isTruncated ? content : `${content.slice(0, 150)}…`;

  return (
    <Pressable
      onPress={openPost}
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          shadowOpacity: isDark ? 0.22 : 0.04,
        },
      ]}
    >
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
              <Text style={[styles.authorName, { color: colors.text }]}>
                {author.name}
              </Text>
              <Text style={[styles.authorUsername, { color: colors.textSecondary }]}>
                @{author.username}
              </Text>
              {community && (
                <Text style={[styles.community, { color: colors.textSecondary }]}>
                  in {community.name}
                </Text>
              )}
            </View>
          </TouchableOpacity>
        </Link>

        <View style={styles.headerRight}>
          <Text style={[styles.timestamp, { color: colors.textTertiary }]}>
            {timestamp}
          </Text>
          <TouchableOpacity
            onPress={(e) => { e.stopPropagation?.(); handleMoreOptions(); }}
            style={styles.moreButton}
            hitSlop={12}
            activeOpacity={0.8}
          >
            <Ionicons name="ellipsis-horizontal" size={20} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {isPoll ? (
          <>
            <Text style={[styles.pollQuestion, { color: colors.text }]} numberOfLines={3}>
              {title || content}
            </Text>
            <PollCard
              postId={id}
              poll={poll}
              accentColor={colors.primary}
              textColor={colors.text}
              subColor={colors.textSecondary}
              cardBg={colors.surface}
              borderColor={colors.border}
            />
          </>
        ) : (
          <>
            {title && (
              <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
            )}

            <HashtagText
              text={displayContent}
              style={StyleSheet.flatten([styles.text, { color: colors.text }])}
              onPress={openPost}
            />

            {isTruncated && (
              <Text
                style={[styles.readMore, { color: colors.primary }]}
                onPress={(e) => { e.stopPropagation?.(); setExpanded((v) => !v); }}
              >
                {expanded ? " Show less" : " Read more"}
              </Text>
            )}

            {media && media.length > 0 && (
              <View style={styles.mediaContainer}>
                <View style={[styles.mediaPreview, { backgroundColor: colors.surface }]}>
                  <Ionicons name="image-outline" size={40} color={colors.textTertiary} />
                  <Text style={[styles.mediaText, { color: colors.textTertiary }]}>
                    {media.length} {media.length === 1 ? "photo" : "photos"}
                  </Text>
                </View>
              </View>
            )}
          </>
        )}
      </View>

      {/* Views */}
      {typeof viewCount === "number" && (
        <Text style={[styles.viewCount, { color: colors.textTertiary }]}>
          {viewCount.toLocaleString()} views
        </Text>
      )}

      {/* Stats */}
      <View style={[styles.stats, { borderColor: colors.border }]}>
        <Stat icon="heart" value={likes} label="like" color="#FF375F" />
        <Stat icon="chatbubble-outline" value={comments} label="comment" color={colors.textSecondary} />
        <Stat icon="arrow-redo-outline" value={shares} label="share" color={colors.textSecondary} />
        <Stat icon="bookmark-outline" value={saves} label="save" color={colors.textSecondary} />
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Action
          icon={isLiked ? "heart" : "heart-outline"}
          label="Like"
          color={isLiked ? "#FF375F" : colors.textSecondary}
          onPress={() => void onLikePress?.()}
        />
        <Action
          icon="chatbubble-outline"
          label="Comment"
          color={colors.textSecondary}
          onPress={openPost}
        />
        <Action
          icon={isSharing ? "sync" : "arrow-redo-outline"}
          label="Share"
          color={colors.textSecondary}
          disabled={isSharing}
          onPress={handleShare}
        />
        <Action
          icon={isSaved ? "bookmark" : "bookmark-outline"}
          label="Save"
          color={isSaved ? colors.primary : colors.textSecondary}
          onPress={() => void onSavePress?.()}
        />
      </View>
    </Pressable>
  );
}

function Stat({ icon, value, label, color }: { icon: any; value: number; label: string; color: string }) {
  return (
    <View style={styles.statItem}>
      <Ionicons name={icon} size={16} color={color} />
      <Text style={[styles.statText, { color }]}>
        {value.toLocaleString()} {value === 1 ? label : `${label}s`}
      </Text>
    </View>
  );
}

function Action({ icon, label, color, disabled, onPress }: {
  icon: any; label: string; color: string; disabled?: boolean; onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.actionButton}
      onPress={(e) => { e.stopPropagation?.(); onPress?.(); }}
      disabled={disabled}
      activeOpacity={0.85}
    >
      <Ionicons name={icon} size={22} color={color} />
      <Text style={[styles.actionText, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  authorInfo: { flexDirection: "row", flex: 1 },
  authorDetails: { marginLeft: 12, flex: 1 },
  authorName: { fontSize: 16, fontWeight: "600" },
  authorUsername: { fontSize: 14 },
  community: { fontSize: 14, fontWeight: "500" },
  headerRight: { alignItems: "flex-end" },
  timestamp: { fontSize: 12 },
  moreButton: { padding: 4 },
  content: { marginBottom: 12 },
  pollQuestion: { fontSize: 17, fontWeight: "700", marginBottom: 4, lineHeight: 23 },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 8 },
  text: { fontSize: 16, lineHeight: 22 },
  readMore: { fontWeight: "500", marginTop: 4 },
  viewCount: { fontSize: 12, marginBottom: 8 },
  mediaContainer: { marginTop: 12 },
  mediaPreview: { height: 150, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  mediaText: { marginTop: 8 },
  stats: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginBottom: 12,
  },
  statItem: { flexDirection: "row", alignItems: "center", marginRight: 20 },
  statText: { marginLeft: 4, fontSize: 13 },
  actions: { flexDirection: "row", justifyContent: "space-around" },
  actionButton: { alignItems: "center", padding: 4 },
  actionText: { fontSize: 12, marginTop: 4 },
});