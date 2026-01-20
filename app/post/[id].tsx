import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type CommentType = {
  id: string;
  author: string;
  authorHandle: string;
  content: string;
  time: string;
  likes: number;
  isLiked: boolean;
};

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [comment, setComment] = useState('');
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showAllComments, setShowAllComments] = useState(false);

  // Mock post data based on the design
  const post = {
    id: id || '1',
    title: 'Unleash Your Creativity with Gerabah Making!',
    content: 'Get your hands dirty and create something beautiful!\nDiscover the art of gerabah making – from shaping clay to adding the final touches.',
    author: 'Shaveya Malik',
    authorHandle: '@shaveyamlk',
    authorAvatar: 'SM',
    time: '8 March 2025',
    likes: 172,
    comments: 80,
    shares: 12,
    isLiked: isLiked,
    isBookmarked: isBookmarked,
  };

  // Mock comments data
  const comments: CommentType[] = [
    {
      id: '1',
      author: 'Luca Hldn',
      authorHandle: '@lucahldn',
      content: 'Wow, this looks amazing! How long did it take you to make it?',
      time: '2 hours ago',
      likes: 24,
      isLiked: false,
    },
    {
      id: '2',
      author: 'Piah Lenas',
      authorHandle: '@piahlenas',
      content: 'Love the earthy texture and handmade charm of gerabah',
      time: '3 hours ago',
      likes: 18,
      isLiked: true,
    },
    {
      id: '3',
      author: 'Jolina Angine',
      authorHandle: '@jolinaangine',
      content: 'Perfect pottery for decor or daily use – simple and beautiful !',
      time: '4 hours ago',
      likes: 32,
      isLiked: false,
    },
    {
      id: '4',
      author: 'Aiden Blaze',
      authorHandle: '@aidenblaze',
      content: 'The detailing is incredible! Did you use any special tools?',
      time: '5 hours ago',
      likes: 15,
      isLiked: false,
    },
    {
      id: '5',
      author: 'Valerie Azer',
      authorHandle: '@valerieazr90',
      content: 'This inspired me to try pottery for the first time!',
      time: '6 hours ago',
      likes: 42,
      isLiked: true,
    },
  ];

  const displayedComments = showAllComments ? comments : comments.slice(0, 3);

  const handleLike = () => {
    setIsLiked(!isLiked);
  };

  const handleBookmark = () => {
    setIsBookmarked(!isBookmarked);
  };

  const handlePostComment = () => {
    if (comment.trim()) {
      // Handle comment posting
      console.log('Posting comment:', comment);
      setComment('');
    }
  };

  const toggleCommentLike = (commentId: string) => {
    // Handle comment like
    console.log('Toggling like for comment:', commentId);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Post</Text>
        <TouchableOpacity>
          <Ionicons name="ellipsis-horizontal" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Post Content */}
        <View style={styles.postContainer}>
          <View style={styles.postHeader}>
            <View style={styles.authorInfo}>
              <View style={styles.authorAvatar}>
                <Text style={styles.authorAvatarText}>{post.authorAvatar}</Text>
              </View>
              <View style={styles.authorDetails}>
                <Text style={styles.authorName}>{post.author}</Text>
                <Text style={styles.authorHandle}>{post.authorHandle}</Text>
              </View>
            </View>
            <TouchableOpacity>
              <Ionicons name="ellipsis-horizontal" size={20} color="#666" />
            </TouchableOpacity>
          </View>

          <Text style={styles.postTitle}>{post.title}</Text>
          <Text style={styles.postContent}>{post.content}</Text>
          <Text style={styles.postTime}>{post.time}</Text>

          {/* Post Image */}
          <View style={styles.postImage}>
            <View style={styles.imagePlaceholder}>
              <Ionicons name="image-outline" size={60} color="#999" />
              <Text style={styles.imageText}>Gerabah Making Process</Text>
            </View>
          </View>

          {/* Post Stats */}
          <View style={styles.postStats}>
            <View style={styles.statItem}>
              <Ionicons name="heart" size={20} color="#ff375f" />
              <Text style={styles.statText}>{post.likes.toLocaleString()}</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="chatbubble-outline" size={20} color="#666" />
              <Text style={styles.statText}>{post.comments.toLocaleString()}</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="arrow-redo-outline" size={20} color="#666" />
              <Text style={styles.statText}>{post.shares.toLocaleString()}</Text>
            </View>
          </View>

          {/* Post Actions */}
          <View style={styles.postActions}>
            <TouchableOpacity 
              style={styles.postAction}
              onPress={handleLike}
            >
              <Ionicons 
                name={post.isLiked ? "heart" : "heart-outline"} 
                size={24} 
                color={post.isLiked ? "#ff375f" : "#666"} 
              />
              <Text style={[
                styles.postActionText,
                post.isLiked && styles.likedActionText
              ]}>
                Like
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.postAction}>
              <Ionicons name="chatbubble-outline" size={24} color="#666" />
              <Text style={styles.postActionText}>Comment</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.postAction}>
              <Ionicons name="arrow-redo-outline" size={24} color="#666" />
              <Text style={styles.postActionText}>Share</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.postAction}
              onPress={handleBookmark}
            >
              <Ionicons 
                name={post.isBookmarked ? "bookmark" : "bookmark-outline"} 
                size={24} 
                color={post.isBookmarked ? "#007AFF" : "#666"} 
              />
              <Text style={[
                styles.postActionText,
                post.isBookmarked && styles.bookmarkedActionText
              ]}>
                Save
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Comments Section */}
        <View style={styles.commentsSection}>
          <View style={styles.commentsHeader}>
            <Text style={styles.commentsTitle}>Comments</Text>
            <Text style={styles.commentsCount}>{comments.length} comments</Text>
          </View>

          {/* Add Comment */}
          <View style={styles.addCommentContainer}>
            <View style={styles.userAvatarSmall}>
              <Text style={styles.userAvatarSmallText}>SM</Text>
            </View>
            <View style={styles.commentInputContainer}>
              <TextInput
                style={styles.commentInput}
                placeholder="Add a comment..."
                value={comment}
                onChangeText={setComment}
                multiline
              />
              <TouchableOpacity 
                style={[
                  styles.postCommentButton,
                  !comment.trim() && styles.postCommentButtonDisabled
                ]}
                onPress={handlePostComment}
                disabled={!comment.trim()}
              >
                <Ionicons name="send" size={20} color="#007AFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Comments List */}
          <View style={styles.commentsList}>
            {displayedComments.map((commentItem) => (
              <View key={commentItem.id} style={styles.commentItem}>
                <View style={styles.commentAuthor}>
                  <View style={styles.commentAuthorAvatar}>
                    <Text style={styles.commentAuthorAvatarText}>
                      {commentItem.author.charAt(0)}
                    </Text>
                  </View>
                  <View style={styles.commentAuthorInfo}>
                    <Text style={styles.commentAuthorName}>{commentItem.author}</Text>
                    <Text style={styles.commentAuthorHandle}>{commentItem.authorHandle}</Text>
                  </View>
                  <Text style={styles.commentTime}>{commentItem.time}</Text>
                </View>
                
                <Text style={styles.commentContent}>{commentItem.content}</Text>
                
                <View style={styles.commentActions}>
                  <TouchableOpacity 
                    style={styles.commentAction}
                    onPress={() => toggleCommentLike(commentItem.id)}
                  >
                    <Ionicons 
                      name={commentItem.isLiked ? "heart" : "heart-outline"} 
                      size={16} 
                      color={commentItem.isLiked ? "#ff375f" : "#666"} 
                    />
                    <Text style={styles.commentActionText}>{commentItem.likes}</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={styles.commentAction}>
                    <Ionicons name="chatbubble-outline" size={16} color="#666" />
                    <Text style={styles.commentActionText}>Reply</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={styles.commentAction}>
                    <Ionicons name="share-outline" size={16} color="#666" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {comments.length > 3 && !showAllComments && (
              <TouchableOpacity 
                style={styles.viewAllComments}
                onPress={() => setShowAllComments(true)}
              >
                <Text style={styles.viewAllCommentsText}>View All Comments</Text>
                <Ionicons name="chevron-down" size={16} color="#007AFF" />
              </TouchableOpacity>
            )}

            {showAllComments && (
              <TouchableOpacity 
                style={styles.viewAllComments}
                onPress={() => setShowAllComments(false)}
              >
                <Text style={styles.viewAllCommentsText}>Show Less Comments</Text>
                <Ionicons name="chevron-up" size={16} color="#007AFF" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Bottom Comment Input (Fixed) */}
      <View style={styles.bottomCommentContainer}>
        <View style={styles.bottomCommentInputContainer}>
          <TextInput
            style={styles.bottomCommentInput}
            placeholder="Add a comment..."
            value={comment}
            onChangeText={setComment}
          />
          <TouchableOpacity 
            style={[
              styles.bottomPostButton,
              !comment.trim() && styles.bottomPostButtonDisabled
            ]}
            onPress={handlePostComment}
            disabled={!comment.trim()}
          >
            <Text style={styles.bottomPostButtonText}>Post</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  postContainer: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  authorInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  authorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  authorAvatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  authorDetails: {
    flex: 1,
  },
  authorName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  authorHandle: {
    fontSize: 14,
    color: '#666',
  },
  postTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  postContent: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    marginBottom: 16,
  },
  postTime: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  postImage: {
    marginBottom: 20,
  },
  imagePlaceholder: {
    height: 200,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  postStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e1e1e1',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  postActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  postAction: {
    alignItems: 'center',
    padding: 8,
  },
  postActionText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  likedActionText: {
    color: '#ff375f',
  },
  bookmarkedActionText: {
    color: '#007AFF',
  },
  commentsSection: {
    padding: 20,
  },
  commentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  commentsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  commentsCount: {
    fontSize: 14,
    color: '#666',
  },
  addCommentContainer: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  userAvatarSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userAvatarSmallText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  commentInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e1e1e1',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  commentInput: {
    flex: 1,
    fontSize: 16,
    maxHeight: 80,
  },
  postCommentButton: {
    marginLeft: 8,
  },
  postCommentButtonDisabled: {
    opacity: 0.5,
  },
  commentsList: {
    marginBottom: 20,
  },
  commentItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  commentAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  commentAuthorAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  commentAuthorAvatarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  commentAuthorInfo: {
    flex: 1,
  },
  commentAuthorName: {
    fontSize: 14,
    fontWeight: '600',
  },
  commentAuthorHandle: {
    fontSize: 12,
    color: '#666',
  },
  commentTime: {
    fontSize: 12,
    color: '#999',
  },
  commentContent: {
    fontSize: 15,
    lineHeight: 22,
    color: '#333',
    marginBottom: 12,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentAction: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  commentActionText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  viewAllComments: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  viewAllCommentsText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
    marginRight: 4,
  },
  bottomCommentContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e1e1e1',
    backgroundColor: '#fff',
  },
  bottomCommentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bottomCommentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e1e1e1',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginRight: 12,
  },
  bottomPostButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
    borderRadius: 25,
  },
  bottomPostButtonDisabled: {
    opacity: 0.5,
  },
  bottomPostButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});