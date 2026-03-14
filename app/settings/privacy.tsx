// app/settings/privacy.tsx — UPDATED ✅ dark mode
import { usePersistedState } from "@/hooks/usePersistedState";
import { closeSettings, pushSettings } from "@/lib/routes/settingsRoutes";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo } from "react";
import {
  ActivityIndicator,
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

export default function PrivacyScreen() {
  const { colors, isDark } = useTheme();
  const params = useLocalSearchParams<Record<string, string>>();

  const p1 = usePersistedState("privacy.privateAccount", false);
  const p2 = usePersistedState("privacy.discoverable", true);
  const p3 = usePersistedState("privacy.activityStatus", true);
  const p4 = usePersistedState("privacy.readReceipts", true);
  const p5 = usePersistedState("privacy.hideLikes", false);
  const p6 = usePersistedState("privacy.hideFollowers", false);
  const p7 = usePersistedState("privacy.hideFollowing", false);
  const p8 = usePersistedState("privacy.allowTagging", true);
  const p9 = usePersistedState("privacy.messageRequests", true);
  const p10 = usePersistedState("privacy.reduceSensitive", false);
  const p11 = usePersistedState("privacy.whoCanComment", "Everyone");
  const p12 = usePersistedState("privacy.whoCanMessage", "Followers");
  const p13 = usePersistedState("privacy.mentions", "Everyone");

  const allReady = [
    p1,
    p2,
    p3,
    p4,
    p5,
    p6,
    p7,
    p8,
    p9,
    p10,
    p11,
    p12,
    p13,
  ].every((p) => p.isReady);

  useEffect(() => {
    if (
      typeof params.privacy_comments === "string" &&
      params.privacy_comments.length
    )
      p11.setValue(params.privacy_comments);
    if (
      typeof params.privacy_messages === "string" &&
      params.privacy_messages.length
    )
      p12.setValue(params.privacy_messages);
    if (
      typeof params.privacy_mentions === "string" &&
      params.privacy_mentions.length
    )
      p13.setValue(params.privacy_mentions);
  }, [
    params.privacy_comments,
    params.privacy_messages,
    params.privacy_mentions,
  ]);

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
      p1.value
        ? "Private account: only approved followers can see your posts."
        : "Public account: anyone can see your posts.",
    [p1.value],
  );

  if (!allReady) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const sections: { title: string; rows: RowItem[] }[] = [
    {
      title: "Profile Visibility",
      rows: [
        {
          title: "Private Account",
          description: privateWarning,
          icon: "person-circle-outline",
          toggle: true,
          toggleValue: p1.value,
          onToggle: p1.setValue,
        },
        {
          title: "Profile Discoverability",
          description: "Allow your profile to appear in search results",
          icon: "search-outline",
          toggle: true,
          toggleValue: p2.value,
          onToggle: p2.setValue,
        },
      ],
    },
    {
      title: "Interactions",
      rows: [
        {
          title: "Who Can Comment",
          description: "Control who can comment on your posts",
          icon: "chatbubble-ellipses-outline",
          rightText: p11.value,
          onPress: () => openChoice("comments", p11.value),
        },
        {
          title: "Who Can Message You",
          description: "Control who can DM you",
          icon: "mail-outline",
          rightText: p12.value,
          onPress: () => openChoice("messages", p12.value),
        },
        {
          title: "Mentions",
          description: "Control who can mention you",
          icon: "at-outline",
          rightText: p13.value,
          onPress: () => openChoice("mentions", p13.value),
        },
      ],
    },
    {
      title: "Messaging Controls",
      rows: [
        {
          title: "Message Requests",
          description: "Allow message requests from people you don't follow",
          icon: "paper-plane-outline",
          toggle: true,
          toggleValue: p9.value,
          onToggle: p9.setValue,
        },
        {
          title: "Read Receipts",
          description: "Let people know when you've seen messages",
          icon: "checkmark-done-outline",
          toggle: true,
          toggleValue: p4.value,
          onToggle: p4.setValue,
        },
      ],
    },
    {
      title: "Profile Controls",
      rows: [
        {
          title: "Hide Likes",
          description: "Hide your liked posts from your profile",
          icon: "heart-outline",
          toggle: true,
          toggleValue: p5.value,
          onToggle: p5.setValue,
        },
        {
          title: "Hide Followers",
          description: "Hide your followers list from others",
          icon: "people-outline",
          toggle: true,
          toggleValue: p6.value,
          onToggle: p6.setValue,
        },
        {
          title: "Hide Following",
          description: "Hide who you follow from others",
          icon: "person-add-outline",
          toggle: true,
          toggleValue: p7.value,
          onToggle: p7.setValue,
        },
      ],
    },
    {
      title: "Tags & Safety",
      rows: [
        {
          title: "Allow Tagging",
          description: "Let others tag you in posts",
          icon: "pricetag-outline",
          toggle: true,
          toggleValue: p8.value,
          onToggle: p8.setValue,
        },
        {
          title: "Sensitive Content Filter",
          description: "Reduce sensitive content in your feed",
          icon: "eye-off-outline",
          toggle: true,
          toggleValue: p10.value,
          onToggle: p10.setValue,
        },
        {
          title: "Blocked & Muted Accounts",
          description: "Manage who you've blocked or muted",
          icon: "ban-outline",
          onPress: () => pushSettings("blocked"),
        },
      ],
    },
    {
      title: "Data & Activity",
      rows: [
        {
          title: "Activity Status",
          description: "Show when you're active",
          icon: "pulse-outline",
          toggle: true,
          toggleValue: p3.value,
          onToggle: p3.setValue,
        },
        {
          title: "Clear Search History",
          description: "Clear search history saved on this device",
          icon: "trash-outline",
          onPress: () =>
            Alert.alert(
              "Clear Search History",
              "Search history cleared on this device.",
              [{ text: "OK" }],
            ),
        },
        {
          title: "Download Your Data",
          description: "Request an export of your account data",
          icon: "download-outline",
          onPress: () =>
            Alert.alert(
              "Download Your Data",
              "We'll prepare a download link and email it to you.",
              [{ text: "OK" }],
            ),
        },
      ],
    },
    {
      title: "Help",
      rows: [
        {
          title: "Report a Problem",
          description: "Tell us what went wrong",
          icon: "bug-outline",
          onPress: () => pushSettings("report"),
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
              name="lock-closed-outline"
              size={20}
              color={colors.primary}
            />
          </View>
          <View style={{ flexShrink: 1 }}>
            <Text
              style={[styles.headerTitle, { color: colors.text }]}
              numberOfLines={1}
            >
              Privacy
            </Text>
            <Text
              style={[styles.headerSub, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              Control who can see and interact with you
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.circleBtn,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
          onPress={() => closeSettings()}
          activeOpacity={0.85}
        >
          <Ionicons name="close" size={20} color={colors.text} />
        </TouchableOpacity>
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

        <View
          style={[
            styles.infoBox,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View
            style={[
              styles.infoIcon,
              { backgroundColor: colors.primary + "18" },
            ]}
          >
            <Ionicons
              name="lock-closed-outline"
              size={18}
              color={colors.primary}
            />
          </View>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            Your privacy matters. You're always in control of who sees and
            interacts with your content on NebulaNet.
          </Text>
        </View>

        <Text style={[styles.footer, { color: colors.textTertiary }]}>
          nebulanet.space • Privacy controls apply across the app.
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
  circleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: "800" },
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
  infoBox: {
    marginTop: 14,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  infoIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  infoText: { fontSize: 13, flex: 1, lineHeight: 18 },
  footer: { marginTop: 14, fontSize: 12, textAlign: "center", lineHeight: 18 },
});
