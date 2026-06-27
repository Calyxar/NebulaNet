// components/MentionInput.tsx — UPDATED: forwards ref to the inner
// TextInput, since callers in this codebase (e.g. app/create/post.tsx's
// title input's onSubmitEditing) call inputRef.current?.focus() and
// expect that to actually reach the real native input.

import { searchUsersForMention } from "@/lib/firestore/mentions";
import { useTheme } from "@/providers/ThemeProvider";
import React, { forwardRef, useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
} from "react-native";

type MentionCandidate = {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
};

type Props = Omit<TextInputProps, "onChangeText" | "value"> & {
  value: string;
  onChangeText: (text: string) => void;
};

function findActiveMention(
  text: string,
  cursorPos: number,
): { handle: string; start: number; end: number } | null {
  const upToCursor = text.slice(0, cursorPos);
  const match = upToCursor.match(/@([a-zA-Z0-9_]*)$/);
  if (!match) return null;
  const start = upToCursor.length - match[0].length;
  return { handle: match[1], start, end: cursorPos };
}

const MentionInput = forwardRef<TextInput, Props>(function MentionInput(
  { value, onChangeText, style, ...rest },
  ref,
) {
  const { colors } = useTheme();
  const [candidates, setCandidates] = useState<MentionCandidate[]>([]);
  const [searching, setSearching] = useState(false);
  const [activeMention, setActiveMention] = useState<{
    start: number;
    end: number;
  } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectionRef = useRef({ start: value.length, end: value.length });

  const runSearch = useCallback((handle: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!handle) {
      setCandidates([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await searchUsersForMention(handle);
        setCandidates(results);
      } finally {
        setSearching(false);
      }
    }, 250);
  }, []);

  const handleChangeText = (text: string) => {
    onChangeText(text);
    const cursorPos = selectionRef.current.end;
    const mention = findActiveMention(text, cursorPos);
    if (mention) {
      setActiveMention({ start: mention.start, end: mention.end });
      runSearch(mention.handle);
    } else {
      setActiveMention(null);
      setCandidates([]);
    }
  };

  const handleSelectionChange = (e: {
    nativeEvent: { selection: { start: number; end: number } };
  }) => {
    selectionRef.current = e.nativeEvent.selection;
  };

  const handlePickCandidate = (candidate: MentionCandidate) => {
    if (!activeMention) return;
    const before = value.slice(0, activeMention.start);
    const after = value.slice(activeMention.end);
    const next = `${before}@${candidate.username} ${after}`;
    onChangeText(next);
    setActiveMention(null);
    setCandidates([]);
  };

  const showDropdown = !!activeMention && (searching || candidates.length > 0);

  return (
    <View>
      <TextInput
        ref={ref}
        {...rest}
        value={value}
        onChangeText={handleChangeText}
        onSelectionChange={handleSelectionChange}
        style={style}
      />
      {showDropdown && (
        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: colors.border,
            marginTop: 6,
            maxHeight: 220,
            overflow: "hidden",
          }}
        >
          {searching && candidates.length === 0 ? (
            <View style={{ padding: 14, alignItems: "center" }}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : (
            <FlatList
              data={candidates}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => handlePickCandidate(item)}
                  activeOpacity={0.85}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                  }}
                >
                  {item.avatar_url ? (
                    <Image
                      source={{ uri: item.avatar_url }}
                      style={{ width: 32, height: 32, borderRadius: 16 }}
                    />
                  ) : (
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: colors.surface,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text
                        style={{ color: colors.primary, fontWeight: "900" }}
                      >
                        {(item.username[0] ?? "U").toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      style={{
                        color: colors.text,
                        fontWeight: "700",
                        fontSize: 14,
                      }}
                      numberOfLines={1}
                    >
                      {item.full_name || item.username}
                    </Text>
                    <Text
                      style={{ color: colors.textTertiary, fontSize: 12 }}
                      numberOfLines={1}
                    >
                      @{item.username}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      )}
    </View>
  );
});

export default MentionInput;
