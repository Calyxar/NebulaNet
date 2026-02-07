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

import { invalidateAfterBlock } from "@/lib/queryKeys/invalidateSocial";

type BlockedJoinRow = {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
  // NOTE: depending on PostgREST relationship detection, this can come back as
  // object OR array. We normalize it below.
  blocked:
    | {
        id: string;
        username: string;
        full_name: string | null;
        avatar_url: string | null;
        is_private?: boolean | null;
      }
    | {
        id: string;
        username: string;
        full_name: string | null;
        avatar_url: string | null;
        is_private?: boolean | null;
      }[]
    | null;
};

function SkeletonRow() {
  return (
    <View style={styles.skelRow}>
      <View style={styles.skelAvatar} />
      <View style={{ flex: 1, gap: 8 }}>
        <View style={[styles.skel, { width: 180, height: 12 }]} />
        <View style={[styles.skel, { width: 120, height: 10 }]} />
      </View>
      <View
        style={[styles.skel, { width: 34, height: 34, borderRadius: 12 }]}
      />
    </View>
  );
}

export default function BlockedUsersScreen() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const myId = user?.id;

  const sheetRef = useRef<UserActionsSheetRef>(null);
  const [selected, setSelected] = useState<UserRowModel | null>(null);

  // 1) Load blocked list
  const {
    data: rows,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ["my-blocks", myId],
    enabled: !!myId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_blocks")
        .select(
          `
          id,
          blocker_id,
          blocked_id,
          created_at,
          blocked:profiles!user_blocks_blocked_id_fkey (
            id, username, full_name, avatar_url, is_private
          )
        `,
        )
        .eq("blocker_id", myId!)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data as BlockedJoinRow[]) ?? [];
    },
  });

  // Normalize into UserRowModel list
  const list: UserRowModel[] = useMemo(() => {
    const safe = rows ?? [];
    return safe
      .map((r) => {
        const b = Array.isArray(r.blocked) ? r.blocked[0] : r.blocked;

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

  // Quick lookup for unblock
  const blockedIdSet = useMemo(() => {
    const set = new Set<string>();
    (rows ?? []).forEach((r) => set.add(r.blocked_id));
    return set;
  }, [rows]);

  // 2) Unblock mutation (optimistic)
  const unblockMutation = useMutation({
    mutationFn: async (targetUserId: string) => {
      if (!myId) throw new Error("Not signed in");

      const { error } = await supabase
        .from("user_blocks")
        .delete()
        .eq("blocker_id", myId)
        .eq("blocked_id", targetUserId);

      if (error) throw error;
      return targetUserId;
    },
    onMutate: async (targetUserId) => {
      const key = ["my-blocks", myId];

      await qc.cancelQueries({ queryKey: key });

      const prev = qc.getQueryData<BlockedJoinRow[]>(key) ?? [];

      // optimistic remove
      qc.setQueryData<BlockedJoinRow[]>(
        key,
        prev.filter((r) => r.blocked_id !== targetUserId),
      );

      return { prev };
    },
    onError: (_err, _targetId, ctx) => {
      if (!ctx?.prev) return;
      qc.setQueryData(["my-blocks", myId], ctx.prev);
    },
    onSuccess: (targetUserId) => {
      if (!myId) return;
      // Unblock affects same UI surfaces as block
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
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: 20,
          }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor="#7C3AED"
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

      {/* BottomSheet */}
      <UserActionsSheet
        ref={sheetRef}
        username={selected?.username}
        removeLabel="Unblock"
        onRemove={async () => {
          if (!selected) return;
          // guard: only try if we truly have this blocked
          if (!blockedIdSet.has(selected.id)) {
            sheetRef.current?.close();
            return;
          }
          sheetRef.current?.close();
          await unblockMutation.mutateAsync(selected.id);
        }}
        // no Block button on blocked list (it’s already blocked)
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

  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  subtle: { color: "#6B7280", fontWeight: "800" },

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

  skel: { backgroundColor: "#E5E7EB", borderRadius: 10 },
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
