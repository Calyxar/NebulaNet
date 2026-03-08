// app/create/media.tsx — REDESIGNED ✅ matches Twitter-style composer
// ✅ uploadString base64 — Expo Go + Android content:// safe
import { useAuth } from "@/hooks/useAuth";
import { auth, db } from "@/lib/firebase";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystemLegacy from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import * as VideoThumbnails from "expo-video-thumbnails";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import {
  getDownloadURL,
  getStorage,
  ref as storageRef,
  uploadString,
} from "firebase/storage";
import React, { useState } from "react";
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

type MediaType = "image" | "video";

interface MediaItem {
  uri: string;
  type: MediaType;
  thumbnail?: string;
}

const PickerMedia: any =
  (ImagePicker as any).MediaType ?? (ImagePicker as any).MediaTypeOptions;

export default function CreateMediaScreen() {
  const { profile } = useAuth();

  const [caption, setCaption] = useState("");
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState<"photos" | "videos">("photos");
  const [visibility, setVisibility] = useState<
    "public" | "followers" | "private"
  >("public");

  const avatarLetter = profile?.username?.charAt(0).toUpperCase() ?? "U";
  const canPost = mediaItems.length > 0 && !isLoading;

  const charCount = caption.length;
  const charLimit = 500;

  const visibilityConfig = {
    public: {
      icon: "globe-outline" as const,
      label: "Public",
      color: "#7C3AED",
    },
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
  const vis = visibilityConfig[visibility];

  const cycleVisibility = () =>
    setVisibility((v) =>
      v === "public" ? "followers" : v === "followers" ? "private" : "public",
    );

  const pickMedia = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "We need photo library access.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes:
        selectedTab === "photos" ? PickerMedia.Images : PickerMedia.Videos,
      allowsMultipleSelection: true,
      selectionLimit: selectedTab === "photos" ? 10 : 1,
      quality: 0.9,
      videoMaxDuration: 60,
    });

    if (result.canceled || !result.assets?.length) return;

    const newItems: MediaItem[] = [];
    for (const asset of result.assets) {
      const type: MediaType = asset.type === "video" ? "video" : "image";
      const item: MediaItem = { uri: asset.uri, type };
      if (type === "video") {
        try {
          const thumb = await VideoThumbnails.getThumbnailAsync(asset.uri, {
            time: 150,
          });
          item.thumbnail = thumb.uri;
        } catch {}
      }
      newItems.push(item);
    }

    setMediaItems((prev) => [...prev, ...newItems].slice(0, 10));
  };

  const removeMedia = (index: number) =>
    setMediaItems((prev) => prev.filter((_, i) => i !== index));

  const uploadMedia = async (): Promise<string[]> => {
    const storage = getStorage();
    const urls: string[] = [];

    for (const item of mediaItems) {
      const cleanUri = item.uri.split("?")[0];
      const extRaw = cleanUri.split(".").pop()?.toLowerCase();
      const ext =
        extRaw && extRaw.length <= 5
          ? extRaw
          : item.type === "video"
            ? "mp4"
            : "jpg";

      const path = `post-media/${auth.currentUser!.uid}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const fileRef = storageRef(storage, path);

      // ✅ Copy content:// URIs first (Android), then upload as base64
      let readUri = item.uri;
      if (item.uri.startsWith("content://")) {
        const localPath = `${FileSystemLegacy.cacheDirectory}media-upload-${Date.now()}.${ext}`;
        await FileSystemLegacy.copyAsync({ from: item.uri, to: localPath });
        readUri = localPath;
      }

      const base64 = await FileSystemLegacy.readAsStringAsync(readUri, {
        encoding: "base64" as any,
      });
      await uploadString(fileRef, base64, "base64");

      const url = await getDownloadURL(fileRef);
      urls.push(url);
    }

    return urls;
  };

  const handlePost = async () => {
    if (!canPost) return;

    setIsLoading(true);
    try {
      const mediaUrls = await uploadMedia();
      const postType = mediaItems.some((m) => m.type === "video")
        ? "video"
        : "image";
      const now = new Date().toISOString();

      await addDoc(collection(db, "posts"), {
        user_id: auth.currentUser!.uid,
        content: caption.trim(),
        media_urls: mediaUrls,
        post_type: postType,
        visibility,
        is_visible: true,
        like_count: 0,
        comment_count: 0,
        share_count: 0,
        created_at: now,
        updated_at: now,
        created_at_ts: serverTimestamp(),
        updated_at_ts: serverTimestamp(),
      });

      router.back();
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to share media.");
    } finally {
      setIsLoading(false);
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
              style={[styles.postBtn, !canPost && styles.postBtnDisabled]}
              onPress={handlePost}
              disabled={!canPost}
            >
              <Text style={styles.postBtnText}>
                {isLoading ? "Sharing..." : "Share"}
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
                {mediaItems.length > 0 && <View style={styles.avatarLine} />}
              </View>

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
                  style={styles.captionInput}
                  placeholder="Add a caption..."
                  placeholderTextColor="#9CA3AF"
                  value={caption}
                  onChangeText={setCaption}
                  multiline
                  maxLength={charLimit + 20}
                />

                {charCount > 0 && (
                  <Text
                    style={[
                      styles.charCount,
                      charCount > charLimit * 0.8 && styles.charCountWarn,
                      charCount > charLimit && styles.charCountOver,
                    ]}
                  >
                    {charLimit - charCount}
                  </Text>
                )}
              </View>
            </View>

            {/* Media section */}
            <View style={styles.mediaSection}>
              <View style={styles.avatarColSpacer} />
              <View style={styles.mediaCol}>
                {/* Tab switcher */}
                <View style={styles.tabRow}>
                  {(["photos", "videos"] as const).map((tab) => (
                    <TouchableOpacity
                      key={tab}
                      style={[
                        styles.tab,
                        selectedTab === tab && styles.tabActive,
                      ]}
                      onPress={() => setSelectedTab(tab)}
                    >
                      <Ionicons
                        name={
                          tab === "photos"
                            ? "image-outline"
                            : "videocam-outline"
                        }
                        size={14}
                        color={selectedTab === tab ? "#7C3AED" : "#6B7280"}
                      />
                      <Text
                        style={[
                          styles.tabText,
                          selectedTab === tab && styles.tabTextActive,
                        ]}
                      >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Media grid */}
                {mediaItems.length > 0 ? (
                  <View style={styles.grid}>
                    {mediaItems.map((item, idx) => (
                      <View
                        key={`${item.uri}-${idx}`}
                        style={[
                          styles.gridItem,
                          mediaItems.length === 1 && styles.gridItemSingle,
                          mediaItems.length === 2 && styles.gridItemDouble,
                          mediaItems.length >= 3 && styles.gridItemMulti,
                        ]}
                      >
                        <Image
                          source={{ uri: item.thumbnail ?? item.uri }}
                          style={styles.gridImage}
                          resizeMode="cover"
                        />
                        {item.type === "video" && (
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
                ) : null}

                {/* Add button */}
                {(mediaItems.length === 0 ||
                  (selectedTab === "photos" &&
                    mediaItems.length < 10 &&
                    !mediaItems.some((m) => m.type === "video"))) && (
                  <TouchableOpacity style={styles.addBtn} onPress={pickMedia}>
                    <Ionicons
                      name={
                        selectedTab === "photos"
                          ? "images-outline"
                          : "videocam-outline"
                      }
                      size={20}
                      color="#7C3AED"
                    />
                    <Text style={styles.addBtnText}>
                      {mediaItems.length === 0
                        ? `Add ${selectedTab}`
                        : `Add more (${mediaItems.length}/10)`}
                    </Text>
                  </TouchableOpacity>
                )}
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
  charCountWarn: { color: "#F59E0B" },
  charCountOver: { color: "#EF4444" },

  mediaSection: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 12,
    paddingTop: 8,
    paddingBottom: 32,
  },
  avatarColSpacer: { width: 44 },
  mediaCol: { flex: 1 },

  tabRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FAFAFA",
  },
  tabActive: {
    backgroundColor: "#EDE9FE",
    borderColor: "#7C3AED",
  },
  tabText: { fontSize: 13, fontWeight: "600", color: "#6B7280" },
  tabTextActive: { color: "#7C3AED" },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 2,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 12,
  },
  gridItem: { overflow: "hidden", position: "relative" },
  gridItemSingle: { width: "100%", height: 240 },
  gridItemDouble: { width: "49.5%", height: 180 },
  gridItemMulti: { width: "49.5%", height: 140 },
  gridImage: { width: "100%", height: "100%" },
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

  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: "#FAFAFA",
  },
  addBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#7C3AED",
  },
});
