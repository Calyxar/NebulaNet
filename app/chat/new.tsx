// app/chat/new.tsx

import AppHeader from "@/components/navigation/AppHeader";
import { useAuth } from "@/hooks/useAuth";
import { createOrOpenChat } from "@/hooks/useCreateOrOpenChat";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type ProfileRow = {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  is_private: boolean | null;
};

type BlockRow = { blocker_id: string; blocked_id: string };
type FollowRow = { following_id: string; status: "accepted" | "pending" };

function UserRowItem({
  item,
  disabled,
  subtitle,
  onPress,
}: {
  item: ProfileRow;
  disabled?: boolean;
  subtitle?: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.row, disabled && { opacity: 0.45 }]}
      activeOpacity={0.85}
      onPress={onPress}
      disabled={disabled}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {(item.username?.[0] || "U").toUpperCase()}
        </Text>
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>
          {item.full_name || `@${item.username}`}
        </Text>
        <Text style={styles.rowSub}>
          @{item.username}
          {subtitle ? ` • ${subtitle}` : ""}
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
    </TouchableOpacity>
  );
}

export default function NewChatScreen() {
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [creatingId, setCreatingId] = useState<string | null>(null);

  const search = q.trim();
  const canSearch = useMemo(() => search.length >= 2, [search]);

  const [recent, setRecent] = useState<
    { id: string; updated_at: string; is_group: boolean }[]
  >([]);
  const [loadingRecent, setLoadingRecent] = useState(false);

  useEffect(() => {
    let alive = true;

    const run = async () => {
      if (!user?.id) return;

      setLoadingRecent(true);
      try {
        const { data, error } = await supabase
          .from("conversation_participants")
          .select(
            `
            conversation_id,
            conversations:conversations (
              id,
              updated_at,
              is_group
            )
          `,
          )
          .eq("user_id", user.id)
          .order("conversations(updated_at)", { ascending: false })
          .limit(12);

        if (error) throw error;

        const convos = (data || [])
          .map((r: any) => r.conversations)
          .filter(Boolean)
          .filter((c: any) => c.is_group === false);

        if (!alive) return;
        setRecent(
          convos as { id: string; updated_at: string; is_group: boolean }[],
        );
      } catch {
        if (!alive) return;
        setRecent([]);
      } finally {
        if (!alive) return;
        setLoadingRecent(false);
      }
    };

    run();
    return () => {
      alive = false;
    };
  }, [user?.id]);

  const [results, setResults] = useState<ProfileRow[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);

  useEffect(() => {
    let alive = true;

    const run = async () => {
      if (!user?.id || !canSearch) {
        setResults([]);
        return;
      }

      setLoadingResults(true);
      try {
        const like = `%${search}%`;

        const { data, error } = await supabase
          .from("profiles")
          .select("id,username,full_name,avatar_url,is_private")
          .neq("id", user.id)
          .or(`username.ilike.${like},full_name.ilike.${like}`)
          .order("username", { ascending: true })
          .limit(25);

        if (error) throw error;

        if (!alive) return;
        setResults((data as ProfileRow[]) ?? []);
      } catch {
        if (!alive) return;
        setResults([]);
      } finally {
        if (!alive) return;
        setLoadingResults(false);
      }
    };

    const t = setTimeout(run, 250);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [user?.id, canSearch, search]);

  const [blocks, setBlocks] = useState<BlockRow[]>([]);
  useEffect(() => {
    let alive = true;

    const run = async () => {
      if (!user?.id) return;
      try {
        const { data, error } = await supabase
          .from("user_blocks")
          .select("blocker_id,blocked_id")
          .or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`);

        if (error) throw error;
        if (!alive) return;
        setBlocks((data as BlockRow[]) ?? []);
      } catch {
        if (!alive) return;
        setBlocks([]);
      }
    };

    run();
    return () => {
      alive = false;
    };
  }, [user?.id]);

  const blockedSet = useMemo(() => {
    const s = new Set<string>();
    for (const b of blocks || []) {
      const other = b.blocker_id === user?.id ? b.blocked_id : b.blocker_id;
      if (other) s.add(other);
    }
    return s;
  }, [blocks, user?.id]);

  const targetIds = useMemo(() => (results || []).map((r) => r.id), [results]);

  const [followsAccepted, setFollowsAccepted] = useState<FollowRow[]>([]);
  useEffect(() => {
    let alive = true;

    const run = async () => {
      if (!user?.id || targetIds.length === 0) {
        setFollowsAccepted([]);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("follows")
          .select("following_id,status")
          .eq("follower_id", user.id)
          .in("following_id", targetIds)
          .eq("status", "accepted");

        if (error) throw error;
        if (!alive) return;
        setFollowsAccepted((data as FollowRow[]) ?? []);
      } catch {
        if (!alive) return;
        setFollowsAccepted([]);
      }
    };

    run();
    return () => {
      alive = false;
    };
  }, [user?.id, targetIds.join(",")]);

  const followingAccepted = useMemo(() => {
    const s = new Set<string>();
    for (const f of followsAccepted || []) s.add(f.following_id);
    return s;
  }, [followsAccepted]);

  const dmGate = (p: ProfileRow) => {
    if (blockedSet.has(p.id)) return { ok: false, reason: "Blocked" };
    if (p.is_private && !followingAccepted.has(p.id))
      return { ok: false, reason: "Private • Follow to DM" };
    return { ok: true, reason: "" };
  };

  const openRecent = (conversationId: string) => {
    router.replace(`/chat/${conversationId}`);
  };

  const startDm = async (p: ProfileRow) => {
    if (!user?.id) return;

    const gate = dmGate(p);
    if (!gate.ok) return;

    try {
      setCreatingId(p.id);
      const conversationId = await createOrOpenChat(user.id, p.id);
      router.replace(`/chat/${conversationId}`);
    } catch {
      setCreatingId(null);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <AppHeader
        title="New Chat"
        backgroundColor="#FFFFFF"
        left={
          <TouchableOpacity
            style={styles.headerIcon}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </TouchableOpacity>
        }
      />

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color="#6B7280" />
        <TextInput
          placeholder="Search people…"
          placeholderTextColor="#9CA3AF"
          value={q}
          onChangeText={setQ}
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {!!q && (
          <TouchableOpacity onPress={() => setQ("")} activeOpacity={0.8}>
            <Ionicons name="close-circle" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {search.length === 0 ? (
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>Recent</Text>

          {loadingRecent ? (
            <View style={styles.center}>
              <ActivityIndicator />
            </View>
          ) : recent.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="chatbubbles-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No recent chats</Text>
              <Text style={styles.emptySub}>
                Search for someone to start a DM.
              </Text>
            </View>
          ) : (
            <FlatList
              data={recent}
              keyExtractor={(x) => x.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.row}
                  activeOpacity={0.85}
                  onPress={() => openRecent(item.id)}
                >
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>💬</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>Conversation</Text>
                    <Text style={styles.rowSub}>Tap to open</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                </TouchableOpacity>
              )}
              contentContainerStyle={{ paddingBottom: 18 }}
            />
          )}
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>Results</Text>

          {loadingResults ? (
            <View style={styles.center}>
              <ActivityIndicator />
            </View>
          ) : results.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="search-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No users found</Text>
              <Text style={styles.emptySub}>
                Try a different name or username.
              </Text>
            </View>
          ) : (
            <FlatList
              data={results}
              keyExtractor={(x) => x.id}
              renderItem={({ item }) => {
                const gate = dmGate(item);
                const busy = creatingId === item.id;

                return (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => startDm(item)}
                    disabled={!gate.ok || !!creatingId}
                    style={[
                      styles.row,
                      (!gate.ok || busy) && { opacity: 0.45 },
                    ]}
                  >
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {(item.username?.[0] || "U").toUpperCase()}
                      </Text>
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle}>
                        {item.full_name || `@${item.username}`}
                      </Text>
                      <Text style={styles.rowSub}>
                        @{item.username}
                        {gate.ok
                          ? item.is_private
                            ? " • Private"
                            : ""
                          : ` • ${gate.reason}`}
                      </Text>
                    </View>

                    {busy ? (
                      <ActivityIndicator size="small" color="#7C3AED" />
                    ) : (
                      <Ionicons
                        name="chevron-forward"
                        size={18}
                        color="#9CA3AF"
                      />
                    )}
                  </TouchableOpacity>
                );
              }}
              contentContainerStyle={{ paddingBottom: 18 }}
            />
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },

  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },

  searchWrap: {
    marginTop: 10,
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: "#F3F4F6",
    borderRadius: 16,
    paddingHorizontal: 12,
    height: 46,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  searchInput: { flex: 1, color: "#111827", fontWeight: "800" },

  sectionTitle: {
    marginTop: 8,
    marginBottom: 8,
    paddingHorizontal: 16,
    fontSize: 13,
    fontWeight: "900",
    color: "#6B7280",
    letterSpacing: 0.4,
  },

  row: {
    marginHorizontal: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EEF2FF",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#7C3AED",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#FFFFFF", fontWeight: "900", fontSize: 18 },

  rowTitle: { fontSize: 14, fontWeight: "900", color: "#111827" },
  rowSub: { marginTop: 2, fontSize: 12, fontWeight: "700", color: "#6B7280" },

  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  emptyTitle: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
  },
  emptySub: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7280",
    textAlign: "center",
  },
});
