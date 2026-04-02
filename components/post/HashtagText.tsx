// components/post/HashtagText.tsx
// ✅ Twitter-style: tappable #hashtags and @mentions
// #hashtags → /hashtag/[tag]
// @mentions → /user/[username]

import { router } from "expo-router";
import React from "react";
import { Text, type TextStyle } from "react-native";

type Segment = {
  type: "text" | "hashtag" | "mention";
  value: string;
};

function parseSegments(text: string): Segment[] {
  return text.split(/(#[a-zA-Z0-9_]+|@[a-zA-Z0-9_.]+)/g).map((part) => {
    if (/^#[a-zA-Z0-9_]+$/.test(part)) return { type: "hashtag", value: part };
    if (/^@[a-zA-Z0-9_.]+$/.test(part)) return { type: "mention", value: part };
    return { type: "text", value: part };
  });
}

interface HashtagTextProps {
  text: string;
  style?: TextStyle | TextStyle[];
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
      {segments.map((seg, i) => {
        if (seg.type === "hashtag") {
          return (
            <Text
              key={i}
              style={[{ color: "#1D9BF0", fontWeight: "400" }, hashtagStyle]}
              onPress={(e) => {
                e.stopPropagation?.();
                router.push(`/hashtag/${seg.value.slice(1)}` as any);
              }}
            >
              {seg.value}
            </Text>
          );
        }
        if (seg.type === "mention") {
          return (
            <Text
              key={i}
              style={[{ color: "#1D9BF0", fontWeight: "400" }, hashtagStyle]}
              onPress={(e) => {
                e.stopPropagation?.();
                router.push(`/user/${seg.value.slice(1)}` as any);
              }}
            >
              {seg.value}
            </Text>
          );
        }
        return <Text key={i}>{seg.value}</Text>;
      })}
    </Text>
  );
}
