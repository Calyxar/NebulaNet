// app/(auth)/create-password.tsx — UPDATED ✅ dark mode
import { auth } from "@/lib/firebase";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
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

export default function CreatePasswordScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { oobCode } = useLocalSearchParams<{
    oobCode?: string;
    mode?: string;
  }>();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [checkingLink, setCheckingLink] = useState(true);
  const [linkValid, setLinkValid] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const hasMinLength = password.length >= 8;
  const hasValidContent = /^(?=.*[a-zA-Z])(?=.*[0-9])/.test(password);
  const passwordsMatch =
    password === confirmPassword && confirmPassword.length > 0;
  const avoidCommonWords = !/(password|12345678|qwerty)/i.test(password);
  const isValid =
    hasMinLength && hasValidContent && passwordsMatch && avoidCommonWords;

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
  }, [oobCode, router]);

  const handleContinue = async () => {
    if (!isValid) return;
    if (!oobCode || !linkValid) {
      Alert.alert("Invalid link", "Please request a new password reset link.", [
        {
          text: "OK",
          onPress: () => router.replace("/(auth)/forgot-password"),
        },
      ]);
      return;
    }
    setSubmitting(true);
    try {
      await confirmPasswordReset(auth, oobCode, password);
      Alert.alert(
        "Password updated",
        "Your password has been reset. Please log in.",
        [{ text: "OK", onPress: () => router.replace("/(auth)/login") }],
      );
    } catch (error: any) {
      Alert.alert(
        "Reset failed",
        error?.message || "Unable to reset password.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (checkingLink) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
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
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.text }]}>
                Create Password
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {linkValid
                  ? "Create a strong password to protect your account."
                  : "This screen is used for password reset links."}
              </Text>
            </View>

            {[
              {
                value: password,
                setter: setPassword,
                show: showPassword,
                toggle: () => setShowPassword((v) => !v),
                placeholder: "Password",
              },
              {
                value: confirmPassword,
                setter: setConfirmPassword,
                show: showConfirmPassword,
                toggle: () => setShowConfirmPassword((v) => !v),
                placeholder: "Confirm Password",
              },
            ].map(({ value, setter, show, toggle, placeholder }) => (
              <View
                key={placeholder}
                style={[styles.inputContainer, { marginBottom: 16 }]}
              >
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
                    style={[styles.input, { color: colors.text }]}
                    placeholder={placeholder}
                    placeholderTextColor={colors.textTertiary}
                    value={value}
                    onChangeText={setter}
                    secureTextEntry={!show}
                    autoCapitalize="none"
                    editable={!submitting}
                  />
                  <TouchableOpacity
                    onPress={toggle}
                    style={styles.eyeBtn}
                    disabled={submitting}
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
              {[
                {
                  label:
                    "At least 8 characters (include letters, numbers, and symbols).",
                  met: hasMinLength,
                },
                {
                  label: "Avoid common words or easily guessed phrases.",
                  met: avoidCommonWords,
                },
              ].map(({ label, met }) => (
                <View key={label} style={styles.reqRow}>
                  <Ionicons
                    name={met ? "checkmark-circle" : "checkmark-circle-outline"}
                    size={20}
                    color={met ? colors.primary : colors.textTertiary}
                  />
                  <Text
                    style={[
                      styles.reqText,
                      { color: met ? colors.primary : colors.textTertiary },
                    ]}
                  >
                    {label}
                  </Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={[
                styles.continueBtn,
                {
                  backgroundColor:
                    !isValid || !linkValid || submitting
                      ? colors.border
                      : colors.primary,
                },
              ]}
              onPress={handleContinue}
              disabled={!isValid || !linkValid || submitting}
              activeOpacity={0.9}
            >
              <Text style={styles.continueBtnText}>
                {submitting ? "Updating..." : "Continue"}
              </Text>
            </TouchableOpacity>

            {!oobCode && (
              <TouchableOpacity
                onPress={() => router.replace("/(auth)/forgot-password")}
                style={{ marginTop: 14, alignItems: "center" }}
              >
                <Text style={{ color: colors.primary, fontWeight: "700" }}>
                  Request a reset link
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 40 },
  header: { marginBottom: 32 },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 8 },
  subtitle: { fontSize: 15, lineHeight: 22 },
  inputContainer: {},
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, padding: 0 },
  eyeBtn: { padding: 4 },
  reqContainer: { borderRadius: 16, padding: 16, marginBottom: 32, gap: 12 },
  reqRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  reqText: { flex: 1, fontSize: 14, lineHeight: 20 },
  continueBtn: {
    paddingVertical: 18,
    borderRadius: 28,
    alignItems: "center",
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  continueBtnText: { color: "#FFFFFF", fontSize: 17, fontWeight: "600" },
});
