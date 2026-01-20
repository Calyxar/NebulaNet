// app/settings/linked-accounts.tsx
import { SettingsGroup, SettingsItem } from "@/components/settings";
import { useAuth } from "@/hooks/useAuth";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

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
    color: "#333",
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
  const { user, signInWithGoogle } = useAuth();
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([
    // Mock data - replace with actual data from your backend
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
        signInWithGoogle();
        break;
      default:
        Alert.alert(
          "Coming Soon",
          `${PROVIDER_INFO[provider].name} integration coming soon`,
        );
        break;
    }
  };

  const handleDisconnect = (account: LinkedAccount) => {
    Alert.alert(
      "Disconnect Account",
      `Are you sure you want to disconnect your ${PROVIDER_INFO[account.provider].name} account?`,
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
              "Success",
              `${PROVIDER_INFO[account.provider].name} account disconnected`,
            );
          },
        },
      ],
    );
  };

  const isConnected = (provider: keyof typeof PROVIDER_INFO) => {
    return linkedAccounts.some((acc) => acc.provider === provider);
  };

  const renderProviderCard = (provider: keyof typeof PROVIDER_INFO) => {
    const info = PROVIDER_INFO[provider];
    const connected = isConnected(provider);
    const account = linkedAccounts.find((acc) => acc.provider === provider);

    return (
      <View key={provider} style={styles.providerCard}>
        <View style={styles.providerHeader}>
          <View
            style={[
              styles.providerIconContainer,
              { backgroundColor: info.color },
            ]}
          >
            <Ionicons name={info.icon} size={24} color="white" />
          </View>
          <View style={styles.providerInfo}>
            <Text style={styles.providerName}>{info.name}</Text>
            <Text style={styles.providerDescription}>{info.description}</Text>
            {connected && account?.email && (
              <Text style={styles.providerEmail}>{account.email}</Text>
            )}
            {connected && account?.connectedAt && (
              <Text style={styles.providerDate}>
                Connected {new Date(account.connectedAt).toLocaleDateString()}
              </Text>
            )}
          </View>
        </View>

        {connected ? (
          <TouchableOpacity
            style={styles.disconnectButton}
            onPress={() => handleDisconnect(account!)}
          >
            <Ionicons name="link" size={16} color="#ff3b30" />
            <Text style={styles.disconnectButtonText}>Disconnect</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.connectButton}
            onPress={() => handleConnect(provider)}
          >
            <Ionicons name="add-outline" size={16} color="white" />
            <Text style={styles.connectButtonText}>Connect</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Linked Accounts</Text>
        <Text style={styles.headerDescription}>
          Connect other accounts to enhance your NebulaNet experience
        </Text>
      </View>

      <View style={styles.providersList}>
        {Object.keys(PROVIDER_INFO).map((provider) =>
          renderProviderCard(provider as keyof typeof PROVIDER_INFO),
        )}
      </View>

      <SettingsGroup title="Account Benefits">
        <SettingsItem
          title="Single Sign-On"
          description="Use connected accounts for easy login"
          icon="log-in-outline"
        />
        <SettingsItem
          title="Profile Import"
          description="Import profile info from connected accounts"
          icon="person-circle-outline"
        />
        <SettingsItem
          title="Content Sharing"
          description="Share content directly to connected platforms"
          icon="share-outline"
        />
        <SettingsItem
          title="Enhanced Features"
          description="Unlock additional features with connected accounts"
          icon="star-outline"
        />
      </SettingsGroup>

      <View style={styles.infoSection}>
        <Ionicons name="information-circle-outline" size={24} color="#007AFF" />
        <View style={styles.infoContent}>
          <Text style={styles.infoTitle}>How Linked Accounts Work</Text>
          <Text style={styles.infoText}>
            • Connected accounts can be used for login{"\n"}• We never post to
            your accounts without permission{"\n"}• You can disconnect accounts
            at any time{"\n"}• Your data remains secure and private
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Need help with connected accounts?{" "}
          <Text
            style={styles.footerLink}
            onPress={() => {
              // In React Native, you would use Linking instead of window.open
              // Linking.openURL('https://support.nebulanet.space/linked-accounts');
              Alert.alert("Info", "Help center would open in a real app");
            }}
          >
            Visit our help center
          </Text>
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    padding: 20,
    backgroundColor: "white",
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#000",
    marginBottom: 8,
  },
  headerDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  providersList: {
    marginBottom: 16,
  },
  providerCard: {
    backgroundColor: "white",
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  providerHeader: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  providerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#007AFF", // Default, will be overridden
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  providerInfo: {
    flex: 1,
  },
  providerName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 2,
  },
  providerDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  providerEmail: {
    fontSize: 12,
    color: "#999",
    marginBottom: 2,
  },
  providerDate: {
    fontSize: 11,
    color: "#ccc",
  },
  connectButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#007AFF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
  },
  connectButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "500",
  },
  disconnectButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#ff3b30",
    gap: 6,
  },
  disconnectButtonText: {
    color: "#ff3b30",
    fontSize: 14,
    fontWeight: "500",
  },
  infoSection: {
    flexDirection: "row",
    backgroundColor: "#e8f4f8",
    margin: 16,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  footer: {
    padding: 20,
    marginBottom: 16,
  },
  footerText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
  },
  footerLink: {
    color: "#007AFF",
    fontWeight: "500",
  },
});
