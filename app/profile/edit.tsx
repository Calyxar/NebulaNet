// app/profile/edit.tsx
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useMemo, useState } from "react";
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
  // handles file://.../something.jpg or .../something.jpg?param=1
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
  const { profile, updateProfile } = useAuth();

  const [formData, setFormData] = useState({
    full_name: profile?.full_name || "",
    username: profile?.username || "",
    bio: profile?.bio || "",
    location: profile?.location || "",
  });

  // store whatever we can display (public url / signed url / local uri)
  const [avatar, setAvatar] = useState(profile?.avatar_url || "");
  const [isLoading, setIsLoading] = useState(false);

  // cache bust avatar when it changes so RN Image stops showing the old cached one
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

    // show instantly (local preview) while upload happens
    setAvatar(pickedUri);
    await uploadAvatar(pickedUri);
  };

  const uploadAvatar = async (uri: string) => {
    if (!profile?.id) return;

    setIsLoading(true);
    try {
      // convert local file uri -> blob (works in Expo)
      const res = await fetch(uri);
      const blob = await res.blob();

      const ext = guessExtFromUri(uri);
      const contentType = contentTypeFromExt(ext);

      // ✅ IMPORTANT: keep bucket name "avatars" but DON'T include "avatars/" in path
      // Put avatars under a user folder:
      const fileName = `${Date.now()}.${ext}`;
      const filePath = `${profile.id}/${fileName}`; // storage key inside the bucket

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, blob, {
          contentType,
          upsert: true, // ✅ prevents "already exists" failures
        });

      if (uploadError) throw uploadError;

      // Try public URL (works if bucket is public)
      const pub = supabase.storage.from("avatars").getPublicUrl(filePath);
      const publicUrl = pub?.data?.publicUrl;

      let displayUrl = publicUrl;

      // If bucket is private, public URL won't actually load.
      // So generate a signed url for UI.
      if (!displayUrl) {
        const { data: signed, error: signedErr } = await supabase.storage
          .from("avatars")
          .createSignedUrl(filePath, 60 * 60); // 1 hour

        if (signedErr) throw signedErr;
        displayUrl = signed?.signedUrl ?? "";
      }

      // Save avatar_url to profile:
      // ✅ Prefer public URL if available; otherwise store storage key (filePath)
      // This gives you a stable value even if signed urls expire.
      await updateProfile.mutateAsync({
        avatar_url: publicUrl || filePath,
      });

      // show the displayable version right now
      setAvatar(displayUrl || publicUrl || filePath);

      Alert.alert("Success", "Avatar updated!");
    } catch (e: any) {
      console.log("Avatar upload error:", e);
      Alert.alert(
        "Error",
        e?.message || "Failed to upload image. Check bucket/RLS.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.username.trim()) {
      Alert.alert("Error", "Username is required");
      return;
    }

    try {
      await updateProfile.mutateAsync(formData);
      Alert.alert("Success", "Profile updated successfully");
      router.back();
    } catch (error: any) {
      Alert.alert("Error", error.message);
    }
  };

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#E8EAF6" />
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Edit Profile</Text>

          <TouchableOpacity style={styles.menuButton}>
            <Ionicons name="ellipsis-horizontal" size={24} color="#000" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Avatar Upload */}
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={pickImage}
            disabled={isLoading || updateProfile.isPending}
          >
            {avatar ? (
              <Image source={{ uri: displayAvatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={48} color="#9FA8DA" />
              </View>
            )}

            {(isLoading || updateProfile.isPending) && (
              <View style={styles.avatarOverlay}>
                <Text style={styles.avatarOverlayText}>Uploading…</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Form Card */}
          <View style={styles.formCard}>
            {/* Name */}
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
                />
              </View>
            </View>

            {/* Username */}
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
                    setFormData({ ...formData, username: text })
                  }
                  placeholder="@username"
                  placeholderTextColor="#C5CAE9"
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Location */}
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
                />
              </View>
            </View>

            {/* Bio */}
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
                />
              </View>
              <Text style={styles.charCount}>
                {formData.bio.length}/200 characters
              </Text>
            </View>
          </View>

          {/* Continue Button */}
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleSave}
            disabled={isLoading || updateProfile.isPending}
          >
            <Text style={styles.continueButtonText}>
              {isLoading || updateProfile.isPending ? "Saving..." : "Continue"}
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

  avatarContainer: { alignSelf: "center", marginVertical: 24 },
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
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarOverlayText: { color: "#fff", fontWeight: "800" },

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
  continueButtonText: { color: "#FFFFFF", fontSize: 17, fontWeight: "600" },
});
