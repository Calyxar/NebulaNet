// app/create/media.tsx - DESIGN MATCH + RELIABLE UPLOAD (NebulaNet)
import Button from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import * as VideoThumbnails from "expo-video-thumbnails";
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
  thumbnail?: string;
}

export default function CreateMediaScreen() {
  const { user } = useAuth();
  const [caption, setCaption] = useState("");
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState<"photos" | "videos">("photos");

  const countLabel = useMemo(
    () => `${mediaItems.length}/10 selected`,
    [mediaItems.length],
  );

  const pickMedia = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== "granted") {
      Alert.alert(
        "Permission required",
        "We need photo library permissions to upload media.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes:
        selectedTab === "photos"
          ? ImagePicker.MediaTypeOptions.Images
          : ImagePicker.MediaTypeOptions.Videos,
      allowsMultipleSelection: true,
      selectionLimit: 10,
      quality: 0.9,
      videoMaxDuration: 60,
    });

    if (result.canceled) return;
    if (!result.assets?.length) return;

    const newItems: MediaItem[] = [];

    for (const asset of result.assets) {
      const type: MediaType = asset.type === "video" ? "video" : "image";

      const item: MediaItem = { uri: asset.uri, type };

      // Thumbnail for videos
      if (type === "video") {
        try {
          const thumb = await VideoThumbnails.getThumbnailAsync(asset.uri, {
            time: 150,
          });
          item.thumbnail = thumb.uri;
        } catch (e) {
          console.warn("Video thumbnail failed:", e);
        }
      }

      newItems.push(item);
    }

    setMediaItems((prev) => [...prev, ...newItems].slice(0, 10));
  };

  const removeMedia = (index: number) => {
    setMediaItems((prev) => prev.filter((_, i) => i !== index));
  };

  // ✅ Robust file info parsing
  const getFileInfo = (uri: string, type: MediaType) => {
    const cleanUri = uri.split("?")[0];
    const extRaw = cleanUri.split(".").pop()?.toLowerCase();

    // some Android URIs won't have an extension; default safely
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
            : "image/jpeg";

    return { ext, mime };
  };

  // ✅ RELIABLE upload for Android/iOS dev builds: use ArrayBuffer (not Blob)
  const uploadMedia = async (): Promise<string[]> => {
    if (!user) throw new Error("Not logged in");
    if (mediaItems.length === 0) return [];

    const uploadedUrls: string[] = [];

    for (const item of mediaItems) {
      const { ext, mime } = getFileInfo(item.uri, item.type);

      const fileName = `${user.id}/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.${ext}`;
      const path = `media/${fileName}`;

      try {
        const res = await fetch(item.uri);
        const arrayBuffer = await res.arrayBuffer();

        const { error: uploadError } = await supabase.storage
          .from("post-media")
          .upload(path, arrayBuffer, {
            contentType: mime,
            upsert: false,
          });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from("post-media").getPublicUrl(path);
        uploadedUrls.push(data.publicUrl);
      } catch (err) {
        console.error("Upload failed:", err);
        throw new Error(
          "Failed to upload media. Check storage policies/bucket.",
        );
      }
    }

    return uploadedUrls;
  };

  const handleShareMedia = async () => {
    if (!user) {
      Alert.alert("Error", "You must be logged in to share media");
      return;
    }
    if (mediaItems.length === 0) {
      Alert.alert("Error", "Please select at least one photo or video");
      return;
    }

    setIsLoading(true);
    try {
      const mediaUrls = await uploadMedia();

      const postType = mediaItems.some((m) => m.type === "video")
        ? "video"
        : "image";

      const title =
        caption.trim() ||
        `${mediaItems.length} ${mediaItems.length === 1 ? "item" : "items"} shared`;

      const nowIso = new Date().toISOString();

      const { error } = await supabase.from("posts").insert({
        user_id: user.id,
        title,
        content: caption.trim(),
        media_urls: mediaUrls,
        post_type: postType,
        likes_count: 0,
        comments_count: 0,
        shares_count: 0,
        created_at: nowIso,
        updated_at: nowIso,
      });

      if (error) throw error;

      Alert.alert("Success", "Media shared successfully!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to share media.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#E8EAF6" />
      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Upload Media</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Tabs */}
          <View style={styles.tabsWrap}>
            <TouchableOpacity
              style={[styles.tab, selectedTab === "photos" && styles.tabActive]}
              onPress={() => setSelectedTab("photos")}
              activeOpacity={0.85}
            >
              <Ionicons
                name="image-outline"
                size={18}
                color={selectedTab === "photos" ? "#FFFFFF" : "#6B7280"}
              />
              <Text
                style={[
                  styles.tabText,
                  selectedTab === "photos" && styles.tabTextActive,
                ]}
              >
                Photos
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, selectedTab === "videos" && styles.tabActive]}
              onPress={() => setSelectedTab("videos")}
              activeOpacity={0.85}
            >
              <Ionicons
                name="videocam-outline"
                size={18}
                color={selectedTab === "videos" ? "#FFFFFF" : "#6B7280"}
              />
              <Text
                style={[
                  styles.tabText,
                  selectedTab === "videos" && styles.tabTextActive,
                ]}
              >
                Videos
              </Text>
            </TouchableOpacity>
          </View>

          {/* Add Media Card */}
          <TouchableOpacity
            style={styles.addCard}
            onPress={pickMedia}
            activeOpacity={0.85}
          >
            <View style={styles.addIconCircle}>
              <Ionicons
                name={selectedTab === "photos" ? "images" : "videocam"}
                size={26}
                color="#7C3AED"
              />
            </View>
            <Text style={styles.addTitle}>
              Add {selectedTab === "photos" ? "Photos" : "Videos"}
            </Text>
            <Text style={styles.addSub}>{countLabel}</Text>
          </TouchableOpacity>

          {/* Grid Preview */}
          {mediaItems.length > 0 && (
            <View style={styles.gridCard}>
              <Text style={styles.cardTitle}>Preview</Text>

              <View style={styles.grid}>
                {mediaItems.map((item, index) => (
                  <View
                    key={`${item.uri}-${index}`}
                    style={styles.gridItemWrap}
                  >
                    <Image
                      source={{
                        uri:
                          item.type === "video"
                            ? item.thumbnail || item.uri
                            : item.uri,
                      }}
                      style={styles.gridItem}
                    />

                    {item.type === "video" && (
                      <View style={styles.videoBadge}>
                        <Ionicons name="play" size={12} color="#fff" />
                        <Text style={styles.videoBadgeText}>Video</Text>
                      </View>
                    )}

                    <TouchableOpacity
                      style={styles.removeBtn}
                      onPress={() => removeMedia(index)}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="close" size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Caption */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Caption</Text>
            <View style={styles.captionWrap}>
              <TextInput
                value={caption}
                onChangeText={setCaption}
                placeholder={`Describe your ${selectedTab}...`}
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={4}
                maxLength={500}
                style={styles.captionInput}
              />
            </View>
            <Text style={styles.counter}>{caption.length}/500</Text>
          </View>

          {/* Details */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Media Details</Text>

            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Ionicons name="images-outline" size={18} color="#7C3AED" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailLabel}>Media Count</Text>
                <Text style={styles.detailValue}>
                  {mediaItems.length}{" "}
                  {mediaItems.length === 1 ? "item" : "items"}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Ionicons
                  name="information-circle-outline"
                  size={18}
                  color="#7C3AED"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailLabel}>Content Type</Text>
                <Text style={styles.detailValue}>
                  {mediaItems.length === 0
                    ? "None selected"
                    : selectedTab === "photos"
                      ? "Photos"
                      : "Videos"}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color="#7C3AED"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailLabel}>Privacy</Text>
                <Text style={styles.detailValue}>Public</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <Button
              title={`Share ${selectedTab === "photos" ? "Photos" : "Videos"}`}
              onPress={handleShareMedia}
              loading={isLoading}
              disabled={mediaItems.length === 0}
              style={styles.primaryBtn}
            />

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => router.back()}
              activeOpacity={0.85}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 24 }} />
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#E8EAF6" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },

  container: { flex: 1 },
  content: { padding: 16, gap: 14 },

  tabsWrap: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 6,
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 2,
  },
  tab: {
    flex: 1,
    height: 40,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#F3F4F6",
  },
  tabActive: {
    backgroundColor: "#7C3AED",
  },
  tabText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#6B7280",
  },
  tabTextActive: {
    color: "#FFFFFF",
  },

  addCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    paddingVertical: 26,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 2,
  },
  addIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#F3ECFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  addTitle: { fontSize: 16, fontWeight: "900", color: "#111827" },
  addSub: { marginTop: 6, fontSize: 12, fontWeight: "800", color: "#9CA3AF" },

  gridCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 2,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 12,
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
    borderRadius: 14,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#F3F4F6",
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
  videoBadgeText: { color: "#fff", fontWeight: "900", fontSize: 10 },

  removeBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(239,68,68,0.95)",
    alignItems: "center",
    justifyContent: "center",
  },

  captionWrap: {
    backgroundColor: "#F3ECFF",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  captionInput: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    minHeight: 110,
    textAlignVertical: "top",
  },
  counter: {
    marginTop: 10,
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "800",
    alignSelf: "flex-end",
  },

  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3ECFF",
    alignItems: "center",
    justifyContent: "center",
  },
  detailLabel: { fontSize: 13, fontWeight: "800", color: "#111827" },
  detailValue: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7280",
  },
  divider: { height: 1, backgroundColor: "#F1F1F1" },

  actions: { gap: 12 },
  primaryBtn: { backgroundColor: "#7C3AED", borderRadius: 28 },
  cancelBtn: { alignItems: "center", paddingVertical: 10 },
  cancelText: { color: "#6B7280", fontWeight: "900" },
});
