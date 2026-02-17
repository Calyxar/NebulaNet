// app/boost/[postId]/review.tsx — Review + Confirm (UI-only)
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo } from "react";
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Objective = "engagement" | "profile_visits" | "website_clicks";
type Duration = 1 | 3 | 7 | 14;

const money = (n: number) => `$${Math.max(0, Math.round(n)).toLocaleString()}`;

const objectiveLabel = (o: Objective) => {
  if (o === "engagement") return "More engagement";
  if (o === "profile_visits") return "More profile visits";
  return "More clicks";
};

export default function BoostReviewScreen() {
  const params = useLocalSearchParams<{
    postId: string;
    objective?: Objective;
    dailyBudget?: string;
    duration?: string;
    audience?: "auto" | "custom";
    destinationUrl?: string;
  }>();

  const { colors, isDark } = useTheme();

  const postId = params.postId;
  const objective = (params.objective ?? "engagement") as Objective;
  const dailyBudget = Number(params.dailyBudget ?? "5");
  const duration = Number(params.duration ?? "3") as Duration;
  const audience = (params.audience ?? "auto") as "auto" | "custom";
  const destinationUrl = (params.destinationUrl ?? "").trim();

  const total = useMemo(() => dailyBudget * duration, [dailyBudget, duration]);
  const showUrl = objective === "website_clicks";

  const confirm = () => {
    // UI-only for now. Later: create a row in boosts table + start Stripe flow, etc.
    Alert.alert(
      "Boost confirmed (UI-only)",
      [
        `Post: ${postId}`,
        `Objective: ${objectiveLabel(objective)}`,
        showUrl ? `Link: ${destinationUrl || "Not set"}` : null,
        `Daily: ${money(dailyBudget)}`,
        `Duration: ${duration} day${duration === 1 ? "" : "s"}`,
        `Total: ${money(total)}`,
        `Audience: ${audience === "auto" ? "Automatic" : "Custom"}`,
      ]
        .filter(Boolean)
        .join("\n"),
      [
        { text: "Edit", onPress: () => router.back() },
        { text: "Done", onPress: () => router.replace("/(tabs)/home") },
      ],
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
          <Text style={[styles.hTitle, { color: colors.text }]}>Review</Text>
          <Text style={[styles.hSub, { color: colors.textTertiary }]}>
            Confirm your boost details
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.8}
          style={styles.editBtn}
        >
          <Text style={[styles.editText, { color: colors.primary }]}>Edit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Row label="Post" value={postId} colors={colors} />
          <Divider colors={colors} />
          <Row
            label="Objective"
            value={objectiveLabel(objective)}
            colors={colors}
          />
          {showUrl && (
            <>
              <Divider colors={colors} />
              <Row
                label="Link"
                value={destinationUrl || "Not set"}
                colors={colors}
                numberOfLines={1}
              />
            </>
          )}
          <Divider colors={colors} />
          <Row
            label="Budget"
            value={`${money(dailyBudget)}/day`}
            colors={colors}
          />
          <Divider colors={colors} />
          <Row
            label="Duration"
            value={`${duration} day${duration === 1 ? "" : "s"}`}
            colors={colors}
          />
          <Divider colors={colors} />
          <Row
            label="Estimated total"
            value={money(total)}
            colors={colors}
            strong
          />
          <Divider colors={colors} />
          <Row
            label="Audience"
            value={audience === "auto" ? "Automatic" : "Custom"}
            colors={colors}
          />
        </View>

        <TouchableOpacity
          onPress={confirm}
          activeOpacity={0.9}
          style={[
            styles.cta,
            {
              backgroundColor: colors.primary,
              shadowOpacity: isDark ? 0.2 : 0.08,
            },
          ]}
        >
          <Text style={styles.ctaText}>Confirm boost</Text>
        </TouchableOpacity>

        <Text style={[styles.disclaimer, { color: colors.textTertiary }]}>
          UI-only for now. Next step is adding payments + delivery estimates.
        </Text>

        <View style={{ height: 16 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Divider({ colors }: { colors: any }) {
  return <View style={{ height: 1, backgroundColor: colors.border }} />;
}

function Row({
  label,
  value,
  colors,
  strong,
  numberOfLines,
}: {
  label: string;
  value: string;
  colors: any;
  strong?: boolean;
  numberOfLines?: number;
}) {
  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: colors.textTertiary }]}>
        {label}
      </Text>
      <Text
        style={[
          styles.value,
          { color: colors.text },
          strong && { fontWeight: "900" },
        ]}
        numberOfLines={numberOfLines}
      >
        {value}
      </Text>
    </View>
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
  editBtn: { paddingHorizontal: 8, paddingVertical: 6 },
  editText: { fontSize: 13, fontWeight: "900" },

  content: { padding: 16 },

  card: {
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 16,
    elevation: 2,
  },

  row: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  label: { fontSize: 12.5, fontWeight: "800" },
  value: {
    fontSize: 12.5,
    fontWeight: "900",
    flexShrink: 1,
    textAlign: "right",
  },

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
