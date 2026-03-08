// app/create/post.tsx — REDESIGNED ✅ Twitter-style composer
import { useAuth } from "@/hooks/useAuth";
import { extractHashtags } from "@/lib/firestore/hashtags";
import { createPost } from "@/lib/firestore/posts";
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

const VISIBILITY_CONFIG = {
  public: { icon: "globe-outline" as const, label: "Public", color: "#7C3AED" },
  followers: {
    icon: "people-outline" as const,
    label: "Followers",
    color: "#6366F1",
  },
  private: {
    icon: "lock-closed-outline" as const,
    label: "Only Me",
    color: "#6B7280",
  },
};

export default function CreatePostScreen() {
  const { user, profile } = useAuth();
  const inputRef = useRef<TextInput>(null);

  const [bodyText, setBodyText] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [mediaItems, setMediaItems] = useState<LocalMediaItem[]>([]);
  const [isPosting, setIsPosting] = useState(false);

  const canPost = useMemo(
    () => (bodyText.trim().length > 0 || mediaItems.length > 0) && !isPosting,
    [bodyText, mediaItems, isPosting],
  );

  const detectedHashtags = useMemo(() => extractHashtags(bodyText), [bodyText]);

  const charCount = bodyText.length;
  const charLimit = 500;
  const isNearLimit = charCount > charLimit * 0.8;
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

  const recordVideo = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "We need camera access.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: PickerMedia.Videos,
      videoMaxDuration: 60,
      quality: 1,
    });
    if (result.canceled || !result.assets?.length) return;
    setMediaItems([{ uri: result.assets[0].uri, type: "video" as const }]);
  };

  const removeMedia = (index: number) =>
    setMediaItems((prev) => prev.filter((_, i) => i !== index));

  const cycleVisibility = () =>
    setVisibility((v) =>
      v === "public" ? "followers" : v === "followers" ? "private" : "public",
    );

  const handlePost = async () => {
    if (!canPost || isOverLimit) return;
    if (!user) {
      Alert.alert("Not logged in", "Please log in again.");
      return;
    }

    setIsPosting(true);
    try {
      await createPost({
        content: bodyText.trim(),
        media: mediaItems.map((m) => ({ uri: m.uri, type: m.type })) as any,
        visibility,
      });
      router.back();
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to create post.");
    } finally {
      setIsPosting(false);
    }
  };

  const vis = VISIBILITY_CONFIG[visibility];
  const avatarLetter = profile?.username?.charAt(0).toUpperCase() ?? "U";

  const mediaGridStyle =
    mediaItems.length === 1
      ? styles.mediaSingle
      : mediaItems.length === 2
        ? styles.mediaDouble
        : styles.mediaGrid;

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
              style={[
                styles.postBtn,
                !canPost || isOverLimit ? styles.postBtnDisabled : null,
              ]}
              onPress={handlePost}
              disabled={!canPost || isOverLimit}
            >
              <Text style={styles.postBtnText}>
                {isPosting ? "Posting..." : "Post"}
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
              </View>

              {/* Input area */}
              <View style={styles.inputCol}>
                {/* Visibility pill */}
                <TouchableOpacity
                  style={[styles.visPill, { borderColor: vis.color }]}
                  onPress={cycleVisibility}
                >
                  <Ionicons name={vis.icon} size={12} color={vis.color} />
                  <Text style={[styles.visText, { color: vis.color }]}>
                    {vis.label}
                  </Text>
                </TouchableOpacity>

                <TextInput
                  ref={inputRef}
                  style={styles.textInput}
                  placeholder="What's happening?"
                  placeholderTextColor="#9CA3AF"
                  value={bodyText}
                  onChangeText={setBodyText}
                  multiline
                  autoFocus
                  maxLength={charLimit + 50}
                />

                {/* Hashtag chips */}
                {detectedHashtags.length > 0 && (
                  <View style={styles.hashtagRow}>
                    {detectedHashtags.map((tag) => (
                      <View key={tag} style={styles.hashtagChip}>
                        <Text style={styles.hashtagChipText}>#{tag}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Media preview */}
                {mediaItems.length > 0 && (
                  <View style={[styles.mediaContainer, mediaGridStyle]}>
                    {mediaItems.map((m, idx) => (
                      <View
                        key={`${m.uri}-${idx}`}
                        style={[
                          styles.mediaItem,
                          mediaItems.length === 1 && styles.mediaItemSingle,
                          mediaItems.length === 2 && styles.mediaItemDouble,
                          mediaItems.length >= 3 && styles.mediaItemGrid,
                        ]}
                      >
                        <Image
                          source={{ uri: m.uri }}
                          style={styles.mediaImage}
                        />
                        {m.type === "video" && (
                          <View style={styles.videoBadge}>
                            <Ionicons
                              name="play-circle"
                              size={28}
                              color="#fff"
                            />
                          </View>
                        )}
                        <TouchableOpacity
                          style={styles.removeBtn}
                          onPress={() => removeMedia(idx)}
                        >
                          <Ionicons
                            name="close-circle"
                            size={22}
                            color="#fff"
                          />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>
          </ScrollView>

          {/* Toolbar */}
          <View style={styles.toolbar}>
            <View style={styles.toolbarLeft}>
              <TouchableOpacity
                style={styles.toolBtn}
                onPress={pickImages}
                disabled={mediaItems.some((m) => m.type === "video")}
              >
                <Ionicons
                  name="image-outline"
                  size={22}
                  color={
                    mediaItems.some((m) => m.type === "video")
                      ? "#D1D5DB"
                      : "#7C3AED"
                  }
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.toolBtn}
                onPress={pickVideos}
                disabled={
                  mediaItems.length > 0 && mediaItems[0].type !== "video"
                }
              >
                <Ionicons
                  name="videocam-outline"
                  size={22}
                  color={
                    mediaItems.length > 0 && mediaItems[0].type !== "video"
                      ? "#D1D5DB"
                      : "#7C3AED"
                  }
                />
              </TouchableOpacity>

              <TouchableOpacity style={styles.toolBtn} onPress={recordVideo}>
                <Ionicons name="camera-outline" size={22} color="#7C3AED" />
              </TouchableOpacity>
            </View>

            {/* Char count */}
            {charCount > 0 && (
              <Text
                style={[
                  styles.charCount,
                  isNearLimit && styles.charCountWarn,
                  isOverLimit && styles.charCountOver,
                ]}
              >
                {charLimit - charCount}
              </Text>
            )}
          </View>
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

  avatarCol: { paddingTop: 2 },
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

  inputCol: { flex: 1 },

  visPill: {
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
  visText: { fontSize: 12, fontWeight: "600" },

  textInput: {
    fontSize: 17,
    color: "#111827",
    lineHeight: 24,
    minHeight: 80,
    paddingTop: 0,
  },

  hashtagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  hashtagChip: {
    backgroundColor: "#EDE9FE",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  hashtagChipText: { fontSize: 12, fontWeight: "700", color: "#7C3AED" },

  mediaContainer: {
    marginTop: 12,
    borderRadius: 16,
    overflow: "hidden",
    gap: 2,
  },
  mediaSingle: { height: 240 },
  mediaDouble: { flexDirection: "row", height: 180 },
  mediaGrid: { flexDirection: "row", flexWrap: "wrap", height: 240 },

  mediaItem: { overflow: "hidden", position: "relative" },
  mediaItemSingle: { flex: 1 },
  mediaItemDouble: { flex: 1 },
  mediaItemGrid: { width: "50%", height: "50%" },

  mediaImage: { width: "100%", height: "100%" },
  videoBadge: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  removeBtn: {
    position: "absolute",
    top: 8,
    right: 8,
  },

  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  toolbarLeft: { flexDirection: "row", gap: 4 },
  toolBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
  },
  charCount: { fontSize: 14, color: "#9CA3AF", fontWeight: "600" },
  charCountWarn: { color: "#F59E0B" },
  charCountOver: { color: "#EF4444" },
});
