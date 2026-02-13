// app/(tabs)/chat.tsx — COMPLETED + UPDATED (ThemeProvider + safe typing/online + stable name/avatar)
// Keeps your timestamp formatting + name/avatar helpers, but now uses theme colors everywhere.

import ConversationItem from "@/components/chat/ConversationItem";
import AppHeader from "@/components/navigation/AppHeader";
import { getTabBarHeight } from "@/components/navigation/CurvedTabBar";
import { useChat } from "@/hooks/useChat";
import { ChatConversation } from "@/lib/queries/chat";
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

type ParticipantRow = {
  user_id: string;
  profiles?: {
    username?: string | null;
    full_name?: string | null;
    avatar_url?: string | null;
  } | null;
};

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const { conversations, loading, loadConversations } = useChat();

  const bottomPad = useMemo(
    () => getTabBarHeight(insets.bottom) + 12,
    [insets.bottom],
  );

  const formatTimestamp = (dateString?: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hr ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const getAvatarUrl = (item: ChatConversation, userId?: string) => {
    if (item.avatar_url) return item.avatar_url;

    if (!item.is_group && item.participants?.length === 2 && userId) {
      const otherParticipant = item.participants.find(
        (p: ParticipantRow) => p.user_id !== userId,
      );
      return otherParticipant?.profiles?.avatar_url || null;
    }
    return null;
  };

  const getConversationName = (item: ChatConversation, userId?: string) => {
    if (item.name) return item.name;

    if (!item.is_group && item.participants?.length === 2 && userId) {
      const otherParticipant = item.participants.find(
        (p: ParticipantRow) => p.user_id !== userId,
      );
      return (
        otherParticipant?.profiles?.full_name ||
        otherParticipant?.profiles?.username ||
        "Unknown User"
      );
    }

    if (item.is_group) return `${item.participants?.length || 0} members`;
    return "Chat";
  };

  const openConversation = (conversationId: string) => {
    router.push({ pathname: "/chat/[id]", params: { id: conversationId } });
  };

  const onPressSearch = () => router.push("/chat/search");
  const onPressNewChat = () => router.push("/chat/new");

  return (
    <>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        translucent
        backgroundColor="transparent"
      />

      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={["left", "right"]}
      >
        <AppHeader
          title="Chat"
          backgroundColor={colors.surface}
          rightWide={
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={[styles.iconButton, { backgroundColor: colors.surface }]}
                activeOpacity={0.7}
                onPress={onPressSearch}
              >
                <Ionicons name="search-outline" size={22} color={colors.text} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.addButton,
                  { backgroundColor: colors.inputBackground },
                ]}
                activeOpacity={0.85}
                onPress={onPressNewChat}
              >
                <Ionicons name="add" size={18} color={colors.text} />
                <Text style={[styles.addButtonText, { color: colors.text }]}>
                  New Chat
                </Text>
              </TouchableOpacity>
            </View>
          }
        />

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

        {loading.conversations ? (
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
                name={getConversationName(item, user?.id)}
                lastMessage={item.last_message?.content || "No messages yet"}
                timestamp={formatTimestamp(item.updated_at)}
                unreadCount={item.unread_count}
                isOnline={item.is_online}
                isTyping={item.is_typing}
                isPinned={item.is_pinned}
                avatar={getAvatarUrl(item, user?.id)}
                onPress={() => openConversation(item.id)}
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
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },

  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 20,
    gap: 6,
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: "800",
  },

  storiesContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  storiesContent: {
    paddingHorizontal: 16,
    gap: 12,
  },

  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },

  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: { fontSize: 15, textAlign: "center" },

  listContent: { paddingTop: 0 },
});
