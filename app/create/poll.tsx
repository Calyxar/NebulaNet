// app/create/poll.tsx ✅ — with NSFW toggle
import { useAuth } from "@/hooks/useAuth";
import { createPoll } from "@/lib/firestore/polls";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type PollDurationDays = 1 | 3 | 7 | 14;
type PollOptionInput = { id: string; text: string };

const MAX_QUESTION = 140;
const MAX_OPTION = 80;
const MIN_OPTIONS = 2;
const MAX_OPTIONS = 6;
const DURATION_CHOICES: PollDurationDays[] = [1, 3, 7, 14];
const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

// ✅ Basic explicit keyword pre-scan
const EXPLICIT_KEYWORDS = [
  "nsfw",
  "nude",
  "naked",
  "porn",
  "sex",
  "xxx",
  "adult content",
  "explicit",
  "18+",
  "onlyfans",
  "hentai",
  "lewd",
];
function containsExplicitText(text: string): boolean {
  const lower = text.toLowerCase();
  return EXPLICIT_KEYWORDS.some((kw) => lower.includes(kw));
}

export default function CreatePollScreen() {
  const { profile } = useAuth();
  const { colors, isDark } = useTheme();

  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<PollOptionInput[]>([
    { id: makeId(), text: "" },
    { id: makeId(), text: "" },
  ]);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [durationDays, setDurationDays] = useState<PollDurationDays>(7);
  const [isLoading, setIsLoading] = useState(false);
  // ✅ NSFW toggle
  const [isNsfw, setIsNsfw] = useState(false);

  const charCount = useMemo(() => question.trim().length, [question]);
  const canPost = useMemo(
    () =>
      question.trim().length > 0 &&
      options.filter((o) => o.text.trim()).length >= MIN_OPTIONS &&
      !isLoading,
    [question, options, isLoading],
  );

  const avatarLetter = profile?.username?.charAt(0).toUpperCase() ?? "U";

  const updateOption = (id: string, text: string) =>
    setOptions((prev) => prev.map((o) => (o.id === id ? { ...o, text } : o)));

  const addOption = () => {
    if (options.length >= MAX_OPTIONS) return;
    setOptions((prev) => [...prev, { id: makeId(), text: "" }]);
  };

  const removeOption = (id: string) => {
    if (options.length <= MIN_OPTIONS) return;
    setOptions((prev) => prev.filter((o) => o.id !== id));
  };

  const handlePost = async () => {
    if (!canPost) return;
    const cleaned = options.map((o) => o.text.trim()).filter(Boolean);
    if (new Set(cleaned.map((t) => t.toLowerCase())).size !== cleaned.length) {
      Alert.alert("Duplicate options", "Please remove duplicate options.");
      return;
    }

    // ✅ Auto-detect explicit content in question or options
    const allText = [question, ...cleaned].join(" ");
    let finalIsNsfw = isNsfw;
    if (!isNsfw && containsExplicitText(allText)) {
      finalIsNsfw = true;
      Alert.alert(
        "Content Warning",
        "Your poll contains content that has been automatically marked as NSFW.",
        [{ text: "OK" }],
      );
    }

    setIsLoading(true);
    try {
      await createPoll({
        question: question.trim(),
        options: cleaned,
        allow_multiple: allowMultiple,
        is_anonymous: false,
        duration_days: durationDays,
        visibility: "public",
        is_nsfw: finalIsNsfw,
      } as any);
      router.back();
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to create poll.");
    } finally {
      setIsLoading(false);
    }
  };

  const content = (
    <SafeAreaView
      style={[styles.container, { backgroundColor: "transparent" }]}
      edges={["top", "left", "right"]}
    >
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.cancelBtn}
            disabled={isLoading}
          >
            <Text style={[styles.cancelText, { color: colors.text }]}>
              Cancel
            </Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Create Poll
          </Text>
          <TouchableOpacity
            style={[
              styles.postBtn,
              {
                backgroundColor: canPost
                  ? colors.primary
                  : colors.primary + "60",
              },
            ]}
            onPress={handlePost}
            disabled={!canPost}
          >
            <Text style={styles.postBtnText}>
              {isLoading ? "Posting..." : "Post"}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.composerRow}>
            <View style={styles.avatarCol}>
              {profile?.avatar_url ? (
                <Image
                  source={{ uri: profile.avatar_url }}
                  style={styles.avatar}
                />
              ) : (
                <View
                  style={[
                    styles.avatarFallback,
                    { backgroundColor: colors.primary },
                  ]}
                >
                  <Text style={styles.avatarLetter}>{avatarLetter}</Text>
                </View>
              )}
              <View
                style={[styles.avatarLine, { backgroundColor: colors.border }]}
              />
            </View>
            <View style={styles.inputCol}>
              <TextInput
                style={[styles.questionInput, { color: colors.text }]}
                placeholder="Ask a question..."
                placeholderTextColor={colors.textTertiary}
                value={question}
                onChangeText={setQuestion}
                multiline
                autoFocus
                maxLength={MAX_QUESTION + 20}
              />
              {charCount > 0 && (
                <Text
                  style={[
                    styles.charCount,
                    {
                      color:
                        charCount > MAX_QUESTION * 0.8
                          ? "#F59E0B"
                          : colors.textTertiary,
                    },
                    charCount > MAX_QUESTION && { color: "#EF4444" },
                  ]}
                >
                  {MAX_QUESTION - charCount}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.optionsSection}>
            <View style={styles.avatarColSpacer} />
            <View style={styles.optionsCol}>
              <Text
                style={[styles.sectionLabel, { color: colors.textSecondary }]}
              >
                Poll options
              </Text>

              {options.map((opt, idx) => (
                <View key={opt.id} style={styles.optionRow}>
                  <View
                    style={[
                      styles.optionInputWrap,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <TextInput
                      value={opt.text}
                      onChangeText={(t) => updateOption(opt.id, t)}
                      placeholder={
                        idx < 2
                          ? `Option ${idx + 1}`
                          : `Option ${idx + 1} (optional)`
                      }
                      placeholderTextColor={colors.textTertiary}
                      style={[styles.optionInput, { color: colors.text }]}
                      maxLength={MAX_OPTION}
                    />
                  </View>
                  {options.length > MIN_OPTIONS && (
                    <TouchableOpacity
                      onPress={() => removeOption(opt.id)}
                      style={styles.removeBtn}
                    >
                      <Ionicons
                        name="close-circle"
                        size={20}
                        color={colors.textTertiary}
                      />
                    </TouchableOpacity>
                  )}
                </View>
              ))}

              {options.length < MAX_OPTIONS && (
                <TouchableOpacity
                  style={styles.addOptionBtn}
                  onPress={addOption}
                >
                  <Ionicons name="add" size={18} color={colors.primary} />
                  <Text
                    style={[styles.addOptionText, { color: colors.primary }]}
                  >
                    Add option
                  </Text>
                </TouchableOpacity>
              )}

              <View
                style={[
                  styles.settingsCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                {/* Multiple choice */}
                <TouchableOpacity
                  style={styles.settingRow}
                  onPress={() => setAllowMultiple((p) => !p)}
                  activeOpacity={0.85}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.settingTitle, { color: colors.text }]}>
                      Multiple choice
                    </Text>
                    <Text
                      style={[
                        styles.settingSubtitle,
                        { color: colors.textTertiary },
                      ]}
                    >
                      Let people pick more than one
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.toggle,
                      allowMultiple
                        ? {
                            backgroundColor: colors.primary,
                            alignItems: "flex-end",
                          }
                        : {
                            backgroundColor: colors.border,
                            alignItems: "flex-start",
                          },
                    ]}
                  >
                    <View
                      style={[styles.toggleDot, { backgroundColor: "#fff" }]}
                    />
                  </View>
                </TouchableOpacity>

                <View
                  style={[styles.divider, { backgroundColor: colors.border }]}
                />

                {/* Duration */}
                <View>
                  <Text style={[styles.settingTitle, { color: colors.text }]}>
                    Poll length
                  </Text>
                  <Text
                    style={[
                      styles.settingSubtitle,
                      { color: colors.textTertiary },
                    ]}
                  >
                    Ends in {durationDays} day{durationDays > 1 ? "s" : ""}
                  </Text>
                  <View style={styles.durationRow}>
                    {DURATION_CHOICES.map((d) => (
                      <TouchableOpacity
                        key={d}
                        activeOpacity={0.85}
                        style={[
                          styles.durationChip,
                          {
                            borderColor: colors.border,
                            backgroundColor: colors.surface,
                          },
                          d === durationDays && {
                            backgroundColor: colors.primary + "18",
                            borderColor: colors.primary,
                          },
                        ]}
                        onPress={() => setDurationDays(d)}
                      >
                        <Text
                          style={[
                            styles.durationChipText,
                            {
                              color:
                                d === durationDays
                                  ? colors.primary
                                  : colors.textSecondary,
                            },
                          ]}
                        >
                          {d}d
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View
                  style={[styles.divider, { backgroundColor: colors.border }]}
                />

                {/* ✅ NSFW toggle */}
                <TouchableOpacity
                  style={styles.settingRow}
                  onPress={() => setIsNsfw((p) => !p)}
                  activeOpacity={0.85}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.settingTitle,
                        { color: isNsfw ? "#EF4444" : colors.text },
                      ]}
                    >
                      Mark as NSFW
                    </Text>
                    <Text
                      style={[
                        styles.settingSubtitle,
                        { color: colors.textTertiary },
                      ]}
                    >
                      {isNsfw
                        ? "Poll marked as adult content"
                        : "Mark if poll contains explicit topics"}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.toggle,
                      isNsfw
                        ? { backgroundColor: "#EF4444", alignItems: "flex-end" }
                        : {
                            backgroundColor: colors.border,
                            alignItems: "flex-start",
                          },
                    ]}
                  >
                    <View
                      style={[styles.toggleDot, { backgroundColor: "#fff" }]}
                    />
                  </View>
                </TouchableOpacity>
              </View>

              {/* ✅ NSFW warning banner */}
              {isNsfw && (
                <View
                  style={[
                    styles.nsfwBanner,
                    {
                      backgroundColor: "#EF4444" + "12",
                      borderColor: "#EF4444" + "30",
                    },
                  ]}
                >
                  <Ionicons name="warning-outline" size={16} color="#EF4444" />
                  <Text style={[styles.nsfwBannerText, { color: "#EF4444" }]}>
                    This poll will only be visible to users who have enabled
                    adult content.
                  </Text>
                </View>
              )}

              <View style={{ height: 32 }} />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

  if (!isDark) {
    return (
      <LinearGradient
        colors={["#DCEBFF", "#EEF4FF", "#FFFFFF"]}
        locations={[0, 0.45, 1]}
        style={{ flex: 1 }}
      >
        {content}
      </LinearGradient>
    );
  }
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  cancelBtn: { paddingVertical: 6, paddingHorizontal: 4, minWidth: 60 },
  cancelText: { fontSize: 16, fontWeight: "500" },
  headerTitle: { fontSize: 16, fontWeight: "800" },
  postBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 999,
    minWidth: 72,
    alignItems: "center",
  },
  postBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  scroll: { flex: 1 },
  composerRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  avatarCol: { alignItems: "center" },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: { color: "#fff", fontWeight: "700", fontSize: 18 },
  avatarLine: {
    width: 2,
    flex: 1,
    minHeight: 20,
    marginTop: 8,
    borderRadius: 1,
  },
  inputCol: { flex: 1, paddingBottom: 8 },
  questionInput: { fontSize: 17, lineHeight: 24, minHeight: 80, paddingTop: 0 },
  charCount: { fontSize: 13, fontWeight: "600", marginTop: 4 },
  optionsSection: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 12,
    paddingTop: 8,
    paddingBottom: 24,
  },
  avatarColSpacer: { width: 44 },
  optionsCol: { flex: 1 },
  sectionLabel: { fontSize: 13, fontWeight: "700", marginBottom: 10 },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  optionInputWrap: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  optionInput: { fontSize: 15 },
  removeBtn: { padding: 4 },
  addOptionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    marginBottom: 16,
  },
  addOptionText: { fontSize: 15, fontWeight: "600" },
  settingsCard: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 0 },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  settingTitle: { fontSize: 14, fontWeight: "700" },
  settingSubtitle: { fontSize: 13, marginTop: 2 },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    padding: 3,
    justifyContent: "center",
  },
  toggleDot: { width: 22, height: 22, borderRadius: 11 },
  divider: { height: 1, marginVertical: 14 },
  durationRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  durationChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  durationChipText: { fontSize: 14, fontWeight: "700" },
  nsfwBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
  },
  nsfwBannerText: { flex: 1, fontSize: 12, lineHeight: 17 },
});
