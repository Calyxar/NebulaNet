// app/create/post.tsx — REDESIGNED ✅ matches mockup + dark mode + media upload fix
import { useAuth } from "@/hooks/useAuth";
import { extractHashtags } from "@/lib/firestore/hashtags";
import { createPost } from "@/lib/firestore/posts";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
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

type MediaType = "image" | "video" | "gif";
type Visibility = "public" | "followers" | "private";

interface LocalMediaItem {
  uri: string;
  type: MediaType;
}

const PickerMedia: any =
  (ImagePicker as any).MediaType ?? (ImagePicker as any).MediaTypeOptions;

export default function CreatePostScreen() {
  const { user, profile } = useAuth();
  const { colors, isDark } = useTheme();
  const inputRef = useRef<TextInput>(null);

  const [title, setTitle] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [mediaItems, setMediaItems] = useState<LocalMediaItem[]>([]);
  const [isPosting, setIsPosting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");

  const canPost = useMemo(
    () =>
      (title.trim().length > 0 ||
        bodyText.trim().length > 0 ||
        mediaItems.length > 0) &&
      !isPosting,
    [title, bodyText, mediaItems, isPosting],
  );

  const detectedHashtags = useMemo(() => extractHashtags(bodyText), [bodyText]);
  const charCount = bodyText.length;
  const charLimit = 500;
  const isOverLimit = charCount > charLimit;

  const ensureLibraryPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission required",
        "We need photo library access to attach media.",
      );
      return false;
    }
    return true;
  };

  const pickImages = async () => {
    if (!(await ensureLibraryPermission())) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: PickerMedia.Images,
      allowsMultipleSelection: true,
      selectionLimit: 4,
      quality: 0.9,
    });
    if (result.canceled || !result.assets?.length) return;
    const picked: LocalMediaItem[] = result.assets.map((a) => ({
      uri: a.uri,
      type: "image" as const,
    }));
    setMediaItems((prev) => [...prev, ...picked].slice(0, 4));
  };

  const pickVideos = async () => {
    if (!(await ensureLibraryPermission())) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: PickerMedia.Videos,
      selectionLimit: 1,
      quality: 1,
      videoMaxDuration: 60,
    });
    if (result.canceled || !result.assets?.length) return;
    setMediaItems([{ uri: result.assets[0].uri, type: "video" as const }]);
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "We need camera access.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: PickerMedia.Images,
      quality: 0.9,
    });
    if (result.canceled || !result.assets?.length) return;
    setMediaItems((prev) =>
      [...prev, { uri: result.assets[0].uri, type: "image" as const }].slice(
        0,
        4,
      ),
    );
  };

  const removeMedia = (index: number) =>
    setMediaItems((prev) => prev.filter((_, i) => i !== index));

  const handlePost = async () => {
    if (!canPost || isOverLimit) return;
    if (!user?.uid) {
      Alert.alert("Not logged in", "Please log in again.");
      return;
    }

    setIsPosting(true);
    try {
      if (mediaItems.length > 0) {
        setUploadProgress(
          `Uploading ${mediaItems.length} file${mediaItems.length > 1 ? "s" : ""}...`,
        );
      }

      // ✅ FIX: pass media as MediaItem[] — createPost handles upload via uploadMediaForPost
      await createPost({
        title: title.trim() || undefined,
        content: bodyText.trim(),
        media: mediaItems.map((m, i) => ({
          id: `${Date.now()}_${i}`,
          uri: m.uri,
          type: m.type,
        })) as any,
        visibility,
      });

      router.back();
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to create post.");
    } finally {
      setIsPosting(false);
      setUploadProgress("");
    }
  };

  const avatarLetter = profile?.username?.charAt(0).toUpperCase() ?? "U";

  return (
    <>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {/* Header */}
          <View style={[styles.header, { backgroundColor: colors.background }]}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backBtn}
            >
              <Ionicons name="arrow-back" size={22} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              Create Post
            </Text>
            <View style={{ width: 36 }} />
          </View>

          <ScrollView
            style={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Main composer card */}
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              {/* Title input */}
              <TextInput
                style={[styles.titleInput, { color: colors.text }]}
                placeholder="Title"
                placeholderTextColor={colors.placeholder}
                value={title}
                onChangeText={setTitle}
                returnKeyType="next"
                onSubmitEditing={() => inputRef.current?.focus()}
              />

              {/* Body input */}
              <TextInput
                ref={inputRef}
                style={[styles.bodyInput, { color: colors.text }]}
                placeholder="Body Text (Optional)"
                placeholderTextColor={colors.placeholder}
                value={bodyText}
                onChangeText={setBodyText}
                multiline
                maxLength={charLimit + 50}
              />

              {/* Hashtag chips */}
              {detectedHashtags.length > 0 && (
                <View style={styles.hashtagRow}>
                  {detectedHashtags.map((tag) => (
                    <View
                      key={tag}
                      style={[
                        styles.hashtagChip,
                        { backgroundColor: colors.primary + "18" },
                      ]}
                    >
                      <Text
                        style={[
                          styles.hashtagChipText,
                          { color: colors.primary },
                        ]}
                      >
                        #{tag}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Media preview */}
              {mediaItems.length > 0 && (
                <View style={styles.mediaGrid}>
                  {mediaItems.map((m, idx) => (
                    <View
                      key={`${m.uri}-${idx}`}
                      style={[
                        styles.mediaThumb,
                        mediaItems.length === 1 && styles.mediaThumbFull,
                      ]}
                    >
                      <Image
                        source={{ uri: m.uri }}
                        style={styles.mediaImage}
                      />
                      {m.type === "video" && (
                        <View style={styles.videoBadge}>
                          <Ionicons name="play-circle" size={28} color="#fff" />
                        </View>
                      )}
                      <TouchableOpacity
                        style={styles.removeBtn}
                        onPress={() => removeMedia(idx)}
                      >
                        <Ionicons name="close-circle" size={22} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {/* Toolbar row */}
              <View style={[styles.toolbar, { borderTopColor: colors.border }]}>
                <View style={styles.toolbarLeft}>
                  <TouchableOpacity style={styles.toolBtn} onPress={pickImages}>
                    <Ionicons
                      name="happy-outline"
                      size={22}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.toolBtn} onPress={takePhoto}>
                    <Ionicons
                      name="camera-outline"
                      size={22}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.toolBtn} onPress={pickVideos}>
                    <Ionicons
                      name="musical-notes-outline"
                      size={22}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.toolBtn} onPress={pickImages}>
                    <Ionicons
                      name="image-outline"
                      size={22}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={[styles.communityPill, { borderColor: colors.border }]}
                  onPress={() =>
                    Alert.alert(
                      "Communities",
                      "Community selection coming soon.",
                    )
                  }
                >
                  <Text
                    style={[
                      styles.communityPillText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Community
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Options */}
            <View
              style={[styles.optionsCard, { backgroundColor: colors.card }]}
            >
              {/* Add Location */}
              <TouchableOpacity
                style={[styles.optionRow, { borderBottomColor: colors.border }]}
                onPress={() =>
                  Alert.alert("Location", "Location feature coming soon.")
                }
              >
                <View
                  style={[
                    styles.optionIcon,
                    { backgroundColor: colors.primary + "18" },
                  ]}
                >
                  <Ionicons
                    name="location-outline"
                    size={18}
                    color={colors.primary}
                  />
                </View>
                <Text style={[styles.optionLabel, { color: colors.text }]}>
                  Add Location
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.textTertiary}
                />
              </TouchableOpacity>

              {/* Share Post to Public */}
              <TouchableOpacity
                style={[styles.optionRow, { borderBottomColor: colors.border }]}
                onPress={() =>
                  setVisibility((v) =>
                    v === "public"
                      ? "followers"
                      : v === "followers"
                        ? "private"
                        : "public",
                  )
                }
              >
                <View
                  style={[
                    styles.optionIcon,
                    { backgroundColor: colors.primary + "18" },
                  ]}
                >
                  <Ionicons
                    name="lock-open-outline"
                    size={18}
                    color={colors.primary}
                  />
                </View>
                <Text style={[styles.optionLabel, { color: colors.text }]}>
                  {visibility === "public"
                    ? "Share Post to Public"
                    : visibility === "followers"
                      ? "Share with Followers"
                      : "Only Me"}
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.textTertiary}
                />
              </TouchableOpacity>

              {/* Boost Post */}
              <TouchableOpacity
                style={styles.optionRow}
                onPress={() =>
                  Alert.alert(
                    "Boost",
                    "Finish writing your post first, then boost after publishing.",
                  )
                }
              >
                <View
                  style={[
                    styles.optionIcon,
                    { backgroundColor: colors.primary + "18" },
                  ]}
                >
                  <Ionicons
                    name="rocket-outline"
                    size={18}
                    color={colors.primary}
                  />
                </View>
                <Text style={[styles.optionLabel, { color: colors.text }]}>
                  Boost Post
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.textTertiary}
                />
              </TouchableOpacity>
            </View>

            {/* Upload progress */}
            {uploadProgress !== "" && (
              <Text
                style={[styles.uploadProgress, { color: colors.textSecondary }]}
              >
                {uploadProgress}
              </Text>
            )}

            <View style={{ height: 120 }} />
          </ScrollView>

          {/* Bottom buttons */}
          <View
            style={[
              styles.bottomBar,
              {
                backgroundColor: colors.background,
                borderTopColor: colors.border,
              },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.draftBtn,
                { borderColor: colors.border, backgroundColor: colors.card },
              ]}
              onPress={() =>
                Alert.alert("Drafts", "Save as draft coming soon.")
              }
              disabled={isPosting}
            >
              <Text style={[styles.draftBtnText, { color: colors.text }]}>
                Save as Draft
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.postBtn,
                (!canPost || isOverLimit) && styles.postBtnDisabled,
              ]}
              onPress={handlePost}
              disabled={!canPost || isOverLimit || isPosting}
            >
              <Text style={styles.postBtnText}>
                {isPosting ? "Posting..." : "Post"}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
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
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "700" },

  scroll: { flex: 1, paddingHorizontal: 16 },

  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    marginTop: 8,
  },

  titleInput: {
    fontSize: 18,
    fontWeight: "700",
    paddingVertical: 8,
    marginBottom: 4,
  },

  bodyInput: {
    fontSize: 15,
    lineHeight: 22,
    minHeight: 100,
    paddingTop: 4,
  },

  hashtagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  hashtagChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  hashtagChipText: { fontSize: 12, fontWeight: "700" },

  mediaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 12,
  },
  mediaThumb: {
    width: "48%",
    height: 120,
    borderRadius: 10,
    overflow: "hidden",
    position: "relative",
  },
  mediaThumbFull: {
    width: "100%",
    height: 200,
  },
  mediaImage: { width: "100%", height: "100%" },
  videoBadge: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  removeBtn: { position: "absolute", top: 6, right: 6 },

  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  toolbarLeft: { flexDirection: "row", gap: 4 },
  toolBtn: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  communityPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  communityPillText: { fontSize: 13, fontWeight: "500" },

  optionsCard: {
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 12,
    overflow: "hidden",
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 1,
  },
  optionIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  optionLabel: { flex: 1, fontSize: 15, fontWeight: "500" },

  uploadProgress: {
    textAlign: "center",
    fontSize: 13,
    marginBottom: 8,
    fontWeight: "500",
  },

  bottomBar: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
  },
  draftBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  draftBtnText: { fontSize: 15, fontWeight: "700" },
  postBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#7C3AED",
  },
  postBtnDisabled: { opacity: 0.5 },
  postBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
