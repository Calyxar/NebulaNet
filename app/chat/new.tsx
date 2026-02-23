// app/chat/new.tsx — FIRESTORE ✅ (COMPLETED + FIXED)
// ✅ Uses Firestore profiles + blocks + follows
// ✅ Uses createOrOpenChat (Firestore)
// ✅ Fixes profilesMap TS generic syntax
// ✅ Removes leftover Supabase code

import AppHeader from "@/components/navigation/AppHeader";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import { createOrOpenChat } from "@/lib/firestore/createOrOpenChat";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  and,
  collection,
  doc,
  documentId,
  endAt,
  getDoc,
  getDocs,
  limit,
  or,
  orderBy,
  query,
  startAt,
  where,
} from "firebase/firestore";
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
  username_lc?: string | null;
  full_name_lc?: string | null;
};

type BlockRow = { blocker_id: string; blocked_id: string };
type FollowRow = { following_id: string; status: "accepted" | "pending" };

type RecentItem = {
  id: string;
  updated_at: string;
  otherUserId: string;
  other: {
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  unread_count: number;
};

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function tsToIso(ts: unknown): string {
  if (!ts) return "";
  if (typeof (ts as { toDate?: unknown }).toDate === "function") {
    return (ts as { toDate: () => Date }).toDate().toISOString();
  }
  const d = new Date(ts as string | number);
  return isNaN(d.getTime()) ? "" : d.toISOString();
}

export default function NewChatScreen() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [creatingId, setCreatingId] = useState<string | null>(null);

  const search = searchQuery.trim();
  const canSearch = search.length >= 2;

  // ─── Recent conversations ────────────────────────────────────────────────

  const [recent, setRecent] = useState<RecentItem[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);

  useEffect(() => {
    let alive = true;

    const run = async () => {
      if (!user?.id) return;
      setLoadingRecent(true);
      try {
        const q1 = query(
          collection(db, "conversations"),
          where("participant_ids", "array-contains", user.id),
          where("is_group", "==", false),
          orderBy("updated_at_ts", "desc"),
          limit(12),
        );

        const snap = await getDocs(q1);

        const base: RecentItem[] = snap.docs
          .map((d) => {
            const x = d.data() as any;
            const ids = Array.isArray(x.participant_ids)
              ? (x.participant_ids as string[])
              : [];
            const otherUserId = ids.find((id) => id !== user.id) ?? "";
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
              const pSnap = await getDoc(
                doc(db, "conversations", c.id, "participants", user.id),
              );
              const uc =
                pSnap.exists() &&
                typeof (pSnap.data() as any).unread_count === "number"
                  ? ((pSnap.data() as any).unread_count as number)
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

        // ✅ FIXED generic syntax
        const profilesMap = new Map<
          string,
          {
            username: string;
            full_name: string | null;
            avatar_url: string | null;
          }
        >();

        for (const b of chunk(otherIds, 10)) {
          const qp = query(
            collection(db, "profiles"),
            where(documentId(), "in", b),
          );
          const ps = await getDocs(qp);
          ps.docs.forEach((pd) => {
            const p = pd.data() as any;
            profilesMap.set(pd.id, {
              username: (p.username as string) ?? "",
              full_name: (p.full_name as string | null) ?? null,
              avatar_url: (p.avatar_url as string | null) ?? null,
            });
          });
        }

        const final = withUnread.map((c) => ({
          ...c,
          other: profilesMap.get(c.otherUserId) ?? null,
        }));

        if (alive) setRecent(final);
      } catch {
        if (alive) setRecent([]);
      } finally {
        if (alive) setLoadingRecent(false);
      }
    };

    run();
    return () => {
      alive = false;
    };
  }, [user?.id]);

  // ─── User search ─────────────────────────────────────────────────────────

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
        const s = search.toLowerCase();
        const q1 = query(
          collection(db, "profiles"),
          orderBy("username_lc"),
          startAt(s),
          endAt(s + "\uf8ff"),
          limit(25),
        );

        const snap = await getDocs(q1);
        const rows: ProfileRow[] = snap.docs
          .map((d) => {
            const x = d.data() as any;
            return {
              id: d.id,
              username: (x.username as string) ?? "",
              full_name: (x.full_name as string | null) ?? null,
              avatar_url: (x.avatar_url as string | null) ?? null,
              is_private: (x.is_private as boolean | null) ?? null,
              username_lc: (x.username_lc as string | null) ?? null,
              full_name_lc: (x.full_name_lc as string | null) ?? null,
            };
          })
          .filter((r) => r.id !== user.id)
          .filter((r) => {
            const u = (r.username_lc ?? r.username).toLowerCase();
            const n = (r.full_name_lc ?? r.full_name ?? "").toLowerCase();
            return u.includes(s) || n.includes(s);
          })
          .slice(0, 25);

        if (alive) setResults(rows);
      } catch {
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
  }, [user?.id, canSearch, search]);

  // ─── Blocks ──────────────────────────────────────────────────────────────

  const [blocks, setBlocks] = useState<BlockRow[]>([]);
  useEffect(() => {
    if (!user?.id) return;
    let alive = true;

    getDocs(
      query(
        collection(db, "user_blocks"),
        or(
          where("blocker_id", "==", user.id),
          where("blocked_id", "==", user.id),
        ),
        limit(500),
      ),
    )
      .then((snap) => {
        if (alive) setBlocks(snap.docs.map((d) => d.data() as BlockRow));
      })
      .catch(() => {
        if (alive) setBlocks([]);
      });

    return () => {
      alive = false;
    };
  }, [user?.id]);

  const blockedSet = useMemo(() => {
    const s = new Set<string>();
    for (const b of blocks) {
      const other = b.blocker_id === user?.id ? b.blocked_id : b.blocker_id;
      if (other) s.add(other);
    }
    return s;
  }, [blocks, user?.id]);

  // ─── Follows ─────────────────────────────────────────────────────────────

  const targetIds = useMemo(() => results.map((r) => r.id), [results]);
  const [followingAccepted, setFollowingAccepted] = useState<Set<string>>(
    new Set(),
  );

  useEffect(() => {
    if (!user?.id || !targetIds.length) {
      setFollowingAccepted(new Set());
      return;
    }

    let alive = true;

    const run = async () => {
      try {
        const all: FollowRow[] = [];
        for (const b of chunk(targetIds, 10)) {
          const snap = await getDocs(
            query(
              collection(db, "follows"),
              and(
                where("follower_id", "==", user.id),
                where("status", "==", "accepted"),
                where("following_id", "in", b),
              ),
            ),
          );
          snap.docs.forEach((d) => {
            const x = d.data() as any;
            all.push({
              following_id: x.following_id as string,
              status: x.status as "accepted" | "pending",
            });
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
  }, [user?.id, targetIds.join(",")]);

  const dmGate = (p: ProfileRow): { ok: boolean; reason: string } => {
    if (blockedSet.has(p.id)) return { ok: false, reason: "Blocked" };
    if (p.is_private && !followingAccepted.has(p.id))
      return { ok: false, reason: "Private • Follow to DM" };
    return { ok: true, reason: "" };
  };

  const startDm = async (p: ProfileRow) => {
    if (!user?.id) return;
    const gate = dmGate(p);
    if (!gate.ok) return;

    try {
      setCreatingId(p.id);
      const conversationId = await createOrOpenChat(user.id, p.id);
      router.replace(`/chat/${conversationId}`);
    } finally {
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
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {!!searchQuery && (
          <TouchableOpacity
            onPress={() => setSearchQuery("")}
            activeOpacity={0.8}
          >
            <Ionicons name="close-circle" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {!canSearch ? (
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
                  onPress={() => router.replace(`/chat/${item.id}`)}
                >
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {(item.other?.username?.[0] ?? "U").toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>
                      {item.other?.full_name ||
                        (item.other?.username
                          ? `@${item.other.username}`
                          : "Conversation")}
                    </Text>
                    <Text style={styles.rowSub}>
                      {item.other?.username
                        ? `@${item.other.username}`
                        : "Tap to open"}
                      {item.unread_count > 0
                        ? ` • ${item.unread_count} new`
                        : ""}
                    </Text>
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
                        {(item.username?.[0] ?? "U").toUpperCase()}
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
