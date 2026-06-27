// components/chat/ChatList.tsx ✅
// ✅ FIXED: inverted FlatList on Android rotates its entire content area
// 180°, including ListEmptyComponent. Message bubbles never visibly show
// this rotation, but the empty-state icon/text did — "No messages yet"
// was rendering upside-down. Fixed by counter-rotating just that component.

import type { ChatAttachment } from "@/components/chat/ChatInput";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Linking,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export interface Message {
  id: string;
  content: string | null;
  sender: "me" | "other";
  timestamp: string;
  createdAtIso: string;
  status?: "sent" | "delivered" | "read";
  mediaUrl?: string;
  mediaType?: "image" | "video" | "audio" | "file";
  attachments?: ChatAttachment[];
  is_deleted?: boolean;
}

// Flat list item — either a message or a date separator
type ListItem =
  | { type: "message"; data: Message }
  | { type: "date"; label: string };

interface ChatListProps {
  messages: Message[];
  isLoading?: boolean;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  onLoadMore?: () => void;
  onMessagePress?: (message: Message) => void;
  onMessageLongPress?: (message: Message) => void;
  emptyComponent?: React.ReactElement;
  showDateHeaders?: boolean;
}

export default function ChatList({
  messages,
  isLoading = false,
  isRefreshing = false,
  onRefresh,
  onLoadMore,
  onMessagePress,
  onMessageLongPress,
  emptyComponent,
  showDateHeaders = true,
}: ChatListProps) {
  const { colors } = useTheme();

  const openUrl = async (url?: string) => {
    if (!url) return;
    try {
      const can = await Linking.canOpenURL(url);
      if (can) await Linking.openURL(url);
    } catch {}
  };

  // ✅ Filter deleted, then build a flat array newest-first (for inverted FlatList)
  const listItems = useMemo<ListItem[]>(() => {
    const visible = messages
      .filter((m) => !m.is_deleted)
      .slice()
      .sort(
        (a, b) =>
          new Date(b.createdAtIso).getTime() -
          new Date(a.createdAtIso).getTime(),
      );

    if (!showDateHeaders) {
      return visible.map((m) => ({ type: "message", data: m }));
    }

    // Insert date headers between groups (after reversing so newest is first)
    const items: ListItem[] = [];
    let lastDate = "";
    for (const m of visible) {
      const d = new Date(m.createdAtIso);
      const dateKey = isNaN(d.getTime())
        ? "Unknown Date"
        : d.toLocaleDateString();
      items.push({ type: "message", data: m });
      // Date header goes AFTER the last message of that day
      // (because list is inverted, "after" visually = above)
      if (dateKey !== lastDate) {
        items.push({ type: "date", label: dateKey });
        lastDate = dateKey;
      }
    }
    return items;
  }, [messages, showDateHeaders]);

  const renderItem = ({ item }: { item: ListItem }) => {
    if (item.type === "date") {
      return (
        <View style={styles.dateHeader}>
          <Text
            style={[
              styles.dateHeaderText,
              {
                color: colors.textSecondary,
                backgroundColor: colors.surface,
              },
            ]}
          >
            {item.label}
          </Text>
        </View>
      );
    }

    const msg = item.data;
    const isMe = msg.sender === "me";
    const hasAttachments = !!msg.attachments?.length;
    const hasMedia = !!msg.mediaUrl && !!msg.mediaType;

    return (
      <TouchableOpacity
        onPress={() => onMessagePress?.(msg)}
        onLongPress={() => onMessageLongPress?.(msg)}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.messageContainer,
            isMe ? styles.myMessage : styles.otherMessage,
          ]}
        >
          {hasAttachments && (
            <View style={styles.attachmentsContainer}>
              {msg.attachments!.map((attachment, index) => (
                <AttachmentPreview
                  key={`${msg.id}-att-${index}`}
                  attachment={attachment}
                  isMe={isMe}
                  onOpen={() => openUrl(attachment.url)}
                  colors={colors}
                />
              ))}
            </View>
          )}

          {hasMedia && !hasAttachments && (
            <MediaPreview
              mediaUrl={msg.mediaUrl!}
              mediaType={msg.mediaType!}
              isMe={isMe}
              onOpen={() => openUrl(msg.mediaUrl)}
              colors={colors}
            />
          )}

          {!!msg.content && (
            <Text
              style={[
                styles.messageText,
                isMe
                  ? [styles.myMessageText, { backgroundColor: colors.primary }]
                  : [
                      styles.otherMessageText,
                      { backgroundColor: colors.card, color: colors.text },
                    ],
              ]}
            >
              {msg.content}
            </Text>
          )}

          <View style={styles.messageFooter}>
            <Text style={[styles.timestamp, { color: colors.textTertiary }]}>
              {msg.timestamp}
            </Text>
            {isMe && msg.status && (
              <Ionicons
                name={msg.status === "sent" ? "checkmark" : "checkmark-done"}
                size={16}
                color={msg.status === "read" ? "#4ADE80" : colors.textTertiary}
                style={styles.statusIcon}
              />
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderFooter = () =>
    isLoading ? (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    ) : null;

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={listItems}
        keyExtractor={(item) =>
          item.type === "date" ? `date-${item.label}` : item.data.id
        }
        renderItem={renderItem}
        inverted
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          ) : undefined
        }
        onEndReached={onLoadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={renderFooter}
        removeClippedSubviews
        maxToRenderPerBatch={20}
        windowSize={10}
      />
      {/* ✅ FIXED: rendering the empty state via ListEmptyComponent put it
          INSIDE the inverted FlatList's rotation context, where the
          counter-transform (scaleY: -1) produced garbled text on some
          devices instead of cleanly cancelling the rotation. Rendering it
          as a plain sibling overlay — completely outside the FlatList —
          sidesteps the transform math entirely. */}
      {listItems.length === 0 && (
        <View style={styles.emptyOverlay} pointerEvents="none">
          {emptyComponent ?? (
            <View style={styles.emptyContainer}>
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={64}
                color={colors.border}
              />
              <Text
                style={[styles.emptyTitle, { color: colors.textSecondary }]}
              >
                No messages yet
              </Text>
              <Text
                style={[styles.emptySubtitle, { color: colors.textTertiary }]}
              >
                Start a conversation by sending a message
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// ─── Attachment + Media previews (unchanged) ─────────────────────────────────

const AttachmentPreview = ({
  attachment,
  isMe,
  onOpen,
  colors,
}: {
  attachment: ChatAttachment;
  isMe: boolean;
  onOpen: () => void;
  colors: any;
}) => {
  const formatFileSize = (bytes: number) => {
    if (!bytes) return "";
    const k = 1024,
      sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  if (attachment.type === "image") {
    return (
      <TouchableOpacity activeOpacity={0.85} onPress={onOpen}>
        <Image
          source={{ uri: attachment.url }}
          style={styles.attachmentImage}
        />
      </TouchableOpacity>
    );
  }
  if (attachment.type === "video") {
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onOpen}
        style={styles.videoAttachment}
      >
        <Ionicons name="play-circle" size={48} color="#FFFFFF" />
        <View style={styles.videoOverlay} />
        {!!attachment.duration && (
          <Text style={styles.videoDuration}>{attachment.duration}</Text>
        )}
      </TouchableOpacity>
    );
  }
  if (attachment.type === "audio") {
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onOpen}
        style={[
          styles.audioAttachment,
          { backgroundColor: isMe ? colors.primary : colors.surface },
        ]}
      >
        <Ionicons
          name="volume-high"
          size={20}
          color={isMe ? "#FFFFFF" : colors.primary}
        />
        <Text
          style={[
            styles.audioText,
            { color: isMe ? "#FFFFFF" : colors.primary },
          ]}
        >
          Voice message
        </Text>
        {!!attachment.duration && (
          <Text
            style={[
              styles.audioDuration,
              { color: isMe ? "rgba(255,255,255,0.7)" : colors.textSecondary },
            ]}
          >
            {attachment.duration}
          </Text>
        )}
      </TouchableOpacity>
    );
  }
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onOpen}
      style={[
        styles.fileAttachment,
        { backgroundColor: isMe ? colors.primary : colors.surface },
      ]}
    >
      <Ionicons
        name="document-text"
        size={24}
        color={isMe ? "#FFFFFF" : colors.primary}
      />
      <View style={styles.fileInfo}>
        <Text
          style={[styles.fileName, { color: isMe ? "#FFFFFF" : colors.text }]}
          numberOfLines={1}
        >
          {attachment.name || "File"}
        </Text>
        {!!attachment.size && (
          <Text
            style={[
              styles.fileSize,
              { color: isMe ? "rgba(255,255,255,0.7)" : colors.textSecondary },
            ]}
          >
            {formatFileSize(attachment.size)}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const MediaPreview = ({
  mediaUrl,
  mediaType,
  isMe,
  onOpen,
  colors,
}: {
  mediaUrl: string;
  mediaType: string;
  isMe: boolean;
  onOpen: () => void;
  colors: any;
}) => {
  if (mediaType === "image") {
    return (
      <TouchableOpacity activeOpacity={0.85} onPress={onOpen}>
        <Image source={{ uri: mediaUrl }} style={styles.mediaImage} />
      </TouchableOpacity>
    );
  }
  if (mediaType === "video") {
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onOpen}
        style={styles.mediaVideo}
      >
        <Ionicons name="play-circle" size={48} color="#FFFFFF" />
        <View style={styles.mediaOverlay} />
      </TouchableOpacity>
    );
  }
  if (mediaType === "audio") {
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onOpen}
        style={[
          styles.mediaAudio,
          { backgroundColor: isMe ? colors.primary : colors.surface },
        ]}
      >
        <Ionicons
          name="volume-high"
          size={20}
          color={isMe ? "#FFFFFF" : colors.primary}
        />
        <Text
          style={[
            styles.mediaAudioText,
            { color: isMe ? "#FFFFFF" : colors.primary },
          ]}
        >
          Voice message
        </Text>
      </TouchableOpacity>
    );
  }
  return null;
};

const styles = StyleSheet.create({
  // ✅ justifyContent: "flex-end" removed — inverted handles bottom alignment
  container: { paddingHorizontal: 16, paddingVertical: 8, flexGrow: 1 },
  messageContainer: { maxWidth: "80%", marginBottom: 12 },
  myMessage: { alignSelf: "flex-end", alignItems: "flex-end" },
  otherMessage: { alignSelf: "flex-start", alignItems: "flex-start" },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    overflow: "hidden",
  },
  myMessageText: { color: "#FFFFFF", borderTopRightRadius: 4 },
  otherMessageText: { borderTopLeftRadius: 4 },
  messageFooter: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    paddingHorizontal: 8,
  },
  timestamp: { fontSize: 12 },
  statusIcon: { marginLeft: 4 },
  dateHeader: { alignItems: "center", marginVertical: 16 },
  dateHeaderText: {
    fontSize: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: "hidden",
    fontWeight: "700",
  },
  emptyOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: { fontSize: 14, textAlign: "center", paddingHorizontal: 40 },
  footer: { paddingVertical: 20, alignItems: "center" },
  attachmentsContainer: { marginBottom: 8 },
  attachmentImage: {
    width: 200,
    height: 150,
    borderRadius: 12,
    marginBottom: 4,
  },
  videoAttachment: {
    width: 200,
    height: 150,
    backgroundColor: "#000",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
    position: "relative",
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 12,
  },
  videoDuration: {
    position: "absolute",
    bottom: 8,
    right: 8,
    color: "#fff",
    fontSize: 12,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  audioAttachment: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    marginBottom: 4,
  },
  audioText: { fontSize: 14, fontWeight: "500", marginLeft: 8 },
  audioDuration: { fontSize: 12, marginLeft: 8 },
  fileAttachment: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    marginBottom: 4,
  },
  fileInfo: { marginLeft: 8, flex: 1 },
  fileName: { fontSize: 14, fontWeight: "500" },
  fileSize: { fontSize: 12, marginTop: 2 },
  mediaImage: { width: 200, height: 150, borderRadius: 12, marginBottom: 8 },
  mediaVideo: {
    width: 200,
    height: 150,
    backgroundColor: "#000",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    position: "relative",
  },
  mediaAudio: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    marginBottom: 8,
  },
  mediaAudioText: { fontSize: 14, fontWeight: "500", marginLeft: 8 },
  mediaOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 12,
  },
});
