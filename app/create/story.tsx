// app/create/story.tsx — REDESIGNED ✅ matches Twitter-style composer
import { useAuth } from "@/hooks/useAuth";
import { createStory, uploadStoryMedia } from "@/lib/queries/stories";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
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

type MediaType = "image" | "video";

const PickerMedia: any =
  (ImagePicker as any).MediaType ?? (ImagePicker as any).MediaTypeOptions;

export default function CreateStoryScreen() {
  const { profile } = useAuth();

  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<MediaType | null>(null);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);

  const avatarLetter = profile?.username?.charAt(0).toUpperCase() ?? "U";
  const canPost = useMemo(
    () => !!mediaUri && !!mediaType && !uploading,
    [mediaUri, mediaType, uploading],
  );

  const pickMedia = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Allow access to your photos/videos.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: PickerMedia.All,
      allowsEditing: false,
      quality: 1,
    });

    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (!asset?.uri) {
      Alert.alert("Error", "Could not read selected media.");
      return;
    }

    setMediaUri(asset.uri);
    setMediaType(asset.type === "video" ? "video" : "image");
  };

  const handlePost = async () => {
    if (!mediaUri || !mediaType) {
      Alert.alert("Missing media", "Please select an image or video.");
      return;
    }

    setUploading(true);
    try {
      const uploaded = await uploadStoryMedia(mediaUri, mediaType);

      await createStory({
        media_url: uploaded.publicUrl,
        media_type: mediaType,
        caption: caption.trim() || null,
        expires_in_hours: 24,
      });

      router.back();
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to post story.");
    } finally {
      setUploading(false);
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
              disabled={uploading}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.postBtn, !canPost && styles.postBtnDisabled]}
              onPress={handlePost}
              disabled={!canPost}
            >
              {uploading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.postBtnText}>Share</Text>
              )}
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
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarLetter}>{avatarLetter}</Text>
                  </View>
                )}
                {mediaUri && <View style={styles.avatarLine} />}
              </View>

              <View style={styles.inputCol}>
                {/* Duration pill */}
                <View style={styles.durationPill}>
                  <Ionicons name="time-outline" size={12} color="#7C3AED" />
                  <Text style={styles.durationText}>Disappears in 24h</Text>
                </View>

                <TextInput
                  style={styles.captionInput}
                  placeholder="Add a caption..."
                  placeholderTextColor="#9CA3AF"
                  value={caption}
                  onChangeText={setCaption}
                  multiline
                  maxLength={200}
                  editable={!uploading}
                />

                {caption.length > 0 && (
                  <Text style={styles.charCount}>{200 - caption.length}</Text>
                )}
              </View>
            </View>

            {/* Media section */}
            <View style={styles.mediaSection}>
              <View style={styles.avatarColSpacer} />
              <View style={styles.mediaCol}>
                {mediaUri ? (
                  /* Preview */
                  <TouchableOpacity
                    style={styles.previewWrap}
                    onPress={pickMedia}
                    disabled={uploading}
                    activeOpacity={0.9}
                  >
                    <Image
                      source={{ uri: mediaUri }}
                      style={styles.preview}
                      resizeMode="cover"
                    />

                    {mediaType === "video" && (
                      <View style={styles.videoBadge}>
                        <Ionicons name="play-circle" size={36} color="#fff" />
                      </View>
                    )}

                    {!uploading && (
                      <TouchableOpacity
                        style={styles.changeBtn}
                        onPress={pickMedia}
                      >
                        <Ionicons
                          name="swap-horizontal"
                          size={14}
                          color="#fff"
                        />
                        <Text style={styles.changeBtnText}>Change</Text>
                      </TouchableOpacity>
                    )}

                    {uploading && (
                      <View style={styles.uploadingOverlay}>
                        <ActivityIndicator color="#fff" size="large" />
                        <Text style={styles.uploadingText}>Uploading...</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ) : (
                  /* Picker */
                  <View style={styles.pickerRow}>
                    <TouchableOpacity
                      style={styles.pickBtn}
                      onPress={pickMedia}
                      activeOpacity={0.8}
                    >
                      <View style={styles.pickBtnIcon}>
                        <Ionicons
                          name="image-outline"
                          size={22}
                          color="#7C3AED"
                        />
                      </View>
                      <Text style={styles.pickBtnText}>Photo</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.pickBtn}
                      onPress={pickMedia}
                      activeOpacity={0.8}
                    >
                      <View style={styles.pickBtnIcon}>
                        <Ionicons
                          name="videocam-outline"
                          size={22}
                          color="#7C3AED"
                        />
                      </View>
                      <Text style={styles.pickBtnText}>Video</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <Text style={styles.helperText}>
                  Stories are visible to your followers for 24 hours.
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
    minWidth: 72,
    alignItems: "center",
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
  durationPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#7C3AED",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 10,
  },
  durationText: { fontSize: 12, fontWeight: "600", color: "#7C3AED" },
  captionInput: {
    fontSize: 17,
    color: "#111827",
    lineHeight: 24,
    minHeight: 60,
    paddingTop: 0,
  },
  charCount: {
    fontSize: 13,
    color: "#9CA3AF",
    fontWeight: "600",
    marginTop: 4,
  },

  mediaSection: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 12,
    paddingTop: 8,
  },
  avatarColSpacer: { width: 44 },
  mediaCol: { flex: 1 },

  pickerRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  pickBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FAFAFA",
  },
  pickBtnIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#EDE9FE",
    alignItems: "center",
    justifyContent: "center",
  },
  pickBtnText: { fontSize: 13, fontWeight: "600", color: "#374151" },

  previewWrap: {
    width: "100%",
    height: 320,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
    marginBottom: 12,
    position: "relative",
  },
  preview: { width: "100%", height: "100%" },
  videoBadge: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  changeBtn: {
    position: "absolute",
    bottom: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  changeBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  uploadingText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  helperText: {
    fontSize: 12,
    color: "#9CA3AF",
    lineHeight: 16,
    marginTop: 4,
  },
});
