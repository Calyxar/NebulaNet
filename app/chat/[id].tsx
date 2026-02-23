// app/chat/[id].tsx — FIRESTORE + FIREBASE STORAGE ✅ (COMPLETED + UPDATED)
// ✅ Removes SupabaseAttachment import
// ✅ Uses ChatAttachment from Firebase ChatInput
// ✅ Keeps your useChat() contract the same (selectConversation, sendMessage, messages, loading)
// ✅ StatusBar respects theme (dark mode)

import ChatHeader from "@/components/chat/ChatHeader";
import ChatInput, { type ChatAttachment } from "@/components/chat/ChatInput";
import ChatList from "@/components/chat/ChatList";
import { useAuth } from "@/hooks/useAuth";
import { useChat } from "@/hooks/useChat";
import { useTheme } from "@/providers/ThemeProvider";
import { Stack, router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo } from "react";
import { ActivityIndicator, StatusBar, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ChatConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();

  const {
    conversations,
    messages,
    activeConversation,
    loading,
    selectConversation,
    sendMessage,
  } = useChat();

  useEffect(() => {
    if (!id) return;
    if (activeConversation !== id) {
      selectConversation(id);
    }
  }, [id, activeConversation, selectConversation]);

  const conversation = useMemo(
    () => conversations.find((c) => c.id === id),
    [conversations, id],
  );

  const title = useMemo(() => {
    if (!conversation) return "Chat";
    if (conversation.name) return conversation.name;

    if (
      !conversation.is_group &&
      (conversation.participants?.length ?? 0) >= 2 &&
      user?.id
    ) {
      const other = conversation.participants?.find(
        (p) => p.user_id !== user.id,
      );
      return (
        other?.profiles?.full_name ||
        other?.profiles?.username ||
        "Unknown User"
      );
    }

    if (conversation.is_group) {
      return `${conversation.participants?.length ?? 0} members`;
    }

    return "Chat";
  }, [conversation, user?.id]);

  const subtitle = useMemo(() => {
    if (!conversation) return "";

    if (
      !conversation.is_group &&
      (conversation.participants?.length ?? 0) >= 2 &&
      user?.id
    ) {
      const other = conversation.participants?.find(
        (p) => p.user_id !== user.id,
      );
      return other?.profiles?.username ? `@${other.profiles.username}` : "";
    }

    if (conversation.is_group) {
      return `${conversation.participants?.length ?? 0} members`;
    }

    return "";
  }, [conversation, user?.id]);

  const handleSendMessage = async (
    content: string,
    attachments?: ChatAttachment[],
  ) => {
    if (!id) return;
    await sendMessage(content, id, attachments);
  };

  if (loading.conversations && !conversation) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar
          barStyle={isDark ? "light-content" : "dark-content"}
          backgroundColor={colors.background}
        />
        <SafeAreaView
          style={[styles.container, { backgroundColor: colors.background }]}
        >
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />

      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <ChatHeader
          title={title}
          subtitle={subtitle}
          isOnline={conversation?.is_online ?? false}
          onBackPress={() => {
            selectConversation(null);
            router.back();
          }}
        />

        <ChatList
          messages={messages.map((msg) => ({
            id: msg.id,
            content: msg.content ?? "",
            createdAtIso: msg.created_at,
            sender: msg.sender_id === user?.id ? "me" : "other",
            timestamp: new Date(msg.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            status: msg.read_at
              ? "read"
              : msg.delivered_at
                ? "delivered"
                : "sent",
            mediaUrl: msg.media_url ?? undefined,
            mediaType:
              (msg.media_type as
                | "image"
                | "video"
                | "audio"
                | "file"
                | undefined) ?? undefined,
            attachments: msg.attachments,
          }))}
          isLoading={loading.messages}
        />

        <ChatInput
          onSendMessage={handleSendMessage}
          placeholder="Type a message..."
          disabled={loading.sending}
          conversationId={id}
          userId={user?.id}
        />
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
});
