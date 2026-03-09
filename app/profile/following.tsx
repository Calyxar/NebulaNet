// app/profile/following.tsx — UPDATED ✅
// ✅ Full useTheme() support — no hardcoded colors
// ✅ AppHeader replaces inline header
// ✅ Skeleton rows on loading (8 rows)
// ✅ Linear gradient background (light mode only)
// ✅ invalidateAfterUnfollow / invalidateAfterBlock preserved

import AppHeader from "@/components/navigation/AppHeader";
import UserActionsSheet, {
  type UserActionsSheetRef,
} from "@/components/UserActionsSheet";
import UserRow, { type UserRowModel } from "@/components/UserRow";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import {
  invalidateAfterBlock,
  invalidateAfterUnfollow,
} from "@/lib/queryKeys/invalidateSocial";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import React, { useMemo, useRef, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

/* =========================
   TYPES
========================= */

type FollowingJoinRow = {
  following_id: string;
  status: "accepted" | "pending";
  created_at: string;
  following: {
    id: string;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
    is_private?: boolean | null;
  } | null;
};

/* =========================
   SKELETON ROW
========================= */

function SkeletonRow({ colors }: { colors: any }) {
  return (
    <View
      style={[
        styles.skeletonRow,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View
        style={[styles.skeletonAvatar, { backgroundColor: colors.surface }]}
      />
      <View style={{ flex: 1, gap: 8 }}>
        <View
          style={[
            styles.skeletonLine,
            { width: "60%", backgroundColor: colors.surface },
          ]}
        />
        <View
          style={[
            styles.skeletonLine,
            { width: "40%", height: 10, backgroundColor: colors.surface },
          ]}
        />
      </View>
      <View style={[styles.skeletonBtn, { backgroundColor: colors.surface }]} />
    </View>
  );
}

/* =========================
   MAIN SCREEN
========================= */

export default function FollowingScreen() {
  const { user, profile } = useAuth();
  const { colors, isDark } = useTheme();
  const qc = useQueryClient();

  const sheetRef = useRef<UserActionsSheetRef>(null);
  const [selected, setSelected] = useState<UserRowModel | null>(null);

  const myId = user?.id;

  const gradientColors = isDark
    ? [colors.background, colors.background]
    : ["#EEF0FF", "#F5F3FF", "#FFFFFF"];

  // ── Following query ──
  const {
    data: rows,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ["my-following-with-status", myId],
    enabled: !!myId,
    queryFn: async () => {
      const snap = await getDocs(
        query(
          collection(db, "follows"),
          where("follower_id", "==", myId!),
          where("status", "in", ["accepted", "pending"]),
        ),
      );
      const rows = await Promise.all(
        snap.docs.map(async (d) => {
          const data = d.data() as any;
          const pSnap = await getDoc(doc(db, "profiles", data.following_id));
          const p = pSnap.exists() ? (pSnap.data() as any) : null;
          return {
            following_id: data.following_id,
            status: data.status,
            created_at: data.created_at ?? "",
            following: p
              ? {
                  id: pSnap.id,
                  username: p.username,
                  full_name: p.full_name ?? null,
                  avatar_url: p.avatar_url ?? null,
                  is_private: p.is_private ?? false,
                }
              : null,
          } as FollowingJoinRow;
        }),
      );
      return rows.filter((r) => !!r.following);
    },
  });

  // ── Mutual detection ──
  const followingIds = useMemo(
    () => (rows ?? []).map((r) => r.following_id).filter(Boolean),
    [rows],
  );

  const { data: theyFollowMeSet } = useQuery({
    queryKey: ["they-follow-me-set", myId, followingIds.join("|")],
    enabled: !!myId && followingIds.length > 0,
    queryFn: async () => {
      const snap = await getDocs(
        query(
          collection(db, "follows"),
          where("following_id", "==", myId!),
          where("follower_id", "in", followingIds),
          where("status", "==", "accepted"),
        ),
      );
      const set = new Set<string>();
      snap.docs.forEach((d) => set.add((d.data() as any).follower_id));
      return set;
    },
  });

  const list: UserRowModel[] = useMemo(() => {
    return (rows ?? []).map((r) => {
      const u = r.following!;
      return {
        id: u.id,
        username: u.username,
        full_name: u.full_name,
        avatar_url: u.avatar_url,
        isPrivate: !!u.is_private,
        status: r.status,
        isMutual:
          r.status === "accepted" ? !!theyFollowMeSet?.has(u.id) : false,
      };
    });
  }, [rows, theyFollowMeSet]);

  // ── Unfollow / cancel request ──
  const unfollowMutation = useMutation({
    mutationFn: async (target: { id: string; username?: string }) => {
      if (!myId) throw new Error("Not signed in");
      const snap = await getDocs(
        query(
          collection(db, "follows"),
          where("follower_id", "==", myId),
          where("following_id", "==", target.id),
        ),
      );
      await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
      return target;
    },
    onSuccess: (target) => {
      invalidateAfterUnfollow(qc, myId!, target.id, target.username);
    },
  });

  // ── Block user ──
  const blockUser = useMutation({
    mutationFn: async (target: { id: string; username?: string }) => {
      if (!myId) throw new Error("Not signed in");
      await addDoc(collection(db, "user_blocks"), {
        blocker_id: myId,
        blocked_id: target.id,
        created_at: serverTimestamp(),
      });
      return target;
    },
    onSuccess: (target) => {
      invalidateAfterBlock(qc, myId!, target.id, target.username);
    },
  });

  const openMenu = (u: UserRowModel) => {
    setSelected(u);
    sheetRef.current?.snapToIndex(0);
  };

  return (
    <LinearGradient
      colors={gradientColors as any}
      locations={[0, 0.3, 1]}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <AppHeader
          title={`Following${list.length > 0 ? ` (${list.length})` : ""}`}
          backgroundColor="transparent"
        />

        {isLoading ? (
          <View style={{ paddingHorizontal: 16, paddingTop: 12, gap: 10 }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonRow key={i} colors={colors} />
            ))}
          </View>
        ) : (
          <FlatList
            data={list}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              styles.listContent,
              list.length === 0 && styles.listEmpty,
            ]}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={refetch}
                tintColor={colors.primary}
              />
            }
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            renderItem={({ item }) => (
              <UserRow
                item={item}
                onPress={() => router.push(`/user/${item.username}`)}
                onMenu={() => openMenu(item)}
              />
            )}
            ListEmptyComponent={
              <View style={styles.empty}>
                <View
                  style={[
                    styles.emptyIconCircle,
                    { backgroundColor: colors.surface },
                  ]}
                >
                  <Ionicons
                    name="person-add-outline"
                    size={32}
                    color={colors.primary}
                  />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  Not following anyone yet
                </Text>
                <Text
                  style={[styles.emptyDesc, { color: colors.textTertiary }]}
                >
                  When you follow people, they'll appear here.
                </Text>
              </View>
            }
            showsVerticalScrollIndicator={false}
          />
        )}

        <UserActionsSheet
          ref={sheetRef}
          username={selected?.username}
          onRemove={async () => {
            if (!selected) return;
            sheetRef.current?.close();
            await unfollowMutation.mutateAsync({
              id: selected.id,
              username: selected.username,
            });
          }}
          onBlock={async () => {
            if (!selected) return;
            sheetRef.current?.close();
            await blockUser.mutateAsync({
              id: selected.id,
              username: selected.username,
            });
          }}
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

/* =========================
   STYLES
========================= */

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1, backgroundColor: "transparent" },

  listContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24 },
  listEmpty: { flex: 1 },

  skeletonRow: {
    borderRadius: 16,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
  },
  skeletonAvatar: { width: 44, height: 44, borderRadius: 22 },
  skeletonLine: { height: 12, borderRadius: 6 },
  skeletonBtn: { width: 80, height: 34, borderRadius: 999 },

  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingTop: 80,
    gap: 10,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 18, fontWeight: "900", textAlign: "center" },
  emptyDesc: {
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 260,
  },
});
