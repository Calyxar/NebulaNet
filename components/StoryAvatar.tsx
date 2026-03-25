// components/StoryAvatar.tsx
// Instagram-style avatar with gradient ring for unseen stories, gray for seen
// Usage:
//   <StoryAvatar userId={user.id} avatarUrl={user.avatar_url} size={56} onPress={() => router.push(`/story/${storyId}`)} />

import { useStoryRing } from "@/hooks/useStoryRing";
import { useTheme } from "@/providers/ThemeProvider";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

// Instagram-style purple→pink→orange gradient
const RING_GRADIENT: [string, string, string, string] = [
  "#833AB4",
  "#C13584",
  "#E1306C",
  "#F77737",
];
const SEEN_COLOR = "#9CA3AF"; // gray-400

interface Props {
  userId?: string;
  avatarUrl?: string | null;
  name?: string;
  size?: number;
  onPress?: () => void;
  showRing?: boolean; // override to always show/hide ring
  disableRingCheck?: boolean; // skip hook if you're managing state externally
}

export default function StoryAvatar({
  userId,
  avatarUrl,
  name = "U",
  size = 56,
  onPress,
  showRing,
  disableRingCheck = false,
}: Props) {
  const { colors } = useTheme();
  const ringState = useStoryRing(disableRingCheck ? undefined : userId);

  // Determine what ring to show
  const effectiveRing =
    showRing !== undefined ? (showRing ? "unseen" : "none") : ringState;

  const RING_WIDTH = Math.max(2, Math.round(size * 0.05));
  const GAP = Math.max(2, Math.round(size * 0.04));
  const outerSize =
    effectiveRing !== "none" ? size + (RING_WIDTH + GAP) * 2 : size;
  const initials = (name[0] || "U").toUpperCase();

  const inner = (
    <View
      style={[
        styles.avatarWrap,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      {avatarUrl ? (
        <Image
          source={{ uri: avatarUrl }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
        />
      ) : (
        <View
          style={[
            styles.fallback,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: colors.surface,
            },
          ]}
        >
          <Text
            style={[
              styles.fallbackText,
              { color: colors.primary, fontSize: size * 0.38 },
            ]}
          >
            {initials}
          </Text>
        </View>
      )}
    </View>
  );

  if (effectiveRing === "none") {
    return onPress ? (
      <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
        {inner}
      </TouchableOpacity>
    ) : (
      inner
    );
  }

  const ringEl =
    effectiveRing === "unseen" ? (
      // Gradient ring for unseen stories
      <LinearGradient
        colors={RING_GRADIENT}
        start={{ x: 0.2, y: 1 }}
        end={{ x: 1, y: 0 }}
        style={[
          styles.ring,
          {
            width: outerSize,
            height: outerSize,
            borderRadius: outerSize / 2,
            padding: RING_WIDTH,
          },
        ]}
      >
        <View
          style={[
            styles.ringGap,
            {
              borderRadius: (outerSize - RING_WIDTH * 2) / 2,
              backgroundColor: colors.background,
            },
          ]}
        >
          {inner}
        </View>
      </LinearGradient>
    ) : (
      // Gray ring for seen stories
      <View
        style={[
          styles.ring,
          {
            width: outerSize,
            height: outerSize,
            borderRadius: outerSize / 2,
            padding: RING_WIDTH,
            backgroundColor: SEEN_COLOR,
          },
        ]}
      >
        <View
          style={[
            styles.ringGap,
            {
              borderRadius: (outerSize - RING_WIDTH * 2) / 2,
              backgroundColor: colors.background,
            },
          ]}
        >
          {inner}
        </View>
      </View>
    );

  return onPress ? (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{ width: outerSize, height: outerSize }}
    >
      {ringEl}
    </TouchableOpacity>
  ) : (
    ringEl
  );
}

const styles = StyleSheet.create({
  avatarWrap: { overflow: "hidden" },
  fallback: { alignItems: "center", justifyContent: "center" },
  fallbackText: { fontWeight: "900" },
  ring: { alignItems: "center", justifyContent: "center" },
  ringGap: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
});
