// app/(tabs)/explore.tsx — React Native Firebase ✅
// ✅ FIXED: unguarded .toLocaleString() on like/comment/repost counts in
// the Top Posts trending block — now guarded with ?? 0, matching the
// Latest tab's already-guarded version.
// ✅ Added uiScale/fontScale across header/search bar, tab bar, rows,
// avatars, cards, post stats, news items, empty states.
// ✅ NEW: FilterModal now also threaded with uiScale/fontScale — this was
// deliberately deferred during the original pass (lower-traffic than the
// main feed), closing that gap now.

import { CommunityRow } from "@/components/CommunityRow";
import AppHeader from "@/components/navigation/AppHeader";
import { getTabBarHeight } from "@/components/navigation/CurvedTabBar";
import { PostSearchSkeleton, SearchRowSkeleton } from "@/components/Skeleton";
import UserActionsSheet, {
  type UserActionsSheetRef,
} from "@/components/UserActionsSheet";
import { useAuth } from "@/hooks/useAuth";
import { useFollowActions, useFollowStatus } from "@/hooks/useFollowActions";
import { useMuteStatus, useToggleMute } from "@/hooks/useMuteUser";
import {
  NEWS_CATEGORIES,
  useNews,
  type NewsArticle,
  type NewsCategory,
} from "@/hooks/useNews";
import {
  fetchDiscoveryPosts,
  fetchSuggestedCommunities,
  fetchSuggestedUsers,
  fetchTrendingPosts,
  useRecentSearches,
  useSearch,
  type DiscoveryPost,
  type SearchCommunity,
  type SuggestedUser,
  type TrendingPost,
} from "@/hooks/useSearch";
import {
  getTrendingHashtags,
  type TrendingHashtag,
} from "@/lib/firestore/hashtags";
import { invalidateAfterBlock } from "@/lib/queryKeys/invalidateSocial";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import firestore from "@react-native-firebase/firestore";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Keyboard,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

const SCREEN_W = Dimensions.get("window").width;
const GRID_H_PAD = 36;
const GRID_GAP = 2;
const GRID_COLS = 3;
const GRID_CELL =
  (SCREEN_W - GRID_H_PAD - GRID_GAP * (GRID_COLS - 1)) / GRID_COLS;

type ExploreCategory =
  | "top"
  | "latest"
  | "people"
  | "media"
  | "community"
  | "news";

type MediaFilter = "all" | "images" | "videos" | "gifs";
type SafetyFilter = "safe" | "all";

const isVideoUrl = (url?: string | null) => {
  if (!url) return false;
  const clean = url.split("?")[0].toLowerCase();
  return ["mp4", "mov", "m4v", "webm", "mkv", "avi"].some((e) =>
    clean.endsWith(`.${e}`),
  );
};

const isImageUrl = (url?: string | null) => {
  if (!url) return false;
  const clean = url.split("?")[0].toLowerCase();
  return ["jpg", "jpeg", "png", "webp"].some((e) => clean.endsWith(`.${e}`));
};

const isGifUrl = (url?: string | null) => {
  if (!url) return false;
  return url.split("?")[0].toLowerCase().endsWith(".gif");
};

function FilterModal({
  visible,
  onClose,
  mediaFilter,
  safetyFilter,
  onMediaFilter,
  onSafetyFilter,
  colors,
  isDark,
  uiScale,
  fontScale,
}: {
  visible: boolean;
  onClose: () => void;
  mediaFilter: MediaFilter;
  safetyFilter: SafetyFilter;
  onMediaFilter: (f: MediaFilter) => void;
  onSafetyFilter: (f: SafetyFilter) => void;
  colors: any;
  isDark: boolean;
  uiScale: number;
  fontScale: number;
}) {
  const mediaOptions: { key: MediaFilter; label: string; icon: string }[] = [
    { key: "all", label: "All media", icon: "apps-outline" },
    { key: "images", label: "Images", icon: "image-outline" },
    { key: "videos", label: "Videos", icon: "videocam-outline" },
    { key: "gifs", label: "GIFs", icon: "sparkles-outline" },
  ];

  const safetyOptions: {
    key: SafetyFilter;
    label: string;
    desc: string;
    icon: string;
  }[] = [
    {
      key: "safe",
      label: "Safe mode",
      desc: "Hide sensitive content",
      icon: "shield-checkmark-outline",
    },
    {
      key: "all",
      label: "All content",
      desc: "Show everything including NSFW",
      icon: "eye-outline",
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableOpacity
        style={fStyles.overlay}
        activeOpacity={1}
        onPress={onClose}
      />
      <View
        style={[
          fStyles.sheet,
          {
            backgroundColor: colors.card,
            padding: 24 * uiScale,
            paddingBottom: 40 * uiScale,
          },
        ]}
      >
        <View
          style={[
            fStyles.handle,
            { backgroundColor: colors.border, marginBottom: 20 * uiScale },
          ]}
        />
        <Text
          style={[
            fStyles.title,
            {
              color: colors.text,
              fontSize: 18 * fontScale,
              marginBottom: 20 * uiScale,
            },
          ]}
        >
          Search Filters
        </Text>
        <Text
          style={[
            fStyles.sectionLabel,
            {
              color: colors.textTertiary,
              fontSize: 12 * fontScale,
              marginBottom: 12 * uiScale,
            },
          ]}
        >
          Media type
        </Text>
        <View style={[fStyles.optionGrid, { gap: 10 * uiScale }]}>
          {mediaOptions.map((o) => {
            const active = mediaFilter === o.key;
            return (
              <TouchableOpacity
                key={o.key}
                style={[
                  fStyles.optionPill,
                  {
                    backgroundColor: active ? colors.primary : colors.surface,
                    borderColor: active ? colors.primary : colors.border,
                    paddingHorizontal: 14 * uiScale,
                    paddingVertical: 10 * uiScale,
                    gap: 6 * uiScale,
                  },
                ]}
                onPress={() => onMediaFilter(o.key)}
                activeOpacity={0.85}
              >
                <Ionicons
                  name={o.icon as any}
                  size={16}
                  color={active ? "#fff" : colors.textSecondary}
                />
                <Text
                  style={[
                    fStyles.optionLabel,
                    {
                      color: active ? "#fff" : colors.text,
                      fontSize: 14 * fontScale,
                    },
                  ]}
                >
                  {o.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text
          style={[
            fStyles.sectionLabel,
            {
              color: colors.textTertiary,
              marginTop: 20 * uiScale,
              fontSize: 12 * fontScale,
            },
          ]}
        >
          Safety
        </Text>
        <View style={[fStyles.safetyCard, { backgroundColor: colors.surface }]}>
          {safetyOptions.map((o, i) => {
            const active = safetyFilter === o.key;
            return (
              <TouchableOpacity
                key={o.key}
                style={[
                  fStyles.safetyRow,
                  { gap: 12 * uiScale, padding: 14 * uiScale },
                  i !== 0 && {
                    borderTopWidth: 1,
                    borderTopColor: colors.border,
                  },
                ]}
                onPress={() => onSafetyFilter(o.key)}
                activeOpacity={0.85}
              >
                <View
                  style={[
                    fStyles.safetyIcon,
                    {
                      backgroundColor: active
                        ? colors.primary + "18"
                        : colors.card,
                      width: 36 * uiScale,
                      height: 36 * uiScale,
                      borderRadius: 18 * uiScale,
                    },
                  ]}
                >
                  <Ionicons
                    name={o.icon as any}
                    size={18}
                    color={active ? colors.primary : colors.textTertiary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      fStyles.safetyLabel,
                      { color: colors.text, fontSize: 14 * fontScale },
                    ]}
                  >
                    {o.label}
                  </Text>
                  <Text
                    style={[
                      fStyles.safetyDesc,
                      {
                        color: colors.textTertiary,
                        fontSize: 12 * fontScale,
                        marginTop: 2 * uiScale,
                      },
                    ]}
                  >
                    {o.desc}
                  </Text>
                </View>
                {active && (
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={colors.primary}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
        <TouchableOpacity
          style={[
            fStyles.doneBtn,
            {
              backgroundColor: colors.primary,
              marginTop: 24 * uiScale,
              paddingVertical: 16 * uiScale,
            },
          ]}
          onPress={onClose}
          activeOpacity={0.88}
        >
          <Text style={[fStyles.doneBtnText, { fontSize: 16 * fontScale }]}>
            Done
          </Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const fStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
  },
  title: { fontWeight: "900" },
  sectionLabel: {
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  optionGrid: { flexDirection: "row", flexWrap: "wrap" },
  optionPill: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
  },
  optionLabel: { fontWeight: "700" },
  safetyCard: { borderRadius: 18, overflow: "hidden" },
  safetyRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  safetyIcon: {
    alignItems: "center",
    justifyContent: "center",
  },
  safetyLabel: { fontWeight: "800" },
  safetyDesc: { lineHeight: 16 },
  doneBtn: {
    borderRadius: 999,
    alignItems: "center",
  },
  doneBtnText: { color: "#fff", fontWeight: "800" },
});

function ActiveFilterChips({
  mediaFilter,
  safetyFilter,
  onClearMedia,
  onClearSafety,
  colors,
}: {
  mediaFilter: MediaFilter;
  safetyFilter: SafetyFilter;
  onClearMedia: () => void;
  onClearSafety: () => void;
  colors: any;
}) {
  const chips = [];
  if (mediaFilter !== "all")
    chips.push({
      label: mediaFilter.charAt(0).toUpperCase() + mediaFilter.slice(1),
      onRemove: onClearMedia,
    });
  if (safetyFilter !== "safe")
    chips.push({ label: "All content (incl. NSFW)", onRemove: onClearSafety });
  if (!chips.length) return null;

  return (
    <View style={chipStyles.row}>
      {chips.map((c) => (
        <TouchableOpacity
          key={c.label}
          style={[
            chipStyles.chip,
            {
              backgroundColor: colors.primary + "20",
              borderColor: colors.primary + "40",
            },
          ]}
          onPress={c.onRemove}
          activeOpacity={0.8}
        >
          <Text style={[chipStyles.label, { color: colors.primary }]}>
            {c.label}
          </Text>
          <Ionicons name="close" size={13} color={colors.primary} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

const chipStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  label: { fontSize: 12, fontWeight: "700" },
});

function SuggestedUserRow({
  user: u,
  idx,
  colors,
  uiScale,
  fontScale,
  showBorder = true,
  onOpenMenu,
  onDismiss,
}: {
  user: SuggestedUser;
  idx: number;
  colors: any;
  uiScale: number;
  fontScale: number;
  showBorder?: boolean;
  onOpenMenu?: () => void;
  onDismiss?: () => void;
}) {
  const { follow, unfollow, isFollowingBusy } = useFollowActions(
    u.id,
    u.is_private,
  );
  const { data: status } = useFollowStatus(u.id);
  const isFollowing = status === "accepted" || status === "pending";
  const name = u.full_name || u.username || "User";
  const bio = (u as any).bio as string | undefined;

  return (
    <View
      style={[
        styles.row,
        {
          paddingHorizontal: 14 * uiScale,
          paddingVertical: 12 * uiScale,
          gap: 12 * uiScale,
        },
        showBorder &&
          idx !== 0 && [styles.rowBorder, { borderTopColor: colors.border }],
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.85}
        style={[styles.rowLeft, { gap: 12 * uiScale }]}
        onPress={() =>
          u.username ? router.push(`/user/${u.username}`) : undefined
        }
      >
        {u.avatar_url ? (
          <Image
            source={{ uri: u.avatar_url }}
            style={[
              styles.avatar,
              {
                backgroundColor: colors.surface,
                width: 42 * uiScale,
                height: 42 * uiScale,
                borderRadius: 21 * uiScale,
              },
            ]}
          />
        ) : (
          <View
            style={[
              styles.avatarPlaceholder,
              {
                backgroundColor: colors.surface,
                width: 42 * uiScale,
                height: 42 * uiScale,
                borderRadius: 21 * uiScale,
              },
            ]}
          >
            <Text
              style={[
                styles.avatarText,
                { color: colors.primary, fontSize: 16 * fontScale },
              ]}
            >
              {(name[0] || "U").toUpperCase()}
            </Text>
          </View>
        )}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={[
              styles.rowTitle,
              { color: colors.text, fontSize: 14.5 * fontScale },
            ]}
            numberOfLines={1}
          >
            {name}
          </Text>
          <Text
            style={[
              styles.rowSubtitle,
              { color: colors.textTertiary, fontSize: 12.5 * fontScale },
            ]}
            numberOfLines={1}
          >
            @{u.username || "user"}
            {u.follower_count > 0
              ? ` · ${u.follower_count.toLocaleString()} followers`
              : ""}
          </Text>
          {!!bio && (
            <Text
              style={[
                styles.rowBio,
                { color: colors.textTertiary, fontSize: 12 * fontScale },
              ]}
              numberOfLines={1}
            >
              {bio}
            </Text>
          )}
        </View>
      </TouchableOpacity>

      <View
        style={{
          flexDirection: "row",
          gap: 8 * uiScale,
          alignItems: "center",
        }}
      >
        {onDismiss && (
          <TouchableOpacity
            onPress={onDismiss}
            activeOpacity={0.85}
            style={[
              styles.menuBtn,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                width: 32 * uiScale,
                height: 32 * uiScale,
                borderRadius: 16 * uiScale,
              },
            ]}
          >
            <Ionicons name="close" size={16} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={() => (isFollowing ? unfollow() : follow())}
          disabled={isFollowingBusy}
          activeOpacity={0.85}
          style={[
            styles.followBtn,
            {
              backgroundColor: isFollowing ? colors.surface : colors.primary,
              borderColor: isFollowing ? colors.border : colors.primary,
              opacity: isFollowingBusy ? 0.6 : 1,
              paddingHorizontal: 16 * uiScale,
              paddingVertical: 8 * uiScale,
              minWidth: 88 * uiScale,
            },
          ]}
        >
          {isFollowingBusy ? (
            <ActivityIndicator
              size={12}
              color={isFollowing ? colors.text : "#fff"}
            />
          ) : (
            <Text
              style={[
                styles.followBtnText,
                {
                  color: isFollowing ? colors.text : "#fff",
                  fontSize: 13 * fontScale,
                },
              ]}
            >
              {status === "pending"
                ? "Requested"
                : isFollowing
                  ? "Following"
                  : "Follow"}
            </Text>
          )}
        </TouchableOpacity>

        {onOpenMenu && (
          <TouchableOpacity
            onPress={onOpenMenu}
            activeOpacity={0.85}
            style={[
              styles.menuBtn,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                width: 32 * uiScale,
                height: 32 * uiScale,
                borderRadius: 16 * uiScale,
              },
            ]}
          >
            <Ionicons
              name="ellipsis-horizontal"
              size={16}
              color={colors.text}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function GridCell({
  post,
  colors,
  allPostIds,
  index,
}: {
  post: DiscoveryPost;
  colors: any;
  allPostIds: string[];
  index: number;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={() =>
        router.push({
          pathname: "/post/viewer",
          params: {
            postIds: JSON.stringify(allPostIds),
            initialIndex: String(index),
          },
        } as any)
      }
      style={[styles.gridCell, { backgroundColor: colors.surface }]}
    >
      {post.is_video ? (
        <View style={styles.gridVideoOverlay}>
          <View style={styles.gridPlayBadge}>
            <Ionicons name="play" size={10} color="#fff" />
          </View>
        </View>
      ) : (
        <Image
          source={{ uri: post.media_url }}
          style={styles.gridImage}
          resizeMode="cover"
        />
      )}
    </TouchableOpacity>
  );
}

function DiscoveryGrid({
  posts,
  colors,
}: {
  posts: DiscoveryPost[];
  colors: any;
}) {
  const allPostIds = useMemo(() => posts.map((p) => p.id), [posts]);
  if (!posts.length) return null;
  const rows: DiscoveryPost[][] = [];
  for (let i = 0; i < posts.length; i += GRID_COLS) {
    rows.push(posts.slice(i, i + GRID_COLS));
  }
  return (
    <View style={styles.gridWrap}>
      {rows.map((row, ri) => (
        <View key={ri} style={styles.gridRow}>
          {row.map((post, ci) => (
            <GridCell
              key={post.id}
              post={post}
              colors={colors}
              allPostIds={allPostIds}
              index={ri * GRID_COLS + ci}
            />
          ))}
          {row.length < GRID_COLS &&
            Array(GRID_COLS - row.length)
              .fill(null)
              .map((_, i) => (
                <View
                  key={`spacer-${i}`}
                  style={[styles.gridCell, { backgroundColor: "transparent" }]}
                />
              ))}
        </View>
      ))}
    </View>
  );
}

function GridSkeleton({ colors }: { colors: any }) {
  return (
    <View style={styles.gridWrap}>
      {Array(3)
        .fill(null)
        .map((_, ri) => (
          <View key={ri} style={styles.gridRow}>
            {Array(GRID_COLS)
              .fill(null)
              .map((_, ci) => (
                <View
                  key={ci}
                  style={[
                    styles.gridCell,
                    { backgroundColor: colors.surface, opacity: 0.5 },
                  ]}
                />
              ))}
          </View>
        ))}
    </View>
  );
}

function EmptyState({
  icon,
  title,
  subtitle,
  colors,
  uiScale,
  fontScale,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  colors: any;
  uiScale: number;
  fontScale: number;
}) {
  return (
    <View
      style={[
        styles.emptyWrap,
        {
          backgroundColor: colors.card,
          borderRadius: 22 * uiScale,
          paddingVertical: 26 * uiScale,
          paddingHorizontal: 18 * uiScale,
        },
      ]}
    >
      <View
        style={[
          styles.emptyIconCircle,
          {
            backgroundColor: colors.surface,
            width: 56 * uiScale,
            height: 56 * uiScale,
            borderRadius: 28 * uiScale,
            marginBottom: 10 * uiScale,
          },
        ]}
      >
        <Ionicons name={icon} size={26} color={colors.primary} />
      </View>
      <Text
        style={[
          styles.emptyTitle,
          { color: colors.text, fontSize: 16 * fontScale },
        ]}
      >
        {title}
      </Text>
      <Text
        style={[
          styles.emptySubtitle,
          { color: colors.textTertiary, fontSize: 13 * fontScale },
        ]}
      >
        {subtitle}
      </Text>
    </View>
  );
}

function RecentSearchesPanel({
  recents,
  onSelect,
  onRemove,
  onClearAll,
  colors,
  isDark,
  uiScale,
  fontScale,
}: {
  recents: string[];
  onSelect: (term: string) => void;
  onRemove: (term: string) => void;
  onClearAll: () => void;
  colors: any;
  isDark: boolean;
  uiScale: number;
  fontScale: number;
}) {
  if (!recents.length) return null;
  return (
    <View
      style={[
        styles.recentPanel,
        {
          backgroundColor: colors.card,
          shadowOpacity: isDark ? 0.22 : 0.05,
          borderRadius: 22 * uiScale,
          paddingVertical: 6 * uiScale,
          marginTop: 10 * uiScale,
        },
      ]}
    >
      <View
        style={[
          styles.recentHeader,
          {
            paddingHorizontal: 14 * uiScale,
            paddingVertical: 10 * uiScale,
          },
        ]}
      >
        <Text
          style={[
            styles.recentTitle,
            { color: colors.text, fontSize: 13 * fontScale },
          ]}
        >
          Recent
        </Text>
        <TouchableOpacity onPress={onClearAll} activeOpacity={0.8}>
          <Text
            style={[
              styles.recentClear,
              { color: colors.primary, fontSize: 13 * fontScale },
            ]}
          >
            Clear all
          </Text>
        </TouchableOpacity>
      </View>
      {recents.map((term, idx) => (
        <TouchableOpacity
          key={term}
          activeOpacity={0.85}
          style={[
            styles.recentRow,
            {
              paddingHorizontal: 14 * uiScale,
              paddingVertical: 11 * uiScale,
              gap: 12 * uiScale,
            },
            idx !== 0 && [styles.rowBorder, { borderTopColor: colors.border }],
          ]}
          onPress={() => onSelect(term)}
        >
          <View
            style={[
              styles.recentIconCircle,
              {
                backgroundColor: colors.surface,
                width: 32 * uiScale,
                height: 32 * uiScale,
                borderRadius: 16 * uiScale,
              },
            ]}
          >
            <Ionicons
              name="time-outline"
              size={16}
              color={colors.textTertiary}
            />
          </View>
          <Text
            style={[
              styles.recentTerm,
              { color: colors.text, fontSize: 14 * fontScale },
            ]}
            numberOfLines={1}
          >
            {term}
          </Text>
          <TouchableOpacity
            onPress={() => onRemove(term)}
            hitSlop={10}
            activeOpacity={0.8}
            style={[
              styles.recentRemoveBtn,
              {
                backgroundColor: colors.surface,
                width: 28 * uiScale,
                height: 28 * uiScale,
                borderRadius: 14 * uiScale,
              },
            ]}
          >
            <Ionicons name="close" size={14} color={colors.textTertiary} />
          </TouchableOpacity>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function TrendingHashtagsCard({
  hashtags,
  colors,
  uiScale,
  fontScale,
}: {
  hashtags: TrendingHashtag[];
  colors: any;
  uiScale: number;
  fontScale: number;
}) {
  if (!hashtags.length) return null;
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          shadowOpacity: 0.05,
          borderRadius: 22 * uiScale,
          paddingVertical: 6 * uiScale,
        },
      ]}
    >
      {hashtags.slice(0, 5).map((h, idx) => (
        <TouchableOpacity
          key={h.tag}
          activeOpacity={0.85}
          style={[
            styles.trendRow,
            {
              paddingHorizontal: 14 * uiScale,
              paddingVertical: 12 * uiScale,
              gap: 14 * uiScale,
            },
            idx !== 0 && [styles.rowBorder, { borderTopColor: colors.border }],
          ]}
          onPress={() => router.push(`/hashtag/${h.tag}` as any)}
        >
          <Text
            style={[
              styles.trendRank,
              { color: colors.textTertiary, fontSize: 14 * fontScale },
            ]}
          >
            {idx + 1}
          </Text>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              style={[
                styles.trendLabel,
                { color: colors.textTertiary, fontSize: 11 * fontScale },
              ]}
            >
              Trending
            </Text>
            <Text
              style={[
                styles.trendTag,
                { color: colors.text, fontSize: 15 * fontScale },
              ]}
              numberOfLines={1}
            >
              #{h.tag}
            </Text>
            <Text
              style={[
                styles.trendCount,
                { color: colors.textTertiary, fontSize: 12 * fontScale },
              ]}
            >
              {h.post_count.toLocaleString()}{" "}
              {h.post_count === 1 ? "post" : "posts"}
            </Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark, uiScale, fontScale } = useTheme();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [activeCategory, setActiveCategory] = useState<ExploreCategory>("top");
  const [newsCategory, setNewsCategory] = useState<NewsCategory>("general");

  const [mediaFilter, setMediaFilter] = useState<MediaFilter>("all");
  const [safetyFilter, setSafetyFilter] = useState<SafetyFilter>("safe");
  const [showFilterModal, setShowFilterModal] = useState(false);

  const [selectedUser, setSelectedUser] = useState<SuggestedUser | null>(null);
  const actionsSheetRef = useRef<UserActionsSheetRef>(null);
  const inputRef = useRef<TextInput>(null);

  const [trendingPosts, setTrendingPosts] = useState<TrendingPost[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [trendingHashtags, setTrendingHashtags] = useState<TrendingHashtag[]>(
    [],
  );

  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);
  const [allSuggested, setAllSuggested] = useState<SuggestedUser[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [suggestedLoading, setSuggestedLoading] = useState(true);

  const [suggestedCommunities, setSuggestedCommunities] = useState<
    SearchCommunity[]
  >([]);
  const [suggestedCommunitiesLoading, setSuggestedCommunitiesLoading] =
    useState(true);

  const [discoveryPosts, setDiscoveryPosts] = useState<DiscoveryPost[]>([]);
  const [discoveryLoading, setDiscoveryLoading] = useState(true);

  const {
    recents,
    add: addRecent,
    remove: removeRecent,
    clear: clearRecents,
  } = useRecentSearches();

  const { data: isMuted } = useMuteStatus(selectedUser?.id ?? "");
  const muteMutation = useToggleMute(selectedUser?.id ?? "");

  const blockMutation = useMutation({
    mutationFn: async (targetId: string) => {
      if (!user?.uid) throw new Error("Not signed in");
      await firestore().collection("user_blocks").add({
        blocker_id: user.uid,
        blocked_id: targetId,
        created_at: new Date().toISOString(),
      });
      return targetId;
    },
    onSuccess: (targetId) => {
      invalidateAfterBlock(qc, user!.uid, targetId);
      setSelectedUser(null);
      actionsSheetRef.current?.close();
    },
    onError: (err) => Alert.alert("Error", String(err)),
  });

  const categories: { key: ExploreCategory; label: string }[] = [
    { key: "top", label: "Top" },
    { key: "latest", label: "Latest" },
    { key: "people", label: "People" },
    { key: "media", label: "Media" },
    { key: "community", label: "Communities" },
    { key: "news", label: "News" },
  ];

  const bottomPad = useMemo(
    () => getTabBarHeight(insets.bottom) + 12,
    [insets.bottom],
  );

  const gradientColors = isDark
    ? [colors.background, colors.background, colors.background]
    : ["#DCEBFF", "#EEF4FF", "#FFFFFF"];

  const clearSearch = () => setSearchQuery("");
  const onBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/home");
  };

  const commitSearch = useCallback(() => {
    const t = searchQuery.trim();
    if (t.length >= 2) void addRecent(t);
    Keyboard.dismiss();
    setIsSearchFocused(false);
  }, [searchQuery, addRecent]);

  const selectRecent = useCallback(
    (term: string) => {
      setSearchQuery(term);
      void addRecent(term);
      setIsSearchFocused(false);
      Keyboard.dismiss();
    },
    [addRecent],
  );

  const switchCategory = useCallback(
    (key: ExploreCategory) => {
      const t = searchQuery.trim();
      if (t.length >= 2) void addRecent(t);
      setActiveCategory(key);
    },
    [searchQuery, addRecent],
  );

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (mediaFilter !== "all") count++;
    if (safetyFilter !== "safe") count++;
    return count;
  }, [mediaFilter, safetyFilter]);

  useEffect(() => {
    setTrendingLoading(true);
    fetchTrendingPosts(20)
      .then(setTrendingPosts)
      .catch((e) => console.warn("fetchTrendingPosts failed:", e))
      .finally(() => setTrendingLoading(false));
  }, []);

  useEffect(() => {
    getTrendingHashtags(15)
      .then(setTrendingHashtags)
      .catch(() => {});
  }, []);

  useEffect(() => {
    setSuggestedLoading(true);
    fetchSuggestedUsers(20)
      .then((users) => {
        setAllSuggested(users);
        setSuggestedUsers(users.slice(0, 8));
      })
      .catch((e) => console.warn("fetchSuggestedUsers failed:", e))
      .finally(() => setSuggestedLoading(false));
  }, [user?.uid]);

  useEffect(() => {
    setSuggestedCommunitiesLoading(true);
    fetchSuggestedCommunities(5)
      .then(setSuggestedCommunities)
      .catch(() => {})
      .finally(() => setSuggestedCommunitiesLoading(false));
  }, [user?.uid]);

  const handleDismissSuggested = useCallback(
    (id: string) => {
      setDismissedIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
      setSuggestedUsers((prev) => {
        const filtered = prev.filter((u) => u.id !== id);
        const shownIds = new Set(filtered.map((u) => u.id));
        const replacement = allSuggested.find(
          (u) => !shownIds.has(u.id) && u.id !== id && !dismissedIds.has(u.id),
        );
        return replacement ? [...filtered, replacement] : filtered;
      });
    },
    [allSuggested, dismissedIds],
  );

  useEffect(() => {
    setDiscoveryLoading(true);
    fetchDiscoveryPosts(60)
      .then(setDiscoveryPosts)
      .catch((e) => console.warn("fetchDiscoveryPosts failed:", e))
      .finally(() => setDiscoveryLoading(false));
  }, []);

  const filteredDiscoveryPosts = useMemo(() => {
    let posts = discoveryPosts;
    if (safetyFilter === "safe")
      posts = posts.filter((p) => !(p as any).is_nsfw);
    if (mediaFilter === "videos")
      posts = posts.filter((p) => p.is_video || isVideoUrl(p.media_url));
    else if (mediaFilter === "images")
      posts = posts.filter((p) => !p.is_video && isImageUrl(p.media_url));
    else if (mediaFilter === "gifs")
      posts = posts.filter((p) => isGifUrl(p.media_url));
    return posts;
  }, [discoveryPosts, mediaFilter, safetyFilter]);

  const searchType = useMemo(() => {
    if (activeCategory === "people") return "account";
    if (activeCategory === "latest") return "post";
    if (activeCategory === "media") return "post";
    if (activeCategory === "top") return "top";
    if (activeCategory === "community") return "community";
    return "top";
  }, [activeCategory]);

  const { data, isSearching, isIdle } = useSearch({
    type: (searchType ?? "top") as any,
    query: searchQuery,
    minChars: 2,
    limit: 20,
    debounceMs: 350,
    mediaType:
      activeCategory === "media" || activeCategory === "latest"
        ? mediaFilter
        : "all",
    mediaOnly: activeCategory === "media",
  });

  const accounts = (data as any)?.accounts ?? [];
  const posts = (data as any)?.posts ?? [];
  const communities = (data as any)?.communities ?? [];

  const { data: newsArticles, isLoading: newsLoading } = useNews(
    newsCategory,
    20,
  );

  const filteredPosts = useMemo(() => {
    let p = posts;
    if (safetyFilter === "safe") p = p.filter((post: any) => !post.is_nsfw);
    if (mediaFilter === "images")
      p = p.filter((post: any) =>
        post.media_urls?.some((u: string) => isImageUrl(u)),
      );
    if (mediaFilter === "videos")
      p = p.filter((post: any) =>
        post.media_urls?.some((u: string) => isVideoUrl(u)),
      );
    if (mediaFilter === "gifs")
      p = p.filter((post: any) =>
        post.media_urls?.some((u: string) => isGifUrl(u)),
      );
    return p;
  }, [posts, mediaFilter, safetyFilter]);

  const showRecents =
    isSearchFocused && !searchQuery.trim() && recents.length > 0;

  const filtersApplicable =
    activeCategory === "top" ||
    activeCategory === "latest" ||
    activeCategory === "media";

  return (
    <>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        translucent
        backgroundColor="transparent"
      />

      <LinearGradient
        colors={gradientColors as any}
        locations={[0, 0.42, 1]}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
          <AppHeader
            backgroundColor="transparent"
            title=""
            leftWide={
              <View style={[styles.headerLeftWide, { gap: 8 * uiScale }]}>
                <TouchableOpacity
                  style={[
                    styles.backCircle,
                    {
                      backgroundColor: colors.card,
                      shadowOpacity: isDark ? 0.22 : 0.08,
                      width: 38 * uiScale,
                      height: 38 * uiScale,
                      borderRadius: 19 * uiScale,
                    },
                  ]}
                  onPress={onBack}
                  activeOpacity={0.85}
                >
                  <Ionicons name="arrow-back" size={22} color={colors.text} />
                </TouchableOpacity>

                <View
                  style={[
                    styles.searchBar,
                    {
                      backgroundColor: colors.card,
                      shadowOpacity: isDark ? 0.18 : 0.06,
                      height: 44 * uiScale,
                      borderRadius: 22 * uiScale,
                      paddingHorizontal: 14 * uiScale,
                      gap: 10 * uiScale,
                    },
                  ]}
                >
                  <Ionicons
                    name="search"
                    size={18}
                    color={colors.textTertiary}
                  />
                  <TextInput
                    ref={inputRef}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => {
                      setTimeout(() => setIsSearchFocused(false), 150);
                    }}
                    onSubmitEditing={commitSearch}
                    placeholder="Search NebulaNet"
                    placeholderTextColor={colors.textTertiary}
                    style={[
                      styles.searchInput,
                      { color: colors.text, fontSize: 15 * fontScale },
                    ]}
                    returnKeyType="search"
                    autoCorrect={false}
                    autoCapitalize="none"
                  />
                  {!!searchQuery.trim() && (
                    <TouchableOpacity
                      onPress={clearSearch}
                      activeOpacity={0.85}
                      style={[
                        styles.clearBtn,
                        {
                          backgroundColor: colors.surface,
                          width: 34 * uiScale,
                          height: 34 * uiScale,
                          borderRadius: 17 * uiScale,
                        },
                      ]}
                    >
                      <Ionicons
                        name="close"
                        size={18}
                        color={colors.textTertiary}
                      />
                    </TouchableOpacity>
                  )}
                </View>

                <TouchableOpacity
                  style={[
                    styles.filterBtn,
                    {
                      backgroundColor:
                        activeFilterCount > 0 ? colors.primary : colors.card,
                      shadowOpacity: isDark ? 0.22 : 0.08,
                      width: 38 * uiScale,
                      height: 38 * uiScale,
                      borderRadius: 19 * uiScale,
                    },
                  ]}
                  onPress={() => setShowFilterModal(true)}
                  activeOpacity={0.85}
                >
                  <Ionicons
                    name="options-outline"
                    size={20}
                    color={activeFilterCount > 0 ? "#fff" : colors.text}
                  />
                  {activeFilterCount > 0 && (
                    <View
                      style={[
                        styles.filterBadge,
                        {
                          width: 16 * uiScale,
                          height: 16 * uiScale,
                          borderRadius: 8 * uiScale,
                          top: 6 * uiScale,
                          right: 6 * uiScale,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.filterBadgeText,
                          { fontSize: 9 * fontScale },
                        ]}
                      >
                        {activeFilterCount}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            }
          />

          <View
            style={[
              styles.tabBar,
              {
                borderBottomColor: colors.border,
                marginHorizontal: 18 * uiScale,
              },
            ]}
          >
            {categories.map((c) => {
              const isActive = activeCategory === c.key;
              return (
                <TouchableOpacity
                  key={c.key}
                  onPress={() => switchCategory(c.key)}
                  activeOpacity={0.7}
                  style={[styles.tabItem, { paddingVertical: 13 * uiScale }]}
                >
                  <Text
                    style={[
                      styles.tabText,
                      {
                        color: isActive ? colors.text : colors.textTertiary,
                        fontSize: 13.5 * fontScale,
                      },
                      isActive && styles.tabTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {c.label}
                  </Text>
                  {isActive && (
                    <View
                      style={[
                        styles.tabUnderline,
                        { backgroundColor: colors.primary },
                      ]}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {filtersApplicable && activeFilterCount > 0 && (
            <ActiveFilterChips
              mediaFilter={mediaFilter}
              safetyFilter={safetyFilter}
              onClearMedia={() => setMediaFilter("all")}
              onClearSafety={() => setSafetyFilter("safe")}
              colors={colors}
            />
          )}

          {showRecents && (
            <View
              style={[
                styles.recentOverlay,
                { paddingHorizontal: 18 * uiScale },
              ]}
            >
              <RecentSearchesPanel
                recents={recents}
                onSelect={selectRecent}
                onRemove={(t) => void removeRecent(t)}
                onClearAll={() => void clearRecents()}
                colors={colors}
                isDark={isDark}
                uiScale={uiScale}
                fontScale={fontScale}
              />
            </View>
          )}

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onScrollBeginDrag={Keyboard.dismiss}
            contentContainerStyle={[
              styles.content,
              {
                paddingBottom: bottomPad,
                paddingHorizontal: 18 * uiScale,
                paddingTop: 14 * uiScale,
              },
            ]}
          >
            {activeCategory === "top" && (
              <>
                <Text
                  style={[
                    styles.sectionTitle,
                    { color: colors.text, fontSize: 16 * fontScale },
                  ]}
                >
                  What's happening
                </Text>
                <TrendingHashtagsCard
                  hashtags={trendingHashtags}
                  colors={colors}
                  uiScale={uiScale}
                  fontScale={fontScale}
                />

                <Text
                  style={[
                    styles.sectionTitle,
                    {
                      color: colors.text,
                      marginTop: 20,
                      fontSize: 16 * fontScale,
                    },
                  ]}
                >
                  Top Posts
                </Text>

                {trendingLoading ? (
                  <View style={{ gap: 10 }}>
                    {Array(4)
                      .fill(null)
                      .map((_, i) => (
                        <PostSearchSkeleton key={i} />
                      ))}
                  </View>
                ) : trendingPosts.length > 0 ? (
                  <View style={{ gap: 12 }}>
                    {trendingPosts.map((p) => {
                      const author =
                        p.user?.full_name || p.user?.username || "User";
                      const hasMedia = !!p.media_url;
                      const clean = (p.media_url || "")
                        .split("?")[0]
                        .toLowerCase();
                      const isVideo = [
                        "mp4",
                        "mov",
                        "m4v",
                        "webm",
                        "mkv",
                        "avi",
                      ].some((e) => clean.endsWith(`.${e}`));
                      const isImage = !isVideo && hasMedia;

                      return (
                        <TouchableOpacity
                          key={p.id}
                          activeOpacity={0.9}
                          style={[
                            styles.postCard,
                            {
                              backgroundColor: colors.card,
                              shadowOpacity: isDark ? 0.22 : 0.05,
                              borderRadius: 22 * uiScale,
                              padding: 14 * uiScale,
                            },
                          ]}
                          onPress={() => router.push(`/post/${p.id}` as any)}
                        >
                          <View
                            style={[
                              styles.postTop,
                              { marginBottom: 8 * uiScale },
                            ]}
                          >
                            <View
                              style={[
                                styles.postAuthorRow,
                                { gap: 10 * uiScale },
                              ]}
                            >
                              {p.user?.avatar_url ? (
                                <Image
                                  source={{ uri: p.user.avatar_url }}
                                  style={[
                                    styles.postAvatar,
                                    {
                                      backgroundColor: colors.surface,
                                      width: 34 * uiScale,
                                      height: 34 * uiScale,
                                      borderRadius: 17 * uiScale,
                                    },
                                  ]}
                                />
                              ) : (
                                <View
                                  style={[
                                    styles.postAvatarPlaceholder,
                                    {
                                      backgroundColor: colors.surface,
                                      width: 34 * uiScale,
                                      height: 34 * uiScale,
                                      borderRadius: 17 * uiScale,
                                    },
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.avatarText,
                                      {
                                        color: colors.primary,
                                        fontSize: 13 * fontScale,
                                      },
                                    ]}
                                  >
                                    {(author[0] || "U").toUpperCase()}
                                  </Text>
                                </View>
                              )}
                              <View style={{ flex: 1, minWidth: 0 }}>
                                <Text
                                  style={[
                                    styles.postAuthor,
                                    {
                                      color: colors.text,
                                      fontSize: 14 * fontScale,
                                    },
                                  ]}
                                  numberOfLines={1}
                                >
                                  {author}
                                </Text>
                                {p.user?.username && (
                                  <Text
                                    style={[
                                      styles.postHandle,
                                      {
                                        color: colors.textTertiary,
                                        fontSize: 12 * fontScale,
                                      },
                                    ]}
                                    numberOfLines={1}
                                  >
                                    @{p.user.username}
                                  </Text>
                                )}
                              </View>
                            </View>
                            <Ionicons
                              name="chevron-forward"
                              size={16}
                              color={colors.textTertiary}
                            />
                          </View>

                          {!!p.content && (
                            <Text
                              style={[
                                styles.postContent,
                                {
                                  color: colors.text,
                                  fontSize: 13.5 * fontScale,
                                },
                              ]}
                              numberOfLines={3}
                            >
                              {p.content}
                            </Text>
                          )}

                          {hasMedia && (
                            <View
                              style={[
                                styles.thumbWrap,
                                {
                                  backgroundColor: colors.surface,
                                  marginTop: 10 * uiScale,
                                  height: 160 * uiScale,
                                  borderRadius: 18 * uiScale,
                                },
                              ]}
                            >
                              {isImage ? (
                                <Image
                                  source={{ uri: p.media_url! }}
                                  style={styles.thumb}
                                  resizeMode="cover"
                                />
                              ) : (
                                <View style={styles.videoThumbInner}>
                                  <Ionicons
                                    name="videocam"
                                    size={18}
                                    color="#fff"
                                  />
                                  <Text
                                    style={[
                                      styles.videoLabel,
                                      { fontSize: 12 * fontScale },
                                    ]}
                                  >
                                    Video
                                  </Text>
                                  <View style={styles.playCircle}>
                                    <Ionicons
                                      name="play"
                                      size={18}
                                      color="#fff"
                                    />
                                  </View>
                                </View>
                              )}
                            </View>
                          )}

                          <View
                            style={[
                              styles.postStats,
                              { gap: 14 * uiScale, marginTop: 10 * uiScale },
                            ]}
                          >
                            <View
                              style={[styles.postStat, { gap: 4 * uiScale }]}
                            >
                              <Ionicons
                                name="heart"
                                size={13}
                                color="#FF375F"
                              />
                              <Text
                                style={[
                                  styles.postStatText,
                                  {
                                    color: colors.textTertiary,
                                    fontSize: 12 * fontScale,
                                  },
                                ]}
                              >
                                {(p.like_count ?? 0).toLocaleString()}
                              </Text>
                            </View>
                            <View
                              style={[styles.postStat, { gap: 4 * uiScale }]}
                            >
                              <Ionicons
                                name="chatbubble-outline"
                                size={13}
                                color={colors.textTertiary}
                              />
                              <Text
                                style={[
                                  styles.postStatText,
                                  {
                                    color: colors.textTertiary,
                                    fontSize: 12 * fontScale,
                                  },
                                ]}
                              >
                                {(p.comment_count ?? 0).toLocaleString()}
                              </Text>
                            </View>
                            <View
                              style={[styles.postStat, { gap: 4 * uiScale }]}
                            >
                              <Ionicons
                                name="repeat-outline"
                                size={13}
                                color={colors.textTertiary}
                              />
                              <Text
                                style={[
                                  styles.postStatText,
                                  {
                                    color: colors.textTertiary,
                                    fontSize: 12 * fontScale,
                                  },
                                ]}
                              >
                                {(p.repost_count ?? 0).toLocaleString()}
                              </Text>
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : (
                  <EmptyState
                    colors={colors}
                    uiScale={uiScale}
                    fontScale={fontScale}
                    icon="trending-up-outline"
                    title="Nothing trending yet"
                    subtitle="Posts with the most likes, comments and reposts will appear here."
                  />
                )}

                <Text
                  style={[
                    styles.sectionTitle,
                    {
                      color: colors.text,
                      marginTop: 20,
                      fontSize: 16 * fontScale,
                    },
                  ]}
                >
                  Who to follow
                </Text>

                {suggestedLoading ? (
                  <View
                    style={[
                      styles.card,
                      {
                        backgroundColor: colors.card,
                        shadowOpacity: isDark ? 0.22 : 0.05,
                        borderRadius: 22 * uiScale,
                        paddingVertical: 6 * uiScale,
                      },
                    ]}
                  >
                    {Array(3)
                      .fill(null)
                      .map((_, i) => (
                        <View
                          key={i}
                          style={
                            i !== 0
                              ? [
                                  styles.rowBorder,
                                  { borderTopColor: colors.border },
                                ]
                              : undefined
                          }
                        >
                          <SearchRowSkeleton />
                        </View>
                      ))}
                  </View>
                ) : suggestedUsers.length > 0 ? (
                  <View
                    style={[
                      styles.card,
                      {
                        backgroundColor: colors.card,
                        shadowOpacity: isDark ? 0.22 : 0.05,
                        borderRadius: 22 * uiScale,
                        paddingVertical: 6 * uiScale,
                      },
                    ]}
                  >
                    {suggestedUsers.slice(0, 4).map((u, idx) => (
                      <SuggestedUserRow
                        key={u.id}
                        user={u}
                        idx={idx}
                        colors={colors}
                        uiScale={uiScale}
                        fontScale={fontScale}
                        onDismiss={() => handleDismissSuggested(u.id)}
                        onOpenMenu={() => {
                          setSelectedUser(u);
                          actionsSheetRef.current?.snapToIndex(0);
                        }}
                      />
                    ))}
                  </View>
                ) : null}

                <Text
                  style={[
                    styles.sectionTitle,
                    {
                      color: colors.text,
                      marginTop: 20,
                      fontSize: 16 * fontScale,
                    },
                  ]}
                >
                  Communities you might like
                </Text>

                {suggestedCommunitiesLoading ? (
                  <View
                    style={[
                      styles.card,
                      {
                        backgroundColor: colors.card,
                        shadowOpacity: isDark ? 0.22 : 0.05,
                        borderRadius: 22 * uiScale,
                        paddingVertical: 6 * uiScale,
                      },
                    ]}
                  >
                    {Array(3)
                      .fill(null)
                      .map((_, i) => (
                        <View
                          key={i}
                          style={
                            i !== 0
                              ? [
                                  styles.rowBorder,
                                  { borderTopColor: colors.border },
                                ]
                              : undefined
                          }
                        >
                          <SearchRowSkeleton />
                        </View>
                      ))}
                  </View>
                ) : suggestedCommunities.length > 0 ? (
                  <View
                    style={[
                      styles.card,
                      {
                        backgroundColor: colors.card,
                        shadowOpacity: isDark ? 0.22 : 0.05,
                        borderRadius: 22 * uiScale,
                        paddingVertical: 6 * uiScale,
                      },
                    ]}
                  >
                    {suggestedCommunities.map((c, idx) => (
                      <CommunityRow
                        key={c.id}
                        community={c}
                        idx={idx}
                        colors={colors}
                      />
                    ))}
                  </View>
                ) : null}

                <Text
                  style={[
                    styles.sectionTitle,
                    {
                      color: colors.text,
                      marginTop: 20,
                      fontSize: 16 * fontScale,
                    },
                  ]}
                >
                  Discover
                </Text>

                {discoveryLoading ? (
                  <GridSkeleton colors={colors} />
                ) : filteredDiscoveryPosts.length > 0 ? (
                  <DiscoveryGrid
                    posts={filteredDiscoveryPosts}
                    colors={colors}
                  />
                ) : (
                  <EmptyState
                    colors={colors}
                    uiScale={uiScale}
                    fontScale={fontScale}
                    icon="images-outline"
                    title="No posts match your filters"
                    subtitle="Try changing or clearing your filters."
                  />
                )}
              </>
            )}

            {activeCategory === "people" && (
              <>
                {isSearching && !isIdle ? (
                  <View
                    style={[
                      styles.card,
                      {
                        backgroundColor: colors.card,
                        shadowOpacity: isDark ? 0.22 : 0.05,
                      },
                    ]}
                  >
                    {Array(5)
                      .fill(null)
                      .map((_, i) => (
                        <View
                          key={i}
                          style={
                            i !== 0
                              ? [
                                  styles.rowBorder,
                                  { borderTopColor: colors.border },
                                ]
                              : undefined
                          }
                        >
                          <SearchRowSkeleton />
                        </View>
                      ))}
                  </View>
                ) : isIdle ? (
                  suggestedUsers.length > 0 ? (
                    <View
                      style={[
                        styles.card,
                        {
                          backgroundColor: colors.card,
                          shadowOpacity: isDark ? 0.22 : 0.05,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.sectionTitle,
                          {
                            color: colors.text,
                            paddingHorizontal: 14,
                            paddingTop: 10,
                          },
                        ]}
                      >
                        Who to follow
                      </Text>
                      {suggestedUsers.slice(0, 5).map((u, idx) => (
                        <SuggestedUserRow
                          key={u.id}
                          user={u}
                          idx={idx}
                          colors={colors}
                          uiScale={uiScale}
                          fontScale={fontScale}
                          onDismiss={() => handleDismissSuggested(u.id)}
                          onOpenMenu={() => {
                            setSelectedUser(u);
                            actionsSheetRef.current?.snapToIndex(0);
                          }}
                        />
                      ))}
                    </View>
                  ) : (
                    <EmptyState
                      colors={colors}
                      uiScale={uiScale}
                      fontScale={fontScale}
                      icon="people-outline"
                      title="Find people to follow"
                      subtitle="Type at least 2 characters to search accounts."
                    />
                  )
                ) : accounts.length > 0 ? (
                  <View
                    style={[
                      styles.card,
                      {
                        backgroundColor: colors.card,
                        shadowOpacity: isDark ? 0.22 : 0.05,
                      },
                    ]}
                  >
                    {accounts.map((a: any, idx: number) => (
                      <SuggestedUserRow
                        key={a.id}
                        user={{
                          id: a.id,
                          username: a.username,
                          full_name: a.full_name,
                          avatar_url: a.avatar_url,
                          follower_count: a.follower_count ?? 0,
                          is_private: !!a.is_private,
                        }}
                        idx={idx}
                        colors={colors}
                        uiScale={uiScale}
                        fontScale={fontScale}
                        onOpenMenu={() => {
                          setSelectedUser({
                            id: a.id,
                            username: a.username,
                            full_name: a.full_name,
                            avatar_url: a.avatar_url,
                            follower_count: a.follower_count ?? 0,
                            is_private: !!a.is_private,
                          });
                          actionsSheetRef.current?.snapToIndex(0);
                        }}
                      />
                    ))}
                  </View>
                ) : (
                  <EmptyState
                    colors={colors}
                    uiScale={uiScale}
                    fontScale={fontScale}
                    icon="people-outline"
                    title="No matches"
                    subtitle="Try a different name or username."
                  />
                )}
              </>
            )}

            {activeCategory === "latest" && (
              <>
                {isSearching && !isIdle ? (
                  <View style={{ gap: 10 }}>
                    {Array(4)
                      .fill(null)
                      .map((_, i) => (
                        <PostSearchSkeleton key={i} />
                      ))}
                  </View>
                ) : isIdle ? (
                  <EmptyState
                    colors={colors}
                    uiScale={uiScale}
                    fontScale={fontScale}
                    icon="search-outline"
                    title="Start typing"
                    subtitle="Type at least 2 characters to search posts."
                  />
                ) : filteredPosts.length > 0 ? (
                  <View style={{ gap: 12 }}>
                    {filteredPosts.map((p: any) => {
                      const author =
                        p.user?.full_name || p.user?.username || "User";
                      const first = p.media_urls?.[0] ?? null;
                      const hasImage = isImageUrl(first);
                      const hasVideo = isVideoUrl(first);

                      return (
                        <TouchableOpacity
                          key={p.id}
                          activeOpacity={0.9}
                          style={[
                            styles.postCard,
                            {
                              backgroundColor: colors.card,
                              shadowOpacity: isDark ? 0.22 : 0.05,
                            },
                          ]}
                          onPress={() => router.push(`/post/${p.id}`)}
                        >
                          {p.is_nsfw && (
                            <View
                              style={[
                                styles.nsfwBadge,
                                {
                                  backgroundColor: "#EF444420",
                                  borderColor: "#EF444440",
                                },
                              ]}
                            >
                              <Text style={styles.nsfwText}>NSFW</Text>
                            </View>
                          )}

                          <View style={styles.postTop}>
                            <View style={styles.postAuthorRow}>
                              {p.user?.avatar_url ? (
                                <Image
                                  source={{ uri: p.user.avatar_url }}
                                  style={[
                                    styles.postAvatar,
                                    { backgroundColor: colors.surface },
                                  ]}
                                />
                              ) : (
                                <View
                                  style={[
                                    styles.postAvatarPlaceholder,
                                    { backgroundColor: colors.surface },
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.avatarText,
                                      { color: colors.primary, fontSize: 13 },
                                    ]}
                                  >
                                    {(author[0] || "U").toUpperCase()}
                                  </Text>
                                </View>
                              )}
                              <View style={{ flex: 1, minWidth: 0 }}>
                                <Text
                                  style={[
                                    styles.postAuthor,
                                    { color: colors.text },
                                  ]}
                                  numberOfLines={1}
                                >
                                  {author}
                                </Text>
                                {p.user?.username && (
                                  <Text
                                    style={[
                                      styles.postHandle,
                                      { color: colors.textTertiary },
                                    ]}
                                    numberOfLines={1}
                                  >
                                    @{p.user.username}
                                  </Text>
                                )}
                              </View>
                            </View>
                            <Ionicons
                              name="chevron-forward"
                              size={16}
                              color={colors.textTertiary}
                            />
                          </View>

                          {!!p.content && (
                            <Text
                              style={[
                                styles.postContent,
                                { color: colors.text },
                              ]}
                              numberOfLines={3}
                            >
                              {p.content}
                            </Text>
                          )}

                          {(hasImage || hasVideo) && (
                            <View
                              style={[
                                styles.thumbWrap,
                                { backgroundColor: colors.surface },
                              ]}
                            >
                              {hasImage ? (
                                <Image
                                  source={{ uri: first! }}
                                  style={styles.thumb}
                                  resizeMode="cover"
                                />
                              ) : (
                                <View style={styles.videoThumbInner}>
                                  <Ionicons
                                    name="videocam"
                                    size={18}
                                    color="#fff"
                                  />
                                  <Text style={styles.videoLabel}>Video</Text>
                                  <View style={styles.playCircle}>
                                    <Ionicons
                                      name="play"
                                      size={18}
                                      color="#fff"
                                    />
                                  </View>
                                </View>
                              )}
                            </View>
                          )}

                          <View style={styles.postStats}>
                            {typeof p.like_count === "number" && (
                              <View style={styles.postStat}>
                                <Ionicons
                                  name="heart"
                                  size={13}
                                  color="#FF375F"
                                />
                                <Text
                                  style={[
                                    styles.postStatText,
                                    { color: colors.textTertiary },
                                  ]}
                                >
                                  {p.like_count.toLocaleString()}
                                </Text>
                              </View>
                            )}
                            {typeof p.comment_count === "number" && (
                              <View style={styles.postStat}>
                                <Ionicons
                                  name="chatbubble-outline"
                                  size={13}
                                  color={colors.textTertiary}
                                />
                                <Text
                                  style={[
                                    styles.postStatText,
                                    { color: colors.textTertiary },
                                  ]}
                                >
                                  {p.comment_count.toLocaleString()}
                                </Text>
                              </View>
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : (
                  <EmptyState
                    colors={colors}
                    uiScale={uiScale}
                    fontScale={fontScale}
                    icon="document-text-outline"
                    title="No matches"
                    subtitle={
                      activeFilterCount > 0
                        ? "Try changing or clearing your filters."
                        : "Try a different keyword."
                    }
                  />
                )}
              </>
            )}

            {activeCategory === "media" && (
              <>
                {isSearching && !isIdle ? (
                  <GridSkeleton colors={colors} />
                ) : isIdle ? (
                  <EmptyState
                    colors={colors}
                    uiScale={uiScale}
                    fontScale={fontScale}
                    icon="search-outline"
                    title="Start typing"
                    subtitle="Search for posts with photos and videos."
                  />
                ) : filteredPosts.filter((p: any) => p.media_urls?.length > 0)
                    .length > 0 ? (
                  <DiscoveryGrid
                    posts={filteredPosts
                      .filter((p: any) => p.media_urls?.[0])
                      .map((p: any) => ({
                        id: p.id,
                        media_url: p.media_urls[0],
                        is_video: isVideoUrl(p.media_urls[0]),
                      }))}
                    colors={colors}
                  />
                ) : (
                  <EmptyState
                    colors={colors}
                    uiScale={uiScale}
                    fontScale={fontScale}
                    icon="images-outline"
                    title="No media found"
                    subtitle="Try a different search term."
                  />
                )}
              </>
            )}

            {activeCategory === "community" && (
              <>
                {isSearching && !isIdle ? (
                  <View
                    style={[
                      styles.card,
                      {
                        backgroundColor: colors.card,
                        shadowOpacity: isDark ? 0.22 : 0.05,
                      },
                    ]}
                  >
                    {Array(4)
                      .fill(null)
                      .map((_, i) => (
                        <View
                          key={i}
                          style={
                            i !== 0
                              ? [
                                  styles.rowBorder,
                                  { borderTopColor: colors.border },
                                ]
                              : undefined
                          }
                        >
                          <SearchRowSkeleton />
                        </View>
                      ))}
                  </View>
                ) : isIdle ? (
                  suggestedCommunities.length > 0 ? (
                    <View
                      style={[
                        styles.card,
                        {
                          backgroundColor: colors.card,
                          shadowOpacity: isDark ? 0.22 : 0.05,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.sectionTitle,
                          {
                            color: colors.text,
                            paddingHorizontal: 14,
                            paddingTop: 10,
                          },
                        ]}
                      >
                        Communities you might like
                      </Text>
                      {suggestedCommunities.map((c, idx) => (
                        <CommunityRow
                          key={c.id}
                          community={c}
                          idx={idx}
                          colors={colors}
                        />
                      ))}
                    </View>
                  ) : (
                    <EmptyState
                      colors={colors}
                      uiScale={uiScale}
                      fontScale={fontScale}
                      icon="people-circle-outline"
                      title="Discover communities"
                      subtitle="Type at least 2 characters to search communities."
                    />
                  )
                ) : communities.length > 0 ? (
                  <View
                    style={[
                      styles.card,
                      {
                        backgroundColor: colors.card,
                        shadowOpacity: isDark ? 0.22 : 0.05,
                      },
                    ]}
                  >
                    {communities.map((c: any, idx: number) => (
                      <CommunityRow
                        key={c.id}
                        community={c}
                        idx={idx}
                        colors={colors}
                      />
                    ))}
                  </View>
                ) : (
                  <EmptyState
                    colors={colors}
                    uiScale={uiScale}
                    fontScale={fontScale}
                    icon="people-circle-outline"
                    title="No matches"
                    subtitle="Try a different keyword."
                  />
                )}
              </>
            )}

            {activeCategory === "news" && (
              <>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.newsCategoryRow}
                  keyboardShouldPersistTaps="handled"
                >
                  {NEWS_CATEGORIES.map((c) => {
                    const isActive = newsCategory === c.key;
                    return (
                      <TouchableOpacity
                        key={c.key}
                        onPress={() => setNewsCategory(c.key)}
                        activeOpacity={0.85}
                        style={[
                          styles.newsCategoryPill,
                          {
                            backgroundColor: isActive
                              ? colors.primary
                              : colors.card,
                            borderColor: isActive
                              ? colors.primary
                              : colors.border,
                            paddingHorizontal: 14 * uiScale,
                            paddingVertical: 8 * uiScale,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.newsCategoryPillText,
                            {
                              color: isActive ? "#fff" : colors.text,
                              fontSize: 13 * fontScale,
                            },
                          ]}
                        >
                          {c.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {newsLoading ? (
                  <View style={{ gap: 10, marginTop: 14 }}>
                    {Array(5)
                      .fill(null)
                      .map((_, i) => (
                        <PostSearchSkeleton key={i} />
                      ))}
                  </View>
                ) : newsArticles && newsArticles.length > 0 ? (
                  <View style={{ marginTop: 14 }}>
                    <TouchableOpacity
                      activeOpacity={0.9}
                      style={[
                        styles.newsHeroCard,
                        {
                          backgroundColor: colors.card,
                          shadowOpacity: isDark ? 0.22 : 0.05,
                          borderRadius: 22 * uiScale,
                        },
                      ]}
                      onPress={() =>
                        WebBrowser.openBrowserAsync(newsArticles[0].url)
                      }
                    >
                      {newsArticles[0].image && (
                        <Image
                          source={{ uri: newsArticles[0].image }}
                          style={[
                            styles.newsHeroImage,
                            { height: 180 * uiScale },
                          ]}
                          resizeMode="cover"
                        />
                      )}
                      <View
                        style={[styles.newsHeroBody, { padding: 14 * uiScale }]}
                      >
                        <Text
                          style={[
                            styles.newsHeroTitle,
                            { color: colors.text, fontSize: 17 * fontScale },
                          ]}
                          numberOfLines={3}
                        >
                          {newsArticles[0].title}
                        </Text>
                        {!!newsArticles[0].author && (
                          <Text
                            style={[
                              styles.newsSource,
                              {
                                color: colors.textTertiary,
                                fontSize: 12 * fontScale,
                              },
                            ]}
                            numberOfLines={1}
                          >
                            {newsArticles[0].author}
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>

                    <View
                      style={[
                        styles.card,
                        {
                          backgroundColor: colors.card,
                          shadowOpacity: isDark ? 0.22 : 0.05,
                          marginTop: 12,
                          borderRadius: 22 * uiScale,
                          paddingVertical: 6 * uiScale,
                        },
                      ]}
                    >
                      {newsArticles
                        .slice(1)
                        .map((a: NewsArticle, idx: number) => (
                          <TouchableOpacity
                            key={a.id}
                            activeOpacity={0.85}
                            style={[
                              styles.newsRow,
                              {
                                paddingHorizontal: 14 * uiScale,
                                paddingVertical: 12 * uiScale,
                                gap: 12 * uiScale,
                              },
                              idx !== 0 && [
                                styles.rowBorder,
                                { borderTopColor: colors.border },
                              ],
                            ]}
                            onPress={() => WebBrowser.openBrowserAsync(a.url)}
                          >
                            <View style={{ flex: 1, minWidth: 0 }}>
                              <Text
                                style={[
                                  styles.newsRowTitle,
                                  {
                                    color: colors.text,
                                    fontSize: 14 * fontScale,
                                  },
                                ]}
                                numberOfLines={2}
                              >
                                {a.title}
                              </Text>
                              {!!a.author && (
                                <Text
                                  style={[
                                    styles.newsSource,
                                    {
                                      color: colors.textTertiary,
                                      fontSize: 12 * fontScale,
                                    },
                                  ]}
                                  numberOfLines={1}
                                >
                                  {a.author}
                                </Text>
                              )}
                            </View>
                            {a.image && (
                              <Image
                                source={{ uri: a.image }}
                                style={[
                                  styles.newsRowImage,
                                  {
                                    width: 64 * uiScale,
                                    height: 64 * uiScale,
                                    borderRadius: 12 * uiScale,
                                  },
                                ]}
                                resizeMode="cover"
                              />
                            )}
                          </TouchableOpacity>
                        ))}
                    </View>
                  </View>
                ) : (
                  <EmptyState
                    colors={colors}
                    uiScale={uiScale}
                    fontScale={fontScale}
                    icon="newspaper-outline"
                    title="No news yet"
                    subtitle="Check back soon — this category will populate shortly."
                  />
                )}
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>

      <FilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        mediaFilter={mediaFilter}
        safetyFilter={safetyFilter}
        onMediaFilter={setMediaFilter}
        onSafetyFilter={setSafetyFilter}
        colors={colors}
        isDark={isDark}
        uiScale={uiScale}
        fontScale={fontScale}
      />

      {selectedUser && (
        <UserActionsSheet
          ref={actionsSheetRef}
          username={selectedUser.username || "user"}
          isMuted={!!isMuted}
          onMute={() => {
            actionsSheetRef.current?.close();
            muteMutation.mutate(!!isMuted);
          }}
          onBlock={() => {
            actionsSheetRef.current?.close();
            Alert.alert(
              "Block user?",
              `You won't see @${selectedUser.username} and they won't see you.`,
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Block",
                  style: "destructive",
                  onPress: () => blockMutation.mutate(selectedUser.id),
                },
              ],
            );
          }}
          onReport={() => {
            actionsSheetRef.current?.close();
            Alert.alert("Report", "Thank you — we'll review this account.");
          }}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1, backgroundColor: "transparent" },
  headerLeftWide: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
  },
  backCircle: {
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 3,
  },
  searchBar: {
    flex: 4,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 2,
  },
  searchInput: { flex: 1, minWidth: 0, paddingVertical: 0 },
  clearBtn: {
    alignItems: "center",
    justifyContent: "center",
  },
  filterBtn: {
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 3,
    position: "relative",
  },
  filterBadge: {
    position: "absolute",
    backgroundColor: "#EC4899",
    alignItems: "center",
    justifyContent: "center",
  },
  filterBadgeText: { color: "#fff", fontWeight: "900" },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
  },
  tabText: { fontWeight: "700" },
  tabTextActive: { fontWeight: "900" },
  tabUnderline: {
    position: "absolute",
    bottom: -1,
    height: 3,
    width: "56%",
    borderRadius: 2,
  },
  recentOverlay: { zIndex: 100 },
  recentPanel: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 16,
    elevation: 6,
  },
  recentHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  recentTitle: { fontWeight: "900" },
  recentClear: { fontWeight: "700" },
  recentRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  recentIconCircle: {
    alignItems: "center",
    justifyContent: "center",
  },
  recentTerm: { flex: 1, fontWeight: "700" },
  recentRemoveBtn: {
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontWeight: "800",
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  content: {},
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 16,
    elevation: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
  },
  rowBorder: { borderTopWidth: 1 },
  rowTitle: { fontWeight: "900" },
  rowSubtitle: { marginTop: 2, fontWeight: "700" },
  rowBio: { marginTop: 2, fontWeight: "500" },
  avatar: {},
  avatarPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontWeight: "900" },
  trendRow: {
    flexDirection: "row",
  },
  trendRank: { fontWeight: "900", width: 18, marginTop: 2 },
  trendLabel: {
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  trendTag: { fontWeight: "900", marginTop: 2 },
  trendCount: { fontWeight: "600", marginTop: 2 },
  newsCategoryRow: { flexDirection: "row", gap: 8, paddingVertical: 2 },
  newsCategoryPill: {
    borderRadius: 999,
    borderWidth: 1,
  },
  newsCategoryPillText: { fontWeight: "700" },
  newsHeroCard: {
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 16,
    elevation: 2,
  },
  newsHeroImage: { width: "100%" },
  newsHeroBody: {},
  newsHeroTitle: { fontWeight: "900", lineHeight: 22 },
  newsSource: { fontWeight: "700", marginTop: 6 },
  newsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  newsRowTitle: { fontWeight: "800", lineHeight: 19 },
  newsRowImage: {},
  followBtn: {
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  followBtnText: { fontWeight: "900" },
  menuBtn: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  nsfwBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 6,
  },
  nsfwText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#EF4444",
    letterSpacing: 0.5,
  },
  postCard: {
    borderRadius: 22,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 16,
    elevation: 2,
  },
  postTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  postAuthorRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
  },
  postAvatar: {},
  postAvatarPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  postAuthor: { fontWeight: "900" },
  postHandle: { fontWeight: "700", marginTop: 1 },
  postContent: { lineHeight: 19, marginBottom: 4 },
  postStats: { flexDirection: "row" },
  postStat: { flexDirection: "row", alignItems: "center" },
  postStatText: { fontWeight: "700" },
  thumbWrap: {
    width: "100%",
    overflow: "hidden",
  },
  thumb: { width: "100%", height: "100%" },
  videoThumbInner: {
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  videoLabel: {
    color: "#fff",
    fontWeight: "900",
    letterSpacing: 0.3,
  },
  playCircle: {
    marginTop: 10,
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  gridWrap: { gap: GRID_GAP, borderRadius: 22, overflow: "hidden" },
  gridRow: { flexDirection: "row", gap: GRID_GAP },
  gridCell: { width: GRID_CELL, height: GRID_CELL, overflow: "hidden" },
  gridImage: { width: "100%", height: "100%" },
  gridVideoOverlay: {
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "flex-end",
    justifyContent: "flex-start",
    padding: 6,
  },
  gridPlayBadge: {
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 3,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  emptyWrap: {
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 16,
    elevation: 2,
  },
  emptyIconCircle: {
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontWeight: "800",
    marginBottom: 6,
    textAlign: "center",
  },
  emptySubtitle: {
    textAlign: "center",
    lineHeight: 18,
  },
});
