// app/settings/saved-content.tsx — UPDATED ✅ dark mode
// ✅ FIXED: reads from "saves" collection (was "saved_posts") to match useToggleBookmark

import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type SavedItem = {
  id: string;
  post_id: string;
  saved_at: string;
  post: {
    id: string;
    title: string | null;
    content: string;
    media_urls: string[] | null;
    author: { username: string; avatar_url: string | null } | null;
  };
};

type HiddenItem = {
  id: string;
  post_id: string;
  hidden_at: string;
  post: {
    id: string;
    title: string | null;
    content: string;
    author: { username: string } | null;
  };
};

export default function SavedContentScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"saved" | "hidden">("saved");

  const savedQuery = useQuery({
    queryKey: ["saved-posts", user?.uid],
    enabled: !!user && activeTab === "saved",
    queryFn: async (): Promise<SavedItem[]> => {
      if (!user) return [];
      const snap = await db
        .collection("saves")
        .where("user_id", "==", user.uid)
        .get();
      const rows = await Promise.all(
        snap.docs.map(async (d) => {
          const data = d.data() as any;
          const pSnap = await db.collection("posts").doc(data.post_id).get();
          if (!pSnap.exists) return null;
          const post = pSnap.data() as any;
          const aSnap = post.user_id
            ? await db.collection("profiles").doc(post.user_id).get()
            : null;
          const author = aSnap?.exists ? (aSnap.data() as any) : null;
          return {
            id: d.id,
            post_id: data.post_id,
            saved_at: data.saved_at ?? "",
            post: {
              id: pSnap.id,
              title: post.title ?? null,
              content: post.content ?? "",
              media_urls: Array.isArray(post.media_urls) ? post.media_urls : [],
              author: author
                ? {
                    username: author.username,
                    avatar_url: author.avatar_url ?? null,
                  }
                : { username: "Unknown", avatar_url: null },
            },
          };
        }),
      );
      return rows.filter(Boolean) as SavedItem[];
    },
  });

  const hiddenQuery = useQuery({
    queryKey: ["hidden-posts", user?.uid],
    enabled: !!user && activeTab === "hidden",
    queryFn: async (): Promise<HiddenItem[]> => {
      if (!user) return [];
      const hSnap = await db
        .collection("hidden_posts")
        .where("user_id", "==", user.uid)
        .get();
      const hRows = await Promise.all(
        hSnap.docs.map(async (d) => {
          const data = d.data() as any;
          const pSnap = await db.collection("posts").doc(data.post_id).get();
          if (!pSnap.exists) return null;
          const post = pSnap.data() as any;
          const aSnap = post.user_id
            ? await db.collection("profiles").doc(post.user_id).get()
            : null;
          const author = aSnap?.exists ? (aSnap.data() as any) : null;
          return {
            id: d.id,
            post_id: data.post_id,
            hidden_at: data.hidden_at ?? "",
            post: {
              id: pSnap.id,
              title: post.title ?? null,
              content: post.content ?? "",
              author: author
                ? { username: author.username }
                : { username: "Unknown" },
            },
          };
        }),
      );
      return hRows.filter(Boolean) as HiddenItem[];
    },
  });

  const unhideMutation = useMutation({
    mutationFn: async (postId: string) => {
      if (!user) throw new Error("Not authenticated");
      const uhSnap = await db
        .collection("hidden_posts")
        .where("user_id", "==", user.uid)
        .where("post_id", "==", postId)
        .get();
      await Promise.all(uhSnap.docs.map((d) => d.ref.delete()));
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["hidden-posts", user?.uid] }),
  });

  const savedItems = savedQuery.data ?? [];
  const hiddenItems = hiddenQuery.data ?? [];
  const savedCount = useMemo(() => savedItems.length, [savedItems.length]);
  const hiddenCount = useMemo(() => hiddenItems.length, [hiddenItems.length]);

  const renderSaved = ({ item }: { item: SavedItem }) => (
    <TouchableOpacity
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
      activeOpacity={0.9}
      onPress={() => router.push(`/post/${item.post.id}` as any)}
    >
      <View style={styles.cardTop}>
        <View
          style={[styles.badge, { backgroundColor: colors.primary + "18" }]}
        >
          <Ionicons name="bookmark" size={14} color={colors.primary} />
          <Text style={[styles.badgeText, { color: colors.primary }]}>
            Saved
          </Text>
        </View>
        <Text style={[styles.dateText, { color: colors.textTertiary }]}>
          {item.saved_at ? new Date(item.saved_at).toLocaleDateString() : ""}
        </Text>
      </View>
      <Text style={[styles.handleText, { color: colors.textSecondary }]}>
        @{item.post.author?.username || "unknown"}
      </Text>
      {item.post.media_urls?.[0] ? (
        <Image source={{ uri: item.post.media_urls[0] }} style={styles.media} />
      ) : null}
      {item.post.title ? (
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
          {item.post.title}
        </Text>
      ) : null}
      <Text
        style={[styles.body, { color: colors.textSecondary }]}
        numberOfLines={3}
      >
        {item.post.content}
      </Text>
    </TouchableOpacity>
  );

  const renderHidden = ({ item }: { item: HiddenItem }) => (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={styles.cardTop}>
        <View style={[styles.badge, { backgroundColor: colors.surface }]}>
          <Ionicons
            name="eye-off-outline"
            size={14}
            color={colors.textSecondary}
          />
          <Text style={[styles.badgeText, { color: colors.textSecondary }]}>
            Hidden
          </Text>
        </View>
        <Text style={[styles.dateText, { color: colors.textTertiary }]}>
          {item.hidden_at ? new Date(item.hidden_at).toLocaleDateString() : ""}
        </Text>
      </View>
      <Text style={[styles.handleText, { color: colors.textSecondary }]}>
        @{item.post.author?.username || "unknown"}
      </Text>
      {item.post.title ? (
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
          {item.post.title}
        </Text>
      ) : null}
      <Text
        style={[styles.body, { color: colors.textSecondary }]}
        numberOfLines={3}
      >
        {item.post.content}
      </Text>
      <TouchableOpacity
        style={[
          styles.pillBtn,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
        onPress={() => unhideMutation.mutate(item.post_id)}
        disabled={unhideMutation.isPending}
        activeOpacity={0.85}
      >
        <Ionicons name="arrow-undo-outline" size={16} color={colors.text} />
        <Text style={[styles.pillBtnText, { color: colors.text }]}>
          {unhideMutation.isPending ? "Unhiding..." : "Unhide"}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const Empty = ({
    icon,
    title,
    sub,
  }: {
    icon: string;
    title: string;
    sub: string;
  }) => (
    <View style={styles.empty}>
      <Ionicons name={icon as any} size={56} color={colors.border} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
        {sub}
      </Text>
    </View>
  );

  const content = (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "transparent" }}
      edges={["top", "left", "right"]}
    >
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View
            style={[
              styles.circleBtn,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Ionicons
              name="bookmark-outline"
              size={20}
              color={colors.primary}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              Saved & Hidden
            </Text>
            <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
              Quick access to saved or removed content
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={[
            styles.circleBtn,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
          onPress={() => router.back()}
          activeOpacity={0.85}
        >
          <Ionicons name="close" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      <View style={[styles.tabsWrap, { backgroundColor: colors.card }]}>
        {(["saved", "hidden"] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tab,
              activeTab === tab && { backgroundColor: colors.primary },
            ]}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.85}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === tab ? "#fff" : colors.textSecondary },
              ]}
            >
              {tab === "saved"
                ? `Saved (${savedCount})`
                : `Hidden (${hiddenCount})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
          {activeTab === "saved" ? "Saved posts" : "Hidden posts"}
        </Text>
      </View>

      {activeTab === "saved" ? (
        <FlatList
          data={savedItems}
          renderItem={renderSaved}
          keyExtractor={(i) => i.id}
          contentContainerStyle={styles.list}
          refreshing={savedQuery.isLoading}
          onRefresh={savedQuery.refetch}
          ListEmptyComponent={
            <Empty
              icon="bookmark-outline"
              title="No saved posts"
              sub="Posts you save will show up here."
            />
          }
        />
      ) : (
        <FlatList
          data={hiddenItems}
          renderItem={renderHidden}
          keyExtractor={(i) => i.id}
          contentContainerStyle={styles.list}
          refreshing={hiddenQuery.isLoading}
          onRefresh={hiddenQuery.refetch}
          ListEmptyComponent={
            <Empty
              icon="eye-off-outline"
              title="No hidden posts"
              sub="Posts you hide won't appear in your feed."
            />
          }
        />
      )}

      <Text style={[styles.footer, { color: colors.textTertiary }]}>
        nebulanet.space • Saved changes sync to your account.
      </Text>
    </SafeAreaView>
  );

  if (!isDark) {
    return (
      <LinearGradient
        colors={["#DCEBFF", "#EEF4FF", "#FFFFFF"]}
        locations={[0, 0.45, 1]}
        style={{ flex: 1 }}
      >
        {content}
      </LinearGradient>
    );
  }
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", flex: 1, gap: 12 },
  circleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  headerTitle: { fontSize: 18, fontWeight: "800" },
  headerSub: { fontSize: 12, marginTop: 2 },
  tabsWrap: {
    marginHorizontal: 18,
    borderRadius: 22,
    padding: 4,
    flexDirection: "row",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 2,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 18 },
  tabText: { fontSize: 13, fontWeight: "800" },
  sectionHeader: { marginTop: 14, marginBottom: 8, paddingHorizontal: 18 },
  sectionText: { fontSize: 13, fontWeight: "800", letterSpacing: 0.4 },
  list: { paddingHorizontal: 18, paddingBottom: 18, paddingTop: 6 },
  card: {
    borderRadius: 22,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 2,
    borderWidth: 1,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeText: { fontSize: 12, fontWeight: "900" },
  handleText: { fontSize: 13, fontWeight: "800", marginBottom: 10 },
  dateText: { fontSize: 12, fontWeight: "700" },
  media: { width: "100%", height: 160, borderRadius: 14, marginBottom: 12 },
  title: { fontSize: 16, fontWeight: "900", marginBottom: 8 },
  body: { fontSize: 14, lineHeight: 20 },
  pillBtn: {
    marginTop: 14,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  pillBtnText: { fontSize: 13, fontWeight: "900" },
  empty: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "900",
    marginTop: 14,
    marginBottom: 8,
  },
  emptyText: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  footer: { marginTop: 6, marginBottom: 10, fontSize: 12, textAlign: "center" },
});
