// components/navigation/TabBarIcon.tsx - NEW FILE
import { useNotifications } from "@/hooks/useNotifications";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface TabBarIconProps {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
  focused: boolean;
  isNotification?: boolean;
}

export default function TabBarIcon({
  name,
  color,
  focused,
  isNotification = false,
}: TabBarIconProps) {
  const { unreadCount } = useNotifications();

  return (
    <View style={styles.container}>
      <Ionicons name={name} size={focused ? 26 : 24} color={color} />
      {isNotification && unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: -5,
    right: -8,
    backgroundColor: "#FF3B30",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: "#E8EAF6",
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
});
