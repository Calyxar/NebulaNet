// app/community/[slug]/manage.tsx

import AppHeader from "@/components/navigation/AppHeader";
import { useAuth } from "@/hooks/useAuth";
import {
  banUser,
  unbanUser as firestoreUnbanUser,
  getCommunityBans,
} from "@/lib/firestore/communityBans";
import {
  getCommunityMembers,
  getCommunityModerators,
  isModerator,
  kickMember,
  promoteToModerator,
  removeModerator,
} from "@/lib/firestore/communityModerators";
import {
  dismissCommunityReport,
  getCommunityReports,
  resolveCommunityReport,
  type CommunityReport,
} from "@/lib/firestore/communityReports";
import {
  approveJoinRequest,
  declineJoinRequest,
  getCommunityJoinRequests,
  type CommunityJoinRequest,
} from "@/lib/firestore/communityRequests";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import firestore from "@react-native-firebase/firestore";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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
  image_url: string | null;
  is_private?: boolean | null;
  owner_id?: string | null;
};

type BannedUser = {
  id: string;
  user_id: string;
  reason: string | null;
  username: string | null;
  full_name: string | null;
};

type JoinRequestProfile = CommunityJoinRequest & {
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
};

type CommunityReportProfile = CommunityReport & {
  reporter_username: string | null;
  reporter_full_name: string | null;
  reported_username: string | null;
  reported_full_name: string | null;
};

type Rule = {
  id: string;
  title: string;
  description: string | null;
};

function normalizeBool(v: any) {
  return v === true;
}

export default function CommunityManageScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { user } = useAuth();
  const { colors, isDark, uiScale, fontScale } = useTheme();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [community, setCommunity] = useState<Community | null>(null);
  const [rules, setRules] = useState<Rule[]>([]);
  type MemberProfile = {
    user_id: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };

  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [bannedUsers, setBannedUsers] = useState<BannedUser[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequestProfile[]>([]);
  const [reports, setReports] = useState<CommunityReportProfile[]>([]);
  const [moderators, setModerators] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [workingUser, setWorkingUser] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);

  const gradientColors = isDark
    ? [colors.background, colors.background, colors.background]
    : (["#DCEBFF", "#EEF4FF", "#FFFFFF"] as const);

  const [userIsModerator, setUserIsModerator] = useState(false);

  const canManage = useMemo(() => {
    if (!community || !user?.uid) return false;
    return community.owner_id === user.uid || userIsModerator;
  }, [community, user?.uid, userIsModerator]);

  const load = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    try {
      // ✅ FIX: firestore() (native SDK), was db.collection(...) (legacy Web SDK)
      const snap = await firestore()
        .collection("communities")
        .where("slug", "==", slug)
        .limit(1)
        .get();
      if (snap.empty) throw new Error("Community not found");
      const d = snap.docs[0];
      const c = { id: d.id, ...d.data() } as Community;
      setCommunity(c);
      const isOwner = c.owner_id === user?.uid;

      let moderator = false;

      if (!isOwner && user?.uid) {
        moderator = await isModerator(c.id, user.uid);
      }
      setUserIsModerator(isOwner || moderator);
      setName(c.name ?? "");
      setDesc(c.description ?? "");
      setImageUrl(c.image_url ?? "");
      setIsPrivate(normalizeBool(c.is_private));
      const rulesSnap = await firestore()
        .collection("community_rules")
        .where("community_id", "==", c.id)
        .get();
      setRules(
        rulesSnap.docs.map((r) => ({ id: r.id, ...r.data() })) as Rule[],
      );
      const memberDocs = await getCommunityMembers(c.id);
      const moderatorDocs = await getCommunityModerators(c.id);

      setModerators(moderatorDocs.map((m) => m.user_id));

      const memberProfiles = await Promise.all(
        memberDocs.map(async (member) => {
          const profileSnap = await firestore()
            .collection("profiles")
            .doc(member.user_id)
            .get();

          const profile = profileSnap.exists()
            ? (profileSnap.data() as any)
            : {};

          return {
            user_id: member.user_id,
            username: profile.username ?? null,
            full_name: profile.full_name ?? null,
            avatar_url: profile.avatar_url ?? null,
          };
        }),
      );

      setMembers(memberProfiles);

      const requests = await getCommunityJoinRequests(c.id);

      const requestProfiles = await Promise.all(
        requests.map(async (request) => {
          try {
            const profileSnap = await firestore()
              .collection("profiles")
              .doc(request.user_id)
              .get();

            const profile = profileSnap.exists()
              ? (profileSnap.data() as any)
              : {};

            return {
              ...request,
              username: profile.username ?? null,
              full_name: profile.full_name ?? null,
              avatar_url: profile.avatar_url ?? null,
            };
          } catch {
            return {
              ...request,
              username: null,
              full_name: null,
              avatar_url: null,
            };
          }
        }),
      );

      setJoinRequests(requestProfiles);

      const bans = await getCommunityBans(c.id);

      const bannedProfiles = await Promise.all(
        bans.map(async (ban) => {
          const profileSnap = await firestore()
            .collection("profiles")
            .doc(ban.user_id)
            .get();

          const profile = profileSnap.exists()
            ? (profileSnap.data() as any)
            : {};
          return {
            id: ban.id,
            user_id: ban.user_id,
            reason: ban.reason,
            username: profile.username ?? null,
            full_name: profile.full_name ?? null,
          };
        }),
      );

      setBannedUsers(bannedProfiles);
      const communityReports = await getCommunityReports(c.id);

      const reportProfiles = await Promise.all(
        communityReports.map(async (report) => {
          let reporterUsername: string | null = null;
          let reporterFullName: string | null = null;
          let reportedUsername: string | null = null;
          let reportedFullName: string | null = null;

          try {
            const reporterSnap = await firestore()
              .collection("profiles")
              .doc(report.reporter_id)
              .get();

            if (reporterSnap.exists()) {
              const profile = reporterSnap.data() as any;

              reporterUsername = profile.username ?? null;
              reporterFullName = profile.full_name ?? null;
            }
          } catch {}

          // For user reports, reported_id is already a user ID.
          // For post/comment reports, we try to find the
          // associated user through the reported document.
          try {
            let reportedUserId: string | null = null;

            if (report.reported_type === "user") {
              reportedUserId = report.reported_id;
            } else if (report.reported_type === "post") {
              const postSnap = await firestore()
                .collection("posts")
                .doc(report.reported_id)
                .get();

              if (postSnap.exists()) {
                const post = postSnap.data() as any;
                reportedUserId =
                  post.user_id ?? post.author_id ?? post.owner_id ?? null;
              }
            } else if (report.reported_type === "comment") {
              const commentSnap = await firestore()
                .collection("comments")
                .doc(report.reported_id)
                .get();

              if (commentSnap.exists()) {
                const comment = commentSnap.data() as any;
                reportedUserId =
                  comment.user_id ??
                  comment.author_id ??
                  comment.owner_id ??
                  null;
              }
            }

            if (reportedUserId) {
              const reportedSnap = await firestore()
                .collection("profiles")
                .doc(reportedUserId)
                .get();

              if (reportedSnap.exists()) {
                const profile = reportedSnap.data() as any;

                reportedUsername = profile.username ?? null;
                reportedFullName = profile.full_name ?? null;
              }
            }
          } catch {}

          return {
            ...report,
            reporter_username: reporterUsername,
            reporter_full_name: reporterFullName,
            reported_username: reportedUsername,
            reported_full_name: reportedFullName,
          };
        }),
      );

      setReports(reportProfiles);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to load");
      router.back();
    } finally {
      setLoading(false);
    }
  }, [slug, user?.uid]);

  useEffect(() => {
    load();
  }, [load]);

  const saveCommunity = useCallback(async () => {
    if (!community?.id) return;
    setSaving(true);
    try {
      await firestore()
        .collection("communities")
        .doc(community.id)
        .update({
          name: name.trim(),
          description: desc.trim() || null,
          image_url: imageUrl.trim() || null,
          is_private: isPrivate,
          updated_at: firestore.FieldValue.serverTimestamp(),
        });
      Alert.alert("Saved", "Community updated.");
      router.back();
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  }, [community?.id, name, desc, imageUrl, isPrivate]);

  const [newRuleTitle, setNewRuleTitle] = useState("");
  const [newRuleDesc, setNewRuleDesc] = useState("");
  const [addingRule, setAddingRule] = useState(false);

  const addRule = useCallback(async () => {
    if (!community?.id) return;
    const title = newRuleTitle.trim();
    if (!title) {
      Alert.alert("Rule needs a title", "Please enter a short rule title.");
      return;
    }
    setAddingRule(true);
    try {
      await firestore()
        .collection("community_rules")
        .add({
          community_id: community.id,
          title,
          description: newRuleDesc.trim() || null,
          created_at: firestore.FieldValue.serverTimestamp(),
        });
      setNewRuleTitle("");
      setNewRuleDesc("");
      load();
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to add rule");
    } finally {
      setAddingRule(false);
    }
  }, [community?.id, newRuleTitle, newRuleDesc, load]);

  const deleteRule = useCallback(
    async (ruleId: string) => {
      Alert.alert("Delete rule?", "This cannot be undone.", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await firestore()
                .collection("community_rules")
                .doc(ruleId)
                .delete();
              load();
            } catch (e: any) {
              Alert.alert("Error", e?.message ?? "Failed to delete rule");
            }
          },
        },
      ]);
    },
    [load],
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

  const promoteMember = (userId: string) => {
    if (!community) return;

    Alert.alert("Promote Moderator", "Make this member a moderator?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Promote",
        onPress: async () => {
          try {
            setWorkingUser(userId);

            await promoteToModerator(community.id, userId);

            await load();
          } catch (e: any) {
            Alert.alert("Error", e.message ?? "Failed");
          } finally {
            setWorkingUser(null);
          }
        },
      },
    ]);
  };

  const demoteMember = (userId: string) => {
    if (!community) return;

    Alert.alert("Remove Moderator", "Remove moderator permissions?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            setWorkingUser(userId);

            await removeModerator(community.id, userId);

            await load();
          } finally {
            setWorkingUser(null);
          }
        },
      },
    ]);
  };

  const removeMember = (userId: string) => {
    if (!community) return;

    Alert.alert("Kick Member", "Are you sure you want to remove this member?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Kick",
        style: "destructive",
        onPress: async () => {
          try {
            setWorkingUser(userId);

            await kickMember(community.id, userId);

            await load();
          } finally {
            setWorkingUser(null);
          }
        },
      },
    ]);
  };

  const unbanMember = (userId: string) => {
    if (!community) return;

    Alert.alert("Unban User", "Allow this user to join this community again?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Unban",
        onPress: async () => {
          try {
            setWorkingUser(userId);

            await firestoreUnbanUser(community.id, userId);

            await load();
          } catch (e: any) {
            Alert.alert("Error", e?.message ?? "Failed to unban member.");
          } finally {
            setWorkingUser(null);
          }
        },
      },
    ]);
  };

  const approveRequest = (request: JoinRequestProfile) => {
    if (!community) return;

    const displayName = request.full_name || request.username || "this user";

    Alert.alert(
      "Approve Join Request",
      `Allow ${displayName} to join this community?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Approve",
          onPress: async () => {
            try {
              setWorkingUser(request.user_id);

              await approveJoinRequest(community.id, request.user_id);

              await load();
            } catch (e: any) {
              Alert.alert("Error", e?.message ?? "Failed to approve request.");
            } finally {
              setWorkingUser(null);
            }
          },
        },
      ],
    );
  };

  const declineRequest = (request: JoinRequestProfile) => {
    if (!community) return;

    const displayName = request.full_name || request.username || "this user";

    Alert.alert(
      "Decline Join Request",
      `Decline ${displayName}'s request to join?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Decline",
          style: "destructive",
          onPress: async () => {
            try {
              setWorkingUser(request.user_id);

              await declineJoinRequest(community.id, request.user_id);

              await load();
            } catch (e: any) {
              Alert.alert("Error", e?.message ?? "Failed to decline request.");
            } finally {
              setWorkingUser(null);
            }
          },
        },
      ],
    );
  };

  const resolveReport = (report: CommunityReportProfile) => {
    if (!user?.uid) return;

    Alert.alert("Resolve Report", "Mark this report as resolved?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Resolve",
        onPress: async () => {
          try {
            setWorkingUser(report.id);

            await resolveCommunityReport(report.id, user.uid);

            await load();
          } catch (e: any) {
            Alert.alert("Error", e?.message ?? "Failed to resolve report.");
          } finally {
            setWorkingUser(null);
          }
        },
      },
    ]);
  };

  const dismissReport = (report: CommunityReportProfile) => {
    if (!user?.uid) return;

    Alert.alert(
      "Dismiss Report",
      "Dismiss this report without taking action?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Dismiss",
          style: "destructive",
          onPress: async () => {
            try {
              setWorkingUser(report.id);

              await dismissCommunityReport(report.id, user.uid);

              await load();
            } catch (e: any) {
              Alert.alert("Error", e?.message ?? "Failed to dismiss report.");
            } finally {
              setWorkingUser(null);
            }
          },
        },
      ],
    );
  };

  const banMember = (userId: string) => {
    if (!community || !user) return;

    Alert.alert(
      "Ban Member",
      "This user will be removed from the community and prevented from rejoining.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Ban",
          style: "destructive",
          onPress: async () => {
            try {
              setWorkingUser(userId);

              await banUser(
                community.id,
                userId,
                user.uid,
                "Banned by moderator",
              );

              Alert.alert("Success", "User has been banned.");

              await load();
            } catch (e: any) {
              Alert.alert("Error", e?.message ?? "Failed to ban member.");
            } finally {
              setWorkingUser(null);
            }
          },
        },
      ],
    );
  };

  const filteredMembers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();

    if (!q) return members;

    return members.filter((m) => {
      return (
        m.username?.toLowerCase().includes(q) ||
        m.full_name?.toLowerCase().includes(q)
      );
    });
  }, [memberSearch, members]);

  if (!community || !canManage) {
    return (
      <LinearGradient
        colors={gradientColors as any}
        locations={[0, 0.42, 1]}
        style={{ flex: 1 }}
      >
        <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
          <View style={styles.center}>
            <Text style={{ color: colors.text }}>
              You don't have permission.
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
        <AppHeader
          backgroundColor="transparent"
          leftWide={
            <TouchableOpacity
              onPress={() => router.back()}
              style={[
                styles.backBtn,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  width: 40 * uiScale,
                  height: 40 * uiScale,
                  borderRadius: 20 * uiScale,
                },
              ]}
            >
              <Ionicons name="arrow-back" size={20} color={colors.text} />
            </TouchableOpacity>
          }
          right={
            <TouchableOpacity
              onPress={saveCommunity}
              disabled={saving}
              style={[
                styles.saveBtn,
                {
                  backgroundColor: colors.primary,
                  paddingHorizontal: 18 * uiScale,
                  height: 40 * uiScale,
                  borderRadius: 20 * uiScale,
                },
              ]}
            >
              <Text
                style={{
                  color: "#fff",
                  fontWeight: "900",
                  fontSize: 14 * fontScale,
                }}
              >
                {saving ? "Saving..." : "Save"}
              </Text>
            </TouchableOpacity>
          }
        />

        <ScrollView
          contentContainerStyle={{
            padding: 16 * uiScale,
            gap: 12 * uiScale,
          }}
        >
          <Text
            style={[
              styles.sectionLabel,
              { color: colors.textTertiary, fontSize: 12 * fontScale },
            ]}
          >
            COMMUNITY DETAILS
          </Text>

          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: 16 * uiScale,
                padding: 14 * uiScale,
              },
            ]}
          >
            <Text
              style={[
                styles.fieldLabel,
                { color: colors.text, fontSize: 13 * fontScale },
              ]}
            >
              Name
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              style={[
                styles.input,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  color: colors.text,
                  borderRadius: 12 * uiScale,
                  paddingHorizontal: 12 * uiScale,
                  paddingVertical: 11 * uiScale,
                  fontSize: 14 * fontScale,
                },
              ]}
              placeholder="Community name"
              placeholderTextColor={colors.textTertiary}
              maxLength={60}
            />

            <Text
              style={[
                styles.fieldLabel,
                {
                  color: colors.text,
                  marginTop: 12 * uiScale,
                  fontSize: 13 * fontScale,
                },
              ]}
            >
              Description
            </Text>
            <TextInput
              value={desc}
              onChangeText={setDesc}
              multiline
              style={[
                styles.input,
                styles.textarea,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  color: colors.text,
                  borderRadius: 12 * uiScale,
                  paddingHorizontal: 12 * uiScale,
                  paddingVertical: 11 * uiScale,
                  fontSize: 14 * fontScale,
                },
              ]}
              placeholder="What is this community about?"
              placeholderTextColor={colors.textTertiary}
              textAlignVertical="top"
              maxLength={240}
            />

            <Text
              style={[
                styles.fieldLabel,
                {
                  color: colors.text,
                  marginTop: 12 * uiScale,
                  fontSize: 13 * fontScale,
                },
              ]}
            >
              Image URL
            </Text>
            <TextInput
              value={imageUrl}
              onChangeText={setImageUrl}
              style={[
                styles.input,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  color: colors.text,
                  borderRadius: 12 * uiScale,
                  paddingHorizontal: 12 * uiScale,
                  paddingVertical: 11 * uiScale,
                  fontSize: 14 * fontScale,
                },
              ]}
              placeholder="https://..."
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="none"
            />

            <TouchableOpacity
              style={[
                styles.privacyRow,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderRadius: 12 * uiScale,
                  padding: 12 * uiScale,
                  marginTop: 12 * uiScale,
                },
              ]}
              onPress={() => setIsPrivate((v) => !v)}
              activeOpacity={0.85}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.fieldLabel,
                    { color: colors.text, fontSize: 13 * fontScale },
                  ]}
                >
                  {isPrivate ? "Private" : "Public"}
                </Text>
                <Text
                  style={{
                    color: colors.textTertiary,
                    fontSize: 12 * fontScale,
                    marginTop: 2,
                  }}
                >
                  {isPrivate
                    ? "Content locked until user joins"
                    : "Anyone can see and join"}
                </Text>
              </View>
              <Ionicons
                name={isPrivate ? "lock-closed" : "earth-outline"}
                size={20}
                color={colors.primary}
              />
            </TouchableOpacity>
          </View>

          <Text
            style={[
              styles.sectionLabel,
              {
                color: colors.textTertiary,
                marginTop: 8 * uiScale,
                fontSize: 12 * fontScale,
              },
            ]}
          >
            RULES
          </Text>

          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: 16 * uiScale,
                padding: 14 * uiScale,
              },
            ]}
          >
            {rules.length === 0 ? (
              <Text
                style={{
                  color: colors.textTertiary,
                  textAlign: "center",
                  paddingVertical: 12 * uiScale,
                }}
              >
                No rules yet.
              </Text>
            ) : (
              rules.map((r, idx) => (
                <View
                  key={r.id}
                  style={[
                    styles.ruleRow,
                    {
                      paddingVertical: 12 * uiScale,
                      gap: 12 * uiScale,
                    },
                    idx !== 0 && {
                      borderTopWidth: 1,
                      borderTopColor: colors.border,
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontWeight: "700",
                        color: colors.text,
                        fontSize: 14 * fontScale,
                      }}
                    >
                      {r.title}
                    </Text>
                    {!!r.description && (
                      <Text
                        style={{
                          color: colors.textTertiary,
                          fontSize: 12 * fontScale,
                          marginTop: 2,
                        }}
                      >
                        {r.description}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity onPress={() => deleteRule(r.id)}>
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))
            )}

            {/* Add Rule form */}
            <View
              style={{
                borderTopWidth: rules.length > 0 ? 1 : 0,
                borderTopColor: colors.border,
                marginTop: rules.length > 0 ? 12 * uiScale : 0,
                paddingTop: rules.length > 0 ? 12 * uiScale : 0,
                gap: 8 * uiScale,
              }}
            >
              <TextInput
                value={newRuleTitle}
                onChangeText={setNewRuleTitle}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.text,
                    borderRadius: 12 * uiScale,
                    paddingHorizontal: 12 * uiScale,
                    paddingVertical: 11 * uiScale,
                    fontSize: 14 * fontScale,
                  },
                ]}
                placeholder='Rule title (e.g. "Be respectful")'
                placeholderTextColor={colors.textTertiary}
                maxLength={80}
              />
              <TextInput
                value={newRuleDesc}
                onChangeText={setNewRuleDesc}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.text,
                    borderRadius: 12 * uiScale,
                    paddingHorizontal: 12 * uiScale,
                    paddingVertical: 11 * uiScale,
                    fontSize: 14 * fontScale,
                  },
                ]}
                placeholder="Optional description"
                placeholderTextColor={colors.textTertiary}
                maxLength={200}
                multiline
              />
              <TouchableOpacity
                onPress={addRule}
                disabled={addingRule || !newRuleTitle.trim()}
                style={[
                  styles.addRuleBtn,
                  {
                    backgroundColor: colors.primary,
                    opacity: addingRule || !newRuleTitle.trim() ? 0.5 : 1,
                    paddingVertical: 12 * uiScale,
                    borderRadius: 12 * uiScale,
                    gap: 6 * uiScale,
                  },
                ]}
                activeOpacity={0.85}
              >
                <Ionicons name="add" size={18} color="#fff" />
                <Text
                  style={{
                    color: "#fff",
                    fontWeight: "800",
                    fontSize: 14 * fontScale,
                  }}
                >
                  {addingRule ? "Adding..." : "Add Rule"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {normalizeBool(community.is_private) &&
            community.owner_id === user?.uid && (
              <>
                <Text
                  style={[
                    styles.sectionLabel,
                    {
                      color: colors.textTertiary,
                      marginTop: 8 * uiScale,
                      fontSize: 12 * fontScale,
                    },
                  ]}
                >
                  JOIN REQUESTS
                  {joinRequests.length > 0 ? ` · ${joinRequests.length}` : ""}
                </Text>

                <View
                  style={[
                    styles.card,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      borderRadius: 16 * uiScale,
                      padding: 14 * uiScale,
                    },
                  ]}
                >
                  {joinRequests.length === 0 ? (
                    <Text
                      style={{
                        color: colors.textTertiary,
                        textAlign: "center",
                        paddingVertical: 12 * uiScale,
                      }}
                    >
                      No pending join requests.
                    </Text>
                  ) : (
                    joinRequests.map((request, index) => {
                      const displayName =
                        request.full_name || request.username || "Unknown User";

                      const username = request.username
                        ? `@${request.username}`
                        : null;

                      const isWorking = workingUser === request.user_id;

                      return (
                        <View
                          key={request.id}
                          style={[
                            styles.ruleRow,
                            {
                              alignItems: "center",
                              paddingVertical: 12 * uiScale,
                              gap: 12 * uiScale,
                            },
                            index !== 0 && {
                              borderTopWidth: 1,
                              borderTopColor: colors.border,
                            },
                          ]}
                        >
                          {request.avatar_url ? (
                            <Image
                              source={{
                                uri: request.avatar_url,
                              }}
                              style={{
                                width: 44 * uiScale,
                                height: 44 * uiScale,
                                borderRadius: 22 * uiScale,
                              }}
                            />
                          ) : (
                            <View
                              style={{
                                width: 44 * uiScale,
                                height: 44 * uiScale,
                                borderRadius: 22 * uiScale,
                                backgroundColor: colors.surface,
                                borderWidth: 1,
                                borderColor: colors.border,
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <Text
                                style={{
                                  color: colors.primary,
                                  fontWeight: "900",
                                }}
                              >
                                {displayName.charAt(0).toUpperCase()}
                              </Text>
                            </View>
                          )}

                          <View
                            style={{
                              flex: 1,
                              minWidth: 0,
                            }}
                          >
                            <Text
                              style={{
                                color: colors.text,
                                fontWeight: "800",
                                fontSize: 14 * fontScale,
                              }}
                              numberOfLines={1}
                            >
                              {displayName}
                            </Text>

                            {username && (
                              <Text
                                style={{
                                  color: colors.textTertiary,
                                  fontSize: 12 * fontScale,
                                  marginTop: 2,
                                }}
                                numberOfLines={1}
                              >
                                {username}
                              </Text>
                            )}

                            <Text
                              style={{
                                color: colors.textTertiary,
                                fontSize: 11 * fontScale,
                                marginTop: 3,
                              }}
                            >
                              Wants to join your community
                            </Text>
                          </View>

                          <View
                            style={{
                              gap: 8,
                              alignItems: "flex-end",
                            }}
                          >
                            <TouchableOpacity
                              onPress={() => approveRequest(request)}
                              disabled={isWorking}
                              style={{
                                backgroundColor: "#22C55E",
                                paddingHorizontal: 12 * uiScale,
                                paddingVertical: 7 * uiScale,
                                borderRadius: 999,
                                minWidth: 78 * uiScale,
                                alignItems: "center",
                              }}
                            >
                              <Text
                                style={{
                                  color: "#fff",
                                  fontWeight: "900",
                                  fontSize: 12 * fontScale,
                                }}
                              >
                                {isWorking ? "..." : "Approve"}
                              </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              onPress={() => declineRequest(request)}
                              disabled={isWorking}
                              style={{
                                paddingHorizontal: 12 * uiScale,
                                paddingVertical: 5 * uiScale,
                                minWidth: 78 * uiScale,
                                alignItems: "center",
                              }}
                            >
                              <Text
                                style={{
                                  color: "#EF4444",
                                  fontWeight: "800",
                                  fontSize: 12 * fontScale,
                                }}
                              >
                                Decline
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>
              </>
            )}

          <Text
            style={[
              styles.sectionLabel,
              {
                color: colors.textTertiary,
                marginTop: 8 * uiScale,
                fontSize: 12 * fontScale,
              },
            ]}
          >
            MEMBERS
          </Text>

          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: 16 * uiScale,
                padding: 14 * uiScale,
              },
            ]}
          >
            <TextInput
              value={memberSearch}
              onChangeText={setMemberSearch}
              placeholder="Search members..."
              placeholderTextColor={colors.textTertiary}
              style={[
                styles.input,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  color: colors.text,
                  borderRadius: 12 * uiScale,
                  paddingHorizontal: 12 * uiScale,
                  paddingVertical: 11 * uiScale,
                  fontSize: 14 * fontScale,
                  marginBottom: 12 * uiScale,
                },
              ]}
            />

            {filteredMembers.map((member, index) => {
              const moderator = moderators.includes(member.user_id);
              const owner = community?.owner_id === member.user_id;
              const isSelf = member.user_id === user?.uid;

              return (
                <View
                  key={member.user_id}
                  style={[
                    styles.ruleRow,
                    {
                      alignItems: "center",
                      paddingVertical: 12 * uiScale,
                    },
                    index !== 0 && {
                      borderTopWidth: 1,
                      borderTopColor: colors.border,
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: colors.text,
                        fontWeight: "700",
                        fontSize: 15 * fontScale,
                      }}
                    >
                      {member.full_name || member.username || "Unknown User"}
                    </Text>

                    {!!member.username && (
                      <Text
                        style={{
                          color: colors.textTertiary,
                          fontSize: 12 * fontScale,
                        }}
                      >
                        @{member.username}
                      </Text>
                    )}

                    {owner && (
                      <Text
                        style={{
                          color: "#F59E0B",
                          fontWeight: "700",
                          marginTop: 4,
                        }}
                      >
                        Owner
                      </Text>
                    )}

                    {!owner && moderator && (
                      <Text
                        style={{
                          color: colors.primary,
                          fontWeight: "700",
                          marginTop: 4,
                        }}
                      >
                        Moderator
                      </Text>
                    )}
                  </View>

                  {!owner && (
                    <View style={{ gap: 8 }}>
                      {community?.owner_id === user?.uid &&
                        (moderator ? (
                          <TouchableOpacity
                            onPress={() => demoteMember(member.user_id)}
                          >
                            <Text
                              style={{ color: "#F59E0B", fontWeight: "700" }}
                            >
                              Remove Mod
                            </Text>
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity
                            onPress={() => promoteMember(member.user_id)}
                          >
                            <Text
                              style={{
                                color: colors.primary,
                                fontWeight: "700",
                              }}
                            >
                              Promote
                            </Text>
                          </TouchableOpacity>
                        ))}

                      {!isSelf && (
                        <TouchableOpacity
                          onPress={() => banMember(member.user_id)}
                        >
                          <Text
                            style={{
                              color: "#DC2626",
                              fontWeight: "700",
                            }}
                          >
                            Ban
                          </Text>
                        </TouchableOpacity>
                      )}

                      {!isSelf && (
                        <TouchableOpacity
                          onPress={() => removeMember(member.user_id)}
                        >
                          <Text style={{ color: "#EF4444", fontWeight: "700" }}>
                            {workingUser === member.user_id ? "..." : "Kick"}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
            <Text
              style={[
                styles.sectionLabel,
                {
                  color: colors.textTertiary,
                  marginTop: 8 * uiScale,
                  fontSize: 12 * fontScale,
                },
              ]}
            >
              REPORTS
              {reports.length > 0 ? ` · ${reports.length}` : ""}
            </Text>

            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderRadius: 16 * uiScale,
                  padding: 14 * uiScale,
                },
              ]}
            >
              {reports.length === 0 ? (
                <Text
                  style={{
                    color: colors.textTertiary,
                    textAlign: "center",
                    paddingVertical: 12 * uiScale,
                  }}
                >
                  No pending reports.
                </Text>
              ) : (
                reports.map((report, index) => {
                  const isWorking = workingUser === report.id;

                  const typeLabel =
                    report.reported_type === "post"
                      ? "Post"
                      : report.reported_type === "comment"
                        ? "Comment"
                        : "User";

                  return (
                    <View
                      key={report.id}
                      style={[
                        styles.ruleRow,
                        {
                          alignItems: "center",
                          paddingVertical: 12 * uiScale,
                          gap: 12 * uiScale,
                        },
                        index !== 0 && {
                          borderTopWidth: 1,
                          borderTopColor: colors.border,
                        },
                      ]}
                    >
                      <View
                        style={{
                          width: 40 * uiScale,
                          height: 40 * uiScale,
                          borderRadius: 20 * uiScale,
                          backgroundColor: colors.surface,
                          alignItems: "center",
                          justifyContent: "center",
                          borderWidth: 1,
                          borderColor: colors.border,
                        }}
                      >
                        <Ionicons
                          name="flag"
                          size={18 * uiScale}
                          color="#EF4444"
                        />
                      </View>

                      <View
                        style={{
                          flex: 1,
                          minWidth: 0,
                        }}
                      >
                        <Text
                          style={{
                            color: colors.text,
                            fontWeight: "800",
                            fontSize: 14 * fontScale,
                          }}
                        >
                          {typeLabel} Report
                        </Text>

                        <Text
                          style={{
                            color: "#EF4444",
                            fontWeight: "700",
                            fontSize: 12 * fontScale,
                            marginTop: 3,
                          }}
                          numberOfLines={2}
                        >
                          {report.reason}
                        </Text>

                        <Text
                          style={{
                            color: colors.textTertiary,
                            fontSize: 11 * fontScale,
                            marginTop: 3,
                          }}
                          numberOfLines={1}
                        >
                          Reported ID: {report.reported_id}
                        </Text>
                      </View>

                      <View
                        style={{
                          gap: 8,
                          alignItems: "flex-end",
                        }}
                      >
                        <TouchableOpacity
                          onPress={() => resolveReport(report)}
                          disabled={isWorking}
                          style={{
                            backgroundColor: "#22C55E",
                            paddingHorizontal: 12 * uiScale,
                            paddingVertical: 7 * uiScale,
                            borderRadius: 999,
                            minWidth: 78 * uiScale,
                            alignItems: "center",
                          }}
                        >
                          <Text
                            style={{
                              color: "#fff",
                              fontWeight: "900",
                              fontSize: 12 * fontScale,
                            }}
                          >
                            {isWorking ? "..." : "Resolve"}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => dismissReport(report)}
                          disabled={isWorking}
                          style={{
                            paddingHorizontal: 12 * uiScale,
                            paddingVertical: 5 * uiScale,
                            minWidth: 78 * uiScale,
                            alignItems: "center",
                          }}
                        >
                          <Text
                            style={{
                              color: "#EF4444",
                              fontWeight: "800",
                              fontSize: 12 * fontScale,
                            }}
                          >
                            Dismiss
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </View>
          <Text
            style={[
              styles.sectionLabel,
              {
                color: colors.textTertiary,
                marginTop: 8 * uiScale,
                fontSize: 12 * fontScale,
              },
            ]}
          >
            BANNED USERS
          </Text>

          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: 16 * uiScale,
                padding: 14 * uiScale,
              },
            ]}
          >
            {bannedUsers.length === 0 ? (
              <Text
                style={{
                  color: colors.textTertiary,
                  textAlign: "center",
                  paddingVertical: 12 * uiScale,
                }}
              >
                No banned users.
              </Text>
            ) : (
              bannedUsers.map((ban, index) => (
                <View
                  key={ban.id}
                  style={[
                    styles.ruleRow,
                    {
                      alignItems: "center",
                      paddingVertical: 12 * uiScale,
                    },
                    index !== 0 && {
                      borderTopWidth: 1,
                      borderTopColor: colors.border,
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: colors.text,
                        fontWeight: "700",
                        fontSize: 15 * fontScale,
                      }}
                    >
                      {ban.full_name || ban.username || "Unknown User"}
                    </Text>

                    {!!ban.username && (
                      <Text
                        style={{
                          color: colors.textTertiary,
                          fontSize: 12 * fontScale,
                        }}
                      >
                        @{ban.username}
                      </Text>
                    )}

                    {!!ban.reason && (
                      <Text
                        style={{
                          color: "#EF4444",
                          marginTop: 4,
                          fontSize: 12 * fontScale,
                        }}
                      >
                        Reason: {ban.reason}
                      </Text>
                    )}
                  </View>

                  <TouchableOpacity onPress={() => unbanMember(ban.user_id)}>
                    <Text
                      style={{
                        color: "#22C55E",
                        fontWeight: "700",
                      }}
                    >
                      Unban
                    </Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
          <Text
            style={[
              styles.sectionLabel,
              {
                color: colors.textTertiary,
                marginTop: 8 * uiScale,
                fontSize: 12 * fontScale,
              },
            ]}
          >
            REPORTS
            {reports.length > 0 ? ` · ${reports.length}` : ""}
          </Text>

          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: 16 * uiScale,
                padding: 14 * uiScale,
              },
            ]}
          >
            {reports.length === 0 ? (
              <Text
                style={{
                  color: colors.textTertiary,
                  textAlign: "center",
                  paddingVertical: 12 * uiScale,
                }}
              >
                No pending reports.
              </Text>
            ) : (
              reports.map((report, index) => {
                const reporter =
                  report.reporter_full_name ||
                  report.reporter_username ||
                  "Unknown User";

                const reported =
                  report.reported_full_name ||
                  report.reported_username ||
                  "Unknown User";

                const isWorking = workingUser === report.id;

                return (
                  <View
                    key={report.id}
                    style={[
                      styles.ruleRow,
                      {
                        alignItems: "flex-start",
                        paddingVertical: 14 * uiScale,
                        gap: 12 * uiScale,
                      },
                      index !== 0 && {
                        borderTopWidth: 1,
                        borderTopColor: colors.border,
                      },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <Ionicons
                          name={
                            report.reported_type === "post"
                              ? "document-text-outline"
                              : report.reported_type === "comment"
                                ? "chatbubble-outline"
                                : "person-outline"
                          }
                          size={18}
                          color={colors.primary}
                        />

                        <Text
                          style={{
                            color: colors.text,
                            fontWeight: "900",
                            fontSize: 14 * fontScale,
                            textTransform: "capitalize",
                          }}
                        >
                          {report.reported_type} Report
                        </Text>
                      </View>

                      <Text
                        style={{
                          color: colors.text,
                          fontWeight: "700",
                          fontSize: 13 * fontScale,
                          marginTop: 10,
                        }}
                      >
                        Reported: {reported}
                      </Text>

                      <Text
                        style={{
                          color: colors.textTertiary,
                          fontSize: 12 * fontScale,
                          marginTop: 4,
                        }}
                      >
                        Reported by: {reporter}
                      </Text>

                      <View
                        style={{
                          backgroundColor: colors.surface,
                          borderRadius: 10 * uiScale,
                          borderWidth: 1,
                          borderColor: colors.border,
                          padding: 10 * uiScale,
                          marginTop: 10 * uiScale,
                        }}
                      >
                        <Text
                          style={{
                            color: colors.textTertiary,
                            fontSize: 11 * fontScale,
                            fontWeight: "700",
                            marginBottom: 3,
                          }}
                        >
                          REASON
                        </Text>

                        <Text
                          style={{
                            color: colors.text,
                            fontSize: 13 * fontScale,
                          }}
                        >
                          {report.reason}
                        </Text>
                      </View>

                      <Text
                        style={{
                          color: colors.textTertiary,
                          fontSize: 10 * fontScale,
                          marginTop: 8,
                        }}
                      >
                        Status: {report.status}
                      </Text>
                    </View>

                    <View
                      style={{
                        gap: 8,
                        alignItems: "flex-end",
                      }}
                    >
                      <TouchableOpacity
                        onPress={() => resolveReport(report)}
                        disabled={isWorking}
                        style={{
                          backgroundColor: "#22C55E",
                          paddingHorizontal: 12 * uiScale,
                          paddingVertical: 7 * uiScale,
                          borderRadius: 999,
                          minWidth: 80 * uiScale,
                          alignItems: "center",
                        }}
                      >
                        <Text
                          style={{
                            color: "#fff",
                            fontWeight: "900",
                            fontSize: 12 * fontScale,
                          }}
                        >
                          {isWorking ? "..." : "Resolve"}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => dismissReport(report)}
                        disabled={isWorking}
                        style={{
                          paddingHorizontal: 12 * uiScale,
                          paddingVertical: 5 * uiScale,
                          minWidth: 80 * uiScale,
                          alignItems: "center",
                        }}
                      >
                        <Text
                          style={{
                            color: "#EF4444",
                            fontWeight: "800",
                            fontSize: 12 * fontScale,
                          }}
                        >
                          Dismiss
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  backBtn: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  saveBtn: {
    justifyContent: "center",
    alignItems: "center",
  },
  sectionLabel: {
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  card: { borderWidth: 1 },
  fieldLabel: { fontWeight: "800", marginBottom: 6 },
  input: {
    borderWidth: 1,
  },
  textarea: { minHeight: 100, paddingTop: 12 },
  privacyRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
  },
  ruleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  addRuleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
});
