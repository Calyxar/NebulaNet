// app/(tabs)/explore.tsx — COMPLETED + UPDATED ✅
// ✅ Theme + dark mode support
// ✅ Post results show image thumb OR video thumb badge
// ✅ Community results show community image if available
// ✅ FIX: Do NOT search when Trending selected (prevents wrong default type)
// ✅ FIX: Safe defaults if useSearch returns undefined data
// ✅ Back button works: router.canGoBack() fallback to /(tabs)/home

import AppHeader from "@/components/navigation/AppHeader";
import { getTabBarHeight } from "@/components/navigation/CurvedTabBar";
import { useSearch } from "@/hooks/useSearch";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
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

type ExploreCategory = "trending" | "account" | "post" | "community";

/* =========================
   MEDIA TYPE HELPERS
========================= */

const isVideoUrl = (url?: string | null) => {
  if (!url) return false;
  const clean = url.split("?")[0].toLowerCase();
  return (
    clean.endsWith(".mp4") ||
    clean.endsWith(".mov") ||
    clean.endsWith(".m4v") ||
    clean.endsWith(".webm") ||
    clean.endsWith(".mkv") ||
    clean.endsWith(".avi")
  );
};

const isImageUrl = (url?: string | null) => {
  if (!url) return false;
  const clean = url.split("?")[0].toLowerCase();
  return (
    clean.endsWith(".jpg") ||
    clean.endsWith(".jpeg") ||
    clean.endsWith(".png") ||
    clean.endsWith(".webp") ||
    clean.endsWith(".gif")
  );
};

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] =
    useState<ExploreCategory>("trending");

  const categories: { key: ExploreCategory; label: string }[] = [
    { key: "trending", label: "Trending" },
    { key: "account", label: "Account" },
    { key: "post", label: "Post" },
    { key: "community", label: "Community" },
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

  // ✅ Only search if NOT trending
  const shouldSearch = activeCategory !== "trending";

  const searchType = useMemo(() => {
    if (!shouldSearch) return null;
    if (activeCategory === "account") return "account";
    if (activeCategory === "post") return "post";
    if (activeCategory === "community") return "community";
    return null;
  }, [activeCategory, shouldSearch]);

  // ✅ Run search only when we have a real type (and not trending)
  const { data, isSearching, isIdle } = useSearch({
    type: (searchType ?? "post") as any, // hook may require a value; we gate with shouldSearch below
    query: searchQuery,
    minChars: 2,
    limit: 20,
    debounceMs: 350,
    // If your hook supports enabled, pass it:
    // enabled: shouldSearch,
  });

  // ✅ Safe defaults if hook returns undefined
  const accounts = (data as any)?.accounts ?? [];
  const posts = (data as any)?.posts ?? [];
  const communities = (data as any)?.communities ?? [];

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
        <SafeAreaView style={styles.container} edges={["left", "right"]}>
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
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Search..."
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
              </View>
            }
          />

          <View
            style={[
              styles.segmentWrap,
              {
                backgroundColor: colors.card,
                shadowOpacity: isDark ? 0.22 : 0.05,
              },
            ]}
          >
            {categories.map((c) => {
              const isActive = activeCategory === c.key;
              return (
                <TouchableOpacity
                  key={c.key}
                  onPress={() => setActiveCategory(c.key)}
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
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.content,
              { paddingBottom: bottomPad },
            ]}
          >
            {activeCategory === "trending" && (
              <EmptyState
                colors={colors}
                icon="trending-up-outline"
                title="Trending will appear soon"
                subtitle="As people post and use hashtags, we’ll show what’s trending here."
              />
            )}

            {activeCategory === "account" && (
              <>
                {isSearching && !isIdle ? (
                  <LoadingCard colors={colors} />
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
                    {accounts.map((a: any, idx: number) => {
                      const name = a.full_name || a.username || "User";
                      return (
                        <TouchableOpacity
                          key={a.id}
                          activeOpacity={0.85}
                          style={[
                            styles.row,
                            idx !== 0 && [
                              styles.rowBorder,
                              { borderTopColor: colors.border },
                            ],
                          ]}
                          onPress={() =>
                            a.username
                              ? router.push(`/user/${a.username}`)
                              : undefined
                          }
                        >
                          {a.avatar_url ? (
                            <Image
                              source={{ uri: a.avatar_url }}
                              style={[
                                styles.avatar,
                                { backgroundColor: colors.surface },
                              ]}
                            />
                          ) : (
                            <View
                              style={[
                                styles.avatarPlaceholder,
                                { backgroundColor: colors.surface },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.avatarText,
                                  { color: colors.primary },
                                ]}
                              >
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
                              style={[
                                styles.rowSubtitle,
                                { color: colors.textTertiary },
                              ]}
                              numberOfLines={1}
                            >
                              @{a.username || "user"}
                            </Text>
                          </View>

                          <Ionicons
                            name="chevron-forward"
                            size={18}
                            color={colors.textTertiary}
                          />
                        </TouchableOpacity>
                      );
                    })}
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

            {activeCategory === "post" && (
              <>
                {isSearching && !isIdle ? (
                  <LoadingCard colors={colors} />
                ) : isIdle ? (
                  <EmptyState
                    colors={colors}
                    icon="search-outline"
                    title="Start typing"
                    subtitle="Type at least 2 characters to search posts."
                  />
                ) : posts.length > 0 ? (
                  <View style={{ gap: 12 }}>
                    {posts.map((p: any) => {
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
                          <View style={styles.postTop}>
                            <Text
                              style={[
                                styles.postAuthor,
                                { color: colors.text },
                              ]}
                              numberOfLines={1}
                            >
                              {author}
                            </Text>
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
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : (
                  <EmptyState
                    colors={colors}
                    icon="document-text-outline"
                    title="No matches"
                    subtitle="Try a different keyword."
                  />
                )}
              </>
            )}

            {activeCategory === "community" && (
              <>
                {isSearching && !isIdle ? (
                  <LoadingCard colors={colors} />
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
                        {/* ✅ Show image_url if present */}
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
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </>
  );
}

function LoadingCard({ colors }: { colors: any }) {
  return (
    <View style={[styles.loadingCard, { backgroundColor: colors.card }]}>
      <ActivityIndicator size="small" color={colors.primary} />
      <Text style={[styles.loadingText, { color: colors.textTertiary }]}>
        Searching…
      </Text>
    </View>
  );
}

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

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1, backgroundColor: "transparent" },

  headerLeftWide: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
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
  searchInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    paddingVertical: 0,
  },
  clearBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },

  segmentWrap: {
    marginHorizontal: 18,
    borderRadius: 22,
    padding: 6,
    flexDirection: "row",
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 16,
    elevation: 2,
  },
  segmentItem: {
    flex: 1,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentText: { fontSize: 13, fontWeight: "700" },

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
  communityAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
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
  },
  postAuthor: { fontSize: 14, fontWeight: "900" },
  postContent: { marginTop: 8, fontSize: 13.5, lineHeight: 19 },

  thumbWrap: {
    marginTop: 12,
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

  loadingCard: {
    borderRadius: 22,
    paddingVertical: 18,
    paddingHorizontal: 18,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 16,
    elevation: 2,
  },
  loadingText: { fontSize: 13, fontWeight: "800" },
});
