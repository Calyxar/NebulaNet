// app/(auth)/forgot-password.tsx — COMPLETED + UPDATED ✅
import { auth } from "@/lib/firebase";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { sendPasswordResetEmail } from "firebase/auth";
import React, { useState } from "react";
import {
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

export default function ForgotPasswordScreen() {
  const { colors, isDark } = useTheme();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const validateEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const handleResetPassword = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      Alert.alert("Error", "Please enter your email address");
      return;
    }
    if (!validateEmail(trimmed)) {
      Alert.alert("Invalid Email", "Please enter a valid email address");
      return;
    }

    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, trimmed);
      setEmailSent(true);
      Alert.alert(
        "Check Your Email",
        `If an account exists for ${trimmed}, you'll receive a reset link shortly.`,
        [{ text: "OK", onPress: () => router.back() }],
      );
    } catch (error: any) {
      const code = error?.code ?? "";
      if (code === "auth/invalid-email") {
        Alert.alert("Invalid Email", "Please enter a valid email address.");
      } else if (code === "auth/too-many-requests") {
        Alert.alert("Too many attempts", "Please wait and try again later.");
      } else {
        Alert.alert(
          "Check Your Email",
          `If an account exists for ${trimmed}, you'll receive a reset link shortly.`,
          [{ text: "OK", onPress: () => router.back() }],
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

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
            <TouchableOpacity
              style={[styles.backButton, { backgroundColor: colors.card }]}
              onPress={() => router.back()}
              disabled={isLoading}
            >
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>

            <View style={styles.iconContainer}>
              <View
                style={[styles.iconCircle, { backgroundColor: colors.surface }]}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={48}
                  color={colors.primary}
                />
              </View>
            </View>

            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.text }]}>
                Forgot Password?
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {emailSent
                  ? "We've sent you an email with instructions to reset your password."
                  : "Enter your email and we'll send you a reset link."}
              </Text>
            </View>

            {!emailSent ? (
              <>
                <View
                  style={[
                    styles.inputContainer,
                    { backgroundColor: colors.card },
                  ]}
                >
                  <Ionicons
                    name="mail-outline"
                    size={20}
                    color={colors.textTertiary}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="Enter your email"
                    placeholderTextColor={colors.placeholder}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    editable={!isLoading}
                  />
                </View>

                <TouchableOpacity
                  style={[
                    styles.resetButton,
                    { backgroundColor: colors.primary },
                    isLoading && styles.resetButtonDisabled,
                  ]}
                  onPress={handleResetPassword}
                  disabled={isLoading}
                  activeOpacity={0.9}
                >
                  <Text style={styles.resetButtonText}>
                    {isLoading ? "Sending..." : "Send Reset Link"}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.successContainer}>
                  <Ionicons
                    name="checkmark-circle"
                    size={64}
                    color={colors.success}
                  />
                  <Text style={[styles.successText, { color: colors.text }]}>
                    Email Sent!
                  </Text>
                  <Text
                    style={[
                      styles.successSubtext,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Check your inbox at{"\n"}
                    <Text style={[styles.emailText, { color: colors.primary }]}>
                      {email}
                    </Text>
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.resendButton}
                  onPress={handleResetPassword}
                  disabled={isLoading}
                >
                  <Text
                    style={[styles.resendButtonText, { color: colors.primary }]}
                  >
                    Didn&apos;t receive it? Resend
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.backToLoginButton,
                    { borderColor: colors.primary },
                  ]}
                  onPress={() => router.back()}
                  disabled={isLoading}
                >
                  <Text
                    style={[styles.backToLoginText, { color: colors.primary }]}
                  >
                    Back to Login
                  </Text>
                </TouchableOpacity>
              </>
            )}

            <View style={styles.spacer} />

            {!emailSent && (
              <View style={styles.helpContainer}>
                <Text
                  style={[styles.helpText, { color: colors.textSecondary }]}
                >
                  Remember your password?{" "}
                  <Text
                    style={[styles.helpLink, { color: colors.text }]}
                    onPress={() => router.back()}
                  >
                    Sign In
                  </Text>
                </Text>
              </View>
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
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
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 24,
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, padding: 0 },
  resetButton: {
    paddingVertical: 18,
    borderRadius: 28,
    alignItems: "center",
    marginBottom: 24,
  },
  resetButtonDisabled: { opacity: 0.6 },
  resetButtonText: { color: "#FFFFFF", fontSize: 17, fontWeight: "600" },
  successContainer: { alignItems: "center", marginBottom: 32, gap: 12 },
  successText: { fontSize: 24, fontWeight: "700" },
  successSubtext: { fontSize: 15, textAlign: "center", lineHeight: 22 },
  emailText: { fontWeight: "600" },
  resendButton: { paddingVertical: 12, alignItems: "center", marginBottom: 16 },
  resendButtonText: { fontSize: 15, fontWeight: "500" },
  backToLoginButton: {
    paddingVertical: 16,
    borderRadius: 28,
    alignItems: "center",
    borderWidth: 2,
  },
  backToLoginText: { fontSize: 17, fontWeight: "600" },
  spacer: { flex: 1, minHeight: 20 },
  helpContainer: { alignItems: "center", paddingVertical: 16 },
  helpText: { fontSize: 15, textAlign: "center" },
  helpLink: { fontWeight: "600" },
});
