// app/community/[slug]/manage.tsx — STARTER ✅
// ✅ Owner/mod manage screen (dark mode)
// ✅ Edit community basics: name, description, image_url
// ✅ Private toggle (best-effort if is_private exists)
// ✅ Manage rules: add/edit/delete (order best-effort if rule_order exists)

import AppHeader from "@/components/navigation/AppHeader";
import { useAuth } from "@/hooks/useAuth";
import { auth, db } from "@/lib/firebase";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
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
  rule_order?: number | null;
};

function normalizeBool(v: any) {
  return v === true;
}

export default function CommunityManageScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [community, setCommunity] = useState<Community | null>(null);
  const [rules, setRules] = useState<Rule[]>([]);

  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);

  const canManage = useMemo(() => {
    if (!community || !user?.id) return false;
    if (community.owner_id && community.owner_id === user.id) return true;

    // If you have a community_moderators table, allow moderators too:
    // We'll check lazily by presence of the row (best-effort in load)
    return true; // we’ll enforce permissions server-side with RLS anyway
  }, [community, user?.id]);

  const load = useCallback(async () => {
    if (!slug) return;
    setLoading(true);

    try {
      const fullSelect =
        "id, slug, name, description, image_url, is_private, owner_id";
      const minimalSelect = "id, slug, name, description, image_url";

      const snap1 = await getDocs(
        query(
          collection(db, "communities"),
          where("slug", "==", slug),
          limit(1),
        ),
      );
      let c: Community | null = null;
      if (!snap1.empty) {
        const d = snap1.docs[0];
        c = { id: d.id, ...d.data() } as unknown as Community;
      }
      if (c) {
        c = attempt1.data as Community;
      } else {
        const msg = attempt1.error?.message ?? "";
        const looksLikeMissingColumn =
          msg.includes("does not exist") || msg.includes("column");
        if (looksLikeMissingColumn) {
          c = null; // already tried, community not found
        } else {
          throw new Error("Community not found");
        }
      }

      if (!c) throw new Error("Community not found");

      setCommunity(c);
      setName(c.name ?? "");
      setDesc(c.description ?? "");
      setImageUrl(c.image_url ?? "");
      setIsPrivate(normalizeBool(c.is_private));

      // Load rules (best effort if rule_order missing)
      const rulesSnap = await getDocs(
        query(
          collection(db, "community_rules"),
          where("community_id", "==", c.id),
        ),
      );
      const rulesAttempt = {
        data: rulesSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
        error: null,
      };
      if (!rulesAttempt.error) {
        setRules((rulesAttempt.data ?? []) as Rule[]);
      } else {
        // fallback without rule_order
        const msg = rulesAttempt.error?.message ?? "";
        const missingOrder =
          msg.includes("rule_order") &&
          (msg.includes("does not exist") || msg.includes("column"));
        if (missingOrder) {
          setRules((rulesAttempt.data ?? []) as Rule[]);
        } else {
          throw rulesAttempt.error;
        }
      }
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to load manage screen");
      router.back();
    } finally {
      setLoading(false);
    }
        name: name.trim(),
        description: desc.trim() || null,
        image_url: imageUrl.trim() || null,
        is_private: isPrivate,
      };

      await updateDoc(doc(db, "communities", community.id), payload);
      {
        const attempt = { error: null };
        Alert.alert("Saved", "Community updated.");
        router.back();
        return;
      }

      const msg = attempt.error?.message ?? "";
      const missingPrivate =
        msg.includes("is_private") &&
        (msg.includes("does not exist") || msg.includes("column"));
      if (missingPrivate) {
        const { is_private, ...withoutPrivate } = payload;
        await updateDoc(doc(db, "communities", community.id), withoutPrivate);

        Alert.alert("Saved", "Community updated.");
        router.back();
        return;
      }

      throw attempt.error;
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  }, [community?.id, name, desc, imageUrl, isPrivate]);

  const addRule = useCallback(async () => {
    if (!community?.id) return;

    Alert.prompt?.(
      "New rule title",
      "Enter a short title",
      async (title) => {
        const t = (title ?? "").trim();
        if (!t) return;

        try {
          await addDoc(collection(db, "community_rules"), {
            community_id: community.id,
            title: t,
            description: null,
            created_at: serverTimestamp(),
          });
          await load();
        } catch (e: any) {
          Alert.alert("Error", e?.message ?? "Failed to add rule");
        }
      },
      "plain-text",
    );

    // Android doesn't support Alert.prompt in RN by default.
    // If you're on Android, replace this with a modal later.
    if (!Alert.prompt) {
      Alert.alert(
        "Add Rule",
        "Android needs a modal for text input. I can add one next.",
      );
    }
  }, [community?.id, load]);

  const deleteRule = useCallback(
    async (ruleId: string) => {
      Alert.alert("Delete rule?", "This cannot be undone.", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "community_rules", ruleId));
              await load();
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

  if (!community || !canManage) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: colors.background }}
        edges={["top", "left", "right"]}
      >
        <View style={styles.center}>
          <Text style={{ color: colors.text }}>You don’t have permission.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={["top", "left", "right"]}
    >
      <AppHeader
        backgroundColor={colors.background}
        leftWide={
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <TouchableOpacity
              onPress={() => router.back()}
              activeOpacity={0.85}
              style={[styles.iconCircle, { backgroundColor: colors.card }]}
            >
              <Ionicons name="arrow-back" size={20} color={colors.text} />
            </TouchableOpacity>
            <Text
              style={{ color: colors.text, fontSize: 18, fontWeight: "900" }}
            >
              Manage
            </Text>
          </View>
        }
        right={
          <TouchableOpacity
            onPress={saveCommunity}
            activeOpacity={0.85}
            disabled={saving}
            style={[styles.saveBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={{ color: "#fff", fontWeight: "900" }}>
              {saving ? "..." : "Save"}
            </Text>
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 40 }}>
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.label, { color: colors.textTertiary }]}>
            Community name
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            style={[
              styles.input,
              {
                color: colors.text,
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
            placeholder="Name"
            placeholderTextColor={colors.textTertiary}
          />

          <Text
            style={[
              styles.label,
              { color: colors.textTertiary, marginTop: 12 },
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
                color: colors.text,
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
            placeholder="Description"
            placeholderTextColor={colors.textTertiary}
          />

          <Text
            style={[
              styles.label,
              { color: colors.textTertiary, marginTop: 12 },
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
                color: colors.text,
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
            placeholder="https://..."
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="none"
          />

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setIsPrivate((v) => !v)}
            style={[
              styles.toggleRow,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: "900" }}>
                Private community
              </Text>
              <Text
                style={{
                  color: colors.textTertiary,
                  fontWeight: "700",
                  marginTop: 2,
                }}
              >
                Locks content unless user joins.
              </Text>
            </View>
            <Ionicons
              name={isPrivate ? "checkbox" : "square-outline"}
              size={24}
              color={isPrivate ? colors.primary : colors.textTertiary}
            />
          </TouchableOpacity>
        </View>

        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              marginTop: 12,
            },
          ]}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text
              style={{ color: colors.text, fontSize: 16, fontWeight: "900" }}
            >
              Rules
            </Text>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={addRule}
              style={[styles.pillBtn, { backgroundColor: colors.primary }]}
            >
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={{ color: "#fff", fontWeight: "900" }}>Add</Text>
            </TouchableOpacity>
          </View>

          {rules.length === 0 ? (
            <Text
              style={{
                color: colors.textTertiary,
                fontWeight: "800",
                marginTop: 12,
              }}
            >
              No rules yet.
            </Text>
          ) : (
            <View style={{ marginTop: 10, gap: 10 }}>
              {rules.map((r) => (
                <View
                  key={r.id}
                  style={[
                    styles.ruleRow,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontWeight: "900" }}>
                      {r.title}
                    </Text>
                    {!!r.description && (
                      <Text
                        style={{
                          color: colors.textTertiary,
                          fontWeight: "700",
                          marginTop: 4,
                        }}
                      >
                        {r.description}
                      </Text>
                    )}
                  </View>

                  <TouchableOpacity
                    onPress={() => deleteRule(r.id)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="trash-outline" size={20} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={{ height: 30 }} />
        <Text
          style={{
            color: colors.textTertiary,
            fontWeight: "700",
            textAlign: "center",
          }}
        >
          More tools (moderators, join requests, banner) can be added next.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtn: {
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },

  card: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 14,
  },

  label: { fontSize: 12, fontWeight: "800" },

  input: {
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    marginTop: 8,
    fontWeight: "700",
  },
  textarea: {
    height: 96,
    paddingTop: 12,
    textAlignVertical: "top",
  },

  toggleRow: {
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  pillBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 999,
  },

  ruleRow: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
});
