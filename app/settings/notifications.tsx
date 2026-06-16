// app/settings/notifications.tsx
import { useAuth } from "@/hooks/useAuth";
import { useSettings } from "@/hooks/useSettings";
import {
  getNotificationsMuted,
  setNotificationsMuted,
} from "@/lib/notifications";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import firestore from "@react-native-firebase/firestore";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
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

type SoundPref = "default" | "vibrate" | "silent";

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
  icon,
  title,
  description,
  toggle,
  toggleValue,
  onToggle,
  value,
  onPress,
  isLast,
  colors,
  disabled,
}: {
  icon: string;
  title: string;
  description?: string;
  toggle?: boolean;
  toggleValue?: boolean;
  onToggle?: (v: boolean) => void;
  value?: string;
  onPress?: () => void;
  isLast?: boolean;
  colors: any;
  disabled?: boolean;
}) {
  const handlePress = () => {
    if (toggle && onToggle) onToggle(!toggleValue);
    else onPress?.();
  };

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={handlePress}
      disabled={disabled}
      style={[
        styles.row,
        { borderBottomColor: colors.border },
        isLast && { borderBottomWidth: 0 },
        disabled && { opacity: 0.5 },
      ]}
    >
      <View
        style={[styles.rowIcon, { backgroundColor: colors.primary + "18" }]}
      >
        <Ionicons name={icon as any} size={18} color={colors.primary} />
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.rowTitle, { color: colors.text }]}>{title}</Text>
        {!!description && (
          <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>
            {description}
          </Text>
        )}
      </View>
      <View style={styles.rowRight}>
        {!!value && (
          <Text style={[styles.rowValue, { color: colors.textSecondary }]}>
            {value}
          </Text>
        )}
        {toggle ? (
          <TogglePill value={!!toggleValue} colors={colors} />
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

function Section({
  title,
  children,
  colors,
}: {
  title: string;
  children: React.ReactNode;
  colors: any;
}) {
  return (
    <>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
          {title}
        </Text>
      </View>
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        {children}
      </View>
    </>
  );
}

export default function NotificationsScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const { settings, updateNotifications } = useSettings();
  const [muted, setMuted] = useState(false);
  const [mutingLoading, setMutingLoading] = useState(false);
  const [soundPref, setSoundPref] = useState<SoundPref>("default");
  const [soundLoading, setSoundLoading] = useState(false);

  useEffect(() => {
    getNotificationsMuted().then(setMuted);
  }, []);

  // ✅ Load sound preference from user_settings
  useEffect(() => {
    if (!user?.uid) return;
    firestore()
      .collection("user_settings")
      .doc(user.uid)
      .get()
      .then((snap) => {
        const data = snap.data() as any;
        if (data?.notification_sound) setSoundPref(data.notification_sound);
      })
      .catch(() => {});
  }, [user?.uid]);

  const handleToggleMute = async (value: boolean) => {
    setMuted(value);
    setMutingLoading(true);
    try {
      await setNotificationsMuted(value);
    } catch {
      setMuted(!value);
      Alert.alert("Error", "Failed to update notification settings");
    } finally {
      setMutingLoading(false);
    }
  };

  // ✅ Save sound preference to user_settings
  const handleSoundChange = async (sound: SoundPref) => {
    if (!user?.uid) return;
    setSoundPref(sound);
    setSoundLoading(true);
    try {
      await firestore()
        .collection("user_settings")
        .doc(user.uid)
        .set({ notification_sound: sound }, { merge: true });
    } catch {
      Alert.alert("Error", "Failed to save sound preference");
    } finally {
      setSoundLoading(false);
    }
  };

  const openSoundPicker = () => {
    Alert.alert(
      "Notification Sound",
      "Choose how notifications sound on this device",
      [
        {
          text: "🔔 Default",
          onPress: () => handleSoundChange("default"),
        },
        {
          text: "📳 Vibrate Only",
          onPress: () => handleSoundChange("vibrate"),
        },
        {
          text: "🔕 Silent",
          onPress: () => handleSoundChange("silent"),
        },
        { text: "Cancel", style: "cancel" },
      ],
    );
  };

  const soundLabel = () => {
    if (soundPref === "silent") return "Silent";
    if (soundPref === "vibrate") return "Vibrate Only";
    return "Default";
  };

  const content = (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "transparent" }}
      edges={["top", "left", "right"]}
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
            styles.circleBtn,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
          onPress={() => router.back()}
          activeOpacity={0.85}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View
            style={[
              styles.circleBtn,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Ionicons
              name="notifications-outline"
              size={20}
              color={colors.primary}
            />
          </View>
          <View style={{ flexShrink: 1 }}>
            <Text
              style={[styles.headerTitle, { color: colors.text }]}
              numberOfLines={1}
            >
              Notifications
            </Text>
            <Text
              style={[styles.headerSub, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              Control what you get notified about
            </Text>
          </View>
        </View>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* Status card */}
        <View
          style={[
            styles.statusCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View
              style={[
                styles.statusPill,
                {
                  backgroundColor: muted ? "#FF3B3012" : colors.primary + "12",
                  borderColor: muted ? "#FF3B3030" : colors.primary + "30",
                },
              ]}
            >
              <Text
                style={[styles.statusLabel, { color: colors.textTertiary }]}
              >
                Status
              </Text>
              <Text
                style={[
                  styles.statusValue,
                  { color: muted ? "#FF3B30" : colors.primary },
                ]}
              >
                {muted ? "Muted" : "Active"}
              </Text>
            </View>
            <View
              style={[
                styles.statusPill,
                {
                  backgroundColor: colors.primary + "12",
                  borderColor: colors.primary + "30",
                },
              ]}
            >
              <Text
                style={[styles.statusLabel, { color: colors.textTertiary }]}
              >
                Sound
              </Text>
              <Text style={[styles.statusValue, { color: colors.primary }]}>
                {soundLabel()}
              </Text>
            </View>
          </View>
        </View>

        {/* Push Notifications */}
        <Section title="Push Notifications" colors={colors}>
          <Row
            icon="notifications-off-outline"
            title="Mute All Notifications"
            description="Stop all push notifications on this device"
            toggle
            toggleValue={muted}
            onToggle={handleToggleMute}
            disabled={mutingLoading}
            colors={colors}
          />
          <Row
            icon="volume-medium-outline"
            title="Notification Sound"
            description="Choose how notifications sound"
            value={soundLabel()}
            onPress={openSoundPicker}
            disabled={soundLoading}
            isLast
            colors={colors}
          />
        </Section>

        {/* Activity */}
        <Section title="Activity" colors={colors}>
          <Row
            icon="heart-outline"
            title="Likes & Reactions"
            description="When someone likes your content"
            toggle
            toggleValue={settings?.notifications?.likes !== false}
            onToggle={(v) => updateNotifications.mutate({ likes: v })}
            colors={colors}
          />
          <Row
            icon="chatbubble-outline"
            title="Comments & Replies"
            description="When someone comments on your posts"
            toggle
            toggleValue={settings?.notifications?.comments !== false}
            onToggle={(v) => updateNotifications.mutate({ comments: v })}
            colors={colors}
          />
          <Row
            icon="at-outline"
            title="Mentions"
            description="When someone mentions you in a post"
            toggle
            toggleValue={settings?.notifications?.mentions !== false}
            onToggle={(v) => updateNotifications.mutate({ mentions: v })}
            colors={colors}
          />
          <Row
            icon="repeat-outline"
            title="Reposts"
            description="When someone reposts your content"
            toggle
            toggleValue={settings?.notifications?.reposts !== false}
            onToggle={(v) => updateNotifications.mutate({ reposts: v })}
            colors={colors}
          />
          <Row
            icon="person-add-outline"
            title="New Followers"
            description="When someone follows you"
            toggle
            toggleValue={settings?.notifications?.follows !== false}
            onToggle={(v) => updateNotifications.mutate({ follows: v })}
            colors={colors}
          />
          <Row
            icon="mail-outline"
            title="Direct Messages"
            description="When you receive a new message"
            toggle
            toggleValue={settings?.notifications?.direct_messages !== false}
            onToggle={(v) => updateNotifications.mutate({ direct_messages: v })}
            isLast
            colors={colors}
          />
        </Section>

        {/* Community */}
        <Section title="Community" colors={colors}>
          <Row
            icon="megaphone-outline"
            title="Community Announcements"
            description="Important updates from your communities"
            toggle
            toggleValue={settings?.notifications?.community_updates !== false}
            onToggle={(v) =>
              updateNotifications.mutate({ community_updates: v })
            }
            colors={colors}
          />
          <Row
            icon="flame-outline"
            title="Trending Posts"
            description="Popular posts in your communities"
            toggle
            toggleValue={settings?.notifications?.trending_posts !== false}
            onToggle={(v) => updateNotifications.mutate({ trending_posts: v })}
            colors={colors}
          />
          <Row
            icon="people-outline"
            title="Friend Activity"
            description="When friends post or join communities"
            toggle
            toggleValue={settings?.notifications?.friend_activity !== false}
            onToggle={(v) => updateNotifications.mutate({ friend_activity: v })}
            isLast
            colors={colors}
          />
        </Section>

        {/* System */}
        <Section title="System" colors={colors}>
          <Row
            icon="shield-checkmark-outline"
            title="Security Alerts"
            description="Login attempts and account changes"
            toggle
            toggleValue={settings?.notifications?.security_alerts !== false}
            onToggle={(v) => updateNotifications.mutate({ security_alerts: v })}
            colors={colors}
          />
          <Row
            icon="refresh-outline"
            title="App Updates"
            description="New features and improvements"
            toggle
            toggleValue={settings?.notifications?.system_updates !== false}
            onToggle={(v) => updateNotifications.mutate({ system_updates: v })}
            isLast
            colors={colors}
          />
        </Section>

        <Text style={[styles.footer, { color: colors.textTertiary }]}>
          Changes sync instantly. Sound settings apply to all notification
          types.
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
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  circleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  headerTitle: { fontSize: 18, fontWeight: "800" },
  headerSub: { fontSize: 12, marginTop: 2 },
  scroll: { paddingHorizontal: 18, paddingBottom: 28 },
  statusCard: {
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    marginBottom: 6,
  },
  statusPill: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
  },
  statusLabel: { fontSize: 11, fontWeight: "700" },
  statusValue: { fontSize: 13, fontWeight: "900", marginTop: 4 },
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
  rowValue: { fontSize: 12, fontWeight: "800" },
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
  footer: {
    marginTop: 14,
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },
});
