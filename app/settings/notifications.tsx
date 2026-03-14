// app/settings/notifications.tsx — UPDATED ✅ dark mode
import { SettingsGroup, SettingsItem } from "@/components/settings";
import { useSettings } from "@/hooks/useSettings";
import { useTheme } from "@/providers/ThemeProvider";
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

export default function NotificationsScreen() {
  const { colors, isDark } = useTheme();
  const { settings, updateNotifications } = useSettings();

  const handlePushFrequency = () => {
    Alert.alert(
      "Push Notification Frequency",
      "Choose how often you receive push notifications",
      [
        {
          text: "Immediate",
          onPress: () =>
            updateNotifications.mutate({ push_frequency: "immediate" }),
        },
        {
          text: "Daily Digest",
          onPress: () =>
            updateNotifications.mutate({ push_frequency: "daily" }),
        },
        {
          text: "Weekly Digest",
          onPress: () =>
            updateNotifications.mutate({ push_frequency: "weekly" }),
        },
        { text: "Cancel", style: "cancel" },
      ],
    );
  };

  const getPushFrequencyText = () => {
    switch (settings?.notifications?.push_frequency) {
      case "daily":
        return "Daily Digest";
      case "weekly":
        return "Weekly Digest";
      default:
        return "Immediate";
    }
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
          Notifications
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* Summary card */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.title, { color: colors.text }]}>
            Notifications
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Choose what you get notified about and how often.
          </Text>
          <View style={styles.pillsRow}>
            <View
              style={[
                styles.pill,
                {
                  backgroundColor: colors.primary + "12",
                  borderColor: colors.primary + "30",
                },
              ]}
            >
              <Text style={[styles.pillLabel, { color: colors.textSecondary }]}>
                Frequency
              </Text>
              <Text style={[styles.pillValue, { color: colors.primary }]}>
                {getPushFrequencyText()}
              </Text>
            </View>
            <View
              style={[
                styles.pill,
                {
                  backgroundColor: colors.primary + "12",
                  borderColor: colors.primary + "30",
                },
              ]}
            >
              <Text style={[styles.pillLabel, { color: colors.textSecondary }]}>
                Tip
              </Text>
              <Text style={[styles.pillValue, { color: colors.primary }]}>
                Tweak for focus
              </Text>
            </View>
          </View>
        </View>

        <SettingsGroup title="Activity">
          <SettingsItem
            title="Likes & Reactions"
            description="When someone likes or reacts to your content"
            toggle
            toggleValue={settings?.notifications?.likes}
            onToggle={(v) => updateNotifications.mutate({ likes: v })}
          />
          <SettingsItem
            title="Comments & Replies"
            description="When someone comments on your posts"
            toggle
            toggleValue={settings?.notifications?.comments}
            onToggle={(v) => updateNotifications.mutate({ comments: v })}
          />
          <SettingsItem
            title="Mentions"
            description="When someone mentions you"
            toggle
            toggleValue={settings?.notifications?.mentions}
            onToggle={(v) => updateNotifications.mutate({ mentions: v })}
          />
          <SettingsItem
            title="New Followers"
            description="When someone follows you"
            toggle
            toggleValue={settings?.notifications?.follows}
            onToggle={(v) => updateNotifications.mutate({ follows: v })}
          />
          <SettingsItem
            title="Direct Messages"
            description="When you receive a new message"
            toggle
            toggleValue={settings?.notifications?.direct_messages}
            onToggle={(v) => updateNotifications.mutate({ direct_messages: v })}
          />
        </SettingsGroup>

        <SettingsGroup title="Community">
          <SettingsItem
            title="Announcements"
            description="Important updates from communities you follow"
            toggle
            toggleValue={settings?.notifications?.community_updates}
            onToggle={(v) =>
              updateNotifications.mutate({ community_updates: v })
            }
          />
          <SettingsItem
            title="Trending Posts"
            description="Popular posts in your communities"
            toggle
            toggleValue={settings?.notifications?.trending_posts}
            onToggle={(v) => updateNotifications.mutate({ trending_posts: v })}
          />
          <SettingsItem
            title="Friend Activity"
            description="When friends post or join communities"
            toggle
            toggleValue={settings?.notifications?.friend_activity}
            onToggle={(v) => updateNotifications.mutate({ friend_activity: v })}
          />
        </SettingsGroup>

        <SettingsGroup title="System">
          <SettingsItem
            title="Security Alerts"
            description="Important security-related notifications"
            toggle
            toggleValue={settings?.notifications?.security_alerts}
            onToggle={(v) => updateNotifications.mutate({ security_alerts: v })}
          />
          <SettingsItem
            title="System Updates"
            description="App updates and maintenance notices"
            toggle
            toggleValue={settings?.notifications?.system_updates}
            onToggle={(v) => updateNotifications.mutate({ system_updates: v })}
          />
          <SettingsItem
            title="Account Activity"
            description="Login attempts and account changes"
            toggle
            toggleValue={settings?.notifications?.account_activity}
            onToggle={(v) =>
              updateNotifications.mutate({ account_activity: v })
            }
          />
        </SettingsGroup>

        <SettingsGroup title="Preferences">
          <SettingsItem
            title="Notification Frequency"
            description="How often you receive push notifications"
            value={getPushFrequencyText()}
            onPress={handlePushFrequency}
          />
          <SettingsItem
            title="Marketing Emails"
            description="Updates about new features"
            toggle
            toggleValue={settings?.notifications?.marketing_emails}
            onToggle={(v) =>
              updateNotifications.mutate({ marketing_emails: v })
            }
          />
          <SettingsItem
            title="Weekly Newsletter"
            description="Weekly community highlights"
            toggle
            toggleValue={settings?.notifications?.weekly_newsletter}
            onToggle={(v) =>
              updateNotifications.mutate({ weekly_newsletter: v })
            }
          />
        </SettingsGroup>

        <Text style={[styles.footer, { color: colors.textTertiary }]}>
          You can change these anytime. Some changes may take a minute to sync.
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
  scroll: { paddingBottom: 24 },
  card: {
    margin: 16,
    marginBottom: 10,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
  },
  title: { fontSize: 20, fontWeight: "800" },
  subtitle: { fontSize: 12, marginTop: 6, lineHeight: 18 },
  pillsRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  pill: { flex: 1, borderRadius: 14, padding: 12, borderWidth: 1 },
  pillLabel: { fontSize: 11, fontWeight: "700" },
  pillValue: { fontSize: 13, fontWeight: "900", marginTop: 4 },
  footer: {
    textAlign: "center",
    fontSize: 12,
    marginTop: 14,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
});
