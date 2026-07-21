// components/post/PostCard.tsx — canonical PostCard for NebulaNet 2.0
// ✅ Hashtags tappable in feed (Twitter-style)
// ✅ "You reposted" label + quote-repost preview card
// ✅ isReposted/repostCount seeded from feed-query props instead of a
//    per-card Firestore read — avoids an N+1 read.
// ✅ "Not interested" in the "..." menu — Phase B of the recommendation-
//    engine work, backed by useMarkNotInterested.
// ✅ NEW: "Boost this post" in the "..." menu (owner-only) — Phase 4
//    monetization. Backed by purchasePostBoost from
//    lib/monetization/boostPost.ts, which handles the real RevenueCat
//    purchase + server-side verification via the applyPostBoost Cloud
//    Function. This component never writes is_boosted/boosted_until
//    itself — it only triggers the purchase flow and reflects whatever
//    the props say once the parent's data refetches after purchase.
// ✅ NEW: "🚀 Boosted" badge, shown whenever isBoosted is true AND
//    boostedUntil hasn't passed — checked client-side against the actual
//    timestamp (not just the flag) so an expired boost stops showing the
//    badge immediately rather than waiting on a server-side cleanup job,
//    same reasoning as hasActiveBoost() in lib/firestore/posts.ts.

import VideoPlayer from "@/components/media/VideoPlayer";
import HashtagText from "@/components/post/HashtagText";
import PollCard from "@/components/post/PollCard";
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
import { Link, router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type AlertButton,
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
  isReposted?: boolean;
  isRepostByMe?: boolean;
  quotedPost?: QuotedPostPreview | null;
  media?: string[];
  viewCount?: number;
  // ✅ NEW: monetization — paid post boosts
  isBoosted?: boolean;
  boostedUntil?: string | null;
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
    isReposted: isRepostedProp = false,
    isRepostByMe = false,
    quotedPost,
    media,
    viewCount,
    isBoosted = false,
    boostedUntil = null,
    onLikePress,
    onSavePress,
    getMoreActions,
    onVisible,
  } = props;

  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const deletePostMutation = useDeletePost();
  const sharePostMutation = useOptimisticSharePost();
  const toggleRepostMutation = useToggleRepost();
  const markNotInterestedMutation = useMarkNotInterested();

  const [expanded, setExpanded] = useState(false);
  const [isReposted, setIsReposted] = useState(isRepostedProp);
  const [repostCount, setRepostCount] = useState(reposts);
  const [isReposting, setIsReposting] = useState(false);
  const [shareCount, setShareCount] = useState(shares);
  const [isBoostingPost, setIsBoostingPost] = useState(false);
  const hasTrackedView = useRef(false);

  const repostSheetRef = useRef<RepostSheetRef>(null);
  const shareSheetRef = useRef<ShareSheetRef>(null);

  const isOwned = !!user?.uid && user.uid === author.id;

  // ✅ NEW: active only while boostedUntil hasn't passed — an expired
  // boost stops showing the badge immediately rather than waiting on a
  // server-side cleanup job to flip isBoosted back to false.
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

  // ✅ NEW: kicks off the real RevenueCat purchase flow. purchasePostBoost
  // handles the store payment sheet + server-side verification; this
  // component only shows the confirmation prompt and loading/error state
  // around it. It never writes is_boosted/boosted_until itself — that
  // only happens inside the applyPostBoost Cloud Function once a real
  // purchase is verified.
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
              const result = await purchasePostBoost(id);
              if (result.status === "success") {
                Alert.alert(
                  "Boosted!",
                  "Your post is now boosted for the next 24 hours.",
                );
              } else if (result.status === "error") {
                Alert.alert("Boost failed", result.message);
              }
              // "cancelled" (user backed out of the payment sheet) shows
              // nothing — same as any other cancelled purchase flow.
            } finally {
              setIsBoostingPost(false);
            }
          },
        },
      ],
    );
  };

  const handleMoreOptions = () => {
    const buttons: AlertButton[] = [
      { text: "View Post", onPress: openPost },
      { text: "Not interested", onPress: handleNotInterested },
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
      // ✅ NEW: owner-only, placed right after the always-present actions
      // and before the destructive Delete option below.
      buttons.push({
        text: hasActiveBoost ? "Boosted" : "Boost this post",
        onPress: handleBoost,
      });
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
          accessibilityRole="imagebutton"
          accessibilityLabel="Open post image"
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
          // ✅ NEW: a subtle border tint on boosted posts, in addition to
          // the badge — keeps them visually distinct even at a glance in
          // a fast-scrolling feed.
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
              onPress={handleMoreOptions}
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
                >
                  {title || content}
                </Text>
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
              {!!title && (
                <TouchableOpacity activeOpacity={0.85} onPress={openPost}>
                  <Text style={[styles.title, { color: colors.text }]}>
                    {title}
                  </Text>
                </TouchableOpacity>
              )}
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
            label="Like"
            color={isLiked ? "#FF375F" : colors.textSecondary}
            onPress={() => void onLikePress?.()}
            accessibilityState={{ selected: isLiked }}
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
            onPress={() => (repostSheetRef.current as any)?.present()}
            accessibilityState={{ selected: isReposted }}
          />
          <Action
            icon="share-outline"
            label="Share"
            color={colors.textSecondary}
            onPress={() => (shareSheetRef.current as any)?.present()}
          />
          <Action
            icon={isSaved ? "bookmark" : "bookmark-outline"}
            label="Save"
            color={isSaved ? colors.primary : colors.textSecondary}
            onPress={() => void onSavePress?.()}
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
  accessibilityState,
}: {
  icon: any;
  label: string;
  color: string;
  disabled?: boolean;
  onPress?: (e?: any) => void;
  accessibilityState?: { selected?: boolean };
}) {
  return (
    <TouchableOpacity
      style={styles.actionButton}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={accessibilityState}
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
