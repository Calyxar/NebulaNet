// app/community/[slug].tsx — FIXED ✅
// Fix 1: Members now show username AND joined date
// Fix 2: fetchMembersSafe guards pSnap.exists() properly
// Fix 3: Media grid falls back to camelCase mediaUrls + added debug
// Fix 4: See create-post screen (paste that file separately)
// ✅ FIXED: this file was using the legacy Web SDK (`db` from
//    @/lib/firebase) for every Firestore call — same pattern found in
//    app/profile/requests.tsx and app/profile/blocked.tsx, apparently
//    missed in the project's migration to @react-native-firebase. Now uses
//    firestore() throughout, matching the rest of the app.
// ✅ FIXED: the comment above the pSnap existence check said "use .exists
//    (not .exists())" — that's backwards for this project's Firestore
//    typings (confirmed earlier via the TS compiler: .exists() must be
//    called as a function here) and directly contradicted the code right
//    below it, which was already correctly calling `.exists()`. Comment
//    corrected so it doesn't mislead a future edit into "fixing" working
//    code, which is exactly what happened once already in this project.
// ✅ REDESIGNED: this screen had no LinearGradient background and no
//    uiScale/fontScale — brought onto the same blue-gradient / scaled-
//    sizing pattern used by Profile, Explore, and the rest of the redesign.

import AppHeader from "@/components/navigation/AppHeader";
import { useAuth } from "@/hooks/useAuth";
import { deleteCommunityRequest } from "@/lib/firestore/deleteCommunity";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import firestore from "@react-native-firebase/firestore";
import { LinearGradient } from "expo-linear-gradient";
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
  // FIX 3: accept both snake_case and camelCase
  media_urls: string[] | null;
  mediaUrls?: string[] | null;
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

// FIX 1: formats joined_at whether it's a Firestore Timestamp or ISO string
const formatJoinedDate = (joined_at: any): string | null => {
  if (!joined_at) return null;
  try {
    // @react-native-firebase Timestamps have .toDate()
    const date =
      typeof joined_at?.toDate === "function"
        ? joined_at.toDate()
        : new Date(joined_at);
    if (isNaN(date.getTime())) return null;
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return null;
  }
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
  const { colors, isDark, uiScale, fontScale } = useTheme();

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

  const gradientColors = isDark
    ? [colors.background, colors.background, colors.background]
    : (["#DCEBFF", "#EEF4FF", "#FFFFFF"] as const);

  const heroHeight = useMemo(
    () => Math.round(Math.min(200, Math.max(140, width * 0.42))),
    [width],
  );

  const fetchCommunityBySlug = useCallback(async (slugValue: string) => {
    // ✅ FIX: firestore() (native SDK), was db.collection(...) (legacy Web SDK)
    const snap = await firestore()
      .collection("communities")
      .where("slug", "==", slugValue)
      .limit(1)
      .get();
    if (snap.empty) throw new Error("Community not found");
    const d = snap.docs[0];
    return { id: d.id, ...d.data() } as unknown as Community;
  }, []);

  // FIX 2: properly guard pSnap.exists() before calling .data()
  const fetchMembersSafe = useCallback(async (communityId: string) => {
    const membersSnap = await firestore()
      .collection("community_members")
      .where("community_id", "==", communityId)
      .get();

    const memberProfiles = await Promise.all(
      membersSnap.docs.map(async (d) => {
        const data = d.data() as any;
        try {
          const pSnap = await firestore()
            .collection("profiles")
            .doc(data.user_id)
            .get();
          // ✅ .exists() is called as a function — confirmed correct for
          // this project's @react-native-firebase typings.
          const p = pSnap.exists() ? (pSnap.data() as any) : null;
          return {
            user_id: data.user_id,
            // ✅ FIX 1: preserve the raw joined_at value (Timestamp or string)
            joined_at: data.joined_at ?? null,
            profile: p
              ? {
                  username: p.username ?? null,
                  full_name: p.full_name ?? null,
                  avatar_url: p.avatar_url ?? null,
                }
              : null,
          };
        } catch {
          // profile fetch failed — still show member with user_id
          return {
            user_id: data.user_id,
            joined_at: data.joined_at ?? null,
            profile: null,
          };
        }
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
        try {
          const [memberSnap, modSnap] = await Promise.all([
            firestore()
              .collection("community_members")
              .where("community_id", "==", c.id)
              .where("user_id", "==", user.uid)
              .limit(1)
              .get(),
            firestore()
              .collection("community_moderators")
              .where("community_id", "==", c.id)
              .where("user_id", "==", user.uid)
              .limit(1)
              .get(),
          ]);
          joined = !memberSnap.empty || (!!ownerId && ownerId === user.uid);
          moderator = !modSnap.empty || (!!ownerId && ownerId === user.uid);
        } catch {
          joined = !!ownerId && ownerId === user.uid;
          moderator = joined;
        }
      }

      setIsJoined(joined);
      setIsModerator(moderator);

      const isPrivate = normalizeBool(c.is_private);
      const isOwner = !!ownerId && ownerId === user?.uid;
      const canViewPrivate = !isPrivate || joined || isOwner;

      const [postsTyped, rulesTyped, membersTyped] = await Promise.all([
        canViewPrivate
          ? firestore()
              .collection("posts")
              .where("community_id", "==", c.id)
              .orderBy("created_at", "desc")
              .get()
              .then(
                (snap) =>
                  snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Post[],
              )
          : Promise.resolve([] as Post[]),
        canViewPrivate
          ? firestore()
              .collection("community_rules")
              .where("community_id", "==", c.id)
              .get()
              .then(
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

      // FIX 3: fall back to camelCase field name if snake_case is empty
      const grid: MediaGridItem[] = [];
      postsTyped.forEach((p) => {
        const urls: string[] =
          (p.media_urls && p.media_urls.length > 0
            ? p.media_urls
            : (p as any).mediaUrls) ?? [];
        urls.forEach((url) => {
          grid.push({
            postId: p.id,
            url,
            type: isVideoUrl(url) ? "video" : "image",
          });
        });
      });
      setMedia(grid);

      // ── TEMP DEBUG — remove once media is confirmed working ──
      if (__DEV__) {
        console.log(
          "[Media Debug] posts with media:",
          postsTyped
            .filter(
              (p) =>
                (p.media_urls?.length ?? 0) > 0 ||
                ((p as any).mediaUrls?.length ?? 0) > 0,
            )
            .map((p) => ({
              id: p.id,
              media_urls: p.media_urls,
              mediaUrls: (p as any).mediaUrls,
            })),
        );
        console.log("[Media Debug] grid items:", grid.length);
      }
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
        await firestore()
          .collection("communities")
          .doc(community.id)
          .update({ member_count: next });
        setCommunity((prev) => (prev ? { ...prev, member_count: next } : prev));
      } catch {
        // ignore
      }
    },
    [community?.id, community?.member_count],
  );

  const joinCommunity = useCallback(async () => {
    if (!community?.id) return;
    if (!user?.uid) {
      Alert.alert("Sign in required", "Log in to join communities.");
      return;
    }
    setJoining(true);
    try {
      await firestore().collection("community_members").add({
        community_id: community.id,
        user_id: user.uid,
        joined_at: firestore.FieldValue.serverTimestamp(),
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
    if (!community?.id || !user?.uid) return;
    if (community.owner_id && community.owner_id === user.uid) {
      Alert.alert("Owner", "You can't leave a community you own.");
      return;
    }
    setJoining(true);
    try {
      const leaveSnap = await firestore()
        .collection("community_members")
        .where("community_id", "==", community.id)
        .where("user_id", "==", user.uid)
        .get();
      await Promise.all(leaveSnap.docs.map((d) => d.ref.delete()));
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
      const firstMedia =
        item.media_urls?.[0] ?? (item as any).mediaUrls?.[0] ?? null;

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
              borderRadius: 22 * uiScale,
              padding: 14 * uiScale,
              marginBottom: 12 * uiScale,
            },
          ]}
        >
          <View style={[styles.postTop, { marginBottom: 10 * uiScale }]}>
            <View style={[styles.authorRow, { gap: 10 * uiScale }]}>
              {avatar ? (
                <Image
                  source={{ uri: avatar }}
                  style={[
                    styles.avatar,
                    {
                      width: 40 * uiScale,
                      height: 40 * uiScale,
                      borderRadius: 20 * uiScale,
                    },
                  ]}
                />
              ) : (
                <View
                  style={[
                    styles.avatar,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      width: 40 * uiScale,
                      height: 40 * uiScale,
                      borderRadius: 20 * uiScale,
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
                  style={[
                    styles.author,
                    { color: colors.text, fontSize: 14 * fontScale },
                  ]}
                  numberOfLines={1}
                >
                  {name}
                </Text>
                <Text
                  style={[
                    styles.time,
                    { color: colors.textTertiary, fontSize: 12 * fontScale },
                  ]}
                >
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
              style={[
                styles.content,
                { color: colors.text, fontSize: 14 * fontScale },
              ]}
              numberOfLines={6}
            >
              {item.content}
            </Text>
          )}

          {!!firstMedia && (
            <View
              style={[
                styles.mediaWrap,
                {
                  backgroundColor: colors.surface,
                  height: 220 * uiScale,
                  borderRadius: 18 * uiScale,
                },
              ]}
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
    [colors, isDark, uiScale, fontScale],
  );

  const numColumns = 3;
  const gap = 10 * uiScale;

  const gridSide = useMemo(() => {
    const pad = 14 * uiScale * 2;
    const totalGaps = gap * (numColumns - 1);
    return Math.floor((width - pad - totalGaps) / numColumns);
  }, [width, uiScale, gap]);

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
            borderRadius: 14 * uiScale,
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
    [gridSide, colors.surface, uiScale],
  );

  if (loading) {
    return (
      <LinearGradient
        colors={gradientColors as any}
        locations={[0, 0.42, 1]}
        style={{ flex: 1 }}
      >
        <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (!community) {
    return (
      <LinearGradient
        colors={gradientColors as any}
        locations={[0, 0.42, 1]}
        style={{ flex: 1 }}
      >
        <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
          <View style={styles.center}>
            <Text style={{ color: colors.text }}>Community not found</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  const showPrivatePill = normalizeBool(community.is_private);

  return (
    <LinearGradient
      colors={gradientColors as any}
      locations={[0, 0.42, 1]}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
        <AppHeader
          backgroundColor="transparent"
          leftWide={
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12 * uiScale,
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
                    width: 44 * uiScale,
                    height: 44 * uiScale,
                    borderRadius: 22 * uiScale,
                  },
                ]}
              >
                <Ionicons name="arrow-back" size={20} color={colors.text} />
              </TouchableOpacity>

              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  style={[
                    styles.headerTitle,
                    { color: colors.text, fontSize: 18 * fontScale },
                  ]}
                  numberOfLines={1}
                >
                  {community.name}
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8 * uiScale,
                    marginTop: 4 * uiScale,
                  }}
                >
                  {!!memberCountLabel && (
                    <Text
                      style={{
                        color: colors.textTertiary,
                        fontWeight: "800",
                        fontSize: 12 * fontScale,
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
                          fontSize: 12 * fontScale,
                        }}
                      >
                        Private
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          }
          right={
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10 * uiScale,
              }}
            >
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
                      paddingHorizontal: 14 * uiScale,
                      paddingVertical: 9 * uiScale,
                      minWidth: 86 * uiScale,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: isJoined ? colors.primary : "#fff",
                      fontWeight: "900",
                      fontSize: 12 * fontScale,
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
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      width: 44 * uiScale,
                      height: 44 * uiScale,
                      borderRadius: 22 * uiScale,
                    },
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
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      width: 44 * uiScale,
                      height: 44 * uiScale,
                      borderRadius: 22 * uiScale,
                    },
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
          <View
            style={{
              paddingHorizontal: 14 * uiScale,
              paddingTop: 8 * uiScale,
              paddingBottom: 6 * uiScale,
            }}
          >
            <Image
              source={{ uri: community.image_url }}
              style={[
                styles.hero,
                {
                  height: heroHeight,
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderRadius: 18 * uiScale,
                },
              ]}
            />
          </View>
        )}

        {!!community.description && (
          <Text
            style={[
              styles.headerSub,
              {
                color: colors.textTertiary,
                paddingHorizontal: 14 * uiScale,
                paddingBottom: 8 * uiScale,
                fontSize: 12.5 * fontScale,
              },
            ]}
          >
            {community.description}
          </Text>
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
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  width: 64 * uiScale,
                  height: 64 * uiScale,
                  borderRadius: 32 * uiScale,
                },
              ]}
            >
              <Ionicons name="lock-closed" size={28} color={colors.primary} />
            </View>
            <Text
              style={{
                color: colors.text,
                fontSize: 18 * fontScale,
                fontWeight: "900",
                marginTop: 12 * uiScale,
              }}
            >
              This community is private
            </Text>
            <Text
              style={{
                color: colors.textTertiary,
                marginTop: 8 * uiScale,
                textAlign: "center",
                lineHeight: 20,
                fontSize: 14 * fontScale,
              }}
            >
              Join to view posts, members, rules, and media.
            </Text>
            <TouchableOpacity
              style={[
                styles.lockJoinBtn,
                {
                  backgroundColor: colors.primary,
                  borderRadius: 16 * uiScale,
                  paddingHorizontal: 18 * uiScale,
                  paddingVertical: 12 * uiScale,
                  marginTop: 16 * uiScale,
                },
              ]}
              onPress={joinCommunity}
              activeOpacity={0.9}
              disabled={joining}
            >
              <Text
                style={{
                  color: "#fff",
                  fontWeight: "900",
                  fontSize: 14 * fontScale,
                }}
              >
                {joining ? "Joining..." : "Join Community"}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View
              style={[
                styles.tabsWrap,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  shadowOpacity: isDark ? 0.22 : 0.05,
                  marginHorizontal: 14 * uiScale,
                  marginTop: 6 * uiScale,
                  marginBottom: 12 * uiScale,
                  borderRadius: 24 * uiScale,
                  padding: 6 * uiScale,
                  gap: 8 * uiScale,
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
                      {
                        height: 38 * uiScale,
                        borderRadius: 19 * uiScale,
                      },
                      active && { backgroundColor: colors.primary },
                    ]}
                  >
                    <Text
                      style={{
                        color: active ? "#fff" : colors.textTertiary,
                        fontWeight: "900",
                        fontSize: 12 * fontScale,
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
                  padding: 14 * uiScale,
                  paddingBottom: 14 * uiScale + insets.bottom,
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
                  // FIX 1: show username AND joined date
                  const displayName =
                    item.profile?.full_name ||
                    item.profile?.username ||
                    "Unknown Member";
                  const username = item.profile?.username
                    ? `@${item.profile.username}`
                    : null;
                  const joinedDate = formatJoinedDate(item.joined_at);

                  return (
                    <View
                      style={[
                        styles.rowCard,
                        {
                          backgroundColor: colors.card,
                          borderColor: colors.border,
                          borderRadius: 18 * uiScale,
                          padding: 12 * uiScale,
                          gap: 12 * uiScale,
                        },
                      ]}
                    >
                      {item.profile?.avatar_url ? (
                        <Image
                          source={{ uri: item.profile.avatar_url }}
                          style={[
                            styles.memberAvatar,
                            {
                              width: 44 * uiScale,
                              height: 44 * uiScale,
                              borderRadius: 22 * uiScale,
                            },
                          ]}
                        />
                      ) : (
                        <View
                          style={[
                            styles.memberAvatar,
                            {
                              backgroundColor: colors.surface,
                              borderColor: colors.border,
                              width: 44 * uiScale,
                              height: 44 * uiScale,
                              borderRadius: 22 * uiScale,
                            },
                          ]}
                        >
                          <Text
                            style={{ color: colors.primary, fontWeight: "900" }}
                          >
                            {safeFirstLetter(displayName)}
                          </Text>
                        </View>
                      )}
                      <View style={{ flex: 1, minWidth: 0 }}>
                        {/* Display name (full_name or username) */}
                        <Text
                          style={[
                            styles.rowTitle,
                            { color: colors.text, fontSize: 14 * fontScale },
                          ]}
                          numberOfLines={1}
                        >
                          {displayName}
                        </Text>
                        {/* @username — only shown if different from displayName */}
                        {username && username !== displayName && (
                          <Text
                            style={[
                              styles.rowSub,
                              {
                                color: colors.textTertiary,
                                fontSize: 12 * fontScale,
                              },
                            ]}
                            numberOfLines={1}
                          >
                            {username}
                          </Text>
                        )}
                        {/* Joined date */}
                        {joinedDate && (
                          <Text
                            style={{
                              color: colors.textTertiary,
                              fontSize: 11 * fontScale,
                              fontWeight: "700",
                              marginTop: 3 * uiScale,
                            }}
                          >
                            Joined {joinedDate}
                          </Text>
                        )}
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
                  padding: 14 * uiScale,
                  gap: 10 * uiScale,
                  paddingBottom: 14 * uiScale + insets.bottom,
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
                        borderRadius: 18 * uiScale,
                        padding: 12 * uiScale,
                      },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.rowTitle,
                          { color: colors.text, fontSize: 14 * fontScale },
                        ]}
                      >
                        {item.title}
                      </Text>
                      {!!item.description && (
                        <Text
                          style={[
                            styles.ruleBody,
                            {
                              color: colors.textTertiary,
                              fontSize: 12.5 * fontScale,
                            },
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
                  padding: 14 * uiScale,
                  gap: 10 * uiScale,
                  paddingBottom: 14 * uiScale + insets.bottom,
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
                columnWrapperStyle={{ gap }}
                contentContainerStyle={{
                  padding: 14 * uiScale,
                  gap,
                  paddingBottom: 14 * uiScale + insets.bottom,
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
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  centerPad: { paddingVertical: 28, alignItems: "center" },
  iconCircle: {
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 16,
    elevation: 2,
  },
  headerTitle: { fontWeight: "900" },
  headerSub: { fontWeight: "700", marginTop: 2 },
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
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  manageBtn: {
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  hero: { width: "100%", borderWidth: 1 },
  tabsWrap: {
    borderWidth: 1,
    flexDirection: "row",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 16,
    elevation: 2,
  },
  tabBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  postCard: {
    borderWidth: 1,
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
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
  },
  avatar: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  author: { fontWeight: "900" },
  time: { fontWeight: "700", marginTop: 2 },
  content: {
    lineHeight: 20,
    marginBottom: 10,
    fontWeight: "600",
  },
  mediaWrap: {
    width: "100%",
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
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  memberAvatar: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  rowTitle: { fontWeight: "900" },
  rowSub: { fontWeight: "800", marginTop: 3 },
  ruleBody: { marginTop: 8, fontWeight: "700", lineHeight: 18 },
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
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  lockJoinBtn: {},
});
