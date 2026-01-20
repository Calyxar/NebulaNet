// app/settings/saved-content.tsx
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface SavedItem {
  id: string;
  post_id: string;
  saved_at: string;
  post: {
    id: string;
    title: string;
    content: string;
    media_urls: string[];
    user: {
      username: string;
      avatar_url: string;
    };
  };
}

interface HiddenItem {
  id: string;
  post_id: string;
  hidden_at: string;
  post: {
    id: string;
    title: string;
    content: string;
    user: {
      username: string;
    };
  };
}

export default function SavedContentScreen() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'saved' | 'hidden'>('saved');

  const { data: savedItems, isLoading: isLoadingSaved } = useQuery({
    queryKey: ['saved-posts', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('saved_posts')
        .select(`
          id,
          post_id,
          saved_at,
          posts!inner (
            id,
            title,
            content,
            media_urls,
            users!inner (
              username,
              avatar_url
            )
          )
        `)
        .eq('user_id', user.id)
        .order('saved_at', { ascending: false });

      if (error) throw error;
      
      // Transform the data to match our interface
      return data.map(item => ({
        id: item.id,
        post_id: item.post_id,
        saved_at: item.saved_at,
        post: {
          id: item.posts[0]?.id || '',
          title: item.posts[0]?.title || '',
          content: item.posts[0]?.content || '',
          media_urls: item.posts[0]?.media_urls || [],
          user: {
            username: item.posts[0]?.users[0]?.username || '',
            avatar_url: item.posts[0]?.users[0]?.avatar_url || '',
          }
        }
      })) as SavedItem[];
    },
    enabled: !!user && activeTab === 'saved',
  });

  const { data: hiddenItems, isLoading: isLoadingHidden } = useQuery({
    queryKey: ['hidden-posts', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('hidden_posts')
        .select(`
          id,
          post_id,
          hidden_at,
          posts!inner (
            id,
            title,
            content,
            users!inner (
              username
            )
          )
        `)
        .eq('user_id', user.id)
        .order('hidden_at', { ascending: false });

      if (error) throw error;
      
      // Transform the data to match our interface
      return data.map(item => ({
        id: item.id,
        post_id: item.post_id,
        hidden_at: item.hidden_at,
        post: {
          id: item.posts[0]?.id || '',
          title: item.posts[0]?.title || '',
          content: item.posts[0]?.content || '',
          user: {
            username: item.posts[0]?.users[0]?.username || '',
          }
        }
      })) as HiddenItem[];
    },
    enabled: !!user && activeTab === 'hidden',
  });

  const renderSavedItem = ({ item }: { item: SavedItem }) => (
    <TouchableOpacity 
      style={styles.item}
      onPress={() => router.push(`/post/${item.post.id}`)}
    >
      <View style={styles.itemHeader}>
        <Text style={styles.itemUsername}>@{item.post.user.username}</Text>
        <Text style={styles.itemDate}>
          {new Date(item.saved_at).toLocaleDateString()}
        </Text>
      </View>
      
      {item.post.media_urls?.[0] && (
        <Image 
          source={{ uri: item.post.media_urls[0] }} 
          style={styles.itemImage}
          resizeMode="cover"
        />
      )}
      
      <Text style={styles.itemTitle} numberOfLines={2}>
        {item.post.title}
      </Text>
      <Text style={styles.itemContent} numberOfLines={3}>
        {item.post.content}
      </Text>
      
      <View style={styles.itemFooter}>
        <Ionicons name="bookmark" size={16} color="#007AFF" />
        <Text style={styles.savedText}>Saved</Text>
      </View>
    </TouchableOpacity>
  );

  const renderHiddenItem = ({ item }: { item: HiddenItem }) => (
    <View style={styles.item}>
      <View style={styles.itemHeader}>
        <Text style={styles.itemUsername}>@{item.post.user.username}</Text>
        <Text style={styles.itemDate}>
          {new Date(item.hidden_at).toLocaleDateString()}
        </Text>
      </View>
      
      <Text style={styles.itemTitle} numberOfLines={2}>
        {item.post.title}
      </Text>
      <Text style={styles.itemContent} numberOfLines={3}>
        {item.post.content}
      </Text>
      
      <View style={styles.itemFooter}>
        <Ionicons name="eye-off-outline" size={16} color="#666" />
        <Text style={styles.hiddenText}>Hidden</Text>
        <TouchableOpacity 
          style={styles.unhideButton}
          onPress={() => {/* Add unhide functionality */}}
        >
          <Text style={styles.unhideText}>Unhide</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Saved & Hidden Content</Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'saved' && styles.activeTab]}
          onPress={() => setActiveTab('saved')}
        >
          <Text style={[styles.tabText, activeTab === 'saved' && styles.activeTabText]}>
            Saved ({savedItems?.length || 0})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'hidden' && styles.activeTab]}
          onPress={() => setActiveTab('hidden')}
        >
          <Text style={[styles.tabText, activeTab === 'hidden' && styles.activeTabText]}>
            Hidden ({hiddenItems?.length || 0})
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'saved' ? (
        <FlatList
          data={savedItems}
          renderItem={renderSavedItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="bookmark-outline" size={64} color="#ccc" />
              <Text style={styles.emptyTitle}>No Saved Posts</Text>
              <Text style={styles.emptyDescription}>
                Posts you save will appear here for quick access
              </Text>
            </View>
          }
          refreshing={isLoadingSaved}
        />
      ) : (
        <FlatList
          data={hiddenItems}
          renderItem={renderHiddenItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="eye-off-outline" size={64} color="#ccc" />
              <Text style={styles.emptyTitle}>No Hidden Posts</Text>
              <Text style={styles.emptyDescription}>
                Posts you hide won&apos;t appear in your feed
              </Text>
            </View>
          }
          refreshing={isLoadingHidden}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginBottom: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  list: {
    padding: 16,
  },
  item: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  itemUsername: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  itemDate: {
    fontSize: 12,
    color: '#999',
  },
  itemImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginBottom: 12,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  itemContent: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  itemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  savedText: {
    fontSize: 14,
    color: '#007AFF',
    marginLeft: 6,
  },
  hiddenText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  unhideButton: {
    marginLeft: 'auto',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
  },
  unhideText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
});