// app/create/poll.tsx — REDESIGNED ✅ matches Twitter-style composer
import { useAuth } from "@/hooks/useAuth";
import { createPoll } from "@/lib/firestore/polls";
import { Ionicons } from "@expo/vector-icons";
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

export default function CreatePollScreen() {
  const { profile } = useAuth();

  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<PollOptionInput[]>([
    { id: makeId(), text: "" },
    { id: makeId(), text: "" },
  ]);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [durationDays, setDurationDays] = useState<PollDurationDays>(7);
  const [isLoading, setIsLoading] = useState(false);

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

    const dupes =
      new Set(cleaned.map((t) => t.toLowerCase())).size !== cleaned.length;
    if (dupes) {
      Alert.alert("Duplicate options", "Please remove duplicate options.");
      return;
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
      });
      router.back();
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to create poll.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.cancelBtn}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.postBtn, !canPost && styles.postBtnDisabled]}
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
            {/* Composer row */}
            <View style={styles.composerRow}>
              {/* Avatar */}
              <View style={styles.avatarCol}>
                {profile?.avatar_url ? (
                  <Image
                    source={{ uri: profile.avatar_url }}
                    style={styles.avatar}
                  />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarLetter}>{avatarLetter}</Text>
                  </View>
                )}
                <View style={styles.avatarLine} />
              </View>

              {/* Question input */}
              <View style={styles.inputCol}>
                <TextInput
                  style={styles.questionInput}
                  placeholder="Ask a question..."
                  placeholderTextColor="#9CA3AF"
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
                      charCount > MAX_QUESTION * 0.8 && styles.charCountWarn,
                      charCount > MAX_QUESTION && styles.charCountOver,
                    ]}
                  >
                    {MAX_QUESTION - charCount}
                  </Text>
                )}
              </View>
            </View>

            {/* Options */}
            <View style={styles.optionsSection}>
              <View style={styles.avatarColSpacer} />
              <View style={styles.optionsCol}>
                <Text style={styles.sectionLabel}>Poll options</Text>

                {options.map((opt, idx) => (
                  <View key={opt.id} style={styles.optionRow}>
                    <View style={styles.optionInputWrap}>
                      <TextInput
                        value={opt.text}
                        onChangeText={(t) => updateOption(opt.id, t)}
                        placeholder={
                          idx < 2
                            ? `Option ${idx + 1}`
                            : `Option ${idx + 1} (optional)`
                        }
                        placeholderTextColor="#9CA3AF"
                        style={styles.optionInput}
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
                          color="#D1D5DB"
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
                    <Ionicons name="add" size={18} color="#7C3AED" />
                    <Text style={styles.addOptionText}>Add option</Text>
                  </TouchableOpacity>
                )}

                {/* Settings */}
                <View style={styles.settingsCard}>
                  {/* Multiple choice */}
                  <TouchableOpacity
                    style={styles.settingRow}
                    onPress={() => setAllowMultiple((p) => !p)}
                    activeOpacity={0.7}
                  >
                    <View>
                      <Text style={styles.settingTitle}>Multiple choice</Text>
                      <Text style={styles.settingSubtitle}>
                        Let people pick more than one
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.toggle,
                        allowMultiple ? styles.toggleOn : styles.toggleOff,
                      ]}
                    >
                      <View
                        style={[
                          styles.toggleDot,
                          allowMultiple ? styles.dotOn : styles.dotOff,
                        ]}
                      />
                    </View>
                  </TouchableOpacity>

                  <View style={styles.divider} />

                  {/* Duration */}
                  <View>
                    <Text style={styles.settingTitle}>Poll length</Text>
                    <Text style={styles.settingSubtitle}>
                      Ends in {durationDays} day{durationDays > 1 ? "s" : ""}
                    </Text>
                    <View style={styles.durationRow}>
                      {DURATION_CHOICES.map((d) => (
                        <TouchableOpacity
                          key={d}
                          style={[
                            styles.durationChip,
                            d === durationDays && styles.durationChipSelected,
                          ]}
                          onPress={() => setDurationDays(d)}
                        >
                          <Text
                            style={[
                              styles.durationChipText,
                              d === durationDays &&
                                styles.durationChipTextSelected,
                            ]}
                          >
                            {d}d
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  cancelBtn: { paddingVertical: 6, paddingHorizontal: 4 },
  cancelText: { fontSize: 16, color: "#374151", fontWeight: "500" },
  postBtn: {
    backgroundColor: "#7C3AED",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 999,
  },
  postBtnDisabled: { backgroundColor: "#C4B5FD" },
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
    backgroundColor: "#7C3AED",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: { color: "#fff", fontWeight: "700", fontSize: 18 },
  avatarLine: {
    width: 2,
    flex: 1,
    minHeight: 20,
    backgroundColor: "#E5E7EB",
    marginTop: 8,
    borderRadius: 1,
  },

  inputCol: { flex: 1, paddingBottom: 8 },
  questionInput: {
    fontSize: 17,
    color: "#111827",
    lineHeight: 24,
    minHeight: 80,
    paddingTop: 0,
  },
  charCount: {
    fontSize: 13,
    color: "#9CA3AF",
    fontWeight: "600",
    marginTop: 4,
  },
  charCountWarn: { color: "#F59E0B" },
  charCountOver: { color: "#EF4444" },

  optionsSection: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 12,
    paddingTop: 8,
    paddingBottom: 24,
  },
  avatarColSpacer: { width: 44 },
  optionsCol: { flex: 1 },

  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7280",
    marginBottom: 10,
  },

  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  optionInputWrap: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#FAFAFA",
  },
  optionInput: {
    fontSize: 15,
    color: "#111827",
  },
  removeBtn: { padding: 4 },

  addOptionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    marginBottom: 16,
  },
  addOptionText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#7C3AED",
  },

  settingsCard: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    padding: 16,
    gap: 0,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  settingTitle: { fontSize: 14, fontWeight: "700", color: "#111827" },
  settingSubtitle: { fontSize: 13, color: "#9CA3AF", marginTop: 2 },

  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    padding: 3,
    justifyContent: "center",
  },
  toggleOn: {
    backgroundColor: "#7C3AED",
    alignItems: "flex-end",
  },
  toggleOff: {
    backgroundColor: "#E5E7EB",
    alignItems: "flex-start",
  },
  toggleDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  dotOn: { backgroundColor: "#fff" },
  dotOff: { backgroundColor: "#fff" },

  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 14,
  },

  durationRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  durationChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FAFAFA",
  },
  durationChipSelected: {
    backgroundColor: "#EDE9FE",
    borderColor: "#7C3AED",
  },
  durationChipText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#6B7280",
  },
  durationChipTextSelected: {
    color: "#7C3AED",
  },
});
