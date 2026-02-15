// app/settings/security.tsx — NebulaNet RESKIN + fixes implicit any + typed routing
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Button from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";

type PasswordForm = { current: string; next: string; confirm: string };

const emailVerified = (user: { email_confirmed_at?: string | null } | null) =>
  !!user?.email_confirmed_at;

export default function SecurityScreen() {
  const { user } = useAuth();

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordData, setPasswordData] = useState<PasswordForm>({
    current: "",
    next: "",
    confirm: "",
  });
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const handlePasswordUpdate = async () => {
    if (!passwordData.current) {
      Alert.alert("Error", "Please enter your current password");
      return;
    }
    if (passwordData.next.length < 6) {
      Alert.alert("Error", "New password must be at least 6 characters");
      return;
    }
    if (passwordData.next !== passwordData.confirm) {
      Alert.alert("Error", "New passwords do not match");
      return;
    }
    if (passwordData.current === passwordData.next) {
      Alert.alert(
        "Error",
        "New password must be different from current password",
      );
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user?.email || "",
      password: passwordData.current,
    });

    if (signInError) {
      Alert.alert("Error", "Current password incorrect");
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordData.next,
      });
      if (updateError) {
        Alert.alert("Error", updateError.message ?? "Failed to update password");
        return;
      }
      setShowPasswordForm(false);
      setPasswordData({ current: "", next: "", confirm: "" });
      Alert.alert("Success", "Password updated");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleResetPassword = () => {
    Alert.prompt(
      "Reset Password",
      "Enter your email to receive a reset link",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send",
          onPress: async (email: string | undefined) => {
            if (!email?.trim()) return;
            setIsResettingPassword(true);
            try {
              const { error } = await supabase.auth.resetPasswordForEmail(
                email.trim(),
                { redirectTo: undefined },
              );
              if (error) {
                Alert.alert("Error", error.message ?? "Failed to send reset email");
              } else {
                Alert.alert("Success", "Check your email for the reset link");
              }
            } finally {
              setIsResettingPassword(false);
            }
          },
        },
      ],
      "plain-text",
      user?.email ?? "",
    );
  };

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
                name="shield-checkmark-outline"
                size={20}
                color="#7C3AED"
              />
            </View>
            <View>
              <Text style={styles.headerTitle}>Security</Text>
              <Text style={styles.headerSub}>
                Manage login and account security
              </Text>
            </View>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderText}>Login Security</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.rowIcon}>
                <Ionicons
                  name={
                    emailVerified(user)
                      ? "checkmark-circle"
                      : "warning-outline"
                  }
                  size={18}
                  color={emailVerified(user) ? "#16A34A" : "#F59E0B"}
                />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>Email Verification</Text>
                <Text style={styles.rowDesc}>
                  {emailVerified(user) ? "Verified" : "Unverified"}
                </Text>
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.rowIcon}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={18}
                  color="#7C3AED"
                />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>Two-Factor Authentication</Text>
                <Text style={styles.rowDesc}>Disabled</Text>
              </View>
              <Button
                title="Enable"
                variant="outline"
                onPress={() =>
                  Alert.alert(
                    "Coming soon",
                    "Two-factor authentication will be available in a future update.",
                  )
                }
                style={styles.smallButton}
              />
            </View>

            <View style={[styles.row, { borderBottomWidth: 0 }]}>
              <View style={styles.rowIcon}>
                <Ionicons name="key-outline" size={18} color="#7C3AED" />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>Change Password</Text>
                <Text style={styles.rowDesc}>Update your account password</Text>
              </View>
              <Button
                title={showPasswordForm ? "Hide" : "Edit"}
                variant="outline"
                onPress={() => setShowPasswordForm((v) => !v)}
                style={styles.smallButton}
              />
            </View>
          </View>

          {showPasswordForm && (
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>Update Password</Text>

              <TextInput
                style={styles.input}
                placeholder="Current Password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
                value={passwordData.current}
                onChangeText={(t) =>
                  setPasswordData((p) => ({ ...p, current: t }))
                }
                autoCapitalize="none"
              />
              <TextInput
                style={styles.input}
                placeholder="New Password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
                value={passwordData.next}
                onChangeText={(t) =>
                  setPasswordData((p) => ({ ...p, next: t }))
                }
                autoCapitalize="none"
              />
              <TextInput
                style={styles.input}
                placeholder="Confirm New Password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
                value={passwordData.confirm}
                onChangeText={(t) =>
                  setPasswordData((p) => ({ ...p, confirm: t }))
                }
                autoCapitalize="none"
              />

              <View style={styles.formButtons}>
                <Button
                  title="Update Password"
                  onPress={handlePasswordUpdate}
                  loading={isUpdatingPassword}
                  disabled={
                    !passwordData.current ||
                    passwordData.next.length < 6 ||
                    passwordData.next !== passwordData.confirm
                  }
                />
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={() => {
                    setShowPasswordForm(false);
                    setPasswordData({ current: "", next: "", confirm: "" });
                  }}
                  disabled={isUpdatingPassword}
                />
              </View>
            </View>
          )}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderText}>Account Recovery</Text>
          </View>

          <View style={styles.card}>
            <View style={[styles.row, { borderBottomWidth: 0 }]}>
              <View style={styles.rowIcon}>
                <Ionicons name="refresh-outline" size={18} color="#7C3AED" />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>Reset Password</Text>
                <Text style={styles.rowDesc}>Get a reset link via email</Text>
              </View>
              <Button
                title="Send"
                variant="outline"
                onPress={handleResetPassword}
                loading={isResettingPassword}
                style={styles.smallButton}
              />
            </View>
          </View>

          <View style={styles.infoBox}>
            <View style={styles.infoIcon}>
              <Ionicons
                name="shield-checkmark-outline"
                size={18}
                color="#7C3AED"
              />
            </View>
            <Text style={styles.infoText}>
              Keep your account secure by using a strong password and enabling
              2FA.
            </Text>
          </View>

          <Text style={styles.footerText}>
            nebulanet.space • Security changes may require re-authentication.
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
    gap: 10,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 14, fontWeight: "800", color: "#111827" },
  rowDesc: { marginTop: 3, fontSize: 12, color: "#6B7280", lineHeight: 16 },

  formCard: {
    marginTop: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EEF2FF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.04,
    shadowRadius: 18,
    elevation: 1,
  },
  formTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 12,
  },

  input: {
    backgroundColor: "#F7F7FB",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    fontSize: 16,
    color: "#111827",
  },

  formButtons: { gap: 10, marginTop: 6 },

  smallButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },

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
