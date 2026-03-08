// components/chat/ChatList.tsx ✅ THEMED
// Only the renderMessageItem + date header + empty state need theme colors
// Everything else (attachment shapes) stays the same

import type { ChatAttachment } from "@/components/chat/ChatInput";
import { useTheme } from "@/providers/ThemeProvider";
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
  timestamp: string;
  createdAtIso: string;
  status?: "sent" | "delivered" | "read";
  mediaUrl?: string;
  mediaType?: "image" | "video" | "audio" | "file";
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
  const { colors } = useTheme();
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      const t = setTimeout(
        () => flatListRef.current?.scrollToEnd({ animated: true }),
        80,
      );
      return () => clearTimeout(t);
    }
  }, [messages]);

  const openUrl = async (url?: string) => {
    if (!url) return;
    try {
      const can = await Linking.canOpenURL(url);
      if (can) await Linking.openURL(url);
    } catch {}
  };

  const grouped = useMemo(() => {
    const groups: Record<string, Message[]> = {};
    for (const m of messages) {
      const d = new Date(m.createdAtIso);
      const key = isNaN(d.getTime()) ? "Unknown Date" : d.toLocaleDateString();
      if (!groups[key]) groups[key] = [];
      groups[key].push(m);
    }
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
    return Object.keys(grouped).sort((a, b) => {
      if (a === "Unknown Date") return 1;
      if (b === "Unknown Date") return -1;
      return new Date(a).getTime() - new Date(b).getTime();
    });
  }, [grouped]);

  const renderDateHeader = (date: string) => (
    <View style={styles.dateHeader}>
      <Text
        style={[
          styles.dateHeaderText,
          { color: colors.textSecondary, backgroundColor: colors.surface },
        ]}
      >
        {date}
      </Text>
    </View>
  );

  const renderEmpty = () => {
    if (emptyComponent) return emptyComponent;
    return (
      <View style={styles.emptyContainer}>
        <Ionicons
          name="chatbubble-ellipses-outline"
          size={64}
          color={colors.border}
        />
        <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
          No messages yet
        </Text>
        <Text style={[styles.emptySubtitle, { color: colors.textTertiary }]}>
          Start a conversation by sending a message
        </Text>
      </View>
    );
  };

  const renderFooter = () =>
    isLoading ? (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    ) : null;

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
        {hasAttachments && (
          <View style={styles.attachmentsContainer}>
            {item.attachments!.map((attachment, index) => (
              <AttachmentPreview
                key={`${item.id}-att-${index}`}
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
            mediaUrl={item.mediaUrl!}
            mediaType={item.mediaType!}
            isMe={isMe}
            onOpen={() => openUrl(item.mediaUrl)}
            colors={colors}
          />
        )}

        {!!item.content && (
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
            {item.content}
          </Text>
        )}

        <View style={styles.messageFooter}>
          <Text style={[styles.timestamp, { color: colors.textTertiary }]}>
            {item.timestamp}
          </Text>
          {isMe && item.status && (
            <Ionicons
              name={item.status === "sent" ? "checkmark" : "checkmark-done"}
              size={16}
              color={item.status === "read" ? "#4ADE80" : colors.textTertiary}
              style={styles.statusIcon}
            />
          )}
        </View>
      </View>
    );
  };

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
              tintColor={colors.primary}
            />
          ) : undefined
        }
        onEndReached={onLoadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
      />
    );
  }

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
            tintColor={colors.primary}
          />
        ) : undefined
      }
      onEndReached={onLoadMore}
      onEndReachedThreshold={0.5}
      ListEmptyComponent={renderEmpty}
      ListFooterComponent={renderFooter}
    />
  );
}

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
  emptyContainer: {
    flex: 1,
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
