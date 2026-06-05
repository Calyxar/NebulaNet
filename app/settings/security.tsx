import Button from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { useTwoFactorStatus } from "@/hooks/useTwoFactorAuth";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import auth from "@react-native-firebase/auth";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type PasswordForm = { current: string; next: string; confirm: string };

export default function SecurityScreen() {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const { data: twoFactor } = useTwoFactorStatus();
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordData, setPasswordData] = useState<PasswordForm>({
    current: "",
    next: "",
    confirm: "",
  });
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [isSendingVerification, setIsSendingVerification] = useState(false);

  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState(user?.email ?? "");

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
      const currentUser = auth().currentUser;
      if (!currentUser?.email) throw new Error("Not signed in");

      const credential = auth.EmailAuthProvider.credential(
        currentUser.email,
        passwordData.current,
      );
      try {
        await currentUser.reauthenticateWithCredential(credential);
      } catch {
        Alert.alert("Error", "Current password incorrect");
        return;
      }

      await currentUser.updatePassword(passwordData.next);
      setShowPasswordForm(false);
      setPasswordData({ current: "", next: "", confirm: "" });
      Alert.alert("Success", "Password updated");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to update password");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleResetPassword = () => {
    setResetEmail(user?.email ?? "");
    setShowResetModal(true);
  };

  const handleSendResetEmail = async () => {
    if (!resetEmail.trim()) return;
    setIsResettingPassword(true);
    try {
      await auth().sendPasswordResetEmail(resetEmail.trim());
      setShowResetModal(false);
      Alert.alert("Sent", "Check your email for the reset link.");
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to send reset email");
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleSendVerificationEmail = async () => {
    setIsSendingVerification(true);
    try {
      const currentUser = auth().currentUser;
      if (!currentUser) {
        Alert.alert("Error", "Not signed in");
        return;
      }
      await currentUser.sendEmailVerification();
      Alert.alert(
        "Verification Email Sent",
        "Check your inbox and click the verification link.",
      );
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to send verification email");
    } finally {
      setIsSendingVerification(false);
    }
  };

  const verified = auth().currentUser?.emailVerified ?? false;
  const twoFactorEnabled = !!twoFactor?.enabled;

  const content = (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "transparent" }}
      edges={["top", "left", "right"]}
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

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
              Login Security
            </Text>
          </View>

          <View style={[styles.card, { backgroundColor: colors.card }]}>
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
              {!verified && (
                <Button
                  title="Send"
                  variant="outline"
                  onPress={handleSendVerificationEmail}
                  loading={isSendingVerification}
                  style={styles.smallBtn}
                />
              )}
            </View>

            <TouchableOpacity
              style={[styles.row, { borderBottomColor: colors.border }]}
              onPress={() => router.push("/settings/two-factor" as any)}
              activeOpacity={0.85}
            >
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
                <Text
                  style={[
                    styles.rowDesc,
                    {
                      color: twoFactorEnabled
                        ? "#10B981"
                        : colors.textSecondary,
                    },
                  ]}
                >
                  {twoFactorEnabled ? "Enabled" : "Disabled"}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.textTertiary}
              />
            </TouchableOpacity>

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
                    [
                      "Current Password",
                      "New Password",
                      "Confirm New Password",
                    ][i]
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
      </KeyboardAvoidingView>

      {/*
        ✅ FIXED: Reset Password modal now uses a proper Modal + KAV so the
        email input is never hidden behind the keyboard on Android or iOS.
      */}
      <Modal
        visible={showResetModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowResetModal(false)}
        statusBarTranslucent
      >
        <TouchableWithoutFeedback onPress={() => setShowResetModal(false)}>
          <View style={styles.modalBackdrop} />
        </TouchableWithoutFeedback>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalKAV}
          keyboardVerticalOffset={0}
        >
          <View
            style={[
              styles.resetModal,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.modalHandle} />
            <Text style={[styles.resetTitle, { color: colors.text }]}>
              Reset Password
            </Text>
            <Text style={[styles.resetSub, { color: colors.textSecondary }]}>
              Enter your email to receive a reset link
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              placeholder="Email address"
              placeholderTextColor={colors.textTertiary}
              value={resetEmail}
              onChangeText={setResetEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleSendResetEmail}
            />
            <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
              <TouchableOpacity
                style={[
                  styles.modalSaveBtn,
                  {
                    backgroundColor: colors.primary,
                    opacity: isResettingPassword ? 0.6 : 1,
                  },
                ]}
                onPress={handleSendResetEmail}
                disabled={isResettingPassword}
              >
                <Text style={styles.modalSaveBtnText}>
                  {isResettingPassword ? "Sending…" : "Send Link"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { borderColor: colors.border }]}
                onPress={() => setShowResetModal(false)}
              >
                <Text
                  style={[styles.modalCancelBtnText, { color: colors.text }]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  // Modal
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  modalKAV: { position: "absolute", bottom: 0, left: 0, right: 0 },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(150,150,150,0.35)",
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 12,
  },
  resetModal: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
    borderTopWidth: 1,
  },
  resetTitle: { fontSize: 18, fontWeight: "900", marginBottom: 6 },
  resetSub: { fontSize: 13, marginBottom: 16, lineHeight: 18 },
  modalSaveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  modalSaveBtnText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
  },
  modalCancelBtnText: { fontWeight: "800", fontSize: 14 },
});
