// app/(auth)/forgot-password.tsx
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
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
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleResetPassword = async () => {
    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email address");
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert("Invalid Email", "Please enter a valid email address");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: "nebulanet://reset-password",
      });

      if (error) {
        throw error;
      }

      setEmailSent(true);
      Alert.alert(
        "Check Your Email",
        `We've sent a password reset link to ${email}. Please check your inbox and follow the instructions.`,
        [
          {
            text: "OK",
            onPress: () => {
              // Optionally navigate back to login
              setTimeout(() => {
                router.back();
              }, 500);
            },
          },
        ],
      );
    } catch (error: any) {
      console.error("Reset password error:", error);
      Alert.alert(
        "Error",
        error.message || "Failed to send reset email. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendEmail = async () => {
    setEmailSent(false);
    await handleResetPassword();
  };

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#E8EAF6" />
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Back Button */}
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>

            {/* Icon */}
            <View style={styles.iconContainer}>
              <View style={styles.iconCircle}>
                <Ionicons
                  name="lock-closed-outline"
                  size={48}
                  color="#7C3AED"
                />
              </View>
            </View>

            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Forgot Password?</Text>
              <Text style={styles.subtitle}>
                {emailSent
                  ? "We've sent you an email with instructions to reset your password."
                  : "No worries! Enter your email address and we'll send you a link to reset your password."}
              </Text>
            </View>

            {!emailSent ? (
              <>
                {/* Email Input */}
                <View style={styles.inputContainer}>
                  <Ionicons
                    name="mail-outline"
                    size={20}
                    color="#9FA8DA"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your email"
                    placeholderTextColor="#999"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    editable={!isLoading}
                  />
                </View>

                {/* Reset Password Button */}
                <TouchableOpacity
                  style={[
                    styles.resetButton,
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
                {/* Success State */}
                <View style={styles.successContainer}>
                  <View style={styles.successIcon}>
                    <Ionicons
                      name="checkmark-circle"
                      size={64}
                      color="#10B981"
                    />
                  </View>
                  <Text style={styles.successText}>Email Sent!</Text>
                  <Text style={styles.successSubtext}>
                    Check your inbox at{"\n"}
                    <Text style={styles.emailText}>{email}</Text>
                  </Text>
                </View>

                {/* Resend Button */}
                <TouchableOpacity
                  style={styles.resendButton}
                  onPress={handleResendEmail}
                  disabled={isLoading}
                >
                  <Text style={styles.resendButtonText}>
                    Didn&apos;t receive the email? Resend
                  </Text>
                </TouchableOpacity>

                {/* Back to Login */}
                <TouchableOpacity
                  style={styles.backToLoginButton}
                  onPress={() => router.back()}
                >
                  <Text style={styles.backToLoginText}>Back to Login</Text>
                </TouchableOpacity>
              </>
            )}

            {/* Spacer */}
            <View style={styles.spacer} />

            {/* Help Text */}
            {!emailSent && (
              <View style={styles.helpContainer}>
                <Text style={styles.helpText}>
                  Remember your password?{" "}
                  <Text style={styles.helpLink} onPress={() => router.back()}>
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
  container: {
    flex: 1,
    backgroundColor: "#E8EAF6",
  },
  keyboardView: {
    flex: 1,
  },
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
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    marginBottom: 32,
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#000",
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: "#9FA8DA",
    lineHeight: 22,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#000",
    padding: 0,
  },
  resetButton: {
    backgroundColor: "#7C3AED",
    paddingVertical: 18,
    borderRadius: 28,
    alignItems: "center",
    marginBottom: 24,
    shadowColor: "#7C3AED",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  resetButtonDisabled: {
    opacity: 0.6,
  },
  resetButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
  },
  successContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  successIcon: {
    marginBottom: 16,
  },
  successText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#000",
    marginBottom: 8,
  },
  successSubtext: {
    fontSize: 15,
    color: "#9FA8DA",
    textAlign: "center",
    lineHeight: 22,
  },
  emailText: {
    fontWeight: "600",
    color: "#7C3AED",
  },
  resendButton: {
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 16,
  },
  resendButtonText: {
    fontSize: 15,
    color: "#7C3AED",
    fontWeight: "500",
  },
  backToLoginButton: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 16,
    borderRadius: 28,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#7C3AED",
  },
  backToLoginText: {
    color: "#7C3AED",
    fontSize: 17,
    fontWeight: "600",
  },
  spacer: {
    flex: 1,
    minHeight: 20,
  },
  helpContainer: {
    alignItems: "center",
    paddingVertical: 16,
  },
  helpText: {
    fontSize: 15,
    color: "#9FA8DA",
    textAlign: "center",
  },
  helpLink: {
    color: "#000",
    fontWeight: "600",
  },
});
