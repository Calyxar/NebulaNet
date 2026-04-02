// app/user/[username]/following.tsx — FIXED ✅
// ✅ FIXED: user?.id → user?.uid (Firebase auth uses uid not id)

import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  where,
} from "firebase/firestore";
import React, { useMemo } from "react";
import {
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type UserProfile = {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  is_private: boolean | null;
};

type FollowEdge = {
  follower_id: string;
  following_id: string;
  status: "accepted" | "pending";
};

type UserRow = {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
};

function Skeleton({ style }: { style: any }) {
  return <View style={[styles.skel, style]} />;
}

export default function UserFollowingScreen() {
  const { username: raw } = useLocalSearchParams<{ username: string }>();
  const username = raw?.replace("@", "") ?? "";
  const { user } = useAuth();
  const { colors, isDark } = useTheme();

  const { data: target, isLoading: loadingProfile } = useQuery({
    queryKey: ["user-profile-lite", username],
    enabled: !!username,
    queryFn: async () => {
      const snap = await getDocs(
        query(
          collection(db, "profiles"),
          where("username", "==", username),
          limit(1),
        ),
      );
      if (snap.empty) return null;
      const d = snap.docs[0].data() as any;
      return {
        id: snap.docs[0].id,
        username: d.username,
        full_name: d.full_name ?? null,
        avatar_url: d.avatar_url ?? null,
        is_private: d.is_private ?? false,
      } as UserProfile;
    },
  });

  // ✅ FIXED: user?.uid not user?.id
  const isMe = useMemo(
    () => !!target?.id && target.id === user?.uid,
    [target?.id, user?.uid],
  );

  const { data: edge } = useQuery({
    queryKey: ["follow-edge", user?.uid, target?.id],
    enabled: !!user?.uid && !!target?.id && !isMe,
    queryFn: async () => {
      const snap = await getDocs(
        query(
          collection(db, "follows"),
          where("follower_id", "==", user!.uid),
          where("following_id", "==", target!.id),
        ),
      );
      if (snap.empty) return null;
      const d = snap.docs[0].data() as any;
      return {
        follower_id: d.follower_id,
        following_id: d.following_id,
        status: d.status,
      } as FollowEdge;
    },
  });

  const isFollowing = !!edge && edge.status === "accepted";

  const canViewProfile = useMemo(() => {
    if (!target?.id) return false;
    if (isMe) return true;
    if (!target.is_private) return true;
    return isFollowing;
  }, [target?.id, isMe, target?.is_private, isFollowing]);

  const {
    data: following,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ["user-following", target?.id],
    enabled: !!target?.id && canViewProfile,
    queryFn: async () => {
      const snap = await getDocs(
        query(
          collection(db, "follows"),
          where("follower_id", "==", target!.id),
          where("status", "==", "accepted"),
        ),
      );
      const profiles = await Promise.all(
        snap.docs.map(async (d) => {
          const followingId = (d.data() as any).following_id;
          const pSnap = await getDoc(doc(db, "profiles", followingId));
          if (!pSnap.exists()) return null;
          const pd = pSnap.data() as any;
          return {
            id: pSnap.id,
            username: pd.username ?? "",
            full_name: pd.full_name ?? null,
            avatar_url: pd.avatar_url ?? null,
          } as UserRow;
        }),
      );
      return profiles.filter(Boolean) as UserRow[];
    },
  });

  const bg = isDark ? colors.background : "#E8EAF6";
  const cardBg = isDark ? colors.card : "#FFFFFF";
  const textColor = isDark ? colors.text : "#111827";
  const subColor = isDark ? colors.textTertiary : "#6B7280";

  const Header = () => (
    <View style={[styles.header, { backgroundColor: bg }]}>
      <TouchableOpacity
        style={[styles.headerBtn, { backgroundColor: cardBg }]}
        onPress={() => router.back()}
        activeOpacity={0.85}
      >
        <Ionicons name="arrow-back" size={22} color={textColor} />
      </TouchableOpacity>
      <Text style={[styles.headerTitle, { color: textColor }]}>Following</Text>
      <View style={styles.headerBtn} />
    </View>
  );

  if (loadingProfile) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
        <Header />
        <View style={{ padding: 16, gap: 10 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <View key={i} style={[styles.row, { backgroundColor: cardBg }]}>
              <Skeleton style={{ width: 44, height: 44, borderRadius: 22 }} />
              <View style={{ flex: 1 }}>
                <Skeleton
                  style={{ height: 12, width: "55%", borderRadius: 10 }}
                />
                <Skeleton
                  style={{
                    height: 10,
                    width: "35%",
                    borderRadius: 10,
                    marginTop: 10,
                  }}
                />
              </View>
            </View>
          ))}
        </View>
      </SafeAreaView>
    );
  }

  if (!target) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
        <Header />
        <View style={styles.empty}>
          <Ionicons name="person-outline" size={56} color="#C5CAE9" />
          <Text style={[styles.emptyTitle, { color: textColor }]}>
            User not found
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!canViewProfile) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
        <Header />
        <View style={styles.lockWrap}>
          <View style={[styles.lockIcon, { backgroundColor: cardBg }]}>
            <Ionicons
              name="lock-closed-outline"
              size={22}
              color={colors.primary}
            />
          </View>
          <Text style={[styles.lockTitle, { color: textColor }]}>
            Private account
          </Text>
          <Text style={[styles.lockDesc, { color: subColor }]}>
            Follow @{target.username} to view who they follow.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderItem = ({ item }: { item: UserRow }) => (
    <TouchableOpacity
      activeOpacity={0.85}
      style={[
        styles.row,
        {
          backgroundColor: cardBg,
          borderColor: isDark ? colors.border : "#EEF2FF",
        },
      ]}
      onPress={() => router.push(`/user/${item.username}`)}
    >
      {item.avatar_url ? (
        <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
      ) : (
        <View
          style={[styles.avatarFallback, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.avatarFallbackText}>
            {(item.username?.[0] || "U").toUpperCase()}
          </Text>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={[styles.name, { color: textColor }]} numberOfLines={1}>
          {item.full_name || item.username}
        </Text>
        <Text style={[styles.handle, { color: subColor }]} numberOfLines={1}>
          @{item.username}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      <Header />
      {isLoading ? (
        <View style={{ padding: 16, gap: 10 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <View key={i} style={[styles.row, { backgroundColor: cardBg }]}>
              <Skeleton style={{ width: 44, height: 44, borderRadius: 22 }} />
              <View style={{ flex: 1 }}>
                <Skeleton
                  style={{ height: 12, width: "55%", borderRadius: 10 }}
                />
                <Skeleton
                  style={{
                    height: 10,
                    width: "35%",
                    borderRadius: 10,
                    marginTop: 10,
                  }}
                />
              </View>
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={following ?? []}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="person-add-outline" size={56} color="#C5CAE9" />
              <Text style={[styles.emptyTitle, { color: textColor }]}>
                Not following anyone
              </Text>
              <Text style={[styles.emptyDesc, { color: subColor }]}>
                When @{target.username} follows people, they'll show up here.
              </Text>
            </View>
          }
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 16, fontWeight: "800" },
  row: {
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
  },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarFallbackText: { color: "#fff", fontWeight: "900", fontSize: 16 },
  name: { fontSize: 14, fontWeight: "900" },
  handle: { fontSize: 12, fontWeight: "800", marginTop: 2 },
  empty: { paddingTop: 80, alignItems: "center", paddingHorizontal: 24 },
  emptyTitle: { marginTop: 12, fontSize: 18, fontWeight: "900" },
  emptyDesc: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 18,
  },
  lockWrap: {
    flex: 1,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  lockIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 2,
    marginBottom: 14,
  },
  lockTitle: { fontSize: 18, fontWeight: "900" },
  lockDesc: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 18,
  },
  skel: { backgroundColor: "#E5E7EB" },
});
