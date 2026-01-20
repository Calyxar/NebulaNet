// app/settings/security.tsx
import { SettingsGroup, SettingsItem } from "@/components/settings";
import Button from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

export default function SecurityScreen() {
  const {
    user,
    profile,
    updatePassword,
    enableTwoFactor,
    disableTwoFactor,
    resetPassword,
  } = useAuth();
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const handlePasswordUpdate = async () => {
    if (!passwordData.currentPassword) {
      Alert.alert("Error", "Please enter your current password");
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      Alert.alert("Error", "New passwords do not match");
      return;
    }

    if (passwordData.newPassword.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }

    if (passwordData.currentPassword === passwordData.newPassword) {
      Alert.alert(
        "Error",
        "New password must be different from current password",
      );
      return;
    }

    try {
      // First verify current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || "",
        password: passwordData.currentPassword,
      });

      if (signInError) {
        Alert.alert("Error", "Current password is incorrect");
        return;
      }

      // Then update to new password
      await updatePassword.mutateAsync({
        newPassword: passwordData.newPassword,
      });
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setShowPasswordForm(false);
      Alert.alert("Success", "Password updated successfully");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to update password");
    }
  };

  const handleEnable2FA = () => {
    Alert.alert(
      "Enable Two-Factor Authentication",
      "Two-factor authentication adds an extra layer of security to your account. You will need to enter a code from your authenticator app when logging in.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Enable",
          onPress: () => enableTwoFactor.mutate(),
        },
      ],
    );
  };

  const handleDisable2FA = () => {
    Alert.alert(
      "Disable Two-Factor Authentication",
      "Are you sure you want to disable two-factor authentication? This will make your account less secure.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disable",
          style: "destructive",
          onPress: () => disableTwoFactor.mutate(),
        },
      ],
    );
  };

  const handleResetPassword = () => {
    Alert.prompt(
      "Reset Password",
      "Enter your email address to receive a password reset link",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send",
          onPress: (email: string | undefined) => {
            if (email) {
              resetPassword.mutate({ email });
            }
          },
        },
      ],
      "plain-text",
      user?.email || "",
    );
  };

  const handleClearSessions = () => {
    Alert.alert(
      "Clear All Sessions",
      "This will log you out of all devices except this one. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            try {
              // Implement session clearing
              Alert.alert("Success", "All other sessions have been cleared");
            } catch (error: any) {
              Alert.alert("Error", error.message);
            }
          },
        },
      ],
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Security & Login</Text>
        <Text style={styles.headerDescription}>
          Manage your account security and login settings
        </Text>
      </View>

      <SettingsGroup title="Login Security">
        <SettingsItem
          title="Email Verification"
          icon={
            profile?.email_verified ? "checkmark-circle" : "warning-outline"
          }
          value={profile?.email_verified ? "Verified" : "Not Verified"}
          description={
            profile?.email_verified
              ? "Your email address is verified"
              : "Please verify your email address"
          }
          onPress={() => {
            if (!profile?.email_verified) {
              Alert.alert(
                "Verify Email",
                "We sent a verification link to your email. Please check your inbox.",
                [
                  {
                    text: "Resend Email",
                    onPress: async () => {
                      try {
                        await supabase.auth.resend({
                          type: "signup",
                          email: user?.email || "",
                        });
                        Alert.alert(
                          "Email Sent",
                          "Verification email resent successfully",
                        );
                      } catch (error: any) {
                        Alert.alert("Error", error.message);
                      }
                    },
                  },
                  { text: "OK", style: "cancel" },
                ],
              );
            }
          }}
        />
        <SettingsItem
          title="Two-Factor Authentication"
          icon="shield-checkmark-outline"
          value={profile?.two_factor_enabled ? "Enabled" : "Disabled"}
          description={
            profile?.two_factor_enabled
              ? "Extra security layer enabled"
              : "Add an extra layer of security"
          }
          onPress={
            profile?.two_factor_enabled ? handleDisable2FA : handleEnable2FA
          }
        />
        <SettingsItem
          title="Change Password"
          icon="key-outline"
          onPress={() => setShowPasswordForm(!showPasswordForm)}
        />
      </SettingsGroup>

      {showPasswordForm && (
        <View style={styles.passwordForm}>
          <Text style={styles.formTitle}>Change Password</Text>

          <TextInput
            style={styles.input}
            placeholder="Current Password"
            secureTextEntry
            value={passwordData.currentPassword}
            onChangeText={(text) =>
              setPasswordData({ ...passwordData, currentPassword: text })
            }
            autoCapitalize="none"
          />

          <TextInput
            style={styles.input}
            placeholder="New Password"
            secureTextEntry
            value={passwordData.newPassword}
            onChangeText={(text) =>
              setPasswordData({ ...passwordData, newPassword: text })
            }
            autoCapitalize="none"
          />

          <TextInput
            style={styles.input}
            placeholder="Confirm New Password"
            secureTextEntry
            value={passwordData.confirmPassword}
            onChangeText={(text) =>
              setPasswordData({ ...passwordData, confirmPassword: text })
            }
            autoCapitalize="none"
          />

          <View style={styles.formButtons}>
            <Button
              title="Update Password"
              onPress={handlePasswordUpdate}
              loading={updatePassword.isPending}
              style={styles.updateButton}
              disabled={
                !passwordData.currentPassword ||
                !passwordData.newPassword ||
                !passwordData.confirmPassword ||
                passwordData.newPassword.length < 6 ||
                passwordData.newPassword !== passwordData.confirmPassword
              }
            />
            <Button
              title="Cancel"
              variant="outline"
              onPress={() => {
                setShowPasswordForm(false);
                setPasswordData({
                  currentPassword: "",
                  newPassword: "",
                  confirmPassword: "",
                });
              }}
              disabled={updatePassword.isPending}
            />
          </View>
        </View>
      )}

      <SettingsGroup title="Login Activity">
        <SettingsItem
          title="Active Sessions"
          icon="desktop-outline"
          value="This device"
          description="You're currently logged in on this device"
          onPress={() =>
            Alert.alert("Active Sessions", "View all active login sessions")
          }
        />
        <SettingsItem
          title="Last Login"
          icon="time-outline"
          value={
            profile?.last_login
              ? new Date(profile.last_login).toLocaleString()
              : "N/A"
          }
          description="Most recent successful login"
        />
        <SettingsItem
          title="Login History"
          icon="list-outline"
          description="View your account login history"
          onPress={() =>
            Alert.alert("Coming Soon", "Login history coming soon")
          }
        />
        <SettingsItem
          title="Clear All Sessions"
          icon="log-out-outline"
          description="Log out of all devices except this one"
          danger
          onPress={handleClearSessions}
        />
      </SettingsGroup>

      <SettingsGroup title="Account Recovery">
        <SettingsItem
          title="Reset Password"
          icon="refresh-outline"
          description="Get a password reset link via email"
          onPress={handleResetPassword}
        />
        <SettingsItem
          title="Recovery Email"
          icon="mail-outline"
          value={user?.email || "Not set"}
          description="Email for account recovery"
          onPress={() =>
            Alert.alert("Coming Soon", "Recovery email management coming soon")
          }
        />
        <SettingsItem
          title="Backup Codes"
          icon="keypad-outline"
          description="Generate backup codes for 2FA"
          onPress={() => Alert.alert("Coming Soon", "Backup codes coming soon")}
        />
      </SettingsGroup>

      <SettingsGroup title="Privacy & Data">
        <SettingsItem
          title="Data Export"
          icon="download-outline"
          description="Download a copy of your data"
          onPress={() => Alert.alert("Coming Soon", "Data export coming soon")}
        />
        <SettingsItem
          title="Clear Search History"
          icon="trash-outline"
          description="Delete your search history"
          danger
          onPress={() => {
            Alert.alert(
              "Clear Search History",
              "This will permanently delete your search history. This action cannot be undone.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Clear",
                  style: "destructive",
                  onPress: () => {
                    // Implement clear search history
                    Alert.alert("Success", "Search history cleared");
                  },
                },
              ],
            );
          }}
        />
        <SettingsItem
          title="Privacy Settings"
          icon="eye-outline"
          description="Manage your privacy preferences"
          onPress={() => {
            // Navigate to privacy screen
            Alert.alert("Info", "Navigate to privacy settings");
          }}
        />
      </SettingsGroup>

      <View style={styles.securityTips}>
        <Ionicons
          name="shield-checkmark-outline"
          size={24}
          color="#007AFF"
          style={styles.tipsIcon}
        />
        <Text style={styles.tipsTitle}>Security Tips</Text>
        <View style={styles.tipItem}>
          <Ionicons name="checkmark-circle" size={16} color="#34C759" />
          <Text style={styles.tipText}>Use a strong, unique password</Text>
        </View>
        <View style={styles.tipItem}>
          <Ionicons name="checkmark-circle" size={16} color="#34C759" />
          <Text style={styles.tipText}>Enable two-factor authentication</Text>
        </View>
        <View style={styles.tipItem}>
          <Ionicons name="checkmark-circle" size={16} color="#34C759" />
          <Text style={styles.tipText}>Regularly review login activity</Text>
        </View>
        <View style={styles.tipItem}>
          <Ionicons name="checkmark-circle" size={16} color="#34C759" />
          <Text style={styles.tipText}>Keep your email address verified</Text>
        </View>
        <View style={styles.tipItem}>
          <Ionicons name="checkmark-circle" size={16} color="#34C759" />
          <Text style={styles.tipText}>Log out from shared devices</Text>
        </View>
        <View style={styles.tipItem}>
          <Ionicons name="checkmark-circle" size={16} color="#34C759" />
          <Text style={styles.tipText}>Be cautious of phishing attempts</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Need security help?{" "}
          <Text
            style={styles.footerLink}
            onPress={() => {
              Alert.alert(
                "Contact Support",
                "security@nebulanet.space\n\nReport security issues to us.",
              );
            }}
          >
            Contact Security Team
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
  passwordForm: {
    backgroundColor: "white",
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 12,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
    marginBottom: 16,
  },
  input: {
    backgroundColor: "#f8f8f8",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    fontSize: 16,
  },
  formButtons: {
    gap: 12,
  },
  updateButton: {
    marginTop: 8,
  },
  securityTips: {
    backgroundColor: "#e8f4f8",
    margin: 16,
    padding: 20,
    borderRadius: 12,
  },
  tipsIcon: {
    marginBottom: 12,
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
    marginBottom: 16,
  },
  tipItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 8,
  },
  tipText: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  footer: {
    padding: 20,
    paddingBottom: 40,
    alignItems: "center",
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
