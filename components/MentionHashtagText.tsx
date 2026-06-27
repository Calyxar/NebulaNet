// components/MentionHashtagText.tsx — NEW
// Extends the existing HashtagText pattern (components/HashtagText.tsx)
// to handle BOTH #hashtags and @mentions in one pass, since real post
// content mixes both ("Great game @trish! #ps5") and parsing them
// separately would require two overlapping regex passes fighting over
// the same string. Same visual/interaction pattern as HashtagText:
// styled, tappable spans that navigate on press.

import { router } from "expo-router";
import React from "react";
import { Text, type TextStyle } from "react-native";

type Props = {
  content: string;
  style?: TextStyle | TextStyle[];
  hashtagColor?: string;
  mentionColor?: string;
  numberOfLines?: number;
  onPress?: () => void;
};

type Segment =
  | { type: "text"; text: string }
  | { type: "hashtag"; text: string; tag: string }
  | { type: "mention"; text: string; handle: string };

function parseContent(content: string): Segment[] {
  // Single combined regex so hashtag/mention spans are found in one
  // left-to-right pass — matches HashtagText's split-based approach but
  // distinguishes which kind of span each match is.
  const parts = content.split(/(#[a-zA-Z0-9_]+|@[a-zA-Z0-9_]+)/g);
  return parts
    .filter((p) => p.length > 0)
    .map((p): Segment => {
      if (/^#[a-zA-Z0-9_]+$/.test(p)) {
        return { type: "hashtag", text: p, tag: p.replace(/^#/, "").toLowerCase() };
      }
      if (/^@[a-zA-Z0-9_]+$/.test(p)) {
        return { type: "mention", text: p, handle: p.replace(/^@/, "") };
      }
      return { type: "text", text: p };
    });
}

export default function MentionHashtagText({
  content,
  style,
  hashtagColor = "#7c3aed",
  mentionColor = "#2563eb",
  numberOfLines,
  onPress,
}: Props) {
  if (!content) return null;
  const segments = parseContent(content);
  return (
    <Text style={style} numberOfLines={numberOfLines} onPress={onPress}>
      {segments.map((seg, i) => {
        if (seg.type === "text") return <Text key={i}>{seg.text}</Text>;
        if (seg.type === "hashtag") {
          return (
            <Text
              key={i}
              style={{ color: hashtagColor, fontWeight: "700" }}
              onPress={(e) => {
                e.stopPropagation?.();
                router.push(`/hashtag/${seg.tag}` as any);
              }}
            >
              {seg.text}
            </Text>
          );
        }
        // mention
        return (
          <Text
            key={i}
            style={{ color: mentionColor, fontWeight: "700" }}
            onPress={(e) => {
              e.stopPropagation?.();
              router.push(`/user/${seg.handle}` as any);
            }}
          >
            {seg.text}
          </Text>
        );
      })}
    </Text>
  );
}
