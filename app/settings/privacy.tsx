// app/settings/privacy.tsx
import { SettingsGroup, SettingsItem } from '@/components/settings';
import { useAuth } from '@/hooks/useAuth';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function PrivacyScreen() {
  const { profile, updateSettings } = useAuth();

  const handleVisibilityChange = () => {
    Alert.alert(
      'Profile Visibility',
      'Choose who can see your profile and posts',
      [
        {
          text: 'Public',
          onPress: () => updateSettings.mutate({
            privacy: { profile_visibility: 'public' }
          }),
        },
        {
          text: 'Friends Only',
          onPress: () => updateSettings.mutate({
            privacy: { profile_visibility: 'friends_only' }
          }),
        },
        {
          text: 'Private',
          onPress: () => updateSettings.mutate({
            privacy: { profile_visibility: 'private' }
          }),
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleMessagePrivacy = () => {
    Alert.alert(
      'Who Can Message You',
      'Choose who can send you direct messages',
      [
        {
          text: 'Everyone',
          onPress: () => updateSettings.mutate({
            privacy: { who_can_message_me: 'everyone' }
          }),
        },
        {
          text: 'Friends Only',
          onPress: () => updateSettings.mutate({
            privacy: { who_can_message_me: 'friends' }
          }),
        },
        {
          text: 'Nobody',
          onPress: () => updateSettings.mutate({
            privacy: { who_can_message_me: 'nobody' }
          }),
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleCommentPrivacy = () => {
    Alert.alert(
      'Who Can Comment',
      'Choose who can comment on your posts',
      [
        {
          text: 'Everyone',
          onPress: () => updateSettings.mutate({
            privacy: { who_can_comment: 'everyone' }
          }),
        },
        {
          text: 'Friends Only',
          onPress: () => updateSettings.mutate({
            privacy: { who_can_comment: 'friends' }
          }),
        },
        {
          text: 'Nobody',
          onPress: () => updateSettings.mutate({
            privacy: { who_can_comment: 'nobody' }
          }),
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const getVisibilityText = () => {
    switch (profile?.privacy_settings?.profile_visibility) {
      case 'public': return 'Public (Anyone)';
      case 'friends_only': return 'Friends Only';
      case 'private': return 'Private (Only Me)';
      default: return 'Public (Anyone)';
    }
  };

  const getMessagePrivacyText = () => {
    switch (profile?.privacy_settings?.who_can_message_me) {
      case 'everyone': return 'Everyone';
      case 'friends': return 'Friends Only';
      case 'nobody': return 'Nobody';
      default: return 'Everyone';
    }
  };

  const getCommentPrivacyText = () => {
    switch (profile?.privacy_settings?.who_can_comment) {
      case 'everyone': return 'Everyone';
      case 'friends': return 'Friends Only';
      case 'nobody': return 'Nobody';
      default: return 'Everyone';
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Privacy & Visibility</Text>
        <Text style={styles.headerDescription}>
          Control your privacy settings and manage what others can see
        </Text>
      </View>

      <SettingsGroup title="Profile Privacy">
        <SettingsItem
          title="Profile Visibility"
          description="Who can see your profile and posts"
          value={getVisibilityText()}
          onPress={handleVisibilityChange}
        />
        <SettingsItem
          title="Show Online Status"
          description="Let others see when you're online"
          toggle
          toggleValue={profile?.privacy_settings?.show_online_status}
          onToggle={(value) => updateSettings.mutate({
            privacy: { show_online_status: value }
          })}
        />
        <SettingsItem
          title="Allow Search Indexing"
          description="Allow search engines to index your profile"
          toggle
          toggleValue={profile?.privacy_settings?.allow_search_indexing}
          onToggle={(value) => updateSettings.mutate({
            privacy: { allow_search_indexing: value }
          })}
        />
      </SettingsGroup>

      <SettingsGroup title="Interactions">
        <SettingsItem
          title="Who Can Message You"
          description="Control who can send you direct messages"
          value={getMessagePrivacyText()}
          onPress={handleMessagePrivacy}
        />
        <SettingsItem
          title="Who Can Comment"
          description="Control who can comment on your posts"
          value={getCommentPrivacyText()}
          onPress={handleCommentPrivacy}
        />
        <SettingsItem
          title="Allow Tagging"
          description="Allow others to tag you in posts and comments"
          toggle
          toggleValue={profile?.privacy_settings?.allow_tagging}
          onToggle={(value) => updateSettings.mutate({
            privacy: { allow_tagging: value }
          })}
        />
      </SettingsGroup>

      <SettingsGroup title="Content Privacy">
        <SettingsItem
          title="Hide Likes Count"
          description="Hide the number of likes on your posts"
          toggle
          toggleValue={profile?.privacy_settings?.hide_likes_count}
          onToggle={(value) => updateSettings.mutate({
            privacy: { hide_likes_count: value }
          })}
        />
        <SettingsItem
          title="Hide Followers Count"
          description="Hide your follower and following counts"
          toggle
          toggleValue={profile?.privacy_settings?.hide_followers_count}
          onToggle={(value) => updateSettings.mutate({
            privacy: { hide_followers_count: value }
          })}
        />
        <SettingsItem
          title="Hide Posts from Search"
          description="Prevent your posts from appearing in search results"
          toggle
          toggleValue={profile?.privacy_settings?.hide_from_search}
          onToggle={(value) => updateSettings.mutate({
            privacy: { hide_from_search: value }
          })}
        />
      </SettingsGroup>

      <SettingsGroup title="Data Privacy">
        <SettingsItem
          title="Personalized Ads"
          description="Allow personalized advertising based on your activity"
          toggle
          toggleValue={profile?.privacy_settings?.personalized_ads}
          onToggle={(value) => updateSettings.mutate({
            privacy: { personalized_ads: value }
          })}
        />
        <SettingsItem
          title="Data Sharing"
          description="Control how your data is shared with partners"
          onPress={() => Alert.alert('Coming Soon', 'Data sharing controls coming soon')}
        />
        <SettingsItem
          title="Clear Search History"
          description="Delete your search history"
          danger
          onPress={() => {
            Alert.alert(
              'Clear Search History',
              'This will permanently delete your search history. This action cannot be undone.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Clear',
                  style: 'destructive',
                  onPress: () => {
                    // Implement clear search history
                    Alert.alert('Success', 'Search history cleared');
                  },
                },
              ]
            );
          }}
        />
      </SettingsGroup>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Privacy settings help you control your experience on NebulaNet. 
          Changes may take a few minutes to apply across all systems.
        </Text>
      </View>
    </ScrollView>
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
    marginBottom: 16,
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
  footer: {
    padding: 20,
    marginBottom: 16,
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    lineHeight: 18,
  },
});