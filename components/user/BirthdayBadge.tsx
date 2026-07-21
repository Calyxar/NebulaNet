// components/user/BirthdayBadge.tsx
// Small 🎈 badge shown next to a display name when it's that profile's
// birthday. Mirrors the existing FounderBadge component's pattern:
// self-contained, no layout assumptions beyond "sits inline in a name row".
//
// Tap-to-replay: passing onPress lets the parent screen re-trigger the
// balloon overlay (see BirthdayBallons.tsx) even after it's already played
// once this session.

import { useBirthday } from "@/hooks/useBirthday";
import { FirebaseFirestoreTypes } from "@react-native-firebase/firestore";
import React from "react";
import { Text, TouchableOpacity, TouchableOpacityProps } from "react-native";

type BirthdayBadgeProps = {
  profile?: {
    birthDate?: FirebaseFirestoreTypes.Timestamp | null;
    showBirthday?: boolean | null;
  } | null;
  onPress?: () => void;
  size?: number;
} & Omit<TouchableOpacityProps, "onPress">;

/**
 * Renders nothing if it isn't this profile's birthday today (or they
 * haven't opted in via showBirthday) — safe to drop into any name row
 * unconditionally, same as <FounderBadge /> for is_founder.
 */
export default function BirthdayBadge({
  profile,
  onPress,
  size = 18,
  ...touchableProps
}: BirthdayBadgeProps) {
  const isBirthday = useBirthday(profile);

  if (!isBirthday) return null;

  if (!onPress) {
    return <Text style={{ fontSize: size }}>🎈</Text>;
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      hitSlop={8}
      {...touchableProps}
    >
      <Text style={{ fontSize: size }}>🎈</Text>
    </TouchableOpacity>
  );
}
