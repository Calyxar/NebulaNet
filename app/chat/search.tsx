// app/chat/search.tsx — FIREBASE ✅ (COMPLETED + UPDATED)
// ✅ Theme applied via useTheme — no more hardcoded colors
// ✅ SafeAreaView edges include "top"
// ✅ Fixed search container background (was "#1111")

import AppHeader from "@/components/navigation/AppHeader";
import { db } from "@/lib/firebase";
import { createOrOpenChat } from "@/lib/firestore/createOrOpenChat";
import { useAuth } from "@/providers/AuthProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import React, { useEffect, useState } from "react";
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

type UserProfile = {
  id: string;
  username: string;
  full_name?: string | null;
  avatar_url?: string | null;
};

export default function ChatSearchScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();

  const [search, setSearch] = useState("");
  const [results, setResults] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const term = search.trim().toLowerCase();

    if (!term) {
      setResults([]);
      return;
    }

    const searchUsers = async () => {
      setLoading(true);
      try {
        const [byUsername, byFullName] = await Promise.all([
          getDocs(
            query(
              collection(db, "profiles"),
              where("username_lower", ">=", term),
              where("username_lower", "<=", term + "\uf8ff"),
              limit(20),
            ),
          ),
          getDocs(
            query(
              collection(db, "profiles"),
              where("full_name_lower", ">=", term),
              where("full_name_lower", "<=", term + "\uf8ff"),
              limit(20),
            ),
          ),
        ]);

        const dedup = new Map<string, UserProfile>();
        [...byUsername.docs, ...byFullName.docs].forEach((snap) => {
          if (snap.id === user?.id) return;
          const d = snap.data() as Partial<UserProfile>;
          dedup.set(snap.id, {
            id: snap.id,
            username: d.username ?? "",
            full_name: d.full_name ?? null,
            avatar_url: d.avatar_url ?? null,
          });
        });

        setResults(Array.from(dedup.values()));
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setLoading(false);
      }
    };

    const t = setTimeout(searchUsers, 250);
    return () => clearTimeout(t);
  }, [search, user?.id]);

  const handleStartChat = async (otherUserId: string) => {
    if (!user?.id) return;
    try {
      const conversationId = await createOrOpenChat(user.id, otherUserId);
      router.replace({
        pathname: "/chat/[id]",
        params: { id: conversationId },
      });
    } catch (error: any) {
      console.error("Create chat error:", error);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top", "left", "right", "bottom"]}
    >
      <AppHeader
        title="Search"
        backgroundColor={colors.card}
        onBack={() => router.back()}
      />

      <View
        style={[styles.searchContainer, { backgroundColor: colors.surface }]}
      >
        <Ionicons name="search" size={18} color={colors.textSecondary} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search users..."
          placeholderTextColor={colors.textTertiary}
          style={[styles.input, { color: colors.text }]}
          autoCapitalize="none"
          autoCorrect={false}
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

      {loading ? (
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
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.userRow,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              onPress={() => handleStartChat(item.id)}
              activeOpacity={0.85}
            >
              <View
                style={[styles.avatar, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.avatarText}>
                  {(item.username?.[0] ?? "U").toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.userName, { color: colors.text }]}>
                  {item.full_name || item.username}
                </Text>
                <Text
                  style={[styles.userHandle, { color: colors.textSecondary }]}
                >
                  @{item.username}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.textTertiary}
              />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            search.length > 0 ? (
              <View style={styles.center}>
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
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  },
  emptyTitle: { marginTop: 10, fontSize: 16, fontWeight: "900" },
  emptySub: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
});
