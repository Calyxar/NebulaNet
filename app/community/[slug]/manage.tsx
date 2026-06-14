import AppHeader from "@/components/navigation/AppHeader";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import firestore from "@react-native-firebase/firestore";
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
  const { colors } = useTheme();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [community, setCommunity] = useState<Community | null>(null);
  const [rules, setRules] = useState<Rule[]>([]);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);

  // ✅ FIX: user?.uid not user?.id
  const canManage = useMemo(() => {
    if (!community || !user?.uid) return false;
    return community.owner_id === user.uid;
  }, [community, user?.uid]);

  const load = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    try {
      const snap = await db
        .collection("communities")
        .where("slug", "==", slug)
        .limit(1)
        .get();
      if (snap.empty) throw new Error("Community not found");
      const d = snap.docs[0];
      const c = { id: d.id, ...d.data() } as Community;
      setCommunity(c);
      setName(c.name ?? "");
      setDesc(c.description ?? "");
      setImageUrl(c.image_url ?? "");
      setIsPrivate(normalizeBool(c.is_private));
      const rulesSnap = await db
        .collection("community_rules")
        .where("community_id", "==", c.id)
        .get();
      setRules(
        rulesSnap.docs.map((r) => ({ id: r.id, ...r.data() })) as Rule[],
      );
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
      await db
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

  const deleteRule = useCallback(
    async (ruleId: string) => {
      Alert.alert("Delete rule?", "This cannot be undone.", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await db.collection("community_rules").doc(ruleId).delete();
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
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!community || !canManage) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={styles.center}>
          <Text style={{ color: colors.text }}>You don't have permission.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <AppHeader
        backgroundColor={colors.background}
        leftWide={
          <TouchableOpacity
            onPress={() => router.back()}
            style={[
              styles.backBtn,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>
        }
        right={
          <TouchableOpacity
            onPress={saveCommunity}
            disabled={saving}
            style={[styles.saveBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={{ color: "#fff", fontWeight: "900" }}>
              {saving ? "Saving..." : "Save"}
            </Text>
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>
          COMMUNITY DETAILS
        </Text>

        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.fieldLabel, { color: colors.text }]}>Name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            style={[
              styles.input,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
            placeholder="Community name"
            placeholderTextColor={colors.textTertiary}
            maxLength={60}
          />

          <Text
            style={[styles.fieldLabel, { color: colors.text, marginTop: 12 }]}
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
              },
            ]}
            placeholder="What is this community about?"
            placeholderTextColor={colors.textTertiary}
            textAlignVertical="top"
            maxLength={240}
          />

          <Text
            style={[styles.fieldLabel, { color: colors.text, marginTop: 12 }]}
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
              },
            ]}
            placeholder="https://..."
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="none"
          />

          <TouchableOpacity
            style={[
              styles.privacyRow,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            onPress={() => setIsPrivate((v) => !v)}
            activeOpacity={0.85}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>
                {isPrivate ? "Private" : "Public"}
              </Text>
              <Text
                style={{
                  color: colors.textTertiary,
                  fontSize: 12,
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
            { color: colors.textTertiary, marginTop: 8 },
          ]}
        >
          RULES
        </Text>

        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          {rules.length === 0 ? (
            <Text
              style={{
                color: colors.textTertiary,
                textAlign: "center",
                paddingVertical: 12,
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
                  idx !== 0 && {
                    borderTopWidth: 1,
                    borderTopColor: colors.border,
                  },
                ]}
              >
                <Text
                  style={[{ flex: 1, fontWeight: "700", color: colors.text }]}
                >
                  {r.title}
                </Text>
                <TouchableOpacity onPress={() => deleteRule(r.id)}>
                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  saveBtn: {
    paddingHorizontal: 18,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  card: { borderWidth: 1, borderRadius: 16, padding: 14 },
  fieldLabel: { fontSize: 13, fontWeight: "800", marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
  },
  textarea: { minHeight: 100, paddingTop: 12 },
  privacyRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  ruleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
  },
});
