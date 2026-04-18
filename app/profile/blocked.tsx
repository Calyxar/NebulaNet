// app/profile/blocked.tsx — COMPLETED + UPDATED

import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";

import UserActionsSheet, { type UserActionsSheetRef } from "@/components/UserActionsSheet";
import UserRow, { type UserRowModel } from "@/components/UserRow";
import { invalidateAfterBlock } from "@/lib/queryKeys/invalidateSocial";

type BlockedProfile = {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  is_private?: boolean | null;
};

type BlockedJoinRow = {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
  blocked: BlockedProfile[] | null;
};

function SkeletonRow() {
  return (
    <View style={styles.skelRow}>
      <View style={styles.skelAvatar} />
      <View style={{ flex: 1, gap: 8 }}>
        <View style={[styles.skel, { width: 180, height: 12 }]} />
        <View style={[styles.skel, { width: 120, height: 10 }]} />
      </View>
      <View style={[styles.skel, { width: 34, height: 34, borderRadius: 12 }]} />
    </View>
  );
}

export default function BlockedUsersScreen() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const myId = user?.id;

  const sheetRef = useRef<UserActionsSheetRef>(null);
  const [selected, setSelected] = useState<UserRowModel | null>(null);

  const { data: rows, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ["my-blocks", myId],
    enabled: !!myId,
    queryFn: async () => {
      const snap = await db
        .collection("user_blocks")
        .where("blocker_id", "==", myId!)
        .get();
      const rows = await Promise.all(
        snap.docs.map(async (d) => {
          const data = d.data() as any;
          const pSnap = await db.collection("profiles").doc(data.blocked_id).get();
          const p = pSnap.exists() ? (pSnap.data() as any) : null;
          return {
            id: d.id,
            blocker_id: data.blocker_id,
            blocked_id: data.blocked_id,
            created_at: data.created_at ?? "",
            blocked: p
              ? [{
                  id: pSnap.id,
                  username: p.username,
                  full_name: p.full_name ?? null,
                  avatar_url: p.avatar_url ?? null,
                  is_private: p.is_private ?? false,
                }]
              : null,
          } as BlockedJoinRow;
        }),
      );
      return rows;
    },
  });

  const list: UserRowModel[] = useMemo(() => {
    const safe = rows ?? [];
    return safe
      .map((r) => {
        const b = r.blocked?.[0] ?? null;
        if (!b) return null;
        return {
          id: b.id,
          username: b.username,
          full_name: b.full_name,
          avatar_url: b.avatar_url,
          isPrivate: !!b.is_private,
        } satisfies UserRowModel;
      })
      .filter(Boolean) as UserRowModel[];
  }, [rows]);

  const blockedIdSet = useMemo(() => {
    const set = new Set<string>();
    (rows ?? []).forEach((r) => set.add(r.blocked_id));
    return set;
  }, [rows]);

  const unblockMutation = useMutation({
    mutationFn: async (targetUserId: string) => {
      if (!myId) throw new Error("Not signed in");
      const snap = await db
        .collection("user_blocks")
        .where("blocker_id", "==", myId)
        .where("blocked_id", "==", targetUserId)
        .get();
      await Promise.all(snap.docs.map((d) => d.ref.delete()));
      return targetUserId;
    },
    onMutate: async (targetUserId) => {
      const key = ["my-blocks", myId];
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<BlockedJoinRow[]>(key) ?? [];
      qc.setQueryData<BlockedJoinRow[]>(key, prev.filter((r) => r.blocked_id !== targetUserId));
      return { prev };
    },
    onError: (_err, _targetId, ctx) => {
      if (ctx?.prev) qc.setQueryData(["my-blocks", myId], ctx.prev);
    },
    onSuccess: (targetUserId) => {
      if (!myId) return;
      invalidateAfterBlock(qc, myId, targetUserId);
    },
  });

  const openMenu = (u: UserRowModel) => {
    setSelected(u);
    sheetRef.current?.snapToIndex(0);
  };

  if (!myId) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Blocked" />
        <View style={styles.center}>
          <Text style={styles.subtle}>Sign in to view blocked users.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Blocked" />

      {isLoading ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 12, gap: 10 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 20 }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#7C3AED" />
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
              <Ionicons name="ban-outline" size={56} color="#C5CAE9" />
              <Text style={styles.emptyTitle}>No blocked users</Text>
              <Text style={styles.emptyDesc}>
                People you block will appear here. You can unblock them anytime.
              </Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      <UserActionsSheet
        ref={sheetRef}
        username={selected?.username}
        removeLabel="Unblock"
        onRemove={async () => {
          if (!selected) return;
          if (!blockedIdSet.has(selected.id)) {
            sheetRef.current?.close();
            return;
          }
          sheetRef.current?.close();
          await unblockMutation.mutateAsync(selected.id);
        }}
        hideBlock
      />
    </SafeAreaView>
  );
}

function Header({ title }: { title: string }) {
  return (
    <View style={styles.header}>
      <Pressable style={styles.headerBtn} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={22} color="#111827" />
      </Pressable>
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={styles.headerBtn} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#E8EAF6" },
  header: { paddingHorizontal: 16, paddingVertical: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#E8EAF6" },
  headerBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 16, fontWeight: "900", color: "#111827" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  subtle: { color: "#6B7280", fontWeight: "800" },
  empty: { paddingTop: 80, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  emptyTitle: { marginTop: 12, fontSize: 18, fontWeight: "900", color: "#111827" },
  emptyDesc: { marginTop: 6, fontSize: 13, fontWeight: "700", color: "#6B7280", textAlign: "center", lineHeight: 18 },
  skel: { backgroundColor: "#E5E7EB", borderRadius: 10 },
  skelRow: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 12, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: "#EEF2FF" },
  skelAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#E5E7EB" },
});