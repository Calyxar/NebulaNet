// app/chat/search.tsx — FIREBASE VERSION ✅

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

    searchUsers();
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
    >
      <AppHeader title="Search" />

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={colors.textSecondary} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search users..."
          placeholderTextColor={colors.textSecondary}
          style={[styles.input, { color: colors.text }]}
        />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.userRow, { borderBottomColor: colors.border }]}
              onPress={() => handleStartChat(item.id)}
            >
              <Text style={{ color: colors.text, fontWeight: "600" }}>
                {item.full_name || item.username}
              </Text>
              <Text style={{ color: colors.textSecondary }}>
                @{item.username}
              </Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            search.length > 0 ? (
              <View style={styles.center}>
                <Text style={{ color: colors.textSecondary }}>
                  No users found.
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
    padding: 12,
    margin: 12,
    borderRadius: 12,
    backgroundColor: "#1111",
    gap: 8,
  },
  input: { flex: 1, fontSize: 16 },
  userRow: {
    padding: 16,
    borderBottomWidth: 1,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
