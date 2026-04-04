// components/post/HashtagInput.tsx — UPDATED ✅
// ✅ Twitter-style inline hashtag coloring using app primary purple
// ✅ Autocomplete dropdown from Firestore hashtags collection
// ✅ Deduplication — same hashtag typed twice only shows once in chips
// ✅ @mention support — also colored purple
// ✅ No hideous raw text — mirror overlay keeps colors clean

import { db } from "@/lib/firebase";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import {
  collection,
  endAt,
  getDocs,
  limit,
  orderBy,
  query,
  startAt,
} from "firebase/firestore";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  TouchableOpacity,
  View,
} from "react-native";

interface Props extends Omit<
  TextInputProps,
  "style" | "value" | "onChangeText"
> {
  value: string;
  onChangeText: (text: string) => void;
  minHeight?: number;
  fontSize?: number;
}

interface HashtagSuggestion {
  tag: string;
  post_count: number;
}

function getActiveHashtag(text: string, cursorPos: number): string | null {
  const before = text.slice(0, cursorPos);
  const match = before.match(/#([a-zA-Z0-9_]*)$/);
  if (!match) return null;
  const after = text[cursorPos];
  if (after && /[a-zA-Z0-9_]/.test(after)) return null;
  return match[1];
}

function completeHashtag(text: string, cursorPos: number, tag: string): string {
  const before = text.slice(0, cursorPos);
  const after = text.slice(cursorPos);
  const replaced = before.replace(/#([a-zA-Z0-9_]*)$/, `#${tag} `);
  return replaced + after;
}

function parseSegments(text: string) {
  return text
    .split(/(#[a-zA-Z0-9_]+|@[a-zA-Z0-9_.]+)/g)
    .filter((p) => p.length > 0)
    .map((p) => ({
      text: p,
      isTag: /^(#[a-zA-Z0-9_]+|@[a-zA-Z0-9_.]+)$/.test(p),
    }));
}

// ✅ Deduplication: extract unique lowercase hashtags from text
export function extractUniqueHashtags(text: string): string[] {
  const matches = text.match(/#([a-zA-Z0-9_]+)/g) ?? [];
  return [...new Set(matches.map((m) => m.toLowerCase()))];
}

async function fetchSuggestions(prefix: string): Promise<HashtagSuggestion[]> {
  try {
    if (!prefix) {
      const q = query(
        collection(db, "hashtags"),
        orderBy("post_count", "desc"),
        limit(6),
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({
        tag: d.id,
        post_count: (d.data() as any).post_count ?? 0,
      }));
    }
    const lower = prefix.toLowerCase();
    const q = query(
      collection(db, "hashtags"),
      orderBy("__name__"),
      startAt(lower),
      endAt(lower + "\uf8ff"),
      limit(6),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      tag: d.id,
      post_count: (d.data() as any).post_count ?? 0,
    }));
  } catch {
    return [];
  }
}

export default function HashtagInput({
  value,
  onChangeText,
  minHeight = 100,
  fontSize = 15,
  placeholder,
  placeholderTextColor,
  ...rest
}: Props) {
  const { colors } = useTheme();
  const inputRef = useRef<TextInput>(null);
  const [cursorPos, setCursorPos] = useState(value.length);
  const [suggestions, setSuggestions] = useState<HashtagSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const fetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeTag = getActiveHashtag(value, cursorPos);
  const isTypingHashtag = activeTag !== null;

  useEffect(() => {
    if (!isTypingHashtag) {
      setShowSuggestions(false);
      setSuggestions([]);
      return;
    }
    setShowSuggestions(true);
    if (fetchTimer.current) clearTimeout(fetchTimer.current);
    fetchTimer.current = setTimeout(async () => {
      setLoadingSuggestions(true);
      try {
        const results = await fetchSuggestions(activeTag);
        setSuggestions(results);
      } catch {
        setSuggestions([]);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 250);
    return () => {
      if (fetchTimer.current) clearTimeout(fetchTimer.current);
    };
  }, [isTypingHashtag, activeTag]);

  const handleSuggestionPress = useCallback(
    (tag: string) => {
      const newText = completeHashtag(value, cursorPos, tag);
      onChangeText(newText);
      setShowSuggestions(false);
      setSuggestions([]);
      const newCursor = newText.length - (value.length - cursorPos);
      setTimeout(() => {
        inputRef.current?.setNativeProps?.({
          selection: { start: newCursor, end: newCursor },
        });
      }, 50);
    },
    [value, cursorPos, onChangeText],
  );

  const segments = parseSegments(value);
  const lineH = Math.round(fontSize * 1.5);

  const sharedStyle = {
    fontSize,
    lineHeight: lineH,
    fontWeight: "400" as const,
    paddingTop: 0,
    paddingBottom: 0,
  };

  // ✅ Deduplicated hashtag chips
  const uniqueHashtags = extractUniqueHashtags(value);

  return (
    <View>
      {/* Suggestion dropdown */}
      {showSuggestions && (
        <View
          style={[
            styles.dropdown,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          {loadingSuggestions ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : suggestions.length === 0 ? (
            <View style={styles.loadingRow}>
              <Text style={[styles.noResults, { color: colors.textTertiary }]}>
                No hashtags found
              </Text>
            </View>
          ) : (
            <FlatList
              data={suggestions}
              keyExtractor={(item) => item.tag}
              scrollEnabled={false}
              keyboardShouldPersistTaps="always"
              renderItem={({ item, index }) => (
                <TouchableOpacity
                  style={[
                    styles.suggestionRow,
                    index !== 0 && [
                      styles.suggestionBorder,
                      { borderTopColor: colors.border },
                    ],
                  ]}
                  onPress={() => handleSuggestionPress(item.tag)}
                  activeOpacity={0.85}
                >
                  <View
                    style={[
                      styles.hashIcon,
                      { backgroundColor: colors.primary + "18" },
                    ]}
                  >
                    <Text
                      style={[styles.hashSymbol, { color: colors.primary }]}
                    >
                      #
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[styles.suggestionTag, { color: colors.text }]}
                    >
                      #{item.tag}
                    </Text>
                    {item.post_count > 0 && (
                      <Text
                        style={[
                          styles.suggestionCount,
                          { color: colors.textTertiary },
                        ]}
                      >
                        {item.post_count.toLocaleString()}{" "}
                        {item.post_count === 1 ? "post" : "posts"}
                      </Text>
                    )}
                  </View>
                  <Ionicons
                    name="trending-up"
                    size={14}
                    color={colors.textTertiary}
                  />
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      )}

      {/* Input area with mirror overlay */}
      <View style={{ minHeight }}>
        {/* Mirror — colored hashtags visible through transparent input */}
        <Text
          style={[styles.mirror, sharedStyle, { minHeight }]}
          aria-hidden
          selectable={false}
        >
          {value.length === 0 ? (
            <Text style={{ color: "transparent" }}> </Text>
          ) : (
            segments.map((seg, i) =>
              seg.isTag ? (
                <Text
                  key={i}
                  style={{ color: colors.primary, fontWeight: "600" }}
                >
                  {seg.text}
                </Text>
              ) : (
                <Text key={i} style={{ color: "transparent" }}>
                  {seg.text}
                </Text>
              ),
            )
          )}
          {"\n "}
        </Text>

        {/* Transparent TextInput on top */}
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={placeholderTextColor}
          multiline
          onSelectionChange={(e) => setCursorPos(e.nativeEvent.selection.end)}
          style={[
            StyleSheet.absoluteFillObject,
            sharedStyle,
            { color: colors.text, backgroundColor: "transparent", minHeight },
          ]}
          {...rest}
        />
      </View>

      {/* ✅ Deduplicated hashtag chip preview */}
      {uniqueHashtags.length > 0 && (
        <View
          style={[
            styles.chipsWrap,
            {
              backgroundColor: colors.primary + "10",
              borderColor: colors.primary + "25",
            },
          ]}
        >
          <Text style={[styles.chipsLabel, { color: colors.primary }]}>
            Hashtags in your post
          </Text>
          <View style={styles.chips}>
            {uniqueHashtags.map((tag) => (
              <View
                key={tag}
                style={[
                  styles.chip,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.primary + "30",
                  },
                ]}
              >
                <Text style={[styles.chipText, { color: colors.primary }]}>
                  {tag}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  dropdown: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    overflow: "hidden",
  },
  loadingRow: { paddingVertical: 14, alignItems: "center" },
  noResults: { fontSize: 13, fontWeight: "600" },
  suggestionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  suggestionBorder: { borderTopWidth: 1 },
  hashIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  hashSymbol: { fontSize: 18, fontWeight: "900" },
  suggestionTag: { fontSize: 14, fontWeight: "800" },
  suggestionCount: { fontSize: 12, fontWeight: "600", marginTop: 1 },
  mirror: { width: "100%" },
  chipsWrap: {
    marginTop: 10,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  chipsLabel: {
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 7,
    letterSpacing: 0.3,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: { fontSize: 12, fontWeight: "700" },
});
