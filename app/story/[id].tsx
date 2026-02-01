import {
    fetchActiveStoriesByUser,
    fetchStoryById,
    markStorySeen,
    sendStoryReply,
    StoryRow,
} from "@/lib/queries/stories";
import {
    fetchStorySeenViewers,
    StorySeenViewer,
} from "@/lib/queries/stories_seen";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { ResizeMode, Video } from "expo-av";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import {
    SafeAreaView,
    useSafeAreaInsets,
} from "react-native-safe-area-context";

const { width: W, height: H } = Dimensions.get("window");

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function StoryViewerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);

  // Only this user's story set
  const [stories, setStories] = useState<StoryRow[]>([]);
  const [index, setIndex] = useState(0);

  // progress for CURRENT segment (0..1)
  const [segmentProgress, setSegmentProgress] = useState(0);
  const [paused, setPaused] = useState(false);

  // video duration (ms) for current story
  const [videoDurationMs, setVideoDurationMs] = useState<number | null>(null);

  // mute toggle (session-level)
  const [muted, setMuted] = useState(true);

  // reply
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  // seen UI
  const [isOwner, setIsOwner] = useState(false);
  const [seenOpen, setSeenOpen] = useState(false);
  const [seenLoading, setSeenLoading] = useState(false);
  const [seenViewers, setSeenViewers] = useState<StorySeenViewer[]>([]);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoRef = useRef<Video | null>(null);

  const IMAGE_DURATION = 6000;

  const current = stories[index];

  const profile = useMemo(() => {
    if (!current || !current.profiles || Array.isArray(current.profiles))
      return null;
    return current.profiles;
  }, [current]);

  const headerName = useMemo(
    () => profile?.full_name || profile?.username || "Story",
    [profile],
  );
  const avatarUrl = profile?.avatar_url ?? null;
  const initial = (profile?.username?.[0] || "N").toUpperCase();

  const clearTimers = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (tickRef.current) clearInterval(tickRef.current);
    timerRef.current = null;
    tickRef.current = null;
  };

  const goNext = () => {
    clearTimers();
    setSegmentProgress(0);
    setPaused(false);
    setVideoDurationMs(null);

    setIndex((prev) => {
      const next = prev + 1;
      if (next >= stories.length) {
        router.back();
        return prev;
      }
      return next;
    });
  };

  const goPrev = () => {
    clearTimers();
    setSegmentProgress(0);
    setPaused(false);
    setVideoDurationMs(null);

    setIndex((prev) => (prev - 1 < 0 ? 0 : prev - 1));
  };

  const startProgress = (durationMs: number) => {
    clearTimers();
    setSegmentProgress(0);

    const start = Date.now();

    tickRef.current = setInterval(() => {
      if (paused) return;
      const elapsed = Date.now() - start;
      setSegmentProgress(clamp(elapsed / durationMs, 0, 1));
    }, 50);

    timerRef.current = setTimeout(() => {
      if (!paused) goNext();
    }, durationMs);
  };

  // ✅ Preload NEXT story media (image prefetch + "warm up" video)
  const preloadNext = async (list: StoryRow[], idx: number) => {
    const next = list[idx + 1];
    if (!next) return;

    try {
      if (next.media_type === "image") {
        Image.prefetch(next.media_url);
      } else {
        // Video warm-up: try to prefetch using Image.prefetch won't work.
        // Best lightweight trick: HEAD fetch to warm connection.
        // (Won't download full file, but often reduces latency.)
        fetch(next.media_url, { method: "HEAD" }).catch(() => {});
      }
    } catch {
      // ignore preload failures
    }
  };

  // Load ONLY the tapped user's stories, set owner, set index
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);

        const story = await fetchStoryById(String(id));
        if (!story) {
          Alert.alert("Not found", "That story does not exist.");
          router.back();
          return;
        }

        const { data: authRes } = await supabase.auth.getUser();
        const me = authRes.user;

        const list = await fetchActiveStoriesByUser(story.user_id);
        if (!mounted) return;

        if (!list.length) {
          Alert.alert("No stories", "This user has no active stories.");
          router.back();
          return;
        }

        const idx = list.findIndex((s) => s.id === story.id);
        setStories(list);
        setIndex(idx >= 0 ? idx : 0);
        setIsOwner(!!me && me.id === story.user_id);

        // preload the next one right away
        preloadNext(list, idx >= 0 ? idx : 0);
      } catch (e: any) {
        console.error("Story load error:", e);
        Alert.alert("Error", e?.message ?? "Failed to load story");
        router.back();
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
      clearTimers();
    };
  }, [id]);

  // Mark seen + start progress + preload next whenever story changes
  useEffect(() => {
    if (!current) return;

    // mark seen (idempotent)
    markStorySeen(current.id).catch(() => {});

    // preload the next one for zero lag
    preloadNext(stories, index);

    if (current.media_type === "image") {
      startProgress(IMAGE_DURATION);
    } else {
      // wait for onLoad to set duration, then we'll start
      setSegmentProgress(0);
    }

    return () => clearTimers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, current?.id]);

  // Start progress when we receive real video duration
  useEffect(() => {
    if (!current) return;
    if (current.media_type !== "video") return;
    if (!videoDurationMs || videoDurationMs <= 0) return;

    if (segmentProgress === 0) startProgress(videoDurationMs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoDurationMs, current?.id]);

  const openSeen = async () => {
    if (!current || !isOwner) return;
    setSeenOpen(true);
    setSeenLoading(true);
    try {
      const viewers = await fetchStorySeenViewers(current.id);
      setSeenViewers(viewers);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to load viewers");
      setSeenViewers([]);
    } finally {
      setSeenLoading(false);
    }
  };

  const handleSendReply = async () => {
    if (!current || sending) return;
    const msg = reply.trim();
    if (!msg) return;

    setSending(true);
    try {
      await sendStoryReply(current.id, msg);
      setReply("");
      Alert.alert("Sent", "Reply sent!");
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to send reply");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingWrap, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  if (!current) {
    return (
      <View style={[styles.loadingWrap, { paddingTop: insets.top }]}>
        <Text style={{ color: "#fff" }}>Story not found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safe}>
        {/* Multi-segment progress */}
        <View style={styles.segmentsRow}>
          {stories.map((s, i) => {
            const isPast = i < index;
            const isCurrent = i === index;
            const fill = isPast ? 1 : isCurrent ? segmentProgress : 0;
            return (
              <View key={s.id} style={styles.segmentTrack}>
                <View
                  style={[styles.segmentFill, { width: `${fill * 100}%` }]}
                />
              </View>
            );
          })}
        </View>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.avatar}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
              ) : (
                <Text style={styles.avatarText}>{initial}</Text>
              )}
            </View>

            <View>
              <Text style={styles.name} numberOfLines={1}>
                {headerName}
              </Text>
              <Text style={styles.meta} numberOfLines={1}>
                {new Date(current.created_at).toLocaleString()}
              </Text>
            </View>
          </View>

          <View style={styles.headerRight}>
            {/* ✅ Mute toggle (only useful for videos, but keep consistent) */}
            <Pressable
              onPress={() => setMuted((m) => !m)}
              style={styles.iconBtn}
              hitSlop={10}
            >
              <Ionicons
                name={muted ? "volume-mute" : "volume-high"}
                size={20}
                color="#fff"
              />
            </Pressable>

            {/* ✅ Seen UI (owner only) */}
            {isOwner && (
              <Pressable onPress={openSeen} style={styles.iconBtn} hitSlop={10}>
                <Ionicons name="eye" size={20} color="#fff" />
              </Pressable>
            )}

            <Pressable
              onPress={() => router.back()}
              style={styles.iconBtn}
              hitSlop={10}
            >
              <Ionicons name="close" size={22} color="#fff" />
            </Pressable>
          </View>
        </View>

        {/* Media */}
        <View style={styles.mediaWrap}>
          {/* ✅ Hold to pause ANYWHERE */}
          <Pressable
            style={StyleSheet.absoluteFill}
            onPressIn={() => setPaused(true)}
            onPressOut={() => setPaused(false)}
          />

          {current.media_type === "video" ? (
            <Video
              ref={(r) => {
                videoRef.current = r;
              }}
              style={styles.media}
              source={{ uri: current.media_url }}
              resizeMode={ResizeMode.COVER}
              shouldPlay={!paused}
              isMuted={muted}
              isLooping={false}
              onLoad={(status) => {
                const d = (status as any)?.durationMillis;
                if (typeof d === "number" && d > 0) setVideoDurationMs(d);
                else setVideoDurationMs(10000);
              }}
              onError={(e) => console.log("Video error", e)}
            />
          ) : (
            <Image source={{ uri: current.media_url }} style={styles.media} />
          )}

          {/* Tap zones (still next/prev) */}
          <Pressable style={[styles.tapZone, { left: 0 }]} onPress={goPrev} />
          <Pressable style={[styles.tapZone, { right: 0 }]} onPress={goNext} />

          {/* Caption */}
          {current.caption ? (
            <View style={styles.captionWrap}>
              <Text style={styles.captionText}>{current.caption}</Text>
            </View>
          ) : null}

          {/* Reply bar */}
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={[styles.replyWrap, { paddingBottom: insets.bottom + 10 }]}
          >
            <View style={styles.replyRow}>
              <TextInput
                value={reply}
                onChangeText={setReply}
                placeholder="Reply…"
                placeholderTextColor="rgba(255,255,255,0.7)"
                style={styles.replyInput}
                maxLength={200}
                editable={!sending}
                onFocus={() => setPaused(true)}
                onBlur={() => setPaused(false)}
              />

              <Pressable
                onPress={handleSendReply}
                disabled={sending || !reply.trim()}
                style={[
                  styles.sendBtn,
                  (sending || !reply.trim()) && styles.sendBtnDisabled,
                ]}
              >
                {sending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Ionicons name="send" size={18} color="#fff" />
                )}
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </View>

        {/* Seen modal (owner only) */}
        <Modal
          visible={seenOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setSeenOpen(false)}
        >
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setSeenOpen(false)}
          />
          <View
            style={[styles.modalSheet, { paddingBottom: insets.bottom + 12 }]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seen by</Text>
              <Pressable
                onPress={() => setSeenOpen(false)}
                style={styles.modalClose}
              >
                <Ionicons name="close" size={20} color="#111827" />
              </Pressable>
            </View>

            {seenLoading ? (
              <View style={{ paddingVertical: 18 }}>
                <ActivityIndicator color="#7C3AED" />
              </View>
            ) : seenViewers.length === 0 ? (
              <Text style={styles.modalEmpty}>No views yet.</Text>
            ) : (
              <View style={{ gap: 12 }}>
                {seenViewers.map((v) => {
                  const p = v.profile;
                  const name = p?.full_name || p?.username || "User";
                  const uname = p?.username ? `@${p.username}` : "";
                  return (
                    <View
                      key={`${v.viewer_id}-${v.seen_at}`}
                      style={styles.viewerRow}
                    >
                      <View style={styles.viewerAvatar}>
                        {p?.avatar_url ? (
                          <Image
                            source={{ uri: p.avatar_url }}
                            style={styles.viewerAvatarImg}
                          />
                        ) : (
                          <Text style={styles.viewerAvatarText}>
                            {(p?.username?.[0] || "U").toUpperCase()}
                          </Text>
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.viewerName} numberOfLines={1}>
                          {name}
                        </Text>
                        <Text style={styles.viewerMeta} numberOfLines={1}>
                          {uname ? `${uname} • ` : ""}
                          {new Date(v.seen_at).toLocaleString()}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#000" },
  safe: { flex: 1 },

  loadingWrap: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },

  segmentsRow: {
    flexDirection: "row",
    gap: 6,
    marginHorizontal: 14,
    marginTop: 8,
  },
  segmentTrack: {
    flex: 1,
    height: 3,
    backgroundColor: "rgba(255,255,255,0.22)",
    borderRadius: 999,
    overflow: "hidden",
  },
  segmentFill: { height: 3, backgroundColor: "#FFFFFF", borderRadius: 999 },

  header: {
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },

  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },

  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(124,58,237,0.9)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImg: { width: 38, height: 38 },
  avatarText: { color: "#fff", fontWeight: "900" },

  name: { color: "#fff", fontSize: 14, fontWeight: "900", maxWidth: W * 0.6 },
  meta: { color: "rgba(255,255,255,0.7)", fontSize: 11, marginTop: 2 },

  mediaWrap: { flex: 1, position: "relative", overflow: "hidden" },
  media: { width: W, height: H },

  tapZone: { position: "absolute", top: 0, bottom: 0, width: "50%" },

  captionWrap: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 86,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  captionText: {
    color: "#fff",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
  },

  replyWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 14,
  },
  replyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
  },
  replyInput: {
    flex: 1,
    height: 46,
    borderRadius: 23,
    paddingHorizontal: 14,
    backgroundColor: "rgba(255,255,255,0.14)",
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#7C3AED",
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: { opacity: 0.5 },

  // Seen modal
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)" },
  modalSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 16,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  modalTitle: { fontSize: 16, fontWeight: "900", color: "#111827" },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  modalEmpty: { color: "#6B7280", fontSize: 13, paddingVertical: 12 },

  viewerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  viewerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#7C3AED",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  viewerAvatarImg: { width: 44, height: 44 },
  viewerAvatarText: { color: "#fff", fontWeight: "900" },
  viewerName: { fontSize: 14, fontWeight: "800", color: "#111827" },
  viewerMeta: { fontSize: 12, color: "#6B7280", marginTop: 2 },
});
