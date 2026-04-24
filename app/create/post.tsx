// app/create/post.tsx — ✅ FIXED: uses useCreatePost hook so new posts appear on home feed immediately
import GifPicker from "@/components/post/GifPicker";
import { useCreatePost } from "@/hooks/usePosts";
import { extractHashtags } from "@/lib/firestore/hashtags";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import auth from "@react-native-firebase/auth";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import * as VideoThumbnails from "expo-video-thumbnails";
import React, { useMemo, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
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
  thumbnailUri?: string;
}

interface PlaceResult {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

const PickerMedia: any =
  (ImagePicker as any).MediaType ?? (ImagePicker as any).MediaTypeOptions;

const PLACES_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_KEY ?? "";

function LocationPicker({
  visible,
  onSelect,
  onClose,
  colors,
}: {
  visible: boolean;
  onSelect: (place: { name: string; place_id: string }) => void;
  onClose: () => void;
  colors: any;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = async (text: string) => {
    if (text.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(text)}&key=${PLACES_API_KEY}&types=(cities)|establishment`;
      const res = await fetch(url);
      const json = await res.json();
      setResults(json.predictions ?? []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(text), 350);
  };

  const handleClose = () => {
    setQuery("");
    setResults([]);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <TouchableOpacity
        style={lpStyles.overlay}
        activeOpacity={1}
        onPress={handleClose}
      />
      <View style={[lpStyles.sheet, { backgroundColor: colors.card }]}>
        <View style={[lpStyles.handle, { backgroundColor: colors.border }]} />
        <Text style={[lpStyles.title, { color: colors.text }]}>
          Add Location
        </Text>

        <View
          style={[
            lpStyles.searchRow,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Ionicons name="search" size={18} color={colors.textTertiary} />
          <TextInput
            style={[lpStyles.searchInput, { color: colors.text }]}
            placeholder="Search places..."
            placeholderTextColor={colors.textTertiary}
            value={query}
            onChangeText={handleChange}
            autoFocus
            autoCorrect={false}
            autoCapitalize="none"
          />
          {!!query && (
            <TouchableOpacity
              onPress={() => {
                setQuery("");
                setResults([]);
              }}
            >
              <Ionicons
                name="close-circle"
                size={18}
                color={colors.textTertiary}
              />
            </TouchableOpacity>
          )}
        </View>

        {loading && (
          <Text style={[lpStyles.hint, { color: colors.textTertiary }]}>
            Searching...
          </Text>
        )}

        {!loading && query.length >= 2 && results.length === 0 && (
          <Text style={[lpStyles.hint, { color: colors.textTertiary }]}>
            No results found.
          </Text>
        )}

        <FlatList
          data={results}
          keyExtractor={(item) => item.place_id}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item, index }) => (
            <TouchableOpacity
              style={[
                lpStyles.resultRow,
                { borderTopColor: colors.border },
                index === 0 && { borderTopWidth: 0 },
              ]}
              onPress={() => {
                onSelect({
                  name: item.structured_formatting.main_text,
                  place_id: item.place_id,
                });
                handleClose();
              }}
              activeOpacity={0.85}
            >
              <View
                style={[
                  lpStyles.pinCircle,
                  { backgroundColor: colors.primary + "18" },
                ]}
              >
                <Ionicons name="location" size={16} color={colors.primary} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  style={[lpStyles.mainText, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {item.structured_formatting.main_text}
                </Text>
                <Text
                  style={[
                    lpStyles.secondaryText,
                    { color: colors.textTertiary },
                  ]}
                  numberOfLines={1}
                >
                  {item.structured_formatting.secondary_text}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          style={{ maxHeight: 320 }}
        />
      </View>
    </Modal>
  );
}

const lpStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: 40,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  title: { fontSize: 17, fontWeight: "800", marginBottom: 14 },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  searchInput: { flex: 1, fontSize: 15 },
  hint: {
    fontSize: 13,
    textAlign: "center",
    paddingVertical: 12,
    fontWeight: "600",
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  pinCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  mainText: { fontSize: 14, fontWeight: "700" },
  secondaryText: { fontSize: 12, marginTop: 2 },
});

export default function CreatePostScreen() {
  const { colors, isDark } = useTheme();
  const inputRef = useRef<TextInput>(null);

  // ✅ FIX: replaced direct createPost import with useCreatePost hook
  // This triggers optimistic insert so the post appears on home feed immediately
  const createPostMutation = useCreatePost();

  const [title, setTitle] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [mediaItems, setMediaItems] = useState<LocalMediaItem[]>([]);
  const [uploadProgress, setUploadProgress] = useState("");
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [location, setLocation] = useState<{
    name: string;
    place_id: string;
  } | null>(null);

  const isPosting = createPostMutation.isPending;

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

    const videoUri = result.assets[0].uri;
    let thumbnailUri: string | undefined;

    try {
      const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
        time: 1000,
      });
      thumbnailUri = uri;
    } catch (e) {
      console.error("Failed to generate thumbnail:", e);
    }

    setMediaItems([{ uri: videoUri, type: "video" as const, thumbnailUri }]);
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

  const handleGifSelect = (url: string) => {
    setMediaItems((prev) =>
      [...prev, { uri: url, type: "gif" as const }].slice(0, 4),
    );
    setShowGifPicker(false);
  };

  const removeMedia = (index: number) =>
    setMediaItems((prev) => prev.filter((_, i) => i !== index));

  const handlePost = async () => {
    if (!canPost || isOverLimit) return;

    // ✅ Check auth before posting
    const currentUser = auth().currentUser;
    if (!currentUser) {
      Alert.alert("Session Expired", "Please sign in again.");
      router.replace("/(auth)/login");
      return;
    }

    try {
      if (mediaItems.length > 0)
        setUploadProgress(
          `Uploading ${mediaItems.length} file${mediaItems.length > 1 ? "s" : ""}...`,
        );

      // ✅ FIX: mutateAsync triggers optimistic insert in useCreatePost
      // The post appears at the top of the home feed instantly
      await createPostMutation.mutateAsync({
        title: title.trim() || undefined,
        content: bodyText.trim(),
        media: mediaItems.map((m, i) => ({
          id: `${Date.now()}_${i}`,
          uri: m.uri,
          type: m.type,
        })) as any,
        visibility,
        location: location ?? undefined,
      });

      router.back();
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to create post.");
    } finally {
      setUploadProgress("");
    }
  };

  return (
    <>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={["top"]}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={0}
        >
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
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <TextInput
                style={[styles.titleInput, { color: colors.text }]}
                placeholder="Title"
                placeholderTextColor={colors.placeholder}
                value={title}
                onChangeText={setTitle}
                returnKeyType="next"
                onSubmitEditing={() => inputRef.current?.focus()}
              />
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

              {detectedHashtags.length > 0 && (
                <Text style={[styles.hashtagInline, { color: colors.primary }]}>
                  {detectedHashtags.map((t) => `#${t}`).join("  ")}
                </Text>
              )}

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
                        source={{
                          uri: m.type === "video" ? m.thumbnailUri : m.uri,
                        }}
                        style={styles.mediaImage}
                      />
                      {m.type === "video" && (
                        <View style={styles.videoBadge}>
                          <Ionicons name="play-circle" size={28} color="#fff" />
                        </View>
                      )}
                      {m.type === "gif" && (
                        <View
                          style={[
                            styles.gifBadge,
                            { backgroundColor: colors.primary },
                          ]}
                        >
                          <Text style={styles.gifBadgeText}>GIF</Text>
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

              <View style={[styles.toolbar, { borderTopColor: colors.border }]}>
                <View style={styles.toolbarLeft}>
                  <TouchableOpacity style={styles.toolBtn} onPress={pickImages}>
                    <Ionicons
                      name="image-outline"
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
                      name="videocam-outline"
                      size={22}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.toolBtn,
                      styles.gifBtn,
                      { borderColor: colors.primary + "50" },
                    ]}
                    onPress={() => setShowGifPicker(true)}
                  >
                    <Text
                      style={[styles.gifBtnText, { color: colors.primary }]}
                    >
                      GIF
                    </Text>
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

            <View
              style={[styles.optionsCard, { backgroundColor: colors.card }]}
            >
              <TouchableOpacity
                style={[styles.optionRow, { borderBottomColor: colors.border }]}
                onPress={() => setShowLocationPicker(true)}
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
                  {location ? location.name : "Add Location"}
                </Text>
                <View style={styles.optionRight}>
                  {location && (
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation?.();
                        setLocation(null);
                      }}
                      hitSlop={8}
                      style={[
                        styles.clearLocation,
                        { backgroundColor: colors.surface },
                      ]}
                    >
                      <Ionicons
                        name="close"
                        size={14}
                        color={colors.textTertiary}
                      />
                    </TouchableOpacity>
                  )}
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={colors.textTertiary}
                  />
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.optionRow, { borderBottomWidth: 0 }]}
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
            </View>

            {uploadProgress !== "" && (
              <Text
                style={[styles.uploadProgress, { color: colors.textSecondary }]}
              >
                {uploadProgress}
              </Text>
            )}

            <View style={{ height: 120 }} />
          </ScrollView>

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

      <GifPicker
        visible={showGifPicker}
        onSelect={handleGifSelect}
        onClose={() => setShowGifPicker(false)}
      />

      <LocationPicker
        visible={showLocationPicker}
        onSelect={(place) => setLocation(place)}
        onClose={() => setShowLocationPicker(false)}
        colors={colors}
      />
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
  card: { borderRadius: 16, padding: 16, marginBottom: 12, marginTop: 8 },
  titleInput: {
    fontSize: 18,
    fontWeight: "700",
    paddingVertical: 8,
    marginBottom: 4,
  },
  bodyInput: { fontSize: 15, lineHeight: 22, minHeight: 100, paddingTop: 4 },
  hashtagInline: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 6,
    lineHeight: 18,
    letterSpacing: 0.2,
  },
  mediaGrid: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 12 },
  mediaThumb: {
    width: "48%",
    height: 120,
    borderRadius: 10,
    overflow: "hidden",
    position: "relative",
  },
  mediaThumbFull: { width: "100%", height: 200 },
  mediaImage: { width: "100%", height: "100%" },
  videoBadge: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  gifBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  gifBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.5,
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
  toolbarLeft: { flexDirection: "row", gap: 4, alignItems: "center" },
  toolBtn: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  gifBtn: { borderWidth: 1, borderRadius: 8, width: 42, height: 30 },
  gifBtnText: { fontSize: 12, fontWeight: "900", letterSpacing: 0.5 },
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
  optionRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  clearLocation: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
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
