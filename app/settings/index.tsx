// app/settings/index.tsx — COMPLETED + UPDATED (✅ Dark Mode ready + Appearance row)
// ✅ Uses theme colors everywhere
// ✅ Light mode keeps gradient; dark mode uses flat background
// ✅ Adds Appearance row (System / Light / Dark)
// ✅ Fixes TS error by removing Profile.preferences usage

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams } from "expo-router";
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

import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/providers/ThemeProvider";
import {
  closeSettings,
  pushSettings,
  replaceSettings,
  type SettingsRouteKey,
} from "./routes";

type SettingsRow = {
  title: string;
  description?: string;
  icon: keyof typeof Ionicons.glyphMap;
  routeKey?: SettingsRouteKey;
  danger?: boolean;
  rightText?: string;
};

function SectionHeader({ title, color }: { title: string; color: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionHeaderText, { color }]}>{title}</Text>
    </View>
  );
}

function SettingsCard({
  children,
  backgroundColor,
}: {
  children: React.ReactNode;
  backgroundColor: string;
}) {
  return <View style={[styles.card, { backgroundColor }]}>{children}</View>;
}

function Row({
  item,
  isLast,
  colors,
}: {
  item: SettingsRow;
  isLast?: boolean;
  colors: any;
}) {
  const onPress = () => {
    if (!item.routeKey) {
      Alert.alert(item.title, "Coming soon");
      return;
    }
    pushSettings(item.routeKey);
  };

  const iconColor = item.danger ? colors.error : colors.primary;
  const borderBottomColor = colors.border;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[
        styles.row,
        { borderBottomColor },
        isLast && { borderBottomWidth: 0 },
      ]}
    >
      <View
        style={[
          styles.rowIcon,
          {
            backgroundColor: item.danger
              ? "rgba(248,113,113,0.12)"
              : "rgba(124,58,237,0.12)",
          },
        ]}
      >
        <Ionicons name={item.icon} size={18} color={iconColor} />
      </View>

      <View style={styles.rowText}>
        <Text
          style={[
            styles.rowTitle,
            { color: item.danger ? colors.error : colors.text },
          ]}
        >
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
        <Ionicons
          name="chevron-forward"
          size={18}
          color={colors.textTertiary}
        />
      </View>
    </TouchableOpacity>
  );
}

export default function SettingsIndexScreen() {
  const { user, profile } = useAuth();
  const { theme, colors, isDark } = useTheme();

  const params = useLocalSearchParams<{ returnTo?: string }>();

  const themeLabel =
    theme === "system" ? "SYSTEM" : theme === "dark" ? "DARK" : "LIGHT";

  const primary: SettingsRow[] = [
    {
      title: "Account Center",
      description: "Profile, email, password",
      icon: "person-circle-outline",
      routeKey: "accountCenter",
    },
    {
      title: "Security & Login",
      description: "2FA, sessions, recovery",
      icon: "shield-checkmark-outline",
      routeKey: "security",
    },
    {
      title: "Privacy & Visibility",
      description: "Who can see and interact",
      icon: "eye-outline",
      routeKey: "privacy",
    },
    {
      title: "Notifications",
      description: "Push + email preferences",
      icon: "notifications-outline",
      routeKey: "notifications",
    },
  ];

  const personalization: SettingsRow[] = [
    {
      title: "Feed Preferences",
      description: "Sorting, density, filters",
      icon: "sparkles-outline",
      routeKey: "feedPreferences",
    },
    {
      title: "Appearance",
      description: "Light, dark, or system",
      icon: "moon-outline",
      routeKey: "appearance",
      rightText: themeLabel,
    },
    {
      title: "Language & Region",
      description: "Localization settings",
      icon: "language-outline",
      routeKey: "language",
      rightText: "EN",
    },
    {
      title: "Saved & Hidden",
      description: "Bookmarks and hidden posts",
      icon: "bookmark-outline",
      routeKey: "savedContent",
    },
  ];

  const safety: SettingsRow[] = [
    {
      title: "Blocked & Muted",
      description: "Manage blocked accounts",
      icon: "ban-outline",
      routeKey: "blocked",
    },
    {
      title: "Linked Accounts",
      description: "Google, GitHub, and more",
      icon: "link-outline",
      routeKey: "linkedAccounts",
    },
  ];

  const support: SettingsRow[] = [
    {
      title: "Report a Problem",
      description: "Tell us what went wrong",
      icon: "bug-outline",
      routeKey: "report",
    },
    {
      title: "About NebulaNet",
      description: "Version, support, links",
      icon: "information-circle-outline",
      routeKey: "about",
    },
  ];

  const danger: SettingsRow[] = [
    {
      title: "Deactivate Account",
      description: "Temporarily disable your account",
      icon: "pause-circle-outline",
      routeKey: "deactivate",
      danger: true,
    },
    {
      title: "Delete Account",
      description: "Permanently delete your account",
      icon: "trash-outline",
      routeKey: "deleteAccount",
      danger: true,
    },
  ];

  const handleSignOut = () => {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          try {
            await supabase.auth.signOut();
            replaceSettings("index");
          } catch (e: any) {
            Alert.alert("Error", e?.message || "Failed to sign out");
          }
        },
      },
    ]);
  };

  const headerBg = colors.card;
  const headerText = colors.text;
  const subText = colors.textSecondary;

  const content = (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View
            style={[
              styles.logoBubble,
              { backgroundColor: headerBg, borderColor: colors.border },
            ]}
          >
            <Ionicons name="planet-outline" size={20} color={colors.primary} />
          </View>

          <View>
            <Text style={[styles.headerTitle, { color: headerText }]}>
              Settings
            </Text>
            <Text style={[styles.headerSub, { color: subText }]}>
              {profile?.username
                ? `@${profile.username}`
                : user?.email || "NebulaNet"}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.headerCircleButton,
            { backgroundColor: headerBg, borderColor: colors.border },
          ]}
          activeOpacity={0.85}
          onPress={() => closeSettings(params.returnTo)}
        >
          <Ionicons name="close" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <SectionHeader title="Account" color={colors.textSecondary} />
        <SettingsCard backgroundColor={colors.card}>
          {primary.map((item, idx) => (
            <Row
              key={item.title}
              item={item}
              isLast={idx === primary.length - 1}
              colors={colors}
            />
          ))}
        </SettingsCard>

        <SectionHeader title="Personalization" color={colors.textSecondary} />
        <SettingsCard backgroundColor={colors.card}>
          {personalization.map((item, idx) => (
            <Row
              key={item.title}
              item={item}
              isLast={idx === personalization.length - 1}
              colors={colors}
            />
          ))}
        </SettingsCard>

        <SectionHeader title="Safety" color={colors.textSecondary} />
        <SettingsCard backgroundColor={colors.card}>
          {safety.map((item, idx) => (
            <Row
              key={item.title}
              item={item}
              isLast={idx === safety.length - 1}
              colors={colors}
            />
          ))}
        </SettingsCard>

        <SectionHeader title="Help" color={colors.textSecondary} />
        <SettingsCard backgroundColor={colors.card}>
          {support.map((item, idx) => (
            <Row
              key={item.title}
              item={item}
              isLast={idx === support.length - 1}
              colors={colors}
            />
          ))}
        </SettingsCard>

        <SectionHeader title="Account Actions" color={colors.textSecondary} />
        <SettingsCard backgroundColor={colors.card}>
          {danger.map((item, idx) => (
            <Row
              key={item.title}
              item={item}
              isLast={idx === danger.length - 1}
              colors={colors}
            />
          ))}
        </SettingsCard>

        <TouchableOpacity
          style={[
            styles.signOut,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
          activeOpacity={0.85}
          onPress={handleSignOut}
        >
          <Ionicons name="log-out-outline" size={18} color={colors.text} />
          <Text style={[styles.signOutText, { color: colors.text }]}>
            Sign out
          </Text>
        </TouchableOpacity>

        <Text style={[styles.footerText, { color: colors.textSecondary }]}>
          nebulanet.space • Changes may take a few minutes to apply across all
          systems.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );

  // ✅ Light mode keeps your gradient vibe; dark mode uses flat background
  if (!isDark) {
    return (
      <LinearGradient
        colors={["#DCEBFF", "#EEF4FF", "#FFFFFF"]}
        locations={[0, 0.45, 1]}
        style={styles.gradient}
      >
        {content}
      </LinearGradient>
    );
  }

  return (
    <View style={[styles.gradient, { backgroundColor: colors.background }]}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1, backgroundColor: "transparent" },

  header: {
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },

  logoBubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },

  headerTitle: { fontSize: 18, fontWeight: "800" },
  headerSub: { fontSize: 12, marginTop: 2 },

  headerCircleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },

  scrollContent: { paddingHorizontal: 18, paddingBottom: 28 },

  sectionHeader: { marginTop: 14, marginBottom: 8, paddingHorizontal: 2 },
  sectionHeaderText: { fontSize: 13, fontWeight: "800", letterSpacing: 0.4 },

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

  rowRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  rowRightText: { fontSize: 12, fontWeight: "800" },

  signOut: {
    marginTop: 14,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 1,
  },

  signOutText: { fontSize: 14, fontWeight: "800" },

  footerText: {
    marginTop: 14,
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },
});
