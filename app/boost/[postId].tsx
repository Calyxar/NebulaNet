// app/boost/[postId].tsx — COMPLETED + UPDATED ✅ (Real flow: Setup → Review screen)
// ✅ Keeps your “real” UI (objective + optional link + budget + duration + audience)
// ✅ Fixes URL validation + normalizes
// ✅ Continue now goes to /boost/[postId]/review with params (no more final Alert here)
// ✅ “Continue” disabled until valid (postId + budget + url if needed)

import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Objective = "engagement" | "profile_visits" | "website_clicks";
type Duration = 1 | 3 | 7 | 14;

const OBJECTIVES: {
  id: Objective;
  title: string;
  subtitle: string;
  icon: any;
}[] = [
  {
    id: "engagement",
    title: "More engagement",
    subtitle: "Get more likes and comments",
    icon: "chatbubble-ellipses-outline",
  },
  {
    id: "profile_visits",
    title: "More profile visits",
    subtitle: "Grow your audience",
    icon: "person-add-outline",
  },
  {
    id: "website_clicks",
    title: "More clicks",
    subtitle: "Send people to a link",
    icon: "link-outline",
  },
];

const DURATIONS: Duration[] = [1, 3, 7, 14];

const money = (n: number) => `$${Math.max(0, Math.round(n)).toLocaleString()}`;

const objectiveLabel = (o: Objective) => {
  if (o === "engagement") return "More engagement";
  if (o === "profile_visits") return "More profile visits";
  return "More clicks";
};

const normalizeUrl = (raw: string) => {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  // If user types "example.com", assume https
  if (!/^https?:\/\//i.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
};

const isValidUrl = (raw: string) => {
  const u = normalizeUrl(raw);
  if (!u) return false;
  try {
    // basic URL parse
    new URL(u);
    return true;
  } catch {
    return false;
  }
};

export default function BoostPostScreen() {
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const { colors, isDark } = useTheme();

  const [objective, setObjective] = useState<Objective>("engagement");
  const [dailyBudget, setDailyBudget] = useState<number>(5);
  const [duration, setDuration] = useState<Duration>(3);
  const [audience, setAudience] = useState<"auto" | "custom">("auto");

  // Only used for website_clicks objective
  const [destinationUrl, setDestinationUrl] = useState<string>("");

  const total = useMemo(() => dailyBudget * duration, [dailyBudget, duration]);

  const budgetMin = 1;
  const budgetMax = 200;

  const bumpBudget = (delta: number) => {
    setDailyBudget((b) => {
      const next = Math.max(budgetMin, Math.min(budgetMax, b + delta));
      return next;
    });
  };

  const showUrl = objective === "website_clicks";
  const urlOk = !showUrl || isValidUrl(destinationUrl);
  const canContinue = !!postId && dailyBudget >= budgetMin && urlOk;

  const submit = () => {
    if (!postId) {
      Alert.alert("Missing post", "We couldn't identify which post to boost.");
      return;
    }

    if (showUrl && !isValidUrl(destinationUrl)) {
      Alert.alert("Add a valid link", "Enter a valid destination URL.");
      return;
    }

    const url = showUrl ? normalizeUrl(destinationUrl) : "";

    // ✅ Real app flow: go to Review screen
    router.push({
      pathname: "/boost/[postId]/review",
      params: {
        postId,
        objective,
        dailyBudget: String(dailyBudget),
        duration: String(duration),
        audience,
        destinationUrl: url,
      },
    });
  };

  const onPickCustomAudience = () => {
    // UI-only: keep the selection but show a message
    setAudience("custom");
    Alert.alert(
      "Custom audience (coming soon)",
      "You'll be able to choose interests and locations here later.",
    );
  };

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: colors.background }]}
      edges={["left", "right", "bottom"]}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={[styles.hTitle, { color: colors.text }]}>
            Boost post
          </Text>
          <Text style={[styles.hSub, { color: colors.textTertiary }]}>
            Promote this post to more people
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Objective */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Objective
        </Text>

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          {OBJECTIVES.map((o, idx) => {
            const active = objective === o.id;
            return (
              <TouchableOpacity
                key={o.id}
                onPress={() => setObjective(o.id)}
                activeOpacity={0.9}
                style={[
                  styles.row,
                  idx !== 0 && {
                    borderTopWidth: 1,
                    borderTopColor: colors.border,
                  },
                ]}
              >
                <View
                  style={[styles.rowIcon, { backgroundColor: colors.surface }]}
                >
                  <Ionicons
                    name={o.icon}
                    size={20}
                    color={active ? colors.primary : colors.textTertiary}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowTitle, { color: colors.text }]}>
                    {o.title}
                  </Text>
                  <Text style={[styles.rowSub, { color: colors.textTertiary }]}>
                    {o.subtitle}
                  </Text>
                </View>

                <Ionicons
                  name={active ? "radio-button-on" : "radio-button-off"}
                  size={20}
                  color={active ? colors.primary : colors.textTertiary}
                />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Destination URL (only for website clicks) */}
        {showUrl && (
          <>
            <Text
              style={[
                styles.sectionTitle,
                { color: colors.text, marginTop: 16 },
              ]}
            >
              Destination
            </Text>

            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <View style={styles.urlWrap}>
                <View
                  style={[styles.urlIcon, { backgroundColor: colors.surface }]}
                >
                  <Ionicons
                    name="globe-outline"
                    size={18}
                    color={colors.textTertiary}
                  />
                </View>

                <TextInput
                  value={destinationUrl}
                  onChangeText={setDestinationUrl}
                  placeholder="example.com or https://example.com"
                  placeholderTextColor={colors.textTertiary}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  style={[
                    styles.urlInput,
                    { color: colors.text, borderColor: colors.border },
                  ]}
                />
              </View>

              <Text style={[styles.helper, { color: colors.textTertiary }]}>
                We’ll open this link when people tap your boosted post.
              </Text>

              {!urlOk && destinationUrl.trim().length > 0 && (
                <Text style={[styles.errorText, { color: "#EF4444" }]}>
                  Enter a valid URL.
                </Text>
              )}
            </View>
          </>
        )}

        {/* Budget */}
        <Text
          style={[styles.sectionTitle, { color: colors.text, marginTop: 16 }]}
        >
          Budget
        </Text>

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.budgetRow}>
            <Text style={[styles.bigMoney, { color: colors.text }]}>
              {money(dailyBudget)}
            </Text>
            <Text style={[styles.perDay, { color: colors.textTertiary }]}>
              / day
            </Text>

            <View style={{ flex: 1 }} />

            <TouchableOpacity
              onPress={() => bumpBudget(-5)}
              style={[styles.stepBtn, { backgroundColor: colors.surface }]}
              activeOpacity={0.85}
            >
              <Text style={[styles.stepText, { color: colors.text }]}>-5</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => bumpBudget(-1)}
              style={[styles.stepBtn, { backgroundColor: colors.surface }]}
              activeOpacity={0.85}
            >
              <Ionicons name="remove" size={18} color={colors.text} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => bumpBudget(1)}
              style={[styles.stepBtn, { backgroundColor: colors.surface }]}
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={18} color={colors.text} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => bumpBudget(5)}
              style={[styles.stepBtn, { backgroundColor: colors.surface }]}
              activeOpacity={0.85}
            >
              <Text style={[styles.stepText, { color: colors.text }]}>+5</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.helper, { color: colors.textTertiary }]}>
            Typical: $5–$20/day • Min {money(budgetMin)} • Max{" "}
            {money(budgetMax)}
          </Text>
        </View>

        {/* Duration */}
        <Text
          style={[styles.sectionTitle, { color: colors.text, marginTop: 16 }]}
        >
          Duration
        </Text>

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.pills}>
            {DURATIONS.map((d) => {
              const active = duration === d;
              return (
                <TouchableOpacity
                  key={d}
                  onPress={() => setDuration(d)}
                  activeOpacity={0.85}
                  style={[
                    styles.pill,
                    {
                      backgroundColor: active ? colors.primary : colors.surface,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.pillText,
                      { color: active ? "#fff" : colors.text },
                    ]}
                  >
                    {d} day{d === 1 ? "" : "s"}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={[styles.summaryRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.summaryLabel, { color: colors.textTertiary }]}>
              Estimated total
            </Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              {money(total)}
            </Text>
          </View>
        </View>

        {/* Audience */}
        <Text
          style={[styles.sectionTitle, { color: colors.text, marginTop: 16 }]}
        >
          Audience
        </Text>

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <TouchableOpacity
            onPress={() => setAudience("auto")}
            activeOpacity={0.9}
            style={[styles.row, { borderTopWidth: 0 }]}
          >
            <View style={[styles.rowIcon, { backgroundColor: colors.surface }]}>
              <Ionicons
                name="sparkles-outline"
                size={20}
                color={
                  audience === "auto" ? colors.primary : colors.textTertiary
                }
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: colors.text }]}>
                Automatic
              </Text>
              <Text style={[styles.rowSub, { color: colors.textTertiary }]}>
                We choose who is most likely to engage
              </Text>
            </View>
            <Ionicons
              name={
                audience === "auto" ? "radio-button-on" : "radio-button-off"
              }
              size={20}
              color={audience === "auto" ? colors.primary : colors.textTertiary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onPickCustomAudience}
            activeOpacity={0.9}
            style={[
              styles.row,
              { borderTopWidth: 1, borderTopColor: colors.border },
            ]}
          >
            <View style={[styles.rowIcon, { backgroundColor: colors.surface }]}>
              <Ionicons
                name="options-outline"
                size={20}
                color={
                  audience === "custom" ? colors.primary : colors.textTertiary
                }
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: colors.text }]}>
                Custom
              </Text>
              <Text style={[styles.rowSub, { color: colors.textTertiary }]}>
                Choose interests/locations later
              </Text>
            </View>
            <Ionicons
              name={
                audience === "custom" ? "radio-button-on" : "radio-button-off"
              }
              size={20}
              color={
                audience === "custom" ? colors.primary : colors.textTertiary
              }
            />
          </TouchableOpacity>
        </View>

        {/* Review Summary (quick inline preview; full review is next screen) */}
        <Text
          style={[styles.sectionTitle, { color: colors.text, marginTop: 16 }]}
        >
          Review
        </Text>

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View
            style={[styles.reviewRow, { borderBottomColor: colors.border }]}
          >
            <Text style={[styles.reviewLabel, { color: colors.textTertiary }]}>
              Objective
            </Text>
            <Text style={[styles.reviewValue, { color: colors.text }]}>
              {objectiveLabel(objective)}
            </Text>
          </View>

          {showUrl && (
            <View
              style={[styles.reviewRow, { borderBottomColor: colors.border }]}
            >
              <Text
                style={[styles.reviewLabel, { color: colors.textTertiary }]}
              >
                Link
              </Text>
              <Text
                style={[styles.reviewValue, { color: colors.text }]}
                numberOfLines={1}
              >
                {destinationUrl.trim()
                  ? normalizeUrl(destinationUrl)
                  : "Not set"}
              </Text>
            </View>
          )}

          <View
            style={[styles.reviewRow, { borderBottomColor: colors.border }]}
          >
            <Text style={[styles.reviewLabel, { color: colors.textTertiary }]}>
              Budget
            </Text>
            <Text style={[styles.reviewValue, { color: colors.text }]}>
              {money(dailyBudget)}/day
            </Text>
          </View>

          <View
            style={[styles.reviewRow, { borderBottomColor: colors.border }]}
          >
            <Text style={[styles.reviewLabel, { color: colors.textTertiary }]}>
              Duration
            </Text>
            <Text style={[styles.reviewValue, { color: colors.text }]}>
              {duration} day{duration === 1 ? "" : "s"}
            </Text>
          </View>

          <View style={styles.reviewRow}>
            <Text style={[styles.reviewLabel, { color: colors.textTertiary }]}>
              Total
            </Text>
            <Text style={[styles.reviewValue, { color: colors.text }]}>
              {money(total)}
            </Text>
          </View>
        </View>

        {/* CTA */}
        <TouchableOpacity
          onPress={submit}
          activeOpacity={0.9}
          disabled={!canContinue}
          style={[
            styles.cta,
            {
              backgroundColor: canContinue ? colors.primary : colors.border,
              shadowOpacity: isDark ? 0.2 : 0.08,
            },
          ]}
        >
          <Text style={styles.ctaText}>Continue</Text>
        </TouchableOpacity>

        <Text style={[styles.disclaimer, { color: colors.textTertiary }]}>
          UI-only for now. Next screen is Review → Confirm.
        </Text>

        <View style={{ height: 16 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: 1,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  hTitle: { fontSize: 16, fontWeight: "900" },
  hSub: { marginTop: 2, fontSize: 12.5, fontWeight: "700" },

  content: { padding: 16 },
  sectionTitle: { fontSize: 13.5, fontWeight: "900", marginBottom: 10 },

  card: {
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 16,
    elevation: 2,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: { fontSize: 14, fontWeight: "900" },
  rowSub: { marginTop: 2, fontSize: 12.5, fontWeight: "700" },

  urlWrap: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  urlIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  urlInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13.5,
    fontWeight: "700",
  },

  budgetRow: {
    flexDirection: "row",
    alignItems: "baseline",
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 6,
  },
  bigMoney: { fontSize: 28, fontWeight: "900" },
  perDay: { fontSize: 13, fontWeight: "800" },
  stepBtn: {
    minWidth: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
    paddingHorizontal: 10,
  },
  stepText: { fontSize: 12.5, fontWeight: "900" },
  helper: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    fontSize: 12.5,
    fontWeight: "700",
  },
  errorText: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    fontSize: 12.5,
    fontWeight: "800",
  },

  pills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
  },
  pillText: { fontSize: 12.5, fontWeight: "900" },

  summaryRow: {
    borderTopWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: { fontSize: 12.5, fontWeight: "800" },
  summaryValue: { fontSize: 14, fontWeight: "900" },

  reviewRow: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
  },
  reviewLabel: { fontSize: 12.5, fontWeight: "800" },
  reviewValue: { fontSize: 12.5, fontWeight: "900", maxWidth: "65%" },

  cta: {
    marginTop: 18,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 18,
    elevation: 2,
  },
  ctaText: { color: "#fff", fontWeight: "900", fontSize: 14.5 },

  disclaimer: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
  },
});
