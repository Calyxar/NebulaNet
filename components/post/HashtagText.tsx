// components/post/HashtagText.tsx
// ✅ Twitter-style: tappable #hashtags and @mentions
// #hashtags → /hashtag/[tag]
// @mentions → /user/[username]
// ✅ FIXED: was navigating with the raw, un-lowercased tag text exactly as
// typed in the post (e.g. "#GhostOfYotei" → /hashtag/GhostOfYotei). Every
// other place in this project that handles hashtags (extractHashtags in
// lib/firestore/posts.ts, scripts/algolia-sync-synonyms.ts) lowercases
// first before storing/matching, and Firestore's array-contains is
// case-sensitive — so a hashtag typed with any capital letters would
// navigate to a route that could never find a match, even though posts
// with that hashtag clearly exist. Now lowercases before navigating.
// Display text (what's shown on screen) stays exactly as typed — only the
// navigation target is normalized.

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
                // ✅ FIX: .toLowerCase() — matches the storage/matching
                // convention used everywhere else hashtags are handled.
                router.push(
                  `/hashtag/${seg.value.slice(1).toLowerCase()}` as any,
                );
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
