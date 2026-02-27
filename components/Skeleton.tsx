// components/Skeleton.tsx
import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View, type ViewStyle } from "react-native";

/* =====================================================
   BASE SKELETON PULSE
===================================================== */

export function Skeleton({ style }: { style?: ViewStyle }) {
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

  return <Animated.View style={[styles.base, style, { opacity }]} />;
}

/* =====================================================
   POST CARD SKELETON
===================================================== */

export function PostCardSkeleton() {
  return (
    <View style={skeletonStyles.card}>
      {/* Header */}
      <View style={skeletonStyles.header}>
        <Skeleton style={skeletonStyles.avatar} />
        <View style={skeletonStyles.authorBlock}>
          <Skeleton style={skeletonStyles.nameLine} />
          <Skeleton style={skeletonStyles.usernameLine} />
        </View>
        <Skeleton style={skeletonStyles.timestampLine} />
      </View>

      {/* Content lines */}
      <Skeleton style={skeletonStyles.contentLine1} />
      <Skeleton style={skeletonStyles.contentLine2} />
      <Skeleton style={skeletonStyles.contentLine3} />

      {/* Stats row */}
      <View style={skeletonStyles.statsRow}>
        <Skeleton style={skeletonStyles.statChip} />
        <Skeleton style={skeletonStyles.statChip} />
        <Skeleton style={skeletonStyles.statChip} />
        <Skeleton style={skeletonStyles.statChip} />
      </View>

      {/* Actions row */}
      <View style={skeletonStyles.actionsRow}>
        <Skeleton style={skeletonStyles.actionChip} />
        <Skeleton style={skeletonStyles.actionChip} />
        <Skeleton style={skeletonStyles.actionChip} />
        <Skeleton style={skeletonStyles.actionChip} />
      </View>
    </View>
  );
}

/* =====================================================
   HASHTAG ROW SKELETON (for trending list)
===================================================== */

export function HashtagRowSkeleton() {
  return (
    <View style={skeletonStyles.hashtagRow}>
      <Skeleton style={skeletonStyles.hashtagBadge} />
      <View style={skeletonStyles.hashtagText}>
        <Skeleton style={skeletonStyles.hashtagName} />
        <Skeleton style={skeletonStyles.hashtagCount} />
      </View>
      <Skeleton style={skeletonStyles.hashtagChevron} />
    </View>
  );
}

/* =====================================================
   SEARCH ROW SKELETON (accounts / communities)
===================================================== */

export function SearchRowSkeleton() {
  return (
    <View style={skeletonStyles.searchRow}>
      <Skeleton style={skeletonStyles.searchAvatar} />
      <View style={skeletonStyles.searchText}>
        <Skeleton style={skeletonStyles.searchName} />
        <Skeleton style={skeletonStyles.searchSub} />
      </View>
    </View>
  );
}

/* =====================================================
   POST SEARCH CARD SKELETON
===================================================== */

export function PostSearchSkeleton() {
  return (
    <View style={skeletonStyles.postSearchCard}>
      <View style={skeletonStyles.postSearchTop}>
        <Skeleton style={skeletonStyles.postSearchAvatar} />
        <Skeleton style={skeletonStyles.postSearchAuthor} />
      </View>
      <Skeleton style={skeletonStyles.postSearchLine1} />
      <Skeleton style={skeletonStyles.postSearchLine2} />
    </View>
  );
}

/* =====================================================
   STYLES
===================================================== */

const styles = StyleSheet.create({
  base: {
    backgroundColor: "#E5E7EB",
    borderRadius: 12,
  },
});

const skeletonStyles = StyleSheet.create({
  /* PostCardSkeleton */
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e5e5e5",
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
    borderColor: "#e5e5e5",
    marginBottom: 12,
  },
  statChip: { height: 14, flex: 1, borderRadius: 7 },

  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    gap: 8,
  },
  actionChip: { height: 32, flex: 1, borderRadius: 10 },

  /* HashtagRowSkeleton */
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

  /* SearchRowSkeleton */
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

  /* PostSearchSkeleton */
  postSearchCard: {
    borderRadius: 22,
    padding: 14,
    backgroundColor: "#fff",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e5e5e5",
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
});
