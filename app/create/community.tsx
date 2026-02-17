// app/create/community.tsx — ✅ FULL Create Community (UI + upload + create + auto-join + route)
import { useAuth } from "@/hooks/useAuth";
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
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function randomSuffix(len = 5) {
  return Math.random()
    .toString(36)
    .slice(2, 2 + len);
}

async function ensureUniqueSlug(base: string) {
  let slug = base || `community-${randomSuffix(6)}`;

  // Try a few attempts: slug, slug-xxxxx, slug-yyyyy, ...
  for (let i = 0; i < 6; i++) {
    const attempt = i === 0 ? slug : `${slug}-${randomSuffix(5)}`;

    const { data, error } = await supabase
      .from("communities")
      .select("id")
      .eq("slug", attempt)
      .maybeSingle();

    if (error) {
      // if slug column doesn’t exist, we just return attempt (fallback)
      return attempt;
    }
    if (!data) return attempt;
  }

  return `${slug}-${Date.now().toString().slice(-5)}`;
}

async function uploadCommunityImage(userId: string, uri: string) {
  // Storage bucket name: "community-images" (create later if you haven't)
  // If you don't have it yet, this will throw and we gracefully fall back.
  const bucket = "community-images";

  const res = await fetch(uri);
  if (!res.ok) throw new Error("Could not read selected image");
  const blob = await res.blob();

  const extGuess = uri
    .split("?")[0]
    ?.split("#")[0]
    ?.split(".")
    .pop()
    ?.toLowerCase();
  const ext = extGuess && extGuess.length <= 5 ? extGuess : "jpg";

  const objectPath = `community/${userId}/${Date.now()}-${randomSuffix(8)}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from(bucket)
    .upload(objectPath, blob, {
      upsert: false,
      contentType: blob.type || undefined,
    });

  if (upErr) throw upErr;

  const { data } = supabase.storage.from(bucket).getPublicUrl(objectPath);
  if (!data?.publicUrl) throw new Error("Could not get public URL for image");

  return data.publicUrl;
}

export default function CreateCommunityScreen() {
  const { user } = useAuth();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);

  const [imageUri, setImageUri] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = useMemo(() => {
    return name.trim().length >= 3 && !isSubmitting;
  }, [name, isSubmitting]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission required",
        "Please allow photo access to pick an image.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      allowsEditing: true,
      aspect: [1, 1],
    });

    if (result.canceled || !result.assets?.length) return;
    setImageUri(result.assets[0].uri);
  };

  const handleCreate = async () => {
    if (!user?.id) {
      Alert.alert("Not logged in", "Please log in again.");
      return;
    }
    const trimmedName = name.trim();
    if (trimmedName.length < 3) {
      Alert.alert(
        "Name too short",
        "Community name must be at least 3 characters.",
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const baseSlug = slugify(trimmedName);
      const slug = await ensureUniqueSlug(baseSlug);

      // Try upload image (optional). If storage bucket/policy isn’t ready, we just skip.
      let image_url: string | null = null;
      if (imageUri) {
        try {
          image_url = await uploadCommunityImage(user.id, imageUri);
        } catch (e) {
          console.warn("image upload skipped:", e);
          image_url = null;
        }
      }

      // Build insert payload (fallback-safe for optional columns)
      const payload: any = {
        name: trimmedName,
        slug,
        description: description.trim() || null,

        // you said your DB uses image_url
        image_url,

        // safe defaults
        member_count: 1,
      };

      // optional fields (only if your schema has them)
      payload.is_private = isPrivate;
      payload.owner_id = user.id;

      // Insert community
      const { data: created, error: cErr } = await supabase
        .from("communities")
        .insert(payload)
        .select("id, slug")
        .single();

      if (cErr) {
        // If error due to missing columns, retry with minimal payload
        const msg = cErr.message || "";
        const looksLikeMissingColumn =
          msg.includes("does not exist") || msg.includes("column");

        if (looksLikeMissingColumn) {
          const minimal: any = {
            name: trimmedName,
            slug,
            description: description.trim() || null,
            image_url,
            member_count: 1,
          };

          const retry = await supabase
            .from("communities")
            .insert(minimal)
            .select("id, slug")
            .single();

          if (retry.error) throw retry.error;
          if (!retry.data) throw new Error("Failed to create community");
          // continue using retry.data
          const commId = retry.data.id as string;
          const commSlug = retry.data.slug as string;

          // auto join (best effort)
          await supabase.from("community_members").insert({
            community_id: commId,
            user_id: user.id,
          });

          // auto moderator (best effort)
          await supabase.from("community_moderators").insert({
            community_id: commId,
            user_id: user.id,
          });

          Alert.alert("Success", "Community created!", [
            {
              text: "OK",
              onPress: () => router.replace(`/community/${commSlug}`),
            },
          ]);
          return;
        }

        throw cErr;
      }

      if (!created?.id || !created?.slug)
        throw new Error("Failed to create community");

      // Auto-join creator (best effort)
      await supabase.from("community_members").insert({
        community_id: created.id,
        user_id: user.id,
      });

      // Auto-moderator creator (best effort)
      await supabase.from("community_moderators").insert({
        community_id: created.id,
        user_id: user.id,
      });

      Alert.alert("Success", "Community created!", [
        {
          text: "OK",
          onPress: () => router.replace(`/community/${created.slug}`),
        },
      ]);
    } catch (e: any) {
      console.error(e);
      Alert.alert("Error", e?.message || "Failed to create community.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
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
          showsVerticalScrollIndicator={false}
        >
          {/* Image */}
          <View style={styles.card}>
            <Text style={styles.label}>Community image (optional)</Text>

            <TouchableOpacity
              style={styles.imagePicker}
              onPress={pickImage}
              activeOpacity={0.85}
            >
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.image} />
              ) : (
                <View style={styles.imageEmpty}>
                  <Ionicons name="image-outline" size={26} color="#6B7280" />
                  <Text style={styles.imageEmptyText}>Tap to add an image</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Name + Desc */}
          <View style={styles.card}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Nebula Gamers"
              placeholderTextColor="#9CA3AF"
              style={styles.input}
              maxLength={50}
            />

            <Text style={[styles.label, { marginTop: 14 }]}>
              Description (optional)
            </Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="What is this community about?"
              placeholderTextColor="#9CA3AF"
              style={[styles.input, styles.textarea]}
              multiline
              textAlignVertical="top"
              maxLength={200}
            />
          </View>

          {/* Privacy */}
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.privacyTitle}>Private community</Text>
                <Text style={styles.privacySub}>
                  Private communities are visible, but content is locked until a
                  user joins.
                </Text>
              </View>
              <Switch value={isPrivate} onValueChange={setIsPrivate} />
            </View>
          </View>

          {/* Submit */}
          <TouchableOpacity
            disabled={!canSubmit}
            onPress={handleCreate}
            style={[styles.primaryBtn, !canSubmit && styles.primaryBtnDisabled]}
            activeOpacity={0.9}
          >
            <Text style={styles.primaryBtnText}>
              {isSubmitting ? "Creating..." : "Create Community"}
            </Text>
          </TouchableOpacity>

          <Text style={styles.helper}>
            By creating a community, you’ll be the first member and moderator.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ---------------- styles ---------------- */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2F7",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 16, fontWeight: "900", color: "#111827" },

  content: { padding: 16, paddingBottom: 28, gap: 12 },

  card: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    padding: 14,
    backgroundColor: "#fff",
  },

  label: { fontSize: 12, fontWeight: "900", color: "#111827", marginBottom: 8 },

  imagePicker: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  image: { width: "100%", height: "100%" },
  imageEmpty: { alignItems: "center", justifyContent: "center", gap: 8 },
  imageEmptyText: { color: "#6B7280", fontWeight: "700" },

  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: "#111827",
    backgroundColor: "#fff",
  },
  textarea: { minHeight: 110 },

  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  privacyTitle: { fontWeight: "900", color: "#111827" },
  privacySub: { marginTop: 4, color: "#6B7280", fontSize: 12, lineHeight: 16 },

  primaryBtn: {
    marginTop: 6,
    backgroundColor: "#7C3AED",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryBtnDisabled: { backgroundColor: "#C4B5FD" },
  primaryBtnText: { color: "#fff", fontWeight: "900", fontSize: 15 },

  helper: { textAlign: "center", color: "#6B7280", fontSize: 12, marginTop: 6 },
});
