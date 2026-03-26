// app/(tabs)/explore.tsx — UPDATED ✅ content filters added
// ✅ SafeAreaView edges include "top" — prevents camera punch-hole overlap
// ✅ Full theme support via useTheme
// ✅ Trending tab: real hashtags from Firestore via getTrendingHashtags()
// ✅ Trending tab: Suggested Users section with live follow/unfollow per row
// ✅ Trending tab: Discovery media grid — recent public posts with images/video
// ✅ SuggestedUserRow uses useFollowActions(u.id) per row — correct hook pattern
// ✅ Follow button shows "Follow" / "Requested" / "Following" based on live status
// ✅ Private account follow sends "pending" status automatically
// ✅ Account tab: search results include follow buttons (reuses SuggestedUserRow)
// ✅ Recent searches: AsyncStorage-persisted, shown when bar focused + query empty
// ✅ Recent searches: per-row delete + clear all; saved on submit/tab switch
// ✅ Post tab: fixed searchPosts — no composite index bug (is_visible filtered in JS)
// ✅ Community tab: search by name, slug, or description
// ✅ Hashtag tab: filter local trending list while typing
// ✅ All loading states use Skeleton components — no raw spinners
// ✅ EmptyState component reused across all tabs
// ✅ Keyboard dismissed on scroll (KeyboardAwareBehavior via scrollView.onScrollBeginDrag)
// ✅ Back button: router.canGoBack() with /(tabs)/home fallback
// ✅ Linear gradient background (light mode only, dark stays flat)
// ✅ Content filters: media type (All/Images/Videos/GIFs) + safety (Safe/All)

import AppHeader from "@/components/navigation/AppHeader";
import { getTabBarHeight } from "@/components/navigation/CurvedTabBar";
import {
  HashtagRowSkeleton,
  PostSearchSkeleton,
  SearchRowSkeleton,
} from "@/components/Skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useFollowActions, useFollowStatus } from "@/hooks/useFollowActions";
import {
  fetchDiscoveryPosts,
  fetchSuggestedUsers,
  useRecentSearches,
  useSearch,
  type DiscoveryPost,
  type SuggestedUser,
} from "@/hooks/useSearch";
import {
  getTrendingHashtags,
  type TrendingHashtag,
} from "@/lib/firestore/hashtags";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
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

/* =========================
   CONSTANTS
========================= */

const SCREEN_W = Dimensions.get("window").width;
const GRID_H_PAD = 36;
const GRID_GAP = 2;
const GRID_COLS = 3;
const GRID_CELL =
  (SCREEN_W - GRID_H_PAD - GRID_GAP * (GRID_COLS - 1)) / GRID_COLS;

/* =========================
   TYPES
========================= */

type ExploreCategory =
  | "trending"
  | "account"
  | "post"
  | "community"
  | "hashtag";

type MediaFilter = "all" | "images" | "videos" | "gifs";
type SafetyFilter = "safe" | "all";

/* =========================
   MEDIA TYPE HELPERS
========================= */

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

/* =========================
   FILTER MODAL
========================= */

function FilterModal({
  visible,
  onClose,
  mediaFilter,
  safetyFilter,
  onMediaFilter,
  onSafetyFilter,
  colors,
  isDark,
}: {
  visible: boolean;
  onClose: () => void;
  mediaFilter: MediaFilter;
  safetyFilter: SafetyFilter;
  onMediaFilter: (f: MediaFilter) => void;
  onSafetyFilter: (f: SafetyFilter) => void;
  colors: any;
  isDark: boolean;
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
      <View style={[fStyles.sheet, { backgroundColor: colors.card }]}>
        {/* Handle */}
        <View style={[fStyles.handle, { backgroundColor: colors.border }]} />

        <Text style={[fStyles.title, { color: colors.text }]}>
          Search Filters
        </Text>

        {/* Media type */}
        <Text style={[fStyles.sectionLabel, { color: colors.textTertiary }]}>
          Media type
        </Text>
        <View style={fStyles.optionGrid}>
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
                    { color: active ? "#fff" : colors.text },
                  ]}
                >
                  {o.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Safety */}
        <Text
          style={[
            fStyles.sectionLabel,
            { color: colors.textTertiary, marginTop: 20 },
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
                  <Text style={[fStyles.safetyLabel, { color: colors.text }]}>
                    {o.label}
                  </Text>
                  <Text
                    style={[fStyles.safetyDesc, { color: colors.textTertiary }]}
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
          style={[fStyles.doneBtn, { backgroundColor: colors.primary }]}
          onPress={onClose}
          activeOpacity={0.88}
        >
          <Text style={fStyles.doneBtnText}>Done</Text>
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
    padding: 24,
    paddingBottom: 40,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  title: { fontSize: 18, fontWeight: "900", marginBottom: 20 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  optionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  optionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  optionLabel: { fontSize: 14, fontWeight: "700" },
  safetyCard: { borderRadius: 18, overflow: "hidden" },
  safetyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
  },
  safetyIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  safetyLabel: { fontSize: 14, fontWeight: "800" },
  safetyDesc: { fontSize: 12, marginTop: 2, lineHeight: 16 },
  doneBtn: {
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: "center",
  },
  doneBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});

/* =========================
   ACTIVE FILTER CHIPS
   Shows compact chips when non-default filters are active
========================= */

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

/* =========================
   SUGGESTED / ACCOUNT RESULT ROW
========================= */

function SuggestedUserRow({
  user: u,
  idx,
  colors,
  showBorder = true,
}: {
  user: SuggestedUser;
  idx: number;
  colors: any;
  showBorder?: boolean;
}) {
  const { follow, unfollow, isFollowingBusy } = useFollowActions(u.id, false);
  const { data: status } = useFollowStatus(u.id);

  const isFollowing = status === "accepted" || status === "pending";
  const name = u.full_name || u.username || "User";

  return (
    <View
      style={[
        styles.row,
        showBorder &&
          idx !== 0 && [styles.rowBorder, { borderTopColor: colors.border }],
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.85}
        style={styles.rowLeft}
        onPress={() =>
          u.username ? router.push(`/user/${u.username}`) : undefined
        }
      >
        {u.avatar_url ? (
          <Image
            source={{ uri: u.avatar_url }}
            style={[styles.avatar, { backgroundColor: colors.surface }]}
          />
        ) : (
          <View
            style={[
              styles.avatarPlaceholder,
              { backgroundColor: colors.surface },
            ]}
          >
            <Text style={[styles.avatarText, { color: colors.primary }]}>
              {(name[0] || "U").toUpperCase()}
            </Text>
          </View>
        )}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={[styles.rowTitle, { color: colors.text }]}
            numberOfLines={1}
          >
            {name}
          </Text>
          <Text
            style={[styles.rowSubtitle, { color: colors.textTertiary }]}
            numberOfLines={1}
          >
            @{u.username || "user"}
            {u.follower_count > 0
              ? ` · ${u.follower_count.toLocaleString()} followers`
              : ""}
          </Text>
        </View>
      </TouchableOpacity>

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
              { color: isFollowing ? colors.text : "#fff" },
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
    </View>
  );
}

/* =========================
   DISCOVERY GRID CELL
========================= */

function GridCell({ post, colors }: { post: DiscoveryPost; colors: any }) {
  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={() => router.push(`/post/${post.id}` as any)}
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

/* =========================
   DISCOVERY GRID
========================= */

function DiscoveryGrid({
  posts,
  colors,
}: {
  posts: DiscoveryPost[];
  colors: any;
}) {
  if (!posts.length) return null;

  const rows: DiscoveryPost[][] = [];
  for (let i = 0; i < posts.length; i += GRID_COLS) {
    rows.push(posts.slice(i, i + GRID_COLS));
  }

  return (
    <View style={styles.gridWrap}>
      {rows.map((row, ri) => (
        <View key={ri} style={styles.gridRow}>
          {row.map((post) => (
            <GridCell key={post.id} post={post} colors={colors} />
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

/* =========================
   GRID SKELETON
========================= */

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

/* =========================
   EMPTY STATE
========================= */

function EmptyState({
  icon,
  title,
  subtitle,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  colors: any;
}) {
  return (
    <View style={[styles.emptyWrap, { backgroundColor: colors.card }]}>
      <View
        style={[styles.emptyIconCircle, { backgroundColor: colors.surface }]}
      >
        <Ionicons name={icon} size={26} color={colors.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.emptySubtitle, { color: colors.textTertiary }]}>
        {subtitle}
      </Text>
    </View>
  );
}

/* =========================
   RECENT SEARCHES PANEL
========================= */

function RecentSearchesPanel({
  recents,
  onSelect,
  onRemove,
  onClearAll,
  colors,
  isDark,
}: {
  recents: string[];
  onSelect: (term: string) => void;
  onRemove: (term: string) => void;
  onClearAll: () => void;
  colors: any;
  isDark: boolean;
}) {
  if (!recents.length) return null;

  return (
    <View
      style={[
        styles.recentPanel,
        {
          backgroundColor: colors.card,
          shadowOpacity: isDark ? 0.22 : 0.05,
        },
      ]}
    >
      <View style={styles.recentHeader}>
        <Text style={[styles.recentTitle, { color: colors.text }]}>Recent</Text>
        <TouchableOpacity onPress={onClearAll} activeOpacity={0.8}>
          <Text style={[styles.recentClear, { color: colors.primary }]}>
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
            idx !== 0 && [styles.rowBorder, { borderTopColor: colors.border }],
          ]}
          onPress={() => onSelect(term)}
        >
          <View
            style={[
              styles.recentIconCircle,
              { backgroundColor: colors.surface },
            ]}
          >
            <Ionicons
              name="time-outline"
              size={16}
              color={colors.textTertiary}
            />
          </View>
          <Text
            style={[styles.recentTerm, { color: colors.text }]}
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
              { backgroundColor: colors.surface },
            ]}
          >
            <Ionicons name="close" size={14} color={colors.textTertiary} />
          </TouchableOpacity>
        </TouchableOpacity>
      ))}
    </View>
  );
}

/* =========================
   MAIN SCREEN
========================= */

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { user } = useAuth();

  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [activeCategory, setActiveCategory] =
    useState<ExploreCategory>("trending");

  // ✅ Filter state
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>("all");
  const [safetyFilter, setSafetyFilter] = useState<SafetyFilter>("safe");
  const [showFilterModal, setShowFilterModal] = useState(false);

  const inputRef = useRef<TextInput>(null);

  const [trendingHashtags, setTrendingHashtags] = useState<TrendingHashtag[]>(
    [],
  );
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);
  const [suggestedLoading, setSuggestedLoading] = useState(true);
  const [discoveryPosts, setDiscoveryPosts] = useState<DiscoveryPost[]>([]);
  const [discoveryLoading, setDiscoveryLoading] = useState(true);

  const {
    recents,
    add: addRecent,
    remove: removeRecent,
    clear: clearRecents,
  } = useRecentSearches();

  const categories: { key: ExploreCategory; label: string }[] = [
    { key: "trending", label: "Trending" },
    { key: "account", label: "Account" },
    { key: "post", label: "Post" },
    { key: "community", label: "Community" },
    { key: "hashtag", label: "Hashtag" },
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

  // Count active non-default filters for the badge
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (mediaFilter !== "all") count++;
    if (safetyFilter !== "safe") count++;
    return count;
  }, [mediaFilter, safetyFilter]);

  useEffect(() => {
    setTrendingLoading(true);
    getTrendingHashtags(15)
      .then(setTrendingHashtags)
      .catch((e) => console.warn("getTrendingHashtags failed:", e))
      .finally(() => setTrendingLoading(false));
  }, []);

  useEffect(() => {
    setSuggestedLoading(true);
    fetchSuggestedUsers(8)
      .then(setSuggestedUsers)
      .catch((e) => console.warn("fetchSuggestedUsers failed:", e))
      .finally(() => setSuggestedLoading(false));
  }, [user?.id]);

  useEffect(() => {
    setDiscoveryLoading(true);
    fetchDiscoveryPosts(60)
      .then(setDiscoveryPosts)
      .catch((e) => console.warn("fetchDiscoveryPosts failed:", e))
      .finally(() => setDiscoveryLoading(false));
  }, []);

  // ✅ Apply filters to discovery posts
  const filteredDiscoveryPosts = useMemo(() => {
    let posts = discoveryPosts;
    // Safety filter — hide NSFW posts if safe mode
    if (safetyFilter === "safe") {
      posts = posts.filter((p) => !(p as any).is_nsfw);
    }
    // Media type filter
    if (mediaFilter === "videos") {
      posts = posts.filter((p) => p.is_video || isVideoUrl(p.media_url));
    } else if (mediaFilter === "images") {
      posts = posts.filter((p) => !p.is_video && isImageUrl(p.media_url));
    } else if (mediaFilter === "gifs") {
      posts = posts.filter((p) => isGifUrl(p.media_url));
    }
    return posts;
  }, [discoveryPosts, mediaFilter, safetyFilter]);

  const shouldSearch =
    activeCategory !== "trending" && activeCategory !== "hashtag";

  const searchType = useMemo(() => {
    if (!shouldSearch) return null;
    if (activeCategory === "account") return "account";
    if (activeCategory === "post") return "post";
    if (activeCategory === "community") return "community";
    return null;
  }, [activeCategory, shouldSearch]);

  const { data, isSearching, isIdle } = useSearch({
    type: (searchType ?? "post") as any,
    query: searchQuery,
    minChars: 2,
    limit: 20,
    debounceMs: 350,
  });

  const accounts = (data as any)?.accounts ?? [];
  const posts = (data as any)?.posts ?? [];
  const communities = (data as any)?.communities ?? [];

  // ✅ Apply safety filter to post search results
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

  const hashtagResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase().replace(/^#/, "");
    if (!q) return trendingHashtags;
    return trendingHashtags.filter((h) => h.tag.includes(q));
  }, [searchQuery, trendingHashtags]);

  const showRecents =
    isSearchFocused && !searchQuery.trim() && recents.length > 0;

  // Tabs that support filters
  const filtersApplicable =
    activeCategory === "trending" || activeCategory === "post";

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
          {/* Header */}
          <AppHeader
            backgroundColor="transparent"
            title=""
            leftWide={
              <View style={styles.headerLeftWide}>
                <TouchableOpacity
                  style={[
                    styles.backCircle,
                    {
                      backgroundColor: colors.card,
                      shadowOpacity: isDark ? 0.22 : 0.08,
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
                    placeholder={
                      activeCategory === "hashtag"
                        ? "Search hashtags…"
                        : "Search…"
                    }
                    placeholderTextColor={colors.textTertiary}
                    style={[styles.searchInput, { color: colors.text }]}
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
                        { backgroundColor: colors.surface },
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

                {/* ✅ Filter button */}
                <TouchableOpacity
                  style={[
                    styles.filterBtn,
                    {
                      backgroundColor:
                        activeFilterCount > 0 ? colors.primary : colors.card,
                      shadowOpacity: isDark ? 0.22 : 0.08,
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
                    <View style={styles.filterBadge}>
                      <Text style={styles.filterBadgeText}>
                        {activeFilterCount}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            }
          />

          {/* Category segments */}
          <View
            style={[
              styles.segmentWrap,
              {
                backgroundColor: colors.card,
                shadowOpacity: isDark ? 0.22 : 0.05,
              },
            ]}
          >
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.segmentScrollContent}
              keyboardShouldPersistTaps="handled"
            >
              {categories.map((c) => {
                const isActive = activeCategory === c.key;
                return (
                  <TouchableOpacity
                    key={c.key}
                    onPress={() => switchCategory(c.key)}
                    activeOpacity={0.85}
                    style={[
                      styles.segmentItem,
                      isActive && { backgroundColor: colors.primary },
                    ]}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        { color: colors.textTertiary },
                        isActive && { color: "#FFFFFF" },
                      ]}
                    >
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* ✅ Active filter chips */}
          {filtersApplicable && activeFilterCount > 0 && (
            <ActiveFilterChips
              mediaFilter={mediaFilter}
              safetyFilter={safetyFilter}
              onClearMedia={() => setMediaFilter("all")}
              onClearSafety={() => setSafetyFilter("safe")}
              colors={colors}
            />
          )}

          {/* Recent searches panel */}
          {showRecents && (
            <View style={[styles.recentOverlay, { paddingHorizontal: 18 }]}>
              <RecentSearchesPanel
                recents={recents}
                onSelect={selectRecent}
                onRemove={(t) => void removeRecent(t)}
                onClearAll={() => void clearRecents()}
                colors={colors}
                isDark={isDark}
              />
            </View>
          )}

          {/* Main content */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onScrollBeginDrag={Keyboard.dismiss}
            contentContainerStyle={[
              styles.content,
              { paddingBottom: bottomPad },
            ]}
          >
            {/* ===== TRENDING TAB ===== */}
            {activeCategory === "trending" && (
              <>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Trending
                </Text>

                {trendingLoading ? (
                  <View
                    style={[
                      styles.card,
                      {
                        backgroundColor: colors.card,
                        shadowOpacity: isDark ? 0.22 : 0.05,
                      },
                    ]}
                  >
                    {Array(6)
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
                          <HashtagRowSkeleton />
                        </View>
                      ))}
                  </View>
                ) : trendingHashtags.length > 0 ? (
                  <View
                    style={[
                      styles.card,
                      {
                        backgroundColor: colors.card,
                        shadowOpacity: isDark ? 0.22 : 0.05,
                      },
                    ]}
                  >
                    {trendingHashtags.map((h, idx) => (
                      <TouchableOpacity
                        key={h.tag}
                        activeOpacity={0.85}
                        style={[
                          styles.trendingRow,
                          idx !== 0 && [
                            styles.rowBorder,
                            { borderTopColor: colors.border },
                          ],
                        ]}
                        onPress={() => router.push(`/hashtag/${h.tag}` as any)}
                      >
                        <View style={styles.trendingLeft}>
                          <Text
                            style={[
                              styles.trendingCategory,
                              { color: colors.textTertiary },
                            ]}
                          >
                            Trending · {h.post_count.toLocaleString()}{" "}
                            {h.post_count === 1 ? "post" : "posts"}
                          </Text>
                          <Text
                            style={[
                              styles.trendingTopic,
                              { color: colors.text },
                            ]}
                            numberOfLines={1}
                          >
                            #{h.tag}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={[
                            styles.trendingMore,
                            { backgroundColor: colors.surface },
                          ]}
                          onPress={() =>
                            router.push(`/hashtag/${h.tag}` as any)
                          }
                          activeOpacity={0.85}
                          hitSlop={8}
                        >
                          <Ionicons
                            name="ellipsis-horizontal"
                            size={16}
                            color={colors.textTertiary}
                          />
                        </TouchableOpacity>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <EmptyState
                    colors={colors}
                    icon="trending-up-outline"
                    title="Nothing trending yet"
                    subtitle="Topics trending in your network will appear here."
                  />
                )}

                <Text
                  style={[
                    styles.sectionTitle,
                    { color: colors.text, marginTop: 20 },
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
                      },
                    ]}
                  >
                    {suggestedUsers.slice(0, 4).map((u, idx) => (
                      <SuggestedUserRow
                        key={u.id}
                        user={u}
                        idx={idx}
                        colors={colors}
                      />
                    ))}
                  </View>
                ) : null}

                <Text
                  style={[
                    styles.sectionTitle,
                    { color: colors.text, marginTop: 20 },
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
                    icon="images-outline"
                    title="No posts match your filters"
                    subtitle="Try changing or clearing your filters."
                  />
                )}
              </>
            )}

            {/* ===== ACCOUNT TAB ===== */}
            {activeCategory === "account" && (
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
                  <EmptyState
                    colors={colors}
                    icon="search-outline"
                    title="Start typing"
                    subtitle="Type at least 2 characters to search accounts."
                  />
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
                        }}
                        idx={idx}
                        colors={colors}
                      />
                    ))}
                  </View>
                ) : (
                  <EmptyState
                    colors={colors}
                    icon="people-outline"
                    title="No matches"
                    subtitle="Try a different name or username."
                  />
                )}
              </>
            )}

            {/* ===== POST TAB ===== */}
            {activeCategory === "post" && (
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
                          {/* NSFW badge */}
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

            {/* ===== COMMUNITY TAB ===== */}
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
                  <EmptyState
                    colors={colors}
                    icon="search-outline"
                    title="Start typing"
                    subtitle="Type at least 2 characters to search communities."
                  />
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
                      <TouchableOpacity
                        key={c.id}
                        activeOpacity={0.85}
                        style={[
                          styles.row,
                          idx !== 0 && [
                            styles.rowBorder,
                            { borderTopColor: colors.border },
                          ],
                        ]}
                        onPress={() => router.push(`/community/${c.slug}`)}
                      >
                        {c.image_url ? (
                          <Image
                            source={{ uri: c.image_url }}
                            style={[
                              styles.communityAvatar,
                              { backgroundColor: colors.surface },
                            ]}
                          />
                        ) : (
                          <View
                            style={[
                              styles.communityBadge,
                              { backgroundColor: colors.surface },
                            ]}
                          >
                            <Ionicons
                              name="people"
                              size={18}
                              color={colors.primary}
                            />
                          </View>
                        )}
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text
                            style={[styles.rowTitle, { color: colors.text }]}
                            numberOfLines={1}
                          >
                            {c.name}
                          </Text>
                          <Text
                            style={[
                              styles.rowSubtitle,
                              { color: colors.textTertiary },
                            ]}
                            numberOfLines={1}
                          >
                            {c.description || `@${c.slug}` || "Community"}
                          </Text>
                        </View>
                        <Ionicons
                          name="chevron-forward"
                          size={18}
                          color={colors.textTertiary}
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <EmptyState
                    colors={colors}
                    icon="people-circle-outline"
                    title="No matches"
                    subtitle="Try a different keyword."
                  />
                )}
              </>
            )}

            {/* ===== HASHTAG TAB ===== */}
            {activeCategory === "hashtag" && (
              <>
                {trendingLoading ? (
                  <View
                    style={[
                      styles.card,
                      {
                        backgroundColor: colors.card,
                        shadowOpacity: isDark ? 0.22 : 0.05,
                      },
                    ]}
                  >
                    {Array(6)
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
                          <HashtagRowSkeleton />
                        </View>
                      ))}
                  </View>
                ) : hashtagResults.length > 0 ? (
                  <View
                    style={[
                      styles.card,
                      {
                        backgroundColor: colors.card,
                        shadowOpacity: isDark ? 0.22 : 0.05,
                      },
                    ]}
                  >
                    {hashtagResults.map((h, idx) => (
                      <TouchableOpacity
                        key={h.tag}
                        activeOpacity={0.85}
                        style={[
                          styles.row,
                          idx !== 0 && [
                            styles.rowBorder,
                            { borderTopColor: colors.border },
                          ],
                        ]}
                        onPress={() => router.push(`/hashtag/${h.tag}` as any)}
                      >
                        <View
                          style={[
                            styles.hashtagBadge,
                            { backgroundColor: colors.primary + "18" },
                          ]}
                        >
                          <Text
                            style={[
                              styles.hashtagSymbol,
                              { color: colors.primary },
                            ]}
                          >
                            #
                          </Text>
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text
                            style={[styles.rowTitle, { color: colors.text }]}
                            numberOfLines={1}
                          >
                            {h.tag}
                          </Text>
                          <Text
                            style={[
                              styles.rowSubtitle,
                              { color: colors.textTertiary },
                            ]}
                          >
                            {h.post_count.toLocaleString()}{" "}
                            {h.post_count === 1 ? "post" : "posts"}
                          </Text>
                        </View>
                        <Ionicons
                          name="chevron-forward"
                          size={18}
                          color={colors.textTertiary}
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <EmptyState
                    colors={colors}
                    icon="pricetag-outline"
                    title="No hashtags found"
                    subtitle={
                      searchQuery.trim()
                        ? `No results for #${searchQuery.replace(/^#/, "")}`
                        : "Hashtags will appear here as people post."
                    }
                  />
                )}
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>

      {/* ✅ Filter modal */}
      <FilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        mediaFilter={mediaFilter}
        safetyFilter={safetyFilter}
        onMediaFilter={setMediaFilter}
        onSafetyFilter={setSafetyFilter}
        colors={colors}
        isDark={isDark}
      />
    </>
  );
}

/* =========================
   STYLES
========================= */

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1, backgroundColor: "transparent" },

  headerLeftWide: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  backCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 3,
  },
  searchBar: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    height: 44,
    borderRadius: 22,
    paddingHorizontal: 14,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 2,
  },
  searchInput: { flex: 1, minWidth: 0, fontSize: 15, paddingVertical: 0 },
  clearBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },

  // ✅ Filter button
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
    top: 6,
    right: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#EC4899",
    alignItems: "center",
    justifyContent: "center",
  },
  filterBadgeText: { color: "#fff", fontSize: 9, fontWeight: "900" },

  segmentScroll: { marginHorizontal: 18, marginBottom: 0 },
  segmentScrollContent: { flexDirection: "row", gap: 6, padding: 6 },
  segmentWrap: {
    marginHorizontal: 18,
    borderRadius: 22,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 16,
    elevation: 2,
    overflow: "hidden",
  },
  segmentItem: {
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentText: { fontSize: 13, fontWeight: "700" },

  recentOverlay: { zIndex: 100 },
  recentPanel: {
    borderRadius: 22,
    paddingVertical: 6,
    marginTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 16,
    elevation: 6,
  },
  recentHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  recentTitle: { fontSize: 13, fontWeight: "900" },
  recentClear: { fontSize: 13, fontWeight: "700" },
  recentRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 12,
  },
  recentIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  recentTerm: { flex: 1, fontSize: 14, fontWeight: "700" },
  recentRemoveBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  content: { paddingHorizontal: 18, paddingTop: 14 },

  card: {
    borderRadius: 22,
    paddingVertical: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 16,
    elevation: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  rowBorder: { borderTopWidth: 1 },
  rowTitle: { fontSize: 14.5, fontWeight: "900" },
  rowSubtitle: { marginTop: 2, fontSize: 12.5, fontWeight: "700" },

  avatar: { width: 42, height: 42, borderRadius: 21 },
  avatarPlaceholder: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 16, fontWeight: "900" },

  communityBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  communityAvatar: { width: 42, height: 42, borderRadius: 21 },

  hashtagBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  hashtagSymbol: { fontSize: 22, fontWeight: "900" },

  followBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    minWidth: 88,
    alignItems: "center",
    justifyContent: "center",
  },
  followBtnText: { fontSize: 13, fontWeight: "900" },

  // ✅ NSFW badge
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
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  postAvatar: { width: 34, height: 34, borderRadius: 17 },
  postAvatarPlaceholder: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  postAuthor: { fontSize: 14, fontWeight: "900" },
  postHandle: { fontSize: 12, fontWeight: "700", marginTop: 1 },
  postContent: { fontSize: 13.5, lineHeight: 19, marginBottom: 4 },
  postStats: { flexDirection: "row", gap: 14, marginTop: 10 },
  postStat: { flexDirection: "row", alignItems: "center", gap: 4 },
  postStatText: { fontSize: 12, fontWeight: "700" },
  thumbWrap: {
    marginTop: 10,
    width: "100%",
    height: 160,
    borderRadius: 18,
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
    fontSize: 12,
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

  trendingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  trendingLeft: { flex: 1, minWidth: 0 },
  trendingCategory: { fontSize: 12, fontWeight: "600", marginBottom: 3 },
  trendingTopic: { fontSize: 15, fontWeight: "900" },
  trendingMore: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyWrap: {
    borderRadius: 22,
    paddingVertical: 26,
    paddingHorizontal: 18,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 16,
    elevation: 2,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 6,
    textAlign: "center",
  },
  emptySubtitle: { fontSize: 13, lineHeight: 18, textAlign: "center" },
});
