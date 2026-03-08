// app/profile/edit.tsx — COMPLETED + UPDATED ✅
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import {
  getDownloadURL,
  getStorage,
  ref as storageRef,
  uploadString,
} from "firebase/storage";
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

function guessExtFromUri(uri: string) {
  const clean = uri.split("?")[0];
  const ext = clean.split(".").pop()?.toLowerCase();
  if (!ext || ext.length > 5) return "jpg";
  if (ext === "jpeg") return "jpg";
  if (ext === "png" || ext === "jpg" || ext === "webp" || ext === "heic")
    return ext;
  return "jpg";
}

export default function EditProfileScreen() {
  const { profile, user, updateProfile: updateProfileMutation } = useAuth();
  const { colors, isDark } = useTheme();

  const [formData, setFormData] = useState({
    full_name: profile?.full_name || "",
    username: profile?.username || "",
    bio: profile?.bio || "",
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

    setAvatar(pickedUri);
    await uploadAvatar(pickedUri);
  };

  const uploadAvatar = async (uri: string) => {
    // ✅ FIX: use user?.uid not user?.id
    if (!user?.uid) {
      Alert.alert("Error", "User not found. Please log in again.");
      return;
    }

    setIsUploadingAvatar(true);

    try {
      const ext = guessExtFromUri(uri);

      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: "base64" as any,
      });

      const fileName = `${Date.now()}.${ext}`;
      // ✅ FIX: use user.uid not user.id
      const filePath = `${user.uid}/${fileName}`;

      const storage = getStorage();
      const fileRef = storageRef(storage, filePath);
      await uploadString(fileRef, base64, "base64");
      const publicUrl = await getDownloadURL(fileRef);

      if (!publicUrl)
        throw new Error("Could not create download URL for avatar.");

      setAvatar(publicUrl);
      Alert.alert(
        "Success",
        "Avatar uploaded! Click Continue to save your changes.",
      );
    } catch (e: any) {
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
      const canSendLocation = profile && "location" in (profile as any);

      const updates: any = {
        full_name: formData.full_name,
        username: formData.username.toLowerCase(),
        bio: formData.bio,
        ...(avatar !== profile?.avatar_url && { avatar_url: avatar }),
        ...(canSendLocation && { location: formData.location }),
      };

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
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />

      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.background }]}>
          <TouchableOpacity
            style={[
              styles.headerBtn,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                shadowOpacity: isDark ? 0.22 : 0.08,
              },
            ]}
            onPress={() => router.back()}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>

          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Edit Profile
          </Text>

          <TouchableOpacity
            style={[
              styles.headerBtn,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                shadowOpacity: isDark ? 0.22 : 0.08,
              },
            ]}
            onPress={handleSave}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            <Ionicons
              name="checkmark"
              size={22}
              color={isLoading ? colors.textTertiary : colors.primary}
            />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Avatar */}
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={pickImage}
            disabled={isLoading}
            activeOpacity={0.9}
          >
            {avatar ? (
              <Image source={{ uri: displayAvatar }} style={styles.avatar} />
            ) : (
              <View
                style={[
                  styles.avatarPlaceholder,
                  { backgroundColor: colors.surface },
                ]}
              >
                <Ionicons name="person" size={48} color={colors.textTertiary} />
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
              <View
                style={[
                  styles.cameraBadge,
                  {
                    backgroundColor: colors.primary,
                    borderColor: colors.background,
                  },
                ]}
              >
                <Ionicons name="camera" size={20} color="#fff" />
              </View>
            )}
          </TouchableOpacity>

          {/* Form */}
          <View style={[styles.formCard, { backgroundColor: colors.card }]}>
            {/* Name */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Name</Text>
              <View
                style={[
                  styles.inputWrapper,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Ionicons
                  name="person-outline"
                  size={20}
                  color={colors.textTertiary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  value={formData.full_name}
                  onChangeText={(text) =>
                    setFormData({ ...formData, full_name: text })
                  }
                  placeholder="Enter your full name"
                  placeholderTextColor={colors.placeholder}
                  editable={!isLoading}
                />
              </View>
            </View>

            {/* Username */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>
                Username
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Ionicons
                  name="at"
                  size={20}
                  color={colors.textTertiary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  value={formData.username}
                  onChangeText={(text) =>
                    setFormData({
                      ...formData,
                      username: text.toLowerCase(),
                    })
                  }
                  placeholder="username"
                  placeholderTextColor={colors.placeholder}
                  autoCapitalize="none"
                  editable={!isLoading}
                />
              </View>
            </View>

            {/* Location */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>
                Location
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Ionicons
                  name="location-outline"
                  size={20}
                  color={colors.textTertiary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  value={formData.location}
                  onChangeText={(text) =>
                    setFormData({ ...formData, location: text })
                  }
                  placeholder="Let others know where you're based"
                  placeholderTextColor={colors.placeholder}
                  editable={!isLoading}
                />
              </View>
            </View>

            {/* Bio */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Bio</Text>
              <View
                style={[
                  styles.inputWrapper,
                  styles.bioWrapper,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Ionicons
                  name="information-circle-outline"
                  size={20}
                  color={colors.textTertiary}
                  style={styles.bioIcon}
                />
                <TextInput
                  style={[
                    styles.input,
                    styles.bioInput,
                    { color: colors.text },
                  ]}
                  value={formData.bio}
                  onChangeText={(text) =>
                    setFormData({ ...formData, bio: text })
                  }
                  placeholder="Tell us about yourself"
                  placeholderTextColor={colors.placeholder}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  maxLength={200}
                  editable={!isLoading}
                />
              </View>
              <Text style={[styles.charCount, { color: colors.textTertiary }]}>
                {formData.bio.length}/200 characters
              </Text>
            </View>
          </View>

          {/* Save button */}
          <TouchableOpacity
            style={[
              styles.continueButton,
              { backgroundColor: colors.primary },
              isLoading && { opacity: 0.55 },
            ]}
            onPress={handleSave}
            disabled={isLoading}
            activeOpacity={0.9}
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
  container: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 3,
  },
  headerTitle: { fontSize: 18, fontWeight: "800" },

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
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
  },

  formCard: {
    borderRadius: 16,
    padding: 20,
    gap: 20,
    marginBottom: 24,
  },
  inputGroup: { gap: 8 },
  label: { fontSize: 14, fontWeight: "800" },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  bioWrapper: { alignItems: "flex-start", paddingVertical: 12 },
  inputIcon: { marginRight: 8 },
  bioIcon: { marginRight: 8, marginTop: 2 },
  input: { flex: 1, fontSize: 15, paddingVertical: 12 },
  bioInput: { minHeight: 80, paddingVertical: 0 },
  charCount: { fontSize: 12, alignSelf: "flex-end" },

  continueButton: {
    paddingVertical: 18,
    borderRadius: 28,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 5,
  },
  continueButtonText: { color: "#FFFFFF", fontSize: 17, fontWeight: "800" },
});
