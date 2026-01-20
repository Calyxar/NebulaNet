// app/settings/language.tsx
import { useAuth } from '@/hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Language {
  code: string;
  name: string;
  nativeName: string;
}

interface Region {
  code: string;
  name: string;
  flag?: string;
}

const LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
];

const REGIONS: Region[] = [
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵' },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷' },
  { code: 'CN', name: 'China', flag: '🇨🇳' },
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽' },
];

export default function LanguageRegionScreen() {
  const { profile, updateSettings } = useAuth();
  const [selectedLanguage, setSelectedLanguage] = useState(profile?.preferences?.language || 'en');
  const [selectedRegion, setSelectedRegion] = useState(profile?.preferences?.region || 'US');

  const handleLanguageSelect = (languageCode: string) => {
    setSelectedLanguage(languageCode);
    updateSettings.mutate({
      preferences: { language: languageCode }
    });
  };

  const handleRegionSelect = (regionCode: string) => {
    setSelectedRegion(regionCode);
    updateSettings.mutate({
      preferences: { region: regionCode }
    });
  };

  const renderLanguageItem = ({ item }: { item: Language }) => (
    <TouchableOpacity
      style={styles.listItem}
      onPress={() => handleLanguageSelect(item.code)}
    >
      <View style={styles.listItemContent}>
        <Text style={styles.listItemTitle}>{item.name}</Text>
        <Text style={styles.listItemSubtitle}>{item.nativeName}</Text>
      </View>
      {selectedLanguage === item.code && (
        <Ionicons name="checkmark-circle" size={24} color="#007AFF" />
      )}
    </TouchableOpacity>
  );

  const renderRegionItem = ({ item }: { item: Region }) => (
    <TouchableOpacity
      style={styles.listItem}
      onPress={() => handleRegionSelect(item.code)}
    >
      <View style={styles.listItemContent}>
        {item.flag && (
          <Text style={styles.flag}>{item.flag}</Text>
        )}
        <Text style={styles.listItemTitle}>{item.name}</Text>
        <Text style={styles.listItemSubtitle}>{item.code}</Text>
      </View>
      {selectedRegion === item.code && (
        <Ionicons name="checkmark-circle" size={24} color="#007AFF" />
      )}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Language & Region</Text>
        <Text style={styles.headerDescription}>
          Choose your preferred language and region for content display
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Language</Text>
        <Text style={styles.sectionDescription}>
          This will change the language for menus and buttons in the app
        </Text>
        <FlatList
          data={LANGUAGES}
          renderItem={renderLanguageItem}
          keyExtractor={(item) => item.code}
          scrollEnabled={false}
          style={styles.list}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Region</Text>
        <Text style={styles.sectionDescription}>
          This affects content recommendations and date/time formats
        </Text>
        <FlatList
          data={REGIONS}
          renderItem={renderRegionItem}
          keyExtractor={(item) => item.code}
          scrollEnabled={false}
          style={styles.list}
          numColumns={2}
          columnWrapperStyle={styles.regionGrid}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Content Localization</Text>
        <View style={styles.localizationCard}>
          <Text style={styles.localizationTitle}>Localized Content</Text>
          <Text style={styles.localizationDescription}>
            When enabled, NebulaNet will show more content from your selected region and in your preferred language.
          </Text>
          <View style={styles.localizationToggle}>
            <Text style={styles.localizationToggleText}>Show localized content</Text>
            {/* Add toggle switch here */}
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Some features may require restarting the app for changes to take full effect.
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
  section: {
    backgroundColor: 'white',
    marginBottom: 16,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  list: {
    backgroundColor: 'white',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  listItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  listItemTitle: {
    fontSize: 16,
    color: '#000',
    marginRight: 8,
  },
  listItemSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  flag: {
    fontSize: 24,
    marginRight: 12,
  },
  regionGrid: {
    justifyContent: 'space-between',
  },
  localizationCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 16,
  },
  localizationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  localizationDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  localizationToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  localizationToggleText: {
    fontSize: 14,
    color: '#000',
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