// app/settings/index.tsx ✅
// ✅ FIXED: removed Redo Onboarding — replaced with Topics & Interests picker
// ✅ FIXED: notifications row no longer crashes (lib/notifications.ts fixed)
// ✅ ADDED: Download Your Data option in Account section

import { useAuth } from "@/hooks/useAuth";
import { useThemeStyles } from "@/hooks/useThemeStyles";
import {
  closeSettings,
  pushSettings,
  type SettingsRouteKey,
} from "@/lib/routes/settingsRoutes";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import firestore from "@react-native-firebase/firestore";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const INTERESTS = [
  { id: "art", name: "Art", emoji: "🎨" },
  { id: "gaming", name: "Gaming", emoji: "🎮" },
  { id: "books", name: "Books", emoji: "📚" },
  { id: "music", name: "Music", emoji: "🎵" },
  { id: "fitness", name: "Fitness", emoji: "💪" },
  { id: "food", name: "Food", emoji: "🍔" },
  { id: "travel", name: "Travel", emoji: "✈️" },
  { id: "movies", name: "Movies & TV", emoji: "🎬" },
  { id: "wellness", name: "Wellness", emoji: "💆" },
  { id: "fashion", name: "Fashion", emoji: "👗" },
  { id: "environment", name: "Environment", emoji: "🌍" },
  { id: "business", name: "Business", emoji: "💼" },
  { id: "tech", name: "Tech", emoji: "📱" },
  { id: "photography", name: "Photography", emoji: "📷" },
  { id: "events", name: "Events", emoji: "🎉" },
  { id: "podcasts", name: "Podcasts", emoji: "🎙️" },
  { id: "startups", name: "Startups", emoji: "🚀" },
  { id: "mindfulness", name: "Mindfulness", emoji: "🧘" },
  { id: "inspiration", name: "Inspiration", emoji: "💡" },
  { id: "sports", name: "Sports", emoji: "🏀" },
];

type SettingsRow = {
  title: string;
  description?: string;
  icon: keyof typeof Ionicons.glyphMap;
  routeKey?: SettingsRouteKey;
  danger?: boolean;
  rightText?: string;
  onPress?: () => void;
};

function SectionHeader({ title }: { title: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionHeaderText, { color: colors.textSecondary }]}>
        {title}
      </Text>
    </View>
  );
}

function SettingsCard({ children }: { children: React.ReactNode }) {
  const { colors, isDark } = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, shadowOpacity: isDark ? 0.25 : 0.06 },
      ]}
    >
      {children}
    </View>
  );
}

function Row({
  item,
  isLast,
  onPressOverride,
}: {
  item: SettingsRow;
  isLast?: boolean;
  onPressOverride?: () => void;
}) {
  const { colors } = useTheme();
  const onPress = () => {
    if (onPressOverride) {
      onPressOverride();
      return;
    }
    if (item.onPress) {
      item.onPress();
      return;
    }
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
      style={[
        styles.row,
        { borderBottomColor: colors.border },
        isLast && { borderBottomWidth: 0 },
      ]}
    >
      <View
        style={[
          styles.rowIcon,
          {
            backgroundColor: item.danger
              ? colors.error + "20"
              : colors.primary + "20",
          },
        ]}
      >
        <Ionicons
          name={item.icon}
          size={18}
          color={item.danger ? colors.error : colors.primary}
        />
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

// ✅ Twitter-style Topics picker modal
function TopicsModal({
  visible,
  userId,
  onClose,
  colors,
}: {
  visible: boolean;
  userId: string;
  onClose: () => void;
  colors: any;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  React.useEffect(() => {
    if (!visible || loaded) return;
    firestore()
      .collection("user_interests")
      .doc(userId)
      .get()
      .then((snap) => {
        if (snap.exists()) {
          const data = snap.data() as any;
          setSelected(Array.isArray(data.interests) ? data.interests : []);
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [visible, userId, loaded]);

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await firestore().collection("user_interests").doc(userId).set(
        {
          user_id: userId,
          interests: selected,
          updated_at: new Date().toISOString(),
        },
        { merge: true },
      );
      onClose();
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to save topics.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)" }}>
        <View style={[styles.topicsModal, { backgroundColor: colors.card }]}>
          <View style={styles.topicsHeader}>
            <Text style={[styles.topicsTitle, { color: colors.text }]}>
              Topics & Interests
            </Text>
            <Text style={[styles.topicsSub, { color: colors.textSecondary }]}>
              Choose what you want to see in your feed. Select as many as you
              like.
            </Text>
          </View>

          <ScrollView
            contentContainerStyle={styles.topicsGrid}
            showsVerticalScrollIndicator={false}
          >
            {INTERESTS.map((interest) => {
              const active = selected.includes(interest.id);
              return (
                <TouchableOpacity
                  key={interest.id}
                  style={[
                    styles.topicChip,
                    {
                      backgroundColor: active ? colors.primary : colors.surface,
                      borderColor: active ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => toggle(interest.id)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.topicEmoji}>{interest.emoji}</Text>
                  <Text
                    style={[
                      styles.topicText,
                      { color: active ? "#fff" : colors.text },
                    ]}
                  >
                    {interest.name}
                  </Text>
                  {active && (
                    <Ionicons name="checkmark" size={13} color="#fff" />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.topicsFooter}>
            <TouchableOpacity
              style={[styles.topicsCancelBtn, { borderColor: colors.border }]}
              onPress={onClose}
              activeOpacity={0.85}
            >
              <Text style={[styles.topicsCancelText, { color: colors.text }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.topicsSaveBtn,
                { backgroundColor: colors.primary, opacity: saving ? 0.6 : 1 },
              ]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.88}
            >
              <Text style={styles.topicsSaveText}>
                {saving ? "Saving…" : "Save"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function SettingsIndexScreen() {
  const { user, profile, signOut } = useAuth();
  const { theme, colors, isDark } = useTheme();
  const ts = useThemeStyles();
  const params = useLocalSearchParams<{ returnTo?: string }>();
  const [showTopics, setShowTopics] = useState(false);
  const [requestingData, setRequestingData] = useState(false);

  const themeLabel =
    theme === "system" ? "SYSTEM" : theme === "dark" ? "DARK" : "LIGHT";

  // ✅ Request data export via Cloud Function
  const handleDownloadData = async () => {
    if (!user?.uid || !user?.email) {
      Alert.alert(
        "Error",
        "You must be signed in with an email to request your data.",
      );
      return;
    }

    Alert.alert(
      "Download Your Data",
      `We'll compile your NebulaNet data and send it to ${user.email}. This may take a few minutes.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Request Export",
          onPress: async () => {
            setRequestingData(true);
            try {
              // Create a request doc — Cloud Function picks it up
              await firestore()
                .collection("data_export_requests")
                .doc(user.uid)
                .set({
                  user_id: user.uid,
                  email: user.email,
                  status: "pending",
                  requested_at: new Date().toISOString(),
                  requested_at_ts: firestore.FieldValue.serverTimestamp(),
                });

              Alert.alert(
                "Request Submitted",
                `Your data export has been queued. You'll receive an email at ${user.email} within a few minutes.`,
              );
            } catch (e: any) {
              Alert.alert(
                "Error",
                e?.message || "Failed to submit request. Try again.",
              );
            } finally {
              setRequestingData(false);
            }
          },
        },
      ],
    );
  };

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
    // ✅ NEW: Download your data
    {
      title: "Download Your Data",
      description: "Get a copy of your posts, profile, and activity",
      icon: "download-outline",
      onPress: handleDownloadData,
    },
  ];

  const personalization: SettingsRow[] = [
    {
      title: "Topics & Interests",
      description: "Customize what appears in your feed",
      icon: "sparkles-outline",
      onPress: () => setShowTopics(true),
    },
    {
      title: "Feed Preferences",
      description: "Sorting, density, filters",
      icon: "options-outline",
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
            await signOut();
            router.replace("/(auth)/login");
          } catch (e: any) {
            Alert.alert("Error", e?.message || "Failed to sign out");
          }
        },
      },
    ]);
  };

  const content = (
    <SafeAreaView style={[ts.safe, { backgroundColor: "transparent" }]}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />

      <View style={styles.header}>
        <View style={ts.row}>
          <View
            style={[
              styles.logoBubble,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Ionicons name="planet-outline" size={20} color={colors.primary} />
          </View>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              Settings
            </Text>
            <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
              {profile?.username
                ? `@${profile.username}`
                : user?.email || "NebulaNet"}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={[
            styles.logoBubble,
            { backgroundColor: colors.card, borderColor: colors.border },
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

        <Text style={[styles.footerText, { color: colors.textTertiary }]}>
          nebulanet.space • Changes may take a few minutes to apply.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );

  return (
    <>
      {!isDark ? (
        <LinearGradient
          colors={["#DCEBFF", "#EEF4FF", "#FFFFFF"]}
          locations={[0, 0.45, 1]}
          style={{ flex: 1 }}
        >
          {content}
        </LinearGradient>
      ) : (
        <View style={[{ flex: 1 }, { backgroundColor: colors.background }]}>
          {content}
        </View>
      )}

      {!!user?.uid && (
        <TopicsModal
          visible={showTopics}
          userId={user.uid}
          onClose={() => setShowTopics(false)}
          colors={colors}
        />
      )}
    </>
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
  },
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
  scrollContent: { paddingHorizontal: 18, paddingBottom: 28 },
  sectionHeader: { marginTop: 14, marginBottom: 8, paddingHorizontal: 2 },
  sectionHeaderText: { fontSize: 13, fontWeight: "800", letterSpacing: 0.4 },
  card: {
    borderRadius: 22,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
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
  topicsModal: {
    flex: 1,
    marginTop: 60,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  topicsHeader: { padding: 24, paddingBottom: 12 },
  topicsTitle: { fontSize: 22, fontWeight: "900" },
  topicsSub: { fontSize: 14, lineHeight: 20, marginTop: 6 },
  topicsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  topicChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
  },
  topicEmoji: { fontSize: 16 },
  topicText: { fontSize: 14, fontWeight: "600" },
  topicsFooter: {
    flexDirection: "row",
    gap: 12,
    padding: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },
  topicsCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: "center",
    borderWidth: 1,
  },
  topicsCancelText: { fontSize: 15, fontWeight: "700" },
  topicsSaveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: "center",
  },
  topicsSaveText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
