// app/create/media.tsx — React Native Firebase ✅ (delegates to createPost)
import { useAuth } from "@/hooks/useAuth";
import { createPost } from "@/lib/firestore/posts";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import auth from "@react-native-firebase/auth";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
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
  const { colors, isDark } = useTheme();

  const [caption, setCaption] = useState("");
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState<"photos" | "videos">("photos");
  const [visibility, setVisibility] = useState;
  "public" | "followers" | ("private" > "public");

  const avatarLetter = profile?.username?.charAt(0).toUpperCase() ?? "U";
  const canPost = mediaItems.length > 0 && !isLoading;
  const charLimit = 500;

  const visibilityConfig = {
    public: {
      icon: "globe-outline" as const,
      label: "Public",
      color: colors.primary,
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

    const newItems: MediaItem[] = result.assets.map((asset) => ({
      uri: asset.uri,
      type: (asset.type === "video" ? "video" : "image") as MediaType,
    }));

    setMediaItems((prev) => [...prev, ...newItems].slice(0, 10));
  };

  const removeMedia = (index: number) =>
    setMediaItems((prev) => prev.filter((_, i) => i !== index));

  const handlePost = async () => {
    if (!canPost) return;
    if (!auth().currentUser) {
      Alert.alert("Session Expired", "Please sign in again.");
      router.replace("/(auth)/login");
      return;
    }

    setIsLoading(true);
    try {
      // Delegate to createPost — uploads + profile snapshot + post doc in
      // one call using the native SDK. Map MediaItem[] to its shape.
      await createPost({
        content: caption.trim(),
        visibility,
        media: mediaItems.map((m, i) => ({
          id: `${Date.now()}_${i}`,
          uri: m.uri,
          type: m.type,
        })) as any,
      });
      router.back();
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to share media.");
    } finally {
      setIsLoading(false);
    }
  };

  const content = (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top", "left", "right"]}
    >
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View
          style={[
            styles.header,
            {
              borderBottomColor: colors.border,
              backgroundColor: colors.background,
            },
          ]}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.cancelBtn}
            disabled={isLoading}
          >
            <Text style={[styles.cancelText, { color: colors.text }]}>
              Cancel
            </Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Share Media
          </Text>
          <TouchableOpacity
            style={[
              styles.postBtn,
              {
                backgroundColor: canPost
                  ? colors.primary
                  : colors.primary + "60",
              },
            ]}
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
              {mediaItems.length > 0 && (
                <View
                  style={[
                    styles.avatarLine,
                    { backgroundColor: colors.border },
                  ]}
                />
              )}
            </View>

            <View style={styles.inputCol}>
              <TouchableOpacity
                style={[
                  styles.visPill,
                  {
                    borderColor: vis.color,
                    backgroundColor: vis.color + "12",
                  },
                ]}
                onPress={cycleVisibility}
              >
                <Ionicons name={vis.icon} size={12} color={vis.color} />
                <Text style={[styles.visText, { color: vis.color }]}>
                  {vis.label}
                </Text>
              </TouchableOpacity>

              <TextInput
                style={[styles.captionInput, { color: colors.text }]}
                placeholder="Add a caption..."
                placeholderTextColor={colors.textTertiary}
                value={caption}
                onChangeText={setCaption}
                multiline
                maxLength={charLimit + 20}
              />

              {caption.length > 0 && (
                <Text
                  style={[
                    styles.charCount,
                    {
                      color:
                        caption.length > charLimit * 0.8
                          ? "#F59E0B"
                          : colors.textTertiary,
                    },
                  ]}
                >
                  {charLimit - caption.length}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.mediaSection}>
            <View style={styles.avatarColSpacer} />
            <View style={styles.mediaCol}>
              <View style={styles.tabRow}>
                {(["photos", "videos"] as const).map((tab) => (
                  <TouchableOpacity
                    key={tab}
                    style={[
                      styles.tabPill,
                      {
                        borderColor: colors.border,
                        backgroundColor: colors.surface,
                      },
                      selectedTab === tab && {
                        backgroundColor: colors.primary + "18",
                        borderColor: colors.primary,
                      },
                    ]}
                    onPress={() => setSelectedTab(tab)}
                  >
                    <Ionicons
                      name={
                        tab === "photos" ? "image-outline" : "videocam-outline"
                      }
                      size={14}
                      color={
                        selectedTab === tab
                          ? colors.primary
                          : colors.textTertiary
                      }
                    />
                    <Text
                      style={[
                        styles.tabText,
                        {
                          color:
                            selectedTab === tab
                              ? colors.primary
                              : colors.textTertiary,
                        },
                      ]}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {mediaItems.length > 0 && (
                <View style={styles.grid}>
                  {mediaItems.map((item, idx) => (
                    <View
                      key={`${item.uri}-${idx}`}
                      style={[
                        styles.gridItem,
                        mediaItems.length === 1 && styles.gridItemSingle,
                        mediaItems.length === 2 && styles.gridItemDouble,
                        mediaItems.length >= 3 && styles.gridItemMulti,
                        { backgroundColor: colors.surface },
                      ]}
                    >
                      <Image
                        source={{ uri: item.thumbnail ?? item.uri }}
                        style={styles.gridImage}
                        resizeMode="cover"
                      />
                      {item.type === "video" && (
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

              {(mediaItems.length === 0 ||
                (selectedTab === "photos" &&
                  mediaItems.length < 10 &&
                  !mediaItems.some((m) => m.type === "video"))) && (
                <TouchableOpacity
                  style={[
                    styles.addBtn,
                    {
                      borderColor: colors.border,
                      backgroundColor: colors.surface,
                    },
                  ]}
                  onPress={pickMedia}
                >
                  <Ionicons
                    name={
                      selectedTab === "photos"
                        ? "images-outline"
                        : "videocam-outline"
                    }
                    size={20}
                    color={colors.primary}
                  />
                  <Text style={[styles.addBtnText, { color: colors.primary }]}>
                    {mediaItems.length === 0
                      ? `Add ${selectedTab}`
                      : `Add more (${mediaItems.length}/10)`}
                  </Text>
                </TouchableOpacity>
              )}

              <Text style={[styles.helperText, { color: colors.textTertiary }]}>
                {selectedTab === "photos"
                  ? "Up to 10 photos per post."
                  : "1 video per post, max 60 seconds."}
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

  if (!isDark) {
    return (
      <LinearGradient
        colors={["#DCEBFF", "#EEF4FF", "#FFFFFF"]}
        locations={[0, 0.45, 1]}
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
  container: { flex: 1 },
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
    lineHeight: 24,
    minHeight: 60,
    paddingTop: 0,
  },
  charCount: { fontSize: 13, fontWeight: "600", marginTop: 4 },
  mediaSection: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 12,
    paddingTop: 8,
    paddingBottom: 32,
  },
  avatarColSpacer: { width: 44 },
  mediaCol: { flex: 1 },
  tabRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  tabPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  tabText: { fontSize: 13, fontWeight: "600" },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 2,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 12,
  },
  gridItem: { overflow: "hidden", position: "relative" },
  gridItemSingle: { width: "100%", height: 280 },
  gridItemDouble: { width: "49.5%", height: 180 },
  gridItemMulti: { width: "49.5%", height: 140 },
  gridImage: { width: "100%", height: "100%" },
  videoBadge: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  removeBtn: { position: "absolute", top: 8, right: 8 },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  addBtnText: { fontSize: 15, fontWeight: "600" },
  helperText: { fontSize: 12, lineHeight: 16, marginTop: 2 },
});
