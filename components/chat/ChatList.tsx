// components/chat/ChatList.tsx — FIRESTORE + FIREBASE STORAGE ✅ (COMPLETED + UPDATED)
// ✅ Uses ChatAttachment shape (url + storagePath)
// ✅ Fixes date grouping (timestamp is display-only; grouping uses createdAtIso)
// ✅ Keeps backward compatibility with mediaUrl/mediaType
// ✅ Adds basic open behavior for file/video urls

import type { ChatAttachment } from "@/components/chat/ChatInput";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useRef } from "react";
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
  content: string;
  sender: "me" | "other";

  /**
   * Display-only time string (ex: "02:14 PM") — what you currently pass.
   */
  timestamp: string;

  /**
   * ✅ REQUIRED for date headers + sorting
   * Pass msg.created_at (ISO) from Firestore here.
   */
  createdAtIso: string;

  status?: "sent" | "delivered" | "read";
  mediaUrl?: string;
  mediaType?: "image" | "video" | "audio" | "file";

  // ✅ Firebase attachments
  attachments?: ChatAttachment[];
}

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
  const flatListRef = useRef<FlatList>(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      const t = setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 80);
      return () => clearTimeout(t);
    }
  }, [messages]);

  const openUrl = async (url?: string) => {
    if (!url) return;
    try {
      const can = await Linking.canOpenURL(url);
      if (can) await Linking.openURL(url);
    } catch {
      // ignore
    }
  };

  // ✅ Group messages by DATE using createdAtIso (NOT the display timestamp)
  const grouped = useMemo(() => {
    const groups: Record<string, Message[]> = {};
    for (const m of messages) {
      const d = new Date(m.createdAtIso);
      const key = isNaN(d.getTime()) ? "Unknown Date" : d.toLocaleDateString();
      if (!groups[key]) groups[key] = [];
      groups[key].push(m);
    }

    // Within each date: sort ascending by time for nicer reading
    for (const k of Object.keys(groups)) {
      groups[k].sort(
        (a, b) =>
          new Date(a.createdAtIso).getTime() -
          new Date(b.createdAtIso).getTime(),
      );
    }

    return groups;
  }, [messages]);

  const dates = useMemo(() => {
    const keys = Object.keys(grouped);
    // Sort date groups ascending
    keys.sort((a, b) => {
      if (a === "Unknown Date") return 1;
      if (b === "Unknown Date") return -1;
      const da = new Date(a);
      const db = new Date(b);
      return da.getTime() - db.getTime();
    });
    return keys;
  }, [grouped]);

  const renderDateHeader = (date: string) => (
    <View style={styles.dateHeader}>
      <Text style={styles.dateHeaderText}>{date}</Text>
    </View>
  );

  const renderEmpty = () => {
    if (emptyComponent) return emptyComponent;

    return (
      <View style={styles.emptyContainer}>
        <Ionicons
          name="chatbubble-ellipses-outline"
          size={64}
          color="#e1e1e1"
        />
        <Text style={styles.emptyTitle}>No messages yet</Text>
        <Text style={styles.emptySubtitle}>
          Start a conversation by sending a message
        </Text>
      </View>
    );
  };

  const renderFooter = () => {
    if (!isLoading) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color="#007AFF" />
      </View>
    );
  };

  const renderMessageItem = ({ item }: { item: Message }) => {
    const isMe = item.sender === "me";
    const hasAttachments = !!item.attachments?.length;
    const hasMedia = !!item.mediaUrl && !!item.mediaType;

    return (
      <View
        style={[
          styles.messageContainer,
          isMe ? styles.myMessage : styles.otherMessage,
        ]}
      >
        {/* ✅ Attachments (Firebase) */}
        {hasAttachments && (
          <View style={styles.attachmentsContainer}>
            {item.attachments!.map((attachment, index) => (
              <AttachmentPreview
                key={`${item.id}-att-${index}`}
                attachment={attachment}
                isMe={isMe}
                onOpen={() => openUrl(attachment.url)}
              />
            ))}
          </View>
        )}

        {/* Backward-compatible single media */}
        {hasMedia && !hasAttachments && (
          <MediaPreview
            mediaUrl={item.mediaUrl!}
            mediaType={item.mediaType!}
            isMe={isMe}
            onOpen={() => openUrl(item.mediaUrl)}
          />
        )}

        {!!item.content && (
          <Text
            style={[
              styles.messageText,
              isMe ? styles.myMessageText : styles.otherMessageText,
            ]}
          >
            {item.content}
          </Text>
        )}

        <View style={styles.messageFooter}>
          <Text
            style={[
              styles.timestamp,
              isMe ? styles.myTimestamp : styles.otherTimestamp,
            ]}
          >
            {item.timestamp}
          </Text>

          {isMe && item.status && (
            <Ionicons
              name={
                item.status === "read"
                  ? "checkmark-done"
                  : item.status === "delivered"
                    ? "checkmark-done"
                    : "checkmark"
              }
              size={16}
              color={
                item.status === "read"
                  ? "#4ADE80"
                  : item.status === "delivered"
                    ? "#666"
                    : "#999"
              }
              style={styles.statusIcon}
            />
          )}
        </View>
      </View>
    );
  };

  // ────────────────────────────────────────────────────────────────────────────
  // With date headers
  // ────────────────────────────────────────────────────────────────────────────
  if (showDateHeaders && dates.length > 0) {
    return (
      <FlatList
        ref={flatListRef}
        data={dates}
        keyExtractor={(date) => date}
        renderItem={({ item: date }) => (
          <View>
            {renderDateHeader(date)}
            {grouped[date].map((message) => (
              <TouchableOpacity
                key={message.id}
                onPress={() => onMessagePress?.(message)}
                onLongPress={() => onMessageLongPress?.(message)}
                activeOpacity={0.7}
              >
                {renderMessageItem({ item: message })}
              </TouchableOpacity>
            ))}
          </View>
        )}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor="#007AFF"
            />
          ) : undefined
        }
        onEndReached={onLoadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        inverted={false}
      />
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Flat list (no date headers)
  // ────────────────────────────────────────────────────────────────────────────
  return (
    <FlatList
      ref={flatListRef}
      data={messages}
      renderItem={({ item }) => (
        <TouchableOpacity
          onPress={() => onMessagePress?.(item)}
          onLongPress={() => onMessageLongPress?.(item)}
          activeOpacity={0.7}
        >
          {renderMessageItem({ item })}
        </TouchableOpacity>
      )}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor="#007AFF"
          />
        ) : undefined
      }
      onEndReached={onLoadMore}
      onEndReachedThreshold={0.5}
      ListEmptyComponent={renderEmpty}
      ListFooterComponent={renderFooter}
      inverted={false}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Attachment Preview (Firebase)
// ─────────────────────────────────────────────────────────────────────────────
const AttachmentPreview = ({
  attachment,
  isMe,
  onOpen,
}: {
  attachment: ChatAttachment;
  isMe: boolean;
  onOpen: () => void;
}) => {
  const formatFileSize = (bytes: number) => {
    if (!bytes) return "";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
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
          isMe ? styles.myAudioAttachment : styles.otherAudioAttachment,
        ]}
      >
        <Ionicons
          name="volume-high"
          size={20}
          color={isMe ? "#FFFFFF" : "#007AFF"}
        />
        <Text
          style={[
            styles.audioText,
            isMe ? styles.myAudioText : styles.otherAudioText,
          ]}
        >
          Voice message
        </Text>
        {!!attachment.duration && (
          <Text
            style={[
              styles.audioDuration,
              isMe ? styles.myAudioDuration : styles.otherAudioDuration,
            ]}
          >
            {attachment.duration}
          </Text>
        )}
      </TouchableOpacity>
    );
  }

  // file
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onOpen}
      style={[
        styles.fileAttachment,
        isMe ? styles.myFileAttachment : styles.otherFileAttachment,
      ]}
    >
      <Ionicons
        name="document-text"
        size={24}
        color={isMe ? "#FFFFFF" : "#007AFF"}
      />
      <View style={styles.fileInfo}>
        <Text
          style={[
            styles.fileName,
            isMe ? styles.myFileName : styles.otherFileName,
          ]}
          numberOfLines={1}
        >
          {attachment.name || "File"}
        </Text>
        {!!attachment.size && (
          <Text
            style={[
              styles.fileSize,
              isMe ? styles.myFileSize : styles.otherFileSize,
            ]}
          >
            {formatFileSize(attachment.size)}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Media Preview (legacy)
// ─────────────────────────────────────────────────────────────────────────────
const MediaPreview = ({
  mediaUrl,
  mediaType,
  isMe,
  onOpen,
}: {
  mediaUrl: string;
  mediaType: string;
  isMe: boolean;
  onOpen: () => void;
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
          isMe ? styles.myMediaAudio : styles.otherMediaAudio,
        ]}
      >
        <Ionicons
          name="volume-high"
          size={20}
          color={isMe ? "#FFFFFF" : "#007AFF"}
        />
        <Text
          style={[
            styles.mediaAudioText,
            isMe ? styles.myMediaAudioText : styles.otherMediaAudioText,
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
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexGrow: 1,
  },
  messageContainer: {
    maxWidth: "80%",
    marginBottom: 12,
    alignSelf: "flex-start",
  },
  myMessage: {
    alignSelf: "flex-end",
    alignItems: "flex-end",
  },
  otherMessage: {
    alignSelf: "flex-start",
    alignItems: "flex-start",
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    overflow: "hidden",
  },
  myMessageText: {
    backgroundColor: "#7C3AED",
    color: "#FFFFFF",
    borderTopRightRadius: 4,
  },
  otherMessageText: {
    backgroundColor: "#FFFFFF",
    color: "#000000",
    borderTopLeftRadius: 4,
  },
  messageFooter: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    paddingHorizontal: 8,
  },
  timestamp: {
    fontSize: 12,
    opacity: 0.7,
  },
  myTimestamp: { color: "#666" },
  otherTimestamp: { color: "#666" },
  statusIcon: { marginLeft: 4 },

  dateHeader: {
    alignItems: "center",
    marginVertical: 16,
  },
  dateHeaderText: {
    fontSize: 12,
    color: "#666",
    backgroundColor: "#f5f5f5",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },

  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    paddingHorizontal: 40,
  },

  footer: {
    paddingVertical: 20,
    alignItems: "center",
  },

  // Attachments
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
  myAudioAttachment: { backgroundColor: "#7C3AED" },
  otherAudioAttachment: { backgroundColor: "#F3F4F6" },
  audioText: { fontSize: 14, fontWeight: "500", marginLeft: 8 },
  myAudioText: { color: "#FFFFFF" },
  otherAudioText: { color: "#007AFF" },
  audioDuration: { fontSize: 12, marginLeft: 8 },
  myAudioDuration: { color: "rgba(255,255,255,0.7)" },
  otherAudioDuration: { color: "#666" },

  fileAttachment: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    marginBottom: 4,
  },
  myFileAttachment: { backgroundColor: "#7C3AED" },
  otherFileAttachment: { backgroundColor: "#F3F4F6" },
  fileInfo: { marginLeft: 8, flex: 1 },
  fileName: { fontSize: 14, fontWeight: "500" },
  myFileName: { color: "#FFFFFF" },
  otherFileName: { color: "#333" },
  fileSize: { fontSize: 12, marginTop: 2 },
  myFileSize: { color: "rgba(255,255,255,0.7)" },
  otherFileSize: { color: "#666" },

  // Legacy media
  mediaImage: {
    width: 200,
    height: 150,
    borderRadius: 12,
    marginBottom: 8,
  },
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
  myMediaAudio: { backgroundColor: "#7C3AED" },
  otherMediaAudio: { backgroundColor: "#F3F4F6" },
  mediaAudioText: { fontSize: 14, fontWeight: "500", marginLeft: 8 },
  myMediaAudioText: { color: "#FFFFFF" },
  otherMediaAudioText: { color: "#007AFF" },
  mediaOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 12,
  },
});
