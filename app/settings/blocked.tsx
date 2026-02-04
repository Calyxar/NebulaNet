// app/settings/blocked.tsx
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface BlockedUser {
  id: string;
  blocked_id: string;
  created_at: string;
  profile: {
    username: string;
    full_name?: string;
    avatar_url?: string;
  };
}

interface MutedUser {
  id: string;
  muted_id: string;
  created_at: string;
  profile: {
    username: string;
    full_name?: string;
    avatar_url?: string;
  };
}

const ACCENT = "#7C3AED";
const BG = "#E8EAF6";
const CARD = "#FFFFFF";
const TEXT = "#111827";
const SUB = "#6B7280";
const MUTED = "#9CA3AF";
const BORDER = "#EEF2FF";

export default function BlockedAccountsScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"blocked" | "muted">("blocked");

  const { data: blockedUsers = [], isLoading: isLoadingBlocked } = useQuery({
    queryKey: ["blocked-users", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("blocked_users")
        .select(
          `
          id,
          blocked_id,
          created_at,
          profiles!blocked_users_blocked_id_fkey (
            username,
            full_name,
            avatar_url
          )
        `,
        )
        .eq("blocker_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map((item: any) => ({
        id: item.id,
        blocked_id: item.blocked_id,
        created_at: item.created_at,
        profile: item.profiles?.[0] || { username: "Unknown" },
      })) as BlockedUser[];
    },
    enabled: !!user,
  });

  const { data: mutedUsers = [], isLoading: isLoadingMuted } = useQuery({
    queryKey: ["muted-users", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("muted_users")
        .select(
          `
          id,
          muted_id,
          created_at,
          profiles!muted_users_muted_id_fkey (
            username,
            full_name,
            avatar_url
          )
        `,
        )
        .eq("muter_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map((item: any) => ({
        id: item.id,
        muted_id: item.muted_id,
        created_at: item.created_at,
        profile: item.profiles?.[0] || { username: "Unknown" },
      })) as MutedUser[];
    },
    enabled: !!user,
  });

  const unblockUser = useMutation({
    mutationFn: async (blockedUserId: string) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("blocked_users")
        .delete()
        .eq("blocker_id", user.id)
        .eq("blocked_id", blockedUserId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blocked-users", user?.id] });
    },
  });

  const unmuteUser = useMutation({
    mutationFn: async (mutedUserId: string) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("muted_users")
        .delete()
        .eq("muter_id", user.id)
        .eq("muted_id", mutedUserId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["muted-users", user?.id] });
    },
  });

  const tabCounts = useMemo(
    () => ({
      blocked: blockedUsers.length,
      muted: mutedUsers.length,
    }),
    [blockedUsers.length, mutedUsers.length],
  );

  const renderUserRow = (
    item: BlockedUser | MutedUser,
    mode: "blocked" | "muted",
  ) => {
    const displayName = item.profile.full_name || item.profile.username;
    const handle = item.profile.username;

    const dateLabel =
      mode === "blocked"
        ? `Blocked • ${new Date(item.created_at).toLocaleDateString()}`
        : `Muted • ${new Date(item.created_at).toLocaleDateString()}`;

    const actionLabel = mode === "blocked" ? "Unblock" : "Unmute";
    const actionPending =
      mode === "blocked" ? unblockUser.isPending : unmuteUser.isPending;

    const action = () => {
      if (mode === "blocked") {
        Alert.alert(
          "Unblock User",
          `Unblock @${handle}? They’ll be able to see your profile and interact again.`,
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Unblock",
              style: "destructive",
              onPress: () =>
                unblockUser.mutate((item as BlockedUser).blocked_id),
            },
          ],
        );
      } else {
        Alert.alert(
          "Unmute User",
          `Unmute @${handle}? You’ll see their content again.`,
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Unmute",
              onPress: () => unmuteUser.mutate((item as MutedUser).muted_id),
            },
          ],
        );
      }
    };

    return (
      <View style={styles.userCard}>
        <View style={styles.avatar}>
          <Ionicons
            name={mode === "blocked" ? "ban-outline" : "volume-mute-outline"}
            size={18}
            color={ACCENT}
          />
        </View>

        <View style={styles.userInfo}>
          <Text style={styles.userName} numberOfLines={1}>
            {displayName}
          </Text>
          <Text style={styles.userHandle} numberOfLines={1}>
            @{handle}
          </Text>
          <Text style={styles.userMeta}>{dateLabel}</Text>
        </View>

        <TouchableOpacity
          style={[
            styles.actionBtn,
            mode === "blocked" ? styles.actionDanger : styles.actionPrimary,
          ]}
          onPress={action}
          disabled={actionPending}
          activeOpacity={0.85}
        >
          {actionPending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.actionText}>{actionLabel}</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const Empty = ({ mode }: { mode: "blocked" | "muted" }) => (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyIcon}>
        <Ionicons
          name={mode === "blocked" ? "ban-outline" : "volume-mute-outline"}
          size={30}
          color={ACCENT}
        />
      </View>
      <Text style={styles.emptyTitle}>
        {mode === "blocked" ? "No blocked users" : "No muted users"}
      </Text>
      <Text style={styles.emptySub}>
        {mode === "blocked"
          ? "People you block can’t see your profile or interact with you."
          : "People you mute can still see you — you just won’t see their content."}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Blocked & Muted</Text>
          <Text style={styles.subtitle}>
            Control who you see and who can interact with you.
          </Text>

          {/* Tabs */}
          <View style={styles.tabPill}>
            <TouchableOpacity
              style={[styles.tab, activeTab === "blocked" && styles.tabActive]}
              onPress={() => setActiveTab("blocked")}
              activeOpacity={0.85}
            >
              <Ionicons
                name="ban-outline"
                size={16}
                color={activeTab === "blocked" ? "#FFFFFF" : SUB}
              />
              <Text
                style={[
                  styles.tabText,
                  activeTab === "blocked" && styles.tabTextActive,
                ]}
              >
                Blocked {tabCounts.blocked ? `(${tabCounts.blocked})` : ""}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === "muted" && styles.tabActive]}
              onPress={() => setActiveTab("muted")}
              activeOpacity={0.85}
            >
              <Ionicons
                name="volume-mute-outline"
                size={16}
                color={activeTab === "muted" ? "#FFFFFF" : SUB}
              />
              <Text
                style={[
                  styles.tabText,
                  activeTab === "muted" && styles.tabTextActive,
                ]}
              >
                Muted {tabCounts.muted ? `(${tabCounts.muted})` : ""}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* List */}
        {activeTab === "blocked" ? (
          <FlatList
            data={blockedUsers}
            keyExtractor={(i) => i.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => renderUserRow(item, "blocked")}
            refreshing={isLoadingBlocked}
            ListEmptyComponent={<Empty mode="blocked" />}
          />
        ) : (
          <FlatList
            data={mutedUsers}
            keyExtractor={(i) => i.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => renderUserRow(item, "muted")}
            refreshing={isLoadingMuted}
            ListEmptyComponent={<Empty mode="muted" />}
          />
        )}

        {/* Info */}
        <View style={styles.infoCard}>
          <Ionicons
            name="information-circle-outline"
            size={20}
            color={ACCENT}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>Quick difference</Text>
            <Text style={styles.infoText}>
              <Text style={styles.bold}>Blocked</Text>: they can’t see or
              interact with you.{"\n"}
              <Text style={styles.bold}>Muted</Text>: they can see you, but you
              won’t see their posts/comments.
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  container: { flex: 1 },

  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10 },
  title: { fontSize: 20, fontWeight: "800", color: TEXT },
  subtitle: { fontSize: 12, color: SUB, marginTop: 6, lineHeight: 18 },

  tabPill: {
    marginTop: 12,
    backgroundColor: CARD,
    borderRadius: 999,
    padding: 4,
    flexDirection: "row",
    gap: 6,
  },
  tab: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 10,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  tabActive: { backgroundColor: ACCENT },
  tabText: { fontSize: 13, fontWeight: "700", color: SUB },
  tabTextActive: { color: "#FFFFFF" },

  list: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 16, gap: 10 },

  userCard: {
    backgroundColor: CARD,
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F7F5FF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: BORDER,
  },
  userInfo: { flex: 1 },
  userName: { fontSize: 14, fontWeight: "800", color: TEXT },
  userHandle: { fontSize: 12, color: SUB, marginTop: 2 },
  userMeta: { fontSize: 11, color: MUTED, marginTop: 6 },

  actionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    minWidth: 88,
    alignItems: "center",
    justifyContent: "center",
  },
  actionPrimary: { backgroundColor: ACCENT },
  actionDanger: { backgroundColor: "#EF4444" },
  actionText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },

  emptyWrap: {
    marginTop: 30,
    backgroundColor: CARD,
    borderRadius: 18,
    padding: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: BORDER,
  },
  emptyIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#F7F5FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  emptyTitle: { fontSize: 14, fontWeight: "900", color: TEXT },
  emptySub: {
    fontSize: 12,
    color: SUB,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },

  infoCard: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: CARD,
    margin: 16,
    marginTop: 0,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
  },
  infoTitle: { fontSize: 13, fontWeight: "900", color: TEXT, marginBottom: 2 },
  infoText: { fontSize: 12, color: SUB, lineHeight: 18 },
  bold: { fontWeight: "900", color: TEXT },
});
