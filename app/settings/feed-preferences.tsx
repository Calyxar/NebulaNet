// app/settings/feed-preferences.tsx - FIXED
import { SettingsGroup, SettingsItem } from '@/components/settings';
import { useSettings } from '@/hooks/useSettings';
import { UserPreferences } from '@/types/settings';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function FeedPreferencesScreen() {
  const { settings, updatePreferences } = useSettings();

  const handleToggle = (key: keyof UserPreferences, value: boolean) => {
    if (settings?.preferences) {
      updatePreferences.mutate({ [key]: value });
    }
  };

  const handleStringUpdate = (key: keyof UserPreferences, value: string) => {
    if (settings?.preferences) {
      updatePreferences.mutate({ [key]: value as any });
    }
  };

  const handleFeedDensity = () => {
    Alert.alert(
      'Feed Density',
      'Choose how posts are displayed in your feed',
      [
        { text: 'Compact', onPress: () => handleStringUpdate('feed_density', 'compact') },
        { text: 'Normal', onPress: () => handleStringUpdate('feed_density', 'normal') },
        { text: 'Relaxed', onPress: () => handleStringUpdate('feed_density', 'relaxed') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const getFeedDensityText = () => {
    const density = settings?.preferences?.feed_density;
    switch (density) {
      case 'compact': return 'Compact';
      case 'relaxed': return 'Relaxed';
      default: return 'Normal';
    }
  };

  const getDefaultSortText = () => {
    const sort = settings?.preferences?.default_sort;
    switch (sort) {
      case 'hot': return 'Hot';
      case 'new': return 'New';
      case 'top': return 'Top';
      default: return 'Best';
    }
  };

  const getFontSizeText = () => {
    const size = settings?.preferences?.font_size;
    switch (size) {
      case 'small': return 'Small';
      case 'large': return 'Large';
      default: return 'Medium';
    }
  };

  const handleDefaultSort = () => {
    Alert.alert(
      'Default Sort',
      'Choose default sorting for your feed',
      [
        { text: 'Best', onPress: () => handleStringUpdate('default_sort', 'best') },
        { text: 'Hot', onPress: () => handleStringUpdate('default_sort', 'hot') },
        { text: 'New', onPress: () => handleStringUpdate('default_sort', 'new') },
        { text: 'Top', onPress: () => handleStringUpdate('default_sort', 'top') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleFontSize = () => {
    Alert.alert(
      'Font Size',
      'Choose text size for posts',
      [
        { text: 'Small', onPress: () => handleStringUpdate('font_size', 'small') },
        { text: 'Medium', onPress: () => handleStringUpdate('font_size', 'medium') },
        { text: 'Large', onPress: () => handleStringUpdate('font_size', 'large') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Feed Preferences</Text>
        <Text style={styles.headerDescription}>
          Customize how content appears in your feed
        </Text>
      </View>

      <SettingsGroup title="Content Display">
        <SettingsItem
          title="Show NSFW Content"
          description="Display content marked as not safe for work"
          toggle
          toggleValue={settings?.preferences?.show_nsfw}
          onToggle={(value) => handleToggle('show_nsfw', value)}
        />
        <SettingsItem
          title="Auto-play Media"
          description="Automatically play videos and GIFs"
          toggle
          toggleValue={settings?.preferences?.auto_play_media}
          onToggle={(value) => handleToggle('auto_play_media', value)}
        />
        <SettingsItem
          title="Show Image Descriptions"
          description="Display alt text for images"
          toggle
          toggleValue={settings?.preferences?.show_image_descriptions}
          onToggle={(value) => handleToggle('show_image_descriptions', value)}
        />
        <SettingsItem
          title="Feed Density"
          description="Control spacing between posts"
          value={getFeedDensityText()}
          onPress={handleFeedDensity}
        />
      </SettingsGroup>

      <SettingsGroup title="Content Filtering">
        <SettingsItem
          title="Hide Spoilers"
          description="Blur posts marked as containing spoilers"
          toggle
          toggleValue={settings?.preferences?.hide_spoilers}
          onToggle={(value) => handleToggle('hide_spoilers', value)}
        />
      </SettingsGroup>

      <SettingsGroup title="Sorting & Organization">
        <SettingsItem
          title="Default Sort"
          description="Default order for posts"
          value={getDefaultSortText()}
          onPress={handleDefaultSort}
        />
        <SettingsItem
          title="Group Similar Posts"
          description="Group related posts together"
          toggle
          toggleValue={settings?.preferences?.group_similar_posts}
          onToggle={(value) => handleToggle('group_similar_posts', value)}
        />
        <SettingsItem
          title="Collapse Long Threads"
          description="Automatically collapse long comment threads"
          toggle
          toggleValue={settings?.preferences?.collapse_long_threads}
          onToggle={(value) => handleToggle('collapse_long_threads', value)}
        />
      </SettingsGroup>

      <SettingsGroup title="Advanced">
        <SettingsItem
          title="Reduce Animations"
          description="Minimize motion and animations"
          toggle
          toggleValue={settings?.preferences?.reduce_animations}
          onToggle={(value) => handleToggle('reduce_animations', value)}
        />
        <SettingsItem
          title="Font Size"
          description="Adjust text size in posts"
          value={getFontSizeText()}
          onPress={handleFontSize}
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