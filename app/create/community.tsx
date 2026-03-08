// app/create/community.tsx — REDESIGNED ✅ matches Twitter-style composer
// ✅ uploadString base64 — Expo Go + Android content:// safe
import { useAuth } from "@/hooks/useAuth";
import { auth, db } from "@/lib/firebase";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystemLegacy from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
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

  // ✅ Copy content:// URIs first (Android), then upload as base64
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

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.cancelBtn}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.postBtn, !canSubmit && styles.postBtnDisabled]}
              onPress={handleCreate}
              disabled={!canSubmit}
            >
              <Text style={styles.postBtnText}>
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
              {/* Avatar */}
              <View style={styles.avatarCol}>
                {profile?.avatar_url ? (
                  <Image
                    source={{ uri: profile.avatar_url }}
                    style={styles.avatar}
                  />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarLetter}>{avatarLetter}</Text>
                  </View>
                )}
                <View style={styles.avatarLine} />
              </View>

              {/* Name + description */}
              <View style={styles.inputCol}>
                <TextInput
                  style={styles.nameInput}
                  placeholder="Community name"
                  placeholderTextColor="#9CA3AF"
                  value={name}
                  onChangeText={setName}
                  autoFocus
                  maxLength={50}
                />
                <TextInput
                  style={styles.descInput}
                  placeholder="What is this community about? (optional)"
                  placeholderTextColor="#9CA3AF"
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  maxLength={200}
                />
                {name.trim().length > 0 && (
                  <Text style={styles.slugPreview}>
                    nebulanet.space/community/{slugify(name)}
                  </Text>
                )}
              </View>
            </View>

            {/* Settings section */}
            <View style={styles.settingsSection}>
              <View style={styles.avatarColSpacer} />
              <View style={styles.settingsCol}>
                {/* Community image */}
                <Text style={styles.sectionLabel}>Community image</Text>
                <TouchableOpacity
                  style={styles.imagePicker}
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
                        color="#7C3AED"
                      />
                      <Text style={styles.imagePlaceholderText}>Add image</Text>
                    </View>
                  )}
                </TouchableOpacity>

                {/* Privacy */}
                <Text style={[styles.sectionLabel, { marginTop: 16 }]}>
                  Privacy
                </Text>
                <View style={styles.settingsCard}>
                  <TouchableOpacity
                    style={styles.settingRow}
                    onPress={() => setIsPrivate(false)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.settingIconWrap,
                        { backgroundColor: "#EDE9FE" },
                      ]}
                    >
                      <Ionicons
                        name="earth-outline"
                        size={18}
                        color="#7C3AED"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.settingTitle}>Public</Text>
                      <Text style={styles.settingSubtitle}>
                        Anyone can see and join
                      </Text>
                    </View>
                    {!isPrivate && (
                      <Ionicons
                        name="checkmark-circle"
                        size={22}
                        color="#7C3AED"
                      />
                    )}
                  </TouchableOpacity>

                  <View style={styles.divider} />

                  <TouchableOpacity
                    style={styles.settingRow}
                    onPress={() => setIsPrivate(true)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.settingIconWrap,
                        { backgroundColor: "#F3F4F6" },
                      ]}
                    >
                      <Ionicons
                        name="lock-closed-outline"
                        size={18}
                        color="#6B7280"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.settingTitle}>Private</Text>
                      <Text style={styles.settingSubtitle}>
                        Content locked until user joins
                      </Text>
                    </View>
                    {isPrivate && (
                      <Ionicons
                        name="checkmark-circle"
                        size={22}
                        color="#7C3AED"
                      />
                    )}
                  </TouchableOpacity>
                </View>

                <Text style={styles.helperText}>
                  You'll be the first member and moderator.
                </Text>

                <View style={{ height: 32 }} />
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  cancelBtn: { paddingVertical: 6, paddingHorizontal: 4 },
  cancelText: { fontSize: 16, color: "#374151", fontWeight: "500" },
  postBtn: {
    backgroundColor: "#7C3AED",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 999,
  },
  postBtnDisabled: { backgroundColor: "#C4B5FD" },
  postBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },

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
    backgroundColor: "#7C3AED",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: { color: "#fff", fontWeight: "700", fontSize: 18 },
  avatarLine: {
    width: 2,
    flex: 1,
    minHeight: 20,
    backgroundColor: "#E5E7EB",
    marginTop: 8,
    borderRadius: 1,
  },

  inputCol: { flex: 1, paddingBottom: 8 },
  nameInput: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
    paddingTop: 0,
    marginBottom: 8,
  },
  descInput: {
    fontSize: 15,
    color: "#374151",
    lineHeight: 22,
    minHeight: 60,
    paddingTop: 0,
  },
  slugPreview: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 6,
    fontWeight: "500",
  },

  settingsSection: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 12,
    paddingTop: 8,
  },
  avatarColSpacer: { width: 44 },
  settingsCol: { flex: 1 },

  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7280",
    marginBottom: 10,
  },

  imagePicker: {
    width: 80,
    height: 80,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
    position: "relative",
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
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
    borderRadius: 20,
  },
  imagePlaceholderText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#7C3AED",
  },

  settingsCard: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    overflow: "hidden",
  },
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
  settingTitle: { fontSize: 14, fontWeight: "700", color: "#111827" },
  settingSubtitle: { fontSize: 12, color: "#9CA3AF", marginTop: 2 },
  divider: { height: 1, backgroundColor: "#F3F4F6", marginHorizontal: 14 },

  helperText: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 12,
    lineHeight: 16,
  },
});
