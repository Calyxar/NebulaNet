// components/UserRow.tsx — UPDATED ✅
// ✅ Full useTheme() support — no hardcoded colors
// ✅ trailingAction?: ReactNode — optional slot before menu button
//    Used by followers screen for "Follow back" button
// ✅ hideMenu?: boolean — hide ⋮ when not needed
// ✅ Badge tones adapt to dark/light theme

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

export type BadgeTone = "purple" | "neutral";

export function Badge({
  label,
  tone = "purple",
}: {
  label: string;
  tone?: BadgeTone;
}) {
  const { colors, isDark } = useTheme();
  const isPurple = tone === "purple";

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: isPurple ? colors.primary + "18" : colors.surface,
          borderColor: isPurple ? colors.primary + "30" : colors.border,
        },
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          { color: isPurple ? colors.primary : colors.textTertiary },
        ]}
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
  isMutual?: boolean;
  isPrivate?: boolean;
};

export default function UserRow({
  item,
  onPress,
  onMenu,
  trailingAction,
  hideMenu,
}: {
  item: UserRowModel;
  onPress: () => void;
  onMenu?: () => void;
  trailingAction?: React.ReactNode;
  hideMenu?: boolean;
}) {
  const { colors, isDark } = useTheme();
  const display = item.full_name || item.username;

  const badges: { label: string; tone?: BadgeTone }[] = [];
  if (item.status === "pending")
    badges.push({ label: "Requested", tone: "purple" });
  else if (item.isMutual) badges.push({ label: "Mutual", tone: "neutral" });
  if (item.isPrivate) badges.push({ label: "Private", tone: "neutral" });
  const topBadges = badges.slice(0, 2);

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.row,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
      ]}
    >
      {/* Avatar */}
      {item.avatar_url ? (
        <Image
          source={{ uri: item.avatar_url }}
          style={[styles.avatar, { backgroundColor: colors.surface }]}
        />
      ) : (
        <View
          style={[
            styles.avatarFallback,
            { backgroundColor: colors.primary + "22" },
          ]}
        >
          <Text style={[styles.avatarFallbackText, { color: colors.primary }]}>
            {(item.username?.[0] || "U").toUpperCase()}
          </Text>
        </View>
      )}

      {/* Name + handle */}
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            {display}
          </Text>
          {topBadges.length > 0 && (
            <View style={styles.badgesRow}>
              {topBadges.map((b) => (
                <Badge key={b.label} label={b.label} tone={b.tone} />
              ))}
            </View>
          )}
        </View>
        <Text
          style={[styles.handle, { color: colors.textTertiary }]}
          numberOfLines={1}
        >
          @{item.username}
        </Text>
      </View>

      {/* Optional action slot (e.g. "Follow back") */}
      {trailingAction}

      {/* Menu button */}
      {!hideMenu && onMenu && (
        <TouchableOpacity
          onPress={onMenu}
          activeOpacity={0.8}
          style={[styles.menuBtn, { backgroundColor: colors.surface }]}
        >
          <Ionicons
            name="ellipsis-vertical"
            size={18}
            color={colors.textTertiary}
          />
        </TouchableOpacity>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
  },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarFallbackText: { fontWeight: "900", fontSize: 16 },

  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  name: { fontSize: 14, fontWeight: "900", flexShrink: 1 },
  handle: { fontSize: 12, fontWeight: "700", marginTop: 2 },

  badgesRow: { flexDirection: "row", gap: 5, alignItems: "center" },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeText: { fontSize: 11, fontWeight: "800" },

  menuBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
});
