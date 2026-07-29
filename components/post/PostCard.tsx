// components/post/PostCard.tsx

import ImageViewer from "@/components/media/ImageViewer";
import VideoPlayer from "@/components/media/VideoPlayer";
import HashtagText from "@/components/post/HashtagText";
import PollCard from "@/components/post/PollCard";
import PostOptionsSheet, {
  type PostOption,
  type PostOptionsSheetRef,
} from "@/components/post/PostOptionsSheet";
import RepostSheet, { type RepostSheetRef } from "@/components/RepostSheet";
import ShareSheet, { type ShareSheetRef } from "@/components/ShareSheet";
import Avatar from "@/components/user/Avatar";
import { useAuth } from "@/hooks/useAuth";
import {
  useDeletePost,
  useMarkNotInterested,
  useToggleRepost,
} from "@/hooks/usePosts";
import { useOptimisticSharePost } from "@/hooks/useShares";
import { type PollData } from "@/lib/firestore/polls";
import { purchasePostBoost } from "@/lib/monetization/boostPost";
import { generatePostLink } from "@/lib/share";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Link, router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const SCREEN_W = Dimensions.get("window").width;

interface QuotedPostPreview {
  id: string;
  content?: string;
  media_urls?: string[];
  user?: { full_name?: string; username?: string; avatar_url?: string };
}

interface PostCardProps {
  id: string;
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
  isReposted?: boolean;
  isRepostByMe?: boolean;
  quotedPost?: QuotedPostPreview | null;
  media?: string[];
  viewCount?: number;
  isBoosted?: boolean;
  boostedUntil?: string | null;
  onLikePress?: () => void | Promise<void>;
  onCommentPress?: () => void;
  onSharePress?: () => void | Promise<void>;
  onSavePress?: () => void | Promise<void>;
  onVisible?: () => void;
}

const isVideoUrl = (url?: string | null) => {
  if (!url) return false;
  const clean = url.split("?")[0].toLowerCase();
  return ["mp4", "mov", "m4v", "webm", "mkv", "avi"].some((e) =>
    clean.endsWith(`.${e}`),
  );
};

function QuotedPostCard({
  quotedPost,
  colors,
}: {
  quotedPost: QuotedPostPreview;
  colors: any;
}) {
  const author =
    quotedPost.user?.full_name || quotedPost.user?.username || "User";
  return (
    <TouchableOpacity
      style={[
        quotedStyles.card,
        { borderColor: colors.border, backgroundColor: colors.surface },
      ]}
      onPress={() => router.push(`/post/${quotedPost.id}` as any)}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`Quoted post by ${author}`}
    >
      <View style={quotedStyles.header}>
        {quotedPost.user?.avatar_url ? (
          <Image
            source={{ uri: quotedPost.user.avatar_url }}
            style={quotedStyles.avatar}
          />
        ) : (
          <View
            style={[
              quotedStyles.avatarFallback,
              { backgroundColor: colors.primary + "30" },
            ]}
          >
            <Text
              style={[quotedStyles.avatarLetter, { color: colors.primary }]}
            >
              {(author[0] || "U").toUpperCase()}
            </Text>
          </View>
        )}
        <Text
          style={[quotedStyles.author, { color: colors.text }]}
          numberOfLines={1}
        >
          {author}
        </Text>
        {!!quotedPost.user?.username && (
          <Text
            style={[quotedStyles.handle, { color: colors.textTertiary }]}
            numberOfLines={1}
          >
            @{quotedPost.user.username}
          </Text>
        )}
      </View>
      {!!quotedPost.content && (
        <Text
          style={[quotedStyles.content, { color: colors.textSecondary }]}
          numberOfLines={3}
        >
          {quotedPost.content}
        </Text>
      )}
      {!!quotedPost.media_urls?.[0] && (
        <Image
          source={{ uri: quotedPost.media_urls[0] }}
          style={quotedStyles.media}
          resizeMode="cover"
        />
      )}
    </TouchableOpacity>
  );
}

export default function PostCard(props: PostCardProps) {
  const {
    id,
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
    isReposted: isRepostedProp = false,
    isRepostByMe = false,
    quotedPost,
    media,
    viewCount,
    isBoosted = false,
    boostedUntil = null,
    onLikePress,
    onSavePress,
    onVisible,
  } = props;

  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const deletePostMutation = useDeletePost();
  const sharePostMutation = useOptimisticSharePost();
  const toggleRepostMutation = useToggleRepost();
  const markNotInterestedMutation = useMarkNotInterested();

  const [expanded, setExpanded] = useState(false);
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [isReposted, setIsReposted] = useState(isRepostedProp);
  const [repostCount, setRepostCount] = useState(reposts);
  const [isReposting, setIsReposting] = useState(false);
  const [shareCount, setShareCount] = useState(shares);
  const [isBoostingPost, setIsBoostingPost] = useState(false);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [showHeart, setShowHeart] = useState(false);

  const heartScale = useRef(new Animated.Value(0)).current;
  const heartOpacity = useRef(new Animated.Value(0)).current;

  const hasTrackedView = useRef(false);
  const lastTap = useRef(0);

  const repostSheetRef = useRef<RepostSheetRef>(null);
  const shareSheetRef = useRef<ShareSheetRef>(null);
  const postOptionsSheetRef = useRef<PostOptionsSheetRef>(null);

  const isOwned = !!user?.uid && user.uid === author.id;

  console.log("DELETE DEBUG:", {
    postId: id,
    postContentPreview: content?.slice(0, 30),
    userUid: user?.uid,
    authorId: author.id,
    authorName: author.name,
    isOwned,
  });

  const hasActiveBoost =
    isBoosted &&
    !!boostedUntil &&
    new Date(boostedUntil).getTime() > Date.now();

  useEffect(() => {
    if (!hasTrackedView.current && onVisible) {
      hasTrackedView.current = true;
      onVisible();
    }
  }, [onVisible]);

  useEffect(() => {
    setIsReposted(isRepostedProp);
  }, [isRepostedProp]);

  useEffect(() => {
    setRepostCount(reposts);
  }, [reposts]);

  const isPoll = post_type === "poll" && !!poll;
  const openPost = () => router.push(`/post/${id}` as any);

  const handleRepost = async () => {
    await Haptics.selectionAsync();

    if (isReposting) return;
    setIsReposting(true);
    const prev = isReposted;
    const prevCount = repostCount;
    setIsReposted(!prev);
    setRepostCount(prev ? Math.max(0, prevCount - 1) : prevCount + 1);
    try {
      await toggleRepostMutation.mutateAsync({ postId: id, isReposted: prev });
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

  const playHeartAnimation = () => {
    setShowHeart(true);

    heartScale.setValue(0.5);
    heartOpacity.setValue(0);

    Animated.parallel([
      Animated.spring(heartScale, {
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.timing(heartOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      Animated.timing(heartOpacity, {
        toValue: 0,
        duration: 300,
        delay: 500,
        useNativeDriver: true,
      }).start(() => {
        setShowHeart(false);
      });
    });
  };

  const handleImageTap = async (index: number) => {
    const now = Date.now();

    if (now - lastTap.current < 300) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      playHeartAnimation();

      if (!isLiked) {
        await onLikePress?.();
      }
    } else {
      setSelectedImage(index);

      setTimeout(async () => {
        if (Date.now() - lastTap.current >= 300) {
          await Haptics.selectionAsync();
          setViewerVisible(true);
        }
      }, 300);
    }

    lastTap.current = now;
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

  const handleNotInterested = () => {
    markNotInterestedMutation.mutate({
      postId: id,
      authorId: author.id,
      content,
    });
  };

  const handleBoost = () => {
    if (hasActiveBoost) {
      Alert.alert(
        "Already boosted",
        "This post is currently boosted. Check back after it expires to boost it again.",
      );
      return;
    }
    Alert.alert(
      "Boost this post?",
      "Boosting increases how often this post is shown in For You feeds for 24 hours.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Boost",
          onPress: async () => {
            setIsBoostingPost(true);
            try {
              await Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              );
              const result = await purchasePostBoost(id);
              if (result.status === "success") {
                Alert.alert(
                  "Boosted!",
                  "Your post is now boosted for the next 24 hours.",
                );
              } else if (result.status === "error") {
                Alert.alert("Boost failed", result.message);
              }
            } finally {
              setIsBoostingPost(false);
            }
          },
        },
      ],
    );
  };

  const handleMoreOptions = () => {
    setOptionsVisible(true);
  };

  const postOptions: PostOption[] = [
    {
      label: "View Post",
      icon: "eye-outline",
      onPress: openPost,
    },
    {
      label: "Not interested",
      icon: "thumbs-down-outline",
      onPress: handleNotInterested,
    },
    {
      label: isReposted ? "Undo Repost" : "Repost",
      icon: "repeat-outline",
      onPress: () => repostSheetRef.current?.present(),
    },
    {
      label: " Share Post",
      icon: "share-social-outline",
      onPress: () => shareSheetRef.current?.present(),
    },
  ];

  if (isOwned) {
    postOptions.push({
      label: hasActiveBoost ? "Boosted" : "Boost this post",
      icon: "rocket-outline",
      onPress: handleBoost,
      disabled: hasActiveBoost,
    });

    postOptions.push({
      label: "Delete Post",
      icon: "trash-outline",
      onPress: handleDelete,
      destructive: true,
    });
  } else {
    postOptions.push({
      label: "Report Post",
      icon: "flag-outline",
      onPress: () => Alert.alert("Report", "Reporting will be available soon."),
      destructive: true,
    });
  }

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
          onPress={() => handleImageTap(0)}
          style={styles.singleImageWrap}
          accessibilityRole="imagebutton"
          accessibilityLabel="Open post image"
        >
          <View style={{ flex: 1 }}>
            <Image
              source={{ uri: imageUrls[0] }}
              style={styles.singleImage}
              resizeMode="cover"
            />

            {showHeart && (
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.likeAnimation,
                  {
                    opacity: heartOpacity,
                    transform: [{ scale: heartScale }],
                  },
                ]}
              >
                <Ionicons name="heart" size={90} color="#FF375F" />
              </Animated.View>
            )}
          </View>
        </TouchableOpacity>
      );
    }
    return (
      <View style={styles.imageGrid}>
        {imageUrls.slice(0, 4).map((url, idx) => (
          <TouchableOpacity
            key={url + idx}
            activeOpacity={0.9}
            onPress={() => handleImageTap(idx)}
            style={[
              styles.gridCell,
              imageUrls.length === 2 && { width: "49%" },
              imageUrls.length >= 3 && { width: "32%" },
            ]}
            accessibilityRole="imagebutton"
            accessibilityLabel={`Open post image ${idx + 1}`}
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
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            shadowOpacity: isDark ? 0.22 : 0.04,
          },
          hasActiveBoost && { borderColor: colors.primary, borderWidth: 1.5 },
        ]}
      >
        {(isRepostByMe || hasActiveBoost) && (
          <View style={styles.topLabelsRow}>
            {isRepostByMe && (
              <View style={styles.repostLabel}>
                <Ionicons
                  name="repeat-outline"
                  size={13}
                  color={colors.textTertiary}
                />
                <Text
                  style={[
                    styles.repostLabelText,
                    { color: colors.textTertiary },
                  ]}
                >
                  You reposted
                </Text>
              </View>
            )}
            {hasActiveBoost && (
              <View
                style={[
                  styles.boostBadge,
                  { backgroundColor: colors.primary + "18" },
                ]}
              >
                <Ionicons name="rocket" size={12} color={colors.primary} />
                <Text
                  style={[styles.boostBadgeText, { color: colors.primary }]}
                >
                  Boosted
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.header}>
          <Link href={`/user/${author.id}`} asChild>
            <TouchableOpacity
              style={styles.authorInfo}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={`View ${author.name}'s profile`}
            >
              <Avatar size={32} name={author.name} image={author.avatar} />
              <View style={styles.authorDetails}>
                <Text style={[styles.authorName, { color: colors.text }]}>
                  {author.name}
                </Text>

                <View style={styles.userMeta}>
                  <Text
                    style={[
                      styles.authorUsername,
                      { color: colors.textSecondary },
                    ]}
                  >
                    @{author.username}
                  </Text>

                  <Text
                    style={[
                      styles.timestampInline,
                      { color: colors.textTertiary },
                    ]}
                  >
                    • {timestamp}
                  </Text>
                </View>

                {community && (
                  <Text style={[styles.community, { color: colors.primary }]}>
                    {community.name}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          </Link>

          <View style={styles.headerRight}>
            <TouchableOpacity
              onPress={() => postOptionsSheetRef.current?.present()}
              style={styles.moreButton}
              hitSlop={12}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="More options"
              disabled={isBoostingPost}
            >
              {isBoostingPost ? (
                <ActivityIndicator size={16} color={colors.textTertiary} />
              ) : (
                <Ionicons
                  name="ellipsis-horizontal"
                  size={20}
                  color={colors.textTertiary}
                />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.content} pointerEvents="box-none">
          {isPoll ? (
            <>
              <TouchableOpacity activeOpacity={0.85} onPress={openPost}>
                <Text
                  style={[styles.pollQuestion, { color: colors.text }]}
                  numberOfLines={3}
                ></Text>
              </TouchableOpacity>
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
              <HashtagText
                text={displayContent}
                style={StyleSheet.flatten([
                  styles.text,
                  { color: colors.text },
                ])}
              />
              {isTruncated && (
                <Text
                  style={[styles.readMore, { color: colors.primary }]}
                  onPress={() => setExpanded((v) => !v)}
                  accessibilityRole="button"
                  accessibilityLabel={expanded ? "Show less" : "Read more"}
                >
                  {expanded ? " Show less" : " Read more"}
                </Text>
              )}
              {!quotedPost && videoUrls.length > 0 && (
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
              {!quotedPost && imageUrls.length > 0 && (
                <View style={{ marginTop: 10 }}>{renderImageGrid()}</View>
              )}
              {!!quotedPost && (
                <View style={{ marginTop: 10 }}>
                  <QuotedPostCard quotedPost={quotedPost} colors={colors} />
                </View>
              )}
            </>
          )}
        </View>

        {typeof viewCount === "number" && (
          <Text style={[styles.viewCount, { color: colors.textTertiary }]}>
            {viewCount.toLocaleString()} views
          </Text>
        )}

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={openPost}
          style={[styles.stats, { borderColor: colors.border }]}
          accessibilityRole="button"
          accessibilityLabel="View post stats"
        >
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
        </TouchableOpacity>

        <View style={styles.actions}>
          <Action
            icon={isLiked ? "heart" : "heart-outline"}
            count={likes}
            color={isLiked ? "#FF375F" : colors.textSecondary}
            onPress={async () => {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              await onLikePress?.();
            }}
            accessibilityState={{ selected: isLiked }}
          />
          <Action
            icon="chatbubble-outline"
            count={comments}
            color={colors.textSecondary}
            onPress={openPost}
          />
          <Action
            icon={isReposted ? "repeat" : "repeat-outline"}
            count={repostCount}
            color={isReposted ? colors.primary : colors.textSecondary}
            disabled={isReposting}
            onPress={() => (repostSheetRef.current as any)?.present()}
            accessibilityState={{ selected: isReposted }}
          />
          <Action
            icon="share-outline"
            count={shareCount}
            color={colors.textSecondary}
            onPress={() => (shareSheetRef.current as any)?.present()}
          />
          <Action
            icon={isSaved ? "bookmark" : "bookmark-outline"}
            count={saves}
            color={isSaved ? colors.primary : colors.textSecondary}
            onPress={async () => {
              await Haptics.selectionAsync();
              await onSavePress?.();
            }}
            accessibilityState={{ selected: isSaved }}
          />
        </View>
      </View>

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
      <PostOptionsSheet ref={postOptionsSheetRef} options={postOptions} />
      <ImageViewer
        visible={viewerVisible}
        images={imageUrls}
        initialIndex={selectedImage}
        onClose={() => setViewerVisible(false)}
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
  count,
  color,
  disabled,
  onPress,
  accessibilityState,
}: {
  icon: any;
  count?: number;
  color: string;
  disabled?: boolean;
  onPress?: () => void;
  accessibilityState?: { selected?: boolean };
}) {
  return (
    <TouchableOpacity
      style={styles.actionButton}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      accessibilityState={accessibilityState}
    >
      <Ionicons name={icon} size={22} color={color} />

      {count !== undefined && (
        <Text style={[styles.actionCount, { color }]}>{count}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 6,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 1,
  },
  topLabelsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  repostLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  repostLabelText: { fontSize: 12, fontWeight: "600" },
  boostBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  boostBadgeText: { fontSize: 11, fontWeight: "800" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  authorInfo: { flexDirection: "row", flex: 1 },
  authorDetails: { marginLeft: 10, flex: 1 },
  authorName: { fontSize: 14, fontWeight: "700" },
  authorUsername: { fontSize: 12 },
  userMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  timestampInline: {
    fontSize: 12,
  },
  community: { fontSize: 11 },
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
  text: { fontSize: 15, lineHeight: 21 },
  readMore: { fontWeight: "500", marginTop: 4 },
  viewCount: { fontSize: 12, marginBottom: 8 },
  singleImageWrap: {
    width: "100%",
    height: 260,
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
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  actionButton: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    paddingVertical: 6,
  },

  actionCount: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: "600",
  },
  likeAnimation: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginLeft: -48,
    marginTop: -48,
  },

  heartOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
});

const quotedStyles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 6,
  },
  header: { flexDirection: "row", alignItems: "center", gap: 6 },
  avatar: { width: 18, height: 18, borderRadius: 9 },
  avatarFallback: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: { fontSize: 9, fontWeight: "900" },
  author: { fontSize: 13, fontWeight: "700", flexShrink: 1 },
  handle: { fontSize: 12, flexShrink: 1 },
  content: { fontSize: 13, lineHeight: 18 },
  media: { width: "100%", height: 120, borderRadius: 10, marginTop: 4 },
});
