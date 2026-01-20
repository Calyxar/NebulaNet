// app/settings/blocked.tsx - FIXED
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface BlockedUser {
  id: string;
  blocked_id: string;
  created_at: string;
  profile: {
    username: string;
    full_name?: string;
    avatar_url?: string;
  };
}

interface MutedUser {
  id: string;
  muted_id: string;
  created_at: string;
  profile: {
    username: string;
    full_name?: string;
    avatar_url?: string;
  };
}

export default function BlockedAccountsScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'blocked' | 'muted'>('blocked');

  const { data: blockedUsers, isLoading: isLoadingBlocked } = useQuery({
    queryKey: ['blocked-users', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('blocked_users')
        .select(`
          id,
          blocked_id,
          created_at,
          profiles!blocked_users_blocked_id_fkey (
            username,
            full_name,
            avatar_url
          )
        `)
        .eq('blocker_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transform the data to match our interface
      return (data || []).map((item: any) => ({
        id: item.id,
        blocked_id: item.blocked_id,
        created_at: item.created_at,
        profile: item.profiles?.[0] || { username: 'Unknown User' }
      })) as BlockedUser[];
    },
    enabled: !!user,
  });

  const { data: mutedUsers, isLoading: isLoadingMuted } = useQuery({
    queryKey: ['muted-users', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('muted_users')
        .select(`
          id,
          muted_id,
          created_at,
          profiles!muted_users_muted_id_fkey (
            username,
            full_name,
            avatar_url
          )
        `)
        .eq('muter_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return (data || []).map((item: any) => ({
        id: item.id,
        muted_id: item.muted_id,
        created_at: item.created_at,
        profile: item.profiles?.[0] || { username: 'Unknown User' }
      })) as MutedUser[];
    },
    enabled: !!user,
  });

  const unblockUser = useMutation({
    mutationFn: async (blockedUserId: string) => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('blocked_users')
        .delete()
        .eq('blocker_id', user.id)
        .eq('blocked_id', blockedUserId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocked-users', user?.id] });
    },
  });

  const unmuteUser = useMutation({
    mutationFn: async (mutedUserId: string) => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('muted_users')
        .delete()
        .eq('muter_id', user.id)
        .eq('muted_id', mutedUserId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['muted-users', user?.id] });
    },
  });

  const renderBlockedUser = ({ item }: { item: BlockedUser }) => (
    <View style={styles.userItem}>
      <View style={styles.avatarPlaceholder}>
        <Ionicons name="person" size={24} color="#666" />
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>
          {item.profile.full_name || item.profile.username}
        </Text>
        <Text style={styles.userUsername}>@{item.profile.username}</Text>
        <Text style={styles.userDate}>
          Blocked on {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.unblockButton}
        onPress={() => {
          Alert.alert(
            'Unblock User',
            `Are you sure you want to unblock @${item.profile.username}? They will be able to see your profile and interact with you again.`,
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Unblock',
                style: 'destructive',
                onPress: () => unblockUser.mutate(item.blocked_id),
              },
            ]
          );
        }}
        disabled={unblockUser.isPending}
      >
        <Text style={styles.unblockButtonText}>
          {unblockUser.isPending ? '...' : 'Unblock'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderMutedUser = ({ item }: { item: MutedUser }) => (
    <View style={styles.userItem}>
      <View style={styles.avatarPlaceholder}>
        <Ionicons name="person" size={24} color="#666" />
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>
          {item.profile.full_name || item.profile.username}
        </Text>
        <Text style={styles.userUsername}>@{item.profile.username}</Text>
        <Text style={styles.userDate}>
          Muted on {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.unmuteButton}
        onPress={() => {
          Alert.alert(
            'Unmute User',
            `Are you sure you want to unmute @${item.profile.username}? You will start seeing their posts and comments again.`,
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Unmute',
                onPress: () => unmuteUser.mutate(item.muted_id),
              },
            ]
          );
        }}
        disabled={unmuteUser.isPending}
      >
        <Text style={styles.unmuteButtonText}>
          {unmuteUser.isPending ? '...' : 'Unmute'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Blocked & Muted Accounts</Text>
        <Text style={styles.headerDescription}>
          Manage users you&apos;ve blocked or muted
        </Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'blocked' && styles.activeTab]}
          onPress={() => setActiveTab('blocked')}
        >
          <Ionicons 
            name="ban-outline" 
            size={20} 
            color={activeTab === 'blocked' ? '#007AFF' : '#666'} 
          />
          <Text style={[styles.tabText, activeTab === 'blocked' && styles.activeTabText]}>
            Blocked ({blockedUsers?.length || 0})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'muted' && styles.activeTab]}
          onPress={() => setActiveTab('muted')}
        >
          <Ionicons 
            name="volume-mute-outline" 
            size={20} 
            color={activeTab === 'muted' ? '#007AFF' : '#666'} 
          />
          <Text style={[styles.tabText, activeTab === 'muted' && styles.activeTabText]}>
            Muted ({mutedUsers?.length || 0})
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'blocked' ? (
        <FlatList
          data={blockedUsers}
          renderItem={renderBlockedUser}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={64} color="#ccc" />
              <Text style={styles.emptyTitle}>No Blocked Users</Text>
              <Text style={styles.emptyDescription}>
                Users you block won&apos;t be able to see your profile or interact with you
              </Text>
            </View>
          }
          refreshing={isLoadingBlocked}
        />
      ) : (
        <FlatList
          data={mutedUsers}
          renderItem={renderMutedUser}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="volume-mute-outline" size={64} color="#ccc" />
              <Text style={styles.emptyTitle}>No Muted Users</Text>
              <Text style={styles.emptyDescription}>
                Users you mute won&apos;t appear in your feed or notifications
              </Text>
            </View>
          }
          refreshing={isLoadingMuted}
        />
      )}

      <View style={styles.infoBox}>
        <Ionicons name="information-circle-outline" size={20} color="#666" />
        <View style={styles.infoContent}>
          <Text style={styles.infoTitle}>What&apos;s the difference?</Text>
          <Text style={styles.infoText}>
            <Text style={styles.infoBold}>Blocked users</Text> cannot see your profile or interact with you in any way.
            {'\n'}
            <Text style={styles.infoBold}>Muted users</Text> can still see your profile, but you won&apos;t see their posts or comments.
          </Text>
        </View>
      </View>
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
    marginBottom: 8,
  },
  headerDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginBottom: 1,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
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
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  userUsername: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  userDate: {
    fontSize: 12,
    color: '#999',
  },
  unblockButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#ff3b30',
    borderRadius: 6,
  },
  unblockButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  unmuteButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#007AFF',
    borderRadius: 6,
  },
  unmuteButtonText: {
    color: 'white',
    fontSize: 14,
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
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#e8f4f8',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  infoBold: {
    fontWeight: '600',
    color: '#000',
  },
});