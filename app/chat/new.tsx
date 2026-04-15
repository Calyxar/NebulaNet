// app/chat/new.tsx — REACT NATIVE FIREBASE ✅ THEMED
import AppHeader from "@/components/navigation/AppHeader";
import { useAuth } from "@/hooks/useAuth";
import { createOrOpenChat } from "@/lib/firestore/createOrOpenChat";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import firestore from "@react-native-firebase/firestore";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
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
  username_lc?: string | null;
  full_name_lc?: string | null;
};
type BlockRow = { blocker_id: string; blocked_id: string };
type FollowRow = { following_id: string; status: "accepted" | "pending" };
type ProfileMini = {
  username: string;
  full_name: string | null;
  avatar_url: string | null;
};
type RecentItem = {
  id: string;
  updated_at: string;
  otherUserId: string;
  other: ProfileMini | null;
  unread_count: number;
};

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function tsToIso(ts: unknown): string {
  if (!ts) return "";
  if (typeof (ts as { toDate?: unknown })?.toDate === "function")
    return (ts as { toDate: () => Date }).toDate().toISOString();
  const d = new Date(ts as string | number);
  return isNaN(d.getTime()) ? "" : d.toISOString();
}

export default function NewChatScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [creatingId, setCreatingId] = useState<string | null>(null);

  const search = searchQuery.trim();
  const canSearch = search.length >= 2;

  const myId = user?.uid;

  const [recent, setRecent] = useState<RecentItem[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);

  useEffect(() => {
    let alive = true;
    const run = async () => {
      if (!myId) return;
      setLoadingRecent(true);
      try {
        const snap = await firestore()
          .collection("conversations")
          .where("participant_ids", "array-contains", myId)
          .where("is_group", "==", false)
          .orderBy("updated_at_ts", "desc")
          .limit(12)
          .get();

        const base: RecentItem[] = snap.docs
          .map((d) => {
            const x = d.data() as any;
            const ids = Array.isArray(x.participant_ids)
              ? (x.participant_ids as string[])
              : [];
            const otherUserId = ids.find((id) => id !== myId) ?? "";
            return {
              id: d.id,
              updated_at: tsToIso(x.updated_at_ts ?? x.updated_at),
              otherUserId,
              other: null,
              unread_count: 0,
            };
          })
          .filter((c) => !!c.otherUserId);

        if (!base.length) {
          if (alive) setRecent([]);
          return;
        }

        const unreadResults = await Promise.all(
          base.map(async (c) => {
            try {
              const pSnap = await firestore()
                .collection("conversations")
                .doc(c.id)
                .collection("participants")
                .doc(myId)
                .get();
              const data = pSnap.exists() ? (pSnap.data() as any) : null;
              const uc =
                data && typeof data.unread_count === "number"
                  ? (data.unread_count as number)
                  : 0;
              return { id: c.id, unread: uc };
            } catch {
              return { id: c.id, unread: 0 };
            }
          }),
        );

        const unreadMap = new Map(unreadResults.map((x) => [x.id, x.unread]));
        const withUnread = base.map((c) => ({
          ...c,
          unread_count: unreadMap.get(c.id) ?? 0,
        }));
        const otherIds = Array.from(
          new Set(withUnread.map((c) => c.otherUserId)),
        );

        const profilesMap = new Map<string, ProfileMini>();

        for (const b of chunk(otherIds, 10)) {
          const ps = await firestore()
            .collection("profiles")
            .where(firestore.FieldPath.documentId(), "in", b)
            .get();
          ps.docs.forEach((pd) => {
            const p = pd.data() as any;
            profilesMap.set(pd.id, {
              username: p.username ?? "",
              full_name: p.full_name ?? null,
              avatar_url: p.avatar_url ?? null,
            });
          });
        }

        if (alive)
          setRecent(
            withUnread.map((c) => ({
              ...c,
              other: profilesMap.get(c.otherUserId) ?? null,
            })),
          );
      } catch (e) {
        console.warn("Recent chats load failed:", e);
        if (alive) setRecent([]);
      } finally {
        if (alive) setLoadingRecent(false);
      }
    };
    run();
    return () => {
      alive = false;
    };
  }, [myId]);

  const [results, setResults] = useState<ProfileRow[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);

  useEffect(() => {
    let alive = true;
    const run = async () => {
      if (!myId || !canSearch) {
        setResults([]);
        return;
      }
      setLoadingResults(true);
      try {
        const s = search.toLowerCase();
        const snap = await firestore()
          .collection("profiles")
          .orderBy("username_lc")
          .startAt(s)
          .endAt(s + "\uf8ff")
          .limit(25)
          .get();

        const rows: ProfileRow[] = snap.docs
          .map((d) => {
            const x = d.data() as any;
            return {
              id: d.id,
              username: x.username ?? "",
              full_name: x.full_name ?? null,
              avatar_url: x.avatar_url ?? null,
              is_private: x.is_private ?? null,
              username_lc: x.username_lc ?? null,
              full_name_lc: x.full_name_lc ?? null,
            };
          })
          .filter((r) => r.id !== myId)
          .filter((r) => {
            const u = (r.username_lc ?? r.username).toLowerCase();
            const n = (r.full_name_lc ?? r.full_name ?? "").toLowerCase();
            return u.includes(s) || n.includes(s);
          })
          .slice(0, 25);
        if (alive) setResults(rows);
      } catch (e) {
        console.warn("Search failed:", e);
        if (alive) setResults([]);
      } finally {
        if (alive) setLoadingResults(false);
      }
    };
    const t = setTimeout(run, 250);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [myId, canSearch, search]);

  const [blocks, setBlocks] = useState<BlockRow[]>([]);
  useEffect(() => {
    if (!myId) return;
    let alive = true;
    Promise.all([
      firestore()
        .collection("user_blocks")
        .where("blocker_id", "==", myId)
        .limit(500)
        .get(),
      firestore()
        .collection("user_blocks")
        .where("blocked_id", "==", myId)
        .limit(500)
        .get(),
    ])
      .then(([s1, s2]) => {
        if (alive) {
          const merged: BlockRow[] = [
            ...s1.docs.map((d) => d.data() as BlockRow),
            ...s2.docs.map((d) => d.data() as BlockRow),
          ];
          setBlocks(merged);
        }
      })
      .catch(() => {
        if (alive) setBlocks([]);
      });
    return () => {
      alive = false;
    };
  }, [myId]);

  const blockedSet = useMemo(() => {
    const s = new Set<string>();
    for (const b of blocks) {
      const other = b.blocker_id === myId ? b.blocked_id : b.blocker_id;
      if (other) s.add(other);
    }
    return s;
  }, [blocks, myId]);

  const targetIds = useMemo(() => results.map((r) => r.id), [results]);
  const [followingAccepted, setFollowingAccepted] = useState<Set<string>>(
    new Set(),
  );

  useEffect(() => {
    if (!myId || !targetIds.length) {
      setFollowingAccepted(new Set());
      return;
    }
    let alive = true;
    const run = async () => {
      try {
        const all: FollowRow[] = [];
        for (const b of chunk(targetIds, 10)) {
          const snap = await firestore()
            .collection("follows")
            .where("follower_id", "==", myId)
            .where("status", "==", "accepted")
            .where("following_id", "in", b)
            .get();
          snap.docs.forEach((d) => {
            const x = d.data() as any;
            all.push({ following_id: x.following_id, status: x.status });
          });
        }
        if (alive)
          setFollowingAccepted(new Set(all.map((f) => f.following_id)));
      } catch {
        if (alive) setFollowingAccepted(new Set());
      }
    };
    run();
    return () => {
      alive = false;
    };
  }, [myId, targetIds.join(",")]);

  const dmGate = (p: ProfileRow): { ok: boolean; reason: string } => {
    if (blockedSet.has(p.id)) return { ok: false, reason: "Blocked" };
    if (p.is_private && !followingAccepted.has(p.id))
      return { ok: false, reason: "Private • Follow to DM" };
    return { ok: true, reason: "" };
  };

  const startDm = async (p: ProfileRow) => {
    if (!myId) return;
    const gate = dmGate(p);
    if (!gate.ok) return;
    try {
      setCreatingId(p.id);
      const conversationId = await createOrOpenChat(myId, p.id);
      router.replace(`/chat/${conversationId}`);
    } catch (e: any) {
      console.error("startDm failed:", e);
    } finally {
      setCreatingId(null);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top", "left", "right"]}
    >
      <AppHeader
        title="New Chat"
        backgroundColor={colors.card}
        onBack={() => router.back()}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <View style={[styles.searchWrap, { backgroundColor: colors.surface }]}>
          <Ionicons
            name="search-outline"
            size={18}
            color={colors.textSecondary}
          />
          <TextInput
            placeholder="Search people…"
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[styles.searchInput, { color: colors.text }]}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {!!searchQuery && (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              activeOpacity={0.8}
            >
              <Ionicons
                name="close-circle"
                size={18}
                color={colors.textTertiary}
              />
            </TouchableOpacity>
          )}
        </View>

        {!canSearch ? (
          <View style={{ flex: 1 }}>
            <Text
              style={[styles.sectionTitle, { color: colors.textSecondary }]}
            >
              Recent
            </Text>
            {loadingRecent ? (
              <View style={styles.center}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : recent.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons
                  name="chatbubbles-outline"
                  size={48}
                  color={colors.border}
                />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  No recent chats
                </Text>
                <Text
                  style={[styles.emptySub, { color: colors.textSecondary }]}
                >
                  Search for someone to start a DM.
                </Text>
              </View>
            ) : (
              <FlatList
                data={recent}
                keyExtractor={(x) => x.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.row,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                      },
                    ]}
                    activeOpacity={0.85}
                    onPress={() => router.replace(`/chat/${item.id}`)}
                  >
                    <View
                      style={[
                        styles.avatar,
                        { backgroundColor: colors.primary },
                      ]}
                    >
                      <Text style={styles.avatarText}>
                        {(item.other?.username?.[0] ?? "U").toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.rowTitle, { color: colors.text }]}>
                        {item.other?.full_name ||
                          (item.other?.username
                            ? `@${item.other.username}`
                            : "Conversation")}
                      </Text>
                      <Text
                        style={[styles.rowSub, { color: colors.textSecondary }]}
                      >
                        {item.other?.username
                          ? `@${item.other.username}`
                          : "Tap to open"}
                        {item.unread_count > 0
                          ? ` • ${item.unread_count} new`
                          : ""}
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={colors.textTertiary}
                    />
                  </TouchableOpacity>
                )}
                contentContainerStyle={{ paddingBottom: 18 }}
              />
            )}
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            <Text
              style={[styles.sectionTitle, { color: colors.textSecondary }]}
            >
              Results
            </Text>
            {loadingResults ? (
              <View style={styles.center}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : results.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons
                  name="search-outline"
                  size={48}
                  color={colors.border}
                />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  No users found
                </Text>
                <Text
                  style={[styles.emptySub, { color: colors.textSecondary }]}
                >
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
                        {
                          backgroundColor: colors.card,
                          borderColor: colors.border,
                        },
                        (!gate.ok || busy) && { opacity: 0.45 },
                      ]}
                    >
                      <View
                        style={[
                          styles.avatar,
                          { backgroundColor: colors.primary },
                        ]}
                      >
                        <Text style={styles.avatarText}>
                          {(item.username?.[0] ?? "U").toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.rowTitle, { color: colors.text }]}>
                          {item.full_name || `@${item.username}`}
                        </Text>
                        <Text
                          style={[
                            styles.rowSub,
                            { color: colors.textSecondary },
                          ]}
                        >
                          @{item.username}
                          {gate.ok
                            ? item.is_private
                              ? " • Private"
                              : ""
                            : ` • ${gate.reason}`}
                        </Text>
                      </View>
                      {busy ? (
                        <ActivityIndicator
                          size="small"
                          color={colors.primary}
                        />
                      ) : (
                        <Ionicons
                          name="chevron-forward"
                          size={18}
                          color={colors.textTertiary}
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchWrap: {
    marginTop: 10,
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 16,
    paddingHorizontal: 12,
    height: 46,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  searchInput: { flex: 1, fontWeight: "800" },
  sectionTitle: {
    marginTop: 8,
    marginBottom: 8,
    paddingHorizontal: 16,
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.4,
  },
  row: {
    marginHorizontal: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#FFFFFF", fontWeight: "900", fontSize: 18 },
  rowTitle: { fontSize: 14, fontWeight: "900" },
  rowSub: { marginTop: 2, fontSize: 12, fontWeight: "700" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  emptyTitle: { marginTop: 10, fontSize: 16, fontWeight: "900" },
  emptySub: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
});
