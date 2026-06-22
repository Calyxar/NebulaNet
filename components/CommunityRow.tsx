// ✅ FIXED: Join button now actually joins inline (was just navigating to
// the community page and doing nothing). Optimistic update flips the
// button instantly; reverts on failure. Row tap still navigates;
// the button itself no longer does.

import type { SearchCommunity } from "@/hooks/useSearch";
import { auth, db } from "@/lib/firebase";
import { Ionicons } from "@expo/vector-icons";
import firestore from "@react-native-firebase/firestore";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import React, { useState } from "react";
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
    onSettled: () => {
      // Keep any other screens (community detail, my-communities list)
      // honest too, since we just wrote directly to Firestore here.
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
  // ✅ Local optimistic state — flips instantly on tap, independent of
  // whatever query this row's data originally came from (search results,
  // suggestions, etc. aren't re-fetched just because one row changed).
  const [optimisticJoined, setOptimisticJoined] = useState<boolean | null>(
    null,
  );
  const isJoined = optimisticJoined ?? !!c.is_joined;
  const toggleJoin = useToggleCommunityJoin();

  const handleJoinPress = () => {
    const prev = isJoined;
    setOptimisticJoined(!prev);
    toggleJoin.mutate(
      { communityId: c.id, isJoined: prev },
      {
        onError: () => setOptimisticJoined(prev), // revert on failure
      },
    );
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

      {/* ✅ FIX: this button now joins/leaves directly instead of
          navigating. Stop propagation isn't needed since this
          TouchableOpacity is its own touch target, not nested in
          another pressable. */}
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
