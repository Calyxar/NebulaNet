// app/user/[username].tsx — UPDATED ✅ edges fix + LinearGradient + Media tab + post thumbnails
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import { createOrOpenChat } from "@/lib/firestore/createOrOpenChat";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  query,
  where,
} from "firebase/firestore";
import React, { useMemo, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import UserActionsSheet, {
  type UserActionsSheetRef,
} from "@/components/UserActionsSheet";
import { invalidateAfterBlock } from "@/lib/queryKeys/invalidateSocial";
import { useTheme } from "@/providers/ThemeProvider";

const { width: SCREEN_W } = Dimensions.get("window");
const GRID_GAP = 2;
const CELL_SIZE = (SCREEN_W - 32 - GRID_GAP * 2) / 3;

type UserProfile = {
  id: string;
  username: string;
  full_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  location?: string | null;
  is_private?: boolean | null;
};
type PrivacyFlags = { hide_followers: boolean; hide_following: boolean };
type UserStats = { posts: number; followers: number; following: number };
type PostRow = {
  id: string;
  content: string;
  media_urls: string[] | null;
  created_at: string;
  post_type?: string | null;
};
type FollowEdge = {
  follower_id: string;
  following_id: string;
  status: "accepted" | "pending";
};
type BlockEdge = { blocker_id: string; blocked_id: string };

const profileTabs = ["Activity", "Post", "Tagged", "Media"] as const;

function Skeleton({ style }: { style: any }) {
  return <View style={[styles.skel, style]} />;
}
function formatNumber(num: number) {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return String(num);
}
const isVideoUrl = (url?: string | null) => {
  if (!url) return false;
  return ["mp4", "mov", "m4v", "webm", "mkv", "avi"].some((e) =>
    url.split("?")[0].toLowerCase().endsWith(`.${e}`),
  );
};

export default function UserProfileScreen() {
  const { username: raw } = useLocalSearchParams<{ username: string }>();
  const username = raw?.replace("@", "") ?? "";
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const qc = useQueryClient();
  const sheetRef = useRef<UserActionsSheetRef>(null);
  const [activeTab, setActiveTab] =
    useState<(typeof profileTabs)[number]>("Post");

  const { data: target, isLoading: loadingProfile } = useQuery({
    queryKey: ["user-profile", username],
    enabled: !!username,
    queryFn: async () => {
      const snap = await getDocs(
        query(
          collection(db, "profiles"),
          where("username", "==", username),
          limit(1),
        ),
      );
      if (snap.empty) return null;
      const d = snap.docs[0].data() as any;
      return {
        id: snap.docs[0].id,
        username: d.username ?? "",
        full_name: d.full_name ?? null,
        bio: d.bio ?? null,
        avatar_url: d.avatar_url ?? null,
        location: d.location ?? null,
        is_private: d.is_private ?? false,
      } as UserProfile;
    },
  });

  const isMe = useMemo(
    () => !!target?.id && target.id === user?.uid,
    [target?.id, user?.uid],
  );

  const { data: followEdge, isLoading: loadingEdge } = useQuery({
    queryKey: ["follow-edge", user?.uid, target?.id],
    enabled: !!user?.uid && !!target?.id && !isMe,
    queryFn: async () => {
      const snap = await getDocs(
        query(
          collection(db, "follows"),
          where("follower_id", "==", user!.uid),
          where("following_id", "==", target!.id),
        ),
      );
      if (snap.empty) return null;
      const d = snap.docs[0].data() as any;
      return {
        follower_id: d.follower_id,
        following_id: d.following_id,
        status: d.status,
      } as FollowEdge;
    },
  });

  const isFollowing = !!followEdge && followEdge.status === "accepted";
  const isRequested = !!followEdge && followEdge.status === "pending";

  const { data: blockEdge } = useQuery({
    queryKey: ["block-edge", user?.uid, target?.id],
    enabled: !!user?.uid && !!target?.id && !isMe,
    queryFn: async () => {
      const [s1, s2] = await Promise.all([
        getDocs(
          query(
            collection(db, "user_blocks"),
            where("blocker_id", "==", user!.uid),
            where("blocked_id", "==", target!.id),
          ),
        ),
        getDocs(
          query(
            collection(db, "user_blocks"),
            where("blocker_id", "==", target!.id),
            where("blocked_id", "==", user!.uid),
          ),
        ),
      ]);
      if (!s1.empty) {
        const d = s1.docs[0].data() as any;
        return {
          blocker_id: d.blocker_id,
          blocked_id: d.blocked_id,
        } as BlockEdge;
      }
      if (!s2.empty) {
        const d = s2.docs[0].data() as any;
        return {
          blocker_id: d.blocker_id,
          blocked_id: d.blocked_id,
        } as BlockEdge;
      }
      return null;
    },
  });

  const isBlocked = !!blockEdge;
  const isPrivate = !!target?.is_private;
  const canViewPosts = useMemo(() => {
    if (!target?.id) return false;
    if (isMe) return true;
    if (!isPrivate) return true;
    return isFollowing;
  }, [target?.id, isMe, isPrivate, isFollowing]);

  const { data: privacyFlags } = useQuery({
    queryKey: ["profile-privacy-flags", target?.id, user?.uid],
    enabled: !!target?.id,
    queryFn: async () => {
      if (isMe) return { hide_followers: false, hide_following: false };
      const snap = await getDoc(doc(db, "profiles", target!.id));
      if (!snap.exists())
        return { hide_followers: false, hide_following: false };
      const d = snap.data() as any;
      return {
        hide_followers: !!d.hide_followers,
        hide_following: !!d.hide_following,
      } as PrivacyFlags;
    },
  });

  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ["user-stats", target?.id],
    enabled: !!target?.id,
    queryFn: async (): Promise<UserStats> => {
      const uid = target!.id;
      const [p, fo, fi] = await Promise.all([
        getCountFromServer(
          query(collection(db, "posts"), where("user_id", "==", uid)),
        ),
        getCountFromServer(
          query(
            collection(db, "follows"),
            where("following_id", "==", uid),
            where("status", "==", "accepted"),
          ),
        ),
        getCountFromServer(
          query(
            collection(db, "follows"),
            where("follower_id", "==", uid),
            where("status", "==", "accepted"),
          ),
        ),
      ]);
      return {
        posts: p.data().count,
        followers: fo.data().count,
        following: fi.data().count,
      };
    },
  });

  const { data: posts, isLoading: loadingPosts } = useQuery({
    queryKey: ["user-posts", target?.id],
    enabled: !!target?.id && canViewPosts,
    queryFn: async () => {
      const snap = await getDocs(
        query(collection(db, "posts"), where("user_id", "==", target!.id)),
      );
      return snap.docs.map((d) => {
        const x = d.data() as any;
        return {
          id: d.id,
          content: x.content ?? "",
          media_urls: Array.isArray(x.media_urls) ? x.media_urls : null,
          created_at: x.created_at ?? "",
          post_type: x.post_type ?? null,
        };
      }) as PostRow[];
    },
  });

  const mediaPosts = useMemo(
    () => (posts ?? []).filter((p) => p.media_urls && p.media_urls.length > 0),
    [posts],
  );

  const followMutation = useMutation({
    mutationFn: async () => {
      if (!user?.uid || !target?.id) throw new Error("Missing ids");
      if (followEdge) {
        const snap = await getDocs(
          query(
            collection(db, "follows"),
            where("follower_id", "==", user.uid),
            where("following_id", "==", target.id),
          ),
        );
        await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
        return { next: null };
      }
      const status: FollowEdge["status"] = target.is_private
        ? "pending"
        : "accepted";
      await addDoc(collection(db, "follows"), {
        follower_id: user.uid,
        following_id: target.id,
        status,
        created_at: new Date().toISOString(),
      });
      return {
        next: {
          follower_id: user.uid,
          following_id: target.id,
          status,
        } as FollowEdge,
      };
    },
    onMutate: async () => {
      if (!user?.uid || !target?.id) return;
      const edgeKey = ["follow-edge", user.uid, target.id];
      const statsKey = ["user-stats", target.id];
      await Promise.all([
        qc.cancelQueries({ queryKey: edgeKey }),
        qc.cancelQueries({ queryKey: statsKey }),
      ]);
      const prevEdge = qc.getQueryData<FollowEdge | null>(edgeKey);
      const prevStats = qc.getQueryData<UserStats>(statsKey);
      if (prevEdge) {
        qc.setQueryData(edgeKey, null);
        if (prevStats && prevEdge.status === "accepted")
          qc.setQueryData<UserStats>(statsKey, {
            ...prevStats,
            followers: Math.max(0, prevStats.followers - 1),
          });
      } else {
        const guessedStatus: FollowEdge["status"] = target.is_private
          ? "pending"
          : "accepted";
        qc.setQueryData<FollowEdge>(edgeKey, {
          follower_id: user.uid,
          following_id: target.id,
          status: guessedStatus,
        });
        if (prevStats && guessedStatus === "accepted")
          qc.setQueryData<UserStats>(statsKey, {
            ...prevStats,
            followers: prevStats.followers + 1,
          });
      }
      return { prevEdge, prevStats };
    },
    onError: (_err, _vars, ctx) => {
      if (!user?.uid || !target?.id) return;
      if (ctx?.prevEdge !== undefined)
        qc.setQueryData(["follow-edge", user.uid, target.id], ctx.prevEdge);
      if (ctx?.prevStats !== undefined)
        qc.setQueryData(["user-stats", target.id], ctx.prevStats);
      Alert.alert("Error", "Could not update follow status.");
    },
    onSettled: () => {
      if (!user?.uid || !target?.id) return;
      qc.invalidateQueries({ queryKey: ["follow-edge", user.uid, target.id] });
      qc.invalidateQueries({ queryKey: ["user-stats", target.id] });
      qc.invalidateQueries({ queryKey: ["user-posts", target.id] });
      qc.invalidateQueries({
        queryKey: ["profile-privacy-flags", target.id, user.uid],
      });
    },
  });

  const blockMutation = useMutation({
    mutationFn: async () => {
      if (!user?.uid || !target?.id) throw new Error("Missing ids");
      await addDoc(collection(db, "user_blocks"), {
        blocker_id: user.uid,
        blocked_id: target.id,
        created_at: new Date().toISOString(),
      });
      return target.id;
    },
    onSuccess: (targetId) => {
      invalidateAfterBlock(qc, user!.uid, targetId);
      router.back();
    },
    onError: (err) => Alert.alert("Error", String(err)),
  });

  const handleShareProfile = async () => {
    try {
      await Share.share({ message: `Check out @${username} on NebulaNet!` });
    } catch {}
  };

  const canMessage = !isBlocked && (!isPrivate || isFollowing);

  const handleMessage = async () => {
    if (!user?.uid || !target?.id) return;
    if (isBlocked) {
      Alert.alert("Message unavailable", "You can't message this user.");
      return;
    }
    if (isPrivate && !isFollowing) {
      Alert.alert("Private account", "Follow this user to message them.");
      return;
    }
    try {
      const conversationId = await createOrOpenChat(user.uid, target.id);
      router.push(`/chat/${conversationId}`);
    } catch {
      Alert.alert("Error", "Could not start conversation.");
    }
  };

  const hideFollowers = !!privacyFlags?.hide_followers;
  const hideFollowing = !!privacyFlags?.hide_following;
  const followersDisplay =
    !isMe && hideFollowers ? "—" : formatNumber(stats?.followers || 0);
  const followingDisplay =
    !isMe && hideFollowing ? "—" : formatNumber(stats?.following || 0);

  const gradientColors = isDark
    ? [colors.background, colors.background, colors.background]
    : (["#DCEBFF", "#EEF4FF", "#FFFFFF"] as const);

  if (loadingProfile) {
    return (
      <LinearGradient
        colors={gradientColors as any}
        locations={[0, 0.42, 1]}
        style={{ flex: 1 }}
      >
        <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
          <View style={[styles.header, { backgroundColor: "transparent" }]}>
            <View
              style={[
                styles.headerBtn,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            />
            <Skeleton style={{ height: 14, width: 160, borderRadius: 10 }} />
            <View
              style={[
                styles.headerBtn,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            />
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (!target) {
    return (
      <LinearGradient
        colors={gradientColors as any}
        locations={[0, 0.42, 1]}
        style={{ flex: 1 }}
      >
        <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
          <View style={[styles.header, { backgroundColor: "transparent" }]}>
            <TouchableOpacity
              style={[
                styles.headerBtn,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              onPress={() => router.back()}
              activeOpacity={0.85}
            >
              <Ionicons name="arrow-back" size={22} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              Not Found
            </Text>
            <View style={{ width: 40 }} />
          </View>
          <View style={styles.emptyState}>
            <Ionicons
              name="person-outline"
              size={64}
              color={colors.textTertiary}
            />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              User Not Found
            </Text>
            <Text
              style={[styles.emptyDescription, { color: colors.textTertiary }]}
            >
              This user doesn't exist or has been deleted.
            </Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={gradientColors as any}
      locations={[0, 0.42, 1]}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: "transparent" }]}>
          <TouchableOpacity
            style={[
              styles.headerBtn,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            onPress={() => router.back()}
            activeOpacity={0.85}
          >
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text
            style={[styles.headerTitle, { color: colors.text }]}
            numberOfLines={1}
          >
            @{target.username}
          </Text>
          {!isMe ? (
            <TouchableOpacity
              style={[
                styles.headerBtn,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              onPress={() => sheetRef.current?.snapToIndex(0)}
              activeOpacity={0.85}
            >
              <Ionicons
                name="ellipsis-vertical"
                size={20}
                color={colors.text}
              />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.headerBtn,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              onPress={handleShareProfile}
              activeOpacity={0.85}
            >
              <Ionicons name="share-outline" size={20} color={colors.text} />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Profile Card */}
          <View
            style={[
              styles.profileCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.profileTopRow}>
              <View style={styles.profileImageContainer}>
                {target.avatar_url ? (
                  <Image
                    source={{ uri: target.avatar_url }}
                    style={styles.profileImage}
                  />
                ) : (
                  <View
                    style={[
                      styles.profileImagePlaceholder,
                      { backgroundColor: colors.primary },
                    ]}
                  >
                    <Text style={styles.profileImageText}>
                      {(target.username?.charAt(0) || "U").toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: colors.text }]}>
                    {loadingStats ? "…" : formatNumber(stats?.posts || 0)}
                  </Text>
                  <Text
                    style={[styles.statLabel, { color: colors.textTertiary }]}
                  >
                    Post
                  </Text>
                </View>
                <Pressable
                  style={styles.statItem}
                  onPress={() => {
                    if (!isMe && hideFollowers) {
                      Alert.alert(
                        "Hidden",
                        "This user has hidden their followers list.",
                      );
                      return;
                    }
                    router.push(`/user/${target.username}/followers`);
                  }}
                >
                  <Text style={[styles.statValue, { color: colors.text }]}>
                    {loadingStats ? "…" : followersDisplay}
                  </Text>
                  <Text
                    style={[styles.statLabel, { color: colors.textTertiary }]}
                  >
                    Followers
                  </Text>
                </Pressable>
                <Pressable
                  style={styles.statItem}
                  onPress={() => {
                    if (!isMe && hideFollowing) {
                      Alert.alert(
                        "Hidden",
                        "This user has hidden their following list.",
                      );
                      return;
                    }
                    router.push(`/user/${target.username}/following`);
                  }}
                >
                  <Text style={[styles.statValue, { color: colors.text }]}>
                    {loadingStats ? "…" : followingDisplay}
                  </Text>
                  <Text
                    style={[styles.statLabel, { color: colors.textTertiary }]}
                  >
                    Following
                  </Text>
                </Pressable>
              </View>
            </View>

            <Text style={[styles.displayName, { color: colors.text }]}>
              {target.full_name || target.username}
            </Text>
            {!!target.bio && (
              <Text style={[styles.bio, { color: colors.textTertiary }]}>
                {target.bio}
              </Text>
            )}

            {target.is_private && (
              <View
                style={[
                  styles.privatePill,
                  { backgroundColor: colors.surface },
                ]}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={14}
                  color={colors.primary}
                />
                <Text
                  style={[styles.privatePillText, { color: colors.primary }]}
                >
                  Private account
                </Text>
              </View>
            )}

            {/* Action Buttons */}
            {!isMe ? (
              <View style={styles.actionButtons}>
                {/* ✅ Follow button */}
                <TouchableOpacity
                  style={[
                    styles.followBtn,
                    isFollowing || isRequested
                      ? {
                          backgroundColor: colors.surface,
                          borderWidth: 1,
                          borderColor: colors.border,
                        }
                      : { backgroundColor: colors.primary },
                  ]}
                  onPress={() => followMutation.mutate()}
                  activeOpacity={0.85}
                  disabled={followMutation.isPending || loadingEdge}
                >
                  <Text
                    style={[
                      styles.followBtnText,
                      {
                        color:
                          isFollowing || isRequested ? colors.text : "#fff",
                      },
                    ]}
                  >
                    {loadingEdge
                      ? "…"
                      : isFollowing
                        ? "Following"
                        : isRequested
                          ? "Requested"
                          : "Follow"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.messageBtn,
                    {
                      backgroundColor: colors.surface,
                      borderWidth: 1,
                      borderColor: colors.border,
                    },
                    !canMessage && { opacity: 0.4 },
                  ]}
                  activeOpacity={0.85}
                  onPress={handleMessage}
                  disabled={!canMessage}
                >
                  <Text style={[styles.messageBtnText, { color: colors.text }]}>
                    Message
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.shareBtn,
                    {
                      backgroundColor: colors.surface,
                      borderWidth: 1,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={handleShareProfile}
                  activeOpacity={0.85}
                >
                  <Ionicons
                    name="share-outline"
                    size={18}
                    color={colors.text}
                  />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[
                    styles.messageBtn,
                    {
                      backgroundColor: colors.surface,
                      borderWidth: 1,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => router.push("/profile/edit")}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.messageBtnText, { color: colors.text }]}>
                    Edit Profile
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.messageBtn,
                    {
                      backgroundColor: colors.surface,
                      borderWidth: 1,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => router.push("/settings")}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.messageBtnText, { color: colors.text }]}>
                    Settings
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.shareBtn,
                    {
                      backgroundColor: colors.surface,
                      borderWidth: 1,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={handleShareProfile}
                  activeOpacity={0.85}
                >
                  <Ionicons
                    name="share-outline"
                    size={18}
                    color={colors.text}
                  />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Tabs */}
          <View
            style={[styles.tabsContainer, { backgroundColor: colors.card }]}
          >
            {profileTabs.map((tab) => {
              const active = activeTab === tab;
              return (
                <TouchableOpacity
                  key={tab}
                  style={[
                    styles.tab,
                    active && { backgroundColor: colors.primary },
                  ]}
                  onPress={() => setActiveTab(tab)}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.tabText,
                      { color: colors.textTertiary },
                      active && { color: "#fff", fontWeight: "800" },
                    ]}
                  >
                    {tab}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Content */}
          <View style={styles.contentSection}>
            {activeTab === "Activity" && (
              <View
                style={[styles.emptyCard, { backgroundColor: colors.card }]}
              >
                <Ionicons
                  name="pulse-outline"
                  size={40}
                  color={colors.textTertiary}
                />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  No Activity Yet
                </Text>
                <Text
                  style={[
                    styles.emptyDescription,
                    { color: colors.textTertiary },
                  ]}
                >
                  This user's recent activity will appear here
                </Text>
              </View>
            )}

            {activeTab === "Post" && (
              <>
                {!canViewPosts ? (
                  <View
                    style={[styles.emptyCard, { backgroundColor: colors.card }]}
                  >
                    <Ionicons
                      name="lock-closed-outline"
                      size={40}
                      color={colors.primary}
                    />
                    <Text style={[styles.emptyTitle, { color: colors.text }]}>
                      Private Account
                    </Text>
                    <Text
                      style={[
                        styles.emptyDescription,
                        { color: colors.textTertiary },
                      ]}
                    >
                      Follow to see posts from @{target.username}.
                    </Text>
                  </View>
                ) : loadingPosts ? (
                  <View style={{ gap: 12 }}>
                    {Array.from({ length: 3 }).map((_, i) => (
                      <View
                        key={i}
                        style={[
                          styles.postCard,
                          { backgroundColor: colors.card },
                        ]}
                      >
                        <Skeleton
                          style={{ height: 12, width: "75%", borderRadius: 10 }}
                        />
                        <Skeleton
                          style={{
                            height: 12,
                            width: "55%",
                            borderRadius: 10,
                            marginTop: 10,
                          }}
                        />
                      </View>
                    ))}
                  </View>
                ) : posts && posts.length > 0 ? (
                  <View style={{ gap: 12 }}>
                    {posts.map((p) => {
                      const img = p.media_urls?.[0];
                      const isVid = isVideoUrl(img) || p.post_type === "video";
                      return (
                        <TouchableOpacity
                          key={p.id}
                          style={[
                            styles.postCard,
                            { backgroundColor: colors.card },
                          ]}
                          onPress={() => router.push(`/post/${p.id}` as any)}
                          activeOpacity={0.9}
                        >
                          {!!p.content && (
                            <Text
                              style={[
                                styles.postContent,
                                { color: colors.text },
                              ]}
                              numberOfLines={4}
                            >
                              {p.content}
                            </Text>
                          )}
                          {!!img && (
                            <View
                              style={[
                                styles.postMediaWrap,
                                { backgroundColor: colors.surface },
                              ]}
                            >
                              <Image
                                source={{ uri: img }}
                                style={styles.postMedia}
                                resizeMode="cover"
                              />
                              {isVid && (
                                <View style={styles.videoOverlay}>
                                  <Ionicons
                                    name="play-circle"
                                    size={32}
                                    color="#fff"
                                  />
                                </View>
                              )}
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : (
                  <View
                    style={[styles.emptyCard, { backgroundColor: colors.card }]}
                  >
                    <Ionicons
                      name="document-text-outline"
                      size={40}
                      color={colors.textTertiary}
                    />
                    <Text style={[styles.emptyTitle, { color: colors.text }]}>
                      No Posts Yet
                    </Text>
                    <Text
                      style={[
                        styles.emptyDescription,
                        { color: colors.textTertiary },
                      ]}
                    >
                      This user hasn't posted anything yet
                    </Text>
                  </View>
                )}
              </>
            )}

            {activeTab === "Tagged" && (
              <View
                style={[styles.emptyCard, { backgroundColor: colors.card }]}
              >
                <Ionicons
                  name="pricetag-outline"
                  size={40}
                  color={colors.textTertiary}
                />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  No Tags Yet
                </Text>
                <Text
                  style={[
                    styles.emptyDescription,
                    { color: colors.textTertiary },
                  ]}
                >
                  Posts where this user is tagged will appear here
                </Text>
              </View>
            )}

            {/* ✅ Media tab — live 3-column grid */}
            {activeTab === "Media" && (
              <>
                {!canViewPosts ? (
                  <View
                    style={[styles.emptyCard, { backgroundColor: colors.card }]}
                  >
                    <Ionicons
                      name="lock-closed-outline"
                      size={40}
                      color={colors.primary}
                    />
                    <Text style={[styles.emptyTitle, { color: colors.text }]}>
                      Private Account
                    </Text>
                    <Text
                      style={[
                        styles.emptyDescription,
                        { color: colors.textTertiary },
                      ]}
                    >
                      Follow to see media from @{target.username}.
                    </Text>
                  </View>
                ) : loadingPosts ? (
                  <View style={{ gap: GRID_GAP }}>
                    {Array.from({ length: 2 }).map((_, ri) => (
                      <View
                        key={ri}
                        style={{ flexDirection: "row", gap: GRID_GAP }}
                      >
                        {Array.from({ length: 3 }).map((_, ci) => (
                          <View
                            key={ci}
                            style={{
                              width: CELL_SIZE,
                              height: CELL_SIZE,
                              backgroundColor: colors.surface,
                              opacity: 0.5,
                            }}
                          />
                        ))}
                      </View>
                    ))}
                  </View>
                ) : mediaPosts.length > 0 ? (
                  <View
                    style={{
                      gap: GRID_GAP,
                      borderRadius: 18,
                      overflow: "hidden",
                    }}
                  >
                    {(() => {
                      const rows: PostRow[][] = [];
                      for (let i = 0; i < mediaPosts.length; i += 3)
                        rows.push(mediaPosts.slice(i, i + 3));
                      return rows.map((row, ri) => (
                        <View
                          key={ri}
                          style={{ flexDirection: "row", gap: GRID_GAP }}
                        >
                          {row.map((post) => {
                            const img = post.media_urls![0];
                            const isVid =
                              isVideoUrl(img) || post.post_type === "video";
                            return (
                              <TouchableOpacity
                                key={post.id}
                                style={{
                                  width: CELL_SIZE,
                                  height: CELL_SIZE,
                                  backgroundColor: colors.surface,
                                  overflow: "hidden",
                                  position: "relative",
                                }}
                                activeOpacity={0.85}
                                onPress={() =>
                                  router.push(`/post/${post.id}` as any)
                                }
                              >
                                <Image
                                  source={{ uri: img }}
                                  style={{ width: "100%", height: "100%" }}
                                  resizeMode="cover"
                                />
                                {isVid && (
                                  <View
                                    style={{
                                      position: "absolute",
                                      top: 6,
                                      right: 6,
                                      backgroundColor: "rgba(0,0,0,0.55)",
                                      borderRadius: 8,
                                      paddingHorizontal: 5,
                                      paddingVertical: 3,
                                    }}
                                  >
                                    <Ionicons
                                      name="play"
                                      size={10}
                                      color="#fff"
                                    />
                                  </View>
                                )}
                              </TouchableOpacity>
                            );
                          })}
                          {row.length < 3 &&
                            Array(3 - row.length)
                              .fill(null)
                              .map((_, i) => (
                                <View
                                  key={`sp-${i}`}
                                  style={{
                                    width: CELL_SIZE,
                                    height: CELL_SIZE,
                                    backgroundColor: "transparent",
                                  }}
                                />
                              ))}
                        </View>
                      ));
                    })()}
                  </View>
                ) : (
                  <View
                    style={[styles.emptyCard, { backgroundColor: colors.card }]}
                  >
                    <Ionicons
                      name="images-outline"
                      size={40}
                      color={colors.textTertiary}
                    />
                    <Text style={[styles.emptyTitle, { color: colors.text }]}>
                      No Media Yet
                    </Text>
                    <Text
                      style={[
                        styles.emptyDescription,
                        { color: colors.textTertiary },
                      ]}
                    >
                      Photos and videos from posts will appear here
                    </Text>
                  </View>
                )}
              </>
            )}
          </View>
        </ScrollView>

        {!isMe && (
          <UserActionsSheet
            ref={sheetRef}
            username={target.username}
            onRemove={async () => {
              sheetRef.current?.close();
              if (!user?.uid || !target?.id || !followEdge) return;
              const snap = await getDocs(
                query(
                  collection(db, "follows"),
                  where("follower_id", "==", user.uid),
                  where("following_id", "==", target.id),
                ),
              );
              await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
              qc.invalidateQueries({
                queryKey: ["follow-edge", user.uid, target.id],
              });
              qc.invalidateQueries({ queryKey: ["user-stats", target.id] });
            }}
            onBlock={async () => {
              sheetRef.current?.close();
              Alert.alert(
                "Block user?",
                `You won't see @${target.username} and they won't see you.`,
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Block",
                    style: "destructive",
                    onPress: () => blockMutation.mutate(),
                  },
                ],
              );
            }}
          />
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3,
  },
  headerTitle: { fontSize: 16, fontWeight: "800", maxWidth: "65%" },
  profileCard: {
    borderRadius: 22,
    padding: 18,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 2,
  },
  profileTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  profileImageContainer: { marginRight: 18 },
  profileImage: { width: 76, height: 76, borderRadius: 38 },
  profileImagePlaceholder: {
    width: 76,
    height: 76,
    borderRadius: 38,
    justifyContent: "center",
    alignItems: "center",
  },
  profileImageText: { fontSize: 30, fontWeight: "800", color: "#fff" },
  statsRow: { flex: 1, flexDirection: "row", justifyContent: "space-around" },
  statItem: { alignItems: "center" },
  statValue: { fontSize: 18, fontWeight: "900" },
  statLabel: { fontSize: 12, marginTop: 3, fontWeight: "700" },
  displayName: { fontSize: 17, fontWeight: "900", marginBottom: 6 },
  bio: { fontSize: 13.5, lineHeight: 19, marginBottom: 10 },
  privatePill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 12,
  },
  privatePillText: { fontSize: 12, fontWeight: "800" },
  actionButtons: { flexDirection: "row", gap: 8, marginTop: 4 },
  followBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 22,
    alignItems: "center",
  },
  followBtnText: { fontSize: 14, fontWeight: "800" },
  messageBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 22,
    alignItems: "center",
  },
  messageBtnText: { fontSize: 14, fontWeight: "800" },
  shareBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  tabsContainer: {
    flexDirection: "row",
    borderRadius: 22,
    padding: 5,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 18 },
  tabText: { fontSize: 13, fontWeight: "700" },
  contentSection: { paddingHorizontal: 16, paddingBottom: 32 },
  postCard: {
    borderRadius: 18,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  postContent: { fontSize: 14, lineHeight: 20 },
  postMediaWrap: {
    width: "100%",
    height: 180,
    borderRadius: 14,
    overflow: "hidden",
    marginTop: 10,
    position: "relative",
  },
  postMedia: { width: "100%", height: "100%" },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  emptyCard: {
    borderRadius: 22,
    paddingVertical: 32,
    paddingHorizontal: 18,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "900",
    marginTop: 12,
    marginBottom: 6,
    textAlign: "center",
  },
  emptyDescription: { fontSize: 13, textAlign: "center", lineHeight: 18 },
  skel: { backgroundColor: "#E5E7EB" },
});
