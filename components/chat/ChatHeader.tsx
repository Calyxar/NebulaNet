// components/chat/ChatHeader.tsx ✅ THEMED
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface ChatHeaderProps {
  title: string;
  subtitle?: string;
  isOnline?: boolean;
  lastSeen?: string;
  onBackPress: () => void;
  onMorePress?: () => void;
  onCallPress?: () => void;
  onVideoPress?: () => void;
}

export default function ChatHeader({
  title,
  subtitle,
  isOnline = false,
  lastSeen,
  onBackPress,
  onMorePress,
  onCallPress,
  onVideoPress,
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
        <View style={styles.userInfo}>
          <Text
            style={[styles.title, { color: colors.text }]}
            numberOfLines={1}
          >
            {title}
          </Text>
          <View style={styles.statusContainer}>
            {isOnline ? (
              <>
                <View style={styles.onlineDot} />
                <Text
                  style={[styles.statusText, { color: colors.textSecondary }]}
                >
                  Online
                </Text>
              </>
            ) : (
              <Text
                style={[styles.statusText, { color: colors.textSecondary }]}
              >
                {lastSeen || subtitle || "Offline"}
              </Text>
            )}
          </View>
        </View>
      </View>

      <View style={styles.rightSection}>
        {onVideoPress && (
          <TouchableOpacity onPress={onVideoPress} style={styles.actionButton}>
            <Ionicons name="videocam-outline" size={24} color={colors.text} />
          </TouchableOpacity>
        )}
        {onCallPress && (
          <TouchableOpacity onPress={onCallPress} style={styles.actionButton}>
            <Ionicons name="call-outline" size={22} color={colors.text} />
          </TouchableOpacity>
        )}
        {onMorePress && (
          <TouchableOpacity onPress={onMorePress} style={styles.actionButton}>
            <Ionicons name="ellipsis-vertical" size={24} color={colors.text} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  leftSection: { flexDirection: "row", alignItems: "center", flex: 1 },
  backButton: { padding: 4, marginRight: 12 },
  userInfo: { flex: 1 },
  title: { fontSize: 18, fontWeight: "900", marginBottom: 2 },
  statusContainer: { flexDirection: "row", alignItems: "center" },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#34C759",
    marginRight: 6,
  },
  statusText: { fontSize: 12, fontWeight: "700" },
  rightSection: { flexDirection: "row", alignItems: "center" },
  actionButton: { padding: 8, marginLeft: 12 },
});
