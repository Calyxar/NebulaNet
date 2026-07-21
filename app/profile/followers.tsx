// app/profile/followers.tsx — REACT NATIVE FIREBASE ✅
// ✅ UI CONSISTENCY PASS: aligned this screen with the rest of the
//    NebulaNet 2.0 redesign, which it had drifted from:
//    - Gradient background now matches profile.tsx / [username]/index.tsx
//      (blue tint) instead of its own purple variant — this is a sub-screen
//      of Profile and should read as the same surface.
//    - uiScale/fontScale now threaded through row/avatar/button sizing,
//      same pattern as home.tsx, so it respects the user's system text-size
//      setting like the rest of the app now does.
//    - Card radius bumped from 16 to 18 to match the radius used elsewhere
//      in the redesign (18–22).
import AppHeader from "@/components/navigation/AppHeader";
import UserActionsSheet, {
  type UserActionsSheetRef,
} from "@/components/UserActionsSheet";
import UserRow, { type UserRowModel } from "@/components/UserRow";
import { useAuth } from "@/hooks/useAuth";
import { useFollowActions, useFollowStatus } from "@/hooks/useFollowActions";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import firestore from "@react-native-firebase/firestore";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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
    </View>
  );
}

function FollowerRowItem({
  item,
  isMutual,
  onPress,
  onMenu,
  colors,
  uiScale,
  fontScale,
}: {
  item: UserRowModel;
  isMutual: boolean;
  onPress: () => void;
  onMenu: () => void;
  colors: any;
  uiScale: number;
  fontScale: number;
}) {
  const { follow, unfollow, isFollowingBusy } = useFollowActions(
    item.id,
    item.isPrivate,
  );

  const { data: followStatus } = useFollowStatus(item.id);

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
        {
          paddingHorizontal: 13 * uiScale,
          paddingVertical: 8 * uiScale,
          minWidth: 92 * uiScale,
        },
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
            {
              color: isFollowing || isPending ? colors.text : "#fff",
              fontSize: 12 * fontScale,
            },
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

export default function FollowersScreen() {
  const { user } = useAuth();
  const { colors, isDark, uiScale, fontScale } = useTheme();
  const qc = useQueryClient();

  const sheetRef = useRef<UserActionsSheetRef>(null);
  const [selected, setSelected] = useState<UserRowModel | null>(null);

  const myId = user?.uid;

  // ✅ Aligned with profile.tsx / [username]/index.tsx's gradient — this
  // screen is reached from Profile and should read as the same surface
  // instead of its own purple-tinted variant.
  const gradientColors = isDark
    ? [colors.background, colors.background, colors.background]
    : (["#DCEBFF", "#EEF4FF", "#FFFFFF"] as const);

  const {
    data: rows,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ["my-followers-with-status", myId],
    enabled: !!myId,
    queryFn: async () => {
      const snap = await firestore()
        .collection("follows")
        .where("following_id", "==", myId!)
        .where("status", "in", ["accepted", "pending"])
        .get();

      const rows = await Promise.all(
        snap.docs.map(async (d) => {
          const data = d.data() as any;
          const pSnap = await firestore()
            .collection("profiles")
            .doc(data.follower_id)
            .get();
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

  const followerIds = useMemo(
    () => (rows ?? []).map((r) => r.follower_id).filter(Boolean),
    [rows],
  );

  const { data: iFollowBackSet } = useQuery({
    queryKey: ["i-follow-back-set", myId, followerIds.join(",")],
    enabled: !!myId && followerIds.length > 0,
    queryFn: async () => {
      // Firestore "in" queries are limited to 30 values — chunk just in case
      const set = new Set<string>();
      const chunks: string[][] = [];
      for (let i = 0; i < followerIds.length; i += 30) {
        chunks.push(followerIds.slice(i, i + 30));
      }
      for (const chunk of chunks) {
        const snap = await firestore()
          .collection("follows")
          .where("follower_id", "==", myId!)
          .where("following_id", "in", chunk)
          .where("status", "==", "accepted")
          .get();
        snap.docs.forEach((d) => set.add((d.data() as any).following_id));
      }
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
      const snap = await firestore()
        .collection("follows")
        .where("follower_id", "==", targetUserId)
        .where("following_id", "==", myId)
        .get();
      await Promise.all(snap.docs.map((d) => d.ref.delete()));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-followers-with-status", myId] });
    },
  });

  const blockUser = useMutation({
    mutationFn: async (targetUserId: string) => {
      if (!myId) throw new Error("Not signed in");
      await firestore().collection("user_blocks").add({
        blocker_id: myId,
        blocked_id: targetUserId,
        created_at: firestore.FieldValue.serverTimestamp(),
      });
      const [s1, s2] = await Promise.all([
        firestore()
          .collection("follows")
          .where("follower_id", "==", myId)
          .where("following_id", "==", targetUserId)
          .get(),
        firestore()
          .collection("follows")
          .where("follower_id", "==", targetUserId)
          .where("following_id", "==", myId)
          .get(),
      ]);
      await Promise.all([...s1.docs, ...s2.docs].map((d) => d.ref.delete()));
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
      locations={[0, 0.42, 1]}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <AppHeader
          title={`Followers${list.length > 0 ? ` (${list.length})` : ""}`}
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
              <FollowerRowItem
                item={item}
                isMutual={!!item.isMutual}
                onPress={() => router.push(`/user/${item.username}`)}
                onMenu={() => openMenu(item)}
                colors={colors}
                uiScale={uiScale}
                fontScale={fontScale}
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
                    name="people-outline"
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
                  No followers yet
                </Text>
                <Text
                  style={[
                    styles.emptyDesc,
                    { color: colors.textTertiary, fontSize: 13 * fontScale },
                  ]}
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

  followBtn: {
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  followBtnText: { fontWeight: "800" },

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
