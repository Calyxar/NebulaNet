// app/user/[username]/index.tsx ✅ REDESIGNED
// ✅ Banner photo added — reads target.banner_url, gradient fallback,
//    avatar overlaps banner bottom-left — matches own profile.tsx exactly.
// ✅ Tabs switched from pill-background to underline style, matching
//    home, explore, profile, and notifications.
// ✅ Stats moved below bio (Twitter style) instead of next to avatar
//    (Instagram style) — consistent with own profile.tsx.
// ✅ Dead LocationPicker removed — it was never triggered on this screen.
// ✅ Posts tab: reposts and quote-posts mixed into main timeline with
//    "Reposted" label and embedded quoted-post card.
// ✅ MentionHashtagText used throughout for #hashtags and @mentions.

import MentionHashtagText from "@/components/MentionHashtagText";
import ShareSheet, { type ShareSheetRef } from "@/components/ShareSheet";
import FounderBadge from "@/components/user/FounderBadge";
import UserActionsSheet, {
  type UserActionsSheetRef,
} from "@/components/UserActionsSheet";
import { useAuth } from "@/hooks/useAuth";
import { useMuteStatus, useToggleMute } from "@/hooks/useMuteUser";
import { createOrOpenChat } from "@/lib/firestore/createOrOpenChat";
import { createNotification } from "@/lib/firestore/notifications";
import { invalidateAfterBlock } from "@/lib/queryKeys/invalidateSocial";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import firestore from "@react-native-firebase/firestore";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width: SCREEN_W } = Dimensions.get("window");
const GRID_GAP = 2;
const CELL_SIZE = (SCREEN_W - 32 - GRID_GAP * 2) / 3;
const BANNER_HEIGHT = 150;
const AVATAR_SIZE = 76;
const AVATAR_OVERLAP = AVATAR_SIZE / 2;

type UserProfile = {
  id: string;
  username: string;
  full_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  banner_url?: string | null;
  location?: string | null;
  is_private?: boolean | null;
  is_founder?: boolean | null;
};

type PrivacyFlags = {
  hide_followers: boolean;
  hide_following: boolean;
  show_activity_publicly: boolean;
};

type UserStats = { posts: number; followers: number; following: number };

type QuotedPostInfo = {
  id: string;
  content: string | null;
  media_urls?: string[] | null;
  user: {
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
};

type ProfileFeedItem = {
  id: string;
  kind: "own" | "repost";
  content: string;
  media_urls: string[] | null;
  post_type?: string | null;
  created_at: string;
  sort_at: string;
  quoted_post?: QuotedPostInfo | null;
  original_author?: {
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
};

type ReplyItem = {
  id: string;
  content: string;
  created_at: string;
  parent_post_id: string;
  parent_post_content: string | null;
  parent_post_author: {
    username: string | null;
    full_name: string | null;
  } | null;
};

type FollowEdge = {
  follower_id: string;
  following_id: string;
  status: "accepted" | "pending";
};
type BlockEdge = { blocker_id: string; blocked_id: string };

const profileTabs = ["Post", "Replies", "Tagged", "Media"] as const;

function Skeleton({ style }: { style: any }) {
  return <View style={[styles.skel, style]} />;
}

function formatNumber(num: number) {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return String(num);
}

function tsToIso(v: any): string {
  if (!v) return new Date().toISOString();
  if (typeof v === "string") return v;
  if (typeof v?.toDate === "function") return v.toDate().toISOString();
  if (typeof v?.seconds === "number")
    return new Date(v.seconds * 1000).toISOString();
  return new Date().toISOString();
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
  const isUid = !!raw && raw.length === 28 && /^[a-zA-Z0-9]+$/.test(raw);

  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const qc = useQueryClient();
  const sheetRef = useRef<UserActionsSheetRef>(null);
  const shareSheetRef = useRef<ShareSheetRef>(null);
  const [activeTab, setActiveTab] =
    useState<(typeof profileTabs)[number]>("Post");

  const { data: target, isLoading: loadingProfile } = useQuery({
    queryKey: ["user-profile", raw],
    enabled: !!raw,
    staleTime: 30_000,
    gcTime: 60_000,
    queryFn: async () => {
      if (isUid) {
        const snap = await firestore()
          .collection("profiles")
          .doc(username)
          .get();
        if (!snap.exists) return null;
        const d = snap.data() as any;
        return {
          id: snap.id,
          username: d.username ?? "",
          full_name: d.full_name ?? null,
          bio: d.bio ?? null,
          avatar_url: d.avatar_url ?? null,
          banner_url: d.banner_url ?? null,
          location: d.location ?? null,
          is_private: d.is_private ?? false,
          is_founder: d.is_founder ?? false,
        } as UserProfile;
      }
      const snap = await firestore()
        .collection("profiles")
        .where("username", "==", username)
        .limit(1)
        .get();
      if (snap.empty) return null;
      const d = snap.docs[0].data() as any;
      return {
        id: snap.docs[0].id,
        username: d.username ?? "",
        full_name: d.full_name ?? null,
        bio: d.bio ?? null,
        avatar_url: d.avatar_url ?? null,
        banner_url: d.banner_url ?? null,
        location: d.location ?? null,
        is_private: d.is_private ?? false,
        is_founder: d.is_founder ?? false,
      } as UserProfile;
    },
  });

  const isMe = useMemo(
    () => !!target?.id && target.id === user?.uid,
    [target?.id, user?.uid],
  );

  const { data: isMuted } = useMuteStatus(target?.id ?? "");
  const muteMutation = useToggleMute(target?.id ?? "");

  const { data: followEdge, isLoading: loadingEdge } = useQuery({
    queryKey: ["follow-edge", user?.uid, target?.id],
    enabled: !!user?.uid && !!target?.id && !isMe,
    queryFn: async () => {
      const snap = await firestore()
        .collection("follows")
        .where("follower_id", "==", user!.uid)
        .where("following_id", "==", target!.id)
        .get();
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
        firestore()
          .collection("user_blocks")
          .where("blocker_id", "==", user!.uid)
          .where("blocked_id", "==", target!.id)
          .get(),
        firestore()
          .collection("user_blocks")
          .where("blocker_id", "==", target!.id)
          .where("blocked_id", "==", user!.uid)
          .get(),
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
    enabled: !!target?.id && !isMe,
    queryFn: async () => {
      const snap = await firestore()
        .collection("profiles")
        .doc(target!.id)
        .get();
      if (!snap.exists)
        return {
          hide_followers: false,
          hide_following: false,
          show_activity_publicly: true,
        };
      const d = snap.data() as any;
      return {
        hide_followers: d.hide_followers === true,
        hide_following: d.hide_following === true,
        show_activity_publicly: d.show_activity_publicly !== false,
      } as PrivacyFlags;
    },
  });

  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ["user-stats", target?.id],
    enabled: !!target?.id,
    queryFn: async (): Promise<UserStats> => {
      const uid = target!.id;
      const [p, fo, fi] = await Promise.all([
        firestore()
          .collection("posts")
          .where("user_id", "==", uid)
          .count()
          .get(),
        firestore()
          .collection("follows")
          .where("following_id", "==", uid)
          .where("status", "==", "accepted")
          .count()
          .get(),
        firestore()
          .collection("follows")
          .where("follower_id", "==", uid)
          .where("status", "==", "accepted")
          .count()
          .get(),
      ]);
      return {
        posts: p.data().count,
        followers: fo.data().count,
        following: fi.data().count,
      };
    },
  });

  const { data: ownPosts, isLoading: loadingOwnPosts } = useQuery({
    queryKey: ["user-own-posts", target?.id],
    enabled: !!target?.id && canViewPosts,
    staleTime: 0,
    gcTime: 0,
    queryFn: async (): Promise<ProfileFeedItem[]> => {
      const snap = await firestore()
        .collection("posts")
        .where("user_id", "==", target!.id)
        .get();

      const items: ProfileFeedItem[] = await Promise.all(
        snap.docs.map(async (d) => {
          const x = d.data() as any;
          const createdAt = tsToIso(x.created_at_ts ?? x.created_at);
          let quotedPost: QuotedPostInfo | null = null;
          if (x.quote_post_id) {
            let quotedContent: string | null = x.quote_post?.content ?? null;
            let quotedUser = x.quote_post?.user ?? null;
            let quotedMediaUrls: string[] | null = Array.isArray(
              x.quote_post?.media_urls,
            )
              ? x.quote_post.media_urls
              : null;
            if (!quotedContent) {
              try {
                const qSnap = await firestore()
                  .collection("posts")
                  .doc(x.quote_post_id)
                  .get();
                const qd = qSnap.exists() ? (qSnap.data() as any) : null;
                if (qd) {
                  quotedContent = qd.content ?? null;
                  quotedUser = qd.user ?? null;
                  quotedMediaUrls = Array.isArray(qd.media_urls)
                    ? qd.media_urls
                    : null;
                }
              } catch {}
            }
            quotedPost = {
              id: x.quote_post_id,
              content: quotedContent,
              media_urls: quotedMediaUrls,
              user: quotedUser,
            };
          }
          return {
            id: d.id,
            kind: "own",
            content: x.content ?? "",
            media_urls: Array.isArray(x.media_urls) ? x.media_urls : null,
            post_type: x.post_type ?? null,
            created_at: createdAt,
            sort_at: createdAt,
            quoted_post: quotedPost,
          } as ProfileFeedItem;
        }),
      );
      return items;
    },
  });

  const { data: replyItems, isLoading: loadingReplies } = useQuery({
    queryKey: ["user-replies", target?.id],
    enabled: !!target?.id && canViewPosts && activeTab === "Replies",
    staleTime: 0,
    gcTime: 0,
    queryFn: async (): Promise<ReplyItem[]> => {
      const commentSnap = await firestore()
        .collection("comments")
        .where("user_id", "==", target!.id)
        .limit(50)
        .get();
      if (commentSnap.empty) return [];
      const comments = commentSnap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }));
      const postIds = [
        ...new Set(comments.map((c) => c.post_id).filter(Boolean)),
      ];
      const postDocs = await Promise.all(
        postIds.map((id) => firestore().collection("posts").doc(id).get()),
      );
      const postMap = new Map(
        postDocs.filter((d) => d.exists).map((d) => [d.id, d.data() as any]),
      );
      return comments
        .map((c) => {
          const parentPost = postMap.get(c.post_id);
          return {
            id: c.id,
            content: c.content ?? "",
            created_at: tsToIso(c.created_at_ts ?? c.created_at),
            parent_post_id: c.post_id,
            parent_post_content: parentPost?.content ?? null,
            parent_post_author: parentPost?.user
              ? {
                  username: parentPost.user.username ?? null,
                  full_name: parentPost.user.full_name ?? null,
                }
              : null,
          } as ReplyItem;
        })
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
    },
  });

  const { data: repostItems, isLoading: loadingReposts } = useQuery({
    queryKey: ["user-reposts", target?.id],
    enabled: !!target?.id && canViewPosts,
    staleTime: 0,
    gcTime: 0,
    queryFn: async (): Promise<ProfileFeedItem[]> => {
      const repostSnap = await firestore()
        .collection("reposts")
        .where("user_id", "==", target!.id)
        .limit(50)
        .get();
      if (repostSnap.empty) return [];
      const postIds: string[] = [];
      const repostedAt: Record<string, string> = {};
      repostSnap.docs.forEach((d) => {
        const data = d.data() as any;
        if (data.post_id) {
          postIds.push(data.post_id);
          repostedAt[data.post_id] = tsToIso(
            data.created_at ?? data.created_at_ts,
          );
        }
      });
      const chunks: string[][] = [];
      for (let i = 0; i < postIds.length; i += 10)
        chunks.push(postIds.slice(i, i + 10));
      const items: ProfileFeedItem[] = [];
      for (const chunk of chunks) {
        const docSnaps = await Promise.all(
          chunk.map((id) => firestore().collection("posts").doc(id).get()),
        );
        docSnaps.forEach((d) => {
          if (!d.exists) return;
          const x = d.data() as any;
          if (x.is_visible === false) return;
          if (x.user_id === target!.id) return;
          const at =
            repostedAt[d.id] ?? tsToIso(x.created_at_ts ?? x.created_at);
          items.push({
            id: d.id,
            kind: "repost",
            content: x.content ?? "",
            media_urls: Array.isArray(x.media_urls) ? x.media_urls : null,
            post_type: x.post_type ?? null,
            created_at: tsToIso(x.created_at_ts ?? x.created_at),
            sort_at: at,
            original_author: x.user
              ? {
                  username: x.user.username ?? null,
                  full_name: x.user.full_name ?? null,
                  avatar_url: x.user.avatar_url ?? null,
                }
              : null,
          });
        });
      }
      return items;
    },
  });

  const feedItems = useMemo((): ProfileFeedItem[] => {
    return [...(ownPosts ?? []), ...(repostItems ?? [])].sort(
      (a, b) => new Date(b.sort_at).getTime() - new Date(a.sort_at).getTime(),
    );
  }, [ownPosts, repostItems]);

  const loadingPosts = loadingOwnPosts || loadingReposts;

  const mediaPosts = useMemo(
    () =>
      (ownPosts ?? []).filter((p) => p.media_urls && p.media_urls.length > 0),
    [ownPosts],
  );

  const followMutation = useMutation({
    mutationFn: async () => {
      if (!user?.uid || !target?.id) throw new Error("Missing ids");
      if (followEdge) {
        const snap = await firestore()
          .collection("follows")
          .where("follower_id", "==", user.uid)
          .where("following_id", "==", target.id)
          .get();
        await Promise.all(snap.docs.map((d) => d.ref.delete()));
        return { next: null };
      }
      const status: FollowEdge["status"] = target.is_private
        ? "pending"
        : "accepted";
      await firestore().collection("follows").add({
        follower_id: user.uid,
        following_id: target.id,
        status,
        created_at: new Date().toISOString(),
      });
      if (status === "accepted" && user.uid !== target.id) {
        createNotification({
          type: "follow",
          receiver_id: target.id,
          sender_id: user.uid,
          entity_type: "user",
          entity_id: user.uid,
        }).catch(() => {});
      }
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
      qc.invalidateQueries({ queryKey: ["user-stats", user.uid] });
      qc.invalidateQueries({ queryKey: ["user-own-posts", target.id] });
      qc.invalidateQueries({
        queryKey: ["profile-privacy-flags", target.id, user.uid],
      });
    },
  });

  const blockMutation = useMutation({
    mutationFn: async () => {
      if (!user?.uid || !target?.id) throw new Error("Missing ids");
      await firestore().collection("user_blocks").add({
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

  const handleShareProfile = () => shareSheetRef.current?.present();

  const handleCopyProfileLink = async () => {
    const link = `https://nebulanet.space/user/${target?.username ?? username}`;
    const Clipboard = await import("expo-clipboard");
    await Clipboard.setStringAsync(link);
    sheetRef.current?.close();
    Alert.alert("Copied", "Profile link copied to clipboard");
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
      sheetRef.current?.close();
      router.push(`/chat/${conversationId}`);
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Could not start conversation.");
    }
  };

  const hideFollowers = privacyFlags?.hide_followers === true;
  const hideFollowing = privacyFlags?.hide_following === true;
  const followersDisplay =
    isMe || !hideFollowers ? formatNumber(stats?.followers || 0) : "—";
  const followingDisplay =
    isMe || !hideFollowing ? formatNumber(stats?.following || 0) : "—";

  const gradientColors = isDark
    ? [colors.background, colors.background, colors.background]
    : (["#DCEBFF", "#EEF4FF", "#FFFFFF"] as const);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loadingProfile) {
    return (
      <LinearGradient
        colors={gradientColors as any}
        locations={[0, 0.42, 1]}
        style={{ flex: 1 }}
      >
        <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
          <View style={styles.header}>
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

  // ── Not found ──────────────────────────────────────────────────────────────
  if (!target) {
    return (
      <LinearGradient
        colors={gradientColors as any}
        locations={[0, 0.42, 1]}
        style={{ flex: 1 }}
      >
        <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
          <View style={styles.header}>
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
            <View style={{ width: 42 }} />
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

  // ── Main ───────────────────────────────────────────────────────────────────
  return (
    <LinearGradient
      colors={gradientColors as any}
      locations={[0, 0.42, 1]}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
        {/* Fixed header */}
        <View style={styles.header}>
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
          {/* ── Banner + overlapping avatar ──────────────────────────────── */}
          <View style={styles.bannerWrap}>
            {target.banner_url ? (
              <Image
                source={{ uri: target.banner_url }}
                style={styles.bannerImage}
              />
            ) : (
              <LinearGradient
                colors={[colors.primary, colors.primary + "60"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.bannerImage}
              />
            )}
            <View
              style={[styles.avatarOverlap, { borderColor: colors.background }]}
            >
              {target.avatar_url ? (
                <Image
                  source={{ uri: target.avatar_url }}
                  style={styles.avatar}
                />
              ) : (
                <View
                  style={[
                    styles.avatarFallback,
                    { backgroundColor: colors.primary },
                  ]}
                >
                  <Text style={styles.avatarFallbackText}>
                    {(target.username?.charAt(0) || "U").toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* ── Profile card ────────────────────────────────────────────── */}
          <View
            style={[
              styles.profileCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            {/* Action buttons — top right, same as own profile */}
            {!isMe ? (
              <View style={styles.actionButtons}>
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
                      styles.actionBtnText,
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
                    styles.outlineBtn,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                    !canMessage && { opacity: 0.4 },
                  ]}
                  activeOpacity={0.85}
                  onPress={handleMessage}
                  disabled={!canMessage}
                >
                  <Text style={[styles.actionBtnText, { color: colors.text }]}>
                    Message
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.iconBtn,
                    {
                      backgroundColor: colors.surface,
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
                    styles.outlineBtn,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => router.push("/profile/edit")}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.actionBtnText, { color: colors.text }]}>
                    Edit Profile
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.outlineBtn,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => router.push("/settings")}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.actionBtnText, { color: colors.text }]}>
                    Settings
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.iconBtn,
                    {
                      backgroundColor: colors.surface,
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

            {/* Name + badge */}
            <View style={styles.nameRow}>
              <Text style={[styles.displayName, { color: colors.text }]}>
                {target.full_name || target.username}
              </Text>
              {!!target.is_founder && <FounderBadge />}
            </View>
            <Text
              style={[styles.usernameText, { color: colors.textSecondary }]}
            >
              @{target.username}
            </Text>

            {!!target.bio && (
              <Text style={[styles.bio, { color: colors.textSecondary }]}>
                {target.bio}
              </Text>
            )}

            {!!target.location && (
              <View style={styles.locationRow}>
                <Ionicons
                  name="location-outline"
                  size={14}
                  color={colors.textTertiary}
                />
                <Text
                  style={[styles.locationText, { color: colors.textTertiary }]}
                >
                  {target.location}
                </Text>
              </View>
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
                  size={13}
                  color={colors.primary}
                />
                <Text
                  style={[styles.privatePillText, { color: colors.primary }]}
                >
                  Private account
                </Text>
              </View>
            )}

            {/* Stats row — Twitter style, below bio */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {loadingStats ? "…" : formatNumber(stats?.posts || 0)}
                </Text>
                <Text
                  style={[styles.statLabel, { color: colors.textTertiary }]}
                >
                  Posts
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

          {/* ── Underline tabs ───────────────────────────────────────────── */}
          <View
            style={[styles.tabsContainer, { borderBottomColor: colors.border }]}
          >
            {profileTabs.map((tab) => {
              const active = activeTab === tab;
              return (
                <TouchableOpacity
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  activeOpacity={0.7}
                  style={styles.tab}
                >
                  <Text
                    style={[
                      styles.tabText,
                      { color: active ? colors.text : colors.textTertiary },
                      active && styles.tabTextActive,
                    ]}
                  >
                    {tab}
                  </Text>
                  {active && (
                    <View
                      style={[
                        styles.tabUnderline,
                        { backgroundColor: colors.primary },
                      ]}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── Tab content ──────────────────────────────────────────────── */}
          <View style={styles.contentSection}>
            {/* POST */}
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
                ) : feedItems.length > 0 ? (
                  <View style={{ gap: 12 }}>
                    {feedItems.map((item) => {
                      const img = item.media_urls?.[0];
                      const isVid =
                        isVideoUrl(img) || item.post_type === "video";
                      const isQuote = !!item.quoted_post;
                      return (
                        <TouchableOpacity
                          key={`${item.kind}-${item.id}`}
                          style={[
                            styles.postCard,
                            { backgroundColor: colors.card },
                          ]}
                          onPress={() => router.push(`/post/${item.id}` as any)}
                          activeOpacity={0.9}
                        >
                          {item.kind === "repost" && (
                            <View style={styles.repostLabelRow}>
                              <Ionicons
                                name="repeat-outline"
                                size={13}
                                color={colors.textTertiary}
                              />
                              <Text
                                style={[
                                  styles.repostLabelText,
                                  { color: colors.textTertiary },
                                ]}
                              >
                                {isMe
                                  ? "You reposted"
                                  : `@${target.username} reposted`}
                              </Text>
                            </View>
                          )}
                          {item.kind === "repost" && item.original_author && (
                            <View style={styles.repostAuthorRow}>
                              {item.original_author.avatar_url ? (
                                <Image
                                  source={{
                                    uri: item.original_author.avatar_url,
                                  }}
                                  style={styles.repostAuthorAvatar}
                                />
                              ) : (
                                <View
                                  style={[
                                    styles.repostAuthorAvatar,
                                    styles.quotedAvatarPlaceholder,
                                    { backgroundColor: colors.primary },
                                  ]}
                                >
                                  <Text style={styles.quotedAvatarInitial}>
                                    {(
                                      item.original_author.username?.[0] ?? "U"
                                    ).toUpperCase()}
                                  </Text>
                                </View>
                              )}
                              <Text
                                style={[
                                  styles.repostAuthorName,
                                  { color: colors.text },
                                ]}
                                numberOfLines={1}
                              >
                                {item.original_author.full_name ??
                                  item.original_author.username ??
                                  "User"}
                              </Text>
                              <Text
                                style={[
                                  styles.repostAuthorHandle,
                                  { color: colors.textTertiary },
                                ]}
                                numberOfLines={1}
                              >
                                @{item.original_author.username ?? "user"}
                              </Text>
                            </View>
                          )}
                          {!!item.content && (
                            <MentionHashtagText
                              content={item.content}
                              style={[
                                styles.postContent,
                                {
                                  color: colors.text,
                                  marginBottom: isQuote ? 8 : 0,
                                },
                              ]}
                              numberOfLines={4}
                              hashtagColor={colors.primary}
                              onPress={() =>
                                router.push(`/post/${item.id}` as any)
                              }
                            />
                          )}
                          {isQuote && item.quoted_post && (
                            <View
                              style={[
                                styles.quotedCard,
                                {
                                  borderColor: colors.border,
                                  backgroundColor: colors.surface,
                                },
                              ]}
                            >
                              {item.quoted_post.user && (
                                <View style={styles.quotedAuthorRow}>
                                  {item.quoted_post.user.avatar_url ? (
                                    <Image
                                      source={{
                                        uri: item.quoted_post.user.avatar_url,
                                      }}
                                      style={styles.quotedAvatar}
                                    />
                                  ) : (
                                    <View
                                      style={[
                                        styles.quotedAvatar,
                                        styles.quotedAvatarPlaceholder,
                                        { backgroundColor: colors.primary },
                                      ]}
                                    >
                                      <Text style={styles.quotedAvatarInitial}>
                                        {(
                                          item.quoted_post.user.username?.[0] ??
                                          "U"
                                        ).toUpperCase()}
                                      </Text>
                                    </View>
                                  )}
                                  <View style={{ flex: 1, minWidth: 0 }}>
                                    <Text
                                      style={[
                                        styles.quotedFullName,
                                        { color: colors.text },
                                      ]}
                                      numberOfLines={1}
                                    >
                                      {item.quoted_post.user.full_name ??
                                        item.quoted_post.user.username ??
                                        "User"}
                                    </Text>
                                    <Text
                                      style={[
                                        styles.quotedAuthor,
                                        { color: colors.textTertiary },
                                      ]}
                                      numberOfLines={1}
                                    >
                                      @
                                      {item.quoted_post.user.username ?? "user"}
                                    </Text>
                                  </View>
                                </View>
                              )}
                              {!!item.quoted_post.content ? (
                                <MentionHashtagText
                                  content={item.quoted_post.content}
                                  style={[
                                    styles.quotedContent,
                                    { color: colors.textSecondary },
                                  ]}
                                  numberOfLines={4}
                                  hashtagColor={colors.primary}
                                  onPress={() =>
                                    router.push(
                                      `/post/${item.quoted_post!.id}` as any,
                                    )
                                  }
                                />
                              ) : (
                                <Text
                                  style={[
                                    styles.quotedContent,
                                    { color: colors.textTertiary },
                                  ]}
                                >
                                  Post unavailable
                                </Text>
                              )}
                              {!!item.quoted_post.media_urls?.[0] && (
                                <Image
                                  source={{
                                    uri: item.quoted_post.media_urls[0],
                                  }}
                                  style={styles.quotedMedia}
                                  resizeMode="cover"
                                />
                              )}
                            </View>
                          )}
                          {!!img && !isQuote && (
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
                      {isMe
                        ? "Posts you write or repost will appear here."
                        : `@${target.username} hasn't posted anything yet.`}
                    </Text>
                  </View>
                )}
              </>
            )}

            {/* REPLIES */}
            {activeTab === "Replies" && (
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
                      Follow to see replies from @{target.username}.
                    </Text>
                  </View>
                ) : loadingReplies ? (
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
                ) : replyItems && replyItems.length > 0 ? (
                  <View style={{ gap: 12 }}>
                    {replyItems.map((reply) => (
                      <TouchableOpacity
                        key={reply.id}
                        style={[
                          styles.postCard,
                          { backgroundColor: colors.card },
                        ]}
                        onPress={() =>
                          router.push(`/post/${reply.parent_post_id}` as any)
                        }
                        activeOpacity={0.9}
                      >
                        <Text
                          style={[
                            styles.repostLabelText,
                            { color: colors.textTertiary, marginBottom: 6 },
                          ]}
                        >
                          Replying to{" "}
                          {reply.parent_post_author?.username
                            ? `@${reply.parent_post_author.username}`
                            : "a post"}
                        </Text>
                        <MentionHashtagText
                          content={reply.content}
                          style={[styles.postContent, { color: colors.text }]}
                          numberOfLines={4}
                          hashtagColor={colors.primary}
                          onPress={() =>
                            router.push(`/post/${reply.parent_post_id}` as any)
                          }
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <View
                    style={[styles.emptyCard, { backgroundColor: colors.card }]}
                  >
                    <Ionicons
                      name="chatbubble-outline"
                      size={40}
                      color={colors.textTertiary}
                    />
                    <Text style={[styles.emptyTitle, { color: colors.text }]}>
                      No Replies Yet
                    </Text>
                    <Text
                      style={[
                        styles.emptyDescription,
                        { color: colors.textTertiary },
                      ]}
                    >
                      {isMe
                        ? "Replies you make to other posts will appear here."
                        : `@${target.username} hasn't replied to anything yet.`}
                    </Text>
                  </View>
                )}
              </>
            )}

            {/* TAGGED */}
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
                  Posts where this user is tagged will appear here.
                </Text>
              </View>
            )}

            {/* MEDIA */}
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
                ) : loadingOwnPosts ? (
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
                      const rows: ProfileFeedItem[][] = [];
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
                      Photos and videos from posts will appear here.
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
            isMuted={!!isMuted}
            onMessage={canMessage ? handleMessage : undefined}
            onCopyLink={handleCopyProfileLink}
            onMute={() => {
              sheetRef.current?.close();
              muteMutation.mutate(!!isMuted);
            }}
            onRemove={
              isFollowing || isRequested
                ? async () => {
                    sheetRef.current?.close();
                    if (!user?.uid || !target?.id || !followEdge) return;
                    const snap = await firestore()
                      .collection("follows")
                      .where("follower_id", "==", user.uid)
                      .where("following_id", "==", target.id)
                      .get();
                    await Promise.all(snap.docs.map((d) => d.ref.delete()));
                    qc.invalidateQueries({
                      queryKey: ["follow-edge", user.uid, target.id],
                    });
                    qc.invalidateQueries({
                      queryKey: ["user-stats", target.id],
                    });
                    qc.invalidateQueries({
                      queryKey: ["user-stats", user.uid],
                    });
                  }
                : undefined
            }
            onBlock={() => {
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
            onReport={() => {
              sheetRef.current?.close();
              Alert.alert("Report", "Thank you — we'll review this account.");
            }}
          />
        )}
      </SafeAreaView>

      <ShareSheet
        ref={shareSheetRef}
        title="Share Profile"
        url={`https://nebulanet.space/user/${target.username}`}
        text={`Check out @${target.username} on NebulaNet!${target.full_name ? ` (${target.full_name})` : ""}`}
        shareMessage={`Check out @${target.username} on NebulaNet!`}
      />
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

  // Banner + avatar
  bannerWrap: {
    width: "100%",
    height: BANNER_HEIGHT,
    marginBottom: 0,
    zIndex: 10,
  },
  bannerImage: { width: "100%", height: BANNER_HEIGHT },
  avatarOverlap: {
    position: "absolute",
    bottom: -AVATAR_OVERLAP,
    left: 20,
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 4,
  },
  avatar: { width: "100%", height: "100%", borderRadius: AVATAR_SIZE / 2 },
  avatarFallback: {
    width: "100%",
    height: "100%",
    borderRadius: AVATAR_SIZE / 2,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarFallbackText: { fontSize: 28, fontWeight: "800", color: "#fff" },

  // Profile card
  profileCard: {
    borderRadius: 22,
    padding: 18,
    paddingTop: AVATAR_OVERLAP + 10,
    marginHorizontal: 16,
    marginTop: 0,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 2,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "flex-end",
    marginBottom: 12,
  },
  followBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 22,
    alignItems: "center",
  },
  outlineBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 22,
    alignItems: "center",
    borderWidth: 1,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  actionBtnText: { fontSize: 14, fontWeight: "800" },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  displayName: { fontSize: 17, fontWeight: "900" },
  usernameText: { fontSize: 14, marginBottom: 8 },
  bio: { fontSize: 13.5, lineHeight: 19, marginBottom: 8 },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 8,
  },
  locationText: { fontSize: 13 },
  privatePill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 10,
  },
  privatePillText: { fontSize: 12, fontWeight: "800" },
  statsRow: { flexDirection: "row", gap: 20, marginTop: 4 },
  statItem: { flexDirection: "row", alignItems: "baseline", gap: 4 },
  statValue: { fontSize: 15, fontWeight: "900" },
  statLabel: { fontSize: 13, fontWeight: "600" },

  // Underline tabs
  tabsContainer: {
    flexDirection: "row",
    marginHorizontal: 18,
    borderBottomWidth: 1,
    marginBottom: 12,
  },
  tab: { flex: 1, alignItems: "center", paddingVertical: 13 },
  tabText: { fontSize: 13.5, fontWeight: "700" },
  tabTextActive: { fontWeight: "900" },
  tabUnderline: {
    position: "absolute",
    bottom: -1,
    height: 3,
    width: "56%",
    borderRadius: 2,
  },

  // Content
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
  repostLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  repostLabelText: { fontSize: 12, fontWeight: "700" },
  repostAuthorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  repostAuthorAvatar: { width: 24, height: 24, borderRadius: 12 },
  repostAuthorName: { fontSize: 13, fontWeight: "800" },
  repostAuthorHandle: { fontSize: 12, fontWeight: "500" },
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
  quotedCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginTop: 4,
    gap: 8,
  },
  quotedAuthorRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  quotedAvatar: { width: 28, height: 28, borderRadius: 14 },
  quotedAvatarPlaceholder: { alignItems: "center", justifyContent: "center" },
  quotedAvatarInitial: { fontSize: 12, fontWeight: "800", color: "#fff" },
  quotedFullName: { fontSize: 13, fontWeight: "700" },
  quotedAuthor: { fontSize: 12, fontWeight: "500" },
  quotedContent: { fontSize: 13, lineHeight: 18 },
  quotedMedia: { width: "100%", height: 140, borderRadius: 10, marginTop: 2 },
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

export const options = { headerShown: false };
