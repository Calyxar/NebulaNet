// components/Skeleton.tsx — UPDATED ✅ dark mode support
import { useTheme } from "@/providers/ThemeProvider";
import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View, type ViewStyle } from "react-native";

export function Skeleton({ style }: { style?: ViewStyle }) {
  const { isDark } = useTheme();
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.9,
          duration: 650,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.35,
          duration: 650,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  const bg = isDark ? "#2C2C2E" : "#E5E7EB";

  return (
    <Animated.View
      style={[{ backgroundColor: bg, borderRadius: 12 }, style, { opacity }]}
    />
  );
}

function useSkeletonColors() {
  const { colors, isDark } = useTheme();
  return {
    card: colors.card,
    border: colors.border,
  };
}

export function PostCardSkeleton() {
  const { card, border } = useSkeletonColors();
  return (
    <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
      <View style={styles.header}>
        <Skeleton style={styles.avatar} />
        <View style={styles.authorBlock}>
          <Skeleton style={styles.nameLine} />
          <Skeleton style={styles.usernameLine} />
        </View>
        <Skeleton style={styles.timestampLine} />
      </View>
      <Skeleton style={styles.contentLine1} />
      <Skeleton style={styles.contentLine2} />
      <Skeleton style={styles.contentLine3} />
      <View style={[styles.statsRow, { borderColor: border }]}>
        <Skeleton style={styles.statChip} />
        <Skeleton style={styles.statChip} />
        <Skeleton style={styles.statChip} />
        <Skeleton style={styles.statChip} />
      </View>
      <View style={styles.actionsRow}>
        <Skeleton style={styles.actionChip} />
        <Skeleton style={styles.actionChip} />
        <Skeleton style={styles.actionChip} />
        <Skeleton style={styles.actionChip} />
      </View>
    </View>
  );
}

export function HashtagRowSkeleton() {
  return (
    <View style={styles.hashtagRow}>
      <Skeleton style={styles.hashtagBadge} />
      <View style={styles.hashtagText}>
        <Skeleton style={styles.hashtagName} />
        <Skeleton style={styles.hashtagCount} />
      </View>
      <Skeleton style={styles.hashtagChevron} />
    </View>
  );
}

export function SearchRowSkeleton() {
  return (
    <View style={styles.searchRow}>
      <Skeleton style={styles.searchAvatar} />
      <View style={styles.searchText}>
        <Skeleton style={styles.searchName} />
        <Skeleton style={styles.searchSub} />
      </View>
    </View>
  );
}

export function PostSearchSkeleton() {
  const { card, border } = useSkeletonColors();
  return (
    <View
      style={[
        styles.postSearchCard,
        { backgroundColor: card, borderColor: border },
      ]}
    >
      <View style={styles.postSearchTop}>
        <Skeleton style={styles.postSearchAvatar} />
        <Skeleton style={styles.postSearchAuthor} />
      </View>
      <Skeleton style={styles.postSearchLine1} />
      <Skeleton style={styles.postSearchLine2} />
    </View>
  );
}

// ── New variants for screens not covered above ──

export function ProfilePostSkeleton() {
  const { card, border } = useSkeletonColors();
  return (
    <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
      <View style={styles.header}>
        <Skeleton style={styles.avatar} />
        <View style={styles.authorBlock}>
          <Skeleton style={styles.nameLine} />
          <Skeleton style={styles.usernameLine} />
        </View>
      </View>
      <Skeleton style={styles.contentLine1} />
      <Skeleton style={styles.contentLine2} />
      <View style={[styles.statsRow, { borderColor: border }]}>
        <Skeleton style={styles.statChip} />
        <Skeleton style={styles.statChip} />
        <Skeleton style={styles.statChip} />
      </View>
    </View>
  );
}

export function NotificationRowSkeleton() {
  return (
    <View style={styles.notifRow}>
      <Skeleton style={styles.notifAvatar} />
      <View style={styles.notifText}>
        <Skeleton style={styles.notifLine1} />
        <Skeleton style={styles.notifLine2} />
      </View>
    </View>
  );
}

export function ConversationRowSkeleton() {
  return (
    <View style={styles.convRow}>
      <Skeleton style={styles.convAvatar} />
      <View style={styles.convText}>
        <View style={styles.convTopRow}>
          <Skeleton style={styles.convName} />
          <Skeleton style={styles.convTime} />
        </View>
        <Skeleton style={styles.convPreview} />
      </View>
    </View>
  );
}

export function FeedSkeleton({ count = 4 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <PostCardSkeleton key={i} />
      ))}
    </>
  );
}

export function NotificationsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <NotificationRowSkeleton key={i} />
      ))}
    </>
  );
}

export function ChatListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <ConversationRowSkeleton key={i} />
      ))}
    </>
  );
}

export function ProfilePostsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <ProfilePostSkeleton key={i} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    padding: 16,
    marginBottom: 12,
    marginHorizontal: 14,
    borderWidth: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    gap: 12,
  },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  authorBlock: { flex: 1, gap: 6 },
  nameLine: { height: 14, width: "55%", borderRadius: 7 },
  usernameLine: { height: 11, width: "35%", borderRadius: 6 },
  timestampLine: { height: 11, width: 48, borderRadius: 6 },
  contentLine1: { height: 13, borderRadius: 7, marginBottom: 8 },
  contentLine2: { height: 13, width: "85%", borderRadius: 7, marginBottom: 8 },
  contentLine3: { height: 13, width: "60%", borderRadius: 7, marginBottom: 16 },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginBottom: 12,
  },
  statChip: { height: 14, flex: 1, borderRadius: 7 },
  actionsRow: { flexDirection: "row", justifyContent: "space-around", gap: 8 },
  actionChip: { height: 32, flex: 1, borderRadius: 10 },

  hashtagRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  hashtagBadge: { width: 42, height: 42, borderRadius: 21 },
  hashtagText: { flex: 1, gap: 6 },
  hashtagName: { height: 14, width: "50%", borderRadius: 7 },
  hashtagCount: { height: 11, width: "30%", borderRadius: 6 },
  hashtagChevron: { width: 18, height: 18, borderRadius: 9 },

  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  searchAvatar: { width: 42, height: 42, borderRadius: 21 },
  searchText: { flex: 1, gap: 6 },
  searchName: { height: 14, width: "50%", borderRadius: 7 },
  searchSub: { height: 11, width: "35%", borderRadius: 6 },

  postSearchCard: {
    borderRadius: 22,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  postSearchTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  postSearchAvatar: { width: 28, height: 28, borderRadius: 14 },
  postSearchAuthor: { height: 13, width: "40%", borderRadius: 7 },
  postSearchLine1: { height: 13, borderRadius: 7, marginBottom: 8 },
  postSearchLine2: { height: 13, width: "70%", borderRadius: 7 },

  notifRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  notifAvatar: { width: 44, height: 44, borderRadius: 22 },
  notifText: { flex: 1, gap: 8 },
  notifLine1: { height: 13, width: "75%", borderRadius: 7 },
  notifLine2: { height: 11, width: "40%", borderRadius: 6 },

  convRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  convAvatar: { width: 50, height: 50, borderRadius: 25 },
  convText: { flex: 1, gap: 8 },
  convTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  convName: { height: 14, width: "40%", borderRadius: 7 },
  convTime: { height: 11, width: 40, borderRadius: 6 },
  convPreview: { height: 12, width: "70%", borderRadius: 6 },
});
