// app/profile/followers.tsx
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
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
      await addDoc(collection(db, "user_blocks"), {
        blocker_id: myId,
        blocked_id: targetUserId,
        created_at: serverTimestamp(),
      });
      // Remove follow both ways
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
