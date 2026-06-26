// components/chat/ChatHeader.tsx ✅ REDESIGNED — Twitter/X DM header style
// ✅ NEW: avatar next to name (was text-only before)
// ✅ NEW: tapping name/avatar navigates to the other person's profile
// ✅ NEW: onMorePress is now actually wired up from the parent screen
//         (previously supported by this component but never passed in,
//         so the "..." button could never render)
// ✅ REMOVED: onCallPress/onVideoPress — dead props, never passed from
//         the parent screen, and not part of the DM feature set this app
//         actually has. Kept the component focused on what's real rather
//         than carrying unused optional UI forever.

import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface ChatHeaderProps {
  title: string;
  subtitle?: string;
  avatarUrl?: string | null;
  isOnline?: boolean;
  lastSeen?: string;
  onBackPress: () => void;
  onTitlePress?: () => void;
  onMorePress?: () => void;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function ChatHeader({
  title,
  subtitle,
  avatarUrl,
  isOnline = false,
  lastSeen,
  onBackPress,
  onTitlePress,
  onMorePress,
}: ChatHeaderProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.card, borderBottomColor: colors.border },
      ]}
    >
      <View style={styles.leftSection}>
        <TouchableOpacity onPress={onBackPress} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <Pressable
          style={styles.userInfo}
          onPress={onTitlePress}
          disabled={!onTitlePress}
        >
          <View style={styles.avatarWrap}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <View
                style={[
                  styles.avatar,
                  styles.avatarFallback,
                  { backgroundColor: colors.surface },
                ]}
              >
                <Text style={[styles.avatarLetter, { color: colors.primary }]}>
                  {getInitials(title || "?")}
                </Text>
              </View>
            )}
            {isOnline && (
              <View
                style={[styles.onlineIndicator, { borderColor: colors.card }]}
              />
            )}
          </View>

          <View style={styles.nameBlock}>
            <Text
              style={[styles.title, { color: colors.text }]}
              numberOfLines={1}
            >
              {title}
            </Text>
            <Text
              style={[styles.statusText, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {isOnline ? "Online" : lastSeen || subtitle || ""}
            </Text>
          </View>
        </Pressable>
      </View>

      {onMorePress && (
        <TouchableOpacity onPress={onMorePress} style={styles.actionButton}>
          <Ionicons name="ellipsis-vertical" size={22} color={colors.text} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  leftSection: { flexDirection: "row", alignItems: "center", flex: 1 },
  backButton: { padding: 4, marginRight: 10 },
  userInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatarWrap: { position: "relative" },
  avatar: { width: 38, height: 38, borderRadius: 19 },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  avatarLetter: { fontSize: 14, fontWeight: "900" },
  onlineIndicator: {
    position: "absolute",
    bottom: -1,
    right: -1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#34C759",
    borderWidth: 2,
  },
  nameBlock: { flex: 1, minWidth: 0 },
  title: { fontSize: 16, fontWeight: "800" },
  statusText: { fontSize: 12, fontWeight: "600", marginTop: 1 },
  actionButton: { padding: 8 },
});
