// app/community/[slug].tsx — COMPLETED + UPDATED ✅
// Fixes included:
// ✅ Uses slug routes (/community/[slug])
// ✅ Works whether your communities table has (is_private/owner_id) OR NOT (fallback-safe)
// ✅ Uses communities.image_url (your DB column) instead of avatar_url
// ✅ Private gating uses computed "joined" (no stale isJoined bug)
// ✅ Supabase joins aliased to singular "profile" to match TS
// ✅ Separate FlatLists to avoid TS overload issues

import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

/* ----------------------------- types ----------------------------- */

type ProfileMini = {
  username: string;
  full_name: string | null;
  avatar_url: string | null;
};

type Community = {
  id: string;
  slug: string;
  name: string;
  description: string | null;

  // Your DB columns (confirmed)
  image_url: string | null;
  member_count: number | null;
  created_at?: string;
  updated_at?: string;

  // Optional (only if your schema has them)
  is_private?: boolean | null;
  owner_id?: string | null;
  banner_url?: string | null;
};

type Post = {
  id: string;
  user_id: string;
  community_id: string | null;
  content: string;
  media_urls: string[];
  created_at: string;
  profile: ProfileMini | null; // join alias output (singular)
};

type Member = {
  user_id: string;
  joined_at: string;
  profile: ProfileMini | null; // join alias output (singular)
};

type Rule = {
  id: string;
  title: string;
  description: string | null;
};

type MediaGridItem = {
  postId: string;
  url: string;
  type: "image" | "video";
};

/* ----------------------------- helpers ----------------------------- */

const isVideoUrl = (url: string) =>
  /\.(mp4|mov|m4v|webm)$/i.test(url) || url.toLowerCase().includes("video");

const formatTimeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
};

function normalizeBool(v: any): boolean {
  return v === true;
}

/* ----------------------------- screen ----------------------------- */

export default function CommunityScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { user } = useAuth();

  const [community, setCommunity] = useState<Community | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [media, setMedia] = useState<MediaGridItem[]>([]);

  const [isJoined, setIsJoined] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "feed" | "members" | "rules" | "media"
  >("feed");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  /* ----------------------------- load ----------------------------- */

  const fetchCommunityBySlug = useCallback(async (slugValue: string) => {
    // Try "full" select first (in case you DO have private fields)
    const fullSelect =
      "id, slug, name, description, image_url, member_count, created_at, updated_at, is_private, owner_id, banner_url";
    const minimalSelect =
      "id, slug, name, description, image_url, member_count, created_at, updated_at";

    const attempt1 = await supabase
      .from("communities")
      .select(fullSelect)
      .eq("slug", slugValue)
      .single();

    if (!attempt1.error && attempt1.data) return attempt1.data as Community;

    // Fallback: if your schema does NOT have is_private/owner_id/banner_url,
    // retry with minimal columns so the screen doesn't break.
    const msg = attempt1.error?.message ?? "";
    const looksLikeMissingColumn =
      msg.includes("does not exist") || msg.includes("column");

    if (looksLikeMissingColumn) {
      const attempt2 = await supabase
        .from("communities")
        .select(minimalSelect)
        .eq("slug", slugValue)
        .single();

      if (attempt2.error) throw attempt2.error;
      if (!attempt2.data) throw new Error("Community not found");
      return attempt2.data as Community;
    }

    throw attempt1.error;
  }, []);

  const loadCommunity = useCallback(async () => {
    if (!slug) return;

    setLoading(true);

    try {
      // 1) Fetch the community by slug (fallback-safe)
      const c = await fetchCommunityBySlug(slug);
      setCommunity(c);

      // 2) Determine membership + moderator status
      let joined = false;
      let moderator = false;

      const ownerId = c.owner_id ?? null;

      if (user?.id) {
        const [{ data: member, error: memErr }, { data: mod, error: modErr }] =
          await Promise.all([
            supabase
              .from("community_members")
              .select("id")
              .eq("community_id", c.id)
              .eq("user_id", user.id)
              .maybeSingle(),
            supabase
              .from("community_moderators")
              .select("id")
              .eq("community_id", c.id)
              .eq("user_id", user.id)
              .maybeSingle(),
          ]);

        if (memErr) console.warn("member check error", memErr);
        if (modErr) console.warn("mod check error", modErr);

        joined = !!member || (!!ownerId && ownerId === user.id);
        moderator = !!mod || (!!ownerId && ownerId === user.id);
      }

      setIsJoined(joined);
      setIsModerator(moderator);

      // ✅ Private gating:
      // If your DB lacks is_private, treat as public.
      const isPrivate = normalizeBool(c.is_private);
      const isOwner = !!ownerId && ownerId === user?.id;

      // ✅ FIX: use computed "joined" (not stale state)
      const canViewPrivate = !isPrivate || joined || isOwner;

      // 3) Load tabs content only if allowed
      const [
        { data: p, error: pErr },
        { data: m, error: mErr },
        { data: r, error: rErr },
      ] = await Promise.all([
        canViewPrivate
          ? supabase
              .from("posts")
              .select(
                "id, user_id, community_id, content, media_urls, created_at, profile:profiles!posts_user_id_fkey(username, full_name, avatar_url)",
              )
              .eq("community_id", c.id)
              .eq("is_visible", true)
              .order("created_at", { ascending: false })
          : Promise.resolve({ data: [], error: null } as any),

        canViewPrivate
          ? supabase
              .from("community_members")
              .select(
                "user_id, joined_at, profile:profiles!community_members_user_id_fkey(username, full_name, avatar_url)",
              )
              .eq("community_id", c.id)
              .order("joined_at", { ascending: false })
          : Promise.resolve({ data: [], error: null } as any),

        canViewPrivate
          ? supabase
              .from("community_rules")
              .select("id, title, description")
              .eq("community_id", c.id)
              .order("rule_order", { ascending: true })
          : Promise.resolve({ data: [], error: null } as any),
      ]);

      if (pErr) throw pErr;
      if (mErr) throw mErr;
      if (rErr) throw rErr;

      const postsTyped = (p ?? []) as Post[];
      const membersTyped = (m ?? []) as Member[];
      const rulesTyped = (r ?? []) as Rule[];

      setPosts(postsTyped);
      setMembers(membersTyped);
      setRules(rulesTyped);

      // 4) Build media grid list
      const grid: MediaGridItem[] = [];
      postsTyped.forEach((post) => {
        (post.media_urls ?? []).forEach((url: string) => {
          grid.push({
            postId: post.id,
            url,
            type: isVideoUrl(url) ? "video" : "image",
          });
        });
      });
      setMedia(grid);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to load community");
    } finally {
      setLoading(false);
    }
  }, [slug, user?.id, fetchCommunityBySlug]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadCommunity();
    } finally {
      setRefreshing(false);
    }
  }, [loadCommunity]);

  useEffect(() => {
    void loadCommunity();
  }, [loadCommunity]);

  /* ----------------------------- renderers ----------------------------- */

  const renderPost = useCallback(({ item }: { item: Post }) => {
    const name = item.profile?.full_name || item.profile?.username || "User";
    const firstMedia = item.media_urls?.[0];

    return (
      <View style={styles.postCard}>
        <Text style={styles.author}>{name}</Text>
        <Text style={styles.time}>{formatTimeAgo(item.created_at)}</Text>

        {!!item.content && <Text style={styles.content}>{item.content}</Text>}

        {firstMedia ? (
          <Image source={{ uri: firstMedia }} style={styles.mediaHero} />
        ) : null}
      </View>
    );
  }, []);

  const renderMember = useCallback(({ item }: { item: Member }) => {
    const name = item.profile?.full_name || item.profile?.username || "Member";
    return (
      <View style={styles.simpleRow}>
        <Text style={{ fontWeight: "800" }}>{name}</Text>
        {!!item.profile?.username && (
          <Text style={{ color: "#6B7280", marginTop: 2 }}>
            @{item.profile.username}
          </Text>
        )}
      </View>
    );
  }, []);

  const renderRule = useCallback(({ item }: { item: Rule }) => {
    return (
      <View style={styles.simpleRow}>
        <Text style={{ fontWeight: "900" }}>{item.title}</Text>
        {!!item.description && (
          <Text style={{ color: "#6B7280", marginTop: 6 }}>
            {item.description}
          </Text>
        )}
      </View>
    );
  }, []);

  const renderMedia = useCallback(({ item }: { item: MediaGridItem }) => {
    return (
      <View style={styles.simpleRow}>
        <Text style={{ fontWeight: "800" }}>
          {item.type.toUpperCase()} • {item.postId}
        </Text>
        <Text style={{ color: "#6B7280", marginTop: 6 }} numberOfLines={1}>
          {item.url}
        </Text>
      </View>
    );
  }, []);

  /* ----------------------------- ui ----------------------------- */

  const isLocked = useMemo(() => {
    if (!community) return false;

    // If your schema doesn't have is_private, don't lock
    const isPrivate = normalizeBool(community.is_private);
    if (!isPrivate) return false;

    if (!user?.id) return true;

    const isOwner = !!community.owner_id && community.owner_id === user.id;
    if (isOwner) return false;

    return !isJoined;
  }, [community, user?.id, isJoined]);

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  if (!community) {
    return (
      <SafeAreaView style={styles.center}>
        <Text>Community not found</Text>
      </SafeAreaView>
    );
  }

  const showPrivatePill = normalizeBool(community.is_private);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{community.name}</Text>
          {!!community.description && (
            <Text style={styles.subtitle} numberOfLines={1}>
              {community.description}
            </Text>
          )}
        </View>

        {showPrivatePill && (
          <View style={styles.privatePill}>
            <Ionicons name="lock-closed" size={14} color="#7C3AED" />
            <Text style={styles.privatePillText}>Private</Text>
          </View>
        )}
      </View>

      {/* Optional community image */}
      {!!community.image_url && (
        <View style={{ paddingHorizontal: 14, paddingTop: 10 }}>
          <Image
            source={{ uri: community.image_url }}
            style={styles.communityHero}
          />
        </View>
      )}

      {/* Locked State */}
      {isLocked ? (
        <View style={styles.lockedContainer}>
          <Ionicons name="lock-closed" size={40} color="#7C3AED" />
          <Text style={styles.lockedTitle}>This community is private</Text>
          <Text style={styles.lockedSubtitle}>
            Join to view posts, members, rules, and media.
          </Text>
        </View>
      ) : (
        <>
          {/* Tabs */}
          <View style={styles.tabs}>
            {(["feed", "members", "rules", "media"] as const).map((t) => (
              <TouchableOpacity key={t} onPress={() => setActiveTab(t)}>
                <Text style={activeTab === t ? styles.tabActive : styles.tab}>
                  {t.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Content */}
          {activeTab === "feed" && (
            <FlatList<Post>
              data={posts}
              keyExtractor={(i) => i.id}
              renderItem={renderPost}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
              windowSize={9}
              removeClippedSubviews
              contentContainerStyle={{ padding: 14 }}
              ListEmptyComponent={
                <View style={styles.centerPad}>
                  <Text style={{ color: "#6B7280" }}>No posts yet.</Text>
                </View>
              }
            />
          )}

          {activeTab === "members" && (
            <FlatList<Member>
              data={members}
              keyExtractor={(i) => i.user_id}
              renderItem={renderMember}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
              windowSize={9}
              removeClippedSubviews
              contentContainerStyle={{ padding: 14 }}
              ListEmptyComponent={
                <View style={styles.centerPad}>
                  <Text style={{ color: "#6B7280" }}>No members found.</Text>
                </View>
              }
            />
          )}

          {activeTab === "rules" && (
            <FlatList<Rule>
              data={rules}
              keyExtractor={(i) => i.id}
              renderItem={renderRule}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
              windowSize={9}
              removeClippedSubviews
              contentContainerStyle={{ padding: 14 }}
              ListEmptyComponent={
                <View style={styles.centerPad}>
                  <Text style={{ color: "#6B7280" }}>No rules set.</Text>
                </View>
              }
            />
          )}

          {activeTab === "media" && (
            <FlatList<MediaGridItem>
              data={media}
              keyExtractor={(i) => `${i.postId}:${i.url}`}
              renderItem={renderMedia}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
              windowSize={9}
              removeClippedSubviews
              contentContainerStyle={{ padding: 14 }}
              ListEmptyComponent={
                <View style={styles.centerPad}>
                  <Text style={{ color: "#6B7280" }}>No media yet.</Text>
                </View>
              }
            />
          )}
        </>
      )}
    </SafeAreaView>
  );
}

/* ----------------------------- styles ----------------------------- */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  centerPad: { padding: 24, alignItems: "center" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  title: { fontSize: 16, fontWeight: "900" },
  subtitle: { fontSize: 12, color: "#6B7280", marginTop: 2 },

  communityHero: {
    width: "100%",
    height: 160,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
  },

  privatePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#E8E0FF",
  },
  privatePillText: { color: "#7C3AED", fontWeight: "900", fontSize: 12 },

  lockedContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  lockedTitle: { marginTop: 12, fontSize: 18, fontWeight: "900" },
  lockedSubtitle: {
    marginTop: 8,
    textAlign: "center",
    color: "#6B7280",
    lineHeight: 20,
  },

  tabs: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  tab: { color: "#6B7280", fontWeight: "700" },
  tabActive: { color: "#7C3AED", fontWeight: "900" },

  postCard: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  author: { fontWeight: "900" },
  time: { fontSize: 12, color: "#6B7280" },
  content: { marginTop: 6 },
  mediaHero: { marginTop: 10, height: 220, borderRadius: 12 },

  simpleRow: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
});
