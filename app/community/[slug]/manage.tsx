// app/community/[slug]/manage.tsx

import AppHeader from "@/components/navigation/AppHeader";
import { useAuth } from "@/hooks/useAuth";
import {
  getCommunityMembers,
  getCommunityModerators,
  isModerator,
  kickMember,
  promoteToModerator,
  removeModerator,
} from "@/lib/firestore/communityModerators";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import firestore from "@react-native-firebase/firestore";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to load");
      router.back();
    } finally {
      setLoading(false);
    }
  }, [slug]);

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

  Alert.alert(
    "Promote Moderator",
    "Make this member a moderator?",
    [
      { text: "Cancel", style: "cancel" },
      {
        text: "Promote",
        onPress: async () => {
          try {
            setWorkingUser(userId);

            await promoteToModerator(community.id, userId);

            await load();
          } finally {
            setWorkingUser(null);
          }
        },
      },
    ],
  );
};

 const demoteMember = (userId: string) => {
  if (!community) return;

  Alert.alert(
    "Remove Moderator",
    "Remove moderator permissions?",
    [
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
    ],
  );
};

  const removeMember = (userId: string) => {
  if (!community) return;

  Alert.alert(
    "Kick Member",
    "Are you sure you want to remove this member?",
    [
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
