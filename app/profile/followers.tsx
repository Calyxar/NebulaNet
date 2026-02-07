// app/profile/followers.tsx
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";

import UserActionsSheet, {
  type UserActionsSheetRef,
} from "@/components/UserActionsSheet";
import UserRow, { type UserRowModel } from "@/components/UserRow";

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

export default function FollowersScreen() {
  const { user, profile } = useAuth();
  const qc = useQueryClient();

  const sheetRef = useRef<UserActionsSheetRef>(null);
  const [selected, setSelected] = useState<UserRowModel | null>(null);

  const myId = user?.id;

  const {
    data: rows,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ["my-followers-with-status", myId],
    enabled: !!myId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("follows")
        .select(
          `
          follower_id,
          status,
          follower:profiles!follows_follower_id_fkey (
            id, username, full_name, avatar_url, is_private
          )
        `,
        )
        .eq("following_id", myId!)
        // show accepted + pending so you can see requests badge here
        .in("status", ["accepted", "pending"])
        .order("created_at", { ascending: false });

      if (error) throw error;

      const mapped: FollowRow[] = (data as any) ?? [];
      return mapped.filter((r) => !!r.follower);
    },
  });

  // ✅ Efficient mutual detection (ONE extra query, only for "my followers"):
  // Check which of these follower_ids are also followed by ME (accepted).
  const followerIds = useMemo(
    () => (rows ?? []).map((r) => r.follower_id).filter(Boolean),
    [rows],
  );

  const { data: iFollowBackSet } = useQuery({
    queryKey: ["i-follow-back-set", myId, followerIds.join(",")],
    enabled: !!myId && followerIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", myId!)
        .in("following_id", followerIds)
        .eq("status", "accepted");

      if (error) throw error;

      const set = new Set<string>();
      (data as any[] | null)?.forEach((r) => set.add(r.following_id));
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

  const removeFollower = useMutation({
    mutationFn: async (targetUserId: string) => {
      if (!myId) throw new Error("Not signed in");
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", targetUserId)
        .eq("following_id", myId);
      if (error) throw error;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({
        queryKey: ["my-followers-with-status", myId],
      });
    },
  });

  const blockUser = useMutation({
    mutationFn: async (targetUserId: string) => {
      if (!myId) throw new Error("Not signed in");

      // If you haven’t created the blocks table yet, we’ll do it next.
      const { error } = await supabase.from("user_blocks").insert({
        blocker_id: myId,
        blocked_id: targetUserId,
      });
      if (error) throw error;

      // Also remove any follow relationship both ways (optional but common)
      await supabase
        .from("follows")
        .delete()
        .or(
          `and(follower_id.eq.${myId},following_id.eq.${targetUserId}),and(follower_id.eq.${targetUserId},following_id.eq.${myId})`,
        );
    },
    onSuccess: async () => {
      await qc.invalidateQueries({
        queryKey: ["my-followers-with-status", myId],
      });
    },
  });

  const openMenu = (u: UserRowModel) => {
    setSelected(u);
    sheetRef.current?.snapToIndex(0);
  };

  if (!user || !profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.subtle}>Loading…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerBtn} onTouchEnd={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </View>
        <Text style={styles.headerTitle}>Followers</Text>
        <View style={styles.headerBtn} />
      </View>

      {/* List */}
      {isLoading ? (
        <View style={styles.center}>
          <Text style={styles.subtle}>Loading…</Text>
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
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
              <Ionicons name="people-outline" size={56} color="#C5CAE9" />
              <Text style={styles.emptyTitle}>No followers yet</Text>
              <Text style={styles.emptyDesc}>
                When people follow you, they’ll show up here.
              </Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* BottomSheet Actions */}
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#E8EAF6" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  subtle: { color: "#6B7280", fontWeight: "800" },

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
  headerTitle: { fontSize: 16, fontWeight: "800", color: "#111827" },

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
});
