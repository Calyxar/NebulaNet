// app/create/story.tsx ✅ — with NSFW toggle
import GifPicker from "@/components/post/GifPicker";
import { useAuth } from "@/hooks/useAuth";
import { useCreateStory } from "@/hooks/useStories";
import { uploadStoryMedia } from "@/lib/queries/stories";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
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

type MediaType = "image" | "video" | "gif";
const PickerMedia: any =
  (ImagePicker as any).MediaType ?? (ImagePicker as any).MediaTypeOptions;

export default function CreateStoryScreen() {
  const { profile } = useAuth();
  const { colors, isDark } = useTheme();

  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<MediaType | null>(null);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  // ✅ NSFW toggle
  const [isNsfw, setIsNsfw] = useState(false);

  const createStoryMutation = useCreateStory();

  const avatarLetter = profile?.username?.charAt(0).toUpperCase() ?? "U";
  const canPost = useMemo(
    () => !!mediaUri && !!mediaType && !uploading,
    [mediaUri, mediaType, uploading],
  );

  const pickMedia = async (type: "image" | "video" | "both" = "both") => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Allow access to your photos/videos.");
      return;
    }
    const mediaTypes =
      type === "image"
        ? PickerMedia.Images
        : type === "video"
          ? PickerMedia.Videos
          : PickerMedia.All;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes,
      allowsEditing: false,
      quality: 1,
    });
    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (!asset?.uri) {
      Alert.alert("Error", "Could not read selected media.");
      return;
    }
    const isGif =
      asset.uri.toLowerCase().endsWith(".gif") ||
      asset.mimeType === "image/gif";
    setMediaUri(asset.uri);
    setMediaType(isGif ? "gif" : asset.type === "video" ? "video" : "image");
  };

  const handleGifSelect = (url: string) => {
    setMediaUri(url);
    setMediaType("gif");
    setShowGifPicker(false);
  };

  const handlePost = async () => {
    if (!mediaUri || !mediaType) {
      Alert.alert("Missing media", "Please select an image, GIF, or video.");
      return;
    }
    setUploading(true);
    try {
      const uploaded = await uploadStoryMedia(mediaUri, mediaType);
      await createStoryMutation.mutateAsync({
        media_url: uploaded.publicUrl,
        media_type: mediaType,
        caption: caption.trim() || undefined,
        duration: mediaType === "video" ? 15 : 5,
        is_nsfw: isNsfw,
      } as any);
      router.back();
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to post story.");
    } finally {
      setUploading(false);
    }
  };

  const mediaTypeIcon = () => (mediaType === "video" ? "videocam" : "image");
  const mediaTypeBadge = () => {
    if (mediaType === "video") return "VIDEO";
    if (mediaType === "gif") return "GIF";
    return null;
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

      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.cancelBtn}
          disabled={uploading}
        >
          <Text style={[styles.cancelText, { color: colors.text }]}>
            Cancel
          </Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          New Story
        </Text>
        <TouchableOpacity
          style={[
            styles.postBtn,
            {
              backgroundColor: canPost ? colors.primary : colors.primary + "60",
            },
          ]}
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

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
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
              {mediaUri && (
                <View
                  style={[
                    styles.avatarLine,
                    { backgroundColor: colors.border },
                  ]}
                />
              )}
            </View>
            <View style={styles.inputCol}>
              <View
                style={[
                  styles.durationPill,
                  {
                    borderColor: colors.primary + "60",
                    backgroundColor: colors.primary + "12",
                  },
                ]}
              >
                <Ionicons
                  name="time-outline"
                  size={12}
                  color={colors.primary}
                />
                <Text style={[styles.durationText, { color: colors.primary }]}>
                  Disappears in 24h
                </Text>
              </View>
              <TextInput
                style={[styles.captionInput, { color: colors.text }]}
                placeholder="Add a caption..."
                placeholderTextColor={colors.textTertiary}
                value={caption}
                onChangeText={setCaption}
                multiline
                maxLength={200}
                editable={!uploading}
              />
              {caption.length > 0 && (
                <Text
                  style={[styles.charCount, { color: colors.textTertiary }]}
                >
                  {200 - caption.length}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.mediaSection}>
            <View style={styles.avatarSpacer} />
            <View style={styles.mediaCol}>
              {mediaUri ? (
                <TouchableOpacity
                  style={[
                    styles.previewWrap,
                    { backgroundColor: colors.surface },
                  ]}
                  onPress={() => pickMedia()}
                  disabled={uploading}
                  activeOpacity={0.9}
                >
                  <Image
                    source={{ uri: mediaUri }}
                    style={styles.preview}
                    resizeMode="cover"
                  />
                  {mediaTypeBadge() && (
                    <View style={styles.typeBadge}>
                      <Ionicons
                        name={mediaTypeIcon() as any}
                        size={14}
                        color="#fff"
                      />
                      <Text style={styles.typeBadgeText}>
                        {mediaTypeBadge()}
                      </Text>
                    </View>
                  )}
                  {!uploading && (
                    <TouchableOpacity
                      style={styles.changeBtn}
                      onPress={() => pickMedia()}
                    >
                      <Ionicons name="swap-horizontal" size={14} color="#fff" />
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
                <View style={styles.pickerGrid}>
                  <TouchableOpacity
                    style={[
                      styles.pickBtn,
                      {
                        borderColor: colors.border,
                        backgroundColor: colors.surface,
                      },
                    ]}
                    onPress={() => pickMedia("image")}
                    activeOpacity={0.8}
                  >
                    <View
                      style={[
                        styles.pickBtnIcon,
                        { backgroundColor: colors.primary + "18" },
                      ]}
                    >
                      <Ionicons
                        name="image-outline"
                        size={22}
                        color={colors.primary}
                      />
                    </View>
                    <Text style={[styles.pickBtnText, { color: colors.text }]}>
                      Photo
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.pickBtn,
                      {
                        borderColor: colors.border,
                        backgroundColor: colors.surface,
                      },
                    ]}
                    onPress={() => pickMedia("video")}
                    activeOpacity={0.8}
                  >
                    <View
                      style={[
                        styles.pickBtnIcon,
                        { backgroundColor: colors.primary + "18" },
                      ]}
                    >
                      <Ionicons
                        name="videocam-outline"
                        size={22}
                        color={colors.primary}
                      />
                    </View>
                    <Text style={[styles.pickBtnText, { color: colors.text }]}>
                      Video
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.pickBtn,
                      {
                        borderColor: colors.primary + "50",
                        backgroundColor: colors.primary + "10",
                      },
                    ]}
                    onPress={() => setShowGifPicker(true)}
                    activeOpacity={0.8}
                  >
                    <View
                      style={[
                        styles.pickBtnIcon,
                        { backgroundColor: colors.primary + "18" },
                      ]}
                    >
                      <Ionicons
                        name="sparkles-outline"
                        size={22}
                        color={colors.primary}
                      />
                    </View>
                    <Text
                      style={[
                        styles.pickBtnText,
                        { color: colors.primary, fontWeight: "700" },
                      ]}
                    >
                      GIF
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* ✅ NSFW toggle */}
              <TouchableOpacity
                style={[
                  styles.nsfwRow,
                  {
                    backgroundColor: isNsfw ? "#EF4444" + "12" : colors.surface,
                    borderColor: isNsfw ? "#EF4444" + "30" : colors.border,
                  },
                ]}
                onPress={() => setIsNsfw((v) => !v)}
                disabled={uploading}
                activeOpacity={0.85}
              >
                <Ionicons
                  name={isNsfw ? "eye-off" : "eye-off-outline"}
                  size={18}
                  color={isNsfw ? "#EF4444" : colors.textTertiary}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.nsfwLabel,
                      { color: isNsfw ? "#EF4444" : colors.text },
                    ]}
                  >
                    Mark as NSFW
                  </Text>
                  <Text
                    style={[styles.nsfwSub, { color: colors.textTertiary }]}
                  >
                    {isNsfw
                      ? "Story marked as adult content"
                      : "Mark if story contains explicit content"}
                  </Text>
                </View>
                <View
                  style={[
                    styles.nsfwToggle,
                    { backgroundColor: isNsfw ? "#EF4444" : colors.border },
                  ]}
                >
                  <View
                    style={[
                      styles.nsfwToggleDot,
                      { marginLeft: isNsfw ? 22 : 2 },
                    ]}
                  />
                </View>
              </TouchableOpacity>

              <Text style={[styles.helperText, { color: colors.textTertiary }]}>
                Stories are visible to your followers for 24 hours.
              </Text>
              <View style={{ height: 32 }} />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <GifPicker
        visible={showGifPicker}
        onSelect={handleGifSelect}
        onClose={() => setShowGifPicker(false)}
      />
    </SafeAreaView>
  );

  if (!isDark) {
    return (
      <LinearGradient
        colors={["#FFFFFF", "#F8F5FF"]}
        locations={[0, 1]}
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
  cancelBtn: { paddingVertical: 6, paddingHorizontal: 4, minWidth: 60 },
  cancelText: { fontSize: 16, fontWeight: "500" },
  headerTitle: { fontSize: 16, fontWeight: "800" },
  postBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 999,
    minWidth: 72,
    alignItems: "center",
  },
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
  durationPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 10,
  },
  durationText: { fontSize: 12, fontWeight: "600" },
  captionInput: { fontSize: 17, lineHeight: 24, minHeight: 60, paddingTop: 0 },
  charCount: { fontSize: 13, fontWeight: "600", marginTop: 4 },
  mediaSection: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 12,
    paddingTop: 8,
  },
  avatarSpacer: { width: 44 },
  mediaCol: { flex: 1 },
  pickerGrid: { flexDirection: "row", gap: 10, marginBottom: 12 },
  pickBtn: {
    flex: 1,
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: "center",
    gap: 8,
  },
  pickBtnIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  pickBtnText: { fontSize: 13, fontWeight: "600" },
  previewWrap: {
    width: "100%",
    height: 320,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 12,
    position: "relative",
  },
  preview: { width: "100%", height: "100%" },
  typeBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  typeBadgeText: { color: "#fff", fontSize: 12, fontWeight: "800" },
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
  nsfwRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    marginTop: 4,
  },
  nsfwLabel: { fontSize: 14, fontWeight: "700" },
  nsfwSub: { fontSize: 12, marginTop: 2 },
  nsfwToggle: {
    width: 46,
    height: 26,
    borderRadius: 13,
    justifyContent: "center",
  },
  nsfwToggleDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#fff",
  },
  helperText: { fontSize: 12, lineHeight: 16, marginTop: 4 },
});
