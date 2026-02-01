// app/community/[slug].tsx
import Button from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { ResizeMode, Video } from "expo-av";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import * as VideoThumbnails from "expo-video-thumbnails";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Community = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  is_private: boolean;
  owner_id: string;
  avatar_url?: string | null;
  banner_url?: string | null;
  member_count?: number | null;
  post_count?: number | null;
};

type ProfileLite = {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
};

type Post = {
  id: string;
  user_id: string;
  community_id: string | null;
  content: string;
  media_urls: string[];
  created_at: string;
  profiles?: {
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
};

type Rule = {
  id: string;
  community_id: string;
  title: string;
  description: string | null;
  rule_order: number;
};

type Member = {
  user_id: string;
  joined_at: string;
  profiles?: {
    id?: string;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
};

type MediaGridItem = {
  postId: string;
  url: string;
  type: "image" | "video";
  thumbUrl?: string;
};

type PickedMedia = {
  uri: string;
  type: "image" | "video";
  thumbnail?: string;
};

type ReportRow = {
  id: string;
  created_at: string;
  reporter_id: string;
  community_id: string | null;
  target_type: "post" | "comment" | "user" | "community";
  target_id: string;
  reason: string;
  details: string | null;
  status: "open" | "reviewing" | "resolved" | "dismissed";
  reviewed_by: string | null;
  reviewed_at: string | null;
  resolution_notes: string | null;
  reporter?: {
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
};

function formatTimeAgo(iso: string) {
  try {
    const d = new Date(iso).getTime();
    const now = Date.now();
    const diff = Math.max(0, now - d);
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    return `${days}d`;
  } catch {
    return "";
  }
}

function isVideoUrl(url: string) {
  const u = url.toLowerCase();
  return (
    u.endsWith(".mp4") ||
    u.endsWith(".mov") ||
    u.endsWith(".m4v") ||
    u.endsWith(".webm") ||
    u.includes("video")
  );
}

function LockedCommunity({ onJoin }: { onJoin: () => void }) {
  return (
    <View style={{ padding: 18 }}>
      <View style={styles.lockCard}>
        <Ionicons name="lock-closed-outline" size={28} color="#6B7280" />
        <Text style={styles.lockTitle}>Private community</Text>
        <Text style={styles.lockSub}>
          Join to view posts, members, rules, and media.
        </Text>

        <TouchableOpacity
          onPress={onJoin}
          activeOpacity={0.9}
          style={styles.lockJoinBtn}
        >
          <Text style={styles.lockJoinText}>Join Community</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function CommunityScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { user } = useAuth();

  const [community, setCommunity] = useState<Community | null>(null);
  const [rules, setRules] = useState<Rule[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [communityMedia, setCommunityMedia] = useState<MediaGridItem[]>([]);

  const [isJoined, setIsJoined] = useState(false);
  const [isModerator, setIsModerator] = useState(false);

  const [activeTab, setActiveTab] = useState<
    "feed" | "members" | "rules" | "media"
  >("feed");

  const [postContent, setPostContent] = useState("");
  const [pickedMedia, setPickedMedia] = useState<PickedMedia[]>([]);
  const [posting, setPosting] = useState(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Media viewer
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  // Report modal
  const [reportOpen, setReportOpen] = useState(false);
  const [reportTargetPost, setReportTargetPost] = useState<Post | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);

  // Moderator panel
  const [modOpen, setModOpen] = useState(false);
  const [modTab, setModTab] = useState<"reports" | "members" | "actions">(
    "reports",
  );
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [modLoading, setModLoading] = useState(false);

  const isLocked = useMemo(
    () => !!community?.is_private && !isJoined,
    [community?.is_private, isJoined],
  );

  const loadCommunity = useCallback(async () => {
    if (!slug) return;
    setLoading(true);

    try {
      // 1) Community
      const { data: communityData, error: communityErr } = await supabase
        .from("communities")
        .select(
          "id, slug, name, description, is_private, owner_id, avatar_url, banner_url",
        )
        .eq("slug", slug)
        .single();

      if (communityErr) throw communityErr;
      setCommunity(communityData as any);

      const cId = (communityData as any).id as string;

      // 2) Membership + moderator status
      if (user?.id) {
        const [{ data: memRow }, { data: modRow }] = await Promise.all([
          supabase
            .from("community_members")
            .select("id")
            .eq("community_id", cId)
            .eq("user_id", user.id)
            .maybeSingle(),
          supabase
            .from("community_moderators")
            .select("id")
            .eq("community_id", cId)
            .eq("user_id", user.id)
            .eq("is_active", true)
            .maybeSingle(),
        ]);

        const joined = !!memRow || (communityData as any).owner_id === user.id;
        setIsJoined(joined);
        setIsModerator(!!modRow || (communityData as any).owner_id === user.id);
      } else {
        setIsJoined(false);
        setIsModerator(false);
      }

      // 3) Rules (RLS will auto-block if private and not member)
      const { data: rulesData, error: rulesErr } = await supabase
        .from("community_rules")
        .select("id, community_id, title, description, rule_order")
        .eq("community_id", cId)
        .order("rule_order", { ascending: true });

      if (rulesErr) {
        // If locked, this may error depending on your setup — ignore here, UI gates anyway
        setRules([]);
      } else {
        setRules((rulesData ?? []) as any);
      }

      // 4) Members
      const { data: membersData, error: membersErr } = await supabase
        .from("community_members")
        .select(
          "user_id, joined_at, profiles:profiles(id, username, full_name, avatar_url)",
        )
        .eq("community_id", cId)
        .order("joined_at", { ascending: false })
        .limit(50);

      if (membersErr) setMembers([]);
      else setMembers((membersData ?? []) as any);

      // 5) Posts
      const { data: postsData, error: postsErr } = await supabase
        .from("posts")
        .select(
          "id, user_id, community_id, content, media_urls, created_at, profiles:profiles(username, full_name, avatar_url)",
        )
        .eq("community_id", cId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (postsErr) setPosts([]);
      else setPosts((postsData ?? []) as any);

      // 6) Media grid from posts.media_urls
      const flat: MediaGridItem[] = [];
      for (const p of (postsData ?? []) as any[]) {
        const urls: string[] = p.media_urls || [];
        for (const url of urls) {
          const type = isVideoUrl(url) ? "video" : "image";
          flat.push({ postId: p.id, url, type });
        }
      }
      setCommunityMedia(flat);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to load community.");
    } finally {
      setLoading(false);
    }
  }, [slug, user?.id]);

  useEffect(() => {
    loadCommunity();
  }, [loadCommunity]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCommunity();
    setRefreshing(false);
  };

  const handleJoinToggle = async () => {
    if (!user?.id || !community?.id) {
      Alert.alert("Login required", "Please log in to join communities.");
      return;
    }

    try {
      if (isJoined) {
        const { error } = await supabase
          .from("community_members")
          .delete()
          .eq("community_id", community.id)
          .eq("user_id", user.id);

        if (error) throw error;
        setIsJoined(false);
        if (community.is_private) setActiveTab("feed");
      } else {
        const { error } = await supabase.from("community_members").insert({
          community_id: community.id,
          user_id: user.id,
        });

        if (error) throw error;
        setIsJoined(true);
      }

      await loadCommunity();
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to update membership.");
    }
  };

  // ---------- Community post + media upload ----------
  const pickCommunityMedia = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission required",
        "We need access to your photos/videos.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: true,
      selectionLimit: 10,
      quality: 0.85,
      videoMaxDuration: 60,
    });

    if (result.canceled || !result.assets?.length) return;

    const items: PickedMedia[] = await Promise.all(
      result.assets.map(async (asset) => {
        const type: "image" | "video" =
          asset.type === "video" ? "video" : "image";
        const obj: PickedMedia = { uri: asset.uri, type };

        if (type === "video") {
          try {
            const { uri } = await VideoThumbnails.getThumbnailAsync(asset.uri, {
              time: 0,
            });
            obj.thumbnail = uri;
          } catch {}
        }

        return obj;
      }),
    );

    setPickedMedia((prev) => [...prev, ...items].slice(0, 10));
  };

  const removePickedMedia = (index: number) => {
    setPickedMedia((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadPickedMedia = async (): Promise<string[]> => {
    if (!user?.id) throw new Error("Not logged in");
    if (pickedMedia.length === 0) return [];

    const uploadedUrls: string[] = [];

    for (const m of pickedMedia) {
      const res = await fetch(m.uri);
      const blob = await res.blob();

      const ext =
        m.uri.split(".").pop() || (m.type === "video" ? "mp4" : "jpg");
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const filePath = `media/${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("post-media")
        .upload(filePath, blob);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("post-media")
        .getPublicUrl(filePath);
      uploadedUrls.push(data.publicUrl);
    }

    return uploadedUrls;
  };

  const handleCreatePost = async () => {
    if (!user?.id) {
      Alert.alert("Login required", "Please log in to post.");
      return;
    }
    if (!community?.id) return;
    if (!isJoined) {
      Alert.alert("Join required", "Join this community to post.");
      return;
    }
    if (!postContent.trim() && pickedMedia.length === 0) {
      Alert.alert("Empty post", "Add text or media before posting.");
      return;
    }

    setPosting(true);
    try {
      const mediaUrls = await uploadPickedMedia();

      const { error } = await supabase.from("posts").insert({
        user_id: user.id,
        community_id: community.id,
        content: postContent.trim() || "",
        media_urls: mediaUrls,
      });

      if (error) throw error;

      setPostContent("");
      setPickedMedia([]);
      await loadCommunity();
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to post.");
    } finally {
      setPosting(false);
    }
  };

  // ---------- Media viewer ----------
  const openViewerAt = (index: number) => {
    setViewerIndex(index);
    setViewerOpen(true);
  };

  // ---------- Reporting ----------
  const openReportForPost = (p: Post) => {
    if (!user?.id) {
      Alert.alert("Login required", "Please log in to report content.");
      return;
    }
    setReportTargetPost(p);
    setReportReason("");
    setReportDetails("");
    setReportOpen(true);
  };

  const submitReport = async () => {
    if (!user?.id || !community?.id || !reportTargetPost) return;
    if (!reportReason.trim()) {
      Alert.alert("Reason required", "Please add a short reason.");
      return;
    }

    setReportSubmitting(true);
    try {
      const { error } = await supabase.from("reports").insert({
        reporter_id: user.id,
        community_id: community.id,
        target_type: "post",
        target_id: reportTargetPost.id,
        reason: reportReason.trim(),
        details: reportDetails.trim() || null,
        status: "open",
      });

      if (error) throw error;

      setReportOpen(false);
      setReportTargetPost(null);
      Alert.alert("Thanks", "Your report has been submitted.");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to submit report.");
    } finally {
      setReportSubmitting(false);
    }
  };

  // ---------- Moderator panel ----------
  const loadReports = async () => {
    if (!community?.id) return;
    setModLoading(true);
    try {
      const { data, error } = await supabase
        .from("reports")
        .select("*, reporter:profiles(username, full_name, avatar_url)")
        .eq("community_id", community.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setReports((data ?? []) as any);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to load reports.");
    } finally {
      setModLoading(false);
    }
  };

  const updateReportStatus = async (
    reportId: string,
    status: ReportRow["status"],
    notes?: string,
  ) => {
    if (!user?.id) return;
    try {
      const { error } = await supabase
        .from("reports")
        .update({
          status,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          resolution_notes: notes?.trim() || null,
        })
        .eq("id", reportId);

      if (error) throw error;

      setReports((prev) =>
        prev.map((r) =>
          r.id === reportId
            ? {
                ...r,
                status,
                reviewed_by: user.id,
                reviewed_at: new Date().toISOString(),
                resolution_notes: notes?.trim() || null,
              }
            : r,
        ),
      );
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to update report.");
    }
  };

  const banUser = async (targetUserId: string, reason?: string) => {
    if (!community?.id || !user?.id) return;
    try {
      const { error } = await supabase.from("community_bans").upsert({
        community_id: community.id,
        user_id: targetUserId,
        banned_by: user.id,
        reason: reason?.trim() || null,
        expires_at: null,
      });

      if (error) throw error;

      await supabase.from("community_mod_actions").insert({
        community_id: community.id,
        action: "ban_user",
        target_user_id: targetUserId,
        notes: reason?.trim() || null,
        created_by: user.id,
      });

      Alert.alert("Done", "User banned from community.");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to ban user.");
    }
  };

  const muteUser = async (targetUserId: string, reason?: string) => {
    if (!community?.id || !user?.id) return;
    try {
      const { error } = await supabase.from("community_mutes").upsert({
        community_id: community.id,
        user_id: targetUserId,
        muted_by: user.id,
        reason: reason?.trim() || null,
        expires_at: null,
      });

      if (error) throw error;

      await supabase.from("community_mod_actions").insert({
        community_id: community.id,
        action: "mute_user",
        target_user_id: targetUserId,
        notes: reason?.trim() || null,
        created_by: user.id,
      });

      Alert.alert("Done", "User muted in community.");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to mute user.");
    }
  };

  const removePostAsMod = async (postId: string, notes?: string) => {
    if (!community?.id || !user?.id) return;

    try {
      // This may fail unless you add an RLS policy for mods to delete posts.
      const { error } = await supabase.from("posts").delete().eq("id", postId);
      if (error) throw error;

      await supabase.from("community_mod_actions").insert({
        community_id: community.id,
        action: "remove_post",
        target_post_id: postId,
        notes: notes?.trim() || null,
        created_by: user.id,
      });

      Alert.alert("Removed", "Post removed.");
      await loadCommunity();
    } catch (e: any) {
      Alert.alert(
        "Remove failed",
        e?.message ||
          "This usually means your RLS policy doesn’t allow moderators to delete posts.",
      );
    }
  };

  // UI helpers
  const renderPost = ({ item }: { item: Post }) => {
    const name = item.profiles?.full_name || item.profiles?.username || "User";
    const handle = item.profiles?.username ? `@${item.profiles.username}` : "";
    const time = formatTimeAgo(item.created_at);

    const media = item.media_urls || [];
    const firstMedia = media[0];

    return (
      <View style={styles.postCard}>
        <View style={styles.postHeader}>
          <View style={styles.authorRow}>
            <View style={styles.avatar}>
              {item.profiles?.avatar_url ? (
                <Image
                  source={{ uri: item.profiles.avatar_url }}
                  style={styles.avatarImg}
                />
              ) : (
                <Text style={styles.avatarText}>
                  {(name || "U").charAt(0).toUpperCase()}
                </Text>
              )}
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.authorName} numberOfLines={1}>
                {name}
              </Text>
              <Text style={styles.authorMeta} numberOfLines={1}>
                {handle} {handle ? "•" : ""} {time}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 10 }}>
            <TouchableOpacity
              onPress={() => openReportForPost(item)}
              activeOpacity={0.85}
              style={styles.iconBtn}
            >
              <Ionicons name="flag-outline" size={18} color="#6B7280" />
            </TouchableOpacity>

            {isModerator && (
              <TouchableOpacity
                onPress={() => {
                  Alert.alert("Mod Actions", "Choose an action", [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Remove Post",
                      style: "destructive",
                      onPress: () =>
                        removePostAsMod(item.id, "Removed by moderator"),
                    },
                  ]);
                }}
                activeOpacity={0.85}
                style={styles.iconBtn}
              >
                <Ionicons name="shield-outline" size={18} color="#6B7280" />
              </TouchableOpacity>
            )}

            <TouchableOpacity activeOpacity={0.85} style={styles.iconBtn}>
              <Ionicons name="ellipsis-horizontal" size={18} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </View>

        {!!item.content?.trim() && (
          <Text style={styles.postText}>{item.content}</Text>
        )}

        {media.length > 0 && (
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.postMediaHero}
            onPress={() => {
              // open viewer at the first matching grid index
              const idx = communityMedia.findIndex(
                (m) => m.postId === item.id && m.url === firstMedia,
              );
              openViewerAt(Math.max(0, idx));
            }}
          >
            <Image
              source={{ uri: firstMedia }}
              style={styles.postMediaHeroImg}
              resizeMode="cover"
            />
            {isVideoUrl(firstMedia) && (
              <View style={styles.videoOverlay}>
                <Ionicons name="play-circle" size={44} color="#fff" />
              </View>
            )}
          </TouchableOpacity>
        )}

        <View style={styles.postFooter}>
          <TouchableOpacity activeOpacity={0.85} style={styles.footerBtn}>
            <Ionicons name="heart-outline" size={18} color="#6B7280" />
            <Text style={styles.footerText}>Like</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.85} style={styles.footerBtn}>
            <Ionicons name="chatbubble-outline" size={18} color="#6B7280" />
            <Text style={styles.footerText}>Comment</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.85} style={styles.footerBtn}>
            <Ionicons name="arrow-redo-outline" size={18} color="#6B7280" />
            <Text style={styles.footerText}>Share</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.85} style={styles.footerBtn}>
            <Ionicons name="bookmark-outline" size={18} color="#6B7280" />
            <Text style={styles.footerText}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderMember = ({ item }: { item: Member }) => {
    const name =
      item.profiles?.full_name || item.profiles?.username || "Member";
    const handle = item.profiles?.username ? `@${item.profiles.username}` : "";
    const isSelf = user?.id && item.user_id === user.id;

    return (
      <View style={styles.memberRow}>
        <View style={styles.memberAvatar}>
          {item.profiles?.avatar_url ? (
            <Image
              source={{ uri: item.profiles.avatar_url }}
              style={styles.memberAvatarImg}
            />
          ) : (
            <Text style={styles.memberAvatarText}>
              {(name || "M").charAt(0).toUpperCase()}
            </Text>
          )}
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.memberName} numberOfLines={1}>
            {name}
          </Text>
          <Text style={styles.memberHandle} numberOfLines={1}>
            {handle}
          </Text>
        </View>

        {isModerator && !isSelf && (
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.memberModBtn}
            onPress={() => {
              Alert.alert("Moderation", `Manage ${handle || name}`, [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Mute",
                  onPress: () => muteUser(item.user_id, "Muted by moderator"),
                },
                {
                  text: "Ban",
                  style: "destructive",
                  onPress: () => banUser(item.user_id, "Banned by moderator"),
                },
              ]);
            }}
          >
            <Ionicons name="shield-outline" size={18} color="#111827" />
            <Text style={styles.memberModBtnText}>Manage</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const openModPanel = async () => {
    if (!isModerator) return;
    setModOpen(true);
    setModTab("reports");
    await loadReports();
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: "center" }]}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  if (!community) {
    return (
      <SafeAreaView
        style={[styles.container, { justifyContent: "center", padding: 18 }]}
      >
        <Text style={{ color: "#111827", fontWeight: "800", fontSize: 16 }}>
          Community not found
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginTop: 12 }}
        >
          <Text style={{ color: "#7C3AED", fontWeight: "800" }}>Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.85}
          style={styles.topIconBtn}
        >
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={styles.topTitle} numberOfLines={1}>
            {community.name}
          </Text>
          <Text style={styles.topSub} numberOfLines={1}>
            {community.is_private ? "Private" : "Public"} • {community.slug}
          </Text>
        </View>

        {isModerator ? (
          <TouchableOpacity
            onPress={openModPanel}
            activeOpacity={0.85}
            style={styles.topIconBtn}
          >
            <Ionicons name="shield-outline" size={22} color="#111827" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity activeOpacity={0.85} style={styles.topIconBtn}>
            <Ionicons name="search-outline" size={22} color="#111827" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Community hero */}
        <View style={styles.hero}>
          <View style={styles.banner}>
            {community.banner_url ? (
              <Image
                source={{ uri: community.banner_url }}
                style={styles.bannerImg}
              />
            ) : (
              <View style={styles.bannerPlaceholder}>
                <Ionicons name="image-outline" size={28} color="#9CA3AF" />
                <Text style={styles.bannerPlaceholderText}>Banner</Text>
              </View>
            )}
          </View>

          <View style={styles.heroBody}>
            <View style={styles.heroRow}>
              <View style={styles.communityAvatar}>
                {community.avatar_url ? (
                  <Image
                    source={{ uri: community.avatar_url }}
                    style={styles.communityAvatarImg}
                  />
                ) : (
                  <Text style={styles.communityAvatarText}>
                    {community.name.charAt(0).toUpperCase()}
                  </Text>
                )}
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.communityName} numberOfLines={1}>
                  {community.name}
                </Text>
                {!!community.description && (
                  <Text style={styles.communityDesc} numberOfLines={3}>
                    {community.description}
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.heroActions}>
              <TouchableOpacity
                activeOpacity={0.9}
                style={[styles.joinBtn, isJoined && styles.joinBtnJoined]}
                onPress={handleJoinToggle}
              >
                <Ionicons
                  name={isJoined ? "checkmark" : "add"}
                  size={18}
                  color={isJoined ? "#7C3AED" : "#fff"}
                />
                <Text
                  style={[styles.joinText, isJoined && styles.joinTextJoined]}
                >
                  {isJoined ? "Joined" : "Join"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity activeOpacity={0.9} style={styles.smallCircle}>
                <Ionicons name="share-outline" size={18} color="#7C3AED" />
              </TouchableOpacity>

              <TouchableOpacity activeOpacity={0.9} style={styles.smallCircle}>
                <Ionicons
                  name="ellipsis-horizontal"
                  size={18}
                  color="#7C3AED"
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {(["feed", "members", "rules", "media"] as const).map((t) => {
            const active = activeTab === t;
            return (
              <TouchableOpacity
                key={t}
                style={[styles.tab, active && styles.tabActive]}
                onPress={() => setActiveTab(t)}
                activeOpacity={0.9}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </Text>
                {active && <View style={styles.tabIndicator} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* FEED */}
        {activeTab === "feed" &&
          (isLocked ? (
            <LockedCommunity onJoin={handleJoinToggle} />
          ) : (
            <>
              {isJoined && (
                <View style={styles.composer}>
                  <View style={styles.composerRow}>
                    <View style={styles.meAvatar}>
                      <Text style={styles.meAvatarText}>
                        {(user?.email || "ME").charAt(0).toUpperCase()}
                      </Text>
                    </View>

                    <TextInput
                      value={postContent}
                      onChangeText={setPostContent}
                      placeholder="Share something with the community..."
                      placeholderTextColor="#9CA3AF"
                      style={styles.composerInput}
                      multiline
                    />
                  </View>

                  {pickedMedia.length > 0 && (
                    <View style={styles.pickedGrid}>
                      {pickedMedia.map((m, idx) => (
                        <View key={`${m.uri}-${idx}`} style={styles.pickedTile}>
                          <Image
                            source={{
                              uri:
                                m.type === "video"
                                  ? m.thumbnail || m.uri
                                  : m.uri,
                            }}
                            style={styles.pickedImg}
                            resizeMode="cover"
                          />
                          {m.type === "video" && (
                            <View style={styles.pickedVideoOverlay}>
                              <Ionicons
                                name="play-circle"
                                size={26}
                                color="#fff"
                              />
                            </View>
                          )}
                          <TouchableOpacity
                            onPress={() => removePickedMedia(idx)}
                            style={styles.pickedRemove}
                            activeOpacity={0.9}
                          >
                            <Ionicons
                              name="close-circle"
                              size={22}
                              color="#ff3b30"
                            />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}

                  <View style={styles.composerActions}>
                    <TouchableOpacity
                      style={styles.pill}
                      onPress={pickCommunityMedia}
                      activeOpacity={0.9}
                    >
                      <Ionicons
                        name="images-outline"
                        size={18}
                        color="#6B7280"
                      />
                      <Text style={styles.pillText}>Media</Text>
                    </TouchableOpacity>

                    <View style={{ flex: 1 }} />

                    <TouchableOpacity
                      style={[
                        styles.postBtn,
                        !postContent.trim() &&
                          pickedMedia.length === 0 &&
                          styles.postBtnDisabled,
                      ]}
                      activeOpacity={0.9}
                      disabled={
                        (!postContent.trim() && pickedMedia.length === 0) ||
                        posting
                      }
                      onPress={handleCreatePost}
                    >
                      <Text style={styles.postBtnText}>
                        {posting ? "Posting..." : "Post"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              <FlatList
                data={posts}
                renderItem={renderPost}
                keyExtractor={(p) => p.id}
                scrollEnabled={false}
                contentContainerStyle={{ padding: 14, gap: 12 }}
                ListEmptyComponent={
                  <View style={{ padding: 18 }}>
                    <Text style={{ color: "#6B7280" }}>No posts yet.</Text>
                  </View>
                }
              />
            </>
          ))}

        {/* MEMBERS */}
        {activeTab === "members" &&
          (isLocked ? (
            <LockedCommunity onJoin={handleJoinToggle} />
          ) : (
            <View style={{ padding: 14 }}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Members</Text>
                <Text style={styles.sectionMeta}>{members.length}</Text>
              </View>

              <FlatList
                data={members}
                renderItem={renderMember}
                keyExtractor={(m) => m.user_id}
                scrollEnabled={false}
                contentContainerStyle={{ gap: 10, paddingBottom: 20 }}
                ListEmptyComponent={
                  <Text style={{ color: "#6B7280" }}>No members yet.</Text>
                }
              />
            </View>
          ))}

        {/* RULES */}
        {activeTab === "rules" &&
          (isLocked ? (
            <LockedCommunity onJoin={handleJoinToggle} />
          ) : (
            <View style={{ padding: 14 }}>
              <Text style={styles.rulesTitle}>Community Rules</Text>
              <Text style={styles.rulesSub}>
                Please follow these guidelines to keep the space safe and
                respectful.
              </Text>

              {rules.length === 0 ? (
                <Text style={{ color: "#6B7280" }}>No rules set yet.</Text>
              ) : (
                <View style={{ gap: 12 }}>
                  {rules.map((r, idx) => (
                    <View key={r.id} style={styles.ruleRow}>
                      <View style={styles.ruleNum}>
                        <Text style={styles.ruleNumText}>{idx + 1}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.ruleTitle}>{r.title}</Text>
                        {!!r.description && (
                          <Text style={styles.ruleDesc}>{r.description}</Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.reportHint}>
                <Ionicons name="warning-outline" size={22} color="#F59E0B" />
                <Text style={styles.reportHintText}>
                  See something that breaks the rules? Tap the flag on a post to
                  report it.
                </Text>
              </View>
            </View>
          ))}

        {/* MEDIA */}
        {activeTab === "media" &&
          (isLocked ? (
            <LockedCommunity onJoin={handleJoinToggle} />
          ) : (
            <View style={{ padding: 14 }}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Media</Text>
                <Text style={styles.sectionMeta}>{communityMedia.length}</Text>
              </View>

              {communityMedia.length === 0 ? (
                <Text style={{ color: "#6B7280" }}>No media posted yet.</Text>
              ) : (
                <FlatList
                  data={communityMedia}
                  keyExtractor={(m, idx) => `${m.postId}-${idx}`}
                  numColumns={3}
                  scrollEnabled={false}
                  columnWrapperStyle={{ gap: 10 }}
                  contentContainerStyle={{ gap: 10, paddingBottom: 20 }}
                  renderItem={({ item, index }) => (
                    <TouchableOpacity
                      activeOpacity={0.9}
                      style={styles.mediaTile}
                      onPress={() => openViewerAt(index)}
                    >
                      <Image
                        source={{ uri: item.url }}
                        style={styles.mediaTileImg}
                        resizeMode="cover"
                      />
                      {item.type === "video" && (
                        <View style={styles.mediaTileOverlay}>
                          <Ionicons name="play-circle" size={30} color="#fff" />
                        </View>
                      )}
                    </TouchableOpacity>
                  )}
                />
              )}
            </View>
          ))}

        <View style={{ height: 18 }} />
      </ScrollView>

      {/* ---------------- Media Viewer Modal ---------------- */}
      <Modal
        visible={viewerOpen}
        animationType="fade"
        transparent={false}
        onRequestClose={() => setViewerOpen(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: "#000" }}>
          <View style={styles.viewerTop}>
            <TouchableOpacity
              onPress={() => setViewerOpen(false)}
              activeOpacity={0.85}
              style={styles.viewerClose}
            >
              <Ionicons name="close" size={22} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.viewerTitle}>
              {communityMedia.length > 0
                ? `${viewerIndex + 1} / ${communityMedia.length}`
                : ""}
            </Text>
            <View style={{ width: 44 }} />
          </View>

          <FlatList
            data={communityMedia}
            keyExtractor={(m, idx) => `${m.postId}-${idx}`}
            horizontal
            pagingEnabled
            initialScrollIndex={Math.min(
              Math.max(0, viewerIndex),
              Math.max(0, communityMedia.length - 1),
            )}
            getItemLayout={(_, index) => ({
              length: 1, // not used reliably without width; avoiding crash by no getItemLayout math
              offset: index,
              index,
            })}
            onMomentumScrollEnd={(e) => {
              const w = e.nativeEvent.layoutMeasurement.width;
              const x = e.nativeEvent.contentOffset.x;
              const idx = w ? Math.round(x / w) : 0;
              setViewerIndex(idx);
            }}
            renderItem={({ item }) => (
              <View style={styles.viewerPage}>
                {item.type === "video" ? (
                  <Video
                    source={{ uri: item.url }}
                    style={styles.viewerMedia}
                    resizeMode={ResizeMode.CONTAIN}
                    useNativeControls
                    shouldPlay
                  />
                ) : (
                  <Image
                    source={{ uri: item.url }}
                    style={styles.viewerMedia}
                    resizeMode="contain"
                  />
                )}
              </View>
            )}
          />
        </SafeAreaView>
      </Modal>

      {/* ---------------- Report Modal ---------------- */}
      <Modal
        visible={reportOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setReportOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setReportOpen(false)}
        />
        <View style={styles.modalSheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Report post</Text>
            <TouchableOpacity
              onPress={() => setReportOpen(false)}
              style={styles.sheetClose}
            >
              <Ionicons name="close" size={20} color="#111827" />
            </TouchableOpacity>
          </View>

          <Text style={styles.sheetLabel}>Reason</Text>
          <TextInput
            value={reportReason}
            onChangeText={setReportReason}
            placeholder="e.g. harassment, spam, nudity, hate speech..."
            placeholderTextColor="#9CA3AF"
            style={styles.sheetInput}
          />

          <Text style={styles.sheetLabel}>Details (optional)</Text>
          <TextInput
            value={reportDetails}
            onChangeText={setReportDetails}
            placeholder="Add any details that help moderators review this."
            placeholderTextColor="#9CA3AF"
            style={[styles.sheetInput, { minHeight: 100 }]}
            multiline
          />

          <Button
            title={reportSubmitting ? "Submitting..." : "Submit report"}
            onPress={submitReport}
            loading={reportSubmitting}
            disabled={reportSubmitting || !reportReason.trim()}
            style={{ backgroundColor: "#EF4444" }}
          />
        </View>
      </Modal>

      {/* ---------------- Moderator Panel ---------------- */}
      <Modal
        visible={modOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setModOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setModOpen(false)}
        />
        <View style={styles.modSheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Moderator Panel</Text>
            <TouchableOpacity
              onPress={() => setModOpen(false)}
              style={styles.sheetClose}
            >
              <Ionicons name="close" size={20} color="#111827" />
            </TouchableOpacity>
          </View>

          <View style={styles.modTabs}>
            {(["reports", "members", "actions"] as const).map((t) => {
              const active = modTab === t;
              return (
                <TouchableOpacity
                  key={t}
                  style={[styles.modTab, active && styles.modTabActive]}
                  onPress={async () => {
                    setModTab(t);
                    if (t === "reports") await loadReports();
                  }}
                  activeOpacity={0.9}
                >
                  <Text
                    style={[
                      styles.modTabText,
                      active && styles.modTabTextActive,
                    ]}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {modTab === "reports" && (
            <View style={{ marginTop: 12, flex: 1 }}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Reports</Text>
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={loadReports}
                  style={styles.refreshBtn}
                >
                  <Ionicons name="refresh" size={18} color="#111827" />
                  <Text style={styles.refreshText}>Refresh</Text>
                </TouchableOpacity>
              </View>

              {modLoading ? (
                <View style={{ padding: 16 }}>
                  <ActivityIndicator />
                </View>
              ) : reports.length === 0 ? (
                <Text style={{ color: "#6B7280", paddingTop: 8 }}>
                  No reports.
                </Text>
              ) : (
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  style={{ marginTop: 10 }}
                >
                  <View style={{ gap: 10, paddingBottom: 20 }}>
                    {reports.map((r) => (
                      <View key={r.id} style={styles.reportCard}>
                        <View
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            gap: 10,
                          }}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={styles.reportTitle} numberOfLines={1}>
                              {r.target_type.toUpperCase()} •{" "}
                              {r.status.toUpperCase()}
                            </Text>
                            <Text style={styles.reportMeta} numberOfLines={1}>
                              {formatTimeAgo(r.created_at)} •{" "}
                              {r.reporter?.username
                                ? `@${r.reporter.username}`
                                : "reporter"}
                            </Text>
                          </View>

                          <View style={styles.reportBadge}>
                            <Text style={styles.reportBadgeText}>
                              #{r.reason.slice(0, 18)}
                            </Text>
                          </View>
                        </View>

                        {!!r.details && (
                          <Text style={styles.reportDetails}>{r.details}</Text>
                        )}

                        <View style={styles.reportActions}>
                          <TouchableOpacity
                            style={[
                              styles.reportActionBtn,
                              { backgroundColor: "#F3F4F6" },
                            ]}
                            activeOpacity={0.9}
                            onPress={() =>
                              updateReportStatus(r.id, "reviewing")
                            }
                          >
                            <Text style={styles.reportActionText}>
                              Reviewing
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[
                              styles.reportActionBtn,
                              { backgroundColor: "#DCFCE7" },
                            ]}
                            activeOpacity={0.9}
                            onPress={() =>
                              updateReportStatus(
                                r.id,
                                "resolved",
                                "Resolved by moderator",
                              )
                            }
                          >
                            <Text
                              style={[
                                styles.reportActionText,
                                { color: "#166534" },
                              ]}
                            >
                              Resolve
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[
                              styles.reportActionBtn,
                              { backgroundColor: "#FEE2E2" },
                            ]}
                            activeOpacity={0.9}
                            onPress={() =>
                              updateReportStatus(
                                r.id,
                                "dismissed",
                                "Dismissed by moderator",
                              )
                            }
                          >
                            <Text
                              style={[
                                styles.reportActionText,
                                { color: "#991B1B" },
                              ]}
                            >
                              Dismiss
                            </Text>
                          </TouchableOpacity>
                        </View>

                        {/* Quick enforcement if target is a post (ban/mute author) */}
                        {r.target_type === "post" && (
                          <View style={{ marginTop: 10 }}>
                            <Text style={{ color: "#6B7280", fontSize: 12 }}>
                              Tip: open the post in the feed to manage the
                              author from Members tab.
                            </Text>
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                </ScrollView>
              )}
            </View>
          )}

          {modTab === "members" && (
            <View style={{ marginTop: 12 }}>
              <Text
                style={{ color: "#111827", fontWeight: "900", marginBottom: 8 }}
              >
                Member moderation
              </Text>
              <Text style={{ color: "#6B7280", marginBottom: 10 }}>
                Tap “Manage” on any member to mute/ban.
              </Text>
            </View>
          )}

          {modTab === "actions" && (
            <View style={{ marginTop: 12 }}>
              <Text
                style={{ color: "#111827", fontWeight: "900", marginBottom: 8 }}
              >
                Quick actions
              </Text>
              <Text style={{ color: "#6B7280" }}>
                Use the shield icon on posts to remove posts (requires mod RLS
                policy if it fails).
              </Text>
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },

  // Header
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(17,24,39,0.08)",
    backgroundColor: "#fff",
  },
  topIconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(17,24,39,0.04)",
    alignItems: "center",
    justifyContent: "center",
  },
  topTitle: { fontSize: 16, fontWeight: "900", color: "#111827" },
  topSub: { marginTop: 2, fontSize: 12, color: "#6B7280" },

  // Hero
  hero: { backgroundColor: "#fff" },
  banner: { height: 130, backgroundColor: "#F3F4F6" },
  bannerImg: { width: "100%", height: "100%" },
  bannerPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  bannerPlaceholderText: { fontSize: 12, color: "#9CA3AF", fontWeight: "700" },

  heroBody: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 14 },
  heroRow: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  communityAvatar: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: "#7C3AED",
    alignItems: "center",
    justifyContent: "center",
    marginTop: -28,
    borderWidth: 4,
    borderColor: "#fff",
    overflow: "hidden",
  },
  communityAvatarImg: { width: "100%", height: "100%" },
  communityAvatarText: { color: "#fff", fontSize: 26, fontWeight: "900" },
  communityName: { fontSize: 18, fontWeight: "900", color: "#111827" },
  communityDesc: {
    marginTop: 6,
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 18,
  },

  heroActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
    alignItems: "center",
  },
  joinBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#7C3AED",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
  },
  joinBtnJoined: {
    backgroundColor: "rgba(124,58,237,0.10)",
    borderWidth: 1,
    borderColor: "rgba(124,58,237,0.35)",
  },
  joinText: { color: "#fff", fontWeight: "900" },
  joinTextJoined: { color: "#7C3AED" },
  smallCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(124,58,237,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Tabs
  tabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(17,24,39,0.08)",
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    position: "relative",
  },
  tabActive: {},
  tabText: { fontSize: 13, fontWeight: "800", color: "#6B7280" },
  tabTextActive: { color: "#7C3AED" },
  tabIndicator: {
    position: "absolute",
    bottom: 0,
    width: "55%",
    height: 3,
    borderRadius: 2,
    backgroundColor: "#7C3AED",
  },

  // Locked
  lockCard: {
    backgroundColor: "#F3F4F6",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.06)",
  },
  lockTitle: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
  },
  lockSub: {
    marginTop: 6,
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
  },
  lockJoinBtn: {
    marginTop: 14,
    backgroundColor: "#7C3AED",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 22,
  },
  lockJoinText: { color: "#fff", fontWeight: "900" },

  // Composer
  composer: {
    marginTop: 12,
    marginHorizontal: 14,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.08)",
    borderRadius: 16,
    padding: 12,
  },
  composerRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  meAvatar: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "rgba(124,58,237,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  meAvatarText: { fontWeight: "900", color: "#7C3AED" },
  composerInput: {
    flex: 1,
    minHeight: 44,
    color: "#111827",
    fontSize: 14,
    paddingTop: 8,
  },

  pickedGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 10,
  },
  pickedTile: {
    width: "30%",
    aspectRatio: 1,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
  },
  pickedImg: { width: "100%", height: "100%" },
  pickedVideoOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  pickedRemove: { position: "absolute", top: 6, right: 6 },

  composerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 12,
  },
  pill: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: "rgba(17,24,39,0.05)",
    alignItems: "center",
  },
  pillText: { color: "#6B7280", fontWeight: "900", fontSize: 12.5 },

  postBtn: {
    backgroundColor: "#7C3AED",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
  },
  postBtnDisabled: { opacity: 0.5 },
  postBtnText: { color: "#fff", fontWeight: "900" },

  // Posts
  postCard: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.08)",
    borderRadius: 18,
    padding: 12,
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  authorRow: { flexDirection: "row", gap: 10, flex: 1 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "#7C3AED",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImg: { width: "100%", height: "100%" },
  avatarText: { color: "#fff", fontWeight: "900" },
  authorName: { fontSize: 14, fontWeight: "900", color: "#111827" },
  authorMeta: { marginTop: 2, fontSize: 12, color: "#6B7280" },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "rgba(17,24,39,0.04)",
    alignItems: "center",
    justifyContent: "center",
  },

  postText: { marginTop: 10, fontSize: 14, color: "#111827", lineHeight: 19 },
  postMediaHero: {
    marginTop: 10,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
  },
  postMediaHeroImg: { width: "100%", height: 220 },
  videoOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },

  postFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(17,24,39,0.06)",
  },
  footerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  footerText: { fontSize: 12, color: "#6B7280", fontWeight: "800" },

  // Members
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 14.5, fontWeight: "900", color: "#111827" },
  sectionMeta: { fontSize: 12, fontWeight: "900", color: "#6B7280" },

  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.08)",
    borderRadius: 16,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: "#7C3AED",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  memberAvatarImg: { width: "100%", height: "100%" },
  memberAvatarText: { color: "#fff", fontWeight: "900" },
  memberName: { fontSize: 14, fontWeight: "900", color: "#111827" },
  memberHandle: { marginTop: 2, fontSize: 12, color: "#6B7280" },

  memberModBtn: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "rgba(17,24,39,0.05)",
  },
  memberModBtnText: { fontSize: 12.5, fontWeight: "900", color: "#111827" },

  // Rules
  rulesTitle: { fontSize: 16, fontWeight: "900", color: "#111827" },
  rulesSub: {
    marginTop: 6,
    marginBottom: 14,
    color: "#6B7280",
    lineHeight: 18,
  },
  ruleRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    padding: 12,
    borderRadius: 16,
    backgroundColor: "rgba(17,24,39,0.03)",
  },
  ruleNum: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: "#7C3AED",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  ruleNumText: { color: "#fff", fontWeight: "900", fontSize: 12 },
  ruleTitle: { fontWeight: "900", color: "#111827" },
  ruleDesc: { marginTop: 4, color: "#6B7280", lineHeight: 18, fontSize: 13 },

  reportHint: {
    marginTop: 18,
    flexDirection: "row",
    gap: 10,
    padding: 12,
    borderRadius: 16,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FEF3C7",
    alignItems: "flex-start",
  },
  reportHintText: { flex: 1, color: "#78350F", lineHeight: 18, fontSize: 13 },

  // Media grid
  mediaTile: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
  },
  mediaTileImg: { width: "100%", height: "100%" },
  mediaTileOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Viewer
  viewerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  viewerClose: {
    width: 44,
    height: 44,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  viewerTitle: { color: "#fff", fontWeight: "900" },
  viewerPage: {
    width: "100%",
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  viewerMedia: { width: "100%", height: "100%" },

  // Modals
  modalBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  modalSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 14,
    gap: 10,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sheetTitle: { fontSize: 15.5, fontWeight: "900", color: "#111827" },
  sheetClose: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: "rgba(17,24,39,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  sheetLabel: {
    fontSize: 12.5,
    fontWeight: "900",
    color: "#111827",
    marginTop: 4,
  },
  sheetInput: {
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.10)",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#111827",
    backgroundColor: "#fff",
  },

  // Moderator panel
  modSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: Platform.OS === "ios" ? "78%" : "82%",
    backgroundColor: "#fff",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 14,
  },
  modTabs: { flexDirection: "row", gap: 10, marginTop: 10 },
  modTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "rgba(17,24,39,0.05)",
    alignItems: "center",
  },
  modTabActive: { backgroundColor: "rgba(124,58,237,0.12)" },
  modTabText: { fontWeight: "900", color: "#6B7280", fontSize: 12.5 },
  modTabTextActive: { color: "#7C3AED" },

  refreshBtn: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: "rgba(17,24,39,0.05)",
  },
  refreshText: { fontWeight: "900", color: "#111827", fontSize: 12.5 },

  reportCard: {
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.08)",
    borderRadius: 16,
    padding: 12,
    backgroundColor: "#fff",
  },
  reportTitle: { fontWeight: "900", color: "#111827" },
  reportMeta: { marginTop: 2, color: "#6B7280", fontSize: 12 },
  reportBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(239,68,68,0.12)",
  },
  reportBadgeText: { color: "#991B1B", fontWeight: "900", fontSize: 11.5 },
  reportDetails: { marginTop: 8, color: "#111827", lineHeight: 18 },

  reportActions: { flexDirection: "row", gap: 10, marginTop: 10 },
  reportActionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: "center",
  },
  reportActionText: { fontWeight: "900", color: "#111827", fontSize: 12.5 },
});
