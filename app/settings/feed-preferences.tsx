// app/settings/feed-preferences.tsx — UPDATED ✅ dark mode
import { useSettings } from "@/hooks/useSettings";
import { useTheme } from "@/providers/ThemeProvider";
import { UserPreferences } from "@/types/settings";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import {
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type RowItem = {
  title: string;
  description?: string;
  icon: keyof typeof Ionicons.glyphMap;
  rightText?: string;
  onPress?: () => void;
  toggle?: boolean;
  toggleValue?: boolean;
  onToggle?: (v: boolean) => void;
};

export default function FeedPreferencesScreen() {
  const { colors, isDark } = useTheme();
  const { settings, updatePreferences } = useSettings();

  const handleToggle = (key: keyof UserPreferences, value: boolean) => {
    if (settings?.preferences) updatePreferences.mutate({ [key]: value });
  };
  const handleString = (key: keyof UserPreferences, value: string) => {
    if (settings?.preferences)
      updatePreferences.mutate({ [key]: value as any });
  };

  const feedDensityText = () => {
    const d = settings?.preferences?.feed_density;
    return d === "compact" ? "Compact" : d === "relaxed" ? "Relaxed" : "Normal";
  };
  const defaultSortText = () => {
    const s = settings?.preferences?.default_sort;
    return s === "hot"
      ? "Hot"
      : s === "new"
        ? "New"
        : s === "top"
          ? "Top"
          : "Best";
  };
  const fontSizeText = () => {
    const f = settings?.preferences?.font_size;
    return f === "small" ? "Small" : f === "large" ? "Large" : "Medium";
  };

  const sections: { title: string; rows: RowItem[] }[] = [
    {
      title: "Content Display",
      rows: [
        {
          title: "Show NSFW Content",
          description: "Display content marked as not safe for work",
          icon: "warning-outline",
          toggle: true,
          toggleValue: !!settings?.preferences?.show_nsfw,
          onToggle: (v) => handleToggle("show_nsfw", v),
        },
        {
          title: "Auto-play Media",
          description: "Automatically play videos and GIFs",
          icon: "play-circle-outline",
          toggle: true,
          toggleValue: !!settings?.preferences?.auto_play_media,
          onToggle: (v) => handleToggle("auto_play_media", v),
        },
        {
          title: "Show Image Descriptions",
          description: "Display alt text for images",
          icon: "reader-outline",
          toggle: true,
          toggleValue: !!settings?.preferences?.show_image_descriptions,
          onToggle: (v) => handleToggle("show_image_descriptions", v),
        },
        {
          title: "Feed Density",
          description: "Control spacing between posts",
          icon: "grid-outline",
          rightText: feedDensityText(),
          onPress: () =>
            Alert.alert("Feed Density", "Choose display density", [
              {
                text: "Compact",
                onPress: () => handleString("feed_density", "compact"),
              },
              {
                text: "Normal",
                onPress: () => handleString("feed_density", "normal"),
              },
              {
                text: "Relaxed",
                onPress: () => handleString("feed_density", "relaxed"),
              },
              { text: "Cancel", style: "cancel" },
            ]),
        },
      ],
    },
    {
      title: "Content Filtering",
      rows: [
        {
          title: "Hide Spoilers",
          description: "Blur posts marked as containing spoilers",
          icon: "eye-off-outline",
          toggle: true,
          toggleValue: !!settings?.preferences?.hide_spoilers,
          onToggle: (v) => handleToggle("hide_spoilers", v),
        },
      ],
    },
    {
      title: "Sorting & Organization",
      rows: [
        {
          title: "Default Sort",
          description: "Default order for posts",
          icon: "swap-vertical-outline",
          rightText: defaultSortText(),
          onPress: () =>
            Alert.alert("Default Sort", "Choose default sorting", [
              {
                text: "Best",
                onPress: () => handleString("default_sort", "best"),
              },
              {
                text: "Hot",
                onPress: () => handleString("default_sort", "hot"),
              },
              {
                text: "New",
                onPress: () => handleString("default_sort", "new"),
              },
              {
                text: "Top",
                onPress: () => handleString("default_sort", "top"),
              },
              { text: "Cancel", style: "cancel" },
            ]),
        },
        {
          title: "Group Similar Posts",
          description: "Group related posts together",
          icon: "albums-outline",
          toggle: true,
          toggleValue: !!settings?.preferences?.group_similar_posts,
          onToggle: (v) => handleToggle("group_similar_posts", v),
        },
        {
          title: "Collapse Long Threads",
          description: "Automatically collapse long comment threads",
          icon: "contract-outline",
          toggle: true,
          toggleValue: !!settings?.preferences?.collapse_long_threads,
          onToggle: (v) => handleToggle("collapse_long_threads", v),
        },
      ],
    },
    {
      title: "Advanced",
      rows: [
        {
          title: "Reduce Animations",
          description: "Minimize motion and animations",
          icon: "flash-off-outline",
          toggle: true,
          toggleValue: !!settings?.preferences?.reduce_animations,
          onToggle: (v) => handleToggle("reduce_animations", v),
        },
        {
          title: "Font Size",
          description: "Adjust text size in posts",
          icon: "text-outline",
          rightText: fontSizeText(),
          onPress: () =>
            Alert.alert("Font Size", "Choose text size", [
              {
                text: "Small",
                onPress: () => handleString("font_size", "small"),
              },
              {
                text: "Medium",
                onPress: () => handleString("font_size", "medium"),
              },
              {
                text: "Large",
                onPress: () => handleString("font_size", "large"),
              },
              { text: "Cancel", style: "cancel" },
            ]),
        },
      ],
    },
  ];

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

      <View style={styles.header}>
        <TouchableOpacity
          style={[
            styles.circleBtn,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
          onPress={() => router.back()}
          activeOpacity={0.85}
        >
          <Ionicons name="chevron-back" size={18} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Feed Preferences
          </Text>
          <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
            Customize how content appears in your feed
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {sections.map(({ title, rows }) => (
          <React.Fragment key={title}>
            <View style={styles.sectionHeader}>
              <Text
                style={[styles.sectionText, { color: colors.textSecondary }]}
              >
                {title}
              </Text>
            </View>
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              {rows.map((item, idx) => (
                <Row
                  key={item.title}
                  item={item}
                  isLast={idx === rows.length - 1}
                  colors={colors}
                />
              ))}
            </View>
          </React.Fragment>
        ))}
        <Text style={[styles.footer, { color: colors.textTertiary }]}>
          nebulanet.space • Some changes may require restarting the app.
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

function TogglePill({ value, colors }: { value: boolean; colors: any }) {
  return (
    <View
      style={[
        styles.pill,
        {
          backgroundColor: value ? colors.primary + "18" : colors.surface,
          borderColor: value ? colors.primary + "40" : colors.border,
        },
      ]}
    >
      <View
        style={[
          styles.dot,
          { backgroundColor: value ? colors.primary : colors.textTertiary },
        ]}
      />
      <Text
        style={[
          styles.pillText,
          { color: value ? colors.primary : colors.textTertiary },
        ]}
      >
        {value ? "On" : "Off"}
      </Text>
    </View>
  );
}

function Row({
  item,
  isLast,
  colors,
}: {
  item: RowItem;
  isLast?: boolean;
  colors: any;
}) {
  const press = () => {
    if (item.toggle && item.onToggle) item.onToggle(!item.toggleValue);
    else item.onPress?.();
  };
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={press}
      style={[
        styles.row,
        { borderBottomColor: colors.border },
        isLast && { borderBottomWidth: 0 },
      ]}
    >
      <View
        style={[styles.rowIcon, { backgroundColor: colors.primary + "18" }]}
      >
        <Ionicons name={item.icon} size={18} color={colors.primary} />
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.rowTitle, { color: colors.text }]}>
          {item.title}
        </Text>
        {!!item.description && (
          <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>
            {item.description}
          </Text>
        )}
      </View>
      <View style={styles.rowRight}>
        {!!item.rightText && (
          <Text style={[styles.rowRightText, { color: colors.textSecondary }]}>
            {item.rightText}
          </Text>
        )}
        {item.toggle ? (
          <TogglePill value={!!item.toggleValue} colors={colors} />
        ) : (
          <Ionicons
            name="chevron-forward"
            size={18}
            color={colors.textTertiary}
          />
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  circleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  headerTitle: { fontSize: 17, fontWeight: "800" },
  headerSub: { fontSize: 12, marginTop: 2 },
  scroll: { paddingHorizontal: 18, paddingBottom: 28 },
  sectionHeader: { marginTop: 14, marginBottom: 8, paddingHorizontal: 2 },
  sectionText: { fontSize: 13, fontWeight: "800", letterSpacing: 0.4 },
  card: {
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
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 14, fontWeight: "800" },
  rowDesc: { marginTop: 3, fontSize: 12, lineHeight: 16 },
  rowRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  rowRightText: { fontSize: 12, fontWeight: "800" },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  pillText: { fontSize: 12, fontWeight: "800" },
  footer: { marginTop: 14, fontSize: 12, textAlign: "center", lineHeight: 18 },
});
