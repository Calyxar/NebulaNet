import Avatar from '@/components/user/Avatar';
import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface CommentItemProps {
  id: string;
  content: string;
  author: {
    id: string;
    name: string;
    username: string;
    avatar?: string;
  };
  timestamp: string;
  likes: number;
  isLiked: boolean;
  replies?: number;
  isReply?: boolean;
  onLikePress?: () => void;
  onReplyPress?: () => void;
  onMorePress?: () => void;
}

export default function CommentItem({
  id,
  content,
  author,
  timestamp,
  likes,
  isLiked,
  replies = 0,
  isReply = false,
  onLikePress,
  onReplyPress,
  onMorePress,
}: CommentItemProps) {
  const [expanded, setExpanded] = useState(false);

  const handleLike = () => {
    onLikePress?.();
  };

  const toggleExpand = () => {
    setExpanded(!expanded);
  };

  const displayContent = expanded || content.length <= 200 
    ? content 
    : `${content.substring(0, 200)}...`;

  return (
    <View style={[
      styles.container,
      isReply && styles.replyContainer,
    ]}>
      <View style={styles.header}>
        <Link href={`/user/${author.username}`} asChild>
          <TouchableOpacity style={styles.authorInfo}>
            <Avatar 
              size={isReply ? 32 : 40}
              name={author.name}
              image={author.avatar}
            />
            <View style={styles.authorDetails}>
              <Text style={[
                styles.authorName,
                isReply && styles.replyAuthorName,
              ]}>
                {author.name}
              </Text>
              <Text style={styles.timestamp}>{timestamp}</Text>
            </View>
          </TouchableOpacity>
        </Link>
        
        <TouchableOpacity onPress={onMorePress} style={styles.moreButton}>
          <Ionicons name="ellipsis-horizontal" size={18} color="#666" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.text}>
          {displayContent}
          {content.length > 200 && !expanded && (
            <Text style={styles.readMore} onPress={toggleExpand}>
              {' '}Read more
            </Text>
          )}
          {expanded && (
            <Text style={styles.readMore} onPress={toggleExpand}>
              {' '}Show less
            </Text>
          )}
        </Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={handleLike}
        >
          <Ionicons 
            name={isLiked ? "heart" : "heart-outline"} 
            size={18} 
            color={isLiked ? "#ff375f" : "#666"} 
          />
          <Text style={[
            styles.actionText,
            isLiked && styles.likedText,
          ]}>
            {likes > 0 ? likes : ''} Like
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={onReplyPress}
        >
          <Ionicons name="return-up-forward-outline" size={18} color="#666" />
          <Text style={styles.actionText}>
            Reply
          </Text>
        </TouchableOpacity>

        {replies > 0 && (
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="chatbubble-outline" size={16} color="#666" />
            <Text style={styles.actionText}>
              {replies} {replies === 1 ? 'reply' : 'replies'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  replyContainer: {
    backgroundColor: '#f9f9f9',
    marginLeft: 16,
    borderRadius: 12,
    borderBottomWidth: 0,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  authorInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  authorDetails: {
    flex: 1,
    marginLeft: 12,
  },
  authorName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  replyAuthorName: {
    fontSize: 14,
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
  },
  moreButton: {
    padding: 4,
  },
  content: {
    marginBottom: 12,
  },
  text: {
    fontSize: 15,
    lineHeight: 20,
    color: '#333',
  },
  readMore: {
    color: '#007AFF',
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  actionText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 4,
  },
  likedText: {
    color: '#ff375f',
  },
});