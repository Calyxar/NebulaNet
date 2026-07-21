// app/profile/blocked.tsx — COMPLETED + UPDATED
// ✅ FIXED: same two bugs found in requests.tsx —
//    (1) was using the legacy Web SDK (`db` from @/lib/firebase) for every
//        Firestore call instead of the native `firestore()` used
//        everywhere else in this project. Now uses firestore() throughout.
//    (2) `myId` read `user?.id` (not a field on a Firebase Auth user —
//        the field is `uid`), so myId was always undefined and the
//        "Sign in to view blocked users" empty state showed even when
//        signed in, or the query silently never ran. Now reads `user?.uid`.
// ✅ REDESIGNED: this screen had no connection to the shared design system
//    at all — every color was a hardcoded hex value, no useTheme(), no
//    gradient background, and its own local Header component instead of
//    the shared AppHeader used by followers.tsx / following.tsx /
//    requests.tsx. Brought onto the same pattern: useTheme() colors,
//    the shared blue gradient, AppHeader, and uiScale/fontScale threaded
//    through row/avatar/button sizing, matching the rest of the Profile
//    screen group.

import { Ionicons } from "@expo/vector-icons";
import firestore from "@react-native-firebase/firestore";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import AppHeader from "@/components/navigation/AppHeader";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/providers/ThemeProvider";

import UserActionsSheet, {
  type UserActionsSheetRef,
} from "@/components/UserActionsSheet";
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

function SkeletonRow({ colors, uiScale }: { colors: any; uiScale: number }) {
  return (
    <View
      style={[
        styles.skelRow,
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
            { width: 180, height: 12, backgroundColor: colors.surface },
          ]}
        />
        <View
          style={[
            styles.skel,
            { width: 120, height: 10, backgroundColor: colors.surface },
          ]}
        />
      </View>
      <View
        style={[
          styles.skel,
          {
            width: 34 * uiScale,
            height: 34 * uiScale,
            borderRadius: 12 * uiScale,
            backgroundColor: colors.surface,
          },
        ]}
      />
    </View>
  );
}

export default function BlockedUsersScreen() {
  const { user } = useAuth();
  const { colors, isDark, uiScale, fontScale } = useTheme();
  const qc = useQueryClient();
  // ✅ FIX: was `user?.id` — doesn't exist on a Firebase Auth user object.
  const myId = user?.uid;

  const sheetRef = useRef<UserActionsSheetRef>(null);
  const [selected, setSelected] = useState<UserRowModel | null>(null);

  // ✅ Aligned with the rest of the Profile screen group.
  const gradientColors = isDark
    ? [colors.background, colors.background, colors.background]
    : (["#DCEBFF", "#EEF4FF", "#FFFFFF"] as const);

  const {
    data: rows,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ["my-blocks", myId],
    enabled: !!myId,
    queryFn: async () => {
      // ✅ FIX: was db.collection(...) (legacy Web SDK) — now firestore()
      // (native SDK), matching the rest of the app.
      const snap = await firestore()
        .collection("user_blocks")
        .where("blocker_id", "==", myId!)
        .get();
      const rows = await Promise.all(
        snap.docs.map(async (d) => {
          const data = d.data() as any;
          const pSnap = await firestore()
            .collection("profiles")
            .doc(data.blocked_id)
            .get();
          const p = pSnap.exists() ? (pSnap.data() as any) : null;
          return {
            id: d.id,
            blocker_id: data.blocker_id,
            blocked_id: data.blocked_id,
            created_at: data.created_at ?? "",
            blocked: p
              ? [
                  {
                    id: pSnap.id,
                    username: p.username,
                    full_name: p.full_name ?? null,
                    avatar_url: p.avatar_url ?? null,
                    is_private: p.is_private ?? false,
                  },
                ]
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
      const snap = await firestore()
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
      qc.setQueryData<BlockedJoinRow[]>(
        key,
        prev.filter((r) => r.blocked_id !== targetUserId),
      );
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
      <LinearGradient
        colors={gradientColors as any}
        locations={[0, 0.42, 1]}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
          <AppHeader title="Blocked" backgroundColor="transparent" />
          <View style={styles.center}>
            <Text style={[styles.subtle, { color: colors.textTertiary }]}>
              Sign in to view blocked users.
            </Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={gradientColors as any}
      locations={[0, 0.42, 1]}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <AppHeader
          title={`Blocked${list.length > 0 ? ` (${list.length})` : ""}`}
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
            contentContainerStyle={{
              paddingHorizontal: 16 * uiScale,
              paddingTop: 12 * uiScale,
              paddingBottom: 20,
            }}
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
                <Ionicons
                  name="ban-outline"
                  size={56}
                  color={colors.textTertiary}
                />
                <Text
                  style={[
                    styles.emptyTitle,
                    { color: colors.text, fontSize: 18 * fontScale },
                  ]}
                >
                  No blocked users
                </Text>
                <Text
                  style={[
                    styles.emptyDesc,
                    { color: colors.textTertiary, fontSize: 13 * fontScale },
                  ]}
                >
                  People you block will appear here. You can unblock them
                  anytime.
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
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1, backgroundColor: "transparent" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  subtle: { fontWeight: "800" },
  empty: {
    paddingTop: 80,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emptyTitle: { marginTop: 12, fontWeight: "900" },
  emptyDesc: {
    marginTop: 6,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 18,
  },
  skel: { borderRadius: 10 },
  skelRow: { flexDirection: "row", alignItems: "center", borderWidth: 1 },
  skelAvatar: {},
});
