// app/profile/requests.tsx — COMPLETED + UPDATED (Block relies on DB trigger)
// ✅ Uses UserRow built-in badges
// ✅ BottomSheet menu (UserActionsSheet)
// ✅ Mutual detection (single IN query)
// ✅ Approve / Deny with optimistic removal
// ✅ Block mutation + optimistic removal
// ✅ Cleanup handled by DB trigger (handle_user_block_cleanup)

import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";

import UserActionsSheet, {
  type UserActionsSheetRef,
} from "@/components/UserActionsSheet";
import UserRow, { type UserRowModel } from "@/components/UserRow";

import {
  invalidateAfterApproveDeny,
  invalidateAfterBlock,
} from "@/lib/queryKeys/invalidateSocial";

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

function SkeletonRow() {
  return (
    <View style={styles.skelRow}>
      <View style={styles.skelAvatar} />
      <View style={{ flex: 1, gap: 8 }}>
        <View
          style={[styles.skel, { width: 180, height: 12, borderRadius: 10 }]}
        />
        <View
          style={[styles.skel, { width: 120, height: 10, borderRadius: 10 }]}
        />
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <View
          style={[styles.skel, { width: 86, height: 34, borderRadius: 12 }]}
        />
        <View
          style={[styles.skel, { width: 86, height: 34, borderRadius: 12 }]}
        />
      </View>
    </View>
  );
}

export default function RequestedFollowersScreen() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const sheetRef = useRef<UserActionsSheetRef>(null);
  const [selected, setSelected] = useState<UserRowModel | null>(null);

  const myId = user?.id;

  const {
    data: requests,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ["requested-followers", myId],
    enabled: !!myId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("follows")
        .select(
          `
          id,
          follower_id,
          following_id,
          status,
          requested_at,
          follower:profiles!follows_follower_id_fkey (
            id,
            username,
            full_name,
            avatar_url
          )
        `,
        )
        .eq("following_id", myId!)
        .eq("status", "pending")
        .order("requested_at", { ascending: false });

      if (error) throw error;

      const mapped =
        (data as any[])
          ?.map((r) => ({ ...r, follower: r.follower ?? null }))
          .filter((r) => !!r.follower) ?? [];

      return mapped as RequestRow[];
    },
  });

  // Mutual detection (single IN query for requesters)
  const requesterIds = useMemo(
    () => (requests ?? []).map((r) => r.follower_id),
    [requests],
  );

  const { data: myFollowingSet } = useQuery({
    queryKey: ["mutual-following-set", myId, requesterIds.join(",")],
    enabled: !!myId && requesterIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", myId!)
        .eq("status", "accepted")
        .in("following_id", requesterIds);

      if (error) throw error;

      const set = new Set<string>();
      (data ?? []).forEach((r: any) => set.add(r.following_id));
      return set;
    },
  });

  // Build list for UserRow
  const list: UserRowModel[] = useMemo(() => {
    return (requests ?? []).map((r) => {
      const u = r.follower!;
      return {
        id: u.id,
        username: u.username,
        full_name: u.full_name,
        avatar_url: u.avatar_url,
        status: "pending", // UserRow shows "Requested"
        isMutual: !!myFollowingSet?.has(u.id),
      };
    });
  }, [requests, myFollowingSet]);

  // Approve
  const approveMutation = useMutation({
    mutationFn: async (row: RequestRow) => {
      const { error } = await supabase
        .from("follows")
        .update({ status: "accepted" })
        .eq("id", row.id)
        .eq("following_id", myId!);

      if (error) throw error;
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

  // Deny
  const denyMutation = useMutation({
    mutationFn: async (row: RequestRow) => {
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("id", row.id)
        .eq("following_id", myId!);

      if (error) throw error;
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

  // Block (cleanup is done by DB trigger AFTER INSERT on user_blocks)
  const blockMutation = useMutation({
    mutationFn: async (target: { id: string; username?: string }) => {
      if (!myId) throw new Error("Not signed in");

      const { error } = await supabase.from("user_blocks").insert({
        blocker_id: myId,
        blocked_id: target.id,
      });

      if (error) throw error;
      return target;
    },
    onMutate: async (target) => {
      const key = ["requested-followers", myId];
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<RequestRow[]>(key) ?? [];

      // optimistic remove by follower_id
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
      // If your helper only supports 3 args, just remove target.username
      invalidateAfterBlock(qc, myId, target.id, target.username);
    },
  });

  const openMenu = (u: UserRowModel) => {
    setSelected(u);
    sheetRef.current?.snapToIndex(0);
  };

  if (!myId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.subtleText}>Sign in to view requests.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Requested" />

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
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: 20,
            paddingTop: 12,
          }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor="#7C3AED"
            />
          }
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item }) => {
            const row = (requests ?? []).find((r) => r.follower_id === item.id);
            if (!row) return null;

            const isBusy =
              approveMutation.isPending ||
              denyMutation.isPending ||
              blockMutation.isPending;

            return (
              <View style={styles.card}>
                <UserRow
                  item={item}
                  onPress={() => router.push(`/user/${item.username}`)}
                  onMenu={() => openMenu(item)}
                />

                <View style={styles.actionsRow}>
                  <Pressable
                    style={[styles.actionBtn, styles.denyBtn]}
                    onPress={() => denyMutation.mutate(row)}
                    disabled={isBusy}
                  >
                    <Ionicons name="close" size={18} color="#111827" />
                    <Text style={styles.denyText}>Deny</Text>
                  </Pressable>

                  <Pressable
                    style={[styles.actionBtn, styles.approveBtn]}
                    onPress={() => approveMutation.mutate(row)}
                    disabled={isBusy}
                  >
                    <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                    <Text style={styles.approveText}>Approve</Text>
                  </Pressable>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="mail-unread-outline" size={56} color="#C5CAE9" />
              <Text style={styles.emptyTitle}>No requests</Text>
              <Text style={styles.emptyDesc}>
                When someone requests to follow you, it will show up here.
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
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#E8EAF6",
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 16, fontWeight: "900", color: "#111827" },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#EEF2FF",
  },

  actionsRow: {
    marginTop: 10,
    flexDirection: "row",
    gap: 10,
    justifyContent: "flex-end",
  },

  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },
  approveBtn: { backgroundColor: "#7C3AED" },
  approveText: { color: "#FFFFFF", fontWeight: "900" },

  denyBtn: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EEF2FF",
  },
  denyText: { color: "#111827", fontWeight: "900" },

  empty: {
    paddingTop: 80,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
  },
  emptyDesc: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 18,
  },
  subtleText: { color: "#6B7280", fontWeight: "800" },

  skel: { backgroundColor: "#E5E7EB" },
  skelRow: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#EEF2FF",
  },
  skelAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E5E7EB",
  },
});
