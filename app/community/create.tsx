import { useAuth } from "@/hooks/useAuth";
import { auth, db } from "@/lib/firebase";
import { uploadFile } from "@/lib/firestore/storage";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import firestore from "@react-native-firebase/firestore";
import { useQueryClient } from "@tanstack/react-query";
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
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  const canCreate = useMemo(
    () => name.trim().length >= 3 && slug.trim().length >= 3 && !isSaving,
    [name, slug, isSaving],
  );

  const onNameChange = (v: string) => {
    setName(v);
    if (!slugManuallyEdited) setSlug(slugify(v));
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
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled || !result.assets?.length) return;
    setImageUri(result.assets[0].uri);
  };

  const createCommunity = async () => {
    // ✅ FIX: user?.uid not user?.id
    if (!user?.uid || !auth.currentUser) {
      Alert.alert("Not logged in", "Please log in again.");
      return;
    }

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
      const existSnap = await db
        .collection("communities")
        .where("slug", "==", s)
        .limit(1)
        .get();
      if (!existSnap.empty) {
        Alert.alert("Slug already taken", "Try a different slug.");
        return;
      }

      // ✅ Upload image to Firebase Storage if selected
      let image_url: string | null = null;
      if (imageUri) {
        const result = await uploadFile(imageUri, "community", "image", {
          compressImages: true,
          maxWidth: 800,
          maxHeight: 800,
          quality: 0.85,
        });
        if (result.success && result.url) {
          image_url = result.url;
        }
      }

      const communityRef = await db.collection("communities").add({
        slug: s,
        name: n,
        description: description.trim() || null,
        image_url,
        is_private: false,
        owner_id: auth.currentUser.uid,
        member_count: 1,
        created_at: firestore.FieldValue.serverTimestamp(),
        updated_at: firestore.FieldValue.serverTimestamp(),
      });

      await db.collection("community_members").add({
        community_id: communityRef.id,
        user_id: auth.currentUser.uid,
        role: "owner",
        joined_at: firestore.FieldValue.serverTimestamp(),
      });

      queryClient.invalidateQueries({ queryKey: ["my-communities", user.uid] });
      queryClient.invalidateQueries({ queryKey: ["my-communities"] });
      queryClient.invalidateQueries({ queryKey: ["communities"] });

      Alert.alert("Created!", "Your community is ready.", [
        {
          text: "Go to community",
          onPress: () => router.replace(`/community/${s}`),
        },
      ]);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to create community.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.safe}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View
          style={[
            styles.header,
            {
              borderBottomColor: colors.border,
              backgroundColor: colors.background,
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.backBtn,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Create Community
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.label, { color: colors.text }]}>
              Community name
            </Text>
            <TextInput
              value={name}
              onChangeText={onNameChange}
              placeholder="e.g., Nebula Gamers"
              placeholderTextColor={colors.textTertiary}
              style={[
                styles.input,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              maxLength={60}
            />

            <View style={{ height: 12 }} />

            <Text style={[styles.label, { color: colors.text }]}>Slug</Text>
            <Text style={[styles.helper, { color: colors.textTertiary }]}>
              URL:{" "}
              <Text style={{ fontWeight: "800" }}>
                /community/{slug || "your-slug"}
              </Text>
            </Text>
            <TextInput
              value={slug}
              onChangeText={onSlugChange}
              placeholder="e.g., nebula-gamers"
              placeholderTextColor={colors.textTertiary}
              style={[
                styles.input,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              autoCapitalize="none"
              maxLength={50}
            />

            <View style={{ height: 12 }} />

            <Text style={[styles.label, { color: colors.text }]}>
              Description
            </Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="What is this community about?"
              placeholderTextColor={colors.textTertiary}
              style={[
                styles.input,
                styles.textarea,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              multiline
              textAlignVertical="top"
              maxLength={240}
            />
            <Text style={[styles.counter, { color: colors.textTertiary }]}>
              {description.length}/240
            </Text>

            <View style={{ height: 16 }} />

            <Text style={[styles.label, { color: colors.text }]}>
              Community image (optional)
            </Text>
            {imageUri ? (
              <View style={styles.imageRow}>
                <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                <View style={{ flex: 1, gap: 8 }}>
                  <TouchableOpacity
                    style={[
                      styles.smallBtn,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                      },
                    ]}
                    onPress={pickImage}
                  >
                    <Ionicons
                      name="image-outline"
                      size={16}
                      color={colors.text}
                    />
                    <Text style={[styles.smallBtnText, { color: colors.text }]}>
                      Change
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.smallBtn,
                      { backgroundColor: "#FEF2F2", borderColor: "#FECACA" },
                    ]}
                    onPress={() => setImageUri(null)}
                  >
                    <Ionicons name="trash-outline" size={16} color="#B91C1C" />
                    <Text style={[styles.smallBtnText, { color: "#B91C1C" }]}>
                      Remove
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={[
                  styles.pickBtn,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
                onPress={pickImage}
                activeOpacity={0.9}
              >
                <Ionicons
                  name="image-outline"
                  size={18}
                  color={colors.primary}
                />
                <Text style={[styles.pickBtnText, { color: colors.primary }]}>
                  Choose an image
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.cta,
              {
                backgroundColor: canCreate
                  ? colors.primary
                  : colors.primary + "60",
              },
            ]}
            disabled={!canCreate}
            onPress={createCommunity}
            activeOpacity={0.9}
          >
            <Text style={styles.ctaText}>
              {isSaving ? "Creating..." : "Create community"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "900",
  },
  content: { padding: 14, paddingBottom: 32 },
  card: { borderWidth: 1, borderRadius: 16, padding: 14 },
  label: { fontSize: 13, fontWeight: "900", marginBottom: 6 },
  helper: { fontSize: 12, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
  },
  textarea: { minHeight: 110, paddingTop: 12 },
  counter: { marginTop: 8, fontSize: 12, textAlign: "right" },
  pickBtn: {
    marginTop: 6,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  pickBtnText: { fontWeight: "800" },
  imageRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 6,
    alignItems: "center",
  },
  imagePreview: { width: 90, height: 90, borderRadius: 14 },
  smallBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
  },
  smallBtnText: { fontWeight: "900", fontSize: 12 },
  cta: {
    marginTop: 14,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: { color: "#FFFFFF", fontWeight: "900", fontSize: 15 },
});
