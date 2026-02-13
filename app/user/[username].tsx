// app/user/[username].tsx

import { useAuth } from "@/hooks/useAuth";
import { createOrOpenChat } from "@/hooks/useCreateOrOpenChat";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import {
  Alert,
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

type UserProfile = {
  id: string;
  username: string;
  full_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  location?: string | null;
  is_private?: boolean | null;
};

type PrivacyFlags = {
  hide_followers: boolean;
  hide_following: boolean;
};

type UserStats = {
  posts: number;
  followers: number;
  following: number;
};

type PostRow = {
  id: string;
  content: string;
  media_urls: string[] | null;
  created_at: string;
};

type FollowEdge = {
  follower_id: string;
  following_id: string;
  status: "accepted" | "pending";
};

type BlockEdge = {
  blocker_id: string;
  blocked_id: string;
};

const profileTabs = ["Activity", "Post", "Tagged", "Media"] as const;

function Skeleton({ style }: { style: any }) {
  return <View style={[styles.skel, style]} />;
}

function formatNumber(num: number) {
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return String(num);
}

export default function UserProfileScreen() {
  const { username: raw } = useLocalSearchParams<{ username: string }>();
  const username = raw?.replace("@", "") ?? "";

  const { user } = useAuth();
  const qc = useQueryClient();

  const sheetRef = useRef<UserActionsSheetRef>(null);

  const [activeTab, setActiveTab] =
    useState<(typeof profileTabs)[number]>("Activity");

  // 1) Load target profile
  const { data: target, isLoading: loadingProfile } = useQuery({
    queryKey: ["user-profile", username],
    enabled: !!username,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,username,full_name,bio,avatar_url,location,is_private")
        .eq("username", username)
        .maybeSingle();

      if (error) throw error;
      return (data as UserProfile | null) ?? null;
    },
  });

  const isMe = useMemo(() => {
    return !!target?.id && target.id === user?.id;
  }, [target?.id, user?.id]);

  // 2) Follow edge (am I following / requested?)
  const { data: followEdge, isLoading: loadingEdge } = useQuery({
    queryKey: ["follow-edge", user?.id, target?.id],
    enabled: !!user?.id && !!target?.id && !isMe,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("follows")
        .select("follower_id,following_id,status")
        .eq("follower_id", user!.id)
        .eq("following_id", target!.id)
        .maybeSingle();

      if (error) throw error;
      return (data as FollowEdge | null) ?? null;
    },
  });

  const isFollowing = !!followEdge && followEdge.status === "accepted";
  const isRequested = !!followEdge && followEdge.status === "pending";

  // 2.5) Block edge (either direction)
  const { data: blockEdge } = useQuery({
    queryKey: ["block-edge", user?.id, target?.id],
    enabled: !!user?.id && !!target?.id && !isMe,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_blocks")
        .select("blocker_id,blocked_id")
        .or(
          `and(blocker_id.eq.${user!.id},blocked_id.eq.${target!.id}),and(blocker_id.eq.${target!.id},blocked_id.eq.${user!.id})`,
        )
        .maybeSingle();

      if (error) throw error;
      return (data as BlockEdge | null) ?? null;
    },
  });

  const isBlocked = !!blockEdge;

  // 3) Can view posts?
  const isPrivate = !!target?.is_private;
  const canViewPosts = useMemo(() => {
    if (!target?.id) return false;
    if (isMe) return true;
    if (!isPrivate) return true;
    return isFollowing;
  }, [target?.id, isMe, isPrivate, isFollowing]);

  // 4) Privacy flags via RPC (your function maps from is_private)
  const { data: privacyFlags, isLoading: loadingFlags } = useQuery({
    queryKey: ["profile-privacy-flags", target?.id, user?.id],
    enabled: !!target?.id,
    queryFn: async () => {
      if (isMe) return { hide_followers: false, hide_following: false };

      const { data, error } = await supabase.rpc("get_profile_privacy_flags", {
        owner_id: target!.id,
      });

      if (error) throw error;

      const first = Array.isArray(data) ? data[0] : null;
      return (
        (first as PrivacyFlags | undefined) ?? {
          hide_followers: false,
          hide_following: false,
        }
      );
    },
  });

  const hideFollowers = !!privacyFlags?.hide_followers;
  const hideFollowing = !!privacyFlags?.hide_following;

  // 5) Stats
  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ["user-stats", target?.id],
    enabled: !!target?.id,
    queryFn: async (): Promise<UserStats> => {
      const uid = target!.id;

      const [
        { count: postsCount },
        { count: followersCount },
        { count: followingCount },
      ] = await Promise.all([
        supabase
          .from("posts")
          .select("*", { count: "exact", head: true })
          .eq("user_id", uid),
        supabase
          .from("follows")
          .select("*", { count: "exact", head: true })
          .eq("following_id", uid)
          .eq("status", "accepted"),
        supabase
          .from("follows")
          .select("*", { count: "exact", head: true })
          .eq("follower_id", uid)
          .eq("status", "accepted"),
      ]);

      return {
        posts: postsCount || 0,
        followers: followersCount || 0,
        following: followingCount || 0,
      };
    },
  });

  // 6) Posts (only fetch if allowed)
  const { data: posts, isLoading: loadingPosts } = useQuery({
    queryKey: ["user-posts", target?.id],
    enabled: !!target?.id && canViewPosts,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("id,content,media_urls,created_at")
        .eq("user_id", target!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data as PostRow[]) ?? [];
    },
  });

  // 7) Optimistic follow/unfollow
  const followMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !target?.id) throw new Error("Missing ids");

      if (followEdge) {
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", user.id)
          .eq("following_id", target.id);
        if (error) throw error;
        return { next: null as FollowEdge | null };
      }

      const { data, error } = await supabase
        .from("follows")
        .insert({
          follower_id: user.id,
          following_id: target.id,
        })
        .select("follower_id,following_id,status")
        .single();

      if (error) throw error;
      return { next: data as FollowEdge };
    },
    onMutate: async () => {
      if (!user?.id || !target?.id) return;

      const edgeKey = ["follow-edge", user.id, target.id];
      const statsKey = ["user-stats", target.id];

      await Promise.all([
        qc.cancelQueries({ queryKey: edgeKey }),
        qc.cancelQueries({ queryKey: statsKey }),
      ]);

      const prevEdge = qc.getQueryData<FollowEdge | null>(edgeKey);
      const prevStats = qc.getQueryData<UserStats>(statsKey);

      if (prevEdge) {
        qc.setQueryData(edgeKey, null);

        if (prevStats && prevEdge.status === "accepted") {
          qc.setQueryData<UserStats>(statsKey, {
            ...prevStats,
            followers: Math.max(0, prevStats.followers - 1),
          });
        }
      } else {
        const guessedStatus: FollowEdge["status"] = target.is_private
          ? "pending"
          : "accepted";

        qc.setQueryData<FollowEdge>(edgeKey, {
          follower_id: user.id,
          following_id: target.id,
          status: guessedStatus,
        });

        if (prevStats && guessedStatus === "accepted") {
          qc.setQueryData<UserStats>(statsKey, {
            ...prevStats,
            followers: prevStats.followers + 1,
          });
        }
      }

      return { prevEdge, prevStats };
    },
    onError: (err, _vars, ctx) => {
      if (!user?.id || !target?.id) return;

      const edgeKey = ["follow-edge", user.id, target.id];
      const statsKey = ["user-stats", target.id];

      if (ctx?.prevEdge !== undefined) qc.setQueryData(edgeKey, ctx.prevEdge);
      if (ctx?.prevStats !== undefined)
        qc.setQueryData(statsKey, ctx.prevStats);

      Alert.alert("Error", String(err));
    },
    onSettled: async () => {
      if (!user?.id || !target?.id) return;

      qc.invalidateQueries({ queryKey: ["follow-edge", user.id, target.id] });
      qc.invalidateQueries({ queryKey: ["user-stats", target.id] });
      qc.invalidateQueries({ queryKey: ["user-posts", target.id] });
      qc.invalidateQueries({
        queryKey: ["profile-privacy-flags", target.id, user.id],
      });
    },
  });

  // 8) Block mutation
  const blockMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !target?.id) throw new Error("Missing ids");

      const { error } = await supabase.from("user_blocks").insert({
        blocker_id: user.id,
        blocked_id: target.id,
      });

      if (error) throw error;
      return target.id;
    },
    onSuccess: (targetId) => {
      invalidateAfterBlock(qc, user!.id, targetId);

      qc.invalidateQueries({ queryKey: ["user-profile", username] });
      qc.invalidateQueries({ queryKey: ["user-stats", targetId] });
      qc.invalidateQueries({ queryKey: ["user-posts", targetId] });
      qc.invalidateQueries({ queryKey: ["follow-edge", user!.id, targetId] });
      qc.invalidateQueries({
        queryKey: ["profile-privacy-flags", targetId, user?.id],
      });

      router.back();
    },
    onError: (err) => {
      Alert.alert("Error", String(err));
    },
  });

  const followBtnText = isFollowing
    ? "Following"
    : isRequested
      ? "Requested"
      : "Follow";

  const followBtnStyle =
    isFollowing || isRequested ? styles.followingButton : styles.followButton;

  const followBtnTextStyle =
    isFollowing || isRequested
      ? styles.followingButtonText
      : styles.followButtonText;

  const handleShareProfile = async () => {
    try {
      await Share.share({ message: `Check out @${username} on NebulaNet!` });
    } catch (e) {
      console.error(e);
    }
  };

  const goFollowers = () => {
    if (!target) return;

    if (!isMe && hideFollowers) {
      Alert.alert("Hidden", "This user has hidden their followers list.");
      return;
    }

    router.push(`/user/${target.username}/followers`);
  };

  const goFollowing = () => {
    if (!target) return;

    if (!isMe && hideFollowing) {
      Alert.alert("Hidden", "This user has hidden their following list.");
      return;
    }

    router.push(`/user/${target.username}/following`);
  };

  // DM rules: blocked OR (private + not following) => no message
  const canMessage = !isBlocked && (!isPrivate || isFollowing);

  const handleMessage = async () => {
    if (!user?.id || !target?.id) return;

    if (isBlocked) {
      Alert.alert("Message unavailable", "You can’t message this user.");
      return;
    }

    if (isPrivate && !isFollowing) {
      Alert.alert("Private account", "Follow this user to message them.");
      return;
    }

    try {
      const conversationId = await createOrOpenChat(user.id, target.id);
      router.push(`/chat/${conversationId}`);
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Could not start conversation.");
    }
  };

  if (loadingProfile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerBtn} />
          <Skeleton style={{ height: 14, width: 160, borderRadius: 10 }} />
          <View style={styles.headerBtn} />
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.profileCard}>
            <View style={styles.profileTopRow}>
              <Skeleton style={{ width: 80, height: 80, borderRadius: 40 }} />
              <View style={styles.statsRow}>
                {Array.from({ length: 3 }).map((_, i) => (
                  <View key={i} style={styles.statItem}>
                    <Skeleton
                      style={{ width: 44, height: 18, borderRadius: 10 }}
                    />
                    <Skeleton
                      style={{
                        width: 60,
                        height: 10,
                        borderRadius: 10,
                        marginTop: 8,
                      }}
                    />
                  </View>
                ))}
              </View>
            </View>

            <Skeleton style={{ width: 180, height: 14, borderRadius: 10 }} />
            <Skeleton
              style={{
                width: 260,
                height: 12,
                borderRadius: 10,
                marginTop: 10,
              }}
            />
            <Skeleton
              style={{ width: 220, height: 12, borderRadius: 10, marginTop: 8 }}
            />

            <View style={[styles.actionButtons, { marginTop: 16 }]}>
              <Skeleton style={{ flex: 1, height: 40, borderRadius: 8 }} />
              <Skeleton style={{ flex: 1, height: 40, borderRadius: 8 }} />
              <Skeleton style={{ width: 40, height: 40, borderRadius: 8 }} />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!target) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Not Found</Text>
          <View style={styles.headerBtn} />
        </View>

        <View style={styles.emptyState}>
          <Ionicons name="person-outline" size={64} color="#C5CAE9" />
          <Text style={styles.emptyTitle}>User Not Found</Text>
          <Text style={styles.emptyDescription}>
            This user doesn&apos;t exist or has been deleted.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const followersDisplay =
    !isMe && hideFollowers ? "—" : formatNumber(stats?.followers || 0);
  const followingDisplay =
    !isMe && hideFollowing ? "—" : formatNumber(stats?.following || 0);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>@{target.username}</Text>

        {!isMe ? (
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => sheetRef.current?.snapToIndex(0)}
          >
            <Ionicons name="ellipsis-vertical" size={20} color="#000" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={handleShareProfile}
          >
            <Ionicons name="share-outline" size={22} color="#000" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileCard}>
          <View style={styles.profileTopRow}>
            <View style={styles.profileImageContainer}>
              {target.avatar_url ? (
                <Image
                  source={{ uri: target.avatar_url }}
                  style={styles.profileImage}
                />
              ) : (
                <View style={styles.profileImagePlaceholder}>
                  <Text style={styles.profileImageText}>
                    {(target.username?.charAt(0) || "U").toUpperCase()}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {loadingStats ? "…" : formatNumber(stats?.posts || 0)}
                </Text>
                <Text style={styles.statLabel}>Post</Text>
              </View>

              <Pressable style={styles.statItem} onPress={goFollowers}>
                <Text style={styles.statValue}>
                  {loadingStats || loadingFlags ? "…" : followersDisplay}
                </Text>
                <Text style={styles.statLabel}>
                  Followers {!isMe && hideFollowers ? "• Hidden" : ""}
                </Text>
              </Pressable>

              <Pressable style={styles.statItem} onPress={goFollowing}>
                <Text style={styles.statValue}>
                  {loadingStats || loadingFlags ? "…" : followingDisplay}
                </Text>
                <Text style={styles.statLabel}>
                  Following {!isMe && hideFollowing ? "• Hidden" : ""}
                </Text>
              </Pressable>
            </View>
          </View>

          <Text style={styles.displayName}>
            {target.full_name || target.username}
          </Text>
          {!!target.bio && <Text style={styles.bio}>{target.bio}</Text>}

          {target.is_private ? (
            <View style={styles.privatePill}>
              <Ionicons name="lock-closed-outline" size={14} color="#4C1D95" />
              <Text style={styles.privatePillText}>Private account</Text>
            </View>
          ) : null}

          {!isMe ? (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.followButtonBase, followBtnStyle]}
                onPress={() => followMutation.mutate()}
                activeOpacity={0.9}
                disabled={followMutation.isPending || loadingEdge}
              >
                <Text style={[styles.followButtonBaseText, followBtnTextStyle]}>
                  {loadingEdge ? "…" : followBtnText}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.messageButton, !canMessage && { opacity: 0.4 }]}
                activeOpacity={0.9}
                onPress={handleMessage}
                disabled={!canMessage}
              >
                <Text style={styles.messageButtonText}>Message</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.shareButton}
                onPress={handleShareProfile}
                activeOpacity={0.9}
              >
                <Ionicons name="share-outline" size={18} color="#000" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.messageButton}
                onPress={() => router.push("/profile/edit")}
                activeOpacity={0.9}
              >
                <Text style={styles.messageButtonText}>Edit Profile</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.messageButton}
                onPress={() => router.push("/settings")}
                activeOpacity={0.9}
              >
                <Text style={styles.messageButtonText}>Settings</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.shareButton}
                onPress={handleShareProfile}
              >
                <Ionicons name="share-outline" size={18} color="#000" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.tabsContainer}>
          {profileTabs.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.activeTab]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.9}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab && styles.activeTabText,
                ]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.contentSection}>
          {activeTab === "Activity" && (
            <View style={styles.emptyState}>
              <Ionicons name="pulse-outline" size={64} color="#C5CAE9" />
              <Text style={styles.emptyTitle}>No Activity Yet</Text>
              <Text style={styles.emptyDescription}>
                This user&apos;s recent activity will appear here
              </Text>
            </View>
          )}

          {activeTab === "Post" && (
            <>
              {!canViewPosts ? (
                <View style={styles.lockedCard}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={28}
                    color="#7C3AED"
                  />
                  <Text style={styles.lockedTitle}>
                    This account is private
                  </Text>
                  <Text style={styles.lockedDesc}>
                    Follow to see posts from @{target.username}.
                  </Text>
                </View>
              ) : loadingPosts ? (
                <View style={{ gap: 12 }}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <View key={i} style={styles.postCard}>
                      <Skeleton
                        style={{ height: 12, width: "75%", borderRadius: 10 }}
                      />
                      <Skeleton
                        style={{
                          height: 12,
                          width: "92%",
                          borderRadius: 10,
                          marginTop: 10,
                        }}
                      />
                      <Skeleton
                        style={{
                          height: 12,
                          width: "58%",
                          borderRadius: 10,
                          marginTop: 10,
                        }}
                      />
                    </View>
                  ))}
                </View>
              ) : posts && posts.length > 0 ? (
                <View style={{ gap: 12 }}>
                  {posts.map((p) => (
                    <View key={p.id} style={styles.postCard}>
                      <Text style={styles.postContent}>{p.content}</Text>

                      {!!p.media_urls?.[0] && (
                        <Image
                          source={{ uri: p.media_urls[0] }}
                          style={styles.postImage}
                          resizeMode="cover"
                        />
                      )}
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons
                    name="document-text-outline"
                    size={64}
                    color="#C5CAE9"
                  />
                  <Text style={styles.emptyTitle}>No Posts Yet</Text>
                  <Text style={styles.emptyDescription}>
                    This user hasn&apos;t posted anything yet
                  </Text>
                </View>
              )}
            </>
          )}

          {activeTab === "Tagged" && (
            <View style={styles.emptyState}>
              <Ionicons name="pricetag-outline" size={64} color="#C5CAE9" />
              <Text style={styles.emptyTitle}>No Tags Yet</Text>
              <Text style={styles.emptyDescription}>
                Posts where this user is tagged will appear here
              </Text>
            </View>
          )}

          {activeTab === "Media" && (
            <View style={styles.emptyState}>
              <Ionicons name="images-outline" size={64} color="#C5CAE9" />
              <Text style={styles.emptyTitle}>No Media</Text>
              <Text style={styles.emptyDescription}>
                Photos and videos will appear here
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {!isMe ? (
        <UserActionsSheet
          ref={sheetRef}
          username={target.username}
          onRemove={async () => {
            sheetRef.current?.close();
            if (!user?.id || !target?.id) return;
            if (!followEdge) return;

            const { error } = await supabase
              .from("follows")
              .delete()
              .eq("follower_id", user.id)
              .eq("following_id", target.id);

            if (!error) {
              qc.invalidateQueries({
                queryKey: ["follow-edge", user.id, target.id],
              });
              qc.invalidateQueries({ queryKey: ["user-stats", target.id] });
              qc.invalidateQueries({ queryKey: ["user-posts", target.id] });
            }
          }}
          onBlock={async () => {
            sheetRef.current?.close();

            Alert.alert(
              "Block user?",
              `You won't see @${target.username} and they won't see you.`,
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: blockMutation.isPending ? "Blocking..." : "Block",
                  style: "destructive",
                  onPress: () => blockMutation.mutate(),
                },
              ],
            );
          }}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#E8EAF6" },
  scrollView: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#E8EAF6",
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 16, fontWeight: "600", color: "#000" },

  profileCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
  },
  profileTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  profileImageContainer: { marginRight: 20 },
  profileImage: { width: 80, height: 80, borderRadius: 40 },
  profileImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#7C3AED",
    justifyContent: "center",
    alignItems: "center",
  },
  profileImageText: { fontSize: 32, fontWeight: "bold", color: "#FFFFFF" },

  statsRow: { flex: 1, flexDirection: "row", justifyContent: "space-around" },
  statItem: { alignItems: "center" },
  statValue: { fontSize: 20, fontWeight: "700", color: "#000" },
  statLabel: { fontSize: 13, color: "#666", marginTop: 4, textAlign: "center" },

  displayName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
    marginBottom: 8,
  },
  bio: { fontSize: 14, color: "#666", lineHeight: 20, marginBottom: 10 },

  privatePill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    backgroundColor: "#EDEBFF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 14,
  },
  privatePillText: { fontSize: 12, fontWeight: "800", color: "#4C1D95" },

  actionButtons: { flexDirection: "row", gap: 8 },

  followButtonBase: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  followButtonBaseText: { fontSize: 14, fontWeight: "600" },
  followButton: { backgroundColor: "#7C3AED" },
  followButtonText: { color: "#FFFFFF" },
  followingButton: { backgroundColor: "#F5F5F5" },
  followingButtonText: { color: "#666" },

  messageButton: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  messageButtonText: { fontSize: 14, fontWeight: "600", color: "#000" },

  shareButton: {
    backgroundColor: "#F5F5F5",
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  tabsContainer: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 25,
    padding: 4,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 22 },
  activeTab: { backgroundColor: "#7C3AED" },
  tabText: { fontSize: 14, color: "#666", fontWeight: "500" },
  activeTabText: { color: "#FFFFFF", fontWeight: "600" },

  contentSection: { paddingHorizontal: 16, paddingBottom: 20 },

  postCard: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16 },
  postContent: { fontSize: 14, color: "#666", lineHeight: 20 },
  postImage: { width: "100%", height: 200, borderRadius: 12, marginTop: 12 },

  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: "#9FA8DA",
    textAlign: "center",
    lineHeight: 20,
  },

  lockedCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
    gap: 8,
  },
  lockedTitle: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
  },
  lockedDesc: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 18,
  },

  skel: { backgroundColor: "#E5E7EB" },
});
