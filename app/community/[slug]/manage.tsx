// app/community/[slug]/manage.tsx — CLEAN FINAL ✅

import AppHeader from "@/components/navigation/AppHeader";
import { useAuth } from "@/hooks/useAuth";
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

  const canManage = useMemo(() => {
    if (!community || !user?.id) return false;
    if (community.owner_id === user.id) return true;
    return false;
  }, [community, user?.id]);

  /* =========================================================
     LOAD COMMUNITY
  ========================================================= */

  const load = useCallback(async () => {
    if (!slug) return;

    setLoading(true);

    try {
      const snap = await getDocs(
        query(
          collection(db, "communities"),
          where("slug", "==", slug),
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
        rulesSnap.docs.map((r) => ({
          id: r.id,
          ...r.data(),
        })) as Rule[],
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

  /* =========================================================
     SAVE COMMUNITY
  ========================================================= */

  const saveCommunity = useCallback(async () => {
    if (!community?.id) return;

    setSaving(true);

    try {
      const payload = {
        name: name.trim(),
        description: desc.trim() || null,
        image_url: imageUrl.trim() || null,
        is_private: isPrivate,
      };

      await updateDoc(doc(db, "communities", community.id), payload);

      Alert.alert("Saved", "Community updated.");
      router.back();
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  }, [community?.id, name, desc, imageUrl, isPrivate]);

  /* =========================================================
     RULES
  ========================================================= */

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
          load();
        } catch (e: any) {
          Alert.alert("Error", e?.message ?? "Failed to add rule");
        }
      },
      "plain-text",
    );

    if (!Alert.prompt) {
      Alert.alert("Add Rule", "Android needs a modal for text input.");
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

  /* =========================================================
     UI
  ========================================================= */

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
          style={styles.input}
          placeholder="Community name"
        />

        <TextInput
          value={desc}
          onChangeText={setDesc}
          multiline
          style={[styles.input, { height: 100 }]}
          placeholder="Description"
        />

        <TextInput
          value={imageUrl}
          onChangeText={setImageUrl}
          style={styles.input}
          placeholder="Image URL"
        />

        <TouchableOpacity onPress={() => setIsPrivate((v) => !v)}>
          <Text style={{ marginTop: 12 }}>
            {isPrivate ? "Private" : "Public"}
          </Text>
        </TouchableOpacity>

        <View style={{ marginTop: 20 }}>
          <TouchableOpacity onPress={addRule}>
            <Text>Add Rule</Text>
          </TouchableOpacity>

          {rules.map((r) => (
            <View key={r.id} style={styles.ruleRow}>
              <Text>{r.title}</Text>
              <TouchableOpacity onPress={() => deleteRule(r.id)}>
                <Text style={{ color: "red" }}>Delete</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>
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
  ruleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
});
