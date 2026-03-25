// app/create/community.tsx — UPDATED ✅ dark mode + LinearGradient + useTheme
import { useAuth } from "@/hooks/useAuth";
import { auth, db } from "@/lib/firebase";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystemLegacy from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import {
  addDoc,
  collection,
  getDocs,
  limit,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import {
  getDownloadURL,
  getStorage,
  ref as storageRef,
  uploadString,
} from "firebase/storage";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const PickerMedia: any =
  (ImagePicker as any).MediaType ?? (ImagePicker as any).MediaTypeOptions;

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
  const slug = base || `community-${randomSuffix(6)}`;
  for (let i = 0; i < 6; i++) {
    const attempt = i === 0 ? slug : `${slug}-${randomSuffix(5)}`;
    const snap = await getDocs(
      query(
        collection(db, "communities"),
        where("slug", "==", attempt),
        limit(1),
      ),
    );
    if (snap.empty) return attempt;
  }
  return `${slug}-${Date.now().toString().slice(-5)}`;
}

async function uploadCommunityImage(
  userId: string,
  uri: string,
): Promise<string> {
  const extGuess = uri.split("?")[0]?.split(".").pop()?.toLowerCase();
  const ext = extGuess && extGuess.length <= 5 ? extGuess : "jpg";
  const path = `community/${userId}/${Date.now()}-${randomSuffix(8)}.${ext}`;
  const storage = getStorage();
  const fileRef = storageRef(storage, path);
  let readUri = uri;
  if (uri.startsWith("content://")) {
    const localPath = `${FileSystemLegacy.cacheDirectory}community-upload-${Date.now()}.${ext}`;
    await FileSystemLegacy.copyAsync({ from: uri, to: localPath });
    readUri = localPath;
  }
  const base64 = await FileSystemLegacy.readAsStringAsync(readUri, {
    encoding: "base64" as any,
  });
  await uploadString(fileRef, base64, "base64");
  return getDownloadURL(fileRef);
}

export default function CreateCommunityScreen() {
  const { profile } = useAuth();
  const { colors, isDark } = useTheme();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const avatarLetter = profile?.username?.charAt(0).toUpperCase() ?? "U";
  const canSubmit = useMemo(
    () => name.trim().length >= 3 && !isSubmitting,
    [name, isSubmitting],
  );

  const gradientColors = isDark
    ? [colors.background, colors.background, colors.background]
    : (["#DCEBFF", "#EEF4FF", "#FFFFFF"] as const);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Please allow photo access.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: PickerMedia.Images,
      quality: 0.9,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled || !result.assets?.length) return;
    setImageUri(result.assets[0].uri);
  };

  const handleCreate = async () => {
    if (!auth.currentUser) {
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
      const slug = await ensureUniqueSlug(slugify(trimmedName));
      let image_url: string | null = null;
      if (imageUri) {
        try {
          image_url = await uploadCommunityImage(
            auth.currentUser.uid,
            imageUri,
          );
        } catch (e) {
          console.warn("Image upload skipped:", e);
        }
      }
      const ref = await addDoc(collection(db, "communities"), {
        name: trimmedName,
        slug,
        description: description.trim() || null,
        image_url,
        is_private: isPrivate,
        owner_id: auth.currentUser.uid,
        member_count: 1,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
      await addDoc(collection(db, "community_members"), {
        community_id: ref.id,
        user_id: auth.currentUser.uid,
        role: "owner",
        joined_at: serverTimestamp(),
      });
      router.replace(`/community/${slug}` as any);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to create community.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const content = (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "transparent" }}
      edges={["top", "left", "right"]}
    >
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
        <View
          style={[
            styles.header,
            {
              borderBottomColor: colors.border,
              backgroundColor: "transparent",
            },
          ]}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.cancelBtn}
          >
            <Text style={[styles.cancelText, { color: colors.text }]}>
              Cancel
            </Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            New Community
          </Text>
          <TouchableOpacity
            style={[
              styles.createBtn,
              {
                backgroundColor: canSubmit
                  ? colors.primary
                  : colors.primary + "60",
              },
            ]}
            onPress={handleCreate}
            disabled={!canSubmit}
          >
            <Text style={styles.createBtnText}>
              {isSubmitting ? "Creating..." : "Create"}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Composer row */}
          <View style={styles.composerRow}>
            <View style={styles.avatarCol}>
              {profile?.avatar_url ? (
                <Image
                  source={{ uri: profile.avatar_url }}
                  style={styles.avatar}
                />
              ) : (
                <View
                  style={[
                    styles.avatarFallback,
                    { backgroundColor: colors.primary },
                  ]}
                >
                  <Text style={styles.avatarLetter}>{avatarLetter}</Text>
                </View>
              )}
              <View
                style={[styles.avatarLine, { backgroundColor: colors.border }]}
              />
            </View>

            <View style={styles.inputCol}>
              <TextInput
                style={[styles.nameInput, { color: colors.text }]}
                placeholder="Community name"
                placeholderTextColor={colors.textTertiary}
                value={name}
                onChangeText={setName}
                autoFocus
                maxLength={50}
              />
              <TextInput
                style={[styles.descInput, { color: colors.text }]}
                placeholder="What is this community about? (optional)"
                placeholderTextColor={colors.textTertiary}
                value={description}
                onChangeText={setDescription}
                multiline
                maxLength={200}
              />
              {name.trim().length > 0 && (
                <Text
                  style={[styles.slugPreview, { color: colors.textTertiary }]}
                >
                  nebulanet.space/community/{slugify(name)}
                </Text>
              )}
            </View>
          </View>

          {/* Settings */}
          <View style={styles.settingsSection}>
            <View style={styles.avatarColSpacer} />
            <View style={styles.settingsCol}>
              {/* Community image */}
              <Text
                style={[styles.sectionLabel, { color: colors.textTertiary }]}
              >
                Community image
              </Text>
              <TouchableOpacity
                style={[
                  styles.imagePicker,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
                onPress={pickImage}
                activeOpacity={0.8}
              >
                {imageUri ? (
                  <>
                    <Image
                      source={{ uri: imageUri }}
                      style={styles.imagePreview}
                    />
                    <View style={styles.imageOverlay}>
                      <Ionicons name="camera" size={20} color="#fff" />
                    </View>
                  </>
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Ionicons
                      name="image-outline"
                      size={24}
                      color={colors.primary}
                    />
                    <Text
                      style={[
                        styles.imagePlaceholderText,
                        { color: colors.primary },
                      ]}
                    >
                      Add image
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Privacy */}
              <Text
                style={[
                  styles.sectionLabel,
                  { color: colors.textTertiary, marginTop: 20 },
                ]}
              >
                Privacy
              </Text>
              <View
                style={[
                  styles.settingsCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <TouchableOpacity
                  style={styles.settingRow}
                  onPress={() => setIsPrivate(false)}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.settingIconWrap,
                      { backgroundColor: colors.primary + "18" },
                    ]}
                  >
                    <Ionicons
                      name="earth-outline"
                      size={18}
                      color={colors.primary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.settingTitle, { color: colors.text }]}>
                      Public
                    </Text>
                    <Text
                      style={[
                        styles.settingSubtitle,
                        { color: colors.textTertiary },
                      ]}
                    >
                      Anyone can see and join
                    </Text>
                  </View>
                  {!isPrivate && (
                    <Ionicons
                      name="checkmark-circle"
                      size={22}
                      color={colors.primary}
                    />
                  )}
                </TouchableOpacity>

                <View
                  style={[styles.divider, { backgroundColor: colors.border }]}
                />

                <TouchableOpacity
                  style={styles.settingRow}
                  onPress={() => setIsPrivate(true)}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.settingIconWrap,
                      { backgroundColor: colors.surface },
                    ]}
                  >
                    <Ionicons
                      name="lock-closed-outline"
                      size={18}
                      color={colors.textTertiary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.settingTitle, { color: colors.text }]}>
                      Private
                    </Text>
                    <Text
                      style={[
                        styles.settingSubtitle,
                        { color: colors.textTertiary },
                      ]}
                    >
                      Content locked until user joins
                    </Text>
                  </View>
                  {isPrivate && (
                    <Ionicons
                      name="checkmark-circle"
                      size={22}
                      color={colors.primary}
                    />
                  )}
                </TouchableOpacity>
              </View>

              <Text style={[styles.helperText, { color: colors.textTertiary }]}>
                You'll be the first member and moderator.
              </Text>
              <View style={{ height: 40 }} />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

  if (!isDark) {
    return (
      <LinearGradient
        colors={gradientColors as any}
        locations={[0, 0.42, 1]}
        style={{ flex: 1 }}
      >
        {content}
      </LinearGradient>
    );
  }
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 16, fontWeight: "800" },
  cancelBtn: { paddingVertical: 6, paddingHorizontal: 4, minWidth: 60 },
  cancelText: { fontSize: 16, fontWeight: "500" },
  createBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 999,
    minWidth: 80,
    alignItems: "center",
  },
  createBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  scroll: { flex: 1 },
  composerRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  avatarCol: { alignItems: "center" },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: { color: "#fff", fontWeight: "700", fontSize: 18 },
  avatarLine: {
    width: 2,
    flex: 1,
    minHeight: 20,
    marginTop: 8,
    borderRadius: 1,
  },
  inputCol: { flex: 1, paddingBottom: 8 },
  nameInput: {
    fontSize: 17,
    fontWeight: "700",
    paddingTop: 0,
    marginBottom: 8,
  },
  descInput: { fontSize: 15, lineHeight: 22, minHeight: 60, paddingTop: 0 },
  slugPreview: { fontSize: 12, marginTop: 6, fontWeight: "500" },
  settingsSection: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 12,
    paddingTop: 8,
  },
  avatarColSpacer: { width: 44 },
  settingsCol: { flex: 1 },
  sectionLabel: { fontSize: 13, fontWeight: "700", marginBottom: 10 },
  imagePicker: {
    width: 80,
    height: 80,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderStyle: "dashed",
  },
  imagePreview: { width: "100%", height: "100%" },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  imagePlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  imagePlaceholderText: { fontSize: 11, fontWeight: "600" },
  settingsCard: { borderWidth: 1, borderRadius: 16, overflow: "hidden" },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
  },
  settingIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  settingTitle: { fontSize: 14, fontWeight: "700" },
  settingSubtitle: { fontSize: 12, marginTop: 2 },
  divider: { height: 1, marginHorizontal: 14 },
  helperText: { fontSize: 12, marginTop: 12, lineHeight: 16 },
});
