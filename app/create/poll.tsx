// app/create/poll.tsx - DESIGN MATCH (NebulaNet)
import Button from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Modal,
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

export default function CreatePollScreen() {
  const { user } = useAuth();

  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [isLoading, setIsLoading] = useState(false);

  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [allowMultiple, setAllowMultiple] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);

  const validOptions = useMemo(
    () => options.map((o) => o.trim()).filter(Boolean),
    [options],
  );

  const addOption = () => {
    if (options.length < 6) setOptions((prev) => [...prev, ""]);
  };

  const removeOption = (index: number) => {
    if (options.length <= 2) return;
    setOptions((prev) => prev.filter((_, i) => i !== index));
  };

  const updateOption = (index: number, value: string) => {
    setOptions((prev) => prev.map((o, i) => (i === index ? value : o)));
  };

  const formatDateTime = (date: Date) => {
    try {
      return date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Selected";
    }
  };

  const handleCreatePoll = async () => {
    if (!question.trim()) {
      Alert.alert("Error", "Please enter a poll question");
      return;
    }
    if (validOptions.length < 2) {
      Alert.alert("Error", "Please add at least 2 options");
      return;
    }
    if (!user) {
      Alert.alert("Error", "You must be logged in to create a poll");
      return;
    }

    setIsLoading(true);
    try {
      const nowIso = new Date().toISOString();

      const { data: pollData, error: pollError } = await supabase
        .from("polls")
        .insert({
          user_id: user.id,
          question: question.trim(),
          expires_at: expiresAt?.toISOString() || null,
          allow_multiple: allowMultiple,
          is_anonymous: isAnonymous,
          votes_count: 0,
          created_at: nowIso,
          updated_at: nowIso,
        })
        .select()
        .single();

      if (pollError) throw pollError;

      const pollOptions = validOptions.map((option, index) => ({
        poll_id: pollData.id,
        option_text: option,
        option_order: index,
        votes_count: 0,
        created_at: nowIso,
      }));

      const { error: optionsError } = await supabase
        .from("poll_options")
        .insert(pollOptions);
      if (optionsError) throw optionsError;

      const { error: postError } = await supabase.from("posts").insert({
        user_id: user.id,
        title: `Poll: ${question.trim()}`,
        content: `Vote on this poll!`,
        poll_id: pollData.id,
        post_type: "poll",
        likes_count: 0,
        comments_count: 0,
        shares_count: 0,
        created_at: nowIso,
        updated_at: nowIso,
      });

      if (postError) throw postError;

      Alert.alert("Success", "Poll created successfully!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to create poll.");
    } finally {
      setIsLoading(false);
    }
  };

  const canCreate = question.trim().length > 0 && validOptions.length >= 2;

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#E8EAF6" />
      <SafeAreaView style={styles.safe}>
        {/* Header (matches your Create screen style) */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Poll</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Question Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Poll Question</Text>
            <View style={styles.inputWrap}>
              <TextInput
                value={question}
                onChangeText={setQuestion}
                placeholder="What would you like to ask?"
                placeholderTextColor="#9CA3AF"
                maxLength={200}
                style={styles.questionInput}
              />
            </View>
            <Text style={styles.counter}>{question.length}/200</Text>
          </View>

          {/* Options Card */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>Options</Text>
              <Text style={styles.miniMeta}>{validOptions.length}/6</Text>
            </View>

            {options.map((option, index) => {
              const letter = String.fromCharCode(65 + index);
              return (
                <View key={`opt-${index}`} style={styles.optionRow}>
                  <View style={styles.optionBadge}>
                    <Text style={styles.optionBadgeText}>{letter}</Text>
                  </View>

                  <TextInput
                    value={option}
                    onChangeText={(v) => updateOption(index, v)}
                    placeholder={`Option ${index + 1}`}
                    placeholderTextColor="#9CA3AF"
                    maxLength={100}
                    style={styles.optionInput}
                  />

                  {options.length > 2 && (
                    <TouchableOpacity
                      onPress={() => removeOption(index)}
                      style={styles.removeBtn}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="close" size={18} color="#fff" />
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}

            {options.length < 6 && (
              <TouchableOpacity
                style={styles.addBtn}
                onPress={addOption}
                activeOpacity={0.85}
              >
                <Ionicons name="add" size={18} color="#7C3AED" />
                <Text style={styles.addBtnText}>Add Option</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Settings Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Poll Settings</Text>

            <TouchableOpacity
              style={styles.settingRow}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.85}
            >
              <View style={styles.settingIcon}>
                <Ionicons name="time-outline" size={18} color="#7C3AED" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>Ends</Text>
                <Text style={styles.settingValue}>
                  {expiresAt ? formatDateTime(expiresAt) : "Never"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.settingRow}
              onPress={() => setAllowMultiple((v) => !v)}
              activeOpacity={0.85}
            >
              <View style={styles.settingIcon}>
                <Ionicons name="checkbox-outline" size={18} color="#7C3AED" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>Allow multiple votes</Text>
                <Text style={styles.settingDesc}>
                  Users can vote for more than one option
                </Text>
              </View>
              <Toggle value={allowMultiple} />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.settingRow}
              onPress={() => setIsAnonymous((v) => !v)}
              activeOpacity={0.85}
            >
              <View style={styles.settingIcon}>
                <Ionicons name="eye-off-outline" size={18} color="#7C3AED" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>Anonymous voting</Text>
                <Text style={styles.settingDesc}>Hide voter identities</Text>
              </View>
              <Toggle value={isAnonymous} />
            </TouchableOpacity>
          </View>

          {/* Preview Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Preview</Text>
            <View style={styles.previewCard}>
              <Text style={styles.previewQuestion} numberOfLines={2}>
                {question.trim() || "What’s your poll question?"}
              </Text>

              <View style={{ gap: 10 }}>
                {options.map((opt, index) => {
                  const letter = String.fromCharCode(65 + index);
                  return (
                    <View key={`pv-${index}`} style={styles.previewOption}>
                      <View style={styles.previewBadge}>
                        <Text style={styles.previewBadgeText}>{letter}</Text>
                      </View>
                      <Text style={styles.previewOptionText} numberOfLines={1}>
                        {opt.trim() || `Option ${index + 1}`}
                      </Text>
                      <View style={styles.previewPctPill}>
                        <Text style={styles.previewPctText}>0%</Text>
                      </View>
                    </View>
                  );
                })}
              </View>

              <View style={styles.previewMetaRow}>
                <Text style={styles.previewMetaText}>0 votes</Text>
                <Text style={styles.previewMetaText}>
                  {expiresAt
                    ? `Ends ${formatDateTime(expiresAt)}`
                    : "No end date"}
                </Text>
              </View>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <Button
              title="Create Poll"
              onPress={handleCreatePoll}
              loading={isLoading}
              disabled={!canCreate}
              style={styles.primaryBtn}
            />

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => router.back()}
              activeOpacity={0.85}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 24 }} />
        </ScrollView>

        {/* Date Picker Sheet */}
        <Modal
          visible={showDatePicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowDatePicker(false)}
        >
          <TouchableOpacity
            style={styles.sheetBackdrop}
            activeOpacity={1}
            onPress={() => setShowDatePicker(false)}
          >
            <TouchableOpacity
              style={styles.sheet}
              activeOpacity={1}
              onPress={() => {}}
            >
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Set end time</Text>
                <TouchableOpacity
                  onPress={() => setShowDatePicker(false)}
                  style={styles.sheetClose}
                >
                  <Ionicons name="close" size={18} color="#111827" />
                </TouchableOpacity>
              </View>

              <DateTimePicker
                value={
                  expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                }
                mode="datetime"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(event, selectedDate) => {
                  // Android fires twice; close on selection
                  if (Platform.OS === "android") setShowDatePicker(false);
                  setExpiresAt(selectedDate || null);
                }}
                minimumDate={new Date()}
              />

              {Platform.OS === "ios" && (
                <TouchableOpacity
                  style={styles.sheetDone}
                  onPress={() => setShowDatePicker(false)}
                >
                  <Text style={styles.sheetDoneText}>Done</Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      </SafeAreaView>
    </>
  );
}

/* -------------------- Small Toggle -------------------- */

function Toggle({ value }: { value: boolean }) {
  return (
    <View style={[toggleStyles.wrap, value && toggleStyles.wrapOn]}>
      <View style={[toggleStyles.knob, value && toggleStyles.knobOn]} />
    </View>
  );
}

const toggleStyles = StyleSheet.create({
  wrap: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#E5E7EB",
    padding: 3,
    justifyContent: "center",
  },
  wrapOn: {
    backgroundColor: "#7C3AED",
  },
  knob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    alignSelf: "flex-start",
  },
  knobOn: {
    alignSelf: "flex-end",
  },
});

/* -------------------- Styles -------------------- */

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#E8EAF6" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },

  container: { flex: 1 },
  content: { padding: 16, gap: 14 },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 10,
  },
  miniMeta: { fontSize: 13, fontWeight: "700", color: "#9CA3AF" },

  inputWrap: {
    backgroundColor: "#F3ECFF",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  questionInput: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  counter: {
    marginTop: 10,
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "700",
    alignSelf: "flex-end",
  },

  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  optionBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#7C3AED",
    alignItems: "center",
    justifyContent: "center",
  },
  optionBadgeText: { color: "#fff", fontWeight: "900" },
  optionInput: {
    flex: 1,
    backgroundColor: "#F8F8F8",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#EEE",
    fontSize: 15,
    color: "#111827",
    fontWeight: "600",
  },
  removeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
  },

  addBtn: {
    marginTop: 6,
    height: 44,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E9D5FF",
    backgroundColor: "#F3ECFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  addBtnText: { color: "#7C3AED", fontWeight: "900" },

  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3ECFF",
    alignItems: "center",
    justifyContent: "center",
  },
  settingLabel: { fontSize: 15, fontWeight: "800", color: "#111827" },
  settingValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7280",
    marginTop: 2,
  },
  settingDesc: { fontSize: 13, color: "#6B7280", marginTop: 2 },

  divider: { height: 1, backgroundColor: "#F1F1F1" },

  previewCard: {
    backgroundColor: "#F8F8F8",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#EEE",
  },
  previewQuestion: {
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 12,
  },
  previewOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#EEE",
  },
  previewBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#E8E0FF",
    alignItems: "center",
    justifyContent: "center",
  },
  previewBadgeText: { color: "#7C3AED", fontWeight: "900", fontSize: 12 },
  previewOptionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  previewPctPill: {
    backgroundColor: "#F3ECFF",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  previewPctText: { color: "#7C3AED", fontWeight: "900", fontSize: 12 },
  previewMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  previewMetaText: { fontSize: 12, fontWeight: "700", color: "#9CA3AF" },

  actions: { gap: 12 },
  primaryBtn: { backgroundColor: "#7C3AED", borderRadius: 28 },
  cancelBtn: { alignItems: "center", paddingVertical: 10 },
  cancelText: { color: "#6B7280", fontWeight: "800" },

  sheetBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 16,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sheetTitle: { fontSize: 16, fontWeight: "900", color: "#111827" },
  sheetClose: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  sheetDone: {
    marginTop: 12,
    height: 46,
    borderRadius: 18,
    backgroundColor: "#7C3AED",
    alignItems: "center",
    justifyContent: "center",
  },
  sheetDoneText: { color: "#fff", fontWeight: "900" },
});
