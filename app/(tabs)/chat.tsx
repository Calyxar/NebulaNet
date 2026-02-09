import ConversationItem from "@/components/chat/ConversationItem";
import { getTabBarHeight } from "@/components/navigation/CurvedTabBar";
import { useChat } from "@/hooks/useChat";
import { ChatConversation } from "@/lib/queries/chat";
import { useAuth } from "@/providers/AuthProvider";
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
  const { conversations, loading, loadConversations } = useChat();

  const bottomPad = useMemo(
    () => getTabBarHeight(insets.bottom) + 12,
    [insets.bottom],
  );

  const formatTimestamp = (dateString: string) => {
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
        (p) => p.user_id !== userId,
      );
      return otherParticipant?.profiles?.avatar_url || null;
    }

    return null;
  };

  const getConversationName = (item: ChatConversation, userId?: string) => {
    if (item.name) return item.name;

    if (!item.is_group && item.participants?.length === 2 && userId) {
      const otherParticipant = item.participants.find(
        (p) => p.user_id !== userId,
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
    router.push({
      pathname: "/chat/[id]",
      params: { id: conversationId },
    });
  };

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Chat</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.iconButton} activeOpacity={0.7}>
              <Ionicons name="search-outline" size={24} color="#000" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.addButton} activeOpacity={0.8}>
              <Ionicons name="add" size={20} color="#000" />
              <Text style={styles.addButtonText}>New Chat</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.storiesContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.storiesContent}
          />
        </View>

        {loading.conversations ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#7C3AED" />
          </View>
        ) : conversations.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="chatbubble-outline" size={64} color="#E0E0E0" />
            <Text style={styles.emptyStateTitle}>No conversations yet</Text>
            <Text style={styles.emptyStateText}>
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
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#000",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconButton: {
    padding: 8,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
  },
  storiesContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
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
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
    color: "#000",
  },
  emptyStateText: {
    fontSize: 15,
    color: "#999",
    textAlign: "center",
  },
  listContent: {
    paddingTop: 0,
  },
});
