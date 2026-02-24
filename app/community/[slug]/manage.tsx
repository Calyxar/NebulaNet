import AppHeader from "@/components/navigation/AppHeader";
import { useAuth } from "@/hooks/useAuth";
import { useDeleteCommunity } from "@/hooks/useDeleteCommunity";
import { db } from "@/lib/firebase";
import { useTheme } from "@/providers/ThemeProvider";
import { router, useLocalSearchParams } from "expo-router";
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
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
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

  const del = useDeleteCommunity();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [community, setCommunity] = useState<Community | null>(null);
  const [rules, setRules] = useState<Rule[]>([]);

  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);

  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [ruleTitle, setRuleTitle] = useState("");

  const canManage = useMemo(() => {
    const myUid = user?.uid ?? null;
    if (!community || !myUid) return false;
    return community.owner_id === myUid;
  }, [community, user?.uid]);

  const load = useCallback(async () => {
    if (!slug) return;

    setLoading(true);
    try {
      const snap = await getDocs(
        query(
          collection(db, "communities"),
          where("slug", "==", String(slug)),
          limit(1),
        ),
      );

      if (snap.empty) throw new Error("Community not found");

      const d = snap.docs[0];
      const c = { id: d.id, ...d.data() } as Community;

      setCommunity(c);
      setName(c.name ?? "");
      setDesc(c.description ?? "");
      setImageUrl(c.image_url ?? "");
      setIsPrivate(normalizeBool(c.is_private));

      const rulesSnap = await getDocs(
        query(
          collection(db, "community_rules"),
          where("community_id", "==", c.id),
        ),
      );

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
    void load();
  }, [load]);

  const saveCommunity = useCallback(async () => {
    if (!community?.id) return;

    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert("Missing name", "Community name is required.");
      return;
    }

    setSaving(true);
    try {
      await updateDoc(doc(db, "communities", community.id), {
        name: trimmed,
        description: desc.trim() || null,
        image_url: imageUrl.trim() || null,
        is_private: isPrivate,
      });

      Alert.alert("Saved", "Community updated.");
      router.back();
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  }, [community?.id, name, desc, imageUrl, isPrivate]);

  const openAddRule = useCallback(() => {
    setRuleTitle("");
    setRuleModalOpen(true);
  }, []);

  const submitAddRule = useCallback(async () => {
    if (!community?.id) return;

    const t = ruleTitle.trim();
    if (!t) return;

    try {
      await addDoc(collection(db, "community_rules"), {
        community_id: community.id,
        title: t,
        description: null,
        created_at: serverTimestamp(),
      });
      setRuleModalOpen(false);
      await load();
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to add rule");
    }
  }, [community?.id, ruleTitle, load]);

  const deleteRule = useCallback(
    (ruleId: string) => {
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

  const confirmDeleteCommunity = useCallback(() => {
    if (!community?.id) return;

    Alert.alert(
      "Delete community?",
      "This permanently deletes the community and its posts/members.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: del.isPending ? "Deleting..." : "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await del.mutateAsync({ communityId: community.id });
              router.replace("/(tabs)/explore");
            } catch (e: any) {
              Alert.alert("Error", e?.message ?? "Failed to delete community.");
            }
          },
        },
      ],
    );
  }, [community?.id, del]);

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
          <Text style={{ color: colors.text }}>You don’t have permission.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <AppHeader
        backgroundColor={colors.background}
        right={
          <TouchableOpacity
            onPress={saveCommunity}
            disabled={saving}
            style={[styles.saveBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={{ color: "#fff", fontWeight: "900" }}>
              {saving ? "..." : "Save"}
            </Text>
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <TextInput
          value={name}
          onChangeText={setName}
          style={[
            styles.input,
            { borderColor: colors.border, color: colors.text },
          ]}
          placeholder="Community name"
          placeholderTextColor={colors.textTertiary}
        />

        <TextInput
          value={desc}
          onChangeText={setDesc}
          multiline
          style={[
            styles.input,
            { height: 110, borderColor: colors.border, color: colors.text },
          ]}
          placeholder="Description"
          placeholderTextColor={colors.textTertiary}
        />

        <TextInput
          value={imageUrl}
          onChangeText={setImageUrl}
          style={[
            styles.input,
            { borderColor: colors.border, color: colors.text },
          ]}
          placeholder="Image URL"
          placeholderTextColor={colors.textTertiary}
        />

        <TouchableOpacity
          onPress={() => setIsPrivate((v) => !v)}
          style={[styles.toggleRow, { borderColor: colors.border }]}
          activeOpacity={0.85}
        >
          <Text style={{ color: colors.text, fontWeight: "800" }}>
            {isPrivate ? "Private" : "Public"}
          </Text>
          <Text style={{ color: colors.textTertiary, fontWeight: "800" }}>
            Tap to toggle
          </Text>
        </TouchableOpacity>

        <View style={{ marginTop: 18 }}>
          <View style={styles.sectionRow}>
            <Text style={{ color: colors.text, fontWeight: "900" }}>Rules</Text>
            <TouchableOpacity onPress={openAddRule} activeOpacity={0.85}>
              <Text style={{ color: colors.primary, fontWeight: "900" }}>
                Add
              </Text>
            </TouchableOpacity>
          </View>

          {rules.map((r) => (
            <View
              key={r.id}
              style={[styles.ruleRow, { borderColor: colors.border }]}
            >
              <Text style={{ color: colors.text, fontWeight: "800" }}>
                {r.title}
              </Text>
              <TouchableOpacity
                onPress={() => deleteRule(r.id)}
                activeOpacity={0.85}
              >
                <Text style={{ color: "#ff3b30", fontWeight: "900" }}>
                  Delete
                </Text>
              </TouchableOpacity>
            </View>
          ))}

          {!rules.length ? (
            <Text
              style={{
                color: colors.textTertiary,
                marginTop: 10,
                fontWeight: "700",
              }}
            >
              No rules yet.
            </Text>
          ) : null}
        </View>

        <View style={{ marginTop: 22 }}>
          <TouchableOpacity
            onPress={confirmDeleteCommunity}
            disabled={del.isPending}
            activeOpacity={0.85}
            style={[
              styles.dangerBtn,
              { borderColor: colors.border, opacity: del.isPending ? 0.6 : 1 },
            ]}
          >
            <Text style={{ color: "#ff3b30", fontWeight: "900" }}>
              {del.isPending ? "Deleting..." : "Delete Community"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal visible={ruleModalOpen} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text
              style={{ color: colors.text, fontWeight: "900", fontSize: 16 }}
            >
              New rule
            </Text>

            <TextInput
              value={ruleTitle}
              onChangeText={setRuleTitle}
              style={[
                styles.input,
                { borderColor: colors.border, color: colors.text },
              ]}
              placeholder="Rule title"
              placeholderTextColor={colors.textTertiary}
              autoFocus
            />

            <View style={styles.modalRow}>
              <TouchableOpacity
                onPress={() => setRuleModalOpen(false)}
                activeOpacity={0.85}
                style={[styles.modalBtn, { borderColor: colors.border }]}
              >
                <Text style={{ color: colors.text, fontWeight: "900" }}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={submitAddRule}
                activeOpacity={0.85}
                style={[styles.modalBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={{ color: "#fff", fontWeight: "900" }}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  saveBtn: {
    paddingHorizontal: 16,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  toggleRow: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  ruleRow: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dangerBtn: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },
  modalCard: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  modalRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  modalBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
