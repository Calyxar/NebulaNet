import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import {
    FlatList,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type PostType = {
  id: string;
  title: string;
  content: string;
  author: string;
  authorHandle: string;
  time: string;
  likes: number;
  comments: number;
  shares: number;
  isLiked: boolean;
  isBookmarked: boolean;
};

type MemberType = {
  id: string;
  name: string;
  handle: string;
  isOnline: boolean;
  isFollowing: boolean;
};

export default function CommunityScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [isJoined, setIsJoined] = useState(true);
  const [activeTab, setActiveTab] = useState<'feed' | 'members' | 'rules' | 'media'>('feed');
  const [postContent, setPostContent] = useState('');

  // Mock community data based on the designs
  const community = {
    id: '1',
    name: slug ? slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'NebulaNet Photography',
    slug: slug || 'nebulanet-photography',
    description: 'Where good energy flows and real people connect deeply - a space for authenticity, meaningful bonds, shared growth, open hearts, positive vibes, and true belonging.',
    memberCount: '10.2k',
    onlineCount: '1.4k',
    postsCount: '45.7k',
    rules: [
      'Be respectful and kind to all members',
      'No hate speech or discrimination',
      'Keep content photography-related',
      'Credit original photographers',
      'No spam or self-promotion',
    ],
  };

  // Mock posts data
  const posts: PostType[] = [
    {
      id: '1',
      title: 'Sunset Magic',
      content: 'Captured this beautiful sunset yesterday evening. The colors were absolutely breathtaking!',
      author: 'Sarah Chen',
      authorHandle: '@sarahchen',
      time: '2 hours ago',
      likes: 324,
      comments: 42,
      shares: 18,
      isLiked: true,
      isBookmarked: false,
    },
    {
      id: '2',
      title: 'Urban Exploration Tips',
      content: 'Sharing some tips for urban photography beginners: Always check permissions, be aware of your surroundings, and golden hour is your best friend!',
      author: 'Marcus Lee',
      authorHandle: '@marcuslee',
      time: '5 hours ago',
      likes: 189,
      comments: 31,
      shares: 9,
      isLiked: false,
      isBookmarked: true,
    },
    {
      id: '3',
      title: 'New Lens Day!',
      content: 'Just got my new 24-70mm f/2.8 and I\'m loving it so far. The sharpness is incredible!',
      author: 'Alex Morgan',
      authorHandle: '@alexmorgan',
      time: '1 day ago',
      likes: 512,
      comments: 67,
      shares: 24,
      isLiked: true,
      isBookmarked: false,
    },
  ];

  // Mock members data
  const members: MemberType[] = [
    { id: '1', name: 'Sarah Chen', handle: '@sarahchen', isOnline: true, isFollowing: true },
    { id: '2', name: 'Marcus Lee', handle: '@marcuslee', isOnline: true, isFollowing: true },
    { id: '3', name: 'Alex Morgan', handle: '@alexmorgan', isOnline: false, isFollowing: false },
    { id: '4', name: 'Jessica Wong', handle: '@jessicawong', isOnline: true, isFollowing: true },
    { id: '5', name: 'David Park', handle: '@davidpark', isOnline: true, isFollowing: false },
    { id: '6', name: 'Emma Davis', handle: '@emmadavis', isOnline: false, isFollowing: true },
  ];

  const renderPost = ({ item }: { item: PostType }) => (
    <View style={styles.postCard}>
      <View style={styles.postHeader}>
        <View style={styles.authorInfo}>
          <View style={styles.authorAvatar}>
            <Text style={styles.authorAvatarText}>
              {item.author.charAt(0)}
            </Text>
          </View>
          <View style={styles.authorDetails}>
            <Text style={styles.authorName}>{item.author}</Text>
            <Text style={styles.authorHandle}>{item.authorHandle} • {item.time}</Text>
          </View>
        </View>
        <TouchableOpacity>
          <Ionicons name="ellipsis-horizontal" size={20} color="#666" />
        </TouchableOpacity>
      </View>

      <Text style={styles.postTitle}>{item.title}</Text>
      <Text style={styles.postContent}>{item.content}</Text>

      <View style={styles.postStats}>
        <Text style={styles.postStat}>
          {item.likes.toLocaleString()} likes
        </Text>
        <Text style={styles.postStat}>
          {item.comments.toLocaleString()} comments
        </Text>
        <Text style={styles.postStat}>
          {item.shares.toLocaleString()} shares
        </Text>
      </View>

      <View style={styles.postActions}>
        <TouchableOpacity style={styles.postAction}>
          <Ionicons 
            name={item.isLiked ? "heart" : "heart-outline"} 
            size={22} 
            color={item.isLiked ? "#ff375f" : "#666"} 
          />
          <Text style={styles.postActionText}>Like</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.postAction}>
          <Ionicons name="chatbubble-outline" size={22} color="#666" />
          <Text style={styles.postActionText}>Comment</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.postAction}>
          <Ionicons name="arrow-redo-outline" size={22} color="#666" />
          <Text style={styles.postActionText}>Share</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.postAction}>
          <Ionicons 
            name={item.isBookmarked ? "bookmark" : "bookmark-outline"} 
            size={22} 
            color={item.isBookmarked ? "#007AFF" : "#666"} 
          />
          <Text style={styles.postActionText}>Save</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderMember = ({ item }: { item: MemberType }) => (
    <View style={styles.memberCard}>
      <View style={styles.memberInfo}>
        <View style={styles.memberAvatar}>
          <Text style={styles.memberAvatarText}>
            {item.name.charAt(0)}
          </Text>
          {item.isOnline && <View style={styles.onlineIndicator} />}
        </View>
        <View style={styles.memberDetails}>
          <Text style={styles.memberName}>{item.name}</Text>
          <Text style={styles.memberHandle}>{item.handle}</Text>
        </View>
      </View>
      <TouchableOpacity 
        style={[
          styles.followButton,
          item.isFollowing && styles.followingButton
        ]}
      >
        <Text style={[
          styles.followButtonText,
          item.isFollowing && styles.followingButtonText
        ]}>
          {item.isFollowing ? 'Following' : 'Follow'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{community.name}</Text>
        <TouchableOpacity>
          <Ionicons name="search-outline" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Community Header */}
        <View style={styles.communityHeader}>
          <View style={styles.communityBanner}>
            <View style={styles.bannerPlaceholder}>
              <Ionicons name="camera" size={40} color="#999" />
              <Text style={styles.bannerText}>Community Banner</Text>
            </View>
          </View>

          <View style={styles.communityInfo}>
            <View style={styles.communityAvatar}>
              <Text style={styles.communityAvatarText}>
                {community.name.charAt(0)}
              </Text>
            </View>
            
            <View style={styles.communityStats}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{community.memberCount}</Text>
                <Text style={styles.statLabel}>Members</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{community.onlineCount}</Text>
                <Text style={styles.statLabel}>Online</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{community.postsCount}</Text>
                <Text style={styles.statLabel}>Posts</Text>
              </View>
            </View>

            <Text style={styles.communityDescription}>
              {community.description}
            </Text>

            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={[
                  styles.joinButton,
                  isJoined && styles.joinedButton
                ]}
                onPress={() => setIsJoined(!isJoined)}
              >
                <Ionicons 
                  name={isJoined ? "checkmark" : "add"} 
                  size={20} 
                  color={isJoined ? "#007AFF" : "#fff"} 
                />
                <Text style={[
                  styles.joinButtonText,
                  isJoined && styles.joinedButtonText
                ]}>
                  {isJoined ? 'Joined' : 'Join Community'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.shareButton}>
                <Ionicons name="share-outline" size={20} color="#007AFF" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.moreButton}>
                <Ionicons name="ellipsis-horizontal" size={20} color="#007AFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          {(['feed', 'members', 'rules', 'media'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.activeTab]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[
                styles.tabText,
                activeTab === tab && styles.activeTabText
              ]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
              {activeTab === tab && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
          ))}
        </View>

        {/* Create Post */}
        {activeTab === 'feed' && isJoined && (
          <View style={styles.createPostContainer}>
            <View style={styles.createPostHeader}>
              <View style={styles.userAvatarSmall}>
                <Text style={styles.userAvatarSmallText}>SM</Text>
              </View>
              <TextInput
                style={styles.postInput}
                placeholder="Share something with the community..."
                value={postContent}
                onChangeText={setPostContent}
                multiline
              />
            </View>
            <View style={styles.createPostActions}>
              <TouchableOpacity style={styles.mediaButton}>
                <Ionicons name="image-outline" size={20} color="#666" />
                <Text style={styles.mediaButtonText}>Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.mediaButton}>
                <Ionicons name="videocam-outline" size={20} color="#666" />
                <Text style={styles.mediaButtonText}>Video</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.mediaButton}>
                <Ionicons name="location-outline" size={20} color="#666" />
                <Text style={styles.mediaButtonText}>Location</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.postButton,
                  !postContent.trim() && styles.postButtonDisabled
                ]}
                disabled={!postContent.trim()}
              >
                <Text style={styles.postButtonText}>Post</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Content based on active tab */}
        {activeTab === 'feed' && (
          <FlatList
            data={posts}
            renderItem={renderPost}
            keyExtractor={item => item.id}
            scrollEnabled={false}
            contentContainerStyle={styles.postsList}
          />
        )}

        {activeTab === 'members' && (
          <View style={styles.membersContainer}>
            <View style={styles.membersHeader}>
              <Text style={styles.membersCount}>
                {members.length} Members Online
              </Text>
              <TouchableOpacity>
                <Ionicons name="person-add-outline" size={22} color="#007AFF" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={members}
              renderItem={renderMember}
              keyExtractor={item => item.id}
              scrollEnabled={false}
              contentContainerStyle={styles.membersList}
            />
          </View>
        )}

        {activeTab === 'rules' && (
          <View style={styles.rulesContainer}>
            <Text style={rulesStyles.title}>Community Rules</Text>
            <Text style={rulesStyles.subtitle}>
              Please follow these guidelines to ensure a positive experience for everyone
            </Text>
            
            {community.rules.map((rule, index) => (
              <View key={index} style={rulesStyles.ruleItem}>
                <View style={rulesStyles.ruleNumber}>
                  <Text style={rulesStyles.ruleNumberText}>{index + 1}</Text>
                </View>
                <Text style={rulesStyles.ruleText}>{rule}</Text>
              </View>
            ))}

            <View style={rulesStyles.reportSection}>
              <Ionicons name="warning-outline" size={24} color="#ff9500" />
              <Text style={rulesStyles.reportText}>
                If you see any content that violates these rules, please report it to the community moderators.
              </Text>
            </View>
          </View>
        )}

        {activeTab === 'media' && (
          <View style={styles.mediaContainer}>
            <Text style={styles.mediaTitle}>Community Media</Text>
            <View style={styles.mediaGrid}>
              {[1, 2, 3, 4, 5, 6].map((item) => (
                <View key={item} style={styles.mediaItem}>
                  <View style={styles.mediaPlaceholder}>
                    <Ionicons name="image-outline" size={32} color="#999" />
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
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
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  communityHeader: {
    backgroundColor: '#fff',
  },
  communityBanner: {
    height: 120,
    backgroundColor: '#f5f5f5',
  },
  bannerPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerText: {
    marginTop: 8,
    fontSize: 14,
    color: '#999',
  },
  communityInfo: {
    padding: 16,
    marginTop: -30,
  },
  communityAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
    alignSelf: 'flex-start',
  },
  communityAvatarText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  communityStats: {
    flexDirection: 'row',
    marginTop: 60,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  communityDescription: {
    fontSize: 15,
    lineHeight: 22,
    color: '#333',
    marginBottom: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  joinButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginRight: 12,
  },
  joinedButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  joinedButtonText: {
    color: '#007AFF',
  },
  shareButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  moreButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  activeTab: {
    position: 'relative',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#666',
  },
  activeTabText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    width: '80%',
    height: 3,
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
  createPostContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  createPostHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
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
  postInput: {
    flex: 1,
    fontSize: 16,
    minHeight: 40,
    paddingVertical: 8,
  },
  createPostActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mediaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  mediaButtonText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#666',
  },
  postButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#007AFF',
    borderRadius: 20,
  },
  postButtonDisabled: {
    opacity: 0.5,
  },
  postButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  postsList: {
    padding: 16,
  },
  postCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e1e1e1',
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  authorInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  authorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  authorAvatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  authorDetails: {
    flex: 1,
  },
  authorName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  authorHandle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  postTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  postContent: {
    fontSize: 16,
    lineHeight: 22,
    color: '#333',
    marginBottom: 16,
  },
  postStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  postStat: {
    fontSize: 14,
    color: '#666',
    marginRight: 16,
    marginBottom: 4,
  },
  postActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#e1e1e1',
    paddingTop: 12,
  },
  postAction: {
    alignItems: 'center',
    padding: 4,
  },
  postActionText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  membersContainer: {
    padding: 16,
  },
  membersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  membersCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  membersList: {
    paddingBottom: 16,
  },
  memberCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  memberAvatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#34C759',
    borderWidth: 2,
    borderColor: '#fff',
  },
  memberDetails: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  memberHandle: {
    fontSize: 14,
    color: '#666',
  },
  followButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    minWidth: 100,
  },
  followingButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e1e1e1',
  },
  followButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  followingButtonText: {
    color: '#333',
  },
  rulesContainer: {
    padding: 16,
  },
  mediaContainer: {
    padding: 16,
  },
  mediaTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  mediaItem: {
    width: '33.33%',
    padding: 4,
  },
  mediaPlaceholder: {
    aspectRatio: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

const rulesStyles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
    marginBottom: 24,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  ruleNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  ruleNumberText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  ruleText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    color: '#333',
  },
  reportSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff7e6',
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
  },
  reportText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginLeft: 12,
  },
});