// app/chat/[id].tsx — React Native Firebase ✅
// ✅ FIXED: message deletion with long press
// ✅ FIXED: deleted messages hidden from UI
// ✅ FIXED: media/attachments supported
// ✅ FIXED: restored the subtitle useMemo, which was accidentally dropped
//           in a previous edit — the JSX below still referenced it,
//           causing a "Cannot find name 'subtitle'" compile error.
// ✅ FIXED: handleBlock used `db.collection("user_blocks").add(...)` (the
//           legacy Web SDK from @/lib/firebase) — the only call in this
//           file that hadn't been migrated to firestore() like everything
//           else here. Same recurring db-vs-firestore() pattern found
//           across the project; fixed to match the rest of this file.

import ChatActionsSheet, {
  type ChatActionsSheetRef,
} from "@/components/chat/ChatActionsSheet";
import ChatHeader from "@/components/chat/ChatHeader";
import ChatInput, { type ChatAttachment } from "@/components/chat/ChatInput";
import ChatList from "@/components/chat/ChatList";
import { useAuth } from "@/hooks/useAuth";
import { useChat } from "@/hooks/useChat";
import { useMuteStatus, useToggleMute } from "@/hooks/useMuteUser";
import { usePresence } from "@/hooks/usePresence";
import { useTheme } from "@/providers/ThemeProvider";
import firestore from "@react-native-firebase/firestore";
import { Stack, router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useRef } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";
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
    deleteMessage,
  } = useChat();

  useEffect(() => {
    if (!id) return;
    if (activeConversation !== id) selectConversation(id);
  }, [id, activeConversation, selectConversation]);

  useEffect(() => {
    if (!id || !user?.uid) return;
    const markAsRead = async () => {
      try {
        await firestore()
          .collection("conversations")
          .doc(id)
          .collection("participants")
          .doc(user.uid)
          .set(
            {
              unread_count: 0,
              last_read_at: firestore.FieldValue.serverTimestamp(),
            },
            { merge: true },
          );
      } catch (error) {
        console.error("Error marking messages as read:", error);
      }
    };
    markAsRead();
  }, [id, user?.uid]);

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
      user?.uid
    ) {
      const other = conversation.participants?.find(
        (p) => p.user_id !== user.uid,
      );
      return (
        other?.profiles?.full_name ||
        other?.profiles?.username ||
        "Unknown User"
      );
    }
    if (conversation.is_group)
      return `${conversation.participants?.length ?? 0} members`;
    return "Chat";
  }, [conversation, user?.uid]);

  const subtitle = useMemo(() => {
    if (!conversation) return "";
    if (
      !conversation.is_group &&
      (conversation.participants?.length ?? 0) >= 2 &&
      user?.uid
    ) {
      const other = conversation.participants?.find(
        (p) => p.user_id !== user.uid,
      );
      return other?.profiles?.username ? `@${other.profiles.username}` : "";
    }
    if (conversation.is_group)
      return `${conversation.participants?.length ?? 0} members`;
    return "";
  }, [conversation, user?.uid]);

  // ✅ NEW: resolve the other participant's id/avatar once, for the
  // header's tap-to-profile and avatar display. Group chats have no
  // single "other user" so both stay null there.
  const { otherUserId, otherUserAvatar } = useMemo(() => {
    if (!conversation || conversation.is_group || !user?.uid)
      return { otherUserId: null, otherUserAvatar: null };
    const other = conversation.participants?.find(
      (p) => p.user_id !== user.uid,
    );
    return {
      otherUserId: other?.user_id ?? null,
      otherUserAvatar: other?.profiles?.avatar_url ?? null,
    };
  }, [conversation, user?.uid]);

  const actionsSheetRef = useRef<ChatActionsSheetRef>(null);
  const { status: otherUserStatus } = usePresence(otherUserId);
  const otherUserOnline = otherUserStatus === "online";
  const { data: isMuted } = useMuteStatus(otherUserId ?? "");
  const muteMutation = useToggleMute(otherUserId ?? "");

  const handleBlock = () => {
    actionsSheetRef.current?.close();
    if (!otherUserId) return;
    Alert.alert(
      "Block user?",
      "You won't see each other's posts or be able to message.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Block",
          style: "destructive",
          onPress: async () => {
            try {
              // ✅ FIX: firestore() (native SDK), was db.collection(...)
              // (legacy Web SDK) — the only unmigrated call in this file.
              await firestore().collection("user_blocks").add({
                blocker_id: user?.uid,
                blocked_id: otherUserId,
                created_at: new Date().toISOString(),
              });
              router.back();
            } catch (e: any) {
              Alert.alert("Error", e?.message ?? "Failed to block user");
            }
          },
        },
      ],
    );
  };

  const handleDeleteConversation = () => {
    actionsSheetRef.current?.close();
    if (!id) return;
    Alert.alert(
      "Delete conversation?",
      "This deletes the conversation for you. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const { deleteConversation } =
                await import("@/lib/firestore/chat");
              await deleteConversation(id);
              router.back();
            } catch (e: any) {
              Alert.alert(
                "Error",
                e?.message ?? "Failed to delete conversation",
              );
            }
          },
        },
      ],
    );
  };

  const handleSendMessage = async (
    content: string,
    attachments?: ChatAttachment[],
  ) => {
    if (!id) return;
    await sendMessage(content, id, attachments);
  };

  const handleMessageLongPress = (message: any) => {
    if (message.sender !== "me") return;
    if (message.is_deleted) return;
    Alert.alert("Delete message?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => void deleteMessage(id!, message.id),
      },
    ]);
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
          edges={["top", "left", "right", "bottom"]}
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
        edges={["top", "left", "right", "bottom"]}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        >
          <ChatHeader
            title={title}
            subtitle={subtitle}
            avatarUrl={otherUserAvatar}
            isOnline={otherUserOnline}
            onBackPress={() => {
              selectConversation(null);
              router.back();
            }}
            onTitlePress={
              otherUserId
                ? () => router.push(`/user/${otherUserId}` as any)
                : undefined
            }
            onMorePress={() => actionsSheetRef.current?.present()}
          />

          <ChatList
            messages={messages.map((msg) => ({
              id: msg.id,
              content: (msg as any).is_deleted ? null : (msg.content ?? ""),
              createdAtIso: msg.created_at,
              sender: msg.sender_id === user?.uid ? "me" : "other",
              timestamp: new Date(msg.created_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
              status: msg.read_at
                ? "read"
                : msg.delivered_at
                  ? "delivered"
                  : "sent",
              mediaUrl: (msg as any).is_deleted
                ? undefined
                : (msg.media_url ?? undefined),
              mediaType: (msg as any).is_deleted
                ? undefined
                : ((msg.media_type as any) ?? undefined),
              attachments: (msg as any).is_deleted ? [] : msg.attachments,
              is_deleted: (msg as any).is_deleted ?? false,
            }))}
            isLoading={loading.messages}
            onMessageLongPress={handleMessageLongPress}
          />

          <ChatInput
            onSendMessage={handleSendMessage}
            placeholder="Type a message..."
            disabled={loading.sending}
            conversationId={id}
            userId={user?.uid}
          />
        </KeyboardAvoidingView>

        <ChatActionsSheet
          ref={actionsSheetRef}
          username={subtitle.replace(/^@/, "")}
          isMuted={!!isMuted}
          onViewProfile={
            otherUserId
              ? () => {
                  actionsSheetRef.current?.close();
                  router.push(`/user/${otherUserId}` as any);
                }
              : undefined
          }
          onMute={
            otherUserId
              ? () => {
                  actionsSheetRef.current?.close();
                  muteMutation.mutate(!!isMuted);
                }
              : undefined
          }
          onBlock={otherUserId ? handleBlock : undefined}
          onReport={
            otherUserId
              ? () => {
                  actionsSheetRef.current?.close();
                  Alert.alert(
                    "Report",
                    "Thank you — we'll review this account.",
                  );
                }
              : undefined
          }
          onDeleteConversation={id ? handleDeleteConversation : undefined}
        />
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
});
