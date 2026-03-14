// app/settings/change-password.tsx — UPDATED ✅ dark mode
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
import { useState } from "react";
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

interface PasswordStrength {
  score: number;
  text: string;
  color: string;
}

function passwordStrength(password: string): PasswordStrength {
  if (!password) return { score: 0, text: "", color: "transparent" };
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  const map: Record<number, { text: string; color: string }> = {
    0: { text: "Very weak", color: "#ff3b30" },
    1: { text: "Weak", color: "#ff9500" },
    2: { text: "Fair", color: "#ffcc00" },
    3: { text: "Good", color: "#34c759" },
    4: { text: "Strong", color: "#32d74b" },
    5: { text: "Very strong", color: "#30d158" },
  };
  return { score, ...map[Math.min(score, 5)] };
}

export default function ChangePasswordScreen() {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [show, setShow] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [isLoading, setIsLoading] = useState(false);

  const update = (key: keyof typeof formData) => (val: string) =>
    setFormData((p) => ({ ...p, [key]: val }));
  const toggleShow = (key: keyof typeof show) =>
    setShow((p) => ({ ...p, [key]: !p[key] }));

  const validate = () => {
    if (!formData.currentPassword) {
      Alert.alert("Error", "Enter your current password");
      return false;
    }
    if (formData.newPassword.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return false;
    }
    if (formData.newPassword !== formData.confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return false;
    }
    if (formData.currentPassword === formData.newPassword) {
      Alert.alert("Error", "New password must differ from current");
      return false;
    }
    return true;
  };

  const handleUpdate = async () => {
    if (!validate()) return;
    setIsLoading(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser?.email) throw new Error("Not signed in");
      try {
        await reauthenticateWithCredential(
          currentUser,
          EmailAuthProvider.credential(
            currentUser.email,
            formData.currentPassword,
          ),
        );
      } catch {
        Alert.alert("Error", "Current password is incorrect");
        return;
      }
      await updatePassword(currentUser, formData.newPassword);
      setFormData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      Alert.alert("Success", "Password updated successfully.");
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to update password");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgot = () => {
    Alert.alert("Forgot Password?", "Send a reset link to your email?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Send",
        onPress: async () => {
          try {
            await sendPasswordResetEmail(auth, user?.email || "");
            Alert.alert("Sent", "Check your email for reset instructions.");
          } catch (e: any) {
            Alert.alert("Error", e.message);
          }
        },
      },
    ]);
  };

  const strength = passwordStrength(formData.newPassword);
  const requirements = [
    { label: "At least 8 characters", met: formData.newPassword.length >= 8 },
    {
      label: "Upper and lowercase letters",
      met:
        /[A-Z]/.test(formData.newPassword) &&
        /[a-z]/.test(formData.newPassword),
    },
    { label: "At least one number", met: /[0-9]/.test(formData.newPassword) },
    {
      label: "At least one special character",
      met: /[^A-Za-z0-9]/.test(formData.newPassword),
    },
  ];

  const PasswordField = ({
    label,
    value,
    onChange,
    visible,
    onToggle,
    showForgot,
  }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    visible: boolean;
    onToggle: () => void;
    showForgot?: boolean;
  }) => (
    <View style={styles.inputGroup}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>
        {label}
      </Text>
      <View
        style={[
          styles.pwWrap,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <TextInput
          style={[styles.pwInput, { color: colors.text }]}
          placeholder={`Enter ${label.toLowerCase()}`}
          placeholderTextColor={colors.textTertiary}
          value={value}
          onChangeText={onChange}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity style={styles.eyeBtn} onPress={onToggle}>
          <Ionicons
            name={visible ? "eye-off-outline" : "eye-outline"}
            size={20}
            color={colors.textTertiary}
          />
        </TouchableOpacity>
      </View>
      {showForgot && (
        <TouchableOpacity style={styles.forgotBtn} onPress={handleForgot}>
          <Text style={[styles.forgotText, { color: colors.primary }]}>
            Forgot password?
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

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
            styles.backBtn,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
          onPress={() => router.back()}
          activeOpacity={0.85}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Change Password
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            Update your password
          </Text>
          <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
            Keep your account secure with a strong password.
          </Text>
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <PasswordField
            label="Current Password"
            value={formData.currentPassword}
            onChange={update("currentPassword")}
            visible={show.current}
            onToggle={() => toggleShow("current")}
            showForgot
          />

          <PasswordField
            label="New Password"
            value={formData.newPassword}
            onChange={update("newPassword")}
            visible={show.new}
            onToggle={() => toggleShow("new")}
          />

          {/* Strength bar */}
          {!!formData.newPassword && (
            <View style={styles.strengthRow}>
              <View
                style={[
                  styles.strengthBar,
                  { backgroundColor: colors.surface },
                ]}
              >
                {[1, 2, 3, 4, 5].map((i) => (
                  <View
                    key={i}
                    style={[
                      styles.strengthSeg,
                      {
                        backgroundColor:
                          i <= strength.score ? strength.color : "transparent",
                      },
                    ]}
                  />
                ))}
              </View>
              <Text style={[styles.strengthLabel, { color: strength.color }]}>
                {strength.text}
              </Text>
            </View>
          )}

          {/* Requirements */}
          <View
            style={[
              styles.reqBox,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.reqTitle, { color: colors.textSecondary }]}>
              Password must include:
            </Text>
            {requirements.map(({ label, met }) => (
              <View key={label} style={styles.reqItem}>
                <Ionicons
                  name={met ? "checkmark-circle" : "ellipse-outline"}
                  size={16}
                  color={met ? "#34c759" : colors.textTertiary}
                />
                <Text
                  style={[
                    styles.reqText,
                    { color: met ? "#34c759" : colors.textTertiary },
                  ]}
                >
                  {label}
                </Text>
              </View>
            ))}
          </View>

          <PasswordField
            label="Confirm New Password"
            value={formData.confirmPassword}
            onChange={update("confirmPassword")}
            visible={show.confirm}
            onToggle={() => toggleShow("confirm")}
          />

          {!!formData.confirmPassword &&
            formData.newPassword !== formData.confirmPassword && (
              <Text style={styles.errText}>Passwords do not match</Text>
            )}
          {!!formData.confirmPassword &&
            formData.newPassword === formData.confirmPassword && (
              <Text style={styles.okText}>Passwords match ✓</Text>
            )}
        </View>

        {/* Security tips */}
        <View
          style={[
            styles.infoCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Ionicons
            name="shield-checkmark-outline"
            size={20}
            color={colors.primary}
          />
          <View style={{ flex: 1 }}>
            <Text style={[styles.infoTitle, { color: colors.text }]}>
              Security Tips
            </Text>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              {
                "• Use a unique password not used on other sites\n• Consider a password manager\n• Never share your password"
              }
            </Text>
          </View>
        </View>

        <View style={styles.btnWrap}>
          <Button
            title="Update Password"
            onPress={handleUpdate}
            loading={isLoading}
            disabled={
              !formData.currentPassword ||
              !formData.newPassword ||
              !formData.confirmPassword ||
              formData.newPassword !== formData.confirmPassword ||
              formData.newPassword.length < 6
            }
          />
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={() =>
              setFormData({
                currentPassword: "",
                newPassword: "",
                confirmPassword: "",
              })
            }
            disabled={isLoading}
          >
            <Text style={[styles.clearText, { color: colors.textSecondary }]}>
              Clear Form
            </Text>
          </TouchableOpacity>
        </View>
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
    paddingTop: 6,
    paddingBottom: 10,
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
    gap: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  cardTitle: { fontSize: 17, fontWeight: "800" },
  cardSub: { fontSize: 13, lineHeight: 18 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: "600", marginBottom: 8 },
  pwWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
  },
  pwInput: { flex: 1, padding: 13, fontSize: 15 },
  eyeBtn: { padding: 12 },
  forgotBtn: { alignSelf: "flex-end", marginTop: 8 },
  forgotText: { fontSize: 13, fontWeight: "600" },
  strengthRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  strengthBar: {
    flex: 1,
    flexDirection: "row",
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
    gap: 2,
  },
  strengthSeg: { flex: 1, height: "100%", borderRadius: 2 },
  strengthLabel: { fontSize: 12, fontWeight: "600" },
  reqBox: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    gap: 8,
    marginBottom: 16,
  },
  reqTitle: { fontSize: 13, fontWeight: "600", marginBottom: 2 },
  reqItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  reqText: { fontSize: 13 },
  errText: { fontSize: 13, color: "#ff3b30", marginTop: 4 },
  okText: { fontSize: 13, color: "#34c759", marginTop: 4 },
  infoCard: {
    flexDirection: "row",
    gap: 12,
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
  },
  infoTitle: { fontSize: 13, fontWeight: "800", marginBottom: 4 },
  infoText: { fontSize: 12, lineHeight: 18 },
  btnWrap: { gap: 8 },
  clearBtn: { alignItems: "center", padding: 14 },
  clearText: { fontSize: 15, fontWeight: "600" },
});
