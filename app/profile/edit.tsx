// app/profile/edit.tsx
// ✅ Fixed avatar upload (no fetch(file://) blob), consistent bucket, safe profile update payload

import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { decode as base64Decode } from "base-64";
import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function base64ToUint8Array(base64: string) {
  const binary = base64Decode(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function guessExtFromUri(uri: string) {
  const clean = uri.split("?")[0];
  const ext = clean.split(".").pop()?.toLowerCase();
  if (!ext || ext.length > 5) return "jpg";
  if (ext === "jpeg") return "jpg";
  if (ext === "png" || ext === "jpg" || ext === "webp" || ext === "heic")
    return ext;
  return "jpg";
}

function contentTypeFromExt(ext: string) {
  switch (ext) {
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "heic":
      return "image/heic";
    case "jpg":
    default:
      return "image/jpeg";
  }
}

export default function EditProfileScreen() {
  const { profile, user, updateProfile: updateProfileMutation } = useAuth();

  const [formData, setFormData] = useState({
    full_name: profile?.full_name || "",
    username: profile?.username || "",
    bio: profile?.bio || "",
    // ✅ keep in UI, but we will only send it if column exists
    location: (profile as any)?.location || "",
  });

  const [avatar, setAvatar] = useState(profile?.avatar_url || "");
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || "",
        username: profile.username || "",
        bio: profile.bio || "",
        location: (profile as any)?.location || "",
      });
      setAvatar(profile.avatar_url || "");
    }
  }, [profile]);

  const displayAvatar = useMemo(() => {
    if (!avatar) return "";
    const join = avatar.includes("?") ? "&" : "?";
    return `${avatar}${join}t=${Date.now()}`;
  }, [avatar]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== "granted") {
      Alert.alert(
        "Permission required",
        "We need camera roll permissions to upload photos.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (result.canceled) return;

    const pickedUri = result.assets?.[0]?.uri;
    if (!pickedUri) {
      Alert.alert("Error", "Could not read selected image.");
      return;
    }

    // local preview instantly
    setAvatar(pickedUri);

    await uploadAvatar(pickedUri);
  };

  const uploadAvatar = async (uri: string) => {
    if (!user?.id) {
      Alert.alert("Error", "User not found. Please log in again.");
      return;
    }

    setIsUploadingAvatar(true);

    try {
      console.log("Starting avatar upload...");

      const ext = guessExtFromUri(uri);
      const contentType = contentTypeFromExt(ext);

      // ✅ Read as base64 -> bytes (reliable on Android/iOS)
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: "base64" as any,
      });

      const bytes = base64ToUint8Array(base64);

      const fileName = `${Date.now()}.${ext}`;
      const filePath = `${user.id}/${fileName}`;

      console.log("Uploading to:", filePath);

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, bytes, {
          contentType,
          upsert: true,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw uploadError;
      }

      // ✅ Prefer public URL (simplest)
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const publicUrl = urlData?.publicUrl;

      if (!publicUrl) {
        throw new Error("Could not create public URL for avatar.");
      }

      setAvatar(publicUrl);

      Alert.alert(
        "Success",
        "Avatar uploaded! Click Continue to save your changes.",
      );
    } catch (e: any) {
      console.error("Avatar upload error:", e);

      Alert.alert(
        "Upload Failed",
        e?.message || "Failed to upload avatar. Please try again.",
      );

      setAvatar(profile?.avatar_url || "");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    if (!formData.username.trim()) {
      Alert.alert("Validation Error", "Username is required");
      return;
    }

    if (formData.username.length < 3) {
      Alert.alert("Validation Error", "Username must be at least 3 characters");
      return;
    }

    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(formData.username)) {
      Alert.alert(
        "Validation Error",
        "Username can only contain letters, numbers, and underscores",
      );
      return;
    }

    try {
      // ✅ Only include location if your profile object actually has it
      const canSendLocation = profile && "location" in (profile as any);

      const updates: any = {
        full_name: formData.full_name,
        username: formData.username.toLowerCase(),
        bio: formData.bio,
        ...(avatar !== profile?.avatar_url && { avatar_url: avatar }),
        ...(canSendLocation && { location: formData.location }),
      };

      // Convert empty strings -> null to avoid junk data
      for (const k of Object.keys(updates)) {
        if (updates[k] === "") updates[k] = null;
      }

      await updateProfileMutation.mutateAsync(updates);

      Alert.alert("Success", "Profile updated successfully!");
      setTimeout(() => router.back(), 300);
    } catch (error: any) {
      let errorMessage = "Failed to update profile";

      if (
        error?.message?.includes("duplicate") &&
        error?.message?.includes("username")
      ) {
        errorMessage = "This username is already taken";
      } else if (error?.message) {
        errorMessage = error.message;
      }

      Alert.alert("Update Failed", errorMessage);
    }
  };

  const isLoading = isUploadingAvatar || updateProfileMutation.isPending;

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#E8EAF6" />
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            disabled={isLoading}
          >
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Edit Profile</Text>

          <TouchableOpacity
            style={styles.menuButton}
            onPress={handleSave}
            disabled={isLoading}
          >
            <Ionicons
              name="checkmark"
              size={24}
              color={isLoading ? "#9FA8DA" : "#7C3AED"}
            />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={pickImage}
            disabled={isLoading}
          >
            {avatar ? (
              <Image source={{ uri: displayAvatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={48} color="#9FA8DA" />
              </View>
            )}

            {isLoading && (
              <View style={styles.avatarOverlay}>
                <Text style={styles.avatarOverlayText}>
                  {isUploadingAvatar ? "Uploading…" : "Saving…"}
                </Text>
              </View>
            )}

            {!isLoading && (
              <View style={styles.cameraBadge}>
                <Ionicons name="camera" size={20} color="#fff" />
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.formCard}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Name</Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="person-outline"
                  size={20}
                  color="#9FA8DA"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  value={formData.full_name}
                  onChangeText={(text) =>
                    setFormData({ ...formData, full_name: text })
                  }
                  placeholder="Enter your full name"
                  placeholderTextColor="#C5CAE9"
                  editable={!isLoading}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Username</Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="at"
                  size={20}
                  color="#9FA8DA"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  value={formData.username}
                  onChangeText={(text) =>
                    setFormData({ ...formData, username: text.toLowerCase() })
                  }
                  placeholder="username"
                  placeholderTextColor="#C5CAE9"
                  autoCapitalize="none"
                  editable={!isLoading}
                />
              </View>
            </View>

            {/* Location stays in UI; only sent if column exists */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Location</Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="location-outline"
                  size={20}
                  color="#9FA8DA"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  value={formData.location}
                  onChangeText={(text) =>
                    setFormData({ ...formData, location: text })
                  }
                  placeholder="Let others know where you're based"
                  placeholderTextColor="#C5CAE9"
                  editable={!isLoading}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Bio</Text>
              <View style={[styles.inputWrapper, styles.bioWrapper]}>
                <Ionicons
                  name="information-circle-outline"
                  size={20}
                  color="#9FA8DA"
                  style={styles.bioIcon}
                />
                <TextInput
                  style={[styles.input, styles.bioInput]}
                  value={formData.bio}
                  onChangeText={(text) =>
                    setFormData({ ...formData, bio: text })
                  }
                  placeholder="Tell us about yourself"
                  placeholderTextColor="#C5CAE9"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  maxLength={200}
                  editable={!isLoading}
                />
              </View>
              <Text style={styles.charCount}>
                {formData.bio.length}/200 characters
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.continueButton,
              isLoading && styles.continueButtonDisabled,
            ]}
            onPress={handleSave}
            disabled={isLoading}
          >
            <Text style={styles.continueButtonText}>
              {isLoading ? "Saving..." : "Continue"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#E8EAF6" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#E8EAF6",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "600", color: "#000" },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },

  avatarContainer: {
    alignSelf: "center",
    marginVertical: 24,
    position: "relative",
  },
  avatar: { width: 120, height: 120, borderRadius: 60 },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#D1D5F0",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarOverlay: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarOverlayText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  cameraBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#7C3AED",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#E8EAF6",
  },

  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    gap: 20,
    marginBottom: 24,
  },
  inputGroup: { gap: 8 },
  label: { fontSize: 14, fontWeight: "600", color: "#000" },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F8F8",
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  bioWrapper: { alignItems: "flex-start", paddingVertical: 12 },
  inputIcon: { marginRight: 8 },
  bioIcon: { marginRight: 8, marginTop: 2 },
  input: { flex: 1, fontSize: 15, color: "#000", paddingVertical: 12 },
  bioInput: { minHeight: 80, paddingVertical: 0 },
  charCount: { fontSize: 12, color: "#9FA8DA", alignSelf: "flex-end" },

  continueButton: {
    backgroundColor: "#7C3AED",
    paddingVertical: 18,
    borderRadius: 28,
    alignItems: "center",
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  continueButtonDisabled: {
    backgroundColor: "#C5CAE9",
    shadowOpacity: 0.1,
  },
  continueButtonText: { color: "#FFFFFF", fontSize: 17, fontWeight: "600" },
});
