// components/HashtagText.tsx ✅
// ✅ Uses "content" prop consistently across all files
import { router } from "expo-router";
import React from "react";
import { Text, type TextStyle } from "react-native";

type Props = {
  content: string;
  style?: TextStyle | TextStyle[];
  hashtagColor?: string;
  numberOfLines?: number;
  onPress?: () => void;
};

function parseContent(content: string): { text: string; isHashtag: boolean }[] {
  const parts = content.split(/(#[a-zA-Z0-9_]+)/g);
  return parts
    .filter((p) => p.length > 0)
    .map((p) => ({ text: p, isHashtag: /^#[a-zA-Z0-9_]+$/.test(p) }));
}

export default function HashtagText({
  content,
  style,
  hashtagColor = "#7c3aed",
  numberOfLines,
  onPress,
}: Props) {
  if (!content) return null;
  const segments = parseContent(content);
  return (
    <Text style={style} numberOfLines={numberOfLines} onPress={onPress}>
      {segments.map((seg, i) => {
        if (!seg.isHashtag) return <Text key={i}>{seg.text}</Text>;
        const tag = seg.text.replace(/^#/, "").toLowerCase();
        return (
          <Text
            key={i}
            style={{ color: hashtagColor, fontWeight: "700" }}
            onPress={(e) => {
              e.stopPropagation?.();
              router.push(`/hashtag/${tag}` as any);
            }}
          >
            {seg.text}
          </Text>
        );
      })}
    </Text>
  );
}
