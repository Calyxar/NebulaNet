// app/settings/linked-accounts.tsx — UPDATED ✅ dark mode + Google only
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
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

interface LinkedAccount {
  id: string;
  provider: "google";
  email?: string;
  connectedAt: string;
}

export default function LinkedAccountsScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();

  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([
    {
      id: "1",
      provider: "google",
      email: user?.email ?? undefined,
      connectedAt: new Date().toISOString(),
    },
  ]);

  const isConnected = linkedAccounts.some((a) => a.provider === "google");
  const account = linkedAccounts.find((a) => a.provider === "google");

  const handleConnect = () => {
    Alert.alert(
      "Connect Google",
      "Re-authenticate with Google to link your account.",
    );
  };

  const handleDisconnect = () => {
    Alert.alert(
      "Disconnect Google",
      "You won't be able to sign in with Google if you disconnect.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disconnect",
          style: "destructive",
          onPress: () => setLinkedAccounts([]),
        },
      ],
    );
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
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[
            styles.backBtn,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
          onPress={() => router.back()}
          activeOpacity={0.85}
        >
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Linked Accounts
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* Description */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.descTitle, { color: colors.text }]}>
            Sign-in methods
          </Text>
          <Text style={[styles.descSub, { color: colors.textSecondary }]}>
            Connect accounts for easier sign-in. You can disconnect anytime.
          </Text>
          <View
            style={[
              styles.domainPill,
              {
                backgroundColor: colors.primary + "15",
                borderColor: colors.primary + "30",
              },
            ]}
          >
            <Ionicons name="globe-outline" size={13} color={colors.primary} />
            <Text style={[styles.domainText, { color: colors.primary }]}>
              nebulanet.space
            </Text>
          </View>
        </View>

        {/* Google row */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.providerRow}>
            <View style={[styles.providerIcon, { backgroundColor: "#DB4437" }]}>
              <Ionicons name="logo-google" size={22} color="#fff" />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={[styles.providerName, { color: colors.text }]}>
                Google
              </Text>
              <Text
                style={[styles.providerDesc, { color: colors.textSecondary }]}
              >
                Sign in with Google
              </Text>
              {isConnected && account?.email && (
                <Text
                  style={[styles.providerMeta, { color: colors.textTertiary }]}
                >
                  {account.email}
                </Text>
              )}
            </View>

            {isConnected ? (
              <TouchableOpacity
                style={[
                  styles.disconnectBtn,
                  {
                    backgroundColor: colors.error + "15",
                    borderColor: colors.error + "30",
                  },
                ]}
                onPress={handleDisconnect}
                activeOpacity={0.85}
              >
                <Text style={[styles.disconnectText, { color: colors.error }]}>
                  Disconnect
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.connectBtn, { backgroundColor: colors.primary }]}
                onPress={handleConnect}
                activeOpacity={0.85}
              >
                <Text style={styles.connectText}>Connect</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Info card */}
        <View
          style={[
            styles.infoCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Ionicons
            name="information-circle-outline"
            size={20}
            color={colors.primary}
          />
          <View style={{ flex: 1 }}>
            <Text style={[styles.infoTitle, { color: colors.text }]}>
              How it works
            </Text>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              {
                "• We never post without your permission\n• Disconnect anytime from this screen\n• Your data stays private and secure"
              }
            </Text>
          </View>
        </View>

        <Text style={[styles.footer, { color: colors.textTertiary }]}>
          Need help? support@nebulanet.space
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
    paddingVertical: 12,
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

  scroll: { padding: 18, gap: 12, paddingBottom: 32 },

  card: {
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  descTitle: { fontSize: 16, fontWeight: "800", marginBottom: 6 },
  descSub: { fontSize: 13, lineHeight: 18 },
  domainPill: {
    marginTop: 12,
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
  },
  domainText: { fontSize: 12, fontWeight: "800" },

  providerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  providerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  providerName: { fontSize: 14, fontWeight: "800" },
  providerDesc: { fontSize: 12, marginTop: 2 },
  providerMeta: { fontSize: 11, marginTop: 4 },

  connectBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
  },
  connectText: { color: "#fff", fontWeight: "800", fontSize: 13 },

  disconnectBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  disconnectText: { fontWeight: "800", fontSize: 13 },

  infoCard: {
    flexDirection: "row",
    gap: 12,
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
  },
  infoTitle: { fontSize: 13, fontWeight: "800", marginBottom: 4 },
  infoText: { fontSize: 12, lineHeight: 19 },

  footer: { textAlign: "center", fontSize: 12, marginTop: 4 },
});
