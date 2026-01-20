import ChatHeader from "@/components/chat/ChatHeader";
import ChatInput from "@/components/chat/ChatInput";
import ChatList from "@/components/chat/ChatList";
import ConversationItem from "@/components/chat/ConversationItem";
import { useAuth } from "@/hooks/useAuth";
import { useChat } from "@/hooks/useChat";
import { ChatConversation } from "@/lib/queries/chat";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ChatScreen() {
  const { user } = useAuth();
  const {
    conversations,
    messages,
    activeConversation,
    loading,
    selectConversation,
    sendMessage,
    loadConversations,
  } = useChat();

  const handleSendMessage = async (content: string) => {
    if (!activeConversation) return;
    await sendMessage(content, activeConversation);
  };

  const handleBack = () => {
    selectConversation(null);
  };

  // Helper function to get avatar URL
  const getAvatarUrl = (
    item: ChatConversation,
    userId?: string
  ): string | null => {
    // Return avatar_url if it exists
    if (item.avatar_url) return item.avatar_url;

    // For direct messages, get the other participant's avatar
    if (!item.is_group && item.participants?.length === 2 && userId) {
      const otherParticipant = item.participants.find(
        (p) => p.user_id !== userId
      );
      return otherParticipant?.profiles?.avatar_url || null;
    }

    return null;
  };

  // Helper function to get conversation name
  const getConversationName = (
    item: ChatConversation,
    userId?: string
  ): string => {
    if (item.name) return item.name;

    // For direct messages, use the other participant's name
    if (!item.is_group && item.participants?.length === 2 && userId) {
      const otherParticipant = item.participants.find(
        (p) => p.user_id !== userId
      );
      return (
        otherParticipant?.profiles?.full_name ||
        otherParticipant?.profiles?.username ||
        "Unknown User"
      );
    }

    // For group chats without a name, show participant count
    if (item.is_group) {
      return `${item.participants?.length || 0} members`;
    }

    return "Chat";
  };

  // Show chat interface if active conversation
  if (activeConversation) {
    const conversation = conversations.find((c) => c.id === activeConversation);

    return (
      <SafeAreaView style={styles.container}>
        <ChatHeader
          title={getConversationName(conversation!, user?.id)}
          subtitle={
            conversation?.is_group
              ? `${conversation.participants?.length || 0} members`
              : conversation?.participants?.find((p) => p.user_id !== user?.id)
                  ?.profiles?.username || ""
          }
          isOnline={conversation?.is_online || false}
          onBackPress={handleBack}
        />

        <ChatList
          messages={messages.map((msg) => ({
            id: msg.id,
            content: msg.content,
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
            mediaUrl: msg.media_url || undefined,
            mediaType: msg.media_type || undefined,
          }))}
          isLoading={loading.messages}
        />

        <ChatInput
          onSendMessage={handleSendMessage}
          placeholder="Type a message..."
          disabled={loading.sending}
        />
      </SafeAreaView>
    );
  }

  // Format timestamp helper
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

  // Show conversations list
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Chat</Text>
        <TouchableOpacity style={styles.newChatButton}>
          <Ionicons name="add" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      {loading.conversations ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={styles.loadingText}>Loading conversations...</Text>
        </View>
      ) : conversations.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="chatbubble-outline" size={64} color="#ccc" />
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
              onPress={() => selectConversation(item.id)}
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshing={loading.conversations}
          onRefresh={loadConversations}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e1e1e1",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#000",
  },
  newChatButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
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
    color: "#333",
  },
  emptyStateText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  listContent: {
    paddingTop: 8,
  },
});
