// app/settings/privacy-choice.tsx — NebulaNet (DB-safe options)
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type ChoiceKey = "comments" | "messages" | "mentions";
type PrivacySelect = "Everyone" | "Followers" | "No one";

const OPTIONS: PrivacySelect[] = ["Everyone", "Followers", "No one"];

function titleFor(key: ChoiceKey) {
  if (key === "comments") return "Who can comment";
  if (key === "messages") return "Who can message you";
  return "Who can mention you";
}

function subtitleFor(key: ChoiceKey) {
  if (key === "comments")
    return "Choose who is allowed to comment on your posts.";
  if (key === "messages") return "Choose who can send you direct messages.";
  return "Choose who can mention you in posts.";
}

function descFor(opt: PrivacySelect, key: ChoiceKey) {
  if (opt === "Everyone") {
    return key === "messages"
      ? "Anyone can send you a message (requests may apply)."
      : "Anyone can interact.";
  }

  if (opt === "Followers") {
    return key === "messages"
      ? "Only people who follow you can message you."
      : "Only people who follow you.";
  }

  return key === "messages"
    ? "Nobody can message you."
    : "Nobody can interact.";
}

function normalizeKey(v: unknown): ChoiceKey {
  return v === "comments" || v === "messages" || v === "mentions"
    ? v
    : "comments";
}

function normalizeValue(v: unknown): PrivacySelect {
  return v === "Everyone" || v === "Followers" || v === "No one"
    ? v
    : "Everyone";
}

export default function PrivacyChoiceScreen() {
  const params = useLocalSearchParams<Record<string, string>>();

  const key = useMemo(() => normalizeKey(params.key), [params.key]);
  const current = useMemo(() => normalizeValue(params.value), [params.value]);

  const title = useMemo(() => titleFor(key), [key]);
  const sub = useMemo(() => subtitleFor(key), [key]);

  const select = (value: PrivacySelect) => {
    // Send selection back to /settings/privacy as params
    router.push({
      pathname: "/settings/privacy",
      params: { key, value },
    });
  };

  return (
    <LinearGradient
      colors={["#DCEBFF", "#EEF4FF", "#FFFFFF"]}
      locations={[0, 0.45, 1]}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color="#111827" />
          </Pressable>

          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>{title}</Text>
            <Text style={styles.headerSub}>{sub}</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            {OPTIONS.map((opt, idx) => {
              const isLast = idx === OPTIONS.length - 1;
              const active = opt === current;

              return (
                <Pressable
                  key={opt}
                  onPress={() => select(opt)}
                  style={[styles.row, isLast && { borderBottomWidth: 0 }]}
                >
                  <View style={styles.left}>
                    <Text style={styles.rowTitle}>{opt}</Text>
                    <Text style={styles.rowDesc}>{descFor(opt, key)}</Text>
                  </View>

                  <View style={[styles.check, active && styles.checkActive]}>
                    {active && (
                      <Ionicons name="checkmark" size={18} color="#7C3AED" />
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.note}>Settings are saved automatically.</Text>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1 },

  header: {
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  headerTitle: { fontSize: 18, fontWeight: "900", color: "#111827" },
  headerSub: { marginTop: 2, fontSize: 12, color: "#6B7280" },

  content: { paddingHorizontal: 18, paddingBottom: 22 },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 2,
  },

  row: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2FF",
  },
  left: { flex: 1, paddingRight: 14 },
  rowTitle: { fontSize: 14, fontWeight: "900", color: "#111827" },
  rowDesc: { marginTop: 3, fontSize: 12, color: "#6B7280", lineHeight: 16 },

  check: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    justifyContent: "center",
  },
  checkActive: { borderColor: "#C4B5FD", backgroundColor: "#EEF2FF" },

  note: {
    marginTop: 12,
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 18,
  },
});
