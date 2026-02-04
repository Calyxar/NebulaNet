// app/settings/feed-preferences.tsx
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useSettings } from "@/hooks/useSettings";
import { UserPreferences } from "@/types/settings";

type RowItem = {
  title: string;
  description?: string;
  icon: keyof typeof Ionicons.glyphMap;
  rightText?: string;
  onPress?: () => void;
  toggle?: boolean;
  toggleValue?: boolean;
  onToggle?: (value: boolean) => void;
};

function Card({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{title}</Text>
    </View>
  );
}

function TogglePill({ value }: { value: boolean }) {
  return (
    <View
      style={[styles.togglePill, value ? styles.toggleOn : styles.toggleOff]}
    >
      <View
        style={[
          styles.toggleDot,
          value ? styles.toggleDotOn : styles.toggleDotOff,
        ]}
      />
      <Text
        style={[
          styles.toggleText,
          value ? styles.toggleTextOn : styles.toggleTextOff,
        ]}
      >
        {value ? "On" : "Off"}
      </Text>
    </View>
  );
}

function Row({ item, isLast }: { item: RowItem; isLast?: boolean }) {
  const press = () => {
    if (item.toggle && item.onToggle) item.onToggle(!item.toggleValue);
    else item.onPress?.();
  };

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={press}
      style={[styles.row, isLast && { borderBottomWidth: 0 }]}
    >
      <View style={styles.rowIcon}>
        <Ionicons name={item.icon} size={18} color="#7C3AED" />
      </View>

      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{item.title}</Text>
        {!!item.description && (
          <Text style={styles.rowDesc}>{item.description}</Text>
        )}
      </View>

      <View style={styles.rowRight}>
        {!!item.rightText && (
          <Text style={styles.rowRightText}>{item.rightText}</Text>
        )}
        {item.toggle ? (
          <TogglePill value={!!item.toggleValue} />
        ) : (
          <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function FeedPreferencesScreen() {
  const { settings, updatePreferences } = useSettings();

  const handleToggle = (key: keyof UserPreferences, value: boolean) => {
    if (settings?.preferences) updatePreferences.mutate({ [key]: value });
  };

  const handleStringUpdate = (key: keyof UserPreferences, value: string) => {
    if (settings?.preferences)
      updatePreferences.mutate({ [key]: value as any });
  };

  const handleFeedDensity = () => {
    Alert.alert("Feed Density", "Choose how posts are displayed in your feed", [
      {
        text: "Compact",
        onPress: () => handleStringUpdate("feed_density", "compact"),
      },
      {
        text: "Normal",
        onPress: () => handleStringUpdate("feed_density", "normal"),
      },
      {
        text: "Relaxed",
        onPress: () => handleStringUpdate("feed_density", "relaxed"),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleDefaultSort = () => {
    Alert.alert("Default Sort", "Choose default sorting for your feed", [
      {
        text: "Best",
        onPress: () => handleStringUpdate("default_sort", "best"),
      },
      { text: "Hot", onPress: () => handleStringUpdate("default_sort", "hot") },
      { text: "New", onPress: () => handleStringUpdate("default_sort", "new") },
      { text: "Top", onPress: () => handleStringUpdate("default_sort", "top") },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleFontSize = () => {
    Alert.alert("Font Size", "Choose text size for posts", [
      {
        text: "Small",
        onPress: () => handleStringUpdate("font_size", "small"),
      },
      {
        text: "Medium",
        onPress: () => handleStringUpdate("font_size", "medium"),
      },
      {
        text: "Large",
        onPress: () => handleStringUpdate("font_size", "large"),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const getFeedDensityText = () => {
    const density = settings?.preferences?.feed_density;
    return density === "compact"
      ? "Compact"
      : density === "relaxed"
        ? "Relaxed"
        : "Normal";
  };

  const getDefaultSortText = () => {
    const sort = settings?.preferences?.default_sort;
    return sort === "hot"
      ? "Hot"
      : sort === "new"
        ? "New"
        : sort === "top"
          ? "Top"
          : "Best";
  };

  const getFontSizeText = () => {
    const size = settings?.preferences?.font_size;
    return size === "small" ? "Small" : size === "large" ? "Large" : "Medium";
  };

  return (
    <LinearGradient
      colors={["#DCEBFF", "#EEF4FF", "#FFFFFF"]}
      locations={[0, 0.45, 1]}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.logoBubble}>
              <Ionicons name="sparkles-outline" size={20} color="#7C3AED" />
            </View>
            <View>
              <Text style={styles.headerTitle}>Feed Preferences</Text>
              <Text style={styles.headerSub}>
                Customize how content appears in your feed
              </Text>
            </View>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <SectionHeader title="Content Display" />
          <Card>
            <Row
              item={{
                title: "Show NSFW Content",
                description: "Display content marked as not safe for work",
                icon: "warning-outline",
                toggle: true,
                toggleValue: !!settings?.preferences?.show_nsfw,
                onToggle: (v) => handleToggle("show_nsfw", v),
              }}
            />
            <Row
              item={{
                title: "Auto-play Media",
                description: "Automatically play videos and GIFs",
                icon: "play-circle-outline",
                toggle: true,
                toggleValue: !!settings?.preferences?.auto_play_media,
                onToggle: (v) => handleToggle("auto_play_media", v),
              }}
            />
            <Row
              item={{
                title: "Show Image Descriptions",
                description: "Display alt text for images",
                icon: "reader-outline",
                toggle: true,
                toggleValue: !!settings?.preferences?.show_image_descriptions,
                onToggle: (v) => handleToggle("show_image_descriptions", v),
              }}
            />
            <Row
              isLast
              item={{
                title: "Feed Density",
                description: "Control spacing between posts",
                icon: "grid-outline",
                rightText: getFeedDensityText(),
                onPress: handleFeedDensity,
              }}
            />
          </Card>

          <SectionHeader title="Content Filtering" />
          <Card>
            <Row
              isLast
              item={{
                title: "Hide Spoilers",
                description: "Blur posts marked as containing spoilers",
                icon: "eye-off-outline",
                toggle: true,
                toggleValue: !!settings?.preferences?.hide_spoilers,
                onToggle: (v) => handleToggle("hide_spoilers", v),
              }}
            />
          </Card>

          <SectionHeader title="Sorting & Organization" />
          <Card>
            <Row
              item={{
                title: "Default Sort",
                description: "Default order for posts",
                icon: "swap-vertical-outline",
                rightText: getDefaultSortText(),
                onPress: handleDefaultSort,
              }}
            />
            <Row
              item={{
                title: "Group Similar Posts",
                description: "Group related posts together",
                icon: "albums-outline",
                toggle: true,
                toggleValue: !!settings?.preferences?.group_similar_posts,
                onToggle: (v) => handleToggle("group_similar_posts", v),
              }}
            />
            <Row
              isLast
              item={{
                title: "Collapse Long Threads",
                description: "Automatically collapse long comment threads",
                icon: "contract-outline",
                toggle: true,
                toggleValue: !!settings?.preferences?.collapse_long_threads,
                onToggle: (v) => handleToggle("collapse_long_threads", v),
              }}
            />
          </Card>

          <SectionHeader title="Advanced" />
          <Card>
            <Row
              item={{
                title: "Reduce Animations",
                description: "Minimize motion and animations",
                icon: "flash-off-outline",
                toggle: true,
                toggleValue: !!settings?.preferences?.reduce_animations,
                onToggle: (v) => handleToggle("reduce_animations", v),
              }}
            />
            <Row
              isLast
              item={{
                title: "Font Size",
                description: "Adjust text size in posts",
                icon: "text-outline",
                rightText: getFontSizeText(),
                onPress: handleFontSize,
              }}
            />
          </Card>

          <Text style={styles.footerText}>
            nebulanet.space • Some changes may require restarting the app to
            fully apply.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1, backgroundColor: "transparent" },

  header: {
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 10,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  logoBubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#111827" },
  headerSub: { fontSize: 12, color: "#6B7280", marginTop: 2 },

  scrollContent: { paddingHorizontal: 18, paddingBottom: 28 },

  sectionHeader: { marginTop: 14, marginBottom: 8, paddingHorizontal: 2 },
  sectionHeaderText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: 0.4,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 2,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2FF",
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 14, fontWeight: "800", color: "#111827" },
  rowDesc: { marginTop: 3, fontSize: 12, color: "#6B7280", lineHeight: 16 },

  rowRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  rowRightText: { fontSize: 12, fontWeight: "800", color: "#6B7280" },

  togglePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  toggleOn: { backgroundColor: "#EEF2FF", borderColor: "#D7DDFE" },
  toggleOff: { backgroundColor: "#F7F7FB", borderColor: "#E5E7EB" },
  toggleDot: { width: 8, height: 8, borderRadius: 4 },
  toggleDotOn: { backgroundColor: "#7C3AED" },
  toggleDotOff: { backgroundColor: "#9CA3AF" },
  toggleText: { fontSize: 12, fontWeight: "800" },
  toggleTextOn: { color: "#4C1D95" },
  toggleTextOff: { color: "#6B7280" },

  footerText: {
    marginTop: 14,
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 18,
  },
});
