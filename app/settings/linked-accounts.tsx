// app/settings/linked-accounts.tsx
import { SettingsGroup, SettingsItem } from "@/components/settings";
import { useAuth } from "@/hooks/useAuth";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const ACCENT = "#7C3AED";
const BG = "#E8EAF6";
const TEXT = "#111827";
const SUB = "#6B7280";
const BORDER = "#EEF2FF";

interface LinkedAccount {
  id: string;
  provider: "google" | "github" | "twitter" | "discord" | "spotify";
  email?: string;
  connectedAt: string;
}

interface ProviderInfo {
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  description: string;
}

const PROVIDER_INFO: Record<string, ProviderInfo> = {
  google: {
    name: "Google",
    icon: "logo-google",
    color: "#DB4437",
    description: "Sign in with Google",
  },
  github: {
    name: "GitHub",
    icon: "logo-github",
    color: "#111827",
    description: "Connect GitHub account",
  },
  twitter: {
    name: "Twitter",
    icon: "logo-twitter",
    color: "#1DA1F2",
    description: "Connect Twitter account",
  },
  discord: {
    name: "Discord",
    icon: "logo-discord",
    color: "#5865F2",
    description: "Connect Discord account",
  },
  spotify: {
    name: "Spotify",
    icon: "musical-notes",
    color: "#1DB954",
    description: "Connect Spotify account",
  },
};

export default function LinkedAccountsScreen() {
  const { user, googleLogin } = useAuth();

  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([
    {
      id: "1",
      provider: "google",
      email: user?.email,
      connectedAt: new Date().toISOString(),
    },
  ]);

  const handleConnect = (provider: keyof typeof PROVIDER_INFO) => {
    switch (provider) {
      case "google":
        Alert.alert(
          "Google Connect",
          "Google credentials are configured, but linking requires a Google sign-in flow to generate an idToken.\n\nOnce implemented, call:\n\ngoogleLogin.mutate({ idToken, accessToken })",
        );
        break;

      default:
        Alert.alert(
          "Coming Soon",
          `${PROVIDER_INFO[provider].name} integration coming soon`,
        );
    }
  };

  const handleDisconnect = (account: LinkedAccount) => {
    Alert.alert(
      "Disconnect Account",
      `Disconnect your ${PROVIDER_INFO[account.provider].name} account?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disconnect",
          style: "destructive",
          onPress: () => {
            setLinkedAccounts((prev) =>
              prev.filter((acc) => acc.id !== account.id),
            );
            Alert.alert(
              "Disconnected",
              `${PROVIDER_INFO[account.provider].name} account disconnected`,
            );
          },
        },
      ],
    );
  };

  const isConnected = (provider: keyof typeof PROVIDER_INFO) =>
    linkedAccounts.some((acc) => acc.provider === provider);

  const renderProviderCard = (provider: keyof typeof PROVIDER_INFO) => {
    const info = PROVIDER_INFO[provider];
    const connected = isConnected(provider);
    const account = linkedAccounts.find((acc) => acc.provider === provider);

    return (
      <View key={provider} style={styles.providerCard}>
        <View style={styles.providerLeft}>
          <View style={[styles.providerIcon, { backgroundColor: info.color }]}>
            <Ionicons name={info.icon} size={22} color="#FFFFFF" />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.providerName}>{info.name}</Text>
            <Text style={styles.providerDesc}>{info.description}</Text>

            {connected && (
              <View style={styles.connectedMeta}>
                {account?.email ? (
                  <Text style={styles.providerMeta}>{account.email}</Text>
                ) : null}
                <Text style={styles.providerMeta}>
                  Connected{" "}
                  {new Date(account?.connectedAt || "").toLocaleDateString()}
                </Text>
              </View>
            )}
          </View>
        </View>

        {connected ? (
          <TouchableOpacity
            style={styles.disconnectBtn}
            onPress={() => handleDisconnect(account!)}
            activeOpacity={0.85}
          >
            <Ionicons name="unlink-outline" size={16} color="#EF4444" />
            <Text style={styles.disconnectText}>Disconnect</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.connectBtn}
            onPress={() => handleConnect(provider)}
            activeOpacity={0.85}
          >
            <Ionicons name="add-outline" size={16} color="#FFFFFF" />
            <Text style={styles.connectText}>Connect</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        <View style={styles.headerCard}>
          <Text style={styles.title}>Linked Accounts</Text>
          <Text style={styles.subtitle}>
            Connect accounts for easier sign-in and sharing across platforms.
          </Text>

          <View style={styles.domainPill}>
            <Ionicons name="globe-outline" size={14} color={ACCENT} />
            <Text style={styles.domainText}>nebulanet.space</Text>
          </View>
        </View>

        <View style={styles.cardsWrap}>
          {(Object.keys(PROVIDER_INFO) as (keyof typeof PROVIDER_INFO)[]).map(
            renderProviderCard,
          )}
        </View>

        <SettingsGroup title="Benefits">
          <SettingsItem
            title="Single Sign-On"
            description="Use connected accounts to sign in faster"
            icon="log-in-outline"
          />
          <SettingsItem
            title="Profile Import"
            description="Import name and avatar from connected accounts"
            icon="person-circle-outline"
          />
          <SettingsItem
            title="Content Sharing"
            description="Share posts directly to connected platforms"
            icon="share-outline"
          />
          <SettingsItem
            title="Enhanced Features"
            description="Unlock additional integrations over time"
            icon="sparkles-outline"
          />
        </SettingsGroup>

        <View style={styles.infoCard}>
          <Ionicons
            name="information-circle-outline"
            size={20}
            color={ACCENT}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>How it works</Text>
            <Text style={styles.infoText}>
              • We never post without permission{"\n"}• You can disconnect
              anytime{"\n"}• Your data stays private and secure
            </Text>
          </View>
        </View>

        <Text style={styles.footer}>Need help? support@nebulanet.space</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  container: { flex: 1 },
  content: { paddingBottom: 24 },

  headerCard: {
    margin: 16,
    marginBottom: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  title: { fontSize: 20, fontWeight: "800", color: TEXT },
  subtitle: { fontSize: 12, color: SUB, marginTop: 6, lineHeight: 18 },

  domainPill: {
    marginTop: 12,
    alignSelf: "flex-start",
    backgroundColor: "#F7F5FF",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: BORDER,
  },
  domainText: { fontSize: 12, fontWeight: "900", color: ACCENT },

  cardsWrap: { paddingHorizontal: 16, gap: 10 },

  providerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  providerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  providerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  providerName: { fontSize: 14, fontWeight: "900", color: TEXT },
  providerDesc: { fontSize: 12, color: SUB, marginTop: 3, lineHeight: 16 },
  connectedMeta: { marginTop: 8 },
  providerMeta: { fontSize: 11, color: "#9CA3AF", marginTop: 2 },

  connectBtn: {
    backgroundColor: ACCENT,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  connectText: { color: "#FFFFFF", fontWeight: "900", fontSize: 12 },

  disconnectBtn: {
    backgroundColor: "#FFF1F2",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#FFE4E6",
  },
  disconnectText: { color: "#EF4444", fontWeight: "900", fontSize: 12 },

  infoCard: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "#FFFFFF",
    margin: 16,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
  },
  infoTitle: { fontSize: 13, fontWeight: "900", color: TEXT, marginBottom: 4 },
  infoText: { fontSize: 12, color: SUB, lineHeight: 18 },

  footer: {
    textAlign: "center",
    fontSize: 12,
    color: SUB,
    paddingHorizontal: 16,
  },
});
