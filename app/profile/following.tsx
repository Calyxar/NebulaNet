// app/profile/following.tsx — REACT NATIVE FIREBASE ✅
// ✅ UI CONSISTENCY PASS: same treatment as followers.tsx —
//    - Gradient aligned to match profile.tsx / [username]/index.tsx (blue)
//      instead of this screen's own purple variant.
//    - uiScale/fontScale threaded through row/avatar/skeleton sizing.
//    - Card radius bumped from 16 to 18 to match the rest of the redesign.
import AppHeader from "@/components/navigation/AppHeader";
import UserActionsSheet, {
  type UserActionsSheetRef,
} from "@/components/UserActionsSheet";
import UserRow, { type UserRowModel } from "@/components/UserRow";
import { useAuth } from "@/hooks/useAuth";
import {
  invalidateAfterBlock,
  invalidateAfterUnfollow,
} from "@/lib/queryKeys/invalidateSocial";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import firestore from "@react-native-firebase/firestore";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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

function SkeletonRow({ colors, uiScale }: { colors: any; uiScale: number }) {
  return (
    <View
      style={[
        styles.skeletonRow,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: 18 * uiScale,
          padding: 12 * uiScale,
          gap: 12 * uiScale,
        },
      ]}
    >
      <View
        style={[
          styles.skeletonAvatar,
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
      <View
        style={[
          styles.skeletonBtn,
          {
            backgroundColor: colors.surface,
            width: 80 * uiScale,
            height: 34 * uiScale,
          },
        ]}
      />
    </View>
  );
}

export default function FollowingScreen() {
  const { user } = useAuth();
  const { colors, isDark, uiScale, fontScale } = useTheme();
  const qc = useQueryClient();

  const sheetRef = useRef<UserActionsSheetRef>(null);
  const [selected, setSelected] = useState<UserRowModel | null>(null);

  const myId = user?.uid;

  // ✅ Aligned with profile.tsx / [username]/index.tsx's gradient — this
  // screen is reached from Profile and should read as the same surface.
  const gradientColors = isDark
    ? [colors.background, colors.background, colors.background]
    : (["#DCEBFF", "#EEF4FF", "#FFFFFF"] as const);

  const {
    data: rows,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ["my-following-with-status", myId],
    enabled: !!myId,
    queryFn: async () => {
      const snap = await firestore()
        .collection("follows")
        .where("follower_id", "==", myId!)
        .where("status", "in", ["accepted", "pending"])
        .get();

      const rows = await Promise.all(
        snap.docs.map(async (d) => {
          const data = d.data() as any;
          const pSnap = await firestore()
            .collection("profiles")
            .doc(data.following_id)
            .get();
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

  const followingIds = useMemo(
    () => (rows ?? []).map((r) => r.following_id).filter(Boolean),
    [rows],
  );

  const { data: theyFollowMeSet } = useQuery({
    queryKey: ["they-follow-me-set", myId, followingIds.join("|")],
    enabled: !!myId && followingIds.length > 0,
    queryFn: async () => {
      const set = new Set<string>();
      const chunks: string[][] = [];
      for (let i = 0; i < followingIds.length; i += 30) {
        chunks.push(followingIds.slice(i, i + 30));
      }
      for (const chunk of chunks) {
        const snap = await firestore()
          .collection("follows")
          .where("following_id", "==", myId!)
          .where("follower_id", "in", chunk)
          .where("status", "==", "accepted")
          .get();
        snap.docs.forEach((d) => set.add((d.data() as any).follower_id));
      }
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

  const unfollowMutation = useMutation({
    mutationFn: async (target: { id: string; username?: string }) => {
      if (!myId) throw new Error("Not signed in");
      const snap = await firestore()
        .collection("follows")
        .where("follower_id", "==", myId)
        .where("following_id", "==", target.id)
        .get();
      await Promise.all(snap.docs.map((d) => d.ref.delete()));
      return target;
    },
    onSuccess: (target) => {
      invalidateAfterUnfollow(qc, myId!, target.id, target.username);
    },
  });

  const blockUser = useMutation({
    mutationFn: async (target: { id: string; username?: string }) => {
      if (!myId) throw new Error("Not signed in");
      await firestore().collection("user_blocks").add({
        blocker_id: myId,
        blocked_id: target.id,
        created_at: firestore.FieldValue.serverTimestamp(),
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
      locations={[0, 0.42, 1]}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <AppHeader
          title={`Following${list.length > 0 ? ` (${list.length})` : ""}`}
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
                    {
                      backgroundColor: colors.surface,
                      width: 72 * uiScale,
                      height: 72 * uiScale,
                      borderRadius: 36 * uiScale,
                    },
                  ]}
                >
                  <Ionicons
                    name="person-add-outline"
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
                  Not following anyone yet
                </Text>
                <Text
                  style={[
                    styles.emptyDesc,
                    { color: colors.textTertiary, fontSize: 13 * fontScale },
                  ]}
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

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1, backgroundColor: "transparent" },

  listContent: { paddingBottom: 24 },
  listEmpty: { flex: 1 },

  skeletonRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
  },
  skeletonAvatar: {},
  skeletonLine: { height: 12, borderRadius: 6 },
  skeletonBtn: { borderRadius: 999 },

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
});
