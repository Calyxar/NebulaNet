// components/post/PostCard.tsx — ✅ FIXED: uses present()/dismiss() for BottomSheetModal
import VideoPlayer from "@/components/media/VideoPlayer";
import HashtagText from "@/components/post/HashtagText";
import PollCard from "@/components/post/PollCard";
import RepostSheet, { type RepostSheetRef } from "@/components/RepostSheet";
import ShareSheet, { type ShareSheetRef } from "@/components/ShareSheet";
import Avatar from "@/components/user/Avatar";
import { useAuth } from "@/hooks/useAuth";
import { useDeletePost } from "@/hooks/usePosts";
import { useOptimisticSharePost } from "@/hooks/useShares";
import { type PollData } from "@/lib/firestore/polls";
import { getRepostStatus, toggleRepost } from "@/lib/firestore/reposts";
import { generatePostLink } from "@/lib/share";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { Link, router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type AlertButton,
} from "react-native";

const SCREEN_W = Dimensions.get("window").width;

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
  reposts?: number;
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

const isVideoUrl = (url?: string | null) => {
  if (!url) return false;
  const clean = url.split("?")[0].toLowerCase();
  return ["mp4", "mov", "m4v", "webm", "mkv", "avi"].some((e) =>
    clean.endsWith(`.${e}`),
  );
};

export default function PostCard(props: PostCardProps) {
  const {
    id,
    title,
    content,
    post_type,
    poll,
    author,
    community,
    timestamp,
    likes,
    comments,
    shares,
    reposts = 0,
    saves,
    isLiked,
    isSaved,
    media,
    viewCount,
    onLikePress,
    onSavePress,
    getMoreActions,
    onVisible,
  } = props;

  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const deletePostMutation = useDeletePost();
  const sharePostMutation = useOptimisticSharePost();

  const [expanded, setExpanded] = useState(false);
  const [isReposted, setIsReposted] = useState(false);
  const [repostCount, setRepostCount] = useState(reposts);
  const [isReposting, setIsReposting] = useState(false);
  const [shareCount, setShareCount] = useState(shares);
  const hasTrackedView = useRef(false);

  const repostSheetRef = useRef<RepostSheetRef>(null);
  const shareSheetRef = useRef<ShareSheetRef>(null);

  const isOwned = !!user?.uid && user.uid === author.id;

  useEffect(() => {
    if (!hasTrackedView.current && onVisible) {
      hasTrackedView.current = true;
      onVisible();
    }
  }, [onVisible]);

  useEffect(() => {
    getRepostStatus(id)
      .then(setIsReposted)
      .catch(() => {});
  }, [id]);

  const isPoll = post_type === "poll" && !!poll;
  const openPost = () => router.push(`/post/${id}` as any);

  const handleRepost = async () => {
    if (isReposting) return;
    setIsReposting(true);
    const prev = isReposted;
    const prevCount = repostCount;
    setIsReposted(!prev);
    setRepostCount(prev ? Math.max(0, prevCount - 1) : prevCount + 1);
    try {
      await toggleRepost(id, prev);
    } catch {
      setIsReposted(prev);
      setRepostCount(prevCount);
      Alert.alert("Error", "Could not repost. Please try again.");
    } finally {
      setIsReposting(false);
    }
  };

  const handleShare = async () => {
    const prev = shareCount;
    setShareCount((c) => c + 1);
    try {
      await sharePostMutation.mutateAsync(id);
    } catch {
      setShareCount(prev);
    }
  };

  const handleQuoteRepost = () => {
    router.push({
      pathname: "/create/post",
      params: { quotePostId: id },
    } as any);
  };

  const handleDelete = () => {
    Alert.alert("Delete post?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deletePostMutation.mutate(id),
      },
    ]);
  };

  const handleMoreOptions = () => {
    const buttons: AlertButton[] = [
      { text: "View Post", onPress: openPost },
      {
        text: isReposted ? "Undo Repost" : "Repost",
        onPress: () => (repostSheetRef.current as any)?.present(),
      },
      {
        text: "Share Post",
        onPress: () => (shareSheetRef.current as any)?.present(),
      },
    ];

    if (isOwned) {
      buttons.push({
        text: "Delete Post",
        style: "destructive",
        onPress: handleDelete,
      });
    } else {
      buttons.push({
        text: "Report Post",
        style: "destructive",
        onPress: () =>
          Alert.alert("Report", "Reporting will be available soon."),
      });
    }

    const extraButtons = getMoreActions?.() ?? [];
    Alert.alert("Post Options", undefined, [
      ...buttons,
      ...extraButtons,
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const isTruncated = !isPoll && content.length > 150;
  const displayContent =
    expanded || !isTruncated ? content : `${content.slice(0, 150)}…`;

  const safeMedia = media ?? [];
  const imageUrls = safeMedia.filter((url) => !isVideoUrl(url));
  const videoUrls = safeMedia.filter((url) => isVideoUrl(url));

  const renderImageGrid = () => {
    if (imageUrls.length === 0) return null;
    if (imageUrls.length === 1) {
      return (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={openPost}
          style={styles.singleImageWrap}
        >
          <Image
            source={{ uri: imageUrls[0] }}
            style={styles.singleImage}
            resizeMode="cover"
          />
        </TouchableOpacity>
      );
    }
    return (
      <View style={styles.imageGrid}>
        {imageUrls.slice(0, 4).map((url, idx) => (
          <TouchableOpacity
            key={url + idx}
            activeOpacity={0.9}
            onPress={openPost}
            style={[
              styles.gridCell,
              imageUrls.length === 2 && { width: "49%" },
              imageUrls.length >= 3 && { width: "32%" },
            ]}
          >
            <Image
              source={{ uri: url }}
              style={styles.gridImage}
              resizeMode="cover"
            />
            {idx === 3 && imageUrls.length > 4 && (
              <View style={styles.moreOverlay}>
                <Text style={styles.moreOverlayText}>
                  +{imageUrls.length - 4}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <>
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
                <Text
                  style={[
                    styles.authorUsername,
                    { color: colors.textSecondary },
                  ]}
                >
                  @{author.username}
                </Text>
                {community && (
                  <Text
                    style={[styles.community, { color: colors.textSecondary }]}
                  >
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
              onPress={(e) => {
                e.stopPropagation?.();
                handleMoreOptions();
              }}
              style={styles.moreButton}
              hitSlop={12}
              activeOpacity={0.8}
            >
              <Ionicons
                name="ellipsis-horizontal"
                size={20}
                color={colors.textTertiary}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.content}>
          {isPoll ? (
            <>
              <Text
                style={[styles.pollQuestion, { color: colors.text }]}
                numberOfLines={3}
              >
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
              {!!title && (
                <Text style={[styles.title, { color: colors.text }]}>
                  {title}
                </Text>
              )}
              <HashtagText
                text={displayContent}
                style={StyleSheet.flatten([
                  styles.text,
                  { color: colors.text },
                ])}
                onPress={openPost}
              />
              {isTruncated && (
                <Text
                  style={[styles.readMore, { color: colors.primary }]}
                  onPress={(e) => {
                    e.stopPropagation?.();
                    setExpanded((v) => !v);
                  }}
                >
                  {expanded ? " Show less" : " Read more"}
                </Text>
              )}
              {videoUrls.length > 0 && (
                <View style={{ marginTop: 12, gap: 8 }}>
                  {videoUrls.map((url, idx) => (
                    <VideoPlayer
                      key={url + idx}
                      uri={url}
                      style={{ height: 260, borderRadius: 14 }}
                    />
                  ))}
                </View>
              )}
              {imageUrls.length > 0 && (
                <View style={{ marginTop: 10 }}>{renderImageGrid()}</View>
              )}
            </>
          )}
        </View>

        {typeof viewCount === "number" && (
          <Text style={[styles.viewCount, { color: colors.textTertiary }]}>
            {viewCount.toLocaleString()} views
          </Text>
        )}

        <View style={[styles.stats, { borderColor: colors.border }]}>
          <Stat icon="heart" value={likes} label="like" color="#FF375F" />
          <Stat
            icon="chatbubble-outline"
            value={comments}
            label="comment"
            color={colors.textSecondary}
          />
          <Stat
            icon="repeat-outline"
            value={repostCount}
            label="repost"
            color={isReposted ? colors.primary : colors.textSecondary}
          />
          <Stat
            icon="share-outline"
            value={shareCount}
            label="share"
            color={colors.textSecondary}
          />
          <Stat
            icon="bookmark-outline"
            value={saves}
            label="save"
            color={colors.textSecondary}
          />
        </View>

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
            icon={isReposted ? "repeat" : "repeat-outline"}
            label={isReposted ? "Reposted" : "Repost"}
            color={isReposted ? colors.primary : colors.textSecondary}
            disabled={isReposting}
            onPress={(e) => {
              e.stopPropagation?.();
              (repostSheetRef.current as any)?.present();
            }}
          />
          <Action
            icon="share-outline"
            label="Share"
            color={colors.textSecondary}
            onPress={(e) => {
              e.stopPropagation?.();
              (shareSheetRef.current as any)?.present();
            }}
          />
          <Action
            icon={isSaved ? "bookmark" : "bookmark-outline"}
            label="Save"
            color={isSaved ? colors.primary : colors.textSecondary}
            onPress={() => void onSavePress?.()}
          />
        </View>
      </Pressable>

      <RepostSheet
        ref={repostSheetRef}
        isReposted={isReposted}
        onRepost={handleRepost}
        onQuoteRepost={handleQuoteRepost}
        onUndoRepost={handleRepost}
      />
      <ShareSheet
        ref={shareSheetRef}
        title="Share Post"
        url={generatePostLink(id)}
        text={content}
        shareMessage={`Check out this post on NebulaNet: ${content.slice(0, 100)}${content.length > 100 ? "..." : ""}`}
        onShared={handleShare}
      />
    </>
  );
}

function Stat({
  icon,
  value,
  label,
  color,
}: {
  icon: any;
  value: number;
  label: string;
  color: string;
}) {
  return (
    <View style={styles.statItem}>
      <Ionicons name={icon} size={16} color={color} />
      <Text style={[styles.statText, { color }]}>
        {value.toLocaleString()} {value === 1 ? label : `${label}s`}
      </Text>
    </View>
  );
}

function Action({
  icon,
  label,
  color,
  disabled,
  onPress,
}: {
  icon: any;
  label: string;
  color: string;
  disabled?: boolean;
  onPress?: (e: any) => void;
}) {
  return (
    <TouchableOpacity
      style={styles.actionButton}
      onPress={onPress}
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  authorInfo: { flexDirection: "row", flex: 1 },
  authorDetails: { marginLeft: 12, flex: 1 },
  authorName: { fontSize: 16, fontWeight: "600" },
  authorUsername: { fontSize: 14 },
  community: { fontSize: 14, fontWeight: "500" },
  headerRight: { alignItems: "flex-end" },
  timestamp: { fontSize: 12 },
  moreButton: { padding: 4 },
  content: { marginBottom: 12 },
  pollQuestion: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 4,
    lineHeight: 23,
  },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 8 },
  text: { fontSize: 16, lineHeight: 22 },
  readMore: { fontWeight: "500", marginTop: 4 },
  viewCount: { fontSize: 12, marginBottom: 8 },
  singleImageWrap: {
    width: "100%",
    height: 220,
    borderRadius: 14,
    overflow: "hidden",
  },
  singleImage: { width: "100%", height: "100%" },
  imageGrid: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  gridCell: {
    width: "49%",
    height: 140,
    borderRadius: 10,
    overflow: "hidden",
    position: "relative",
  },
  gridImage: { width: "100%", height: "100%" },
  moreOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  moreOverlayText: { color: "#fff", fontSize: 22, fontWeight: "900" },
  stats: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginBottom: 12,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
    marginBottom: 4,
  },
  statText: { marginLeft: 4, fontSize: 13 },
  actions: { flexDirection: "row", justifyContent: "space-around" },
  actionButton: { alignItems: "center", padding: 4 },
  actionText: { fontSize: 11, marginTop: 4 },
});
