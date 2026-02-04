// app/settings/language.tsx
import { useAuth } from "@/hooks/useAuth";
import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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
  { code: "en", name: "English", nativeName: "English" },
  { code: "es", name: "Spanish", nativeName: "Español" },
  { code: "fr", name: "French", nativeName: "Français" },
  { code: "de", name: "German", nativeName: "Deutsch" },
  { code: "zh", name: "Chinese", nativeName: "中文" },
  { code: "ja", name: "Japanese", nativeName: "日本語" },
  { code: "ko", name: "Korean", nativeName: "한국어" },
  { code: "ru", name: "Russian", nativeName: "Русский" },
  { code: "ar", name: "Arabic", nativeName: "العربية" },
  { code: "pt", name: "Portuguese", nativeName: "Português" },
  { code: "it", name: "Italian", nativeName: "Italiano" },
  { code: "nl", name: "Dutch", nativeName: "Nederlands" },
];

const REGIONS: Region[] = [
  { code: "US", name: "United States", flag: "🇺🇸" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "AU", name: "Australia", flag: "🇦🇺" },
  { code: "DE", name: "Germany", flag: "🇩🇪" },
  { code: "FR", name: "France", flag: "🇫🇷" },
  { code: "JP", name: "Japan", flag: "🇯🇵" },
  { code: "KR", name: "South Korea", flag: "🇰🇷" },
  { code: "CN", name: "China", flag: "🇨🇳" },
  { code: "IN", name: "India", flag: "🇮🇳" },
  { code: "BR", name: "Brazil", flag: "🇧🇷" },
  { code: "MX", name: "Mexico", flag: "🇲🇽" },
];

const ACCENT = "#7C3AED";
const BG = "#E8EAF6";
const CARD = "#FFFFFF";
const TEXT = "#111827";
const SUB = "#6B7280";
const BORDER = "#EEF2FF";

export default function LanguageRegionScreen() {
  const { profile, updateSettings } = useAuth();

  const initialLanguage = profile?.preferences?.language || "en";
  const initialRegion = profile?.preferences?.region || "US";
  const initialLocalized = !!profile?.preferences?.localized_content;

  const [selectedLanguage, setSelectedLanguage] = useState(initialLanguage);
  const [selectedRegion, setSelectedRegion] = useState(initialRegion);
  const [localizedContent, setLocalizedContent] = useState(initialLocalized);

  const languageLabel = useMemo(() => {
    return (
      LANGUAGES.find((l) => l.code === selectedLanguage)?.name || "English"
    );
  }, [selectedLanguage]);

  const regionLabel = useMemo(() => {
    return (
      REGIONS.find((r) => r.code === selectedRegion)?.name || "United States"
    );
  }, [selectedRegion]);

  const updatePref = (patch: any) => {
    updateSettings.mutate({
      preferences: { ...profile?.preferences, ...patch },
    });
  };

  const renderLanguageItem = ({ item }: { item: Language }) => (
    <TouchableOpacity
      style={[styles.row, selectedLanguage === item.code && styles.rowActive]}
      activeOpacity={0.85}
      onPress={() => {
        setSelectedLanguage(item.code);
        updatePref({ language: item.code });
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{item.name}</Text>
        <Text style={styles.rowSub}>{item.nativeName}</Text>
      </View>
      {selectedLanguage === item.code ? (
        <Ionicons name="checkmark-circle" size={22} color={ACCENT} />
      ) : (
        <Ionicons name="ellipse-outline" size={22} color="#D1D5DB" />
      )}
    </TouchableOpacity>
  );

  const renderRegionItem = ({ item }: { item: Region }) => (
    <TouchableOpacity
      style={[
        styles.regionTile,
        selectedRegion === item.code && styles.regionTileActive,
      ]}
      activeOpacity={0.85}
      onPress={() => {
        setSelectedRegion(item.code);
        updatePref({ region: item.code });
      }}
    >
      <View style={styles.regionTop}>
        <Text style={styles.flag}>{item.flag || "🌍"}</Text>
        {selectedRegion === item.code ? (
          <Ionicons name="checkmark-circle" size={20} color={ACCENT} />
        ) : (
          <Ionicons name="ellipse-outline" size={20} color="#D1D5DB" />
        )}
      </View>
      <Text style={styles.regionName} numberOfLines={1}>
        {item.name}
      </Text>
      <Text style={styles.regionCode}>{item.code}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        <View style={styles.headerCard}>
          <Text style={styles.title}>Language & Region</Text>
          <Text style={styles.subtitle}>
            Menus and formatting follow your selections. Recommendations can use
            region too.
          </Text>

          <View style={styles.pillsRow}>
            <View style={styles.pill}>
              <Ionicons name="language-outline" size={14} color={ACCENT} />
              <Text style={styles.pillText}>{languageLabel}</Text>
            </View>
            <View style={styles.pill}>
              <Ionicons name="location-outline" size={14} color={ACCENT} />
              <Text style={styles.pillText}>{regionLabel}</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Language</Text>
          <Text style={styles.sectionSub}>Changes menus and UI labels.</Text>

          <FlatList
            data={LANGUAGES}
            renderItem={renderLanguageItem}
            keyExtractor={(i) => i.code}
            scrollEnabled={false}
          />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Region</Text>
          <Text style={styles.sectionSub}>
            Affects formats + local recommendations.
          </Text>

          <FlatList
            data={REGIONS}
            renderItem={renderRegionItem}
            keyExtractor={(i) => i.code}
            scrollEnabled={false}
            numColumns={2}
            columnWrapperStyle={{ gap: 10 }}
            contentContainerStyle={{ gap: 10, paddingTop: 10 }}
          />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Content localization</Text>
          <Text style={styles.sectionSub}>
            Show more posts from your region and in your preferred language.
          </Text>

          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Show localized content</Text>
            <Switch
              value={localizedContent}
              onValueChange={(v) => {
                setLocalizedContent(v);
                updatePref({ localized_content: v });
              }}
            />
          </View>
        </View>

        <Text style={styles.footer}>
          Some changes may require restarting the app.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  container: { flex: 1 },
  content: { paddingBottom: 24 },

  headerCard: {
    margin: 16,
    marginBottom: 10,
    backgroundColor: CARD,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  title: { fontSize: 20, fontWeight: "800", color: TEXT },
  subtitle: { fontSize: 12, color: SUB, marginTop: 6, lineHeight: 18 },

  pillsRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  pill: {
    flex: 1,
    backgroundColor: "#F7F5FF",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: BORDER,
  },
  pillText: { fontSize: 12, fontWeight: "900", color: ACCENT },

  sectionCard: {
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: CARD,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  sectionTitle: { fontSize: 14, fontWeight: "900", color: TEXT },
  sectionSub: { fontSize: 12, color: SUB, marginTop: 6, lineHeight: 18 },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  rowActive: {},
  rowTitle: { fontSize: 14, fontWeight: "800", color: TEXT },
  rowSub: { fontSize: 12, color: SUB, marginTop: 3 },

  regionTile: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  regionTileActive: {
    borderColor: "#DDD6FE",
    backgroundColor: "#F7F5FF",
  },
  regionTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  flag: { fontSize: 22 },
  regionName: { marginTop: 10, fontSize: 13, fontWeight: "900", color: TEXT },
  regionCode: { marginTop: 4, fontSize: 11, color: SUB, fontWeight: "800" },

  toggleRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  toggleLabel: { fontSize: 13, fontWeight: "800", color: TEXT },

  footer: {
    textAlign: "center",
    fontSize: 12,
    color: SUB,
    paddingHorizontal: 16,
    marginTop: 14,
  },
});
