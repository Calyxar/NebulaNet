// app/(tabs)/explore.tsx — COMPLETED (wired to useSearch + no-squish header)
import AppHeader from "@/components/navigation/AppHeader";
import { getTabBarHeight } from "@/components/navigation/CurvedTabBar";
import { useSearch } from "@/hooks/useSearch";
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

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();

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

  // Map UI category -> search hook type
  const searchType =
    activeCategory === "account"
      ? "account"
      : activeCategory === "post"
        ? "post"
        : activeCategory === "community"
          ? "community"
          : null;

  const { data, isSearching, isIdle } = useSearch({
    // When "trending", we just won't show results.
    type: (searchType ?? "post") as any,
    query: searchQuery,
    minChars: 2,
    limit: 20,
    debounceMs: 350,
  });

  const accounts = data.accounts;
  const posts = data.posts;
  const communities = data.communities;

  const clearSearch = () => setSearchQuery("");

  return (
    <>
      <StatusBar
        barStyle="dark-content"
        translucent
        backgroundColor="transparent"
      />

      <LinearGradient
        colors={["#DCEBFF", "#EEF4FF", "#FFFFFF"]}
        locations={[0, 0.42, 1]}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.container} edges={["left", "right"]}>
          {/* ✅ FIX: put back + full-width search inside leftWide (real flexible space) */}
          <AppHeader
            backgroundColor="transparent"
            title=""
            leftWide={
              <View style={styles.headerLeftWide}>
                <TouchableOpacity
                  style={styles.backCircle}
                  onPress={() => router.back()}
                  activeOpacity={0.85}
                >
                  <Ionicons name="arrow-back" size={22} color="#111827" />
                </TouchableOpacity>

                <View style={styles.searchBar}>
                  <Ionicons name="search" size={18} color="#9CA3AF" />
                  <TextInput
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Search..."
                    placeholderTextColor="#9CA3AF"
                    style={styles.searchInput}
                    returnKeyType="search"
                    autoCorrect={false}
                    autoCapitalize="none"
                  />

                  {!!searchQuery.trim() && (
                    <TouchableOpacity
                      onPress={clearSearch}
                      activeOpacity={0.85}
                      style={styles.clearBtn}
                    >
                      <Ionicons name="close" size={18} color="#6B7280" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            }
          />

          <View style={styles.segmentWrap}>
            {categories.map((c) => {
              const isActive = activeCategory === c.key;
              return (
                <TouchableOpacity
                  key={c.key}
                  onPress={() => setActiveCategory(c.key)}
                  activeOpacity={0.85}
                  style={[
                    styles.segmentItem,
                    isActive && styles.segmentItemActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      isActive && styles.segmentTextActive,
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
            {/* Trending */}
            {activeCategory === "trending" && (
              <EmptyState
                icon="trending-up-outline"
                title="Trending will appear soon"
                subtitle="As people post and use hashtags, we’ll show what’s trending here."
              />
            )}

            {/* Accounts */}
            {activeCategory === "account" && (
              <>
                {isSearching && !isIdle ? (
                  <LoadingCard />
                ) : isIdle ? (
                  <EmptyState
                    icon="search-outline"
                    title="Start typing"
                    subtitle="Type at least 2 characters to search accounts."
                  />
                ) : accounts.length > 0 ? (
                  <View style={styles.card}>
                    {accounts.map((a, idx) => {
                      const name = a.full_name || a.username || "User";
                      return (
                        <TouchableOpacity
                          key={a.id}
                          activeOpacity={0.85}
                          style={[styles.row, idx !== 0 && styles.rowBorder]}
                          onPress={() =>
                            a.username
                              ? router.push(`/user/${a.username}`)
                              : undefined
                          }
                        >
                          {a.avatar_url ? (
                            <Image
                              source={{ uri: a.avatar_url }}
                              style={styles.avatar}
                            />
                          ) : (
                            <View style={styles.avatarPlaceholder}>
                              <Text style={styles.avatarText}>
                                {(name[0] || "U").toUpperCase()}
                              </Text>
                            </View>
                          )}

                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={styles.rowTitle} numberOfLines={1}>
                              {name}
                            </Text>
                            <Text style={styles.rowSubtitle} numberOfLines={1}>
                              @{a.username || "user"}
                            </Text>
                          </View>

                          <Ionicons
                            name="chevron-forward"
                            size={18}
                            color="#9CA3AF"
                          />
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : (
                  <EmptyState
                    icon="people-outline"
                    title="No matches"
                    subtitle="Try a different name or username."
                  />
                )}
              </>
            )}

            {/* Posts */}
            {activeCategory === "post" && (
              <>
                {isSearching && !isIdle ? (
                  <LoadingCard />
                ) : isIdle ? (
                  <EmptyState
                    icon="search-outline"
                    title="Start typing"
                    subtitle="Type at least 2 characters to search posts."
                  />
                ) : posts.length > 0 ? (
                  <View style={{ gap: 12 }}>
                    {posts.map((p) => {
                      const author =
                        p.user?.full_name || p.user?.username || "User";
                      return (
                        <TouchableOpacity
                          key={p.id}
                          activeOpacity={0.9}
                          style={styles.postCard}
                          onPress={() => router.push(`/post/${p.id}`)}
                        >
                          <View style={styles.postTop}>
                            <Text style={styles.postAuthor} numberOfLines={1}>
                              {author}
                            </Text>
                            <Ionicons
                              name="chevron-forward"
                              size={16}
                              color="#9CA3AF"
                            />
                          </View>

                          {!!p.content && (
                            <Text style={styles.postContent} numberOfLines={3}>
                              {p.content}
                            </Text>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : (
                  <EmptyState
                    icon="document-text-outline"
                    title="No matches"
                    subtitle="Try a different keyword."
                  />
                )}
              </>
            )}

            {/* Communities */}
            {activeCategory === "community" && (
              <>
                {isSearching && !isIdle ? (
                  <LoadingCard />
                ) : isIdle ? (
                  <EmptyState
                    icon="search-outline"
                    title="Start typing"
                    subtitle="Type at least 2 characters to search communities."
                  />
                ) : communities.length > 0 ? (
                  <View style={styles.card}>
                    {communities.map((c, idx) => (
                      <TouchableOpacity
                        key={c.id}
                        activeOpacity={0.85}
                        style={[styles.row, idx !== 0 && styles.rowBorder]}
                        onPress={() => router.push(`/community/${c.slug}`)}
                      >
                        <View style={styles.communityBadge}>
                          <Ionicons name="people" size={18} color="#7C3AED" />
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={styles.rowTitle} numberOfLines={1}>
                            {c.name}
                          </Text>
                          <Text style={styles.rowSubtitle} numberOfLines={1}>
                            {c.description || "Community"}
                          </Text>
                        </View>
                        <Ionicons
                          name="chevron-forward"
                          size={18}
                          color="#9CA3AF"
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <EmptyState
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

function LoadingCard() {
  return (
    <View style={styles.loadingCard}>
      <ActivityIndicator size="small" color="#7C3AED" />
      <Text style={styles.loadingText}>Searching…</Text>
    </View>
  );
}

function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
}) {
  return (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyIconCircle}>
        <Ionicons name={icon} size={26} color="#7C3AED" />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySubtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1, backgroundColor: "transparent" },

  // ✅ header row (back + search)
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
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
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
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    color: "#111827",
    paddingVertical: 0,
  },
  clearBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },

  segmentWrap: {
    marginHorizontal: 18,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 6,
    flexDirection: "row",
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
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
  segmentItemActive: { backgroundColor: "#7C3AED" },
  segmentText: { fontSize: 13, fontWeight: "700", color: "#9CA3AF" },
  segmentTextActive: { color: "#FFFFFF" },

  content: { paddingHorizontal: 18, paddingTop: 14 },

  // Lists
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    paddingVertical: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
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
  rowBorder: { borderTopWidth: 1, borderTopColor: "#F3F4F6" },
  rowTitle: { fontSize: 14.5, fontWeight: "900", color: "#111827" },
  rowSubtitle: {
    marginTop: 2,
    fontSize: 12.5,
    fontWeight: "700",
    color: "#6B7280",
  },

  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#F3F4F6",
  },
  avatarPlaceholder: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 16, fontWeight: "900", color: "#7C3AED" },

  communityBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#F3ECFF",
    alignItems: "center",
    justifyContent: "center",
  },

  postCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 2,
  },
  postTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  postAuthor: { fontSize: 14, fontWeight: "900", color: "#111827" },
  postContent: {
    marginTop: 8,
    fontSize: 13.5,
    color: "#111827",
    lineHeight: 19,
  },

  // Empty / Loading
  emptyWrap: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    paddingVertical: 26,
    paddingHorizontal: 18,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 2,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#F3ECFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 6,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 18,
    textAlign: "center",
  },

  loadingCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    paddingVertical: 18,
    paddingHorizontal: 18,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 2,
  },
  loadingText: { fontSize: 13, fontWeight: "800", color: "#6B7280" },
});
