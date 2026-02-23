// app/profile/following.tsx — COMPLETED + UPDATED
// ✅ UserRow + badges
// ✅ BottomSheet menu
// ✅ Efficient mutual detection
// ✅ Uses invalidateAfterUnfollow / invalidateAfterBlock (with username)
// ✅ Block mutation relies on DB trigger cleanup (no extra deletes client-side)

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
import { db } from "@/lib/firebase";
import {
  invalidateAfterBlock,
  invalidateAfterUnfollow,
} from "@/lib/queryKeys/invalidateSocial";
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

export default function FollowingScreen() {
  const { user, profile } = useAuth();
  const qc = useQueryClient();

  const sheetRef = useRef<UserActionsSheetRef>(null);
  const [selected, setSelected] = useState<UserRowModel | null>(null);

  const myId = user?.id;

  // 1) Following list (accepted + pending)
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

  // 2) Mutual detection efficiently:
  // For each following_id, check if they also follow ME (accepted).
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
        status: r.status, // pending => UserRow shows "Requested"
        isMutual:
          r.status === "accepted" ? !!theyFollowMeSet?.has(u.id) : false,
      };
    });
  }, [rows, theyFollowMeSet]);

  // 3) Unfollow / cancel request
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

  // 4) Block user
  // IMPORTANT: rely on DB trigger (handle_user_block_cleanup) to remove follows/notifications/story_views.
  // Do NOT duplicate cleanup client-side.
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
        <Pressable style={styles.headerBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </Pressable>

        <Text style={styles.headerTitle}>Following</Text>

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
              <Ionicons name="person-add-outline" size={56} color="#C5CAE9" />
              <Text style={styles.emptyTitle}>Not following anyone yet</Text>
              <Text style={styles.emptyDesc}>
                When you follow people, they’ll show up here.
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
