// components/post/HashtagText.tsx
// Renders text with tappable #hashtags that navigate to /hashtag/[tag]

import { router } from "expo-router";
import React from "react";
import { Text, type TextStyle } from "react-native";

type Segment = { type: "text" | "hashtag"; value: string };

function parseSegments(text: string): Segment[] {
  return text.split(/(#[a-zA-Z0-9_]+)/g).map((part) => ({
    type: /^#[a-zA-Z0-9_]+$/.test(part) ? "hashtag" : "text",
    value: part,
  }));
}

interface HashtagTextProps {
  text: string;
  style?: TextStyle;
  hashtagStyle?: TextStyle;
  numberOfLines?: number;
  onPress?: () => void;
}

export default function HashtagText({
  text,
  style,
  hashtagStyle,
  numberOfLines,
  onPress,
}: HashtagTextProps) {
  const segments = parseSegments(text);

  return (
    <Text style={style} numberOfLines={numberOfLines} onPress={onPress}>
      {segments.map((seg, i) =>
        seg.type === "hashtag" ? (
          <Text
            key={i}
            style={[{ color: "#007AFF", fontWeight: "600" }, hashtagStyle]}
            onPress={(e) => {
              e.stopPropagation?.();
              router.push(`/hashtag/${seg.value.slice(1)}` as any);
            }}
          >
            {seg.value}
          </Text>
        ) : (
          <Text key={i}>{seg.value}</Text>
        ),
      )}
    </Text>
  );
}
