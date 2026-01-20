import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface MessageItemProps {
  id: string;
  content: string;
  sender: 'me' | 'other';
  timestamp: string;
  status?: 'sent' | 'delivered' | 'read';
  onPress?: () => void;
  onLongPress?: () => void;
}

export default function MessageItem({
  content,
  sender,
  timestamp,
  status = 'sent',
  onPress,
  onLongPress,
}: MessageItemProps) {
  const isMe = sender === 'me';

  const getStatusIcon = () => {
    switch (status) {
      case 'read':
        return <Ionicons name="checkmark-done" size={12} color="#007AFF" />;
      case 'delivered':
        return <Ionicons name="checkmark-done" size={12} color="#666" />;
      case 'sent':
        return <Ionicons name="checkmark" size={12} color="#666" />;
      default:
        return null;
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
      style={[
        styles.container,
        isMe ? styles.containerMe : styles.containerOther,
      ]}
    >
      <View style={[
        styles.messageBubble,
        isMe ? styles.messageBubbleMe : styles.messageBubbleOther,
      ]}>
        <Text style={[
          styles.messageText,
          isMe ? styles.messageTextMe : styles.messageTextOther,
        ]}>
          {content}
        </Text>
      </View>
      
      <View style={[
        styles.footer,
        isMe ? styles.footerMe : styles.footerOther,
      ]}>
        <Text style={styles.timestamp}>{timestamp}</Text>
        {isMe && (
          <View style={styles.statusContainer}>
            {getStatusIcon()}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    maxWidth: '80%',
  },
  containerMe: {
    alignSelf: 'flex-end',
  },
  containerOther: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  messageBubbleMe: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  messageBubbleOther: {
    backgroundColor: '#f0f0f0',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  messageTextMe: {
    color: '#fff',
  },
  messageTextOther: {
    color: '#000',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  footerMe: {
    justifyContent: 'flex-end',
  },
  footerOther: {
    justifyContent: 'flex-start',
  },
  timestamp: {
    fontSize: 11,
    color: '#666',
  },
  statusContainer: {
    marginLeft: 4,
  },
});