// components/CommunityRow.tsx ✅ FIXED — shared join-state source of truth
// ✅ FIXED: previously, isJoined lived in a per-instance useState, scoped
// to whichever specific CommunityRow got tapped. If the same community
// appeared in two places at once (e.g. "Communities you might like" AND
// search results), only the tapped instance's button flipped — the other
// instance stayed stale until its own query happened to refetch, which
// isn't guaranteed to happen immediately just because invalidateQueries
// fired elsewhere. Now every CommunityRow instance derives isJoined from
// the SAME shared cache (myCommunityIds, from useCommunities() — the hook
// already used for the community picker/switcher elsewhere in the app),
// so the moment one instance's mutation settles and that cache updates,
// every other instance of every row referencing that community re-renders
// with the new state simultaneously. Matches how a follow button stays
// in sync across multiple simultaneous views of the same account.

import { useCommunities } from "@/hooks/useCommunities";
import type { SearchCommunity } from "@/hooks/useSearch";
import { auth, db } from "@/lib/firebase";
import { Ionicons } from "@expo/vector-icons";
import firestore from "@react-native-firebase/firestore";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

async function joinCommunityInline(communityId: string) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");

  const existing = await db
    .collection("community_members")
    .where("community_id", "==", communityId)
    .where("user_id", "==", user.uid)
    .limit(1)
    .get();
  if (!existing.empty) return;

  const batch = db.batch();
  const memberRef = db.collection("community_members").doc();
  batch.set(memberRef, {
    user_id: user.uid,
    community_id: communityId,
    role: "member",
    created_at: firestore.FieldValue.serverTimestamp(),
  });
  const communityRef = db.collection("communities").doc(communityId);
  batch.update(communityRef, {
    member_count: firestore.FieldValue.increment(1),
    updated_at: firestore.FieldValue.serverTimestamp(),
  });
  await batch.commit();
}

async function leaveCommunityInline(communityId: string) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");

  const snap = await db
    .collection("community_members")
    .where("community_id", "==", communityId)
    .where("user_id", "==", user.uid)
    .limit(1)
    .get();
  if (snap.empty) return;

  const batch = db.batch();
  batch.delete(snap.docs[0].ref);
  const communityRef = db.collection("communities").doc(communityId);
  batch.update(communityRef, {
    member_count: firestore.FieldValue.increment(-1),
    updated_at: firestore.FieldValue.serverTimestamp(),
  });
  await batch.commit();
}

export function useToggleCommunityJoin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { communityId: string; isJoined: boolean }) =>
      vars.isJoined
        ? leaveCommunityInline(vars.communityId)
        : joinCommunityInline(vars.communityId),
    // ✅ NEW: optimistically update the SHARED my-communities cache
    // directly, instead of only flipping local component state. This is
    // what makes every CommunityRow instance — anywhere in the app —
    // update in lockstep the moment one of them is tapped.
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: ["my-communities"] });
      const previous = qc.getQueryData<any[]>(["my-communities"]);
      if (previous) {
        if (vars.isJoined) {
          // leaving — remove from the cached list
          qc.setQueryData(
            ["my-communities"],
            previous.filter((c) => c.id !== vars.communityId),
          );
        } else {
          // joining — add a minimal placeholder entry; the next real
          // refetch (triggered below) fills in full details
          qc.setQueryData(
            ["my-communities"],
            [...previous, { id: vars.communityId }],
          );
        }
      }
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(["my-communities"], ctx.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["my-communities"] });
      qc.invalidateQueries({ queryKey: ["suggested-communities"] });
      qc.invalidateQueries({ queryKey: ["search"] });
    },
  });
}

export function CommunityRow({
  community: c,
  idx,
  colors,
}: {
  community: SearchCommunity;
  idx: number;
  colors: any;
}) {
  // ✅ FIXED: derives from the shared cache instead of local state — see
  // header comment for why this is the actual fix, not just a refactor.
  const { myCommunityIds } = useCommunities();
  const isJoined = myCommunityIds.includes(c.id);
  const toggleJoin = useToggleCommunityJoin();

  const handleJoinPress = () => {
    toggleJoin.mutate({ communityId: c.id, isJoined });
  };

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={[
        styles.row,
        idx !== 0 && [styles.rowBorder, { borderTopColor: colors.border }],
      ]}
      onPress={() => router.push(`/community/${c.slug}`)}
    >
      {c.image_url ? (
        <Image
          source={{ uri: c.image_url }}
          style={[styles.communityAvatar, { backgroundColor: colors.surface }]}
        />
      ) : (
        <View
          style={[styles.communityBadge, { backgroundColor: colors.surface }]}
        >
          <Ionicons name="people" size={18} color={colors.primary} />
        </View>
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={[styles.rowTitle, { color: colors.text }]}
          numberOfLines={1}
        >
          {c.name}
        </Text>
        <Text
          style={[styles.rowSubtitle, { color: colors.textTertiary }]}
          numberOfLines={1}
        >
          {c.member_count
            ? `${c.member_count.toLocaleString()} members`
            : (c.description ?? "")}
        </Text>
      </View>

      <TouchableOpacity
        style={[
          styles.followBtn,
          {
            backgroundColor: isJoined ? colors.surface : colors.primary,
            borderColor: isJoined ? colors.border : colors.primary,
            opacity: toggleJoin.isPending ? 0.6 : 1,
          },
        ]}
        onPress={handleJoinPress}
        disabled={toggleJoin.isPending}
        activeOpacity={0.85}
      >
        {toggleJoin.isPending ? (
          <ActivityIndicator
            size={12}
            color={isJoined ? colors.text : "#fff"}
          />
        ) : (
          <Text
            style={[
              styles.followBtnText,
              { color: isJoined ? colors.text : "#fff" },
            ]}
          >
            {isJoined ? "Joined" : "Join"}
          </Text>
        )}
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  rowBorder: { borderTopWidth: 1 },
  rowTitle: { fontSize: 14.5, fontWeight: "900" },
  rowSubtitle: { marginTop: 2, fontSize: 12.5, fontWeight: "700" },
  communityBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  communityAvatar: { width: 42, height: 42, borderRadius: 21 },
  followBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    minWidth: 88,
    alignItems: "center",
    justifyContent: "center",
  },
  followBtnText: { fontSize: 13, fontWeight: "900" },
});
