// app/chat/[id].tsx
import ChatHeader from "@/components/chat/ChatHeader";
import ChatInput from "@/components/chat/ChatInput";
import ChatList from "@/components/chat/ChatList";
import { useAuth } from "@/hooks/useAuth";
import { useChat } from "@/hooks/useChat";
import { ChatConversation } from "@/lib/queries/chat";
import { Stack, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo } from "react";
import { ActivityIndicator, StatusBar, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ChatConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const {
    conversations,
    messages,
    activeConversation,
    loading,
    selectConversation,
    sendMessage,
  } = useChat();

  // Ensure we "enter" the conversation when this route opens
  useEffect(() => {
    if (!id) return;
    if (activeConversation !== id) {
      selectConversation(id);
    }
    // We intentionally do NOT clear on unmount here because:
    // - leaving the screen via back should restore the list screen state cleanly
    // - your tabs chat screen already handles selectConversation(null)
  }, [id, activeConversation, selectConversation]);

  const conversation: ChatConversation | undefined = useMemo(() => {
    return conversations.find((c) => c.id === id);
  }, [conversations, id]);

  const title = useMemo(() => {
    if (!conversation) return "Chat";

    // If a name exists, use it
    if (conversation.name) return conversation.name;

    // If it's a 1:1, derive from participants
    if (
      !conversation.is_group &&
      conversation.participants?.length === 2 &&
      user?.id
    ) {
      const other = conversation.participants.find(
        (p: any) => p.user_id !== user.id,
      );
      return (
        other?.profiles?.full_name ||
        other?.profiles?.username ||
        "Unknown User"
      );
    }

    // Group fallback
    if (conversation.is_group) {
      return `${conversation.participants?.length || 0} members`;
    }

    return "Chat";
  }, [conversation, user?.id]);

  const subtitle = useMemo(() => {
    if (!conversation) return "";

    if (conversation.is_group) {
      return `${conversation.participants?.length || 0} members`;
    }

    if (
      !conversation.is_group &&
      conversation.participants?.length === 2 &&
      user?.id
    ) {
      const other = conversation.participants.find(
        (p: any) => p.user_id !== user.id,
      );
      return other?.profiles?.username || "";
    }

    return "";
  }, [conversation, user?.id]);

  const isOnline = Boolean(conversation?.is_online);

  const handleBack = () => {
    // For route-based screen, just go back.
    // Optional: also clear activeConversation so tab list shows again cleanly.
    selectConversation(null);
  };

  const handleSendMessage = async (content: string) => {
    if (!id) return;
    await sendMessage(content, id);
  };

  // If the conversation list hasn't loaded yet, show a clean loader
  if (loading.conversations && !conversation) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <SafeAreaView style={styles.container}>
          <View style={styles.loading}>
            <ActivityIndicator size="large" color="#7C3AED" />
          </View>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      {/* IMPORTANT: hide native header so you don't get duplicated headers */}
      <Stack.Screen options={{ headerShown: false }} />

      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <SafeAreaView style={styles.container}>
        <ChatHeader
          title={title}
          subtitle={subtitle}
          isOnline={isOnline}
          onBackPress={handleBack}
        />

        <ChatList
          messages={messages.map((msg) => ({
            id: msg.id,
            content: msg.content ?? "",
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
            mediaType: (msg.media_type as "image" | "video" | "audio" | "file" | undefined) ?? undefined,
            attachments: msg.attachments ?? undefined,
          }))}
          isLoading={loading.messages}
        />

        <ChatInput
          onSendMessage={handleSendMessage}
          placeholder="Type a message..."
          disabled={loading.sending}
        />
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
