// app/settings/privacy.tsx — NebulaNet RESKIN + typed routing (no TS complaints)
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { pushSettings } from "./routes";

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

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{title}</Text>
    </View>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
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

export default function PrivacyScreen() {
  // Replace these with real settings when you wire them to your DB/preferences
  const [privateAccount, setPrivateAccount] = useState(false);
  const [discoverable, setDiscoverable] = useState(true);
  const [activityStatus, setActivityStatus] = useState(true);
  const [readReceipts, setReadReceipts] = useState(true);

  const whoCanComment = useMemo(() => "Everyone", []);
  const whoCanMessage = useMemo(() => "Followers", []);
  const mentions = useMemo(() => "Everyone", []);

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
              <Ionicons name="lock-closed-outline" size={20} color="#7C3AED" />
            </View>
            <View>
              <Text style={styles.headerTitle}>Privacy</Text>
              <Text style={styles.headerSub}>
                Control who can see and interact with you
              </Text>
            </View>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <SectionHeader title="Profile Visibility" />
          <Card>
            <Row
              item={{
                title: "Private Account",
                description: "Only approved followers can see your posts",
                icon: "person-circle-outline",
                toggle: true,
                toggleValue: privateAccount,
                onToggle: setPrivateAccount,
              }}
            />
            <Row
              isLast
              item={{
                title: "Profile Discoverability",
                description: "Allow your profile to appear in search results",
                icon: "search-outline",
                toggle: true,
                toggleValue: discoverable,
                onToggle: setDiscoverable,
              }}
            />
          </Card>

          <SectionHeader title="Interactions" />
          <Card>
            <Row
              item={{
                title: "Who Can Comment",
                description: "Control who can comment on your posts",
                icon: "chatbubble-ellipses-outline",
                rightText: whoCanComment,
                onPress: () =>
                  Alert.alert(
                    "Coming Soon",
                    "Comment privacy options coming soon",
                  ),
              }}
            />
            <Row
              item={{
                title: "Who Can Message You",
                description: "Control who can DM you",
                icon: "mail-outline",
                rightText: whoCanMessage,
                onPress: () =>
                  Alert.alert(
                    "Coming Soon",
                    "Message privacy options coming soon",
                  ),
              }}
            />
            <Row
              isLast
              item={{
                title: "Mentions",
                description: "Control who can mention you",
                icon: "at-outline",
                rightText: mentions,
                onPress: () =>
                  Alert.alert("Coming Soon", "Mention settings coming soon"),
              }}
            />
          </Card>

          <SectionHeader title="Safety" />
          <Card>
            <Row
              item={{
                title: "Blocked & Muted Accounts",
                description: "Manage who you’ve blocked or muted",
                icon: "ban-outline",
                onPress: () => pushSettings("blocked"),
              }}
            />
            <Row
              isLast
              item={{
                title: "Report a Problem",
                description: "Tell us what went wrong",
                icon: "bug-outline",
                onPress: () => pushSettings("report"),
              }}
            />
          </Card>

          <SectionHeader title="Data & Activity" />
          <Card>
            <Row
              item={{
                title: "Activity Status",
                description: "Show when you're active",
                icon: "pulse-outline",
                toggle: true,
                toggleValue: activityStatus,
                onToggle: setActivityStatus,
              }}
            />
            <Row
              isLast
              item={{
                title: "Read Receipts",
                description: "Let people know when you’ve seen messages",
                icon: "checkmark-done-outline",
                toggle: true,
                toggleValue: readReceipts,
                onToggle: setReadReceipts,
              }}
            />
          </Card>

          <View style={styles.infoBox}>
            <View style={styles.infoIcon}>
              <Ionicons name="lock-closed-outline" size={18} color="#7C3AED" />
            </View>
            <Text style={styles.infoText}>
              Your privacy matters. You’re always in control of who sees and
              interacts with your content on NebulaNet.
            </Text>
          </View>

          <Text style={styles.footerText}>
            nebulanet.space • Privacy controls apply across the app.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1, backgroundColor: "transparent" },

  header: { paddingHorizontal: 18, paddingTop: 6, paddingBottom: 10 },
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

  infoBox: {
    marginTop: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#EEF2FF",
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  infoIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  infoText: { fontSize: 13, color: "#6B7280", flex: 1, lineHeight: 18 },

  footerText: {
    marginTop: 14,
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 18,
  },
});
