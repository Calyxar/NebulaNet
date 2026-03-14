// app/settings/blocked.tsx — UPDATED ✅ dark mode
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StatusBar,
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
  profile: { username: string; full_name?: string; avatar_url?: string };
}
interface MutedUser {
  id: string;
  muted_id: string;
  created_at: string;
  profile: { username: string; full_name?: string; avatar_url?: string };
}

export default function BlockedAccountsScreen() {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"blocked" | "muted">("blocked");

  const { data: blockedUsers = [], isLoading: isLoadingBlocked } = useQuery({
    queryKey: ["blocked-users", user?.uid],
    queryFn: async () => {
      if (!user) return [];
      const snap = await getDocs(
        query(
          collection(db, "user_blocks"),
          where("blocker_id", "==", user.uid),
        ),
      );
      return Promise.all(
        snap.docs.map(async (d) => {
          const data = d.data() as any;
          const pSnap = await getDoc(doc(db, "profiles", data.blocked_id));
          const p = pSnap.exists() ? (pSnap.data() as any) : null;
          return {
            id: d.id,
            blocked_id: data.blocked_id,
            created_at: data.created_at ?? "",
            profile: p
              ? {
                  username: p.username,
                  full_name: p.full_name ?? null,
                  avatar_url: p.avatar_url ?? null,
                }
              : { username: "Unknown" },
          };
        }),
      ) as Promise<BlockedUser[]>;
    },
    enabled: !!user?.uid,
  });

  const { data: mutedUsers = [], isLoading: isLoadingMuted } = useQuery({
    queryKey: ["muted-users", user?.uid],
    queryFn: async () => {
      if (!user) return [];
      const snap = await getDocs(
        query(collection(db, "muted_users"), where("muter_id", "==", user.uid)),
      );
      return Promise.all(
        snap.docs.map(async (d) => {
          const data = d.data() as any;
          const pSnap = await getDoc(doc(db, "profiles", data.muted_id));
          const p = pSnap.exists() ? (pSnap.data() as any) : null;
          return {
            id: d.id,
            muted_id: data.muted_id,
            created_at: data.created_at ?? "",
            profile: p
              ? {
                  username: p.username,
                  full_name: p.full_name ?? null,
                  avatar_url: p.avatar_url ?? null,
                }
              : { username: "Unknown" },
          };
        }),
      ) as Promise<MutedUser[]>;
    },
    enabled: !!user?.uid,
  });

  const unblockUser = useMutation({
    mutationFn: async (blockedUserId: string) => {
      if (!user) throw new Error("Not authenticated");
      const snap = await getDocs(
        query(
          collection(db, "user_blocks"),
          where("blocker_id", "==", user.uid),
          where("blocked_id", "==", blockedUserId),
        ),
      );
      await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["blocked-users", user?.uid] }),
  });

  const unmuteUser = useMutation({
    mutationFn: async (mutedUserId: string) => {
      if (!user) throw new Error("Not authenticated");
      const snap = await getDocs(
        query(
          collection(db, "muted_users"),
          where("muter_id", "==", user.uid),
          where("muted_id", "==", mutedUserId),
        ),
      );
      await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["muted-users", user?.uid] }),
  });

  const tabCounts = useMemo(
    () => ({ blocked: blockedUsers.length, muted: mutedUsers.length }),
    [blockedUsers.length, mutedUsers.length],
  );

  const renderUserRow = (
    item: BlockedUser | MutedUser,
    mode: "blocked" | "muted",
  ) => {
    const displayName = item.profile.full_name || item.profile.username;
    const handle = item.profile.username;
    const dateLabel = `${mode === "blocked" ? "Blocked" : "Muted"} • ${new Date(item.created_at).toLocaleDateString()}`;
    const actionPending =
      mode === "blocked" ? unblockUser.isPending : unmuteUser.isPending;

    const action = () => {
      if (mode === "blocked") {
        Alert.alert("Unblock User", `Unblock @${handle}?`, [
          { text: "Cancel", style: "cancel" },
          {
            text: "Unblock",
            style: "destructive",
            onPress: () => unblockUser.mutate((item as BlockedUser).blocked_id),
          },
        ]);
      } else {
        Alert.alert("Unmute User", `Unmute @${handle}?`, [
          { text: "Cancel", style: "cancel" },
          {
            text: "Unmute",
            onPress: () => unmuteUser.mutate((item as MutedUser).muted_id),
          },
        ]);
      }
    };

    return (
      <View
        style={[
          styles.userCard,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <View
          style={[
            styles.avatarCircle,
            {
              backgroundColor: colors.primary + "15",
              borderColor: colors.border,
            },
          ]}
        >
          <Ionicons
            name={mode === "blocked" ? "ban-outline" : "volume-mute-outline"}
            size={18}
            color={colors.primary}
          />
        </View>
        <View style={styles.userInfo}>
          <Text
            style={[styles.userName, { color: colors.text }]}
            numberOfLines={1}
          >
            {displayName}
          </Text>
          <Text
            style={[styles.userHandle, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            @{handle}
          </Text>
          <Text style={[styles.userMeta, { color: colors.textTertiary }]}>
            {dateLabel}
          </Text>
        </View>
        <TouchableOpacity
          style={[
            styles.actionBtn,
            {
              backgroundColor:
                mode === "blocked" ? colors.error : colors.primary,
            },
          ]}
          onPress={action}
          disabled={actionPending}
          activeOpacity={0.85}
        >
          {actionPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.actionText}>
              {mode === "blocked" ? "Unblock" : "Unmute"}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const Empty = ({ mode }: { mode: "blocked" | "muted" }) => (
    <View
      style={[
        styles.emptyWrap,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View
        style={[styles.emptyIcon, { backgroundColor: colors.primary + "15" }]}
      >
        <Ionicons
          name={mode === "blocked" ? "ban-outline" : "volume-mute-outline"}
          size={30}
          color={colors.primary}
        />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        {mode === "blocked" ? "No blocked users" : "No muted users"}
      </Text>
      <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
        {mode === "blocked"
          ? "People you block can't see your profile or interact with you."
          : "People you mute can still see you — you just won't see their content."}
      </Text>
    </View>
  );

  const content = (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "transparent" }}
      edges={["left", "right"]}
    >
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />

      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          Blocked & Muted
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Control who you see and who can interact with you.
        </Text>
        <View style={[styles.tabPill, { backgroundColor: colors.card }]}>
          {(["blocked", "muted"] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tab,
                activeTab === tab && { backgroundColor: colors.primary },
              ]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.85}
            >
              <Ionicons
                name={tab === "blocked" ? "ban-outline" : "volume-mute-outline"}
                size={16}
                color={activeTab === tab ? "#fff" : colors.textSecondary}
              />
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === tab ? "#fff" : colors.textSecondary },
                ]}
              >
                {tab === "blocked" ? "Blocked" : "Muted"}
                {tabCounts[tab] ? ` (${tabCounts[tab]})` : ""}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList<BlockedUser | MutedUser>
        data={activeTab === "blocked" ? blockedUsers : mutedUsers}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => renderUserRow(item, activeTab)}
        refreshing={activeTab === "blocked" ? isLoadingBlocked : isLoadingMuted}
        ListEmptyComponent={<Empty mode={activeTab} />}
        ListFooterComponent={
          <View
            style={[
              styles.infoCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Ionicons
              name="information-circle-outline"
              size={20}
              color={colors.primary}
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.infoTitle, { color: colors.text }]}>
                Quick difference
              </Text>
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                <Text style={{ fontWeight: "900", color: colors.text }}>
                  Blocked
                </Text>
                : they can't see or interact with you.{"\n"}
                <Text style={{ fontWeight: "900", color: colors.text }}>
                  Muted
                </Text>
                : they can see you, but you won't see their content.
              </Text>
            </View>
          </View>
        }
      />
    </SafeAreaView>
  );

  if (!isDark) {
    return (
      <LinearGradient
        colors={["#DCEBFF", "#EEF4FF", "#FFFFFF"]}
        locations={[0, 0.45, 1]}
        style={{ flex: 1 }}
      >
        {content}
      </LinearGradient>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10 },
  title: { fontSize: 20, fontWeight: "800" },
  subtitle: { fontSize: 12, marginTop: 6, lineHeight: 18 },
  tabPill: {
    marginTop: 12,
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
  tabText: { fontSize: 13, fontWeight: "700" },
  list: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 8, gap: 10 },
  userCard: {
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  userInfo: { flex: 1 },
  userName: { fontSize: 14, fontWeight: "800" },
  userHandle: { fontSize: 12, marginTop: 2 },
  userMeta: { fontSize: 11, marginTop: 6 },
  actionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    minWidth: 88,
    alignItems: "center",
    justifyContent: "center",
  },
  actionText: { color: "#fff", fontSize: 13, fontWeight: "800" },
  emptyWrap: {
    marginTop: 20,
    borderRadius: 18,
    padding: 18,
    alignItems: "center",
    borderWidth: 1,
  },
  emptyIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  emptyTitle: { fontSize: 14, fontWeight: "900" },
  emptySub: { fontSize: 12, textAlign: "center", marginTop: 6, lineHeight: 18 },
  infoCard: {
    flexDirection: "row",
    gap: 10,
    margin: 16,
    marginTop: 8,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  infoTitle: { fontSize: 13, fontWeight: "900", marginBottom: 2 },
  infoText: { fontSize: 12, lineHeight: 18 },
});
