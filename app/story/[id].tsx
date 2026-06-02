// app/story/[id].tsx — ✅ FIXED: keyboard no longer kicks user out on Android
import HashtagText from "@/components/post/HashtagText";
import { useDeleteStory } from "@/hooks/useStories";
import { auth } from "@/lib/firebase";
import {
  fetchActiveStoriesByUser,
  fetchStoryById,
  fetchStorySeenViewers,
  markStorySeen,
  sendStoryReply,
  type StoryRow,
  type StorySeenViewer,
} from "@/lib/firestore/stories";
import { Ionicons } from "@expo/vector-icons";
import { ResizeMode, Video } from "expo-av";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type KeyboardEvent,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

const { width: W, height: H } = Dimensions.get("window");
const IMAGE_DURATION_MS = 6000;
const TICK_MS = 50;

const TEXT_GRADIENTS: [string, string][] = [
  ["#667eea", "#764ba2"],
  ["#f093fb", "#f5576c"],
  ["#4facfe", "#00f2fe"],
  ["#43e97b", "#38f9d7"],
  ["#fa709a", "#fee140"],
  ["#a18cd1", "#fbc2eb"],
  ["#ff9a9e", "#fad0c4"],
  ["#ffecd2", "#fcb69f"],
];

function getTextGradient(id: string): [string, string] {
  const idx = (id.charCodeAt(0) ?? 0) % TEXT_GRADIENTS.length;
  return TEXT_GRADIENTS[idx];
}

function timeAgo(dateString?: string | null): string {
  if (!dateString) return "";
  const diff = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function SeenViewersSheet({
  visible,
  viewers,
  loading,
  onClose,
  insetBottom,
}: {
  visible: boolean;
  viewers: StorySeenViewer[];
  loading: boolean;
  onClose: () => void;
  insetBottom: number;
}) {
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: visible ? 1 : 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  }, [visible, slideAnim]);

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [H * 0.6, 0],
  });

  if (!visible) return null;

  return (
    <Modal
      transparent
      animationType="none"
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable style={styles.sheetBackdrop} onPress={onClose} />
      <Animated.View
        style={[
          styles.sheetContainer,
          { paddingBottom: insetBottom + 16, transform: [{ translateY }] },
        ]}
      >
        <View style={styles.sheetHandle} />
        <View style={styles.sheetHeader}>
          <Ionicons name="eye-outline" size={18} color="#fff" />
          <Text style={styles.sheetTitle}>
            {loading
              ? "Loading…"
              : `${viewers.length} viewer${viewers.length !== 1 ? "s" : ""}`}
          </Text>
        </View>
        {loading ? (
          <ActivityIndicator color="#fff" style={{ marginTop: 24 }} />
        ) : viewers.length === 0 ? (
          <Text style={styles.sheetEmpty}>No viewers yet</Text>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 8 }}
          >
            {viewers.map((v) => {
              const name =
                v.profile?.full_name || v.profile?.username || "User";
              return (
                <View key={v.viewer_id} style={styles.sheetRow}>
                  {v.profile?.avatar_url ? (
                    <Image
                      source={{ uri: v.profile.avatar_url }}
                      style={styles.sheetAvatar}
                    />
                  ) : (
                    <View style={styles.sheetAvatarPlaceholder}>
                      <Text style={styles.sheetAvatarText}>
                        {(name[0] || "U").toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.sheetName} numberOfLines={1}>
                      {name}
                    </Text>
                    {v.profile?.username && (
                      <Text style={styles.sheetUsername} numberOfLines={1}>
                        @{v.profile.username}
                      </Text>
                    )}
                  </View>
                  <Text style={styles.sheetTime}>{timeAgo(v.seen_at)}</Text>
                </View>
              );
            })}
          </ScrollView>
        )}
      </Animated.View>
    </Modal>
  );
}

export default function StoryViewerScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const storyId = typeof id === "string" ? id.trim() : null;
  const insets = useSafeAreaInsets();
  const deleteStory = useDeleteStory();

  const [loading, setLoading] = useState(true);
  const [stories, setStories] = useState<StoryRow[]>([]);
  const [index, setIndex] = useState(0);

  const [segmentProgress, setSegmentProgress] = useState(0);
  const pausedRef = useRef(false);
  const elapsedRef = useRef(0);
  const durationRef = useRef(IMAGE_DURATION_MS);
  const lastTickRef = useRef(Date.now());
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [muted, setMuted] = useState(true);
  const videoDurationRef = useRef<number | null>(null);

  const [reply, setReply] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const replyRef = useRef<TextInput>(null);

  const [isOwner, setIsOwner] = useState(false);
  const [seenOpen, setSeenOpen] = useState(false);
  const [seenLoading, setSeenLoading] = useState(false);
  const [seenViewers, setSeenViewers] = useState<StorySeenViewer[]>([]);

  const current = stories[index] ?? null;

  // ✅ Keyboard listener — moves reply bar up without resizing screen
  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const show = Keyboard.addListener(showEvent, (e: KeyboardEvent) => {
      setKeyboardOffset(e.endCoordinates.height);
      pausedRef.current = true;
    });
    const hide = Keyboard.addListener(hideEvent, () => {
      setKeyboardOffset(0);
      pausedRef.current = false;
      lastTickRef.current = Date.now();
    });

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const stopTick = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  const startTick = useCallback(() => {
    stopTick();
    lastTickRef.current = Date.now();
    tickRef.current = setInterval(() => {
      if (pausedRef.current) {
        lastTickRef.current = Date.now();
        return;
      }
      const now = Date.now();
      const delta = now - lastTickRef.current;
      lastTickRef.current = now;
      elapsedRef.current = Math.min(
        elapsedRef.current + delta,
        durationRef.current,
      );
      const pct = elapsedRef.current / durationRef.current;
      setSegmentProgress(pct);
      if (pct >= 1) {
        stopTick();
        goNextRef.current?.();
      }
    }, TICK_MS);
  }, [stopTick]);

  const goNextRef = useRef<(() => void) | null>(null);

  const goNext = useCallback(() => {
    stopTick();
    setSegmentProgress(0);
    elapsedRef.current = 0;
    setIndex((i) => {
      if (i + 1 >= stories.length) {
        router.back();
        return i;
      }
      return i + 1;
    });
  }, [stories.length, stopTick]);

  const goPrev = useCallback(() => {
    stopTick();
    setSegmentProgress(0);
    elapsedRef.current = 0;
    setIndex((i) => Math.max(0, i - 1));
  }, [stopTick]);

  useEffect(() => {
    goNextRef.current = goNext;
  }, [goNext]);

  const handlePressIn = useCallback(() => {
    pausedRef.current = true;
  }, []);

  const handlePressOut = useCallback(() => {
    pausedRef.current = false;
    lastTickRef.current = Date.now();
  }, []);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!storyId) {
        Alert.alert("Invalid story");
        router.back();
        return;
      }
      try {
        setLoading(true);
        const story = await fetchStoryById(storyId);
        if (!story) {
          Alert.alert("Story not found");
          router.back();
          return;
        }
        const list = await fetchActiveStoriesByUser(story.user_id);
        if (!mounted) return;
        const idx = list.findIndex((s) => s.id === story.id);
        setStories(list);
        setIndex(idx >= 0 ? idx : 0);
        setIsOwner(auth.currentUser?.uid === story.user_id);
      } catch (e: any) {
        Alert.alert("Error", e?.message ?? "Failed to load story");
        router.back();
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
      stopTick();
    };
  }, [storyId, stopTick]);

  useEffect(() => {
    if (!current) return;
    markStorySeen(current.id).catch(() => {});
    elapsedRef.current = 0;
    videoDurationRef.current = null;
    setSegmentProgress(0);
    pausedRef.current = false;
    if (current.media_type !== "video") {
      durationRef.current = IMAGE_DURATION_MS;
      startTick();
    }
    return stopTick;
  }, [current?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = useCallback(() => {
    if (!current) return;
    pausedRef.current = true;
    Alert.alert("Delete story?", "This story will be permanently deleted.", [
      {
        text: "Cancel",
        style: "cancel",
        onPress: () => {
          pausedRef.current = false;
          lastTickRef.current = Date.now();
        },
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteStory.mutateAsync(current.id);
            router.back();
          } catch (e: any) {
            Alert.alert("Error", e?.message || "Failed to delete story.");
            pausedRef.current = false;
            lastTickRef.current = Date.now();
          }
        },
      },
    ]);
  }, [current, deleteStory]);

  const openSeen = async () => {
    if (!current || !isOwner) return;
    setSeenOpen(true);
    setSeenLoading(true);
    try {
      const viewers = await fetchStorySeenViewers(current.id);
      setSeenViewers(viewers);
    } catch {
      setSeenViewers([]);
    } finally {
      setSeenLoading(false);
    }
  };

  const handleSendReply = async () => {
    if (!current || !reply.trim() || isSending) return;
    const text = reply.trim();
    setIsSending(true);
    try {
      await sendStoryReply(current.id, text);
      setReply("");
      Keyboard.dismiss();
    } catch {
      /* silent */
    } finally {
      setIsSending(false);
    }
  };

  const handleQuickReaction = async (emoji: string) => {
    if (!current || isSending) return;
    try {
      await sendStoryReply(current.id, emoji);
    } catch {
      /* silent */
    }
  };

  const handleVideoLoad = useCallback(
    (status: any) => {
      const durationMs =
        typeof status?.durationMillis === "number"
          ? status.durationMillis
          : null;
      if (durationMs && durationMs > 0) {
        durationRef.current = durationMs;
        videoDurationRef.current = durationMs;
        elapsedRef.current = 0;
        startTick();
      }
    },
    [startTick],
  );

  if (loading || !current) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator color="#7C3AED" size="large" />
      </View>
    );
  }

  const profile = current.profiles;
  const displayName = profile?.full_name || profile?.username || "Story";
  const isTextStory = current.media_type !== "video" && !current.media_url;
  const gradientColors = getTextGradient(current.id);

  return (
    <View style={styles.screen}>
      {/* Media */}
      {isTextStory ? (
        <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill}>
          <View style={styles.textStoryContent}>
            {current.caption ? (
              <HashtagText
                text={current.caption}
                style={styles.textStoryText}
                hashtagStyle={styles.textStoryHashtag}
              />
            ) : (
              <Text style={styles.textStoryText}>No content</Text>
            )}
          </View>
        </LinearGradient>
      ) : current.media_type === "video" ? (
        <Video
          source={{ uri: current.media_url }}
          style={StyleSheet.absoluteFill}
          resizeMode={ResizeMode.COVER}
          shouldPlay={!pausedRef.current}
          isMuted={muted}
          isLooping={false}
          onLoad={handleVideoLoad}
        />
      ) : (
        <Image
          source={{ uri: current.media_url }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      )}

      {/* Gradient overlay */}
      <LinearGradient
        colors={[
          "rgba(0,0,0,0.55)",
          "transparent",
          "transparent",
          "rgba(0,0,0,0.65)",
        ]}
        locations={[0, 0.2, 0.6, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Caption overlay */}
      {!isTextStory && !!current.caption && (
        <View
          style={[styles.captionOverlay, { bottom: 130 + insets.bottom }]}
          pointerEvents="none"
        >
          <HashtagText
            text={current.caption}
            style={styles.captionText}
            hashtagStyle={styles.captionHashtag}
          />
        </View>
      )}

      {/* Progress + header chrome */}
      <SafeAreaView style={styles.chrome} edges={["top", "left", "right"]}>
        <View style={styles.progressRow}>
          {stories.map((s, i) => {
            const fill = i < index ? 1 : i === index ? segmentProgress : 0;
            return (
              <View key={s.id} style={styles.progressTrack}>
                <View
                  style={[styles.progressFill, { width: `${fill * 100}%` }]}
                />
              </View>
            );
          })}
        </View>

        <View style={styles.header}>
          <TouchableOpacity
            style={styles.avatarWrap}
            activeOpacity={0.85}
            onPress={() =>
              profile?.username
                ? router.push(`/user/${profile.username}`)
                : undefined
            }
          >
            <View style={styles.avatarRing}>
              {profile?.avatar_url ? (
                <Image
                  source={{ uri: profile.avatar_url }}
                  style={styles.avatar}
                />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarFallbackText}>
                    {(displayName[0] || "U").toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>

          <View style={styles.nameBlock}>
            <Text style={styles.displayName} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={styles.timeAgo}>{timeAgo(current.created_at)}</Text>
          </View>

          <View style={styles.headerActions}>
            {isOwner && (
              <TouchableOpacity
                style={styles.headerBtn}
                onPress={openSeen}
                activeOpacity={0.85}
              >
                <Ionicons name="eye-outline" size={22} color="#fff" />
              </TouchableOpacity>
            )}
            {isOwner && (
              <TouchableOpacity
                style={styles.headerBtn}
                onPress={handleDelete}
                disabled={deleteStory.isPending}
                activeOpacity={0.85}
              >
                {deleteStory.isPending ? (
                  <ActivityIndicator size={18} color="#fff" />
                ) : (
                  <Ionicons name="trash-outline" size={22} color="#fff" />
                )}
              </TouchableOpacity>
            )}
            {current.media_type === "video" && (
              <TouchableOpacity
                style={styles.headerBtn}
                onPress={() => setMuted((m) => !m)}
                activeOpacity={0.85}
              >
                <Ionicons
                  name={muted ? "volume-mute" : "volume-medium"}
                  size={22}
                  color="#fff"
                />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={() => router.back()}
              activeOpacity={0.85}
            >
              <Ionicons name="close" size={26} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      {/* Tap zones */}
      <Pressable
        style={[styles.tapZone, styles.tapZoneLeft]}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={goPrev}
      />
      <Pressable
        style={[styles.tapZone, styles.tapZoneRight]}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={goNext}
      />

      {/* ✅ Reply bar — Keyboard listener moves it up, no KAV needed */}
      <Animated.View style={[styles.replyBar, { bottom: keyboardOffset }]}>
        <View
          style={[
            styles.replyContainer,
            {
              paddingBottom:
                keyboardOffset > 0
                  ? 12
                  : insets.bottom > 0
                    ? insets.bottom
                    : 16,
            },
          ]}
        >
          <View style={styles.reactionsRow}>
            {["❤️", "😂", "😮", "😢", "👏"].map((emoji) => (
              <TouchableOpacity
                key={emoji}
                style={styles.reactionBtn}
                onPress={() => void handleQuickReaction(emoji)}
                activeOpacity={0.8}
                disabled={isSending}
              >
                <Text style={styles.reactionText}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.replyInputRow}>
            <TextInput
              ref={replyRef}
              style={styles.replyInput}
              value={reply}
              onChangeText={setReply}
              placeholder="Send a reply…"
              placeholderTextColor="rgba(255,255,255,0.5)"
              returnKeyType="send"
              onSubmitEditing={handleSendReply}
              editable={!isSending}
              multiline={false}
            />
            <TouchableOpacity
              style={[
                styles.sendBtn,
                (!reply.trim() || isSending) && { opacity: 0.4 },
              ]}
              onPress={handleSendReply}
              disabled={!reply.trim() || isSending}
              activeOpacity={0.85}
            >
              {isSending ? (
                <ActivityIndicator size={18} color="#fff" />
              ) : (
                <Ionicons name="send" size={20} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      <SeenViewersSheet
        visible={seenOpen}
        viewers={seenViewers}
        loading={seenLoading}
        onClose={() => setSeenOpen(false)}
        insetBottom={insets.bottom}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#000" },
  loadingScreen: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  chrome: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 10 },
  progressRow: {
    flexDirection: "row",
    gap: 4,
    marginHorizontal: 12,
    marginTop: 8,
  },
  progressTrack: {
    flex: 1,
    height: 3,
    backgroundColor: "rgba(255,255,255,0.35)",
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: { height: 3, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 6,
    gap: 10,
  },
  avatarWrap: {},
  avatarRing: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.85)",
    overflow: "hidden",
  },
  avatar: { width: "100%", height: "100%" },
  avatarFallback: {
    flex: 1,
    backgroundColor: "#7C3AED",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarFallbackText: { color: "#fff", fontWeight: "900", fontSize: 15 },
  nameBlock: { flex: 1, minWidth: 0 },
  displayName: { color: "#fff", fontWeight: "900", fontSize: 14.5 },
  timeAgo: { color: "rgba(255,255,255,0.65)", fontSize: 11.5, marginTop: 1 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 4 },
  headerBtn: { padding: 7 },
  textStoryContent: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  textStoryText: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "900",
    textAlign: "center",
    lineHeight: 36,
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  textStoryHashtag: {
    color: "rgba(255,255,255,0.85)",
    fontWeight: "900",
    textDecorationLine: "underline",
  },
  captionOverlay: {
    position: "absolute",
    left: 16,
    right: 16,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    zIndex: 5,
  },
  captionText: {
    color: "#fff",
    fontSize: 15,
    lineHeight: 21,
    textAlign: "center",
  },
  captionHashtag: { color: "#60CDFF", fontWeight: "800" },
  tapZone: { position: "absolute", top: 0, bottom: 0, zIndex: 8 },
  tapZoneLeft: { left: 0, width: W * 0.3 },
  tapZoneRight: { right: 0, width: W * 0.7 },
  // ✅ Keyboard listener drives bottom offset — no KAV needed
  replyBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  replyContainer: {
    backgroundColor: "rgba(0,0,0,0.72)",
    paddingTop: 10,
    paddingHorizontal: 14,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    gap: 8,
  },
  reactionsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
    marginBottom: 4,
  },
  reactionBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  reactionText: { fontSize: 21 },
  replyInputRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  replyInput: {
    flex: 1,
    height: 44,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 22,
    paddingHorizontal: 16,
    color: "#fff",
    fontSize: 15,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#7C3AED",
    alignItems: "center",
    justifyContent: "center",
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheetContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#1A1A2E",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 16,
    maxHeight: H * 0.55,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 999,
    alignSelf: "center",
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  sheetTitle: { color: "#fff", fontWeight: "900", fontSize: 15 },
  sheetEmpty: {
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
    marginTop: 24,
    marginBottom: 24,
  },
  sheetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  sheetAvatar: { width: 40, height: 40, borderRadius: 20 },
  sheetAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#7C3AED",
    alignItems: "center",
    justifyContent: "center",
  },
  sheetAvatarText: { color: "#fff", fontWeight: "900", fontSize: 15 },
  sheetName: { color: "#fff", fontWeight: "800", fontSize: 14 },
  sheetUsername: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    marginTop: 1,
  },
  sheetTime: { color: "rgba(255,255,255,0.4)", fontSize: 12 },
});
