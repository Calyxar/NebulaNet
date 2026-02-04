// app/settings/saved-content.tsx — COMPLETED (NebulaNet reskin + NO TS type mismatch)
// ✅ Fixes the "SavedRaw/HiddenRaw may be a mistake..." error by typing RAW as the
//    *actual* Supabase embed shape (object OR array) and normalizing safely.
// ✅ NebulaNet gradient + card UI (matches your settings/index.tsx vibe)

import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type MaybeArray<T> = T | T[] | null | undefined;

type AuthorRaw = {
  username: string;
  avatar_url?: string | null;
};

type PostSavedRaw = {
  id: string;
  title: string | null;
  content: string;
  media_urls: string[] | null;
  author: MaybeArray<AuthorRaw>;
};

type PostHiddenRaw = {
  id: string;
  title: string | null;
  content: string;
  author: MaybeArray<Pick<AuthorRaw, "username">>;
};

type SavedRaw = {
  id: string;
  post_id: string;
  saved_at: string;
  post: MaybeArray<PostSavedRaw>;
};

type HiddenRaw = {
  id: string;
  post_id: string;
  hidden_at: string;
  post: MaybeArray<PostHiddenRaw>;
};

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

function toArray<T>(val: MaybeArray<T>): T[] {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}

function normalizeSaved(rows: SavedRaw[]): SavedItem[] {
  return (rows ?? []).map((r) => {
    const post = toArray(r.post)[0];
    const author = post ? toArray(post.author)[0] : undefined;

    return {
      id: r.id,
      post_id: r.post_id,
      saved_at: r.saved_at,
      post: {
        id: post?.id ?? r.post_id,
        title: post?.title ?? null,
        content: post?.content ?? "",
        media_urls: post?.media_urls ?? null,
        author: author
          ? { username: author.username, avatar_url: author.avatar_url ?? null }
          : null,
      },
    };
  });
}

function normalizeHidden(rows: HiddenRaw[]): HiddenItem[] {
  return (rows ?? []).map((r) => {
    const post = toArray(r.post)[0];
    const author = post ? toArray(post.author)[0] : undefined;

    return {
      id: r.id,
      post_id: r.post_id,
      hidden_at: r.hidden_at,
      post: {
        id: post?.id ?? r.post_id,
        title: post?.title ?? null,
        content: post?.content ?? "",
        author: author ? { username: author.username } : null,
      },
    };
  });
}

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{title}</Text>
    </View>
  );
}

export default function SavedContentScreen() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"saved" | "hidden">("saved");

  const savedQuery = useQuery({
    queryKey: ["saved-posts", user?.id],
    enabled: !!user && activeTab === "saved",
    queryFn: async (): Promise<SavedItem[]> => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("saved_posts")
        .select(
          `
          id,
          post_id,
          saved_at,
          post:posts!inner(
            id,
            title,
            content,
            media_urls,
            author:profiles!posts_user_id_fkey(
              username,
              avatar_url
            )
          )
        `,
        )
        .eq("user_id", user.id)
        .order("saved_at", { ascending: false });

      if (error) throw error;

      // ✅ No mismatch: we treat the runtime shape as SavedRaw (post/author can be object or array)
      return normalizeSaved((data ?? []) as SavedRaw[]);
    },
  });

  const hiddenQuery = useQuery({
    queryKey: ["hidden-posts", user?.id],
    enabled: !!user && activeTab === "hidden",
    queryFn: async (): Promise<HiddenItem[]> => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("hidden_posts")
        .select(
          `
          id,
          post_id,
          hidden_at,
          post:posts!inner(
            id,
            title,
            content,
            author:profiles!posts_user_id_fkey(
              username
            )
          )
        `,
        )
        .eq("user_id", user.id)
        .order("hidden_at", { ascending: false });

      if (error) throw error;

      return normalizeHidden((data ?? []) as HiddenRaw[]);
    },
  });

  const unhideMutation = useMutation({
    mutationFn: async (postId: string) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("hidden_posts")
        .delete()
        .eq("user_id", user.id)
        .eq("post_id", postId);

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hidden-posts", user?.id] });
    },
  });

  const savedItems = savedQuery.data ?? [];
  const hiddenItems = hiddenQuery.data ?? [];

  const savedCount = useMemo(() => savedItems.length, [savedItems.length]);
  const hiddenCount = useMemo(() => hiddenItems.length, [hiddenItems.length]);

  const renderSavedItem = ({ item }: { item: SavedItem }) => {
    const preview = item.post.media_urls?.[0];

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.9}
        onPress={() => router.push(`/post/${item.post.id}` as any)}
      >
        <View style={styles.cardTopRow}>
          <View style={styles.badgeLeft}>
            <Ionicons name="bookmark" size={14} color="#7C3AED" />
            <Text style={styles.badgeText}>Saved</Text>
          </View>
          <Text style={styles.dateText}>
            {new Date(item.saved_at).toLocaleDateString()}
          </Text>
        </View>

        <Text style={styles.handleText}>
          @{item.post.author?.username || "unknown"}
        </Text>

        {preview ? (
          <Image source={{ uri: preview }} style={styles.media} />
        ) : null}

        {item.post.title ? (
          <Text style={styles.title} numberOfLines={2}>
            {item.post.title}
          </Text>
        ) : null}

        <Text style={styles.body} numberOfLines={3}>
          {item.post.content}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderHiddenItem = ({ item }: { item: HiddenItem }) => {
    return (
      <View style={styles.card}>
        <View style={styles.cardTopRow}>
          <View style={[styles.badgeLeft, styles.badgeLeftMuted]}>
            <Ionicons name="eye-off-outline" size={14} color="#6B7280" />
            <Text style={[styles.badgeText, styles.badgeTextMuted]}>
              Hidden
            </Text>
          </View>
          <Text style={styles.dateText}>
            {new Date(item.hidden_at).toLocaleDateString()}
          </Text>
        </View>

        <Text style={styles.handleText}>
          @{item.post.author?.username || "unknown"}
        </Text>

        {item.post.title ? (
          <Text style={styles.title} numberOfLines={2}>
            {item.post.title}
          </Text>
        ) : null}

        <Text style={styles.body} numberOfLines={3}>
          {item.post.content}
        </Text>

        <TouchableOpacity
          style={styles.pillButton}
          onPress={() => unhideMutation.mutate(item.post_id)}
          disabled={unhideMutation.isPending}
          activeOpacity={0.85}
        >
          <Ionicons name="arrow-undo-outline" size={16} color="#111827" />
          <Text style={styles.pillButtonText}>
            {unhideMutation.isPending ? "Unhiding..." : "Unhide"}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <LinearGradient
      colors={["#DCEBFF", "#EEF4FF", "#FFFFFF"]}
      locations={[0, 0.45, 1]}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.logoBubble}>
              <Ionicons name="bookmark-outline" size={20} color="#7C3AED" />
            </View>
            <View>
              <Text style={styles.headerTitle}>Saved & Hidden</Text>
              <Text style={styles.headerSub}>
                Quick access to content you saved or removed from your feed
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.headerCircleButton}
            activeOpacity={0.85}
            onPress={() => router.back()}
          >
            <Ionicons name="close" size={20} color="#111827" />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabsWrap}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "saved" && styles.tabActive]}
            onPress={() => setActiveTab("saved")}
            activeOpacity={0.85}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "saved" && styles.tabTextActive,
              ]}
            >
              Saved ({savedCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === "hidden" && styles.tabActive]}
            onPress={() => setActiveTab("hidden")}
            activeOpacity={0.85}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "hidden" && styles.tabTextActive,
              ]}
            >
              Hidden ({hiddenCount})
            </Text>
          </TouchableOpacity>
        </View>

        <SectionHeader
          title={activeTab === "saved" ? "Saved posts" : "Hidden posts"}
        />

        {activeTab === "saved" ? (
          <FlatList
            data={savedItems}
            renderItem={renderSavedItem}
            keyExtractor={(i) => i.id}
            contentContainerStyle={styles.list}
            refreshing={savedQuery.isLoading}
            onRefresh={savedQuery.refetch}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="bookmark-outline" size={56} color="#C7C7CC" />
                <Text style={styles.emptyTitle}>No saved posts</Text>
                <Text style={styles.emptyText}>
                  Posts you save will show up here.
                </Text>
              </View>
            }
          />
        ) : (
          <FlatList
            data={hiddenItems}
            renderItem={renderHiddenItem}
            keyExtractor={(i) => i.id}
            contentContainerStyle={styles.list}
            refreshing={hiddenQuery.isLoading}
            onRefresh={hiddenQuery.refetch}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="eye-off-outline" size={56} color="#C7C7CC" />
                <Text style={styles.emptyTitle}>No hidden posts</Text>
                <Text style={styles.emptyText}>
                  Posts you hide won&apos;t appear in your feed.
                </Text>
              </View>
            }
          />
        )}

        <Text style={styles.footerText}>
          nebulanet.space • Saved changes sync to your account.
        </Text>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1, backgroundColor: "transparent" },

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
  logoBubble: {
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
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#111827" },
  headerSub: { fontSize: 12, color: "#6B7280", marginTop: 2, flexWrap: "wrap" },

  headerCircleButton: {
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

  tabsWrap: {
    marginHorizontal: 18,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 4,
    flexDirection: "row",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 18,
  },
  tabActive: { backgroundColor: "#7C3AED" },
  tabText: { fontSize: 13, color: "#6B7280", fontWeight: "800" },
  tabTextActive: { color: "#FFFFFF" },

  sectionHeader: { marginTop: 14, marginBottom: 8, paddingHorizontal: 18 },
  sectionHeaderText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: 0.4,
  },

  list: { paddingHorizontal: 18, paddingBottom: 18, paddingTop: 6 },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#EEF2FF",
  },

  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  badgeLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#EEF2FF",
  },
  badgeLeftMuted: { backgroundColor: "#F7F7FB" },
  badgeText: { fontSize: 12, fontWeight: "900", color: "#4C1D95" },
  badgeTextMuted: { color: "#6B7280" },

  handleText: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "800",
    marginBottom: 10,
  },
  dateText: { fontSize: 12, color: "#9CA3AF", fontWeight: "700" },

  media: {
    width: "100%",
    height: 160,
    borderRadius: 14,
    marginBottom: 12,
    backgroundColor: "#EEF2FF",
  },

  title: { fontSize: 16, fontWeight: "900", color: "#111827", marginBottom: 8 },
  body: { fontSize: 14, color: "#6B7280", lineHeight: 20 },

  pillButton: {
    marginTop: 14,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EEF2FF",
  },
  pillButtonText: { fontSize: 13, fontWeight: "900", color: "#111827" },

  empty: { alignItems: "center", paddingVertical: 60, paddingHorizontal: 20 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
    marginTop: 14,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
  },

  footerText: {
    marginTop: 6,
    marginBottom: 10,
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
  },
});
