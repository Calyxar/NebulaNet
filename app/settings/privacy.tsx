// app/settings/privacy.tsx — COMPLETED (Back + X header + fixes “can’t exit settings”)
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { usePersistedState } from "@/hooks/usePersistedState";
import { closeSettings, pushSettings } from "./routes";

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
  const params = useLocalSearchParams<Record<string, string>>();

  // ✅ Persisted toggles
  const p1 = usePersistedState("privacy.privateAccount", false);
  const p2 = usePersistedState("privacy.discoverable", true);
  const p3 = usePersistedState("privacy.activityStatus", true);
  const p4 = usePersistedState("privacy.readReceipts", true);

  // ✅ Extra toggles
  const p5 = usePersistedState("privacy.hideLikes", false);
  const p6 = usePersistedState("privacy.hideFollowers", false);
  const p7 = usePersistedState("privacy.hideFollowing", false);
  const p8 = usePersistedState("privacy.allowTagging", true);
  const p9 = usePersistedState("privacy.messageRequests", true);
  const p10 = usePersistedState("privacy.reduceSensitive", false);

  // ✅ Persisted select values
  const p11 = usePersistedState("privacy.whoCanComment", "Everyone");
  const p12 = usePersistedState("privacy.whoCanMessage", "Followers");
  const p13 = usePersistedState("privacy.mentions", "Everyone");

  const allReady =
    p1.isReady &&
    p2.isReady &&
    p3.isReady &&
    p4.isReady &&
    p5.isReady &&
    p6.isReady &&
    p7.isReady &&
    p8.isReady &&
    p9.isReady &&
    p10.isReady &&
    p11.isReady &&
    p12.isReady &&
    p13.isReady;

  const privateAccount = p1.value;
  const setPrivateAccount = p1.setValue;

  const discoverable = p2.value;
  const setDiscoverable = p2.setValue;

  const activityStatus = p3.value;
  const setActivityStatus = p3.setValue;

  const readReceipts = p4.value;
  const setReadReceipts = p4.setValue;

  const hideLikes = p5.value;
  const setHideLikes = p5.setValue;

  const hideFollowers = p6.value;
  const setHideFollowers = p6.setValue;

  const hideFollowing = p7.value;
  const setHideFollowing = p7.setValue;

  const allowTagging = p8.value;
  const setAllowTagging = p8.setValue;

  const messageRequests = p9.value;
  const setMessageRequests = p9.setValue;

  const reduceSensitive = p10.value;
  const setReduceSensitive = p10.setValue;

  const whoCanComment = p11.value;
  const setWhoCanComment = p11.setValue;

  const whoCanMessage = p12.value;
  const setWhoCanMessage = p12.setValue;

  const mentions = p13.value;
  const setMentions = p13.setValue;

  // ✅ Receive selection updates from privacy-choice.tsx and persist them
  useEffect(() => {
    const c = params.privacy_comments;
    const m = params.privacy_messages;
    const me = params.privacy_mentions;

    if (typeof c === "string" && c.length) setWhoCanComment(c);
    if (typeof m === "string" && m.length) setWhoCanMessage(m);
    if (typeof me === "string" && me.length) setMentions(me);
  }, [
    params.privacy_comments,
    params.privacy_messages,
    params.privacy_mentions,
    setWhoCanComment,
    setWhoCanMessage,
    setMentions,
  ]);

  const exportData = () => {
    Alert.alert(
      "Download Your Data",
      "We’ll prepare a download link and email it to you.",
      [{ text: "OK" }],
    );
  };

  const clearSearch = () => {
    Alert.alert(
      "Clear Search History",
      "Search history cleared on this device.",
      [{ text: "OK" }],
    );
  };

  const openChoice = (
    key: "comments" | "messages" | "mentions",
    value: string,
  ) =>
    router.push({
      pathname: "/settings/privacy-choice",
      params: { key, value },
    });

  const privateWarning = useMemo(
    () =>
      privateAccount
        ? "Private account: only approved followers can see your posts."
        : "Public account: anyone can see your posts.",
    [privateAccount],
  );

  if (!allReady) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: "#F5F7FF" }]}>
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <ActivityIndicator />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <LinearGradient
      colors={["#DCEBFF", "#EEF4FF", "#FFFFFF"]}
      locations={[0, 0.45, 1]}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.container}>
        {/* ✅ Header with Back + X */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerCircleButton}
            activeOpacity={0.85}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={20} color="#111827" />
          </TouchableOpacity>

          <View style={styles.headerLeft}>
            <View style={styles.logoBubble}>
              <Ionicons name="lock-closed-outline" size={20} color="#7C3AED" />
            </View>

            <View style={{ flexShrink: 1 }}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                Privacy
              </Text>
              <Text style={styles.headerSub} numberOfLines={1}>
                Control who can see and interact with you
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.headerCircleButton}
            activeOpacity={0.85}
            onPress={() => closeSettings()}
          >
            <Ionicons name="close" size={20} color="#111827" />
          </TouchableOpacity>
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
                description: privateWarning,
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
                onPress: () => openChoice("comments", whoCanComment),
              }}
            />
            <Row
              item={{
                title: "Who Can Message You",
                description: "Control who can DM you",
                icon: "mail-outline",
                rightText: whoCanMessage,
                onPress: () => openChoice("messages", whoCanMessage),
              }}
            />
            <Row
              isLast
              item={{
                title: "Mentions",
                description: "Control who can mention you",
                icon: "at-outline",
                rightText: mentions,
                onPress: () => openChoice("mentions", mentions),
              }}
            />
          </Card>

          <SectionHeader title="Messaging Controls" />
          <Card>
            <Row
              item={{
                title: "Message Requests",
                description:
                  "Allow message requests from people you don’t follow",
                icon: "paper-plane-outline",
                toggle: true,
                toggleValue: messageRequests,
                onToggle: setMessageRequests,
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

          <SectionHeader title="Profile Controls" />
          <Card>
            <Row
              item={{
                title: "Hide Likes",
                description: "Hide your liked posts from your profile",
                icon: "heart-outline",
                toggle: true,
                toggleValue: hideLikes,
                onToggle: setHideLikes,
              }}
            />
            <Row
              item={{
                title: "Hide Followers",
                description: "Hide your followers list from others",
                icon: "people-outline",
                toggle: true,
                toggleValue: hideFollowers,
                onToggle: setHideFollowers,
              }}
            />
            <Row
              isLast
              item={{
                title: "Hide Following",
                description: "Hide who you follow from others",
                icon: "person-add-outline",
                toggle: true,
                toggleValue: hideFollowing,
                onToggle: setHideFollowing,
              }}
            />
          </Card>

          <SectionHeader title="Tags & Safety" />
          <Card>
            <Row
              item={{
                title: "Allow Tagging",
                description: "Let others tag you in posts",
                icon: "pricetag-outline",
                toggle: true,
                toggleValue: allowTagging,
                onToggle: setAllowTagging,
              }}
            />
            <Row
              item={{
                title: "Sensitive Content Filter",
                description: "Reduce sensitive content in your feed",
                icon: "eye-off-outline",
                toggle: true,
                toggleValue: reduceSensitive,
                onToggle: setReduceSensitive,
              }}
            />
            <Row
              isLast
              item={{
                title: "Blocked & Muted Accounts",
                description: "Manage who you’ve blocked or muted",
                icon: "ban-outline",
                onPress: () => pushSettings("blocked"),
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
              item={{
                title: "Clear Search History",
                description: "Clear search history saved on this device",
                icon: "trash-outline",
                onPress: clearSearch,
              }}
            />
            <Row
              isLast
              item={{
                title: "Download Your Data",
                description: "Request an export of your account data",
                icon: "download-outline",
                onPress: exportData,
              }}
            />
          </Card>

          <SectionHeader title="Help" />
          <Card>
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

  // ✅ Header (Back + Title + X)
  header: {
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
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
  headerLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

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
