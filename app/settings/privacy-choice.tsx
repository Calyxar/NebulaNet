// app/settings/privacy-choice.tsx — UPDATED ✅ dark mode
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo } from "react";
import {
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
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
  if (opt === "Everyone")
    return key === "messages"
      ? "Anyone can send you a message (requests may apply)."
      : "Anyone can interact.";
  if (opt === "Followers")
    return key === "messages"
      ? "Only people who follow you can message you."
      : "Only people who follow you.";
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
  const { colors, isDark } = useTheme();
  const params = useLocalSearchParams<Record<string, string>>();
  const key = useMemo(() => normalizeKey(params.key), [params.key]);
  const current = useMemo(() => normalizeValue(params.value), [params.value]);
  const title = useMemo(() => titleFor(key), [key]);
  const sub = useMemo(() => subtitleFor(key), [key]);

  const select = (value: PrivacySelect) => {
    router.push({ pathname: "/settings/privacy", params: { key, value } });
  };

  const content = (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "transparent" }}
      edges={["left", "right"]}
    >
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />

      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={[
            styles.backBtn,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {title}
          </Text>
          <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
            {sub}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          {OPTIONS.map((opt, idx) => {
            const isLast = idx === OPTIONS.length - 1;
            const active = opt === current;
            return (
              <Pressable
                key={opt}
                onPress={() => select(opt)}
                style={[
                  styles.row,
                  { borderBottomColor: colors.border },
                  isLast && { borderBottomWidth: 0 },
                ]}
              >
                <View style={styles.left}>
                  <Text style={[styles.rowTitle, { color: colors.text }]}>
                    {opt}
                  </Text>
                  <Text
                    style={[styles.rowDesc, { color: colors.textSecondary }]}
                  >
                    {descFor(opt, key)}
                  </Text>
                </View>
                <View
                  style={[
                    styles.check,
                    {
                      borderColor: colors.border,
                      backgroundColor: colors.surface,
                    },
                    active && {
                      borderColor: colors.primary + "80",
                      backgroundColor: colors.primary + "15",
                    },
                  ]}
                >
                  {active && (
                    <Ionicons
                      name="checkmark"
                      size={18}
                      color={colors.primary}
                    />
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
        <Text style={[styles.note, { color: colors.textSecondary }]}>
          Settings are saved automatically.
        </Text>
      </ScrollView>
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
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  headerTitle: { fontSize: 18, fontWeight: "900" },
  headerSub: { marginTop: 2, fontSize: 12 },
  content: { paddingHorizontal: 18, paddingBottom: 22 },
  card: {
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
  },
  left: { flex: 1, paddingRight: 14 },
  rowTitle: { fontSize: 14, fontWeight: "900" },
  rowDesc: { marginTop: 3, fontSize: 12, lineHeight: 16 },
  check: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  note: { marginTop: 12, fontSize: 12, textAlign: "center", lineHeight: 18 },
});
