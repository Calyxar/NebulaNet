// components/user/FounderBadge.tsx — NEW ✅
// Small purple pill shown next to display name for first 100 users

import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface Props {
  size?: "sm" | "md";
}

export default function FounderBadge({ size = "md" }: Props) {
  const isSmall = size === "sm";
  return (
    <View style={[styles.badge, isSmall && styles.badgeSm]}>
      <Ionicons name="star" size={isSmall ? 9 : 11} color="#fff" />
      <Text style={[styles.text, isSmall && styles.textSm]}>Founder</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#7C3AED",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  badgeSm: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  text: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  textSm: {
    fontSize: 10,
  },
});
