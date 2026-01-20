// app/settings/notifications.tsx - FIXED
import { SettingsGroup, SettingsItem } from '@/components/settings';
import { useSettings } from '@/hooks/useSettings';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function NotificationsScreen() {
  const { settings, updateNotifications } = useSettings();

  const handlePushFrequency = () => {
    Alert.alert(
      'Push Notification Frequency',
      'Choose how often you receive push notifications',
      [
        {
          text: 'Immediate',
          onPress: () => updateNotifications.mutate({ push_frequency: 'immediate' }),
        },
        {
          text: 'Daily Digest',
          onPress: () => updateNotifications.mutate({ push_frequency: 'daily' }),
        },
        {
          text: 'Weekly Digest',
          onPress: () => updateNotifications.mutate({ push_frequency: 'weekly' }),
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const getPushFrequencyText = () => {
    const frequency = settings?.notifications?.push_frequency;
    switch (frequency) {
      case 'daily': return 'Daily Digest';
      case 'weekly': return 'Weekly Digest';
      default: return 'Immediate';
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Community Notifications</Text>
        <Text style={styles.headerDescription}>
          Control how and when you receive notifications
        </Text>
      </View>

      <SettingsGroup title="Activity Notifications">
        <SettingsItem
          title="Likes & Reactions"
          description="When someone likes or reacts to your content"
          toggle
          toggleValue={settings?.notifications?.likes}
          onToggle={(value) => updateNotifications.mutate({ likes: value })}
        />
        <SettingsItem
          title="Comments & Replies"
          description="When someone comments on your posts"
          toggle
          toggleValue={settings?.notifications?.comments}
          onToggle={(value) => updateNotifications.mutate({ comments: value })}
        />
        <SettingsItem
          title="Mentions"
          description="When someone mentions you"
          toggle
          toggleValue={settings?.notifications?.mentions}
          onToggle={(value) => updateNotifications.mutate({ mentions: value })}
        />
        <SettingsItem
          title="New Followers"
          description="When someone follows you"
          toggle
          toggleValue={settings?.notifications?.follows}
          onToggle={(value) => updateNotifications.mutate({ follows: value })}
        />
        <SettingsItem
          title="Direct Messages"
          description="When you receive a new message"
          toggle
          toggleValue={settings?.notifications?.direct_messages}
          onToggle={(value) => updateNotifications.mutate({ direct_messages: value })}
        />
      </SettingsGroup>

      <SettingsGroup title="Community Updates">
        <SettingsItem
          title="Community Announcements"
          description="Important updates from communities you follow"
          toggle
          toggleValue={settings?.notifications?.community_updates}
          onToggle={(value) => updateNotifications.mutate({ community_updates: value })}
        />
        <SettingsItem
          title="Trending Posts"
          description="Popular posts in your communities"
          toggle
          toggleValue={settings?.notifications?.trending_posts}
          onToggle={(value) => updateNotifications.mutate({ trending_posts: value })}
        />
        <SettingsItem
          title="Friend Activity"
          description="When friends join or post in communities"
          toggle
          toggleValue={settings?.notifications?.friend_activity}
          onToggle={(value) => updateNotifications.mutate({ friend_activity: value })}
        />
      </SettingsGroup>

      <SettingsGroup title="System Notifications">
        <SettingsItem
          title="Security Alerts"
          description="Important security-related notifications"
          toggle
          toggleValue={settings?.notifications?.security_alerts}
          onToggle={(value) => updateNotifications.mutate({ security_alerts: value })}
        />
        <SettingsItem
          title="System Updates"
          description="App updates and maintenance notices"
          toggle
          toggleValue={settings?.notifications?.system_updates}
          onToggle={(value) => updateNotifications.mutate({ system_updates: value })}
        />
        <SettingsItem
          title="Account Activity"
          description="Login attempts and account changes"
          toggle
          toggleValue={settings?.notifications?.account_activity}
          onToggle={(value) => updateNotifications.mutate({ account_activity: value })}
        />
      </SettingsGroup>

      <SettingsGroup title="Notification Preferences">
        <SettingsItem
          title="Notification Frequency"
          description="How often you receive push notifications"
          value={getPushFrequencyText()}
          onPress={handlePushFrequency}
        />
        <SettingsItem
          title="Marketing Emails"
          description="Receive updates about new features"
          toggle
          toggleValue={settings?.notifications?.marketing_emails}
          onToggle={(value) => updateNotifications.mutate({ marketing_emails: value })}
        />
        <SettingsItem
          title="Weekly Newsletter"
          description="Receive weekly community highlights"
          toggle
          toggleValue={settings?.notifications?.weekly_newsletter}
          onToggle={(value) => updateNotifications.mutate({ weekly_newsletter: value })}
        />
      </SettingsGroup>
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
});