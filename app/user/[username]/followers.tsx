// app/[username]/followers.tsx
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
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

function Header({ title }: { title: string }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.headerBtn}
        onPress={() => router.back()}
        activeOpacity={0.85}
      >
        <Ionicons name="arrow-back" size={22} color="#111827" />
      </TouchableOpacity>

      <Text style={styles.headerTitle}>{title}</Text>

      <View style={styles.headerBtn} />
    </View>
  );
}

export default function UserFollowersScreen() {
  const { username: raw } = useLocalSearchParams<{ username: string }>();
  const username = raw?.replace("@", "") ?? "";
  const { user } = useAuth();

  const { data: target, isLoading: loadingProfile } = useQuery({
    queryKey: ["user-profile-lite", username],
    enabled: !!username,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,username,full_name,avatar_url,is_private")
        .eq("username", username)
        .maybeSingle();
      if (error) throw error;
      return (data as UserProfile | null) ?? null;
    },
  });

  const isMe = useMemo(() => {
    return !!target?.id && target.id === user?.id;
  }, [target?.id, user?.id]);

  const { data: edge } = useQuery({
    queryKey: ["follow-edge", user?.id, target?.id],
    enabled: !!user?.id && !!target?.id && !isMe,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("follows")
        .select("follower_id,following_id,status")
        .eq("follower_id", user!.id)
        .eq("following_id", target!.id)
        .maybeSingle();
      if (error) throw error;
      return (data as FollowEdge | null) ?? null;
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
    data: followers,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ["user-followers", target?.id],
    enabled: !!target?.id && canViewProfile,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_user_followers", {
        target_id: target!.id,
      });
      if (error) throw error;
      return (data as UserRow[]) ?? [];
    },
  });

  if (loadingProfile) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Followers" />
        <View style={{ padding: 16, gap: 10 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <View key={i} style={styles.row}>
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
              <Skeleton style={{ width: 18, height: 18, borderRadius: 6 }} />
            </View>
          ))}
        </View>
      </SafeAreaView>
    );
  }

  if (!target) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Followers" />
        <View style={styles.empty}>
          <Ionicons name="person-outline" size={56} color="#C5CAE9" />
          <Text style={styles.emptyTitle}>User not found</Text>
          <Text style={styles.emptyDesc}>This user doesn’t exist.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!canViewProfile) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Followers" />
        <View style={styles.lockWrap}>
          <View style={styles.lockIcon}>
            <Ionicons name="lock-closed-outline" size={22} color="#7C3AED" />
          </View>
          <Text style={styles.lockTitle}>Private account</Text>
          <Text style={styles.lockDesc}>
            Follow @{target.username} to view their followers.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // If user hid followers, RPC returns empty list (unless owner).
  const isHiddenByOwner = !isMe && (followers?.length ?? 0) === 0 && !isLoading;

  const renderItem = ({ item }: { item: UserRow }) => {
    const display = item.full_name || item.username;

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        style={styles.row}
        onPress={() => router.push(`/user/${item.username}`)}
      >
        {item.avatar_url ? (
          <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarFallbackText}>
              {(item.username?.[0] || "U").toUpperCase()}
            </Text>
          </View>
        )}

        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={1}>
            {display}
          </Text>
          <Text style={styles.handle} numberOfLines={1}>
            @{item.username}
          </Text>
        </View>

        <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Followers" />

      {isLoading ? (
        <View style={{ padding: 16, gap: 10 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <View key={i} style={styles.row}>
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
              <Skeleton style={{ width: 18, height: 18, borderRadius: 6 }} />
            </View>
          ))}
        </View>
      ) : isHiddenByOwner ? (
        <View style={styles.lockWrap}>
          <View style={styles.lockIcon}>
            <Ionicons name="lock-closed-outline" size={22} color="#7C3AED" />
          </View>
          <Text style={styles.lockTitle}>Followers list is hidden</Text>
          <Text style={styles.lockDesc}>
            @{target.username} has hidden their followers list.
          </Text>
        </View>
      ) : (
        <FlatList
          data={followers ?? []}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor="#7C3AED"
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={56} color="#C5CAE9" />
              <Text style={styles.emptyTitle}>No followers</Text>
              <Text style={styles.emptyDesc}>
                When people follow @{target.username}, they’ll show up here.
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
  headerTitle: { fontSize: 16, fontWeight: "800", color: "#111827" },

  row: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#EEF2FF",
  },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#7C3AED",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarFallbackText: { color: "#fff", fontWeight: "900", fontSize: 16 },

  name: { fontSize: 14, fontWeight: "900", color: "#111827" },
  handle: { fontSize: 12, fontWeight: "800", color: "#6B7280", marginTop: 2 },

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
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 2,
    marginBottom: 14,
  },
  lockTitle: { fontSize: 18, fontWeight: "900", color: "#111827" },
  lockDesc: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 18,
  },

  skel: { backgroundColor: "#E5E7EB" },
});
