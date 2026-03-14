// app/settings/account-center.tsx — UPDATED ✅ dark mode
import { useAuth } from "@/hooks/useAuth";
import { closeSettings, pushSettings } from "@/lib/routes/settingsRoutes";
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

type RowItem = {
  title: string;
  description?: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
};

export default function AccountCenterScreen() {
  const { user, profile } = useAuth();
  const { colors, isDark } = useTheme();

  const identityRows: RowItem[] = [
    {
      title: "Email Address",
      description: user?.email || "Not set",
      icon: "mail-outline",
      onPress: () => Alert.alert("Email", "Email management coming soon"),
    },
    {
      title: "Username",
      description: profile?.username ? `@${profile.username}` : "Not set",
      icon: "at-outline",
      onPress: () => Alert.alert("Username", "Username changes coming soon"),
    },
  ];

  const accountRows: RowItem[] = [
    {
      title: "Change Password",
      description: "Update your account password",
      icon: "key-outline",
      onPress: () => pushSettings("changePassword"),
    },
    {
      title: "Linked Accounts",
      description: "Connect Google and more",
      icon: "link-outline",
      onPress: () => pushSettings("linkedAccounts"),
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
              name="person-circle-outline"
              size={20}
              color={colors.primary}
            />
          </View>
          <View style={{ flexShrink: 1 }}>
            <Text
              style={[styles.headerTitle, { color: colors.text }]}
              numberOfLines={1}
            >
              Account Center
            </Text>
            <Text
              style={[styles.headerSub, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              Manage identity and account access
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
        <SectionLabel title="Identity" colors={colors} />
        <Card colors={colors}>
          {identityRows.map((item, idx) => (
            <Row
              key={item.title}
              item={item}
              isLast={idx === identityRows.length - 1}
              colors={colors}
            />
          ))}
        </Card>

        <SectionLabel title="Account" colors={colors} />
        <Card colors={colors}>
          {accountRows.map((item, idx) => (
            <Row
              key={item.title}
              item={item}
              isLast={idx === accountRows.length - 1}
              colors={colors}
            />
          ))}
        </Card>

        <Text style={[styles.footer, { color: colors.textTertiary }]}>
          nebulanet.space • Account changes may require re-authentication.
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

function SectionLabel({ title, colors }: { title: string; colors: any }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
        {title}
      </Text>
    </View>
  );
}

function Card({
  children,
  colors,
}: {
  children: React.ReactNode;
  colors: any;
}) {
  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      {children}
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
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={item.onPress}
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
      <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
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

  footer: { marginTop: 14, fontSize: 12, textAlign: "center", lineHeight: 18 },
});
