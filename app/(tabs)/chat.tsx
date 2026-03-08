// app/(tabs)/chat.tsx — COMPLETED + UPDATED ✅
import ConversationItem from "@/components/chat/ConversationItem";
import AppHeader from "@/components/navigation/AppHeader";
import { getTabBarHeight } from "@/components/navigation/CurvedTabBar";
import { useChat } from "@/hooks/useChat";
import { type ChatConversation } from "@/lib/firestore/chat";
import { useAuth } from "@/providers/AuthProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const { conversations, loading, loadConversations } = useChat();

  const bottomPad = useMemo(
    () => getTabBarHeight(insets.bottom) + 12,
    [insets.bottom],
  );

  const formatTimestamp = (dateString?: string): string => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getAvatarUrl = (
    item: ChatConversation,
    userId?: string,
  ): string | null => {
    if (item.avatar_url) return item.avatar_url;
    if (!item.is_group && (item.participants?.length ?? 0) >= 2 && userId) {
      const other = (item.participants ?? []).find((p) => p.user_id !== userId);
      return other?.profiles?.avatar_url ?? null;
    }
    return null;
  };

  const getConversationName = (
    item: ChatConversation,
    userId?: string,
  ): string => {
    if (item.name) return item.name;
    if (!item.is_group && (item.participants?.length ?? 0) >= 2 && userId) {
      const other = (item.participants ?? []).find((p) => p.user_id !== userId);
      return (
        other?.profiles?.full_name ||
        other?.profiles?.username ||
        "Unknown User"
      );
    }
    if (item.is_group) return `${item.participants?.length ?? 0} members`;
    return "Chat";
  };

  return (
    <>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />

      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={["left", "right"]}
      >
        <AppHeader
          title="Chat"
          backgroundColor={colors.background}
          rightWide={
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={[
                  styles.iconButton,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  },
                ]}
                activeOpacity={0.7}
                onPress={() => router.push("/chat/search")}
              >
                <Ionicons name="search-outline" size={22} color={colors.text} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: colors.primary }]}
                activeOpacity={0.85}
                onPress={() => router.push("/chat/new")}
              >
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.addButtonText}>New Chat</Text>
              </TouchableOpacity>
            </View>
          }
        />

        {/* Stories row placeholder */}
        <View
          style={[
            styles.storiesContainer,
            { borderBottomColor: colors.border },
          ]}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.storiesContent}
          />
        </View>

        {loading.conversations && conversations.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : conversations.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons
              name="chatbubble-outline"
              size={64}
              color={colors.border}
            />
            <Text style={[styles.emptyStateTitle, { color: colors.text }]}>
              No conversations yet
            </Text>
            <Text
              style={[styles.emptyStateText, { color: colors.textSecondary }]}
            >
              Start a conversation with someone!
            </Text>
          </View>
        ) : (
          <FlatList
            data={conversations}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ConversationItem
                id={item.id}
                // ✅ FIX: use user?.uid not user?.id
                name={getConversationName(item, user?.uid)}
                lastMessage={item.last_message?.content ?? ""}
                attachments={item.last_message?.attachments ?? null}
                mediaType={item.last_message?.media_type ?? null}
                timestamp={formatTimestamp(item.updated_at)}
                unreadCount={item.unread_count ?? 0}
                isOnline={item.is_online ?? false}
                isTyping={item.is_typing ?? false}
                isPinned={item.is_pinned ?? false}
                // ✅ FIX: use user?.uid not user?.id
                avatar={getAvatarUrl(item, user?.uid)}
                onPress={() =>
                  router.push({
                    pathname: "/chat/[id]",
                    params: { id: item.id },
                  })
                }
              />
            )}
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: bottomPad },
            ]}
            refreshing={loading.conversations}
            onRefresh={loadConversations}
          />
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 999,
    gap: 6,
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fff",
  },

  storiesContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  storiesContent: {
    paddingHorizontal: 16,
    gap: 12,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },

  listContent: { paddingTop: 0 },
});
