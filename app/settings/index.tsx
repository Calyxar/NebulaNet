// app/settings/index.tsx
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

import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { pushSettings, replaceSettings, SettingsRouteKey } from "./routes";

type SettingsRow = {
  title: string;
  description?: string;
  icon: keyof typeof Ionicons.glyphMap;
  routeKey?: SettingsRouteKey;
  danger?: boolean;
  rightText?: string;
};

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{title}</Text>
    </View>
  );
}

function SettingsCard({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

function Row({ item, isLast }: { item: SettingsRow; isLast?: boolean }) {
  const onPress = () => {
    if (!item.routeKey) {
      Alert.alert(item.title, "Coming soon");
      return;
    }
    pushSettings(item.routeKey);
  };

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.row, isLast && { borderBottomWidth: 0 }]}
    >
      <View style={[styles.rowIcon, item.danger && styles.rowIconDanger]}>
        <Ionicons
          name={item.icon}
          size={18}
          color={item.danger ? "#FF3B30" : "#7C3AED"}
        />
      </View>

      <View style={styles.rowText}>
        <Text style={[styles.rowTitle, item.danger && styles.rowTitleDanger]}>
          {item.title}
        </Text>
        {!!item.description && (
          <Text style={styles.rowDesc}>{item.description}</Text>
        )}
      </View>

      <View style={styles.rowRight}>
        {!!item.rightText && (
          <Text style={styles.rowRightText}>{item.rightText}</Text>
        )}
        <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
      </View>
    </TouchableOpacity>
  );
}

export default function SettingsIndexScreen() {
  const { user, profile } = useAuth();

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
      title: "Language & Region",
      description: "Localization settings",
      icon: "language-outline",
      routeKey: "language",
      rightText: profile?.preferences?.language
        ? String(profile.preferences.language).toUpperCase()
        : "EN",
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
            replaceSettings("index"); // optional: return to settings root first
            // or take them to app root:
            // router.replace("/" as any);
          } catch (e: any) {
            Alert.alert("Error", e?.message || "Failed to sign out");
          }
        },
      },
    ]);
  };

  return (
    <LinearGradient
      colors={["#DCEBFF", "#EEF4FF", "#FFFFFF"]}
      locations={[0, 0.45, 1]}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.logoBubble}>
              <Ionicons name="planet-outline" size={20} color="#7C3AED" />
            </View>
            <View>
              <Text style={styles.headerTitle}>Settings</Text>
              <Text style={styles.headerSub}>
                {profile?.username
                  ? `@${profile.username}`
                  : user?.email || "NebulaNet"}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.headerCircleButton}
            activeOpacity={0.85}
            onPress={() => pushSettings("index")}
          >
            <Ionicons name="close" size={20} color="#111827" />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <SectionHeader title="Account" />
          <SettingsCard>
            {primary.map((item, idx) => (
              <Row
                key={item.title}
                item={item}
                isLast={idx === primary.length - 1}
              />
            ))}
          </SettingsCard>

          <SectionHeader title="Personalization" />
          <SettingsCard>
            {personalization.map((item, idx) => (
              <Row
                key={item.title}
                item={item}
                isLast={idx === personalization.length - 1}
              />
            ))}
          </SettingsCard>

          <SectionHeader title="Safety" />
          <SettingsCard>
            {safety.map((item, idx) => (
              <Row
                key={item.title}
                item={item}
                isLast={idx === safety.length - 1}
              />
            ))}
          </SettingsCard>

          <SectionHeader title="Help" />
          <SettingsCard>
            {support.map((item, idx) => (
              <Row
                key={item.title}
                item={item}
                isLast={idx === support.length - 1}
              />
            ))}
          </SettingsCard>

          <SectionHeader title="Account Actions" />
          <SettingsCard>
            {danger.map((item, idx) => (
              <Row
                key={item.title}
                item={item}
                isLast={idx === danger.length - 1}
              />
            ))}
          </SettingsCard>

          <TouchableOpacity
            style={styles.signOut}
            activeOpacity={0.85}
            onPress={handleSignOut}
          >
            <Ionicons name="log-out-outline" size={18} color="#111827" />
            <Text style={styles.signOutText}>Sign out</Text>
          </TouchableOpacity>

          <Text style={styles.footerText}>
            nebulanet.space • Changes may take a few minutes to apply across all
            systems.
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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

  headerCircleButton: {
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
  rowIconDanger: { backgroundColor: "#FFECEC" },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 14, fontWeight: "800", color: "#111827" },
  rowTitleDanger: { color: "#B42318" },
  rowDesc: { marginTop: 3, fontSize: 12, color: "#6B7280", lineHeight: 16 },

  rowRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  rowRightText: { fontSize: 12, fontWeight: "800", color: "#6B7280" },

  signOut: {
    marginTop: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#EEF2FF",
  },
  signOutText: { fontSize: 14, fontWeight: "800", color: "#111827" },

  footerText: {
    marginTop: 14,
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 18,
  },
});
