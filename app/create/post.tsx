// app/create/post.tsx - MEDIA ENABLED + ANDROID-SAFE UPLOAD (NebulaNet)
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
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

type MediaType = "image" | "video";

interface MediaItem {
  uri: string;
  type: MediaType;
}

export default function CreatePostScreen() {
  const { user } = useAuth();

  const [title, setTitle] = useState("");
  const [bodyText, setBodyText] = useState("");

  // keep your placeholder
  const [selectedCommunity] = useState("");
  const [isPublic, setIsPublic] = useState(true);

  // ✅ NEW: media state
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [isPosting, setIsPosting] = useState(false);

  const canPost = useMemo(
    () => title.trim().length > 0 && !isPosting,
    [title, isPosting],
  );

  const ensurePermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission required",
        "We need photo library permissions to attach media.",
      );
      return false;
    }
    return true;
  };

  const pickImages = async () => {
    if (!(await ensurePermission())) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, // ✅ includes GIFs from library
      allowsMultipleSelection: true,
      selectionLimit: 10,
      quality: 0.9,
    });

    if (result.canceled || !result.assets?.length) return;

    const picked: MediaItem[] = result.assets.map((a) => ({
      uri: a.uri,
      type: "image",
    }));

    setMediaItems((prev) => [...prev, ...picked].slice(0, 10));
  };

  const pickGifs = async () => {
    // GIFs are just image assets in the library.
    // (Later, you can add Tenor/Giphy search UI.)
    await pickImages();
  };

  const pickVideos = async () => {
    if (!(await ensurePermission())) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsMultipleSelection: true,
      selectionLimit: 5,
      quality: 1,
      videoMaxDuration: 60,
    });

    if (result.canceled || !result.assets?.length) return;

    const picked: MediaItem[] = result.assets.map((a) => ({
      uri: a.uri,
      type: "video",
    }));

    setMediaItems((prev) => [...prev, ...picked].slice(0, 10));
  };

  const removeMedia = (index: number) => {
    setMediaItems((prev) => prev.filter((_, i) => i !== index));
  };

  const getFileInfo = (uri: string, type: MediaType) => {
    const cleanUri = uri.split("?")[0];
    const extRaw = cleanUri.split(".").pop()?.toLowerCase();

    const ext =
      extRaw && extRaw.length <= 5 ? extRaw : type === "video" ? "mp4" : "jpg";

    const mime =
      type === "video"
        ? ext === "mov"
          ? "video/quicktime"
          : "video/mp4"
        : ext === "png"
          ? "image/png"
          : ext === "webp"
            ? "image/webp"
            : ext === "gif"
              ? "image/gif"
              : "image/jpeg";

    return { ext, mime };
  };

  // ✅ ANDROID SAFE upload: ArrayBuffer
  const uploadPostMedia = async (): Promise<string[]> => {
    if (!user) throw new Error("Not logged in");
    if (mediaItems.length === 0) return [];

    const urls: string[] = [];

    for (const item of mediaItems) {
      const { ext, mime } = getFileInfo(item.uri, item.type);

      const fileName = `${user.id}/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.${ext}`;
      const path = `media/${fileName}`;

      const res = await fetch(item.uri);
      const arrayBuffer = await res.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from("post-media")
        .upload(path, arrayBuffer, {
          contentType: mime,
          upsert: false,
        });

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        throw new Error("Upload failed. Check storage bucket policy.");
      }

      const { data } = supabase.storage.from("post-media").getPublicUrl(path);
      urls.push(data.publicUrl);
    }

    return urls;
  };

  const handleSaveDraft = () => {
    Alert.alert("Draft Saved", "Your post has been saved as a draft.");
  };

  const handlePost = async () => {
    if (!title.trim()) {
      Alert.alert("Title Required", "Please enter a title for your post.");
      return;
    }
    if (!user) {
      Alert.alert("Not logged in", "Please log in again.");
      return;
    }

    setIsPosting(true);
    try {
      const mediaUrls = await uploadPostMedia();

      const postType =
        mediaUrls.length === 0
          ? "text"
          : mediaItems.some((m) => m.type === "video")
            ? "video"
            : "image";

      const nowIso = new Date().toISOString();

      const { error } = await supabase.from("posts").insert({
        user_id: user.id,
        title: title.trim(),
        content: bodyText.trim(),
        media_urls: mediaUrls,
        post_type: postType,
        // keep your counters consistent with the rest of your app
        likes_count: 0,
        comments_count: 0,
        shares_count: 0,
        created_at: nowIso,
        updated_at: nowIso,
        // community_id: selectedCommunity || null,  // wire this once you add community picker
        // is_public: isPublic, // only if your schema has this
      });

      if (error) throw error;

      Alert.alert("Success", "Your post has been created!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to create post.");
    } finally {
      setIsPosting(false);
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
          <Text style={styles.headerTitle}>Create Post</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Main Input Card */}
          <View style={styles.inputCard}>
            <TextInput
              style={styles.titleInput}
              placeholder="Title"
              placeholderTextColor="#999"
              value={title}
              onChangeText={setTitle}
              maxLength={100}
            />

            <TextInput
              style={styles.bodyInput}
              placeholder="Body Text (Optional)"
              placeholderTextColor="#B0B0B0"
              value={bodyText}
              onChangeText={setBodyText}
              multiline
              textAlignVertical="top"
            />

            {/* ✅ Media Preview */}
            {mediaItems.length > 0 && (
              <View style={styles.previewWrap}>
                <Text style={styles.previewLabel}>Attachments</Text>

                <View style={styles.grid}>
                  {mediaItems.map((m, idx) => (
                    <View key={`${m.uri}-${idx}`} style={styles.gridItemWrap}>
                      {/* Note: Image component will show first frame for some video URIs on Android,
                          but not always. It's fine for preview; playback happens on PostCard screen. */}
                      <Image source={{ uri: m.uri }} style={styles.gridItem} />

                      {m.type === "video" && (
                        <View style={styles.videoBadge}>
                          <Ionicons name="play" size={12} color="#fff" />
                          <Text style={styles.videoBadgeText}>Video</Text>
                        </View>
                      )}

                      <TouchableOpacity
                        style={styles.removeBtn}
                        onPress={() => removeMedia(idx)}
                        activeOpacity={0.85}
                      >
                        <Ionicons name="close" size={14} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Media Actions */}
            <View style={styles.mediaActions}>
              <TouchableOpacity
                style={styles.mediaButton}
                onPress={pickImages}
                activeOpacity={0.85}
              >
                <Ionicons name="image-outline" size={20} color="#666" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.mediaButton}
                onPress={pickGifs}
                activeOpacity={0.85}
              >
                <Ionicons name="gift-outline" size={20} color="#666" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.mediaButton}
                onPress={pickVideos}
                activeOpacity={0.85}
              >
                <Ionicons name="videocam-outline" size={20} color="#666" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.mediaButton}
                onPress={() =>
                  Alert.alert("Coming soon", "Audio posts are coming next.")
                }
                activeOpacity={0.85}
              >
                <Ionicons name="musical-notes-outline" size={20} color="#666" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.mediaButton}
                onPress={() => setIsPublic(!isPublic)}
                activeOpacity={0.85}
              >
                <Ionicons
                  name={isPublic ? "globe-outline" : "lock-closed-outline"}
                  size={20}
                  color="#666"
                />
              </TouchableOpacity>

              <View style={styles.spacer} />

              <TouchableOpacity
                style={styles.communityButton}
                onPress={() =>
                  Alert.alert(
                    "Community",
                    "Hook this to your community picker screen.",
                  )
                }
                activeOpacity={0.85}
              >
                <Text style={styles.communityButtonText}>
                  {selectedCommunity || "Community"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Add Location */}
          <TouchableOpacity style={styles.optionCard} activeOpacity={0.85}>
            <View style={styles.optionLeft}>
              <View style={styles.optionIconContainer}>
                <Ionicons name="location-outline" size={20} color="#666" />
              </View>
              <Text style={styles.optionText}>Add Location</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>

          {/* Share Post to Public */}
          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => setIsPublic(!isPublic)}
            activeOpacity={0.85}
          >
            <View style={styles.optionLeft}>
              <View style={styles.optionIconContainer}>
                <Ionicons name="lock-closed-outline" size={20} color="#666" />
              </View>
              <Text style={styles.optionText}>
                Share Post to {isPublic ? "Public" : "Private"}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>

          {/* Boost Post */}
          <TouchableOpacity style={styles.optionCard} activeOpacity={0.85}>
            <View style={styles.optionLeft}>
              <View style={styles.optionIconContainer}>
                <Ionicons name="megaphone-outline" size={20} color="#666" />
              </View>
              <Text style={styles.optionText}>Boost Post</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
        </ScrollView>

        {/* Footer Actions */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.draftButton}
            onPress={handleSaveDraft}
            activeOpacity={0.85}
          >
            <Text style={styles.draftButtonText}>Save as Draft</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.postButton, !canPost && styles.postButtonDisabled]}
            onPress={handlePost}
            disabled={!canPost}
            activeOpacity={0.9}
          >
            <Text style={styles.postButtonText}>
              {isPosting ? "Posting..." : "Post"}
            </Text>
          </TouchableOpacity>
        </View>
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
  headerSpacer: { width: 40 },

  scrollView: { flex: 1 },
  scrollContent: { padding: 16 },

  inputCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  titleInput: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 12,
    paddingVertical: 8,
  },
  bodyInput: {
    fontSize: 14,
    color: "#666",
    minHeight: 100,
    paddingVertical: 8,
    marginBottom: 12,
  },

  previewWrap: {
    marginTop: 6,
    marginBottom: 12,
    backgroundColor: "#F8F8FF",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#EEE",
  },
  previewLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 10,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 10,
  },
  gridItemWrap: {
    width: "32%",
    aspectRatio: 1,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
    position: "relative",
  },
  gridItem: { width: "100%", height: "100%" },

  videoBadge: {
    position: "absolute",
    left: 8,
    bottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
  },
  videoBadgeText: { color: "#fff", fontWeight: "800", fontSize: 10 },

  removeBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(239,68,68,0.95)",
    alignItems: "center",
    justifyContent: "center",
  },

  mediaActions: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    gap: 12,
  },
  mediaButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
  },
  spacer: { flex: 1 },
  communityButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "#F5F5F5",
  },
  communityButtonText: { fontSize: 13, color: "#666", fontWeight: "500" },

  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  optionLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  optionIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
  },
  optionText: { fontSize: 15, fontWeight: "500", color: "#000" },

  footer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#E8EAF6",
    gap: 12,
  },
  draftButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 28,
    backgroundColor: "#D1D5F0",
    alignItems: "center",
  },
  draftButtonText: { fontSize: 16, fontWeight: "600", color: "#666" },
  postButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 28,
    backgroundColor: "#7C3AED",
    alignItems: "center",
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  postButtonDisabled: {
    backgroundColor: "#C5CAE9",
    shadowOpacity: 0,
    elevation: 0,
  },
  postButtonText: { fontSize: 16, fontWeight: "600", color: "#FFFFFF" },
});
