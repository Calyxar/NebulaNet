// app/community/create.tsx
// ✅ FIXED: was using the legacy Web SDK (`db` from @/lib/firebase) for
//    every Firestore call — same pattern found and fixed in
//    app/profile/requests.tsx, app/profile/blocked.tsx,
//    app/community/[slug].tsx, and app/community/[slug]/manage.tsx. Now
//    uses firestore() throughout.
// ✅ REDESIGNED: wrapped in the shared blue gradient and threaded
//    uiScale/fontScale through, matching the rest of the redesign — this
//    screen previously had neither.
// (user?.uid was already correct here — left as-is.)

import { useAuth } from "@/hooks/useAuth";
import { auth } from "@/lib/firebase";
import { uploadFile } from "@/lib/firestore/storage";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import firestore from "@react-native-firebase/firestore";
import { useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
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
  const { colors, isDark, uiScale, fontScale } = useTheme();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  const gradientColors = isDark
    ? [colors.background, colors.background, colors.background]
    : (["#DCEBFF", "#EEF4FF", "#FFFFFF"] as const);

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
      // ✅ FIX: firestore() (native SDK), was db.collection(...) (legacy Web SDK)
      const existSnap = await firestore()
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

      const communityRef = await firestore()
        .collection("communities")
        .add({
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

      await firestore().collection("community_members").add({
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
    <LinearGradient
      colors={gradientColors as any}
      locations={[0, 0.42, 1]}
      style={styles.safe}
    >
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <KeyboardAvoidingView
          style={styles.safe}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View
            style={[
              styles.header,
              {
                borderBottomColor: colors.border,
                paddingHorizontal: 14 * uiScale,
                paddingVertical: 12 * uiScale,
                gap: 10 * uiScale,
              },
            ]}
          >
            <TouchableOpacity
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
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={22} color={colors.text} />
            </TouchableOpacity>
            <Text
              style={[
                styles.headerTitle,
                { color: colors.text, fontSize: 16 * fontScale },
              ]}
            >
              Create Community
            </Text>
            <View style={{ width: 40 * uiScale }} />
          </View>

          <ScrollView
            contentContainerStyle={[styles.content, { padding: 14 * uiScale }]}
            keyboardShouldPersistTaps="handled"
          >
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
                  styles.label,
                  { color: colors.text, fontSize: 13 * fontScale },
                ]}
              >
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
                    borderRadius: 12 * uiScale,
                    paddingHorizontal: 12 * uiScale,
                    paddingVertical: 11 * uiScale,
                    fontSize: 14 * fontScale,
                  },
                ]}
                maxLength={60}
              />

              <View style={{ height: 12 * uiScale }} />

              <Text
                style={[
                  styles.label,
                  { color: colors.text, fontSize: 13 * fontScale },
                ]}
              >
                Slug
              </Text>
              <Text
                style={[
                  styles.helper,
                  { color: colors.textTertiary, fontSize: 12 * fontScale },
                ]}
              >
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
                    borderRadius: 12 * uiScale,
                    paddingHorizontal: 12 * uiScale,
                    paddingVertical: 11 * uiScale,
                    fontSize: 14 * fontScale,
                  },
                ]}
                autoCapitalize="none"
                maxLength={50}
              />

              <View style={{ height: 12 * uiScale }} />

              <Text
                style={[
                  styles.label,
                  { color: colors.text, fontSize: 13 * fontScale },
                ]}
              >
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
                    borderRadius: 12 * uiScale,
                    paddingHorizontal: 12 * uiScale,
                    paddingVertical: 11 * uiScale,
                    fontSize: 14 * fontScale,
                  },
                ]}
                multiline
                textAlignVertical="top"
                maxLength={240}
              />
              <Text
                style={[
                  styles.counter,
                  { color: colors.textTertiary, fontSize: 12 * fontScale },
                ]}
              >
                {description.length}/240
              </Text>

              <View style={{ height: 16 * uiScale }} />

              <Text
                style={[
                  styles.label,
                  { color: colors.text, fontSize: 13 * fontScale },
                ]}
              >
                Community image (optional)
              </Text>
              {imageUri ? (
                <View style={[styles.imageRow, { gap: 12 * uiScale }]}>
                  <Image
                    source={{ uri: imageUri }}
                    style={[
                      styles.imagePreview,
                      {
                        width: 90 * uiScale,
                        height: 90 * uiScale,
                        borderRadius: 14 * uiScale,
                      },
                    ]}
                  />
                  <View style={{ flex: 1, gap: 8 * uiScale }}>
                    <TouchableOpacity
                      style={[
                        styles.smallBtn,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                          paddingHorizontal: 10 * uiScale,
                          paddingVertical: 9 * uiScale,
                          gap: 6 * uiScale,
                        },
                      ]}
                      onPress={pickImage}
                    >
                      <Ionicons
                        name="image-outline"
                        size={16}
                        color={colors.text}
                      />
                      <Text
                        style={[
                          styles.smallBtnText,
                          { color: colors.text, fontSize: 12 * fontScale },
                        ]}
                      >
                        Change
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.smallBtn,
                        {
                          backgroundColor: "#FEF2F2",
                          borderColor: "#FECACA",
                          paddingHorizontal: 10 * uiScale,
                          paddingVertical: 9 * uiScale,
                          gap: 6 * uiScale,
                        },
                      ]}
                      onPress={() => setImageUri(null)}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={16}
                        color="#B91C1C"
                      />
                      <Text
                        style={[
                          styles.smallBtnText,
                          { color: "#B91C1C", fontSize: 12 * fontScale },
                        ]}
                      >
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
                      height: 44 * uiScale,
                      borderRadius: 12 * uiScale,
                      gap: 8 * uiScale,
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
                  <Text
                    style={[
                      styles.pickBtnText,
                      { color: colors.primary, fontSize: 14 * fontScale },
                    ]}
                  >
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
                  marginTop: 14 * uiScale,
                  height: 52 * uiScale,
                  borderRadius: 16 * uiScale,
                },
              ]}
              disabled={!canCreate}
              onPress={createCommunity}
              activeOpacity={0.9}
            >
              <Text style={[styles.ctaText, { fontSize: 15 * fontScale }]}>
                {isSaving ? "Creating..." : "Create community"}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
  },
  backBtn: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontWeight: "900",
  },
  content: { paddingBottom: 32 },
  card: { borderWidth: 1 },
  label: { fontWeight: "900", marginBottom: 6 },
  helper: { marginBottom: 8 },
  input: {
    borderWidth: 1,
  },
  textarea: { minHeight: 110, paddingTop: 12 },
  counter: { marginTop: 8, textAlign: "right" },
  pickBtn: {
    marginTop: 6,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  pickBtnText: { fontWeight: "800" },
  imageRow: {
    flexDirection: "row",
    marginTop: 6,
    alignItems: "center",
  },
  imagePreview: {},
  smallBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
  },
  smallBtnText: { fontWeight: "900" },
  cta: {
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: { color: "#FFFFFF", fontWeight: "900" },
});
