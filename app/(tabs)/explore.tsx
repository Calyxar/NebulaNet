import { Ionicons } from '@expo/vector-icons';
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

const trendingTopics = [
  { id: '1', title: 'Gerabah Making', category: 'Art & Craft', posts: '2.4k' },
  { id: '2', title: 'Plant Progress', category: 'Gardening', posts: '1.8k' },
  { id: '3', title: 'Skincare Upgrade', category: 'Wellness', posts: '3.2k' },
  { id: '4', title: 'Night Photography', category: 'Photography', posts: '1.5k' },
];

const communities = [
  { id: '1', name: 'NebulaNet Photography', members: '10.2k' },
  { id: '2', name: 'HeartLink Collective', members: '8.7k' },
  { id: '3', name: 'Farm Harmony', members: '5.4k' },
  { id: '4', name: 'PartyPlanet Crew', members: '12.3k' },
];

export default function ExploreScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('trending');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.time}>9:41</Text>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Categories */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesContainer}
      >
        {['Trending', 'Account', 'Post', 'Community'].map((category) => (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryButton,
              activeCategory === category.toLowerCase() && styles.activeCategoryButton,
            ]}
            onPress={() => setActiveCategory(category.toLowerCase())}
          >
            <Text
              style={[
                styles.categoryText,
                activeCategory === category.toLowerCase() && styles.activeCategoryText,
              ]}
            >
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={styles.content}>
        {activeCategory === 'trending' && (
          <>
            <Text style={styles.sectionTitle}>Trending Topics</Text>
            {trendingTopics.map((topic) => (
              <TouchableOpacity key={topic.id} style={styles.topicCard}>
                <View style={styles.topicInfo}>
                  <Text style={styles.topicTitle}>{topic.title}</Text>
                  <Text style={styles.topicCategory}>{topic.category}</Text>
                </View>
                <View style={styles.topicStats}>
                  <Text style={styles.topicPosts}>{topic.posts} posts</Text>
                  <Ionicons name="chevron-forward" size={20} color="#999" />
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}

        <Text style={styles.sectionTitle}>Recommended Communities</Text>
        {communities.map((community) => (
          <TouchableOpacity key={community.id} style={styles.communityCard}>
            <View style={styles.communityInfo}>
              <View style={styles.communityAvatar}>
                <Text style={styles.communityAvatarText}>
                  {community.name.charAt(0)}
                </Text>
              </View>
              <View style={styles.communityDetails}>
                <Text style={styles.communityName}>{community.name}</Text>
                <Text style={styles.communityMembers}>
                  {community.members} members
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.joinButton}>
              <Text style={styles.joinButtonText}>Join</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
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
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  time: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
  },
  categoriesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  activeCategoryButton: {
    backgroundColor: '#007AFF',
  },
  categoryText: {
    fontSize: 14,
    color: '#666',
  },
  activeCategoryText: {
    color: '#fff',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    marginTop: 8,
  },
  topicCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    marginBottom: 12,
  },
  topicInfo: {
    flex: 1,
  },
  topicTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  topicCategory: {
    fontSize: 14,
    color: '#666',
  },
  topicStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  topicPosts: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  communityCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    marginBottom: 12,
  },
  communityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  communityAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  communityAvatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  communityDetails: {
    flex: 1,
  },
  communityName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  communityMembers: {
    fontSize: 14,
    color: '#666',
  },
  joinButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#007AFF',
    borderRadius: 20,
  },
  joinButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});