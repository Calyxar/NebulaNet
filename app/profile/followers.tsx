// app/profile/followers.tsx
import { useAuth } from "@/hooks/useAuth";
import { useMyPrivacySettings } from "@/hooks/useMyPrivacySettings";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import React from "react";
import {
    ActivityIndicator,
    FlatList,
    Image,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type FollowerRow = {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
};

export default function FollowersScreen() {
  const { user, profile } = useAuth();

  const {
    data: privacy,
    isLoading: privacyLoading,
    refetch: refetchPrivacy,
  } = useMyPrivacySettings();

  const {
    data: followers,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ["my-followers", user?.id],
    enabled: !!user?.id && !!privacy && !privacy.hide_followers,
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("follows")
        .select(
          `
          follower:profiles!follows_follower_id_fkey (
            id,
            username,
            full_name,
            avatar_url
          )
        `,
        )
        .eq("following_id", user.id)
        .eq("status", "accepted");

      if (error) throw error;

      const mapped =
        data?.map((row: any) => row.follower).filter(Boolean) ?? [];

      return mapped as FollowerRow[];
    },
  });

  if (!user || !profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#7C3AED" />
        </View>
      </SafeAreaView>
    );
  }

  if (privacyLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#7C3AED" />
          <Text style={styles.subtleText}>Loading…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (privacy?.hide_followers) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Followers" />

        <View style={styles.lockWrap}>
          <View style={styles.lockIcon}>
            <Ionicons name="lock-closed-outline" size={22} color="#7C3AED" />
          </View>

          <Text style={styles.lockTitle}>Followers list is hidden</Text>
          <Text style={styles.lockDesc}>
            You turned this off in Privacy settings. Turn it on to view your
            followers list.
          </Text>

          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.primaryBtn}
            onPress={() => router.push("/settings/privacy")}
          >
            <Ionicons name="settings-outline" size={18} color="#fff" />
            <Text style={styles.primaryBtnText}>Open Privacy Settings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.secondaryBtn}
            onPress={async () => {
              await refetchPrivacy();
            }}
          >
            <Ionicons name="refresh-outline" size={18} color="#111827" />
            <Text style={styles.secondaryBtnText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const renderItem = ({ item }: { item: FollowerRow }) => {
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
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#7C3AED" />
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
              <Text style={styles.emptyTitle}>No followers yet</Text>
              <Text style={styles.emptyDesc}>
                When people follow you, they’ll show up here.
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#E8EAF6" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

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
    marginBottom: 16,
  },

  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#7C3AED",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
  },
  primaryBtnText: { color: "#fff", fontWeight: "900" },

  secondaryBtn: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EEF2FF",
  },
  secondaryBtnText: { color: "#111827", fontWeight: "900" },

  subtleText: { marginTop: 10, color: "#6B7280", fontWeight: "800" },
});
