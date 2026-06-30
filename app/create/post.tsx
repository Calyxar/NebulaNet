// app/create/post.tsx ✅ FIXED + REDESIGNED
// Fix 1: LocationPicker uses KeyboardAvoidingView so keyboard doesn't cover results
// Fix 2: Google Places URL uses URLSearchParams (no pipe encoding issues)
// Fix 3: Places API error surfaced to user instead of silently returning empty
// Fix 4: Community list refetches every time this screen comes into focus,
//         instead of trusting whatever React Query already had cached —
//         fixes the picker showing empty/stale after joining a community
//         in a different screen or session.
// ✅ NEW: poster's avatar now shown next to the compose box (Twitter/
//         Bluesky always show this — confirms which account you're
//         posting as, which matters given the dev/gaming identity split).
// ✅ NEW: visibility moved from a full-width options-list row into a
//         small pill next to the avatar, matching Twitter/Bluesky's
//         audience selector placement. Location and NSFW stay as list
//         rows below — those aren't Twitter concepts, so there's no
//         reference pattern worth copying for them.
// ✅ NEW: character count is now a small ring grouped directly next to
//         the Post button instead of sitting isolated on the far left.

import GifPicker from "@/components/post/GifPicker";
import { useAuth } from "@/hooks/useAuth";
import { useCommunities } from "@/hooks/useCommunities";
import { useCreatePost } from "@/hooks/usePosts";
import { auth } from "@/lib/firebase";
import { extractHashtags } from "@/lib/firestore/hashtags";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { router, useFocusEffect } from "expo-router";
import * as VideoThumbnails from "expo-video-thumbnails";
import React, { useCallback, useMemo, useRef, useState } from "react";
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
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

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

const EXPLICIT_KEYWORDS = [
  "nsfw",
  "nude",
  "naked",
  "porn",
  "sex",
  "xxx",
  "adult content",
  "explicit",
  "18+",
  "onlyfans",
  "slutty",
  "horny",
];

function containsExplicitText(text: string): boolean {
  const lower = text.toLowerCase();
  return EXPLICIT_KEYWORDS.some((kw) => lower.includes(kw));
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ✅ NEW: small avatar shown next to the compose box, same pattern used
// on the post detail screen and home feed.
function ComposerAvatar({
  uri,
  name,
  fallbackColor,
}: {
  uri?: string | null;
  name: string;
  fallbackColor: string;
}) {
  if (uri) return <Image source={{ uri }} style={styles.composerAvatar} />;
  return (
    <View
      style={[
        styles.composerAvatar,
        styles.composerAvatarFallback,
        { backgroundColor: fallbackColor },
      ]}
    >
      <Text style={styles.composerAvatarText}>{getInitials(name || "?")}</Text>
    </View>
  );
}

// ✅ FIX 1 & 2: LocationPicker with KeyboardAvoidingView + proper Places URL
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
  const [apiError, setApiError] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = async (text: string) => {
    if (text.length < 2) {
      setResults([]);
      setApiError("");
      return;
    }
    setLoading(true);
    setApiError("");
    try {
      // ✅ FIX 2: URLSearchParams handles encoding correctly — no pipe issues
      const params = new URLSearchParams({
        input: text,
        key: PLACES_API_KEY,
      });
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params}`,
      );
      const json = await res.json();

      // ✅ FIX 3: surface API errors to user
      if (json.status === "REQUEST_DENIED") {
        setApiError(
          "Location search unavailable — check API key configuration.",
        );
        setResults([]);
      } else if (json.status === "ZERO_RESULTS") {
        setResults([]);
      } else {
        setResults(json.predictions ?? []);
      }
    } catch {
      setApiError("Network error. Check your connection and try again.");
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
    setApiError("");
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
      {/* ✅ FIX 1: KeyboardAvoidingView lifts the sheet above the keyboard */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "position" : "height"}
        keyboardVerticalOffset={0}
      >
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
              returnKeyType="search"
              onSubmitEditing={() => search(query)}
            />
            {!!query && (
              <TouchableOpacity
                onPress={() => {
                  setQuery("");
                  setResults([]);
                  setApiError("");
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
          {!!apiError && (
            <Text style={[lpStyles.hint, { color: "#EF4444" }]}>
              {apiError}
            </Text>
          )}
          {!loading &&
            !apiError &&
            query.length >= 2 &&
            results.length === 0 && (
              <Text style={[lpStyles.hint, { color: colors.textTertiary }]}>
                No results found.
              </Text>
            )}

          <FlatList
            data={results}
            keyExtractor={(item) => item.place_id}
            keyboardShouldPersistTaps="handled"
            style={{ maxHeight: 280 }}
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
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function CommunityPickerModal({
  visible,
  communities,
  loading,
  onSelect,
  onClose,
  colors,
}: {
  visible: boolean;
  communities: any[];
  loading?: boolean;
  onSelect: (c: { id: string; name: string; slug: string }) => void;
  onClose: () => void;
  colors: any;
}) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={lpStyles.overlay}
        activeOpacity={1}
        onPress={onClose}
      />
      <View style={[lpStyles.sheet, { backgroundColor: colors.card }]}>
        <View style={[lpStyles.handle, { backgroundColor: colors.border }]} />
        <Text style={[lpStyles.title, { color: colors.text }]}>
          Post to Community
        </Text>
        {loading ? (
          <Text style={[lpStyles.hint, { color: colors.textTertiary }]}>
            Loading your communities...
          </Text>
        ) : communities.length === 0 ? (
          <Text style={[lpStyles.hint, { color: colors.textTertiary }]}>
            Join a community first to post there.
          </Text>
        ) : (
          <FlatList
            data={communities}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            style={{ maxHeight: 360 }}
            renderItem={({ item, index }) => (
              <TouchableOpacity
                style={[
                  lpStyles.resultRow,
                  { borderTopColor: colors.border },
                  index === 0 && { borderTopWidth: 0 },
                ]}
                onPress={() => {
                  onSelect({ id: item.id, name: item.name, slug: item.slug });
                  onClose();
                }}
                activeOpacity={0.85}
              >
                <View
                  style={[
                    lpStyles.pinCircle,
                    { backgroundColor: colors.primary + "18" },
                  ]}
                >
                  {item.image_url ? (
                    <Image
                      source={{ uri: item.image_url }}
                      style={{ width: 34, height: 34, borderRadius: 17 }}
                    />
                  ) : (
                    <Ionicons name="people" size={16} color={colors.primary} />
                  )}
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    style={[lpStyles.mainText, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
                  {!!item.description && (
                    <Text
                      style={[
                        lpStyles.secondaryText,
                        { color: colors.textTertiary },
                      ]}
                      numberOfLines={1}
                    >
                      {item.description}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            )}
          />
        )}
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

const VISIBILITY_CONFIG: Record<
  Visibility,
  { label: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  public: { label: "Everyone", icon: "earth-outline" },
  followers: { label: "Followers", icon: "people-outline" },
  private: { label: "Only Me", icon: "lock-closed-outline" },
};

export default function CreatePostScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const createPostMutation = useCreatePost();
  const { myCommunities, isLoading: communitiesLoading } = useCommunities();
  const { profile } = useAuth();
  const qc = useQueryClient();

  // ✅ FIX 4: refetch the community list every time this screen gains
  // focus, instead of trusting whatever React Query already had cached.
  // Covers the case where the user joined a community on a different
  // screen (e.g. Explore) earlier in the same app session and the
  // invalidation from that join either hadn't propagated yet or this
  // screen's query was never subscribed at the time it fired.
  useFocusEffect(
    useCallback(() => {
      qc.invalidateQueries({ queryKey: ["my-communities"] });
    }, [qc]),
  );

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
  const [isNsfw, setIsNsfw] = useState(false);
  const [selectedCommunity, setSelectedCommunity] = useState<{
    id: string;
    name: string;
    slug: string;
  } | null>(null);
  const [showCommunityPicker, setShowCommunityPicker] = useState(false);

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
  const remaining = charLimit - charCount;
  // ✅ NEW: ring color escalates as you approach/exceed the limit, same
  // visual language Twitter uses for its count ring.
  const ringColor = isOverLimit
    ? "#EF4444"
    : remaining <= 50
      ? "#F59E0B"
      : colors.border;

  const posterName = profile?.full_name || profile?.username || "You";

  const cycleVisibility = () =>
    setVisibility((v) =>
      v === "public" ? "followers" : v === "followers" ? "private" : "public",
    );

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
      quality: 0.85,
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
      quality: 0.7,
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
      console.warn("Thumbnail generation failed:", e);
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
      quality: 0.85,
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
    const currentUser = auth.currentUser;
    if (!currentUser) {
      Alert.alert("Session Expired", "Please sign in again.");
      router.replace("/(auth)/login");
      return;
    }
    const allText = `${title} ${bodyText}`.trim();
    let finalIsNsfw = isNsfw;
    if (!isNsfw && containsExplicitText(allText)) {
      finalIsNsfw = true;
      Alert.alert(
        "Content Warning",
        "Your post contains content that has been automatically marked as NSFW.",
        [{ text: "OK" }],
      );
    }
    try {
      if (mediaItems.length > 0) {
        const hasVideo = mediaItems.some((m) => m.type === "video");
        setUploadProgress(
          hasVideo
            ? "Uploading video… this may take a moment"
            : `Uploading ${mediaItems.length} file${mediaItems.length > 1 ? "s" : ""}…`,
        );
      }
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
        is_nsfw: finalIsNsfw,
        community_id: selectedCommunity?.id ?? undefined,
      } as any);
      router.back();
    } catch (e: any) {
      Alert.alert(
        "Error",
        e?.message || "Failed to create post. Please try again.",
      );
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
              disabled={isPosting}
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
            {/* ✅ NEW: poster identity row — avatar + audience pill, sits
                above the compose card instead of audience being buried in
                the options list below. */}
            <View style={styles.composerIdentityRow}>
              <ComposerAvatar
                uri={profile?.avatar_url}
                name={posterName}
                fallbackColor={colors.primary}
              />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  style={[styles.composerName, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {posterName}
                </Text>
                <TouchableOpacity
                  style={[
                    styles.visibilityPill,
                    {
                      borderColor: colors.border,
                      backgroundColor: colors.surface,
                    },
                  ]}
                  onPress={cycleVisibility}
                  disabled={isPosting}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={VISIBILITY_CONFIG[visibility].icon}
                    size={13}
                    color={colors.primary}
                  />
                  <Text
                    style={[styles.visibilityPillText, { color: colors.text }]}
                  >
                    {VISIBILITY_CONFIG[visibility].label}
                  </Text>
                  <Ionicons
                    name="chevron-down"
                    size={12}
                    color={colors.textTertiary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <TextInput
                style={[styles.titleInput, { color: colors.text }]}
                placeholder="Title"
                placeholderTextColor={colors.placeholder}
                value={title}
                onChangeText={setTitle}
                returnKeyType="next"
                onSubmitEditing={() => inputRef.current?.focus()}
                editable={!isPosting}
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
                editable={!isPosting}
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
                      {!isPosting && (
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
                      )}
                    </View>
                  ))}
                </View>
              )}

              <View style={[styles.toolbar, { borderTopColor: colors.border }]}>
                <View style={styles.toolbarLeft}>
                  <TouchableOpacity
                    style={styles.toolBtn}
                    onPress={pickImages}
                    disabled={isPosting}
                  >
                    <Ionicons
                      name="image-outline"
                      size={22}
                      color={isPosting ? colors.border : colors.textSecondary}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.toolBtn}
                    onPress={takePhoto}
                    disabled={isPosting}
                  >
                    <Ionicons
                      name="camera-outline"
                      size={22}
                      color={isPosting ? colors.border : colors.textSecondary}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.toolBtn}
                    onPress={pickVideos}
                    disabled={isPosting}
                  >
                    <Ionicons
                      name="videocam-outline"
                      size={22}
                      color={isPosting ? colors.border : colors.textSecondary}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.toolBtn,
                      styles.gifBtn,
                      { borderColor: colors.primary + "50" },
                    ]}
                    onPress={() => setShowGifPicker(true)}
                    disabled={isPosting}
                  >
                    <Text
                      style={[
                        styles.gifBtnText,
                        { color: isPosting ? colors.border : colors.primary },
                      ]}
                    >
                      GIF
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[
                    styles.communityPill,
                    {
                      borderColor: selectedCommunity
                        ? colors.primary
                        : colors.border,
                      backgroundColor: selectedCommunity
                        ? colors.primary + "18"
                        : "transparent",
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                    },
                  ]}
                  onPress={() => setShowCommunityPicker(true)}
                  disabled={isPosting}
                >
                  {selectedCommunity && (
                    <Ionicons name="people" size={13} color={colors.primary} />
                  )}
                  <Text
                    style={[
                      styles.communityPillText,
                      {
                        color: selectedCommunity
                          ? colors.primary
                          : colors.textSecondary,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {selectedCommunity ? selectedCommunity.name : "Community"}
                  </Text>
                  {selectedCommunity && (
                    <TouchableOpacity
                      onPress={() => setSelectedCommunity(null)}
                      hitSlop={8}
                    >
                      <Ionicons
                        name="close-circle"
                        size={14}
                        color={colors.primary}
                      />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <View
              style={[styles.optionsCard, { backgroundColor: colors.card }]}
            >
              {/* Location */}
              <TouchableOpacity
                style={[styles.optionRow, { borderBottomColor: colors.border }]}
                onPress={() => setShowLocationPicker(true)}
                disabled={isPosting}
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

              {/* NSFW toggle — Visibility row removed from here, now the
                  pill near the top of the screen. */}
              <TouchableOpacity
                style={[styles.optionRow, { borderBottomWidth: 0 }]}
                onPress={() => setIsNsfw((v) => !v)}
                disabled={isPosting}
              >
                <View
                  style={[
                    styles.optionIcon,
                    {
                      backgroundColor: isNsfw
                        ? "#EF4444" + "18"
                        : colors.surface,
                    },
                  ]}
                >
                  <Ionicons
                    name={isNsfw ? "eye-off" : "eye-off-outline"}
                    size={18}
                    color={isNsfw ? "#EF4444" : colors.textTertiary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.optionLabel,
                      { color: isNsfw ? "#EF4444" : colors.text, flex: 0 },
                    ]}
                  >
                    Mark as NSFW
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      color: colors.textTertiary,
                      marginTop: 2,
                    }}
                  >
                    {isNsfw
                      ? "This post is marked as adult content"
                      : "Content will be automatically scanned"}
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
            </View>

            {isNsfw && (
              <View
                style={[
                  styles.nsfwBanner,
                  {
                    backgroundColor: "#EF4444" + "12",
                    borderColor: "#EF4444" + "30",
                  },
                ]}
              >
                <Ionicons name="warning-outline" size={16} color="#EF4444" />
                <Text style={[styles.nsfwBannerText, { color: "#EF4444" }]}>
                  This post will only be visible to users who have enabled adult
                  content in their settings.
                </Text>
              </View>
            )}

            {uploadProgress !== "" && (
              <View
                style={[styles.uploadBox, { backgroundColor: colors.card }]}
              >
                <Ionicons
                  name="cloud-upload-outline"
                  size={18}
                  color={colors.primary}
                />
                <Text
                  style={[styles.uploadProgress, { color: colors.primary }]}
                >
                  {uploadProgress}
                </Text>
              </View>
            )}

            <View style={{ height: 120 }} />
          </ScrollView>

          <View
            style={[
              styles.bottomBar,
              {
                backgroundColor: colors.background,
                borderTopColor: colors.border,
                paddingBottom: Math.max(insets.bottom, 16),
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

            {/* ✅ NEW: count ring sits directly next to Post, instead of
                isolated on the far left of the bar. */}
            <View style={styles.countAndPost}>
              {charCount > 0 && (
                <View style={[styles.countRing, { borderColor: ringColor }]}>
                  <Text style={[styles.countRingText, { color: ringColor }]}>
                    {Math.abs(remaining) > 99 ? "99+" : remaining}
                  </Text>
                </View>
              )}
              <TouchableOpacity
                style={[
                  styles.postBtn,
                  (!canPost || isOverLimit) && styles.postBtnDisabled,
                ]}
                onPress={handlePost}
                disabled={!canPost || isOverLimit || isPosting}
              >
                <Text style={styles.postBtnText}>
                  {isPosting ? "Posting…" : "Post"}
                </Text>
              </TouchableOpacity>
            </View>
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
      <CommunityPickerModal
        visible={showCommunityPicker}
        communities={myCommunities}
        loading={communitiesLoading}
        onSelect={(c) => setSelectedCommunity(c)}
        onClose={() => setShowCommunityPicker(false)}
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
  // ✅ NEW: poster identity row styles
  composerIdentityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingTop: 14,
    paddingBottom: 4,
  },
  composerAvatar: { width: 40, height: 40, borderRadius: 20 },
  composerAvatarFallback: { alignItems: "center", justifyContent: "center" },
  composerAvatarText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  composerName: { fontSize: 14, fontWeight: "800", marginBottom: 4 },
  visibilityPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  visibilityPillText: { fontSize: 12, fontWeight: "700" },
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
    maxWidth: 140,
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
  nsfwBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  nsfwBannerText: { flex: 1, fontSize: 12, lineHeight: 17 },
  uploadBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  uploadProgress: { fontSize: 13, fontWeight: "600" },
  bottomBar: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    alignItems: "center",
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
  // ✅ NEW: groups the count ring with the Post button
  countAndPost: { flexDirection: "row", alignItems: "center", gap: 10 },
  countRing: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  countRingText: { fontSize: 10, fontWeight: "800" },
  postBtn: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#7C3AED",
  },
  postBtnDisabled: { opacity: 0.5 },
  postBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
