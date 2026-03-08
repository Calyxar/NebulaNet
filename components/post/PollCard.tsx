// components/post/PollCard.tsx
// Reusable poll display + voting component used in PostCard and post detail.
//
// ✅ Shows options with animated vote-percentage bars after voting
// ✅ Handles single-choice (radio) and multi-choice (checkbox) modes
// ✅ Disabled / expired state
// ✅ Anonymous — never shows per-user breakdown, just totals
// ✅ Optimistic update via useVotePoll

import { useUserVote, useVotePoll } from "@/hooks/usePolls";
import {
    getPollOptionPercentage,
    isPollExpired,
    type PollData,
    type PollOption,
} from "@/lib/firestore/polls";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
    Alert,
    Animated,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

interface PollCardProps {
  postId: string;
  poll: PollData;
  /** Pass the theme colors from the parent if needed */
  accentColor?: string;
  textColor?: string;
  subColor?: string;
  cardBg?: string;
  borderColor?: string;
}

function OptionBar({
  percentage,
  accentColor,
}: {
  percentage: number;
  accentColor: string;
}) {
  const width = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(width, {
      toValue: percentage,
      useNativeDriver: false,
      tension: 60,
      friction: 10,
    }).start();
  }, [percentage]);

  return (
    <View style={barStyles.track}>
      <Animated.View
        style={[
          barStyles.fill,
          {
            backgroundColor: accentColor,
            width: width.interpolate({
              inputRange: [0, 100],
              outputRange: ["0%", "100%"],
            }),
          },
        ]}
      />
    </View>
  );
}

const barStyles = StyleSheet.create({
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(0,0,0,0.07)",
    overflow: "hidden",
    marginTop: 6,
  },
  fill: {
    height: "100%",
    borderRadius: 3,
  },
});

export default function PollCard({
  postId,
  poll,
  accentColor = "#6366F1",
  textColor = "#111827",
  subColor = "#6B7280",
  cardBg = "#F9FAFB",
  borderColor = "#E5E7EB",
}: PollCardProps) {
  const expired = isPollExpired(poll.ends_at);

  const { data: userVote, isLoading: voteLoading } = useUserVote(postId);
  const voteMutation = useVotePoll(postId);

  // Local selection state for multi-choice (before confirming)
  const [pendingIds, setPendingIds] = useState<string[]>([]);

  const hasVoted = (userVote ?? []).length > 0;
  const showResults = hasVoted || expired;

  const togglePending = (optId: string) => {
    if (!poll.allow_multiple) {
      setPendingIds([optId]);
      return;
    }
    setPendingIds((prev) =>
      prev.includes(optId)
        ? prev.filter((id) => id !== optId)
        : [...prev, optId],
    );
  };

  const handleVote = async () => {
    if (!pendingIds.length) return;
    try {
      await voteMutation.mutateAsync(pendingIds);
      setPendingIds([]);
    } catch (e: any) {
      Alert.alert("Vote failed", e?.message ?? "Could not submit your vote.");
    }
  };

  // Time remaining label
  const timeLabel = (() => {
    if (expired) return "Poll ended";
    const ms = new Date(poll.ends_at).getTime() - Date.now();
    const h = Math.floor(ms / 3600000);
    const d = Math.floor(h / 24);
    if (d > 0) return `${d}d left`;
    if (h > 0) return `${h}h left`;
    return "< 1h left";
  })();

  return (
    <View style={[styles.container, { backgroundColor: cardBg, borderColor }]}>
      {/* Options */}
      {poll.options.map((opt: PollOption) => {
        const pct = getPollOptionPercentage(opt, poll.total_votes);
        const isVotedFor = (userVote ?? []).includes(opt.id);
        const isPending = pendingIds.includes(opt.id);

        return (
          <TouchableOpacity
            key={opt.id}
            activeOpacity={showResults ? 1 : 0.75}
            onPress={() => {
              if (showResults || voteMutation.isPending || voteLoading) return;
              togglePending(opt.id);
            }}
            style={[
              styles.option,
              { borderColor },
              isPending && { borderColor: accentColor, borderWidth: 1.5 },
              isVotedFor && {
                borderColor: accentColor,
                backgroundColor: accentColor + "12",
              },
            ]}
          >
            <View style={styles.optionTop}>
              {/* Indicator */}
              {!showResults && (
                <View
                  style={[
                    poll.allow_multiple ? styles.checkbox : styles.radio,
                    { borderColor: isPending ? accentColor : borderColor },
                    isPending && { backgroundColor: accentColor },
                  ]}
                >
                  {isPending && (
                    <Ionicons
                      name={poll.allow_multiple ? "checkmark" : "ellipse"}
                      size={poll.allow_multiple ? 12 : 8}
                      color="#fff"
                    />
                  )}
                </View>
              )}

              <Text
                style={[
                  styles.optionText,
                  { color: textColor },
                  isVotedFor && { fontWeight: "700", color: accentColor },
                ]}
                numberOfLines={2}
              >
                {opt.text}
              </Text>

              {showResults && (
                <Text style={[styles.pctText, { color: accentColor }]}>
                  {pct}%
                </Text>
              )}

              {isVotedFor && (
                <Ionicons
                  name="checkmark-circle"
                  size={16}
                  color={accentColor}
                  style={{ marginLeft: 4 }}
                />
              )}
            </View>

            {showResults && (
              <OptionBar percentage={pct} accentColor={accentColor} />
            )}
          </TouchableOpacity>
        );
      })}

      {/* Vote button (only visible when not yet voted + not expired) */}
      {!showResults && (
        <TouchableOpacity
          style={[
            styles.voteBtn,
            { backgroundColor: accentColor },
            (!pendingIds.length || voteMutation.isPending) &&
              styles.voteBtnDisabled,
          ]}
          onPress={handleVote}
          disabled={!pendingIds.length || voteMutation.isPending || voteLoading}
          activeOpacity={0.85}
        >
          <Text style={styles.voteBtnText}>
            {voteMutation.isPending ? "Submitting…" : "Vote"}
          </Text>
        </TouchableOpacity>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: subColor }]}>
          {poll.total_votes.toLocaleString()}{" "}
          {poll.total_votes === 1 ? "vote" : "votes"}
        </Text>

        {poll.is_anonymous && (
          <>
            <Text style={[styles.dot, { color: subColor }]}>·</Text>
            <Ionicons name="eye-off-outline" size={12} color={subColor} />
            <Text style={[styles.footerText, { color: subColor }]}>
              {" "}
              Anonymous
            </Text>
          </>
        )}

        {poll.allow_multiple && (
          <>
            <Text style={[styles.dot, { color: subColor }]}>·</Text>
            <Text style={[styles.footerText, { color: subColor }]}>
              Pick many
            </Text>
          </>
        )}

        <View style={{ flex: 1 }} />

        <Text
          style={[
            styles.footerText,
            { color: expired ? "#EF4444" : subColor },
            expired && { fontWeight: "700" },
          ]}
        >
          {timeLabel}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    gap: 8,
    marginTop: 8,
  },
  option: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  optionTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  optionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 18,
  },
  pctText: {
    fontSize: 13,
    fontWeight: "800",
    minWidth: 38,
    textAlign: "right",
  },
  voteBtn: {
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 4,
  },
  voteBtnDisabled: {
    opacity: 0.45,
  },
  voteBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 4,
  },
  footerText: {
    fontSize: 11,
    fontWeight: "600",
  },
  dot: {
    fontSize: 11,
    fontWeight: "600",
  },
});
