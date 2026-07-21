// app/profile/requests.tsx — UPDATED ✅
// ✅ FIXED: this file was still using the legacy Web SDK (`db` from
//    @/lib/firebase) for every Firestore call, while the rest of the app
//    migrated to @react-native-firebase's native `firestore()` — this
//    screen was apparently missed in that migration. Now uses `firestore()`
//    throughout, matching followers.tsx / following.tsx / profile.tsx.
// ✅ FIXED: `myId` was reading `user?.id`, which doesn't exist on a Firebase
//    Auth user object (the field is `uid`). This meant `myId` was always
//    undefined, so every query's `enabled: !!myId` guard never fired —
//    the screen would always show "No requests" regardless of actual
//    pending follow requests. Now reads `user?.uid`, matching every other
//    screen in this group.
// ✅ UI CONSISTENCY PASS: same treatment as followers.tsx / following.tsx —
//    gradient aligned to blue (was purple), uiScale/fontScale threaded
//    through, card radius bumped 16→18.
import AppHeader from "@/components/navigation/AppHeader";
import UserActionsSheet, {
  type UserActionsSheetRef,
} from "@/components/UserActionsSheet";
import UserRow, { type UserRowModel } from "@/components/UserRow";
import { useAuth } from "@/hooks/useAuth";
import {
  invalidateAfterApproveDeny,
  invalidateAfterBlock,
} from "@/lib/queryKeys/invalidateSocial";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import firestore from "@react-native-firebase/firestore";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

/* =========================
   TYPES
========================= */

type RequestRow = {
  id: string;
  follower_id: string;
  following_id: string;
  status: "pending";
  requested_at: string;
  follower: {
    id: string;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
};

/* =========================
   SKELETON ROW
========================= */

function SkeletonRow({ colors, uiScale }: { colors: any; uiScale: number }) {
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: 18 * uiScale,
          padding: 12 * uiScale,
        },
      ]}
    >
      <View style={styles.skelRow}>
        <View
          style={[
            styles.skelAvatar,
            {
              backgroundColor: colors.surface,
              width: 44 * uiScale,
              height: 44 * uiScale,
              borderRadius: 22 * uiScale,
            },
          ]}
        />
        <View style={{ flex: 1, gap: 8 * uiScale }}>
          <View
            style={[
              styles.skel,
              { width: "60%", height: 12, backgroundColor: colors.surface },
            ]}
          />
          <View
            style={[
              styles.skel,
              { width: "40%", height: 10, backgroundColor: colors.surface },
            ]}
          />
        </View>
        <View style={{ flexDirection: "row", gap: 8 * uiScale }}>
          <View
            style={[
              styles.skel,
              {
                width: 76 * uiScale,
                height: 34 * uiScale,
                borderRadius: 14 * uiScale,
                backgroundColor: colors.surface,
              },
            ]}
          />
          <View
            style={[
              styles.skel,
              {
                width: 86 * uiScale,
                height: 34 * uiScale,
                borderRadius: 14 * uiScale,
                backgroundColor: colors.surface,
              },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

/* =========================
   MAIN SCREEN
========================= */

export default function RequestedFollowersScreen() {
  const { user } = useAuth();
  const { colors, isDark, uiScale, fontScale } = useTheme();
  const qc = useQueryClient();

  const sheetRef = useRef<UserActionsSheetRef>(null);
  const [selected, setSelected] = useState<UserRowModel | null>(null);

  // ✅ FIX: was `user?.id` (doesn't exist on a Firebase Auth user) — the
  // field is `uid`. This previously left myId always undefined.
  const myId = user?.uid;

  // ✅ Aligned with profile.tsx / [username]/index.tsx's gradient — this
  // screen is reached from Profile and should read as the same surface.
  const gradientColors = isDark
    ? [colors.background, colors.background, colors.background]
    : (["#DCEBFF", "#EEF4FF", "#FFFFFF"] as const);

  // ── Pending requests ──
  const {
    data: requests,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ["requested-followers", myId],
    enabled: !!myId,
    queryFn: async () => {
      // ✅ FIX: was db.collection(...) (legacy Web SDK) — now firestore()
      // (native SDK), matching the rest of the app.
      const snap = await firestore()
        .collection("follows")
        .where("following_id", "==", myId!)
        .where("status", "==", "pending")
        .get();
      const rows = await Promise.all(
        snap.docs.map(async (d) => {
          const data = d.data() as any;
          const pSnap = await firestore()
            .collection("profiles")
            .doc(data.follower_id)
            .get();
          const p = pSnap.exists() ? (pSnap.data() as any) : null;
          if (!p) return null;
          return {
            id: d.id,
            follower_id: data.follower_id,
            following_id: data.following_id,
            status: "pending",
            requested_at: data.created_at ?? "",
            follower: {
              id: pSnap.id,
              username: p.username,
              full_name: p.full_name ?? null,
              avatar_url: p.avatar_url ?? null,
            },
          } as RequestRow;
        }),
      );
      return rows.filter(Boolean) as RequestRow[];
    },
  });

  // ── Mutual detection ──
  const requesterIds = useMemo(
    () => (requests ?? []).map((r) => r.follower_id),
    [requests],
  );

  const { data: myFollowingSet } = useQuery({
    queryKey: ["mutual-following-set", myId, requesterIds.join(",")],
    enabled: !!myId && requesterIds.length > 0,
    queryFn: async () => {
      const snap = await firestore()
        .collection("follows")
        .where("follower_id", "==", myId!)
        .where("status", "==", "accepted")
        .where("following_id", "in", requesterIds)
        .get();
      const set = new Set<string>();
      snap.docs.forEach((d) => set.add((d.data() as any).following_id));
      return set;
    },
  });

  const list: UserRowModel[] = useMemo(() => {
    return (requests ?? []).map((r) => {
      const u = r.follower!;
      return {
        id: u.id,
        username: u.username,
        full_name: u.full_name,
        avatar_url: u.avatar_url,
        status: "pending",
        isMutual: !!myFollowingSet?.has(u.id),
      };
    });
  }, [requests, myFollowingSet]);

  // ── Approve ──
  const approveMutation = useMutation({
    mutationFn: async (row: RequestRow) => {
      await firestore()
        .collection("follows")
        .doc(row.id)
        .update({ status: "accepted" });
      return row;
    },
    onMutate: async (row) => {
      const key = ["requested-followers", myId];
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<RequestRow[]>(key) ?? [];
      qc.setQueryData<RequestRow[]>(
        key,
        prev.filter((r) => r.id !== row.id),
      );
      return { prev };
    },
    onError: (_err, _row, ctx) => {
      if (ctx?.prev) qc.setQueryData(["requested-followers", myId], ctx.prev);
    },
    onSettled: (_data, _err, row) => {
      if (!myId || !row) return;
      invalidateAfterApproveDeny(qc, myId, row.follower_id);
    },
  });

  // ── Deny ──
  const denyMutation = useMutation({
    mutationFn: async (row: RequestRow) => {
      await firestore().collection("follows").doc(row.id).delete();
      return row;
    },
    onMutate: async (row) => {
      const key = ["requested-followers", myId];
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<RequestRow[]>(key) ?? [];
      qc.setQueryData<RequestRow[]>(
        key,
        prev.filter((r) => r.id !== row.id),
      );
      return { prev };
    },
    onError: (_err, _row, ctx) => {
      if (ctx?.prev) qc.setQueryData(["requested-followers", myId], ctx.prev);
    },
    onSettled: (_data, _err, row) => {
      if (!myId || !row) return;
      invalidateAfterApproveDeny(qc, myId, row.follower_id);
    },
  });

  // ── Block ──
  const blockMutation = useMutation({
    mutationFn: async (target: { id: string; username?: string }) => {
      if (!myId) throw new Error("Not signed in");
      await firestore().collection("user_blocks").add({
        blocker_id: myId,
        blocked_id: target.id,
        created_at: firestore.FieldValue.serverTimestamp(),
      });
      return target;
    },
    onMutate: async (target) => {
      const key = ["requested-followers", myId];
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<RequestRow[]>(key) ?? [];
      qc.setQueryData<RequestRow[]>(
        key,
        prev.filter((r) => r.follower_id !== target.id),
      );
      return { prev };
    },
    onError: (_err, _target, ctx) => {
      if (ctx?.prev) qc.setQueryData(["requested-followers", myId], ctx.prev);
    },
    onSettled: (_data, _err, target) => {
      if (!myId || !target) return;
      invalidateAfterBlock(qc, myId, target.id, target.username);
    },
  });

  const openMenu = (u: UserRowModel) => {
    setSelected(u);
    sheetRef.current?.snapToIndex(0);
  };

  return (
    <LinearGradient
      colors={gradientColors as any}
      locations={[0, 0.42, 1]}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <AppHeader
          title={`Requests${list.length > 0 ? ` (${list.length})` : ""}`}
          backgroundColor="transparent"
        />

        {isLoading ? (
          <View
            style={{
              paddingHorizontal: 16 * uiScale,
              paddingTop: 12 * uiScale,
              gap: 10 * uiScale,
            }}
          >
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonRow key={i} colors={colors} uiScale={uiScale} />
            ))}
          </View>
        ) : (
          <FlatList
            data={list}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              styles.listContent,
              { paddingHorizontal: 16 * uiScale, paddingTop: 12 * uiScale },
              list.length === 0 && styles.listEmpty,
            ]}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={refetch}
                tintColor={colors.primary}
              />
            }
            ItemSeparatorComponent={() => (
              <View style={{ height: 10 * uiScale }} />
            )}
            renderItem={({ item }) => {
              const row = (requests ?? []).find(
                (r) => r.follower_id === item.id,
              );
              if (!row) return null;

              const isBusy =
                approveMutation.isPending ||
                denyMutation.isPending ||
                blockMutation.isPending;

              return (
                <View
                  style={[
                    styles.card,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      borderRadius: 18 * uiScale,
                      padding: 12 * uiScale,
                    },
                  ]}
                >
                  <UserRow
                    item={item}
                    onPress={() => router.push(`/user/${item.username}`)}
                    onMenu={() => openMenu(item)}
                    hideMenu={false}
                  />
                  <View style={[styles.actionsRow, { gap: 8 * uiScale }]}>
                    <Pressable
                      style={[
                        styles.actionBtn,
                        {
                          backgroundColor: colors.surface,
                          borderWidth: 1,
                          borderColor: colors.border,
                          flex: 1,
                          borderRadius: 14 * uiScale,
                          paddingVertical: 10 * uiScale,
                        },
                      ]}
                      onPress={() => denyMutation.mutate(row)}
                      disabled={isBusy}
                    >
                      <Ionicons name="close" size={16} color={colors.text} />
                      <Text
                        style={[
                          styles.denyText,
                          { color: colors.text, fontSize: 13 * fontScale },
                        ]}
                      >
                        Deny
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[
                        styles.actionBtn,
                        {
                          backgroundColor: colors.primary,
                          flex: 1,
                          borderRadius: 14 * uiScale,
                          paddingVertical: 10 * uiScale,
                        },
                      ]}
                      onPress={() => approveMutation.mutate(row)}
                      disabled={isBusy}
                    >
                      <Ionicons name="checkmark" size={16} color="#fff" />
                      <Text
                        style={[
                          styles.approveText,
                          { fontSize: 13 * fontScale },
                        ]}
                      >
                        Approve
                      </Text>
                    </Pressable>
                  </View>
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={styles.empty}>
                <View
                  style={[
                    styles.emptyIconCircle,
                    {
                      backgroundColor: colors.surface,
                      width: 72 * uiScale,
                      height: 72 * uiScale,
                      borderRadius: 36 * uiScale,
                    },
                  ]}
                >
                  <Ionicons
                    name="mail-unread-outline"
                    size={32}
                    color={colors.primary}
                  />
                </View>
                <Text
                  style={[
                    styles.emptyTitle,
                    { color: colors.text, fontSize: 18 * fontScale },
                  ]}
                >
                  No requests
                </Text>
                <Text
                  style={[
                    styles.emptyDesc,
                    { color: colors.textTertiary, fontSize: 13 * fontScale },
                  ]}
                >
                  Follow requests will appear here.
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
            const row = (requests ?? []).find(
              (r) => r.follower_id === selected.id,
            );
            sheetRef.current?.close();
            if (row) denyMutation.mutate(row);
          }}
          onBlock={async () => {
            if (!selected) return;
            sheetRef.current?.close();
            await blockMutation.mutateAsync({
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
  listContent: { paddingBottom: 24 },
  listEmpty: { flex: 1 },
  card: { borderWidth: 1, gap: 0 },
  actionsRow: { marginTop: 10, flexDirection: "row" },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  approveText: { color: "#fff", fontWeight: "900" },
  denyText: { fontWeight: "900" },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingTop: 80,
    gap: 10,
  },
  emptyIconCircle: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: { fontWeight: "900", textAlign: "center" },
  emptyDesc: {
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 260,
  },
  skel: { borderRadius: 6 },
  skelRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  skelAvatar: {},
});
