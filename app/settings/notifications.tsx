// app/settings/notifications.tsx
import { SettingsGroup, SettingsItem } from "@/components/settings";
import { useSettings } from "@/hooks/useSettings";
import React from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const ACCENT = "#7C3AED";
const BG = "#E8EAF6";
const TEXT = "#111827";
const SUB = "#6B7280";

export default function NotificationsScreen() {
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
    const frequency = settings?.notifications?.push_frequency;
    switch (frequency) {
      case "daily":
        return "Daily Digest";
      case "weekly":
        return "Weekly Digest";
      default:
        return "Immediate";
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        <View style={styles.headerCard}>
          <Text style={styles.title}>Notifications</Text>
          <Text style={styles.subtitle}>
            Choose what you get notified about and how often.
          </Text>

          <View style={styles.highlightRow}>
            <View style={styles.highlightPill}>
              <Text style={styles.highlightLabel}>Frequency</Text>
              <Text style={styles.highlightValue}>
                {getPushFrequencyText()}
              </Text>
            </View>
            <View style={styles.highlightPill}>
              <Text style={styles.highlightLabel}>Tip</Text>
              <Text style={styles.highlightValue}>Tweak for focus</Text>
            </View>
          </View>
        </View>

        <SettingsGroup title="Activity">
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
            onToggle={(value) =>
              updateNotifications.mutate({ comments: value })
            }
          />
          <SettingsItem
            title="Mentions"
            description="When someone mentions you"
            toggle
            toggleValue={settings?.notifications?.mentions}
            onToggle={(value) =>
              updateNotifications.mutate({ mentions: value })
            }
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
            onToggle={(value) =>
              updateNotifications.mutate({ direct_messages: value })
            }
          />
        </SettingsGroup>

        <SettingsGroup title="Community">
          <SettingsItem
            title="Announcements"
            description="Important updates from communities you follow"
            toggle
            toggleValue={settings?.notifications?.community_updates}
            onToggle={(value) =>
              updateNotifications.mutate({ community_updates: value })
            }
          />
          <SettingsItem
            title="Trending Posts"
            description="Popular posts in your communities"
            toggle
            toggleValue={settings?.notifications?.trending_posts}
            onToggle={(value) =>
              updateNotifications.mutate({ trending_posts: value })
            }
          />
          <SettingsItem
            title="Friend Activity"
            description="When friends post or join communities"
            toggle
            toggleValue={settings?.notifications?.friend_activity}
            onToggle={(value) =>
              updateNotifications.mutate({ friend_activity: value })
            }
          />
        </SettingsGroup>

        <SettingsGroup title="System">
          <SettingsItem
            title="Security Alerts"
            description="Important security-related notifications"
            toggle
            toggleValue={settings?.notifications?.security_alerts}
            onToggle={(value) =>
              updateNotifications.mutate({ security_alerts: value })
            }
          />
          <SettingsItem
            title="System Updates"
            description="App updates and maintenance notices"
            toggle
            toggleValue={settings?.notifications?.system_updates}
            onToggle={(value) =>
              updateNotifications.mutate({ system_updates: value })
            }
          />
          <SettingsItem
            title="Account Activity"
            description="Login attempts and account changes"
            toggle
            toggleValue={settings?.notifications?.account_activity}
            onToggle={(value) =>
              updateNotifications.mutate({ account_activity: value })
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
            onToggle={(value) =>
              updateNotifications.mutate({ marketing_emails: value })
            }
          />
          <SettingsItem
            title="Weekly Newsletter"
            description="Weekly community highlights"
            toggle
            toggleValue={settings?.notifications?.weekly_newsletter}
            onToggle={(value) =>
              updateNotifications.mutate({ weekly_newsletter: value })
            }
          />
        </SettingsGroup>

        <Text style={styles.footer}>
          You can change these anytime. Some changes may take a minute to sync.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  container: { flex: 1 },
  content: { paddingBottom: 20 },

  headerCard: {
    margin: 16,
    marginBottom: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
  },
  title: { fontSize: 20, fontWeight: "800", color: TEXT },
  subtitle: { fontSize: 12, color: SUB, marginTop: 6, lineHeight: 18 },

  highlightRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  highlightPill: {
    flex: 1,
    backgroundColor: "#F7F5FF",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#EEF2FF",
  },
  highlightLabel: { fontSize: 11, color: SUB, fontWeight: "700" },
  highlightValue: {
    fontSize: 13,
    color: ACCENT,
    fontWeight: "900",
    marginTop: 4,
  },

  footer: {
    textAlign: "center",
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 14,
    paddingHorizontal: 16,
  },
});
