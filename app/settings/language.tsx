// app/settings/language.tsx — UPDATED ✅ dark mode
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Localization from "expo-localization";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  ScrollView,
  StatusBar,
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

function getDeviceFallback() {
  const tag = Localization.getLocales?.()?.[0]?.languageTag || "en-US";
  const [langRaw, regionRaw] = tag.split("-");
  const lang = (langRaw || "en").toLowerCase();
  const region = (regionRaw || "US").toUpperCase();
  return {
    language: LANGUAGES.some((l) => l.code === lang) ? lang : "en",
    region: REGIONS.some((r) => r.code === region) ? region : "US",
  };
}

export default function LanguageRegionScreen() {
  const { user, userSettings, isUserSettingsLoading, updateSettings } =
    useAuth();
  const { colors, isDark } = useTheme();

  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [selectedRegion, setSelectedRegion] = useState("US");
  const [localizedContent, setLocalizedContent] = useState(false);
  const [hydratedOnce, setHydratedOnce] = useState(false);

  useEffect(() => {
    if (!user?.id || isUserSettingsLoading) return;
    const dbLang =
      userSettings &&
      "language" in userSettings &&
      typeof (userSettings as any).language === "string"
        ? ((userSettings as any).language || "").toLowerCase() || null
        : null;
    const dbRegion =
      userSettings &&
      "region" in userSettings &&
      typeof (userSettings as any).region === "string"
        ? ((userSettings as any).region || "").toUpperCase() || null
        : null;
    const dbLocalized = !!(userSettings && "localized_content" in userSettings
      ? (userSettings as any).localized_content
      : false);

    if (dbLang || dbRegion) {
      setSelectedLanguage(dbLang || "en");
      setSelectedRegion(dbRegion || "US");
      setLocalizedContent(dbLocalized);
      setHydratedOnce(true);
      return;
    }
    if (!hydratedOnce) {
      const fallback = getDeviceFallback();
      setSelectedLanguage(fallback.language);
      setSelectedRegion(fallback.region);
      setLocalizedContent(false);
      setHydratedOnce(true);
      void updateSettings({
        language: fallback.language,
        region: fallback.region,
        localized_content: false,
      });
    }
  }, [
    user?.id,
    isUserSettingsLoading,
    userSettings,
    hydratedOnce,
    updateSettings,
  ]);

  const languageLabel = useMemo(
    () =>
      LANGUAGES.find((l) => l.code === selectedLanguage)?.nativeName ??
      selectedLanguage,
    [selectedLanguage],
  );
  const regionLabel = useMemo(
    () =>
      REGIONS.find((r) => r.code === selectedRegion)?.name ?? selectedRegion,
    [selectedRegion],
  );

  const save = (patch: {
    language?: string;
    region?: string;
    localized_content?: boolean;
  }) => {
    if (!user?.id) return;
    void updateSettings(patch);
  };

  const content = (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "transparent" }}
      edges={["left", "right"]}
    >
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[
            styles.backBtn,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
          onPress={() => router.back()}
          activeOpacity={0.85}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Language & Region
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* Current selection pills */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            Language & Region
          </Text>
          <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
            Menus and formatting follow your selections. Recommendations can use
            region too.
          </Text>
          <View style={styles.pillsRow}>
            {[
              { icon: "language-outline", label: languageLabel },
              { icon: "location-outline", label: regionLabel },
            ].map(({ icon, label }) => (
              <View
                key={icon}
                style={[
                  styles.pill,
                  {
                    backgroundColor: colors.primary + "12",
                    borderColor: colors.primary + "30",
                  },
                ]}
              >
                <Ionicons name={icon as any} size={14} color={colors.primary} />
                <Text style={[styles.pillText, { color: colors.primary }]}>
                  {label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Language list */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Language
          </Text>
          <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>
            Changes menus and UI labels.
          </Text>
          <FlatList
            data={LANGUAGES}
            scrollEnabled={false}
            keyExtractor={(i) => i.code}
            renderItem={({ item, index }) => (
              <TouchableOpacity
                style={[
                  styles.row,
                  { borderBottomColor: colors.border },
                  index === LANGUAGES.length - 1 && { borderBottomWidth: 0 },
                ]}
                activeOpacity={0.85}
                onPress={() => {
                  setSelectedLanguage(item.code);
                  save({ language: item.code });
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowTitle, { color: colors.text }]}>
                    {item.name}
                  </Text>
                  <Text
                    style={[styles.rowSub, { color: colors.textSecondary }]}
                  >
                    {item.nativeName}
                  </Text>
                </View>
                <Ionicons
                  name={
                    selectedLanguage === item.code
                      ? "checkmark-circle"
                      : "ellipse-outline"
                  }
                  size={22}
                  color={
                    selectedLanguage === item.code
                      ? colors.primary
                      : colors.border
                  }
                />
              </TouchableOpacity>
            )}
          />
        </View>

        {/* Region grid */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Region
          </Text>
          <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>
            Affects formats and local recommendations.
          </Text>
          <FlatList
            data={REGIONS}
            scrollEnabled={false}
            keyExtractor={(i) => i.code}
            numColumns={2}
            columnWrapperStyle={{ gap: 10 }}
            contentContainerStyle={{ gap: 10, paddingTop: 10 }}
            renderItem={({ item }) => {
              const active = selectedRegion === item.code;
              return (
                <TouchableOpacity
                  style={[
                    styles.regionTile,
                    {
                      backgroundColor: active
                        ? colors.primary + "12"
                        : colors.surface,
                      borderColor: active
                        ? colors.primary + "50"
                        : colors.border,
                    },
                  ]}
                  activeOpacity={0.85}
                  onPress={() => {
                    setSelectedRegion(item.code);
                    save({ region: item.code });
                  }}
                >
                  <View style={styles.regionTop}>
                    <Text style={styles.flag}>{item.flag || "🌍"}</Text>
                    <Ionicons
                      name={active ? "checkmark-circle" : "ellipse-outline"}
                      size={20}
                      color={active ? colors.primary : colors.border}
                    />
                  </View>
                  <Text
                    style={[styles.regionName, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
                  <Text
                    style={[styles.regionCode, { color: colors.textSecondary }]}
                  >
                    {item.code}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>

        {/* Localization toggle */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Content Localization
          </Text>
          <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>
            Show more posts from your region and in your preferred language.
          </Text>
          <View
            style={[
              styles.toggleRow,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.toggleLabel, { color: colors.text }]}>
              Show localized content
            </Text>
            <Switch
              value={localizedContent}
              onValueChange={(v) => {
                setLocalizedContent(v);
                save({ localized_content: v });
              }}
              trackColor={{ false: colors.border, true: colors.primary + "60" }}
              thumbColor={
                localizedContent ? colors.primary : colors.textTertiary
              }
            />
          </View>
        </View>

        <Text style={[styles.footer, { color: colors.textTertiary }]}>
          Some changes may require restarting the app.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );

  if (!isDark) {
    return (
      <LinearGradient
        colors={["#DCEBFF", "#EEF4FF", "#FFFFFF"]}
        locations={[0, 0.45, 1]}
        style={{ flex: 1 }}
      >
        {content}
      </LinearGradient>
    );
  }
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 10,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  headerTitle: { fontSize: 17, fontWeight: "800" },
  scroll: { padding: 16, paddingBottom: 28, gap: 10 },
  card: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  cardTitle: { fontSize: 17, fontWeight: "800" },
  cardSub: { fontSize: 12, marginTop: 6, lineHeight: 18 },
  pillsRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  pill: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
  },
  pillText: { fontSize: 12, fontWeight: "900" },
  sectionTitle: { fontSize: 14, fontWeight: "900" },
  sectionSub: { fontSize: 12, marginTop: 6, lineHeight: 18 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  rowTitle: { fontSize: 14, fontWeight: "800" },
  rowSub: { fontSize: 12, marginTop: 3 },
  regionTile: { flex: 1, borderRadius: 16, padding: 12, borderWidth: 1 },
  regionTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  flag: { fontSize: 22 },
  regionName: { marginTop: 10, fontSize: 13, fontWeight: "900" },
  regionCode: { marginTop: 4, fontSize: 11, fontWeight: "800" },
  toggleRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
  },
  toggleLabel: { fontSize: 13, fontWeight: "800" },
  footer: {
    textAlign: "center",
    fontSize: 12,
    paddingHorizontal: 16,
    marginTop: 4,
  },
});
