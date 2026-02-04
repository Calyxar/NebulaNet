// app/settings/account-center.tsx
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
import { pushSettings } from "./routes";

type RowItem = {
  title: string;
  description?: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
};

function Card({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{title}</Text>
    </View>
  );
}

function Row({ item, isLast }: { item: RowItem; isLast?: boolean }) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={item.onPress}
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

      <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
    </TouchableOpacity>
  );
}

export default function AccountCenterScreen() {
  const { user, profile } = useAuth();

  const accountRows: RowItem[] = [
    {
      title: "Change Password",
      description: "Update your account password",
      icon: "key-outline",
      onPress: () => pushSettings("changePassword"),
    },
    {
      title: "Linked Accounts",
      description: "Connect Google, GitHub, and more",
      icon: "link-outline",
      onPress: () => pushSettings("linkedAccounts"),
    },
  ];

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
              <Ionicons
                name="person-circle-outline"
                size={20}
                color="#7C3AED"
              />
            </View>
            <View>
              <Text style={styles.headerTitle}>Account Center</Text>
              <Text style={styles.headerSub}>
                Manage identity and account access
              </Text>
            </View>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <SectionHeader title="Identity" />
          <Card>
            {identityRows.map((item, idx) => (
              <Row
                key={item.title}
                item={item}
                isLast={idx === identityRows.length - 1}
              />
            ))}
          </Card>

          <SectionHeader title="Account" />
          <Card>
            {accountRows.map((item, idx) => (
              <Row
                key={item.title}
                item={item}
                isLast={idx === accountRows.length - 1}
              />
            ))}
          </Card>

          <Text style={styles.footerText}>
            nebulanet.space • Account changes are protected and may require
            re-authentication.
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

  footerText: {
    marginTop: 14,
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 18,
  },
});
