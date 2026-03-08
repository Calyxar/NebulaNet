// app/boost/[postId]/review.tsx
import { createBoost } from "@/lib/firestore/boosts";
import { getBoostOffering, purchaseBoostPackage } from "@/lib/revenuecat";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const money = (n: number) => `$${Number(n).toFixed(2)}`;

export default function BoostReviewScreen() {
  const { colors, isDark } = useTheme();
  const params = useLocalSearchParams<{
    postId: string;
    objective: string;
    dailyBudget: string;
    duration: string;
    audience: string;
    destinationUrl: string;
  }>();

  const postId = params.postId ?? "";
  const objective = params.objective ?? "engagement";
  const dailyBudget = Number(params.dailyBudget ?? 5);
  const duration = Number(params.duration ?? 3);
  const audience = params.audience ?? "auto";
  const destinationUrl = params.destinationUrl ?? "";

  const [loading, setLoading] = useState(false);

  const objectiveLabel = () => {
    if (objective === "engagement") return "More engagement";
    if (objective === "profile_visits") return "More profile visits";
    return "More clicks";
  };

  const handlePay = async () => {
    if (!postId) {
      Alert.alert("Error", "Missing post ID.");
      return;
    }

    setLoading(true);
    try {
      const offering = await getBoostOffering();
      const pkg = offering?.availablePackages?.[0];

      if (!pkg) {
        Alert.alert(
          "Not available",
          "Boost isn't available right now. Please try again.",
        );
        return;
      }

      const customerInfo = await purchaseBoostPackage(pkg);

      await createBoost({
        post_id: postId,
        objective: objective as any,
        daily_budget: dailyBudget,
        duration_days: duration,
        total_amount: 4.99,
        destination_url: destinationUrl || undefined,
        audience: audience as any,
        revenuecat_product_id: "boost_post",
        revenuecat_transaction_id:
          customerInfo?.latestExpirationDate ?? undefined,
      });

      Alert.alert(
        "🚀 Boost activated!",
        `Your post is now being promoted for ${duration} day${duration === 1 ? "" : "s"}.`,
        [
          {
            text: "Done",
            onPress: () => router.replace("/(tabs)/home" as any),
          },
        ],
      );
    } catch (e: any) {
      const msg = e?.message ?? "";
      if (
        msg.toLowerCase().includes("cancel") ||
        msg.toLowerCase().includes("dismiss")
      )
        return;
      Alert.alert(
        "Payment failed",
        msg || "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
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
            Review & Pay
          </Text>
          <Text style={[styles.hSub, { color: colors.textTertiary }]}>
            Confirm your boost details
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary Card */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Boost Summary
        </Text>

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Row
            label="Objective"
            value={objectiveLabel()}
            colors={colors}
            border
          />
          {destinationUrl ? (
            <Row label="Link" value={destinationUrl} colors={colors} border />
          ) : null}
          <Row
            label="Duration"
            value={`${duration} day${duration === 1 ? "" : "s"}`}
            colors={colors}
            border
          />
          <Row
            label="Audience"
            value={audience === "auto" ? "Automatic" : "Custom"}
            colors={colors}
            border
          />
          <Row
            label="Total charge"
            value={money(4.99)}
            colors={colors}
            highlight
          />
        </View>

        {/* What happens next */}
        <Text
          style={[styles.sectionTitle, { color: colors.text, marginTop: 20 }]}
        >
          What happens next
        </Text>

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          {[
            {
              icon: "rocket-outline",
              text: "Your post starts showing to more people immediately",
            },
            {
              icon: "mail-outline",
              text: "You'll receive an email confirmation",
            },
            {
              icon: "bar-chart-outline",
              text: "Your post is prioritized in Home, Explore, and Hashtag feeds",
            },
            {
              icon: "time-outline",
              text: `Boost runs for ${duration} day${duration === 1 ? "" : "s"} then stops automatically`,
            },
          ].map((item, i) => (
            <View
              key={i}
              style={[
                styles.stepRow,
                i !== 0 && {
                  borderTopWidth: 1,
                  borderTopColor: colors.border,
                },
              ]}
            >
              <View
                style={[styles.stepIcon, { backgroundColor: colors.surface }]}
              >
                <Ionicons
                  name={item.icon as any}
                  size={18}
                  color={colors.primary}
                />
              </View>
              <Text style={[styles.stepText, { color: colors.text }]}>
                {item.text}
              </Text>
            </View>
          ))}
        </View>

        {/* Pay Button */}
        <TouchableOpacity
          onPress={handlePay}
          disabled={loading}
          activeOpacity={0.9}
          style={[
            styles.cta,
            {
              backgroundColor: loading ? colors.border : colors.primary,
              shadowOpacity: isDark ? 0.2 : 0.08,
            },
          ]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.ctaText}>Pay {money(4.99)} & Boost</Text>
          )}
        </TouchableOpacity>

        <Text style={[styles.disclaimer, { color: colors.textTertiary }]}>
          Payment is processed securely via Google Play or App Store. Boosts are
          non-refundable once activated.
        </Text>

        <View style={{ height: 16 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({
  label,
  value,
  colors,
  border,
  highlight,
}: {
  label: string;
  value: string;
  colors: any;
  border?: boolean;
  highlight?: boolean;
}) {
  return (
    <View
      style={[
        styles.reviewRow,
        border && { borderBottomWidth: 1, borderBottomColor: colors.border },
      ]}
    >
      <Text style={[styles.reviewLabel, { color: colors.textTertiary }]}>
        {label}
      </Text>
      <Text
        style={[
          styles.reviewValue,
          { color: highlight ? colors.primary : colors.text },
          highlight && { fontSize: 15, fontWeight: "900" },
        ]}
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
  reviewRow: {
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  reviewLabel: { fontSize: 13, fontWeight: "700" },
  reviewValue: { fontSize: 13, fontWeight: "800", maxWidth: "60%" },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  stepIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  stepText: { flex: 1, fontSize: 13, fontWeight: "700", lineHeight: 19 },
  cta: {
    marginTop: 20,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 18,
    elevation: 2,
  },
  ctaText: { color: "#fff", fontWeight: "900", fontSize: 15 },
  disclaimer: {
    marginTop: 12,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 17,
    textAlign: "center",
    paddingHorizontal: 8,
  },
});
