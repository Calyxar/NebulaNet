// app/create/poll.tsx — Create Poll (NebulaNet) ✅
// Saves a poll as a post in Firestore: collection("posts"), post_type: "poll"

import Button from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { auth, db } from "@/lib/firebase";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { addDoc, collection } from "firebase/firestore";
import React, { useMemo, useState } from "react";
import {
  Alert,
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

type PollOptionInput = {
  id: string;
  text: string;
};

const MAX_QUESTION = 140;
const MAX_OPTION = 80;
const MIN_OPTIONS = 2;
const MAX_OPTIONS = 6;

const durationChoices: PollDurationDays[] = [1, 3, 7, 14];

const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export default function CreatePollScreen() {
  const { user } = useAuth();

  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<PollOptionInput[]>([
    { id: makeId(), text: "" },
    { id: makeId(), text: "" },
  ]);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [durationDays, setDurationDays] = useState<PollDurationDays>(7);
  const [isLoading, setIsLoading] = useState(false);

  const questionCount = useMemo(() => question.trim().length, [question]);

  const canAddOption = options.length < MAX_OPTIONS;
  const canRemoveOption = options.length > MIN_OPTIONS;

  const updateOption = (id: string, text: string) => {
    setOptions((prev) => prev.map((o) => (o.id === id ? { ...o, text } : o)));
  };

  const addOption = () => {
    if (!canAddOption) return;
    setOptions((prev) => [...prev, { id: makeId(), text: "" }]);
  };

  const removeOption = (id: string) => {
    if (!canRemoveOption) return;
    setOptions((prev) => prev.filter((o) => o.id !== id));
  };

  const validate = () => {
    if (!user || !auth.currentUser) {
      Alert.alert("Not logged in", "Please log in to create a poll.");
      return false;
    }

    const q = question.trim();
    if (!q) {
      Alert.alert("Missing question", "Please enter a poll question.");
      return false;
    }
    if (q.length > MAX_QUESTION) {
      Alert.alert(
        "Too long",
        `Question must be ${MAX_QUESTION} characters or less.`,
      );
      return false;
    }

    const cleaned = options
      .map((o) => o.text.trim())
      .filter((t) => t.length > 0);

    if (cleaned.length < MIN_OPTIONS) {
      Alert.alert(
        "Not enough options",
        `Please provide at least ${MIN_OPTIONS} options.`,
      );
      return false;
    }

    // Option length check
    const tooLong = cleaned.find((t) => t.length > MAX_OPTION);
    if (tooLong) {
      Alert.alert(
        "Option too long",
        `Each option must be ${MAX_OPTION} characters or less.`,
      );
      return false;
    }

    // Duplicate check (case-insensitive)
    const lowered = cleaned.map((t) => t.toLowerCase());
    const hasDup = new Set(lowered).size !== lowered.length;
    if (hasDup) {
      Alert.alert("Duplicate options", "Please remove duplicate options.");
      return false;
    }

    return true;
  };

  const handleShare = async () => {
    if (!validate()) return;

    setIsLoading(true);
    try {
      const nowIso = new Date().toISOString();

      const trimmedOptions = options
        .map((o) => o.text.trim())
        .filter((t) => t.length > 0)
        .slice(0, MAX_OPTIONS);

      // Store poll options as objects so you can expand later easily.
      const pollOptions = trimmedOptions.map((text) => ({
        id: makeId(),
        text,
        votes: 0,
      }));

      const endsAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
      const endsAtIso = endsAt.toISOString();

      await addDoc(collection(db, "posts"), {
        user_id: auth.currentUser!.uid,

        // post fields
        title: question.trim(), // can be used as title in feed
        content: question.trim(),
        media_urls: [],
        post_type: "poll",
        visibility: "public", // if you support it; safe default
        is_visible: true,

        // counts
        likes_count: 0,
        comments_count: 0,
        shares_count: 0,

        // poll payload
        poll: {
          question: question.trim(),
          options: pollOptions,
          allow_multiple: allowMultiple,
          duration_days: durationDays,
          ends_at: endsAtIso,
          total_votes: 0,
          // You can record voters later like:
          // votes_by_user: { [uid]: { optionIds: string[], voted_at: string } }
        },

        created_at: nowIso,
        updated_at: nowIso,
      });

      Alert.alert("Posted", "Your poll has been shared.");
      router.back();
    } catch (e: any) {
      console.error("Create poll failed:", e);
      Alert.alert("Error", e?.message || "Failed to create poll.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerBtn}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Create Poll</Text>

        <View style={styles.headerRight}>
          <Button
            title={isLoading ? "Posting..." : "Share"}
            onPress={handleShare}
            disabled={isLoading}
          />
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.label}>Question</Text>
          <View style={styles.inputWrap}>
            <TextInput
              value={question}
              onChangeText={(t) => setQuestion(t)}
              placeholder="Ask something..."
              placeholderTextColor="#7b8496"
              style={styles.input}
              maxLength={MAX_QUESTION + 20} // allow a tiny overshoot while typing; validated on submit
              multiline
            />
            <Text style={styles.counter}>
              {Math.min(questionCount, MAX_QUESTION)}/{MAX_QUESTION}
            </Text>
          </View>

          <View style={styles.sectionTopRow}>
            <Text style={styles.label}>Options</Text>

            <TouchableOpacity
              onPress={addOption}
              disabled={!canAddOption}
              style={[styles.addOptionBtn, !canAddOption && styles.disabledBtn]}
              accessibilityRole="button"
            >
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={styles.addOptionText}>Add</Text>
            </TouchableOpacity>
          </View>

          {options.map((opt, idx) => (
            <View key={opt.id} style={styles.optionRow}>
              <View style={styles.optionIndex}>
                <Text style={styles.optionIndexText}>{idx + 1}</Text>
              </View>

              <View style={styles.optionInputWrap}>
                <TextInput
                  value={opt.text}
                  onChangeText={(t) => updateOption(opt.id, t)}
                  placeholder={`Option ${idx + 1}`}
                  placeholderTextColor="#7b8496"
                  style={styles.optionInput}
                  maxLength={MAX_OPTION + 20}
                />
                <Text style={styles.optionCounter}>
                  {Math.min(opt.text.trim().length, MAX_OPTION)}/{MAX_OPTION}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => removeOption(opt.id)}
                disabled={!canRemoveOption}
                style={[
                  styles.removeBtn,
                  !canRemoveOption && styles.disabledBtn,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Remove option ${idx + 1}`}
              >
                <Ionicons name="close" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}

          <View style={styles.card}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleTextWrap}>
                <Text style={styles.cardTitle}>Multiple choice</Text>
                <Text style={styles.cardSub}>
                  Let people pick more than one option
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setAllowMultiple((p) => !p)}
                style={[
                  styles.togglePill,
                  allowMultiple ? styles.toggleOn : styles.toggleOff,
                ]}
                accessibilityRole="switch"
                accessibilityState={{ checked: allowMultiple }}
              >
                <View
                  style={[
                    styles.toggleDot,
                    allowMultiple ? styles.dotOn : styles.dotOff,
                  ]}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            <Text style={styles.cardTitle}>Poll length</Text>
            <Text style={styles.cardSub}>
              Poll ends in {durationDays} day(s)
            </Text>

            <View style={styles.durationRow}>
              {durationChoices.map((d) => {
                const selected = d === durationDays;
                return (
                  <TouchableOpacity
                    key={d}
                    onPress={() => setDurationDays(d)}
                    style={[
                      styles.durationChip,
                      selected && styles.durationChipSelected,
                    ]}
                    accessibilityRole="button"
                  >
                    <Text
                      style={[
                        styles.durationChipText,
                        selected && styles.durationChipTextSelected,
                      ]}
                    >
                      {d}d
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <Text style={styles.tip}>
            Tip: Keep options short and clear. Duplicate options aren’t allowed.
          </Text>

          <View style={{ height: 28 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: {
    flex: 1,
    backgroundColor: "#0b0f19",
  },
  header: {
    height: 56,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.08)",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  headerTitle: {
    flex: 1,
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  headerRight: {
    minWidth: 86,
    alignItems: "flex-end",
  },
  container: {
    padding: 16,
    paddingBottom: 24,
  },
  label: {
    color: "#cfd6e4",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
  },
  inputWrap: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.10)",
    padding: 12,
  },
  input: {
    color: "#fff",
    fontSize: 15,
    minHeight: 72,
  },
  counter: {
    marginTop: 8,
    alignSelf: "flex-end",
    color: "rgba(255,255,255,0.55)",
    fontSize: 12,
    fontWeight: "600",
  },
  sectionTopRow: {
    marginTop: 16,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  addOptionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(99,102,241,0.35)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(99,102,241,0.65)",
  },
  addOptionText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  optionRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    marginBottom: 10,
  },
  optionIndex: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.10)",
  },
  optionIndexText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
  },
  optionInputWrap: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.10)",
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
  },
  optionInput: {
    color: "#fff",
    fontSize: 14,
    paddingVertical: 2,
  },
  optionCounter: {
    marginTop: 6,
    alignSelf: "flex-end",
    color: "rgba(255,255,255,0.55)",
    fontSize: 11,
    fontWeight: "700",
  },
  removeBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.10)",
  },
  disabledBtn: {
    opacity: 0.45,
  },
  card: {
    marginTop: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.10)",
    padding: 12,
  },
  cardTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },
  cardSub: {
    marginTop: 4,
    color: "rgba(255,255,255,0.70)",
    fontSize: 12,
    fontWeight: "600",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  toggleTextWrap: {
    flex: 1,
    paddingRight: 12,
  },
  togglePill: {
    width: 52,
    height: 30,
    borderRadius: 18,
    padding: 4,
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  toggleOn: {
    backgroundColor: "rgba(99,102,241,0.55)",
    borderColor: "rgba(99,102,241,0.85)",
    alignItems: "flex-end",
  },
  toggleOff: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.14)",
    alignItems: "flex-start",
  },
  toggleDot: {
    width: 22,
    height: 22,
    borderRadius: 12,
  },
  dotOn: {
    backgroundColor: "#fff",
  },
  dotOff: {
    backgroundColor: "rgba(255,255,255,0.75)",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.10)",
    marginVertical: 12,
  },
  durationRow: {
    marginTop: 10,
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  durationChip: {
    paddingHorizontal: 12,
    height: 34,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.12)",
  },
  durationChipSelected: {
    backgroundColor: "rgba(99,102,241,0.45)",
    borderColor: "rgba(99,102,241,0.85)",
  },
  durationChipText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    fontWeight: "800",
  },
  durationChipTextSelected: {
    color: "#fff",
  },
  tip: {
    marginTop: 12,
    color: "rgba(255,255,255,0.60)",
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
  },
});
