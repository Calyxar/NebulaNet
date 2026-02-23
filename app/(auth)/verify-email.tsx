// app/(auth)/verify-email.tsx — FIREBASE ✅
// ✅ Works with Firebase Auth email verification
// ✅ Resend verification email (cooldown)
// ✅ Check verification status (reload user)
// ✅ No Supabase, no deep-link OTP parsing

import { auth } from "@/lib/firebase";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { sendEmailVerification } from "firebase/auth";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function VerifyEmailScreen() {
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const user = auth.currentUser;

  const email = useMemo(() => user?.email ?? "", [user?.email]);

  // If already verified, go onboarding
  useEffect(() => {
    if (user?.emailVerified) {
      router.replace("/(auth)/onboarding");
    }
  }, [user?.emailVerified]);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const requireUser = () => {
    if (auth.currentUser) return auth.currentUser;
    Alert.alert("Not signed in", "Please sign in again.", [
      { text: "OK", onPress: () => router.replace("/(auth)/login") },
    ]);
    return null;
  };

  const handleResendVerification = async () => {
    if (countdown > 0) {
      Alert.alert("Please Wait", `Wait ${countdown} seconds before resending.`);
      return;
    }

    const u = requireUser();
    if (!u) return;

    setIsResending(true);
    try {
      await sendEmailVerification(u);
      setCountdown(60);
      Alert.alert(
        "Email Sent",
        "Please check your inbox for the verification link.",
      );
    } catch (e: any) {
      console.error("Error resending verification:", e);
      Alert.alert("Error", e?.message || "Failed to resend email");
    } finally {
      setIsResending(false);
    }
  };

  const handleCheckVerification = async () => {
    const u = requireUser();
    if (!u) return;

    try {
      // Reloads auth state from server
      await u.reload();

      const fresh = auth.currentUser;
      if (fresh?.emailVerified) {
        Alert.alert("Email Verified!", "Your email has been verified.", [
          {
            text: "Continue",
            onPress: () => router.replace("/(auth)/onboarding"),
          },
        ]);
      } else {
        Alert.alert(
          "Not Verified Yet",
          "Please check your email and click the verification link, then come back and tap “I’ve Verified My Email”.",
        );
      }
    } catch (e: any) {
      console.error("Check verification error:", e);
      Alert.alert("Error", e?.message || "Failed to check verification status");
    }
  };

  const handleSkip = () => {
    Alert.alert(
      "Skip Verification",
      "Some features will be limited until you verify your email.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue Anyway",
          onPress: () => router.replace("/(auth)/onboarding"),
        },
      ],
    );
  };

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#E8EAF6" />
      <SafeAreaView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="mail-outline" size={48} color="#7C3AED" />
            </View>
            <Text style={styles.title}>Verify Your Email</Text>
            <Text style={styles.subtitle}>We sent a verification link to</Text>
            <Text style={styles.email}>{email || "your email"}</Text>
          </View>

          {/* Instructions */}
          <View style={styles.instructionsCard}>
            <View style={styles.instructionItem}>
              <View style={styles.checkIcon}>
                <Ionicons name="checkmark-circle" size={20} color="#5C6BC0" />
              </View>
              <Text style={styles.instructionText}>Check your email inbox</Text>
            </View>

            <View style={styles.instructionItem}>
              <View style={styles.checkIcon}>
                <Ionicons name="checkmark-circle" size={20} color="#5C6BC0" />
              </View>
              <Text style={styles.instructionText}>
                Click the verification link
              </Text>
            </View>

            <View style={styles.instructionItem}>
              <View style={styles.checkIcon}>
                <Ionicons name="checkmark-circle" size={20} color="#5C6BC0" />
              </View>
              <Text style={styles.instructionText}>
                Return to complete setup
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleCheckVerification}
              activeOpacity={0.9}
            >
              <Text style={styles.primaryButtonText}>
                I&apos;ve Verified My Email
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.resendButton,
                (isResending || countdown > 0) && styles.resendButtonDisabled,
              ]}
              onPress={handleResendVerification}
              disabled={isResending || countdown > 0}
              activeOpacity={0.9}
            >
              <Text
                style={[
                  styles.resendButtonText,
                  (isResending || countdown > 0) &&
                    styles.resendButtonTextDisabled,
                ]}
              >
                {isResending
                  ? "Sending..."
                  : countdown > 0
                    ? `Resend in ${countdown}s`
                    : "Resend Verification Email"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Info Box */}
          <View style={styles.infoBox}>
            <Ionicons
              name="information-circle-outline"
              size={20}
              color="#9FA8DA"
            />
            <Text style={styles.infoText}>
              Didn&apos;t receive the email? Check your spam folder or request a
              new verification link.
            </Text>
          </View>

          {/* Skip Link */}
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipButtonText}>Skip for now</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#E8EAF6" },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
  },
  header: { alignItems: "center", marginBottom: 32 },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: { fontSize: 28, fontWeight: "700", color: "#000", marginBottom: 8 },
  subtitle: { fontSize: 15, color: "#9FA8DA", marginBottom: 8 },
  email: { fontSize: 16, fontWeight: "600", color: "#5C6BC0" },

  instructionsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    gap: 16,
  },
  instructionItem: { flexDirection: "row", alignItems: "center", gap: 12 },
  checkIcon: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  instructionText: { flex: 1, fontSize: 15, color: "#000", lineHeight: 20 },

  actions: { gap: 12, marginBottom: 24 },
  primaryButton: {
    backgroundColor: "#7C3AED",
    paddingVertical: 18,
    borderRadius: 28,
    alignItems: "center",
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  primaryButtonText: { color: "#FFFFFF", fontSize: 17, fontWeight: "600" },

  resendButton: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 18,
    borderRadius: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#7C3AED",
  },
  resendButtonDisabled: { borderColor: "#C5CAE9" },
  resendButtonText: { color: "#7C3AED", fontSize: 17, fontWeight: "600" },
  resendButtonTextDisabled: { color: "#C5CAE9" },

  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    gap: 12,
    marginBottom: 16,
  },
  infoText: { flex: 1, fontSize: 14, color: "#9FA8DA", lineHeight: 20 },

  skipButton: { alignItems: "center", paddingVertical: 12 },
  skipButtonText: { fontSize: 15, color: "#9FA8DA", fontWeight: "500" },
});
