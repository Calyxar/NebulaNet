// app/profile/analytics.tsx ✅ NEW
// Phase 4 — Creator analytics, Option A (client-side, no new backend
// infra). Sums the engagement count fields already tracked on each post
// doc (like_count, comment_count, repost_count, share_count, save_count)
// rather than reading from any new rollup collection.
//
// Known limitation, worth revisiting later: no view-count metric here.
// Phase C's author_views data (user_affinity/{viewerId}/author_views/
// {authorId}) is keyed by viewer, not by creator, so it can't answer
// "how many people viewed my posts" without scanning every user's
// affinity doc. A real creator-facing view count would need its own
// counter written directly on the post doc — a separate, small addition,
// not something this screen can compute from existing data.
//
// Also worth noting: this queries and sums ALL of the creator's posts on
// every visit. Fine at current post volumes; if a creator accumulates
// thousands of posts this should move to a Cloud Function rollup
// (Option B) instead of client-side aggregation.

import AppHeader from "@/components/navigation/AppHeader";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import firestore from "@react-native-firebase/firestore";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type TimeRange = 7 | 30;

type PostStats = {
  id: string;
  content: string;
  created_at: string;
  like_count: number;
  comment_count: number;
  repost_count: number;
  share_count: number;
  save_count: number;
};

function tsToIso(ts: any): string {
  if (!ts) return new Date().toISOString();
  if (typeof ts?.toDate === "function") return ts.toDate().toISOString();
  return new Date(ts).toISOString();
}

function totalEngagement(p: PostStats): number {
  return (
    (p.like_count ?? 0) +
    (p.comment_count ?? 0) +
    (p.repost_count ?? 0) +
    (p.share_count ?? 0) +
    (p.save_count ?? 0)
  );
}

function useCreatorStats(userId: string | undefined) {
  return useQuery({
    queryKey: ["creator-stats", userId],
    enabled: !!userId,
    // 5 min cache — analytics don't need to be second-fresh, and this
    // avoids re-summing every post on every screen focus.
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<PostStats[]> => {
      const snap = await firestore()
        .collection("posts")
        .where("user_id", "==", userId!)
        .get();
      return snap.docs.map((d) => {
        const x = d.data() as any;
        return {
          id: d.id,
          content: x.content ?? "",
          created_at: tsToIso(x.created_at_ts ?? x.created_at),
          like_count: x.like_count ?? 0,
          comment_count: x.comment_count ?? 0,
          repost_count: x.repost_count ?? 0,
          share_count: x.share_count ?? 0,
          save_count: x.save_count ?? 0,
        } as PostStats;
      });
    },
  });
}

function SummaryCard({
  icon,
  label,
  value,
  color,
  colors,
  uiScale,
  fontScale,
}: {
  icon: any;
  label: string;
  value: number;
  color: string;
  colors: any;
  uiScale: number;
  fontScale: number;
}) {
  return (
    <View
      style={[
        styles.summaryCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: 18 * uiScale,
          padding: 14 * uiScale,
        },
      ]}
    >
      <View
        style={[
          styles.summaryIconCircle,
          {
            backgroundColor: color + "18",
            width: 34 * uiScale,
            height: 34 * uiScale,
            borderRadius: 17 * uiScale,
          },
        ]}
      >
        <Ionicons name={icon} size={17} color={color} />
      </View>
      <Text
        style={[
          styles.summaryValue,
          { color: colors.text, fontSize: 20 * fontScale },
        ]}
      >
        {value.toLocaleString()}
      </Text>
      <Text
        style={[
          styles.summaryLabel,
          { color: colors.textTertiary, fontSize: 11.5 * fontScale },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

// Lightweight bar chart using plain Views — deliberately not pulling in a
// charting library for one screen's worth of bars.
function DailyBarChart({
  days,
  colors,
  uiScale,
  fontScale,
}: {
  days: { label: string; value: number }[];
  colors: any;
  uiScale: number;
  fontScale: number;
}) {
  const max = Math.max(1, ...days.map((d) => d.value));
  const chartHeight = 100 * uiScale;

  return (
    <View
      style={[
        styles.chartCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: 18 * uiScale,
          padding: 14 * uiScale,
        },
      ]}
    >
      <View
        style={[styles.chartBarsRow, { height: chartHeight, gap: 4 * uiScale }]}
      >
        {days.map((d, i) => {
          const barHeight = Math.max(2, (d.value / max) * chartHeight);
          return (
            <View key={i} style={styles.chartBarCol}>
              <View
                style={[
                  styles.chartBar,
                  {
                    height: barHeight,
                    backgroundColor: colors.primary,
                    borderRadius: 4 * uiScale,
                    opacity: d.value === 0 ? 0.15 : 1,
                  },
                ]}
              />
            </View>
          );
        })}
      </View>
      <View style={[styles.chartLabelsRow, { gap: 4 * uiScale }]}>
        {days.map((d, i) => (
          <Text
            key={i}
            style={[
              styles.chartLabel,
              { color: colors.textTertiary, fontSize: 9 * fontScale },
            ]}
            numberOfLines={1}
          >
            {d.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

export default function CreatorAnalyticsScreen() {
  const { user } = useAuth();
  const { colors, isDark, uiScale, fontScale } = useTheme();
  const [range, setRange] = useState<TimeRange>(7);

  const gradientColors = isDark
    ? [colors.background, colors.background, colors.background]
    : (["#DCEBFF", "#EEF4FF", "#FFFFFF"] as const);

  const {
    data: posts,
    isLoading,
    isError,
    isRefetching,
    refetch,
  } = useCreatorStats(user?.uid);

  const rangePosts = useMemo(() => {
    if (!posts) return [];
    const cutoff = Date.now() - range * 24 * 60 * 60 * 1000;
    return posts.filter((p) => new Date(p.created_at).getTime() >= cutoff);
  }, [posts, range]);

  const totals = useMemo(() => {
    const source = posts ?? [];
    return {
      likes: source.reduce((s, p) => s + (p.like_count ?? 0), 0),
      comments: source.reduce((s, p) => s + (p.comment_count ?? 0), 0),
      reposts: source.reduce((s, p) => s + (p.repost_count ?? 0), 0),
      saves: source.reduce((s, p) => s + (p.save_count ?? 0), 0),
    };
  }, [posts]);

  const dailyBreakdown = useMemo(() => {
    const days: { label: string; value: number }[] = [];
    for (let i = range - 1; i >= 0; i--) {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - i);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const dayEngagement = (posts ?? [])
        .filter((p) => {
          const t = new Date(p.created_at).getTime();
          return t >= date.getTime() && t < nextDate.getTime();
        })
        .reduce((s, p) => s + totalEngagement(p), 0);

      days.push({
        label:
          range === 7
            ? date.toLocaleDateString("en-US", { weekday: "narrow" })
            : i % 5 === 0
              ? date.toLocaleDateString("en-US", { day: "numeric" })
              : "",
        value: dayEngagement,
      });
    }
    return days;
  }, [posts, range]);

  const topPosts = useMemo(() => {
    return [...rangePosts]
      .sort((a, b) => totalEngagement(b) - totalEngagement(a))
      .slice(0, 10);
  }, [rangePosts]);

  return (
    <LinearGradient
      colors={gradientColors as any}
      locations={[0, 0.42, 1]}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
        <AppHeader
          title="Analytics"
          backgroundColor="transparent"
          leftWide={
            <TouchableOpacity
              onPress={() => router.back()}
              style={[
                styles.backBtn,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  width: 40 * uiScale,
                  height: 40 * uiScale,
                  borderRadius: 20 * uiScale,
                },
              ]}
            >
              <Ionicons name="arrow-back" size={20} color={colors.text} />
            </TouchableOpacity>
          }
        />

        {/* ✅ FIX #1: without this, a signed-out/racing-auth user fell
            straight into the "No posts yet" empty state below, which
            misleadingly reads as "you have zero posts" rather than
            "you're not signed in." */}
        {!user?.uid ? (
          <View style={styles.center}>
            <Ionicons
              name="lock-closed-outline"
              size={48}
              color={colors.textTertiary}
            />
            <Text
              style={[
                styles.emptyTitle,
                { color: colors.text, fontSize: 16 * fontScale },
              ]}
            >
              Sign in to view analytics
            </Text>
            <Text
              style={[
                styles.emptySub,
                { color: colors.textTertiary, fontSize: 13 * fontScale },
              ]}
            >
              Your creator stats are only visible to you once signed in.
            </Text>
          </View>
        ) : isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : isError ? (
          // ✅ FIX #2: without this, a failed query (network error,
          // permission issue) also silently fell into "No posts yet"
          // instead of telling the user something actually went wrong.
          <View style={styles.center}>
            <Ionicons
              name="alert-circle-outline"
              size={48}
              color={colors.textTertiary}
            />
            <Text
              style={[
                styles.emptyTitle,
                { color: colors.text, fontSize: 16 * fontScale },
              ]}
            >
              Couldn't load analytics
            </Text>
            <Text
              style={[
                styles.emptySub,
                { color: colors.textTertiary, fontSize: 13 * fontScale },
              ]}
            >
              Check your connection and try again.
            </Text>
            <TouchableOpacity
              onPress={() => refetch()}
              style={[
                styles.retryBtn,
                {
                  backgroundColor: colors.primary,
                  paddingHorizontal: 18 * uiScale,
                  paddingVertical: 10 * uiScale,
                  borderRadius: 14 * uiScale,
                  marginTop: 8 * uiScale,
                },
              ]}
              activeOpacity={0.85}
            >
              <Text
                style={{
                  color: "#fff",
                  fontWeight: "800",
                  fontSize: 13 * fontScale,
                }}
              >
                Retry
              </Text>
            </TouchableOpacity>
          </View>
        ) : !posts || posts.length === 0 ? (
          <View style={styles.center}>
            <Ionicons
              name="bar-chart-outline"
              size={48}
              color={colors.textTertiary}
            />
            <Text
              style={[
                styles.emptyTitle,
                { color: colors.text, fontSize: 16 * fontScale },
              ]}
            >
              No posts yet
            </Text>
            <Text
              style={[
                styles.emptySub,
                { color: colors.textTertiary, fontSize: 13 * fontScale },
              ]}
            >
              Your analytics will appear here once you've posted.
            </Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{
              padding: 16 * uiScale,
              gap: 12 * uiScale,
            }}
            showsVerticalScrollIndicator={false}
            // ✅ FIX #3: with a 5-minute cache, a creator who just posted
            // had no way to see fresh numbers short of force-quitting the
            // app. Pull-to-refresh calls refetch() directly.
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={refetch}
                tintColor={colors.primary}
              />
            }
          >
            <View style={[styles.summaryGrid, { gap: 10 * uiScale }]}>
              <SummaryCard
                icon="heart"
                label="Likes"
                value={totals.likes}
                color="#FF375F"
                colors={colors}
                uiScale={uiScale}
                fontScale={fontScale}
              />
              <SummaryCard
                icon="chatbubble"
                label="Comments"
                value={totals.comments}
                color={colors.primary}
                colors={colors}
                uiScale={uiScale}
                fontScale={fontScale}
              />
              <SummaryCard
                icon="repeat"
                label="Reposts"
                value={totals.reposts}
                color="#34C759"
                colors={colors}
                uiScale={uiScale}
                fontScale={fontScale}
              />
              <SummaryCard
                icon="bookmark"
                label="Saves"
                value={totals.saves}
                color="#FF9500"
                colors={colors}
                uiScale={uiScale}
                fontScale={fontScale}
              />
            </View>

            <View
              style={[
                styles.rangeToggle,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderRadius: 14 * uiScale,
                  padding: 4 * uiScale,
                },
              ]}
            >
              {([7, 30] as TimeRange[]).map((r) => {
                const active = range === r;
                return (
                  <TouchableOpacity
                    key={r}
                    onPress={() => setRange(r)}
                    style={[
                      styles.rangeBtn,
                      {
                        borderRadius: 10 * uiScale,
                        paddingVertical: 8 * uiScale,
                      },
                      active && { backgroundColor: colors.primary },
                    ]}
                    activeOpacity={0.85}
                  >
                    <Text
                      style={{
                        color: active ? "#fff" : colors.textTertiary,
                        fontWeight: "800",
                        fontSize: 13 * fontScale,
                      }}
                    >
                      {r} days
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text
              style={[
                styles.sectionTitle,
                { color: colors.text, fontSize: 15 * fontScale },
              ]}
            >
              Engagement over time
            </Text>
            <DailyBarChart
              days={dailyBreakdown}
              colors={colors}
              uiScale={uiScale}
              fontScale={fontScale}
            />

            <Text
              style={[
                styles.sectionTitle,
                { color: colors.text, fontSize: 15 * fontScale },
              ]}
            >
              Top posts ({range} days)
            </Text>
            {topPosts.length === 0 ? (
              <View
                style={[
                  styles.chartCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderRadius: 18 * uiScale,
                    padding: 20 * uiScale,
                    alignItems: "center",
                  },
                ]}
              >
                <Text
                  style={{
                    color: colors.textTertiary,
                    fontWeight: "700",
                    fontSize: 13 * fontScale,
                  }}
                >
                  No posts in this range.
                </Text>
              </View>
            ) : (
              <View
                style={[
                  styles.chartCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderRadius: 18 * uiScale,
                    padding: 6 * uiScale,
                  },
                ]}
              >
                {topPosts.map((p, idx) => (
                  <TouchableOpacity
                    key={p.id}
                    onPress={() => router.push(`/post/${p.id}` as any)}
                    style={[
                      styles.topPostRow,
                      {
                        paddingHorizontal: 10 * uiScale,
                        paddingVertical: 11 * uiScale,
                        gap: 10 * uiScale,
                      },
                      idx !== 0 && {
                        borderTopWidth: 1,
                        borderTopColor: colors.border,
                      },
                    ]}
                    activeOpacity={0.85}
                  >
                    <Text
                      style={{
                        color: colors.textTertiary,
                        fontWeight: "900",
                        fontSize: 13 * fontScale,
                        width: 18,
                      }}
                    >
                      {idx + 1}
                    </Text>
                    <Text
                      style={{
                        flex: 1,
                        color: colors.text,
                        fontSize: 13 * fontScale,
                        fontWeight: "600",
                      }}
                      numberOfLines={1}
                    >
                      {p.content || "(no text)"}
                    </Text>
                    <Text
                      style={{
                        color: colors.primary,
                        fontWeight: "800",
                        fontSize: 12 * fontScale,
                      }}
                    >
                      {totalEngagement(p).toLocaleString()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  backBtn: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 8,
  },
  emptyTitle: { fontWeight: "900", marginTop: 8 },
  emptySub: { textAlign: "center", fontWeight: "600" },
  retryBtn: { alignItems: "center", justifyContent: "center" },
  summaryGrid: { flexDirection: "row", flexWrap: "wrap" },
  summaryCard: {
    flexBasis: "47%",
    flexGrow: 1,
    borderWidth: 1,
  },
  summaryIconCircle: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  summaryValue: { fontWeight: "900" },
  summaryLabel: { fontWeight: "700", marginTop: 2 },
  rangeToggle: {
    flexDirection: "row",
    borderWidth: 1,
  },
  rangeBtn: { flex: 1, alignItems: "center" },
  sectionTitle: { fontWeight: "800", marginTop: 6 },
  chartCard: { borderWidth: 1 },
  chartBarsRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  chartBarCol: { flex: 1, alignItems: "center", justifyContent: "flex-end" },
  chartBar: { width: "60%" },
  chartLabelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  chartLabel: { flex: 1, textAlign: "center", fontWeight: "700" },
  topPostRow: { flexDirection: "row", alignItems: "center" },
});
