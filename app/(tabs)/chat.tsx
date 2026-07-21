// app/(tabs)/chat.tsx ✅
// ✅ Removed the empty storiesContainer/ScrollView that was rendering
//    nothing but a border line under the header — dead code that was
//    taking up vertical space before the conversation list.
// ✅ UI CONSISTENCY PASS: wrapped in the shared blue gradient used by
//    Profile/Explore/Communities/Notifications (this screen previously had
//    no gradient at all — just a flat background), and threaded
//    uiScale/fontScale through header buttons and empty-state sizing.
import ConversationItem from "@/components/chat/ConversationItem";
import AppHeader from "@/components/navigation/AppHeader";
import { getTabBarHeight } from "@/components/navigation/CurvedTabBar";
import { useAuth } from "@/hooks/useAuth";
import { useChat } from "@/hooks/useChat";
import { type ChatConversation } from "@/lib/firestore/chat";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
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
  const { colors, isDark, uiScale, fontScale } = useTheme();
  const { conversations, loading, loadConversations } = useChat();

  const bottomPad = useMemo(
    () => getTabBarHeight(insets.bottom) + 12,
    [insets.bottom],
  );

  // ✅ Aligned with the blue gradient used by Profile/Explore/Communities/
  // Notifications — this screen previously had none at all.
  const gradientColors = isDark
    ? [colors.background, colors.background, colors.background]
    : (["#DCEBFF", "#EEF4FF", "#FFFFFF"] as const);

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
        translucent
        backgroundColor="transparent"
      />
      <LinearGradient
        colors={gradientColors as any}
        locations={[0, 0.42, 1]}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
          <AppHeader
            title="Chat"
            backgroundColor="transparent"
            rightWide={
              <View style={[styles.headerActions, { gap: 10 * uiScale }]}>
                <TouchableOpacity
                  style={[
                    styles.iconButton,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      width: 40 * uiScale,
                      height: 40 * uiScale,
                      borderRadius: 20 * uiScale,
                    },
                  ]}
                  activeOpacity={0.7}
                  onPress={() => router.push("/chat/search")}
                >
                  <Ionicons
                    name="search-outline"
                    size={22}
                    color={colors.text}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.addButton,
                    {
                      backgroundColor: colors.primary,
                      paddingHorizontal: 14 * uiScale,
                      height: 40 * uiScale,
                      gap: 6 * uiScale,
                    },
                  ]}
                  activeOpacity={0.85}
                  onPress={() => router.push("/chat/new")}
                >
                  <Ionicons name="add" size={18} color="#fff" />
                  <Text
                    style={[styles.addButtonText, { fontSize: 13 * fontScale }]}
                  >
                    New Chat
                  </Text>
                </TouchableOpacity>
              </View>
            }
          />

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
              <Text
                style={[
                  styles.emptyStateTitle,
                  {
                    color: colors.text,
                    fontSize: 20 * fontScale,
                    marginTop: 16 * uiScale,
                    marginBottom: 8 * uiScale,
                  },
                ]}
              >
                No conversations yet
              </Text>
              <Text
                style={[
                  styles.emptyStateText,
                  { color: colors.textSecondary, fontSize: 15 * fontScale },
                ]}
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
                  name={getConversationName(item, user?.uid)}
                  lastMessage={item.last_message?.content ?? ""}
                  attachments={item.last_message?.attachments ?? null}
                  mediaType={item.last_message?.media_type ?? null}
                  timestamp={formatTimestamp(item.updated_at)}
                  unreadCount={item.unread_count ?? 0}
                  otherUserId={
                    !item.is_group
                      ? (item.participants?.find((p) => p.user_id !== user?.uid)
                          ?.user_id ?? null)
                      : null
                  }
                  isTyping={item.is_typing ?? false}
                  isPinned={item.is_pinned ?? false}
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
      </LinearGradient>
    </>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1, backgroundColor: "transparent" },
  headerActions: { flexDirection: "row", alignItems: "center" },
  iconButton: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
  },
  addButtonText: { fontWeight: "700", color: "#fff" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyStateTitle: {
    fontWeight: "700",
  },
  emptyStateText: { textAlign: "center", lineHeight: 22 },
  listContent: { paddingTop: 0 },
});
