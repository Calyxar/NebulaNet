import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// Export the Message interface
export interface Message {
  id: string;
  content: string;
  sender: "me" | "other";
  timestamp: string;
  status?: "sent" | "delivered" | "read";
  mediaUrl?: string;
  mediaType?: "image" | "video" | "audio" | "file";
  attachments?: any[];
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
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  // Group messages by date
  const groupMessagesByDate = () => {
    const groups: { [date: string]: Message[] } = {};

    messages.forEach((message) => {
      const date = new Date(message.timestamp).toLocaleDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    });

    return groups;
  };

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
    const hasAttachments = item.attachments && item.attachments.length > 0;
    const hasMedia = item.mediaUrl && item.mediaType;

    return (
      <View
        style={[
          styles.messageContainer,
          isMe ? styles.myMessage : styles.otherMessage,
        ]}
      >
        {/* Show attachments if any */}
        {hasAttachments && (
          <View style={styles.attachmentsContainer}>
            {item.attachments!.map((attachment, index) => (
              <AttachmentPreview
                key={index}
                attachment={attachment}
                isMe={isMe}
              />
            ))}
          </View>
        )}

        {/* Show single media if exists (for backward compatibility) */}
        {hasMedia && !hasAttachments && (
          <MediaPreview
            mediaUrl={item.mediaUrl!}
            mediaType={item.mediaType!}
            isMe={isMe}
          />
        )}

        {/* Show message content */}
        {item.content && (
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

  const groupedMessages = groupMessagesByDate();
  const dates = Object.keys(groupedMessages);

  if (showDateHeaders && dates.length > 0) {
    return (
      <FlatList
        ref={flatListRef}
        data={dates}
        renderItem={({ item: date }) => (
          <View>
            {renderDateHeader(date)}
            {groupedMessages[date].map((message) => (
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
        keyExtractor={(date) => date}
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

// Attachment Preview Component
const AttachmentPreview = ({
  attachment,
  isMe,
}: {
  attachment: any;
  isMe: boolean;
}) => {
  const getFileName = (url: string) => {
    const parts = url.split("/");
    return decodeURIComponent(parts[parts.length - 1]);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  if (attachment.type === "image") {
    return (
      <Image source={{ uri: attachment.url }} style={styles.attachmentImage} />
    );
  } else if (attachment.type === "video") {
    return (
      <TouchableOpacity style={styles.videoAttachment}>
        <Ionicons name="videocam" size={24} color="#fff" />
        <View style={styles.videoOverlay} />
        {attachment.duration && (
          <Text style={styles.videoDuration}>{attachment.duration}</Text>
        )}
      </TouchableOpacity>
    );
  } else if (attachment.type === "audio") {
    return (
      <View
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
        {attachment.duration && (
          <Text
            style={[
              styles.audioDuration,
              isMe ? styles.myAudioDuration : styles.otherAudioDuration,
            ]}
          >
            {attachment.duration}
          </Text>
        )}
      </View>
    );
  } else {
    // File attachment
    return (
      <TouchableOpacity
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
            {attachment.name || getFileName(attachment.url)}
          </Text>
          {attachment.size && (
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
  }
};

// Media Preview Component (for backward compatibility)
const MediaPreview = ({
  mediaUrl,
  mediaType,
  isMe,
}: {
  mediaUrl: string;
  mediaType: string;
  isMe: boolean;
}) => {
  if (mediaType === "image") {
    return <Image source={{ uri: mediaUrl }} style={styles.mediaImage} />;
  } else if (mediaType === "video") {
    return (
      <TouchableOpacity style={styles.mediaVideo}>
        <Ionicons name="play-circle" size={48} color="#FFFFFF" />
        <View style={styles.mediaOverlay} />
      </TouchableOpacity>
    );
  } else if (mediaType === "audio") {
    return (
      <View
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
      </View>
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
  myTimestamp: {
    color: "#666",
  },
  otherTimestamp: {
    color: "#666",
  },
  statusIcon: {
    marginLeft: 4,
  },
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
  // Attachment styles
  attachmentsContainer: {
    marginBottom: 8,
  },
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
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderRadius: 12,
  },
  videoDuration: {
    position: "absolute",
    bottom: 8,
    right: 8,
    color: "#fff",
    fontSize: 12,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
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
  myAudioAttachment: {
    backgroundColor: "#7C3AED",
  },
  otherAudioAttachment: {
    backgroundColor: "#F3F4F6",
  },
  audioText: {
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 8,
  },
  myAudioText: {
    color: "#FFFFFF",
  },
  otherAudioText: {
    color: "#007AFF",
  },
  audioDuration: {
    fontSize: 12,
    marginLeft: 8,
  },
  myAudioDuration: {
    color: "rgba(255, 255, 255, 0.7)",
  },
  otherAudioDuration: {
    color: "#666",
  },
  fileAttachment: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    marginBottom: 4,
  },
  myFileAttachment: {
    backgroundColor: "#7C3AED",
  },
  otherFileAttachment: {
    backgroundColor: "#F3F4F6",
  },
  fileInfo: {
    marginLeft: 8,
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: "500",
  },
  myFileName: {
    color: "#FFFFFF",
  },
  otherFileName: {
    color: "#333",
  },
  fileSize: {
    fontSize: 12,
    marginTop: 2,
  },
  myFileSize: {
    color: "rgba(255, 255, 255, 0.7)",
  },
  otherFileSize: {
    color: "#666",
  },
  // Media styles (for backward compatibility)
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
  myMediaAudio: {
    backgroundColor: "#7C3AED",
  },
  otherMediaAudio: {
    backgroundColor: "#F3F4F6",
  },
  mediaAudioText: {
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 8,
  },
  myMediaAudioText: {
    color: "#FFFFFF",
  },
  otherMediaAudioText: {
    color: "#007AFF",
  },
  mediaOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderRadius: 12,
  },
});
