// components/stories/StoryViewer.tsx — UPDATED ✅
// Embeddable story viewer used from home feed / story rings.
// For the full-screen story route, see app/story/[id].tsx
//
// ✅ Smooth progress bar (JS interval, pause-safe elapsed tracking)
// ✅ Pause on press-and-hold
// ✅ Text stories with gradient backgrounds + HashtagText
// ✅ Caption overlay with HashtagText (tappable hashtags)
// ✅ Firebase Storage path OR direct URL — resolves automatically
// ✅ Video support via expo-av
// ✅ Quick reactions + reply input
// ✅ Theme-aware header (avatar ring, name, time, close)

import HashtagText from "@/components/post/HashtagText";
import { Ionicons } from "@expo/vector-icons";
import { ResizeMode, Video } from "expo-av";
import { LinearGradient } from "expo-linear-gradient";
import { getDownloadURL, getStorage, ref } from "firebase/storage";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

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
];

function getTextGradient(id: string): [string, string] {
  const idx = (id.charCodeAt(0) ?? 0) % TEXT_GRADIENTS.length;
  return TEXT_GRADIENTS[idx];
}

function isHttpUrl(v?: string | null) {
  return /^https?:\/\//i.test(v ?? "");
}

function timeAgo(dateString?: string): string {
  if (!dateString) return "";
  const diff = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

/* =========================
   TYPES
========================= */

export interface StoryViewerStory {
  id: string;
  username: string;
  avatar_url?: string | null;
  full_name?: string | null;
  story_content?: string | null; // text content
  story_image?: string | null; // URL or Firebase Storage path
  story_type?: "text" | "image" | "video";
  created_at?: string;
}

interface StoryViewerProps {
  story: StoryViewerStory;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  onComment: (comment: string) => Promise<boolean>;
  /** 0 to 100 — override external progress (optional; internal if omitted) */
  progress?: number;
  /** Total number of stories for this user (for segment bar) */
  totalStories?: number;
  /** Index of this story in the set */
  storyIndex?: number;
}

/* =========================
   COMPONENT
========================= */

export default function StoryViewer({
  story,
  onClose,
  onNext,
  onPrev,
  onComment,
  progress: externalProgress,
  totalStories = 1,
  storyIndex = 0,
}: StoryViewerProps) {
  const [reply, setReply] = useState("");
  const [isSending, setIsSending] = useState(false);

  /* ---------- media resolution ---------- */
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);

  /* ---------- internal progress (used if externalProgress not provided) ---------- */
  const [internalProgress, setInternalProgress] = useState(0); // 0 to 1
  const pausedRef = useRef(false);
  const elapsedRef = useRef(0);
  const durationRef = useRef(IMAGE_DURATION_MS);
  const lastTickRef = useRef(Date.now());
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const useInternalProgress = externalProgress === undefined;

  const resolvedType: "text" | "image" | "video" = (() => {
    if (story.story_type) return story.story_type;
    const v = (story.story_image ?? "").toLowerCase();
    if (v.includes("video") || v.endsWith(".mp4") || v.endsWith(".mov"))
      return "video";
    if (story.story_image) return "image";
    return "text";
  })();

  /* ---------- resolve Firebase Storage path to URL ---------- */

  useEffect(() => {
    let cancelled = false;
    const raw = story.story_image ?? null;

    setMediaError(null);
    setMediaUrl(null);

    if (!raw) return;

    if (isHttpUrl(raw)) {
      setMediaUrl(raw);
      return;
    }

    // Storage path — resolve to download URL
    setMediaLoading(true);
    getDownloadURL(ref(getStorage(), raw))
      .then((url) => {
        if (!cancelled) setMediaUrl(url);
      })
      .catch((e) => {
        if (!cancelled) setMediaError(e?.message ?? "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setMediaLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [story.story_image]);

  /* ---------- internal progress ticker ---------- */

  const stopTick = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  const startTick = useCallback(() => {
    stopTick();
    elapsedRef.current = 0;
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
      setInternalProgress(pct);
      if (pct >= 1) {
        stopTick();
        onNext();
      }
    }, TICK_MS);
  }, [stopTick, onNext]);

  useEffect(() => {
    if (!useInternalProgress) return;
    if (resolvedType !== "video") {
      durationRef.current = IMAGE_DURATION_MS;
      startTick();
    }
    return stopTick;
  }, [story.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePressIn = useCallback(() => {
    pausedRef.current = true;
  }, []);
  const handlePressOut = useCallback(() => {
    pausedRef.current = false;
    lastTickRef.current = Date.now();
  }, []);

  /* ---------- progress value to display ---------- */
  const fillPct =
    externalProgress !== undefined ? externalProgress / 100 : internalProgress;

  /* ---------- send reply ---------- */
  const handleSend = async () => {
    if (!reply.trim() || isSending) return;
    setIsSending(true);
    try {
      const ok = await onComment(reply.trim());
      if (ok) setReply("");
    } finally {
      setIsSending(false);
    }
  };

  const handleReaction = async (emoji: string) => {
    try {
      await onComment(emoji);
    } catch {}
  };

  const isTextStory = resolvedType === "text" && !story.story_image;
  const gradientColors = getTextGradient(story.id);
  const displayName = story.full_name || story.username || "Story";
  const hasCaption = !!story.story_content && !!story.story_image;

  /* ---------- build segment bar ---------- */
  const segments = Array(totalStories)
    .fill(null)
    .map((_, i) => {
      if (i < storyIndex) return 1;
      if (i === storyIndex) return fillPct;
      return 0;
    });

  return (
    <View style={styles.container}>
      {/* Full-screen media */}
      {isTextStory ? (
        <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill}>
          <View style={styles.textContent}>
            <HashtagText
              text={story.story_content ?? ""}
              style={styles.textStoryText}
              hashtagStyle={styles.textHashtag}
            />
          </View>
        </LinearGradient>
      ) : resolvedType === "video" ? (
        mediaUrl ? (
          <Video
            source={{ uri: mediaUrl }}
            style={StyleSheet.absoluteFill}
            resizeMode={ResizeMode.COVER}
            shouldPlay
            isMuted
            isLooping={false}
            onLoad={(s) => {
              const d = (s as any)?.durationMillis;
              if (d && useInternalProgress) {
                durationRef.current = d;
                startTick();
              }
            }}
          />
        ) : (
          <View
            style={[StyleSheet.absoluteFill, { backgroundColor: "#000" }]}
          />
        )
      ) : mediaUrl ? (
        <Image
          source={{ uri: mediaUrl }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "#111" }]} />
      )}

      {/* Dark gradient top + bottom */}
      <LinearGradient
        colors={[
          "rgba(0,0,0,0.55)",
          "transparent",
          "transparent",
          "rgba(0,0,0,0.6)",
        ]}
        locations={[0, 0.18, 0.65, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Media loading overlay */}
      {(mediaLoading || !!mediaError) && (
        <View style={styles.mediaOverlay}>
          {mediaLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="warning-outline" size={18} color="#fff" />
              <Text style={styles.mediaOverlayText}>{mediaError}</Text>
            </>
          )}
        </View>
      )}

      {/* Caption overlay */}
      {hasCaption && (
        <View style={styles.captionOverlay} pointerEvents="none">
          <HashtagText
            text={story.story_content!}
            style={styles.captionText}
            hashtagStyle={styles.captionHashtag}
          />
        </View>
      )}

      {/* Chrome */}
      <View style={styles.chrome}>
        {/* Segment progress bars */}
        <View style={styles.progressRow}>
          {segments.map((fill, i) => (
            <View key={i} style={styles.progressTrack}>
              <View
                style={[styles.progressFill, { width: `${fill * 100}%` }]}
              />
            </View>
          ))}
        </View>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatarRing}>
            {story.avatar_url ? (
              <Image source={{ uri: story.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarFallbackText}>
                  {(displayName[0] || "U").toUpperCase()}
                </Text>
              </View>
            )}
          </View>

          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.displayName} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={styles.timeAgo}>{timeAgo(story.created_at)}</Text>
          </View>

          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            activeOpacity={0.85}
          >
            <Ionicons name="close" size={26} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tap zones */}
      <Pressable
        style={[styles.tapZone, { left: 0, width: W * 0.3 }]}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPrev}
      />
      <Pressable
        style={[styles.tapZone, { right: 0, width: W * 0.7 }]}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onNext}
      />

      {/* Reply input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.replyKAV}
      >
        <View style={styles.replyContainer}>
          <View style={styles.reactionsRow}>
            {["❤️", "😂", "😮", "😢", "👏"].map((e) => (
              <TouchableOpacity
                key={e}
                style={styles.reactionBtn}
                onPress={() => void handleReaction(e)}
                activeOpacity={0.8}
              >
                <Text style={styles.reactionText}>{e}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.replyRow}>
            <TextInput
              style={styles.replyInput}
              value={reply}
              onChangeText={setReply}
              placeholder="Send a reply…"
              placeholderTextColor="rgba(255,255,255,0.5)"
              returnKeyType="send"
              onSubmitEditing={handleSend}
              onFocus={() => {
                pausedRef.current = true;
              }}
              onBlur={() => {
                pausedRef.current = false;
                lastTickRef.current = Date.now();
              }}
              editable={!isSending}
            />
            <TouchableOpacity
              style={[
                styles.sendBtn,
                (!reply.trim() || isSending) && { opacity: 0.4 },
              ]}
              onPress={handleSend}
              disabled={!reply.trim() || isSending}
              activeOpacity={0.85}
            >
              <Ionicons name="send" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

/* =========================
   STYLES
========================= */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },

  textContent: {
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
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  textHashtag: {
    color: "rgba(255,255,255,0.85)",
    textDecorationLine: "underline",
  },

  captionOverlay: {
    position: "absolute",
    bottom: 120,
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
    lineHeight: 20,
    textAlign: "center",
  },
  captionHashtag: { color: "#60CDFF", fontWeight: "800" },

  mediaOverlay: {
    position: "absolute",
    top: "40%",
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    zIndex: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  mediaOverlayText: { color: "#fff", fontWeight: "700" },

  chrome: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 10 },
  progressRow: {
    flexDirection: "row",
    gap: 4,
    marginHorizontal: 12,
    marginTop: 44,
  },
  progressTrack: {
    flex: 1,
    height: 3,
    backgroundColor: "rgba(255,255,255,0.3)",
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
  displayName: { color: "#fff", fontWeight: "900", fontSize: 14.5 },
  timeAgo: { color: "rgba(255,255,255,0.6)", fontSize: 11.5, marginTop: 1 },
  closeBtn: { padding: 6 },

  tapZone: { position: "absolute", top: 0, bottom: 0, zIndex: 8 },

  replyKAV: { position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 20 },
  replyContainer: {
    backgroundColor: "rgba(0,0,0,0.72)",
    paddingTop: 10,
    paddingHorizontal: 14,
    paddingBottom: Platform.OS === "ios" ? 36 : 16,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    gap: 8,
  },
  reactionsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
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
  replyRow: { flexDirection: "row", alignItems: "center", gap: 10 },
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
});
