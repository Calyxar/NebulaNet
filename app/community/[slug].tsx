// app/community/[slug].tsx — COMPLETED + UPDATED ✅
import AppHeader from "@/components/navigation/AppHeader";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import { deleteCommunityRequest } from "@/lib/firestore/deleteCommunity";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
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
  useWindowDimensions,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

type ProfileMini = {
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
};

type Community = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  image_url: string | null;
  member_count: number | null;
  created_at?: string;
  updated_at?: string;
  is_private?: boolean | null;
  owner_id?: string | null;
  banner_url?: string | null;
};

type Post = {
  id: string;
  user_id: string;
  community_id: string | null;
  content: string | null;
  media_urls: string[] | null;
  created_at: string;
  profile: ProfileMini | null;
};

type Member = {
  user_id: string;
  joined_at?: string | null;
  profile: ProfileMini | null;
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

const isVideoUrl = (url: string) => /\.(mp4|mov|m4v|webm|mkv|avi)$/i.test(url);

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

function safeFirstLetter(name: string) {
  const s = (name ?? "").trim();
  return (s[0] ?? "U").toUpperCase();
}

export default function CommunityScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { colors, isDark } = useTheme();

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
  const [joining, setJoining] = useState(false);
  const [deletingCommunity, setDeletingCommunity] = useState(false);

  const heroHeight = useMemo(
    () => Math.round(Math.min(200, Math.max(140, width * 0.42))),
    [width],
  );

  const fetchCommunityBySlug = useCallback(async (slugValue: string) => {
    const snap = await getDocs(
      query(
        collection(db, "communities"),
        where("slug", "==", slugValue),
        limit(1),
      ),
    );
    if (snap.empty) throw new Error("Community not found");
    const d = snap.docs[0];
    return { id: d.id, ...d.data() } as unknown as Community;
  }, []);

  const fetchMembersSafe = useCallback(async (communityId: string) => {
    const membersSnap = await getDocs(
      query(
        collection(db, "community_members"),
        where("community_id", "==", communityId),
      ),
    );
    const memberProfiles = await Promise.all(
      membersSnap.docs.map(async (d) => {
        const data = d.data() as any;
        const pSnap = await getDoc(doc(db, "profiles", data.user_id));
        const p = pSnap.exists() ? (pSnap.data() as any) : null;
        return {
          user_id: data.user_id,
          joined_at: data.joined_at ?? null,
          profile: p
            ? {
                username: p.username,
                full_name: p.full_name ?? null,
                avatar_url: p.avatar_url ?? null,
              }
            : null,
        };
      }),
    );
    return memberProfiles as Member[];
  }, []);

  const loadCommunity = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    try {
      const c = await fetchCommunityBySlug(slug);
      setCommunity(c);

      let joined = false;
      let moderator = false;
      const ownerId = c.owner_id ?? null;

      if (user?.uid) {
        const [memberSnap, modSnap] = await Promise.all([
          getDocs(
            query(
              collection(db, "community_members"),
              where("community_id", "==", c.id),
              where("user_id", "==", user.uid),
              limit(1),
            ),
          ),
          getDocs(
            query(
              collection(db, "community_moderators"),
              where("community_id", "==", c.id),
              where("user_id", "==", user.uid),
              limit(1),
            ),
          ),
        ]);

        // ✅ FIX: use user.uid not user.id
        joined = !memberSnap.empty || (!!ownerId && ownerId === user.uid);
        moderator = !modSnap.empty || (!!ownerId && ownerId === user.uid);
      }

      setIsJoined(joined);
      setIsModerator(moderator);

      const isPrivate = normalizeBool(c.is_private);
      // ✅ FIX: use user.uid not user.id
      const isOwner = !!ownerId && ownerId === user?.uid;
      const canViewPrivate = !isPrivate || joined || isOwner;

      const [postsTyped, rulesTyped, membersTyped] = await Promise.all([
        canViewPrivate
          ? getDocs(
              query(collection(db, "posts"), where("community_id", "==", c.id)),
            ).then(
              (snap) =>
                snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Post[],
            )
          : Promise.resolve([] as Post[]),

        canViewPrivate
          ? getDocs(
              query(
                collection(db, "community_rules"),
                where("community_id", "==", c.id),
              ),
            ).then(
              (snap) =>
                snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Rule[],
            )
          : Promise.resolve([] as Rule[]),

        canViewPrivate
          ? fetchMembersSafe(c.id)
          : Promise.resolve([] as Member[]),
      ]);

      setPosts(postsTyped);
      setRules(rulesTyped);
      setMembers(membersTyped);

      const grid: MediaGridItem[] = [];
      postsTyped.forEach((p) => {
        (p.media_urls ?? []).forEach((url) => {
          grid.push({
            postId: p.id,
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
  }, [slug, user?.uid, fetchCommunityBySlug, fetchMembersSafe]);

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

  const bumpMemberCount = useCallback(
    async (delta: number) => {
      if (!community?.id) return;
      try {
        const current =
          typeof community.member_count === "number"
            ? community.member_count
            : 0;
        const next = Math.max(0, current + delta);
        await updateDoc(doc(db, "communities", community.id), {
          member_count: next,
        });
        setCommunity((prev) => (prev ? { ...prev, member_count: next } : prev));
      } catch {
        // ignore
      }
    },
    [community?.id, community?.member_count],
  );

  const joinCommunity = useCallback(async () => {
    if (!community?.id) return;
    // ✅ FIX: use user?.uid not user?.id
    if (!user?.uid) {
      Alert.alert("Sign in required", "Log in to join communities.");
      return;
    }

    setJoining(true);
    try {
      await addDoc(collection(db, "community_members"), {
        community_id: community.id,
        user_id: user.uid,
        joined_at: serverTimestamp(),
      });
      setIsJoined(true);
      await bumpMemberCount(+1);
      await loadCommunity();
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to join.");
    } finally {
      setJoining(false);
    }
  }, [community?.id, user?.uid, loadCommunity, bumpMemberCount]);

  const leaveCommunity = useCallback(async () => {
    // ✅ FIX: use user?.uid throughout
    if (!community?.id || !user?.uid) return;

    if (community.owner_id && community.owner_id === user.uid) {
      Alert.alert("Owner", "You can't leave a community you own.");
      return;
    }

    setJoining(true);
    try {
      const leaveSnap = await getDocs(
        query(
          collection(db, "community_members"),
          where("community_id", "==", community.id),
          where("user_id", "==", user.uid),
        ),
      );
      await Promise.all(leaveSnap.docs.map((d) => deleteDoc(d.ref)));
      setIsJoined(false);
      await bumpMemberCount(-1);
      await loadCommunity();
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to leave.");
    } finally {
      setJoining(false);
    }
  }, [
    community?.id,
    community?.owner_id,
    user?.uid,
    loadCommunity,
    bumpMemberCount,
  ]);

  const confirmDeleteCommunity = useCallback(() => {
    if (!community?.id || !community?.slug) return;

    Alert.alert(
      "Delete community?",
      "This will permanently remove the community, members, rules, and posts.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setDeletingCommunity(true);
              await deleteCommunityRequest(community.id);
              Alert.alert("Deleted", "Community deleted successfully.");
              router.replace("/(tabs)/explore");
            } catch (e: unknown) {
              const msg =
                e instanceof Error ? e.message : "Failed to delete community.";
              Alert.alert("Error", msg);
            } finally {
              setDeletingCommunity(false);
            }
          },
        },
      ],
    );
  }, [community?.id, community?.slug]);

  // ✅ FIX: use user?.uid throughout
  const isOwner = useMemo(
    () => !!community?.owner_id && community.owner_id === user?.uid,
    [community?.owner_id, user?.uid],
  );

  const canManage = isOwner || isModerator;

  const isLocked = useMemo(() => {
    if (!community) return false;
    const isPrivate = normalizeBool(community.is_private);
    if (!isPrivate) return false;
    if (!user?.uid) return true;
    if (isOwner) return false;
    return !isJoined;
  }, [community, user?.uid, isOwner, isJoined]);

  const memberCountLabel = useMemo(() => {
    const n =
      typeof community?.member_count === "number"
        ? community.member_count
        : members.length
          ? members.length
          : null;
    if (typeof n === "number") return `${n} member${n === 1 ? "" : "s"}`;
    return "";
  }, [community?.member_count, members.length]);

  const renderPost = useCallback(
    ({ item }: { item: Post }) => {
      const name = item.profile?.full_name || item.profile?.username || "User";
      const avatar = item.profile?.avatar_url;
      const firstMedia = item.media_urls?.[0] ?? null;

      return (
        <TouchableOpacity
          activeOpacity={0.92}
          onPress={() => router.push(`/post/${item.id}` as any)}
          style={[
            styles.postCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              shadowOpacity: isDark ? 0.22 : 0.05,
            },
          ]}
        >
          <View style={styles.postTop}>
            <View style={styles.authorRow}>
              {avatar ? (
                <Image source={{ uri: avatar }} style={styles.avatar} />
              ) : (
                <View
                  style={[
                    styles.avatar,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text style={{ color: colors.primary, fontWeight: "900" }}>
                    {safeFirstLetter(name)}
                  </Text>
                </View>
              )}

              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  style={[styles.author, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {name}
                </Text>
                <Text style={[styles.time, { color: colors.textTertiary }]}>
                  {formatTimeAgo(item.created_at)}
                </Text>
              </View>
            </View>

            <Ionicons
              name="chevron-forward"
              size={16}
              color={colors.textTertiary}
            />
          </View>

          {!!item.content && (
            <Text
              style={[styles.content, { color: colors.text }]}
              numberOfLines={6}
            >
              {item.content}
            </Text>
          )}

          {!!firstMedia && (
            <View
              style={[styles.mediaWrap, { backgroundColor: colors.surface }]}
            >
              <Image source={{ uri: firstMedia }} style={styles.mediaHero} />
              {isVideoUrl(firstMedia) && (
                <View style={styles.playOverlay}>
                  <Ionicons name="play" size={22} color="#fff" />
                </View>
              )}
            </View>
          )}
        </TouchableOpacity>
      );
    },
    [colors, isDark],
  );

  const numColumns = 3;
  const gap = 10;

  const gridSide = useMemo(() => {
    const pad = 14 * 2;
    const totalGaps = gap * (numColumns - 1);
    return Math.floor((width - pad - totalGaps) / numColumns);
  }, [width]);

  const renderMedia = useCallback(
    ({ item }: { item: MediaGridItem }) => {
      const isVideo = item.type === "video";
      return (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => router.push(`/post/${item.postId}` as any)}
          style={{
            width: gridSide,
            height: gridSide,
            borderRadius: 14,
            overflow: "hidden",
            backgroundColor: colors.surface,
          }}
        >
          <Image
            source={{ uri: item.url }}
            style={{ width: "100%", height: "100%" }}
          />
          {isVideo && (
            <View style={styles.mediaBadge}>
              <Ionicons name="videocam" size={14} color="#fff" />
            </View>
          )}
        </TouchableOpacity>
      );
    },
    [gridSide, colors.surface],
  );

  if (loading) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: colors.background }}
        edges={["top", "left", "right"]}
      >
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!community) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: colors.background }}
        edges={["top", "left", "right"]}
      >
        <View style={styles.center}>
          <Text style={{ color: colors.text }}>Community not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const showPrivatePill = normalizeBool(community.is_private);

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={["top", "left", "right"]}
    >
      <AppHeader
        backgroundColor={colors.background}
        leftWide={
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              flex: 1,
              minWidth: 0,
            }}
          >
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.back()}
              style={[
                styles.iconCircle,
                {
                  backgroundColor: colors.card,
                  shadowOpacity: isDark ? 0.22 : 0.06,
                },
              ]}
            >
              <Ionicons name="arrow-back" size={20} color={colors.text} />
            </TouchableOpacity>

            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                style={[styles.headerTitle, { color: colors.text }]}
                numberOfLines={1}
              >
                {community.name}
              </Text>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  marginTop: 4,
                }}
              >
                {!!memberCountLabel && (
                  <Text
                    style={{
                      color: colors.textTertiary,
                      fontWeight: "800",
                      fontSize: 12,
                    }}
                  >
                    {memberCountLabel}
                  </Text>
                )}

                {showPrivatePill && (
                  <View
                    style={[
                      styles.privatePill,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name="lock-closed"
                      size={12}
                      color={colors.primary}
                    />
                    <Text
                      style={{
                        color: colors.primary,
                        fontWeight: "900",
                        fontSize: 12,
                      }}
                    >
                      Private
                    </Text>
                  </View>
                )}
              </View>

              {!!community.description && (
                <Text
                  style={[styles.headerSub, { color: colors.textTertiary }]}
                  numberOfLines={1}
                >
                  {community.description}
                </Text>
              )}
            </View>
          </View>
        }
        right={
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            {!isOwner && (
              <TouchableOpacity
                onPress={isJoined ? leaveCommunity : joinCommunity}
                disabled={joining}
                activeOpacity={0.85}
                style={[
                  styles.joinBtn,
                  {
                    backgroundColor: isJoined ? colors.card : colors.primary,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text
                  style={{
                    color: isJoined ? colors.primary : "#fff",
                    fontWeight: "900",
                    fontSize: 12,
                  }}
                >
                  {joining ? "..." : isJoined ? "Joined" : "Join"}
                </Text>
              </TouchableOpacity>
            )}

            {isOwner && (
              <TouchableOpacity
                onPress={confirmDeleteCommunity}
                disabled={deletingCommunity}
                activeOpacity={0.85}
                style={[
                  styles.manageBtn,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Ionicons name="trash-outline" size={16} color="#EF4444" />
              </TouchableOpacity>
            )}

            {canManage && (
              <TouchableOpacity
                onPress={() =>
                  router.push(`/community/${community.slug}/manage` as any)
                }
                activeOpacity={0.85}
                style={[
                  styles.manageBtn,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Ionicons
                  name="settings-outline"
                  size={16}
                  color={colors.text}
                />
              </TouchableOpacity>
            )}
          </View>
        }
      />

      {!!community.image_url && (
        <View style={{ paddingHorizontal: 14, paddingBottom: 10 }}>
          <Image
            source={{ uri: community.image_url }}
            style={[
              styles.hero,
              {
                height: heroHeight,
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          />
        </View>
      )}

      {isLocked ? (
        <View
          style={[
            styles.lockedContainer,
            { paddingBottom: 20 + insets.bottom },
          ]}
        >
          <View
            style={[
              styles.lockIcon,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Ionicons name="lock-closed" size={28} color={colors.primary} />
          </View>

          <Text
            style={{
              color: colors.text,
              fontSize: 18,
              fontWeight: "900",
              marginTop: 12,
            }}
          >
            This community is private
          </Text>
          <Text
            style={{
              color: colors.textTertiary,
              marginTop: 8,
              textAlign: "center",
              lineHeight: 20,
            }}
          >
            Join to view posts, members, rules, and media.
          </Text>

          <TouchableOpacity
            style={[styles.lockJoinBtn, { backgroundColor: colors.primary }]}
            onPress={joinCommunity}
            activeOpacity={0.9}
            disabled={joining}
          >
            <Text style={{ color: "#fff", fontWeight: "900" }}>
              {joining ? "Joining..." : "Join Community"}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Tabs */}
          <View
            style={[
              styles.tabsWrap,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                shadowOpacity: isDark ? 0.22 : 0.05,
              },
            ]}
          >
            {(["feed", "members", "rules", "media"] as const).map((t) => {
              const active = activeTab === t;
              return (
                <TouchableOpacity
                  key={t}
                  onPress={() => setActiveTab(t)}
                  activeOpacity={0.85}
                  style={[
                    styles.tabBtn,
                    active && { backgroundColor: colors.primary },
                  ]}
                >
                  <Text
                    style={{
                      color: active ? "#fff" : colors.textTertiary,
                      fontWeight: "900",
                      fontSize: 12,
                    }}
                  >
                    {t.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {activeTab === "feed" && (
            <FlatList<Post>
              data={posts}
              keyExtractor={(i) => i.id}
              renderItem={renderPost}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={colors.primary}
                />
              }
              contentContainerStyle={{
                padding: 14,
                paddingBottom: 14 + insets.bottom,
              }}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.centerPad}>
                  <Text
                    style={{ color: colors.textTertiary, fontWeight: "800" }}
                  >
                    No posts yet.
                  </Text>
                </View>
              }
            />
          )}

          {activeTab === "members" && (
            <FlatList<Member>
              data={members}
              keyExtractor={(i) => i.user_id}
              renderItem={({ item }) => {
                const name =
                  item.profile?.full_name || item.profile?.username || "Member";
                return (
                  <View
                    style={[
                      styles.rowCard,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    {item.profile?.avatar_url ? (
                      <Image
                        source={{ uri: item.profile.avatar_url }}
                        style={styles.memberAvatar}
                      />
                    ) : (
                      <View
                        style={[
                          styles.memberAvatar,
                          {
                            backgroundColor: colors.surface,
                            borderColor: colors.border,
                          },
                        ]}
                      >
                        <Text
                          style={{ color: colors.primary, fontWeight: "900" }}
                        >
                          {safeFirstLetter(name)}
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
                        style={[styles.rowSub, { color: colors.textTertiary }]}
                        numberOfLines={1}
                      >
                        {item.profile?.username
                          ? `@${item.profile.username}`
                          : " "}
                      </Text>
                    </View>
                  </View>
                );
              }}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={colors.primary}
                />
              }
              contentContainerStyle={{
                padding: 14,
                gap: 10,
                paddingBottom: 14 + insets.bottom,
              }}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.centerPad}>
                  <Text
                    style={{ color: colors.textTertiary, fontWeight: "800" }}
                  >
                    No members found.
                  </Text>
                </View>
              }
            />
          )}

          {activeTab === "rules" && (
            <FlatList<Rule>
              data={rules}
              keyExtractor={(i) => i.id}
              renderItem={({ item }) => (
                <View
                  style={[
                    styles.rowCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowTitle, { color: colors.text }]}>
                      {item.title}
                    </Text>
                    {!!item.description && (
                      <Text
                        style={[
                          styles.ruleBody,
                          { color: colors.textTertiary },
                        ]}
                      >
                        {item.description}
                      </Text>
                    )}
                  </View>
                </View>
              )}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={colors.primary}
                />
              }
              contentContainerStyle={{
                padding: 14,
                gap: 10,
                paddingBottom: 14 + insets.bottom,
              }}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.centerPad}>
                  <Text
                    style={{ color: colors.textTertiary, fontWeight: "800" }}
                  >
                    No rules set.
                  </Text>
                </View>
              }
            />
          )}

          {activeTab === "media" && (
            <FlatList<MediaGridItem>
              data={media}
              keyExtractor={(i) => `${i.postId}:${i.url}`}
              numColumns={3}
              columnWrapperStyle={{ gap: 10 }}
              contentContainerStyle={{
                padding: 14,
                gap: 10,
                paddingBottom: 14 + insets.bottom,
              }}
              renderItem={renderMedia}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={colors.primary}
                />
              }
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.centerPad}>
                  <Text
                    style={{ color: colors.textTertiary, fontWeight: "800" }}
                  >
                    No media yet.
                  </Text>
                </View>
              }
            />
          )}
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  centerPad: { paddingVertical: 28, alignItems: "center" },

  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 16,
    elevation: 2,
  },

  headerTitle: { fontSize: 18, fontWeight: "900" },
  headerSub: { marginTop: 6, fontSize: 12.5, fontWeight: "700" },

  privatePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },

  joinBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 86,
  },

  manageBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  hero: { width: "100%", borderRadius: 18, borderWidth: 1 },

  tabsWrap: {
    marginHorizontal: 14,
    marginTop: 6,
    marginBottom: 12,
    borderRadius: 24,
    borderWidth: 1,
    padding: 6,
    flexDirection: "row",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 16,
    elevation: 2,
  },
  tabBtn: {
    flex: 1,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },

  postCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 16,
    elevation: 2,
  },
  postTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  author: { fontSize: 14, fontWeight: "900" },
  time: { fontSize: 12, fontWeight: "700", marginTop: 2 },
  content: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
    fontWeight: "600",
  },

  mediaWrap: {
    width: "100%",
    height: 220,
    borderRadius: 18,
    overflow: "hidden",
    position: "relative",
  },
  mediaHero: { width: "100%", height: "100%" },
  playOverlay: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginLeft: -22,
    marginTop: -22,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },

  rowCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  rowTitle: { fontSize: 14, fontWeight: "900" },
  rowSub: { fontSize: 12, fontWeight: "800", marginTop: 3 },
  ruleBody: { marginTop: 8, fontSize: 12.5, fontWeight: "700", lineHeight: 18 },

  mediaBadge: {
    position: "absolute",
    right: 8,
    bottom: 8,
    backgroundColor: "rgba(0,0,0,0.45)",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 999,
  },

  lockedContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  lockIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  lockJoinBtn: {
    marginTop: 16,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
});
