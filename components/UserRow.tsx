// components/UserRow.tsx
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

export type BadgeTone = "purple" | "neutral";

export function Badge({
  label,
  tone = "purple",
}: {
  label: string;
  tone?: BadgeTone;
}) {
  const isPurple = tone === "purple";
  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: isPurple ? "#EDEBFF" : "#F3F4F6",
          borderColor: isPurple ? "#DDD6FE" : "#E5E7EB",
        },
      ]}
    >
      <Text
        style={[styles.badgeText, { color: isPurple ? "#4C1D95" : "#374151" }]}
      >
        {label}
      </Text>
    </View>
  );
}

export type UserRowModel = {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  status?: "accepted" | "pending";
  isMutual?: boolean; // for "my followers" mutual
  isPrivate?: boolean;
};

export default function UserRow({
  item,
  onPress,
  onMenu,
}: {
  item: UserRowModel;
  onPress: () => void;
  onMenu: () => void;
}) {
  const display = item.full_name || item.username;

  const badges: { label: string; tone?: BadgeTone }[] = [];

  // Priority badges: Requested > Mutual > Private (max 2)
  if (item.status === "pending")
    badges.push({ label: "Requested", tone: "purple" });
  else if (item.isMutual) badges.push({ label: "Mutual", tone: "neutral" });

  if (item.isPrivate) badges.push({ label: "Private", tone: "neutral" });

  const topBadges = badges.slice(0, 2);

  return (
    <Pressable onPress={onPress} style={styles.row}>
      {item.avatar_url ? (
        <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarFallback}>
          <Text style={styles.avatarFallbackText}>
            {(item.username?.[0] || "U").toUpperCase()}
          </Text>
        </View>
      )}

      <View style={{ flex: 1 }}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {display}
          </Text>

          <View style={styles.badgesRow}>
            {topBadges.map((b) => (
              <Badge key={b.label} label={b.label} tone={b.tone} />
            ))}
          </View>
        </View>

        <Text style={styles.handle} numberOfLines={1}>
          @{item.username}
        </Text>
      </View>

      <TouchableOpacity
        onPress={onMenu}
        activeOpacity={0.8}
        style={styles.menuBtn}
      >
        <Ionicons name="ellipsis-vertical" size={18} color="#9CA3AF" />
      </TouchableOpacity>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#EEF2FF",
  },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#7C3AED",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarFallbackText: { color: "#fff", fontWeight: "900", fontSize: 16 },

  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  name: { fontSize: 14, fontWeight: "900", color: "#111827", flex: 1 },
  handle: { fontSize: 12, fontWeight: "800", color: "#6B7280", marginTop: 2 },

  badgesRow: { flexDirection: "row", gap: 6, alignItems: "center" },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeText: { fontSize: 11, fontWeight: "900" },

  menuBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5F5F5",
  },
});
