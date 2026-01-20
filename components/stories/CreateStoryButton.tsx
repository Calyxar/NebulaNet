// components/stories/CreateStoryButton.tsx
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { StyleSheet, TouchableOpacity } from "react-native";

interface CreateStoryButtonProps {
  size?: number;
  onPress?: () => void;
}

export default function CreateStoryButton({
  size = 68,
  onPress,
}: CreateStoryButtonProps) {
  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      // Use type assertion for untyped routes
      router.push("/create/story" as any);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.container, { width: size, height: size }]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Ionicons name="add" size={size * 0.35} color="#000" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 2,
    borderColor: "#e5e5e5",
    borderStyle: "dashed",
    borderRadius: 100,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
  },
});
