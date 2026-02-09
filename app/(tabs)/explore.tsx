import { getTabBarHeight } from "@/components/navigation/CurvedTabBar";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
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

  const accounts = useMemo(() => [], []);
  const posts = useMemo(() => [], []);
  const communities = useMemo(() => [], []);
  const loading = false;

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
        <SafeAreaView style={styles.container}>
          <View style={styles.topRow}>
            <TouchableOpacity
              style={styles.circleButton}
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
              />
            </View>
          </View>

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
            {activeCategory === "account" && (
              <>
                {accounts.length > 0 ? (
                  <View style={styles.card} />
                ) : (
                  <EmptyState
                    icon="people-outline"
                    title={loading ? "Searching..." : "No accounts yet"}
                    subtitle={
                      loading
                        ? "Please wait a moment."
                        : "Once more testers join, matching accounts will appear here."
                    }
                  />
                )}
              </>
            )}

            {activeCategory === "post" && (
              <>
                {posts.length > 0 ? (
                  <View style={styles.card} />
                ) : (
                  <EmptyState
                    icon="document-text-outline"
                    title={loading ? "Searching..." : "No posts yet"}
                    subtitle={
                      loading
                        ? "Please wait a moment."
                        : "Posts will show here as your community starts sharing."
                    }
                  />
                )}
              </>
            )}

            {activeCategory === "community" && (
              <>
                {communities.length > 0 ? (
                  <View style={styles.card} />
                ) : (
                  <EmptyState
                    icon="people-circle-outline"
                    title={loading ? "Searching..." : "No communities yet"}
                    subtitle={
                      loading
                        ? "Please wait a moment."
                        : "Communities will appear here when they’re created."
                    }
                  />
                )}
              </>
            )}

            {activeCategory === "trending" && (
              <EmptyState
                icon="trending-up-outline"
                title={loading ? "Loading..." : "Trending will appear soon"}
                subtitle={
                  loading
                    ? "Please wait a moment."
                    : "As people post and use hashtags, we’ll show what’s trending here."
                }
              />
            )}
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </>
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

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 12,
  },
  circleButton: {
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
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#111827",
    paddingVertical: 0,
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
  segmentItemActive: {
    backgroundColor: "#7C3AED",
  },
  segmentText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#9CA3AF",
  },
  segmentTextActive: {
    color: "#FFFFFF",
  },

  content: {
    paddingHorizontal: 18,
    paddingTop: 14,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 2,
  },

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
});
