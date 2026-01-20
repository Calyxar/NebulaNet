import { Ionicons } from '@expo/vector-icons';
import React, { useRef } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import MessageItem from './MessageItem';

// Export the Message interface
export interface Message {
  id: string;
  content: string;
  sender: 'me' | 'other';
  timestamp: string;
  status?: 'sent' | 'delivered' | 'read';
}

interface ChatListProps {
  messages: Message[];
  isLoading?: boolean;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  onLoadMore?: () => void;
  onMessagePress?: (message: Message) => void;
  onMessageLongPress?: (message: Message) => void;
  emptyComponent?: React.ReactElement;
  showDateHeaders?: boolean;
}

export default function ChatList({
  messages,
  isLoading = false,
  isRefreshing = false,
  onRefresh,
  onLoadMore,
  onMessagePress,
  onMessageLongPress,
  emptyComponent,
  showDateHeaders = true,
}: ChatListProps) {
  const flatListRef = useRef<FlatList>(null);

  // Group messages by date
  const groupMessagesByDate = () => {
    const groups: { [date: string]: Message[] } = {};
    
    messages.forEach((message) => {
      const date = new Date(message.timestamp).toLocaleDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    });
    
    return groups;
  };

  const renderDateHeader = (date: string) => (
    <View style={styles.dateHeader}>
      <Text style={styles.dateHeaderText}>{date}</Text>
    </View>
  );

  const renderEmpty = () => {
    if (emptyComponent) return emptyComponent;
    
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="chatbubble-ellipses-outline" size={64} color="#e1e1e1" />
        <Text style={styles.emptyTitle}>No messages yet</Text>
        <Text style={styles.emptySubtitle}>
          Start a conversation by sending a message
        </Text>
      </View>
    );
  };

  const renderFooter = () => {
    if (!isLoading) return null;
    
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color="#007AFF" />
      </View>
    );
  };

  const groupedMessages = groupMessagesByDate();
  const dates = Object.keys(groupedMessages);

  if (showDateHeaders && dates.length > 0) {
    return (
      <FlatList
        ref={flatListRef}
        data={dates}
        renderItem={({ item: date }) => (
          <View>
            {renderDateHeader(date)}
            {groupedMessages[date].map((message) => (
              <MessageItem
                key={message.id}
                {...message}
                onPress={() => onMessagePress?.(message)}
                onLongPress={() => onMessageLongPress?.(message)}
              />
            ))}
          </View>
        )}
        keyExtractor={(date) => date}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor="#007AFF"
            />
          ) : undefined
        }
        onEndReached={onLoadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        inverted={false}
      />
    );
  }

  return (
    <FlatList
      ref={flatListRef}
      data={messages}
      renderItem={({ item }) => (
        <MessageItem
          {...item}
          onPress={() => onMessagePress?.(item)}
          onLongPress={() => onMessageLongPress?.(item)}
        />
      )}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor="#007AFF"
          />
        ) : undefined
      }
      onEndReached={onLoadMore}
      onEndReachedThreshold={0.5}
      ListEmptyComponent={renderEmpty}
      ListFooterComponent={renderFooter}
      inverted={false}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexGrow: 1,
  },
  dateHeader: {
    alignItems: 'center',
    marginVertical: 16,
  },
  dateHeaderText: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});