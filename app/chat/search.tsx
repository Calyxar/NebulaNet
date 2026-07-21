// app/chat/search.tsx — FIREBASE ✅ (REBUILT)
// ✅ FIXED three bugs found in the previous version:
//    1. Used the legacy Web SDK (`db` from @/lib/firebase) instead of the
//       native firestore() the rest of the app uses.
//    2. Imported useAuth from @/providers/AuthProvider (every other screen
//       uses @/hooks/useAuth) and read `user?.id` — Firebase Auth users
//       don't have an `.id` field, only `.uid`, so `handleStartChat`'s
//       `if (!user?.id) return;` guard always fired. Tapping a search
//       result silently did nothing.
//    3. Queried `username_lower`/`full_name_lower`, but the rest of the
//       project's search code (app/chat/new.tsx, app/(tabs)/explore.tsx)
//       uses `username_lc`/`full_name_lc`. If profile docs only have the
//       `_lc` fields populated, these queries returned zero results
//       regardless of bug #2.
// ✅ REPURPOSED to match how X actually splits this UX: the magnifying-
//    glass icon in the DM list searches your *existing* conversations by
//    participant name — it does not search all platform users to start a
//    new DM. That's what the separate compose/"New Chat" flow
//    (app/chat/new.tsx) already does, correctly. Having this screen
//    duplicate that job was itself the source of two of the three bugs
//    above (a second, drifted copy of user-search logic). Now built on
//    useChat() — the same hook chat.tsx and [id].tsx already use — so
//    there's no separate Firestore query surface here to go stale again.

import AppHeader from "@/components/navigation/AppHeader";
import { useAuth } from "@/hooks/useAuth";
import { useChat } from "@/hooks/useChat";
import { type ChatConversation } from "@/lib/firestore/chat";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function getConversationName(item: ChatConversation, userId?: string): string {
  if (item.name) return item.name;
  if (!item.is_group && (item.participants?.length ?? 0) >= 2 && userId) {
    const other = (item.participants ?? []).find((p) => p.user_id !== userId);
    return (
      other?.profiles?.full_name || other?.profiles?.username || "Unknown User"
    );
  }
  if (item.is_group) return `${item.participants?.length ?? 0} members`;
  return "Chat";
}

function getConversationHandle(
  item: ChatConversation,
  userId?: string,
): string {
  if (item.is_group || !userId) return "";
  const other = (item.participants ?? []).find((p) => p.user_id !== userId);
  return other?.profiles?.username ? `@${other.profiles.username}` : "";
}

function getAvatarUrl(item: ChatConversation, userId?: string): string | null {
  if (item.avatar_url) return item.avatar_url;
  if (!item.is_group && (item.participants?.length ?? 0) >= 2 && userId) {
    const other = (item.participants ?? []).find((p) => p.user_id !== userId);
    return other?.profiles?.avatar_url ?? null;
  }
  return null;
}

export default function ChatSearchScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { conversations, loading } = useChat();

  const [search, setSearch] = useState("");

  const results = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return [];
    return conversations.filter((c) => {
      const name = getConversationName(c, user?.uid).toLowerCase();
      const handle = getConversationHandle(c, user?.uid).toLowerCase();
      return name.includes(term) || handle.includes(term);
    });
  }, [conversations, search, user?.uid]);

  const handleOpenConversation = (conversationId: string) => {
    router.replace({
      pathname: "/chat/[id]",
      params: { id: conversationId },
    });
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top", "left", "right", "bottom"]}
    >
      <AppHeader
        title="Search"
        backgroundColor={colors.card}
        leftWide={
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.85}
            style={[
              styles.backBtn,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>
        }
      />

      <View
        style={[styles.searchContainer, { backgroundColor: colors.surface }]}
      >
        <Ionicons name="search" size={18} color={colors.textSecondary} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search your conversations..."
          placeholderTextColor={colors.textTertiary}
          style={[styles.input, { color: colors.text }]}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
        />
        {!!search && (
          <TouchableOpacity onPress={() => setSearch("")} activeOpacity={0.8}>
            <Ionicons
              name="close-circle"
              size={18}
              color={colors.textTertiary}
            />
          </TouchableOpacity>
        )}
      </View>

      {loading.conversations && conversations.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 8,
            paddingBottom: 24,
          }}
          renderItem={({ item }) => {
            const name = getConversationName(item, user?.uid);
            const handle = getConversationHandle(item, user?.uid);
            const avatar = getAvatarUrl(item, user?.uid);
            return (
              <TouchableOpacity
                style={[
                  styles.userRow,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
                onPress={() => handleOpenConversation(item.id)}
                activeOpacity={0.85}
              >
                {avatar ? (
                  <Image
                    source={{ uri: avatar }}
                    style={[styles.avatar, { backgroundColor: colors.surface }]}
                  />
                ) : (
                  <View
                    style={[styles.avatar, { backgroundColor: colors.primary }]}
                  >
                    <Text style={styles.avatarText}>
                      {(name[0] ?? "U").toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={[styles.userName, { color: colors.text }]}>
                    {name}
                  </Text>
                  {!!handle && (
                    <Text
                      style={[
                        styles.userHandle,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {handle}
                    </Text>
                  )}
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.textTertiary}
                />
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            search.length > 0 ? (
              <View style={styles.center}>
                <Ionicons
                  name="search-outline"
                  size={48}
                  color={colors.border}
                />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  No conversations found
                </Text>
                <Text
                  style={[styles.emptySub, { color: colors.textSecondary }]}
                >
                  Try a different name or username.
                </Text>
                <TouchableOpacity
                  style={[
                    styles.newChatBtn,
                    { backgroundColor: colors.primary },
                  ]}
                  onPress={() => router.replace("/chat/new")}
                  activeOpacity={0.85}
                >
                  <Ionicons name="add" size={16} color="#fff" />
                  <Text style={styles.newChatBtnText}>Start a new chat</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.center}>
                <Ionicons
                  name="chatbubbles-outline"
                  size={48}
                  color={colors.border}
                />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  Search your conversations
                </Text>
                <Text
                  style={[styles.emptySub, { color: colors.textSecondary }]}
                >
                  Type a name or username to find a chat. To message someone
                  new, use New Chat instead.
                </Text>
              </View>
            )
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    margin: 12,
    borderRadius: 16,
    paddingHorizontal: 12,
    height: 46,
    gap: 8,
  },
  input: { flex: 1, fontSize: 15, fontWeight: "800" },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
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
  userName: { fontSize: 14, fontWeight: "900" },
  userHandle: { marginTop: 2, fontSize: 12, fontWeight: "700" },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
    paddingHorizontal: 24,
    gap: 4,
  },
  emptyTitle: { marginTop: 10, fontSize: 16, fontWeight: "900" },
  emptySub: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  newChatBtn: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },
  newChatBtnText: { color: "#fff", fontWeight: "800", fontSize: 13 },
});
