// app/community/create.tsx — Create Community screen (NebulaNet) ✅
// - Creates a community row (name, slug, description, image_url, member_count)
// - Generates slug from name (editable)
// - Optional image picker (stores the image URL as a string for now)
// NOTE: This does NOT upload image to Storage yet (we’ll do SQL/storage/RLS later).

import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

export default function CreateCommunityScreen() {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  const canCreate = useMemo(() => {
    return name.trim().length >= 3 && slug.trim().length >= 3 && !isSaving;
  }, [name, slug, isSaving]);

  const onNameChange = (v: string) => {
    setName(v);
    if (!slugManuallyEdited) {
      setSlug(slugify(v));
    }
  };

  const onSlugChange = (v: string) => {
    setSlugManuallyEdited(true);
    setSlug(slugify(v));
  };

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== "granted") {
      Alert.alert("Permission required", "Please allow photo permissions.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
    });

    if (result.canceled || !result.assets?.length) return;

    // For now we store the local uri as image_url.
    // Later we’ll upload to Supabase Storage and store the public URL instead.
    setImageUri(result.assets[0].uri);
  };

  const removeImage = () => setImageUri(null);

  const createCommunity = async () => {
    const n = name.trim();
    const s = slugify(slug);

    if (n.length < 3) {
      Alert.alert(
        "Name too short",
        "Community name must be at least 3 characters.",
      );
      return;
    }
    if (s.length < 3) {
      Alert.alert("Slug too short", "Slug must be at least 3 characters.");
      return;
    }

    setIsSaving(true);
    try {
      // Optional: quick check slug uniqueness (friendly error before insert)
      const { data: existing, error: existErr } = await supabase
        .from("communities")
        .select("id")
        .eq("slug", s)
        .maybeSingle();

      if (existErr) throw existErr;
      if (existing?.id) {
        Alert.alert("Slug already taken", "Try a different slug.");
        return;
      }

      const { data, error } = await supabase
        .from("communities")
        .insert({
          name: n,
          slug: s,
          description: description.trim() || null,
          image_url: imageUri || null,
          member_count: 1, // placeholder (we’ll maintain this properly later)
        })
        .select("id, slug")
        .single();

      if (error) throw error;

      Alert.alert("Created!", "Your community is ready.", [
        {
          text: "Go to community",
          onPress: () => router.replace(`/community/${data.slug}`),
        },
      ]);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to create community.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.safe}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Community</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.label}>Community name</Text>
            <TextInput
              value={name}
              onChangeText={onNameChange}
              placeholder="e.g., Nebula Gamers"
              placeholderTextColor="#9CA3AF"
              style={styles.input}
              maxLength={60}
            />

            <View style={{ height: 12 }} />

            <Text style={styles.label}>Slug</Text>
            <Text style={styles.helper}>
              This is your URL:{" "}
              <Text style={{ fontWeight: "800" }}>
                /community/{slug || "your-slug"}
              </Text>
            </Text>
            <TextInput
              value={slug}
              onChangeText={onSlugChange}
              placeholder="e.g., nebula-gamers"
              placeholderTextColor="#9CA3AF"
              style={styles.input}
              autoCapitalize="none"
              maxLength={50}
            />

            <View style={{ height: 12 }} />

            <Text style={styles.label}>Description</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="What is this community about?"
              placeholderTextColor="#9CA3AF"
              style={[styles.input, styles.textarea]}
              multiline
              textAlignVertical="top"
              maxLength={240}
            />
            <Text style={styles.counter}>{description.length}/240</Text>

            <View style={{ height: 16 }} />

            <Text style={styles.label}>Community image (optional)</Text>
            {imageUri ? (
              <View style={styles.imageRow}>
                <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.helper} numberOfLines={2}>
                    Image selected. (We’ll upload to Storage later.)
                  </Text>

                  <View
                    style={{ flexDirection: "row", gap: 10, marginTop: 10 }}
                  >
                    <TouchableOpacity
                      style={styles.smallBtn}
                      onPress={pickImage}
                    >
                      <Ionicons
                        name="image-outline"
                        size={16}
                        color="#111827"
                      />
                      <Text style={styles.smallBtnText}>Change</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.smallBtn, styles.smallBtnDanger]}
                      onPress={removeImage}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={16}
                        color="#B91C1C"
                      />
                      <Text style={[styles.smallBtnText, { color: "#B91C1C" }]}>
                        Remove
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.pickBtn}
                onPress={pickImage}
                activeOpacity={0.9}
              >
                <Ionicons name="image-outline" size={18} color="#111827" />
                <Text style={styles.pickBtnText}>Choose an image</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Footer CTA */}
          <TouchableOpacity
            style={[styles.cta, !canCreate && styles.ctaDisabled]}
            disabled={!canCreate}
            onPress={createCommunity}
            activeOpacity={0.9}
          >
            <Text style={styles.ctaText}>
              {isSaving ? "Creating..." : "Create community"}
            </Text>
          </TouchableOpacity>

          <Text style={styles.note}>
            Next: we’ll add Storage upload, memberships, and proper permissions
            (RLS).
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F6F7FB" },

  header: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ECEEF3",
    backgroundColor: "#F6F7FB",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#ECEEF3",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
  },

  content: { padding: 14, paddingBottom: 24 },

  card: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#ECEEF3",
    borderRadius: 16,
    padding: 14,
  },

  label: { fontSize: 13, fontWeight: "900", color: "#111827", marginBottom: 6 },
  helper: { fontSize: 12, color: "#6B7280", marginBottom: 8 },
  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    color: "#111827",
  },
  textarea: {
    minHeight: 110,
    paddingTop: 12,
  },
  counter: { marginTop: 8, fontSize: 12, color: "#9CA3AF", textAlign: "right" },

  pickBtn: {
    marginTop: 6,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  pickBtnText: { fontWeight: "800", color: "#111827" },

  imageRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 6,
    alignItems: "center",
  },
  imagePreview: {
    width: 90,
    height: 90,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
  },

  smallBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  smallBtnDanger: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  smallBtnText: { fontWeight: "900", color: "#111827", fontSize: 12 },

  cta: {
    marginTop: 14,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#7C3AED",
  },
  ctaDisabled: { backgroundColor: "#C7B7F6" },
  ctaText: { color: "#FFFFFF", fontWeight: "900", fontSize: 15 },

  note: { marginTop: 10, fontSize: 12, color: "#6B7280", textAlign: "center" },
});
