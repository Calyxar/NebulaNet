// app/story/[id].tsx — FIREBASE ✅ COMPLETED + REWRITTEN
// ✅ Multi-segment progress bars — one per story in the user's active set
// ✅ Smooth JS-driven progress (50ms tick, pause-safe elapsed tracking)
// ✅ Pause on press-and-hold (both nav zones), resume on release
// ✅ Header: avatar + ring, display name, time-ago, mute toggle (video), close
// ✅ Full-screen image + video (COVER resize)
// ✅ Text stories: full-screen gradient background + HashtagText + large caption
// ✅ Caption overlay at bottom of image/video stories with HashtagText
// ✅ Left 30% tap = prev, right 70% tap = next
// ✅ Reply input + 5 quick-reaction emojis (KeyboardAvoidingView, iOS + Android)
// ✅ Seen viewers slide-up bottom sheet (owner only, fetchStorySeenViewers)
// ✅ sendStoryReply connected to Firestore
// ✅ markStorySeen called on every story index change
// ✅ ReturnType<typeof setInterval> — no NodeJS.Timeout

import HashtagText from "@/components/post/HashtagText";
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
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
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

/* =========================
   CONSTANTS
========================= */

const { width: W, height: H } = Dimensions.get("window");
const IMAGE_DURATION_MS = 6000;
const TICK_MS = 50;

// Gradient palettes for text stories — picked deterministically from story ID
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

/* =========================
   HELPERS
========================= */

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

/* =========================
   SEEN VIEWERS SHEET
========================= */

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
      {/* Dim backdrop */}
      <Pressable style={styles.sheetBackdrop} onPress={onClose} />

      <Animated.View
        style={[
          styles.sheetContainer,
          { paddingBottom: insetBottom + 16, transform: [{ translateY }] },
        ]}
      >
        {/* Handle */}
        <View style={styles.sheetHandle} />

        {/* Title */}
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

/* =========================
   MAIN SCREEN
========================= */

export default function StoryViewerScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const storyId = typeof id === "string" ? id.trim() : null;
  const insets = useSafeAreaInsets();

  /* ---------- data state ---------- */
  const [loading, setLoading] = useState(true);
  const [stories, setStories] = useState<StoryRow[]>([]);
  const [index, setIndex] = useState(0);

  /* ---------- progress state ---------- */
  const [segmentProgress, setSegmentProgress] = useState(0); // 0 to 1
  const pausedRef = useRef(false);
  const elapsedRef = useRef(0);
  const durationRef = useRef(IMAGE_DURATION_MS);
  const lastTickRef = useRef(Date.now());
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ---------- video state ---------- */
  const [muted, setMuted] = useState(true);
  const videoDurationRef = useRef<number | null>(null);

  /* ---------- reply state ---------- */
  const [reply, setReply] = useState("");
  const [isSending, setIsSending] = useState(false);
  const replyRef = useRef<TextInput>(null);

  /* ---------- owner / seen viewers ---------- */
  const [isOwner, setIsOwner] = useState(false);
  const [seenOpen, setSeenOpen] = useState(false);
  const [seenLoading, setSeenLoading] = useState(false);
  const [seenViewers, setSeenViewers] = useState<StorySeenViewer[]>([]);

  const current = stories[index] ?? null;

  /* =========================
     PROGRESS TICK
     Single interval runs for the lifetime of the screen.
     It reads pausedRef and elapsedRef so it doesn't need to
     restart on pause/resume — just skips ticking while paused.
  ========================= */

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
        // Don't advance, but update lastTick so resume doesn't jump
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
        // goNext is defined below — we use a ref to avoid stale closure
        goNextRef.current?.();
      }
    }, TICK_MS);
  }, [stopTick]);

  /* =========================
     NAVIGATION
  ========================= */

  // Use a ref so startTick's interval closure can call goNext without stale capture
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

  // Keep goNextRef current
  useEffect(() => {
    goNextRef.current = goNext;
  }, [goNext]);

  /* =========================
     PRESS TO PAUSE / RESUME
  ========================= */

  const handlePressIn = useCallback(() => {
    pausedRef.current = true;
  }, []);

  const handlePressOut = useCallback(() => {
    pausedRef.current = false;
    lastTickRef.current = Date.now(); // prevent elapsed jump
  }, []);

  /* =========================
     LOAD STORIES ON MOUNT
  ========================= */

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

  /* =========================
     ON STORY INDEX CHANGE
  ========================= */

  useEffect(() => {
    if (!current) return;

    // Mark seen
    markStorySeen(current.id).catch(() => {});

    // Reset progress
    elapsedRef.current = 0;
    videoDurationRef.current = null;
    setSegmentProgress(0);
    pausedRef.current = false;

    // Images: start immediately. Videos: wait for onLoad to set duration.
    if (current.media_type !== "video") {
      durationRef.current = IMAGE_DURATION_MS;
      startTick();
    }
    // For video: startTick is called in onLoad handler below

    return stopTick;
  }, [current?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  /* =========================
     SEEN VIEWERS
  ========================= */

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

  /* =========================
     REPLY
  ========================= */

  const handleSendReply = async () => {
    if (!current || !reply.trim() || isSending) return;
    const text = reply.trim();
    setIsSending(true);
    try {
      await sendStoryReply(current.id, text);
      setReply("");
    } catch {
      // silent
    } finally {
      setIsSending(false);
    }
  };

  const handleQuickReaction = async (emoji: string) => {
    if (!current || isSending) return;
    try {
      await sendStoryReply(current.id, emoji);
    } catch {
      // silent
    }
  };

  /* =========================
     VIDEO ON LOAD
  ========================= */

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

  /* =========================
     LOADING SCREEN
  ========================= */

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
      {/* =========================
          FULL-SCREEN MEDIA or TEXT STORY
      ========================= */}

      {isTextStory ? (
        // Text story: full-screen gradient with centered text
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

      {/* Dark gradient overlay — top and bottom for readability */}
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

      {/* =========================
          CAPTION OVERLAY (image/video stories only)
      ========================= */}

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

      {/* =========================
          SAFE AREA CHROME (progress bars + header)
      ========================= */}

      <SafeAreaView style={styles.chrome} edges={["top", "left", "right"]}>
        {/* Progress bars */}
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

        {/* Header */}
        <View style={styles.header}>
          {/* Avatar */}
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

          {/* Name + time */}
          <View style={styles.nameBlock}>
            <Text style={styles.displayName} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={styles.timeAgo}>{timeAgo(current.created_at)}</Text>
          </View>

          {/* Right actions */}
          <View style={styles.headerActions}>
            {/* Seen count — owner only */}
            {isOwner && (
              <TouchableOpacity
                style={styles.headerBtn}
                onPress={openSeen}
                activeOpacity={0.85}
              >
                <Ionicons name="eye-outline" size={22} color="#fff" />
              </TouchableOpacity>
            )}

            {/* Mute toggle — video only */}
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

            {/* Close */}
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

      {/* =========================
          TAP / HOLD NAVIGATION ZONES
          Left 30% = prev, Right 70% = next
          onPressIn pauses, onPressOut resumes
          onPress navigates
      ========================= */}

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

      {/* =========================
          REPLY INPUT + QUICK REACTIONS
      ========================= */}

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.replyKAV}
        keyboardVerticalOffset={0}
      >
        <View
          style={[
            styles.replyContainer,
            { paddingBottom: insets.bottom > 0 ? insets.bottom : 16 },
          ]}
        >
          {/* Quick reactions */}
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

          {/* Text input row */}
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
              onFocus={() => {
                // Pause while keyboard is open
                pausedRef.current = true;
              }}
              onBlur={() => {
                pausedRef.current = false;
                lastTickRef.current = Date.now();
              }}
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
      </KeyboardAvoidingView>

      {/* =========================
          SEEN VIEWERS BOTTOM SHEET
      ========================= */}

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

/* =========================
   STYLES
========================= */

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#000" },
  loadingScreen: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },

  // Chrome (progress + header) — sits on top of media via absolute inside SafeAreaView
  chrome: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 10 },

  // Progress bars
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

  // Header
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

  // Text story
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

  // Caption overlay
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

  // Tap zones — cover the full screen height, below chrome
  tapZone: { position: "absolute", top: 0, bottom: 0, zIndex: 8 },
  tapZoneLeft: { left: 0, width: W * 0.3 },
  tapZoneRight: { right: 0, width: W * 0.7 },

  // Reply area
  replyKAV: {
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
  replyInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
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

  // Seen viewers sheet
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
  sheetUsername: { color: "rgba(255,255,255,0.5)", fontSize: 12, marginTop: 1 },
  sheetTime: { color: "rgba(255,255,255,0.4)", fontSize: 12 },
});
