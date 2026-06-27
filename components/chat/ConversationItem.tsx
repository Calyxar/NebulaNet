// components/chat/ConversationItem.tsx — ✅ REDESIGNED, Twitter/X DM list style
// ✅ NEW: unread conversations now bold the NAME and TIMESTAMP too, not
//         just the message preview — matches how Twitter/X visually
//         distinguishes an unread thread at a glance, not just on close
//         inspection of the preview text weight.
// ✅ Slightly larger avatar (60 vs 56) and tighter online-indicator inset
//         to read closer to X's actual DM list proportions.

import type { ChatAttachment } from "@/components/chat/ChatInput";
import { usePresence } from "@/hooks/usePresence";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export type ConversationItemProps = {
  id: string;
  name: string;
  lastMessage: string;
  attachments?: ChatAttachment[] | null;
  mediaType?: string | null;
  timestamp: string;
  unreadCount: number;
  // ✅ CHANGED: was a static boolean computed once upstream from
  // denormalized conversation data. Now this component subscribes to
  // LIVE presence itself via otherUserId, so the green dot updates the
  // moment the other person opens/closes the app — not just whenever
  // the conversation list happens to re-fetch.
  otherUserId?: string | null;
  isTyping: boolean;
  isPinned: boolean;
  avatar?: string | null;
  onPress: () => void;
  onLongPress?: () => void;
};

export default function ConversationItem({
  name,
  lastMessage,
  attachments,
  mediaType,
  timestamp,
  unreadCount,
  otherUserId,
  isTyping,
  isPinned,
  avatar,
  onPress,
  onLongPress,
}: ConversationItemProps) {
  const { colors } = useTheme() as { colors: any };
  const { status } = usePresence(otherUserId);
  const isOnline = status === "online";
  const isUnread = unreadCount > 0;

  const getInitials = (n: string) =>
    n
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const preview = useMemo(() => {
    if (isTyping) return "Typing...";
    const hasText = lastMessage && lastMessage.trim().length > 0;
    const atts = attachments?.length ? attachments : null;
    const t = (mediaType ?? atts?.[0]?.type ?? "").toLowerCase();
    if (!hasText) {
      if (t === "image") return "📷 Photo";
      if (t === "video") return "🎥 Video";
      if (t === "audio") return "🎤 Voice message";
      if (t === "file") return `📎 ${atts?.[0]?.name ?? "Attachment"}`;
      if (atts) return "📎 Attachment";
    }
    return lastMessage || "No messages yet";
  }, [attachments, mediaType, lastMessage, isTyping]);

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.background }]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      <View style={styles.avatarContainer}>
        {avatar ? (
          <Image source={{ uri: avatar }} style={styles.avatar} />
        ) : (
          <View
            style={[
              styles.avatarPlaceholder,
              { backgroundColor: colors.surface },
            ]}
          >
            <Text style={[styles.avatarText, { color: colors.textSecondary }]}>
              {getInitials(name)}
            </Text>
          </View>
        )}
        {isOnline && (
          <View
            style={[styles.onlineIndicator, { borderColor: colors.background }]}
          />
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.nameRow}>
            <Text
              style={[
                styles.name,
                { color: colors.text },
                isUnread && styles.nameUnread,
              ]}
              numberOfLines={1}
            >
              {name}
            </Text>
            {isPinned && (
              <Ionicons
                name="pin"
                size={12}
                color={colors.textTertiary ?? colors.textSecondary}
                style={styles.pinIcon}
              />
            )}
          </View>
          <Text
            style={[
              styles.timestamp,
              {
                color: isUnread
                  ? colors.text
                  : (colors.textTertiary ?? colors.textSecondary),
              },
              isUnread && styles.timestampUnread,
            ]}
          >
            {timestamp}
          </Text>
        </View>

        <View style={styles.messageContainer}>
          <Text
            style={[
              styles.message,
              {
                color: isTyping
                  ? colors.primary
                  : isUnread
                    ? colors.text
                    : colors.textSecondary,
                fontStyle: isTyping ? "italic" : "normal",
                fontWeight: isUnread ? "700" : "400",
              },
            ]}
            numberOfLines={1}
          >
            {preview}
          </Text>
          {isUnread && (
            <View
              style={[styles.unreadBadge, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.unreadCount}>
                {unreadCount > 99 ? "99+" : unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  avatarContainer: { position: "relative", marginRight: 12 },
  avatar: { width: 60, height: 60, borderRadius: 30 },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { fontSize: 20, fontWeight: "bold" },
  onlineIndicator: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#4CAF50",
    borderWidth: 2,
  },
  content: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  nameRow: { flexDirection: "row", alignItems: "center", flex: 1, gap: 4 },
  name: { fontSize: 16, fontWeight: "600", flexShrink: 1 },
  nameUnread: { fontWeight: "800" },
  pinIcon: { marginLeft: 2 },
  timestamp: { fontSize: 12 },
  timestampUnread: { fontWeight: "700" },
  messageContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  message: { fontSize: 14, flex: 1 },
  unreadBadge: {
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  unreadCount: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    paddingHorizontal: 6,
  },
});
