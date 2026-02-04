// components/stories/StoryViewer.tsx
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { ResizeMode, Video } from "expo-av";
import React, { useEffect, useMemo, useState } from "react";
import {
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import StoryCommentsList from "./StoryCommentsList";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface Story {
  id: string;
  username: string;
  avatar_url?: string;
  full_name?: string;

  // Your old fields:
  story_content?: string;
  story_image?: string; // now can be URL OR storage path
  story_type?: "text" | "image" | "video";
  created_at?: string;
}

interface StoryViewerProps {
  story: Story;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  onComment: (comment: string) => Promise<boolean>;
  progress: number; // 0 to 100
}

function isHttpUrl(value?: string) {
  if (!value) return false;
  return /^https?:\/\//i.test(value);
}

// If you store private bucket paths, generate a signed URL.
// NOTE: Bucket name must match your Supabase bucket.
async function getSignedStoryUrl(path: string) {
  // 1 hour signed URL
  const expiresIn = 60 * 60;

  const { data, error } = await supabase.storage
    .from("stories")
    .createSignedUrl(path, expiresIn);

  if (error) throw error;
  if (!data?.signedUrl) throw new Error("Failed to create signed URL");
  return data.signedUrl;
}

export default function StoryViewer({
  story,
  onClose,
  onNext,
  onPrev,
  onComment,
  progress,
}: StoryViewerProps) {
  const [commentText, setCommentText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [_isLoadingComments] = useState(false);

  // Signed media handling
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);

  const storyMediaRaw = story.story_image ?? null;

  const resolvedType = useMemo<"text" | "image" | "video">(() => {
    if (story.story_type) return story.story_type;
    // Fallback guess based on extension if provided
    const v = storyMediaRaw?.toLowerCase() ?? "";
    if (v.endsWith(".mp4") || v.endsWith(".mov") || v.includes("video"))
      return "video";
    if (storyMediaRaw) return "image";
    return "text";
  }, [story.story_type, storyMediaRaw]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setMediaError(null);

      // No media => text story
      if (!storyMediaRaw) {
        setMediaUrl(null);
        return;
      }

      // Already a public URL => use directly
      if (isHttpUrl(storyMediaRaw)) {
        setMediaUrl(storyMediaRaw);
        return;
      }

      // Otherwise treat as storage path (private bucket)
      setMediaLoading(true);
      try {
        const signed = await getSignedStoryUrl(storyMediaRaw);
        if (!cancelled) setMediaUrl(signed);
      } catch (e: any) {
        if (!cancelled) {
          setMediaUrl(null);
          setMediaError(e?.message || "Failed to load story media");
        }
      } finally {
        if (!cancelled) setMediaLoading(false);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [storyMediaRaw]);

  // Format timestamp
  const formatTime = (dateString?: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffHours < 1) return `${Math.floor(diffMs / 60000)}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // Handle comment submission
  const handleSendComment = async () => {
    if (!commentText.trim() || isSending) return;

    setIsSending(true);
    try {
      const success = await onComment(commentText);
      if (success) {
        const text = commentText;
        setCommentText("");

        const newComment = {
          id: Date.now().toString(),
          content: text,
          created_at: new Date().toISOString(),
          profiles: {
            username: "You",
            full_name: "You",
            avatar_url: null,
          },
        };
        setComments((prev) => [newComment, ...prev]);
      }
    } finally {
      setIsSending(false);
    }
  };

  // Quick reactions
  const handleQuickReaction = async (emoji: string) => {
    try {
      await onComment(emoji);
      const newComment = {
        id: Date.now().toString(),
        content: emoji,
        created_at: new Date().toISOString(),
        profiles: {
          username: "You",
          full_name: "You",
          avatar_url: null,
        },
      };
      setComments((prev) => [newComment, ...prev]);
    } catch (error) {
      console.error("Error sending reaction:", error);
    }
  };

  const showCaptionOverlay = !!story.story_content && !!storyMediaRaw;

  return (
    <View style={styles.container}>
      {/* Progress Bar */}
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBar, { width: `${progress}%` }]} />
      </View>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <View style={styles.avatarContainer}>
            {story.avatar_url ? (
              <Image source={{ uri: story.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {story.username?.charAt(0).toUpperCase() || "U"}
                </Text>
              </View>
            )}
          </View>
          <View>
            <Text style={styles.username}>
              {story.full_name || story.username}
            </Text>
            <Text style={styles.timestamp}>{formatTime(story.created_at)}</Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => setShowComments(!showComments)}
            style={styles.headerButton}
          >
            <Ionicons
              name={showComments ? "chatbubble" : "chatbubble-outline"}
              size={24}
              color="#fff"
            />
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Story Content */}
      <View style={styles.content}>
        {/* Loading overlay for signed URL generation */}
        {mediaLoading && (
          <View style={styles.mediaOverlay}>
            <Ionicons name="cloud-download-outline" size={22} color="#fff" />
            <Text style={styles.mediaOverlayText}>Loading…</Text>
          </View>
        )}

        {/* Error overlay */}
        {!!mediaError && (
          <View style={styles.mediaOverlay}>
            <Ionicons name="warning-outline" size={22} color="#fff" />
            <Text style={styles.mediaOverlayText}>{mediaError}</Text>

            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => {
                // Force a refresh by re-running effect: set to null then restore
                const raw = story.story_image ?? null;
                setMediaError(null);
                setMediaUrl(null);
                setTimeout(() => {
                  // If the raw is a storage path, effect will sign again.
                  // If it’s a URL, it will set immediately.
                  setMediaUrl(isHttpUrl(raw ?? "") ? raw : null);
                }, 0);
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {storyMediaRaw ? (
          resolvedType === "video" ? (
            mediaUrl ? (
              <Video
                source={{ uri: mediaUrl }}
                style={styles.storyMedia}
                resizeMode={ResizeMode.COVER}
                shouldPlay
                isLooping
                useNativeControls={false}
              />
            ) : (
              <View
                style={[styles.textStoryContainer, { backgroundColor: "#000" }]}
              >
                <Text style={styles.storyText}>Loading video…</Text>
              </View>
            )
          ) : mediaUrl ? (
            <Image
              source={{ uri: mediaUrl }}
              style={styles.storyMedia}
              resizeMode="cover"
            />
          ) : (
            <View
              style={[styles.textStoryContainer, { backgroundColor: "#000" }]}
            >
              <Text style={styles.storyText}>Loading image…</Text>
            </View>
          )
        ) : (
          <View
            style={[styles.textStoryContainer, { backgroundColor: "#000" }]}
          >
            <Text style={styles.storyText}>
              {story.story_content || "No story content"}
            </Text>
          </View>
        )}

        {showCaptionOverlay && (
          <View style={styles.captionContainer}>
            <Text style={styles.caption}>{story.story_content}</Text>
          </View>
        )}
      </View>

      {/* Navigation Areas */}
      <TouchableOpacity
        style={[styles.navArea, styles.navAreaLeft]}
        onPress={onPrev}
        activeOpacity={0.7}
      />

      <TouchableOpacity
        style={[styles.navArea, styles.navAreaRight]}
        onPress={onNext}
        activeOpacity={0.7}
      />

      {/* Comments Section */}
      {showComments && (
        <View style={styles.commentsSection}>
          <StoryCommentsList
            comments={comments}
            isLoading={_isLoadingComments}
          />
        </View>
      )}

      {/* Comment Input */}
      <View style={styles.commentInputContainer}>
        <View style={styles.commentInputWrapper}>
          <TextInput
            style={styles.commentInput}
            placeholder="Send a reply..."
            placeholderTextColor="rgba(255,255,255,0.6)"
            value={commentText}
            onChangeText={setCommentText}
            onSubmitEditing={handleSendComment}
            editable={!isSending}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!commentText.trim() || isSending) && styles.sendButtonDisabled,
            ]}
            onPress={handleSendComment}
            disabled={!commentText.trim() || isSending}
          >
            <Ionicons
              name="send"
              size={20}
              color={
                commentText.trim() && !isSending
                  ? "#007AFF"
                  : "rgba(255,255,255,0.3)"
              }
            />
          </TouchableOpacity>
        </View>

        <View style={styles.quickReactions}>
          {["❤️", "😂", "😮", "😢", "👏"].map((emoji, index) => (
            <TouchableOpacity
              key={index}
              style={styles.quickReactionButton}
              onPress={() => handleQuickReaction(emoji)}
              disabled={isSending}
            >
              <Text style={styles.quickReactionText}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },

  progressBarContainer: {
    height: 2,
    backgroundColor: "rgba(255,255,255,0.3)",
    marginTop: 8,
    marginHorizontal: 8,
    borderRadius: 1,
  },
  progressBar: { height: "100%", backgroundColor: "#fff", borderRadius: 1 },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userInfo: { flexDirection: "row", alignItems: "center", flex: 1 },
  avatarContainer: { marginRight: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  username: { color: "#fff", fontSize: 16, fontWeight: "600" },
  timestamp: { color: "rgba(255,255,255,0.7)", fontSize: 12, marginTop: 2 },

  headerActions: { flexDirection: "row", alignItems: "center" },
  headerButton: { padding: 8, marginLeft: 8 },

  content: { flex: 1, justifyContent: "center", alignItems: "center" },

  storyMedia: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.7,
  },

  textStoryContainer: {
    width: SCREEN_WIDTH * 0.9,
    height: SCREEN_HEIGHT * 0.6,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 16,
    padding: 20,
  },
  storyText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    lineHeight: 32,
  },

  captionContainer: {
    position: "absolute",
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 16,
    borderRadius: 12,
  },
  caption: { color: "#fff", fontSize: 16, textAlign: "center", lineHeight: 22 },

  navArea: {
    position: "absolute",
    top: 0,
    bottom: 150,
    width: SCREEN_WIDTH * 0.3,
  },
  navAreaLeft: { left: 0 },
  navAreaRight: { right: 0 },

  commentsSection: {
    position: "absolute",
    bottom: 150,
    left: 0,
    right: 0,
    maxHeight: SCREEN_HEIGHT * 0.4,
    backgroundColor: "rgba(0,0,0,0.8)",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },

  commentInputContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.8)",
    padding: 16,
    paddingBottom: 24,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  commentInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 20,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  commentInput: {
    flex: 1,
    color: "#fff",
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 4,
    maxHeight: 100,
  },
  sendButton: { padding: 8, marginLeft: 4 },
  sendButtonDisabled: { opacity: 0.5 },

  quickReactions: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  quickReactionButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    minWidth: 44,
    alignItems: "center",
  },
  quickReactionText: { fontSize: 20 },

  // overlays
  mediaOverlay: {
    position: "absolute",
    top: 80,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    zIndex: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  mediaOverlayText: { color: "#fff", fontWeight: "700" },
  retryButton: {
    marginLeft: 10,
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  retryText: { color: "#fff", fontWeight: "800" },
});
