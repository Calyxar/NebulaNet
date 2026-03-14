// app/settings/security.tsx — UPDATED ✅ dark mode
import Button from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { auth } from "@/lib/firebase";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  updatePassword,
} from "firebase/auth";
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type PasswordForm = { current: string; next: string; confirm: string };

export default function SecurityScreen() {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
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
      Alert.alert("Error", "New password must differ from current");
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser?.email) throw new Error("Not signed in");
      try {
        await reauthenticateWithCredential(
          currentUser,
          EmailAuthProvider.credential(currentUser.email, passwordData.current),
        );
      } catch {
        Alert.alert("Error", "Current password incorrect");
        return;
      }
      await updatePassword(currentUser, passwordData.next);
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
              await sendPasswordResetEmail(auth, email.trim());
              Alert.alert("Sent", "Check your email for the reset link");
            } catch (e: any) {
              Alert.alert("Error", e?.message ?? "Failed to send reset email");
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

  const verified = auth.currentUser?.emailVerified ?? false;

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
              name="shield-checkmark-outline"
              size={20}
              color={colors.primary}
            />
          </View>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              Security
            </Text>
            <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
              Manage login and account security
            </Text>
          </View>
        </View>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            Login Security
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          {/* Email verification */}
          <View style={[styles.row, { borderBottomColor: colors.border }]}>
            <View
              style={[
                styles.rowIcon,
                { backgroundColor: colors.primary + "18" },
              ]}
            >
              <Ionicons
                name={verified ? "checkmark-circle" : "warning-outline"}
                size={18}
                color={verified ? "#16A34A" : "#F59E0B"}
              />
            </View>
            <View style={styles.rowText}>
              <Text style={[styles.rowTitle, { color: colors.text }]}>
                Email Verification
              </Text>
              <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>
                {verified ? "Verified" : "Unverified"}
              </Text>
            </View>
          </View>

          {/* 2FA */}
          <View style={[styles.row, { borderBottomColor: colors.border }]}>
            <View
              style={[
                styles.rowIcon,
                { backgroundColor: colors.primary + "18" },
              ]}
            >
              <Ionicons
                name="shield-checkmark-outline"
                size={18}
                color={colors.primary}
              />
            </View>
            <View style={styles.rowText}>
              <Text style={[styles.rowTitle, { color: colors.text }]}>
                Two-Factor Authentication
              </Text>
              <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>
                Disabled
              </Text>
            </View>
            <Button
              title="Enable"
              variant="outline"
              onPress={() =>
                Alert.alert(
                  "Coming soon",
                  "2FA will be available in a future update.",
                )
              }
              style={styles.smallBtn}
            />
          </View>

          {/* Change password */}
          <View style={[styles.row, { borderBottomWidth: 0 }]}>
            <View
              style={[
                styles.rowIcon,
                { backgroundColor: colors.primary + "18" },
              ]}
            >
              <Ionicons name="key-outline" size={18} color={colors.primary} />
            </View>
            <View style={styles.rowText}>
              <Text style={[styles.rowTitle, { color: colors.text }]}>
                Change Password
              </Text>
              <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>
                Update your account password
              </Text>
            </View>
            <Button
              title={showPasswordForm ? "Hide" : "Edit"}
              variant="outline"
              onPress={() => setShowPasswordForm((v) => !v)}
              style={styles.smallBtn}
            />
          </View>
        </View>

        {showPasswordForm && (
          <View
            style={[
              styles.formCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.formTitle, { color: colors.text }]}>
              Update Password
            </Text>
            {(["current", "next", "confirm"] as const).map((key, i) => (
              <TextInput
                key={key}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                placeholder={
                  ["Current Password", "New Password", "Confirm New Password"][
                    i
                  ]
                }
                placeholderTextColor={colors.textTertiary}
                secureTextEntry
                value={passwordData[key]}
                onChangeText={(t) =>
                  setPasswordData((p) => ({ ...p, [key]: t }))
                }
                autoCapitalize="none"
              />
            ))}
            <View style={styles.formBtns}>
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
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            Account Recovery
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={[styles.row, { borderBottomWidth: 0 }]}>
            <View
              style={[
                styles.rowIcon,
                { backgroundColor: colors.primary + "18" },
              ]}
            >
              <Ionicons
                name="refresh-outline"
                size={18}
                color={colors.primary}
              />
            </View>
            <View style={styles.rowText}>
              <Text style={[styles.rowTitle, { color: colors.text }]}>
                Reset Password
              </Text>
              <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>
                Get a reset link via email
              </Text>
            </View>
            <Button
              title="Send"
              variant="outline"
              onPress={handleResetPassword}
              loading={isResettingPassword}
              style={styles.smallBtn}
            />
          </View>
        </View>

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
              name="shield-checkmark-outline"
              size={18}
              color={colors.primary}
            />
          </View>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            Keep your account secure by using a strong password and enabling
            2FA.
          </Text>
        </View>

        <Text style={[styles.footer, { color: colors.textTertiary }]}>
          nebulanet.space • Security changes may require re-authentication.
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
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
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
    gap: 10,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 14, fontWeight: "800" },
  rowDesc: { marginTop: 3, fontSize: 12, lineHeight: 16 },
  formCard: {
    marginTop: 12,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.04,
    shadowRadius: 18,
    elevation: 1,
  },
  formTitle: { fontSize: 14, fontWeight: "800", marginBottom: 12 },
  input: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    fontSize: 16,
  },
  formBtns: { gap: 10, marginTop: 6 },
  smallBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
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
