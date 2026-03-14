// app/(auth)/reset-password.tsx — UPDATED ✅ dark mode
import { auth } from "@/lib/firebase";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ResetPasswordScreen() {
  const { colors, isDark } = useTheme();
  const { oobCode } = useLocalSearchParams<{ oobCode?: string }>();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [checkingLink, setCheckingLink] = useState(true);
  const [linkValid, setLinkValid] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!oobCode) {
          if (!cancelled) {
            setLinkValid(false);
            setCheckingLink(false);
          }
          return;
        }
        await verifyPasswordResetCode(auth, oobCode);
        if (!cancelled) {
          setLinkValid(true);
          setCheckingLink(false);
        }
      } catch {
        if (!cancelled) {
          setLinkValid(false);
          setCheckingLink(false);
        }
        Alert.alert(
          "Link expired or invalid",
          "Please request a new password reset link.",
          [
            {
              text: "OK",
              onPress: () => router.replace("/(auth)/forgot-password"),
            },
          ],
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [oobCode]);

  const handleReset = async () => {
    if (!oobCode || !linkValid) {
      Alert.alert("Invalid link", "Please request a new password reset link.", [
        {
          text: "OK",
          onPress: () => router.replace("/(auth)/forgot-password"),
        },
      ]);
      return;
    }
    if (!password) {
      Alert.alert("Error", "Please enter a new password");
      return;
    }
    if (password.length < 8) {
      Alert.alert(
        "Weak Password",
        "Password must be at least 8 characters long",
      );
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }
    setIsLoading(true);
    try {
      await confirmPasswordReset(auth, oobCode, password);
      Alert.alert(
        "Success!",
        "Your password has been reset. You can now log in.",
        [{ text: "OK", onPress: () => router.replace("/(auth)/login") }],
      );
    } catch (error: any) {
      Alert.alert(
        "Error",
        error?.message || "Failed to reset password. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (checkingLink) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.iconContainer}>
              <View
                style={[styles.iconCircle, { backgroundColor: colors.card }]}
              >
                <Ionicons name="key-outline" size={48} color={colors.primary} />
              </View>
            </View>

            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.text }]}>
                Create New Password
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {linkValid
                  ? "Your new password must be different from your previous password."
                  : "This screen is used from a password reset link."}
              </Text>
            </View>

            {[
              {
                value: password,
                setter: setPassword,
                show: showPassword,
                toggle: () => setShowPassword((v) => !v),
                placeholder: "New Password (min. 8 characters)",
              },
              {
                value: confirmPassword,
                setter: setConfirmPassword,
                show: showConfirmPassword,
                toggle: () => setShowConfirmPassword((v) => !v),
                placeholder: "Confirm new password",
              },
            ].map(({ value, setter, show, toggle, placeholder }) => (
              <View key={placeholder} style={[styles.passwordContainer]}>
                <View
                  style={[
                    styles.inputWrapper,
                    { backgroundColor: colors.card },
                  ]}
                >
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color={colors.textTertiary}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.pwInput, { color: colors.text }]}
                    placeholder={placeholder}
                    placeholderTextColor={colors.textTertiary}
                    value={value}
                    onChangeText={setter}
                    secureTextEntry={!show}
                    autoCapitalize="none"
                    editable={!isLoading}
                  />
                  <TouchableOpacity
                    onPress={toggle}
                    style={styles.eyeBtn}
                    disabled={isLoading}
                  >
                    <Ionicons
                      name={show ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color={colors.textTertiary}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            <View
              style={[styles.reqContainer, { backgroundColor: colors.card }]}
            >
              <Text style={[styles.reqTitle, { color: colors.text }]}>
                Password must contain:
              </Text>
              {[
                { label: "At least 8 characters", met: password.length >= 8 },
                {
                  label: "Passwords match",
                  met: password === confirmPassword && password.length > 0,
                },
              ].map(({ label, met }) => (
                <View key={label} style={styles.reqItem}>
                  <Ionicons
                    name={met ? "checkmark-circle" : "ellipse-outline"}
                    size={18}
                    color={met ? "#10B981" : colors.textTertiary}
                  />
                  <Text
                    style={[
                      styles.reqText,
                      { color: met ? "#10B981" : colors.textTertiary },
                    ]}
                  >
                    {label}
                  </Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={[
                styles.resetBtn,
                { backgroundColor: colors.primary },
                (isLoading || !linkValid) && { opacity: 0.6 },
              ]}
              onPress={handleReset}
              disabled={isLoading || !linkValid}
              activeOpacity={0.9}
            >
              <Text style={styles.resetBtnText}>
                {isLoading ? "Resetting..." : "Reset Password"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backRow}
              onPress={() => router.replace("/(auth)/login")}
            >
              <Ionicons
                name="arrow-back"
                size={20}
                color={colors.textTertiary}
              />
              <Text style={[styles.backText, { color: colors.textTertiary }]}>
                Back to Login
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 24,
  },
  iconContainer: { alignItems: "center", marginBottom: 24 },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  header: { marginBottom: 32, alignItems: "center" },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  passwordContainer: { marginBottom: 16 },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  inputIcon: { marginRight: 12 },
  pwInput: { flex: 1, fontSize: 16, padding: 0 },
  eyeBtn: { padding: 4 },
  reqContainer: { borderRadius: 12, padding: 16, marginBottom: 24, gap: 10 },
  reqTitle: { fontSize: 14, fontWeight: "600", marginBottom: 4 },
  reqItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  reqText: { fontSize: 14 },
  resetBtn: {
    paddingVertical: 18,
    borderRadius: 28,
    alignItems: "center",
    marginBottom: 24,
  },
  resetBtnText: { color: "#FFFFFF", fontSize: 17, fontWeight: "600" },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
  },
  backText: { fontSize: 15, fontWeight: "500" },
});
