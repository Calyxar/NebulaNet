// app/profile/followers.tsx — UPDATED ✅
// ✅ Full useTheme() support — no hardcoded colors
// ✅ AppHeader replaces inline header
// ✅ Skeleton rows on loading (8 rows)
// ✅ Follow-back button per row via FollowerRowItem (per-row hook pattern)
// ✅ Linear gradient background (light mode only)
// ✅ Fixed onTouchEnd → Pressable for back button
// ✅ Follow-back button hidden for mutual followers (already following back)

import AppHeader from "@/components/navigation/AppHeader";
import UserActionsSheet, {
  type UserActionsSheetRef,
} from "@/components/UserActionsSheet";
import UserRow, { type UserRowModel } from "@/components/UserRow";
import { useAuth } from "@/hooks/useAuth";
import { useFollowActions, useFollowStatus } from "@/hooks/useFollowActions";
import { db } from "@/lib/firebase";
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
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

/* =========================
   TYPES
========================= */

type FollowRow = {
  follower_id: string;
  status: "accepted" | "pending";
  follower: {
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
    </View>
  );
}

/* =========================
   PER-ROW FOLLOW-BACK ITEM
   Separate component so useFollowActions hook is called per-row safely
========================= */

function FollowerRowItem({
  item,
  isMutual,
  onPress,
  onMenu,
  colors,
}: {
  item: UserRowModel;
  isMutual: boolean;
  onPress: () => void;
  onMenu: () => void;
  colors: any;
}) {
  const { follow, unfollow, isFollowingBusy } = useFollowActions(
    item.id,
    item.isPrivate,
  );

  const { data: followStatus } = useFollowStatus(item.id);

  // Determine button state
  const isFollowing = followStatus === "accepted";
  const isPending = followStatus === "pending";

  const handleFollowBack = () => {
    if (isFollowing || isPending) {
      unfollow();
    } else {
      follow();
    }
  };

  const followLabel = isFollowing
    ? "Following"
    : isPending
      ? "Requested"
      : "Follow back";

  const followTrailing = (
    <TouchableOpacity
      onPress={handleFollowBack}
      disabled={isFollowingBusy}
      activeOpacity={0.8}
      style={[
        styles.followBtn,
        isFollowing || isPending
          ? {
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
            }
          : { backgroundColor: colors.primary },
      ]}
    >
      {isFollowingBusy ? (
        <ActivityIndicator
          size={13}
          color={isFollowing || isPending ? colors.primary : "#fff"}
        />
      ) : (
        <Text
          style={[
            styles.followBtnText,
            { color: isFollowing || isPending ? colors.text : "#fff" },
          ]}
        >
          {followLabel}
        </Text>
      )}
    </TouchableOpacity>
  );

  return (
    <UserRow
      item={{ ...item, isMutual }}
      onPress={onPress}
      onMenu={onMenu}
      trailingAction={followTrailing}
    />
  );
}

/* =========================
   MAIN SCREEN
========================= */

export default function FollowersScreen() {
  const { user, profile } = useAuth();
  const { colors, isDark } = useTheme();
  const qc = useQueryClient();

  const sheetRef = useRef<UserActionsSheetRef>(null);
  const [selected, setSelected] = useState<UserRowModel | null>(null);

  const myId = user?.id;

  const gradientColors = isDark
    ? [colors.background, colors.background]
    : ["#EEF0FF", "#F5F3FF", "#FFFFFF"];

  // ── Followers query ──
  const {
    data: rows,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ["my-followers-with-status", myId],
    enabled: !!myId,
    queryFn: async () => {
      const snap = await getDocs(
        query(
          collection(db, "follows"),
          where("following_id", "==", myId!),
          where("status", "in", ["accepted", "pending"]),
        ),
      );
      const rows = await Promise.all(
        snap.docs.map(async (d) => {
          const data = d.data() as any;
          const pSnap = await getDoc(doc(db, "profiles", data.follower_id));
          const p = pSnap.exists() ? (pSnap.data() as any) : null;
          return {
            follower_id: data.follower_id,
            status: data.status,
            follower: p
              ? {
                  id: pSnap.id,
                  username: p.username,
                  full_name: p.full_name ?? null,
                  avatar_url: p.avatar_url ?? null,
                  is_private: p.is_private ?? false,
                }
              : null,
          } as FollowRow;
        }),
      );
      return rows.filter((r) => !!r.follower);
    },
  });

  // ── Mutual detection ──
  const followerIds = useMemo(
    () => (rows ?? []).map((r) => r.follower_id).filter(Boolean),
    [rows],
  );

  const { data: iFollowBackSet } = useQuery({
    queryKey: ["i-follow-back-set", myId, followerIds.join(",")],
    enabled: !!myId && followerIds.length > 0,
    queryFn: async () => {
      const snap = await getDocs(
        query(
          collection(db, "follows"),
          where("follower_id", "==", myId!),
          where("following_id", "in", followerIds),
          where("status", "==", "accepted"),
        ),
      );
      const set = new Set<string>();
      snap.docs.forEach((d) => set.add((d.data() as any).following_id));
      return set;
    },
  });

  const list: UserRowModel[] = useMemo(() => {
    return (rows ?? []).map((r) => {
      const u = r.follower!;
      return {
        id: u.id,
        username: u.username,
        full_name: u.full_name,
        avatar_url: u.avatar_url,
        isPrivate: !!u.is_private,
        status: r.status,
        isMutual: r.status === "accepted" ? !!iFollowBackSet?.has(u.id) : false,
      };
    });
  }, [rows, iFollowBackSet]);

  // ── Remove follower ──
  const removeFollower = useMutation({
    mutationFn: async (targetUserId: string) => {
      if (!myId) throw new Error("Not signed in");
      const snap = await getDocs(
        query(
          collection(db, "follows"),
          where("follower_id", "==", targetUserId),
          where("following_id", "==", myId),
        ),
      );
      await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-followers-with-status", myId] });
    },
  });

  // ── Block user ──
  const blockUser = useMutation({
    mutationFn: async (targetUserId: string) => {
      if (!myId) throw new Error("Not signed in");
      await addDoc(collection(db, "user_blocks"), {
        blocker_id: myId,
        blocked_id: targetUserId,
        created_at: serverTimestamp(),
      });
      const [s1, s2] = await Promise.all([
        getDocs(
          query(
            collection(db, "follows"),
            where("follower_id", "==", myId),
            where("following_id", "==", targetUserId),
          ),
        ),
        getDocs(
          query(
            collection(db, "follows"),
            where("follower_id", "==", targetUserId),
            where("following_id", "==", myId),
          ),
        ),
      ]);
      await Promise.all([...s1.docs, ...s2.docs].map((d) => deleteDoc(d.ref)));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-followers-with-status", myId] });
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
          title={`Followers${list.length > 0 ? ` (${list.length})` : ""}`}
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
              <FollowerRowItem
                item={item}
                isMutual={!!item.isMutual}
                onPress={() => router.push(`/user/${item.username}`)}
                onMenu={() => openMenu(item)}
                colors={colors}
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
                    name="people-outline"
                    size={32}
                    color={colors.primary}
                  />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  No followers yet
                </Text>
                <Text
                  style={[styles.emptyDesc, { color: colors.textTertiary }]}
                >
                  When people follow you, they'll appear here.
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
            await removeFollower.mutateAsync(selected.id);
          }}
          onBlock={async () => {
            if (!selected) return;
            sheetRef.current?.close();
            await blockUser.mutateAsync(selected.id);
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

  followBtn: {
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 999,
    minWidth: 92,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  followBtnText: { fontSize: 12, fontWeight: "800" },

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
