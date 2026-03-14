// app/(auth)/verify-email.tsx — UPDATED ✅ dark mode
import { auth } from "@/lib/firebase";
import { useTheme } from "@/providers/ThemeProvider";
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
  const { colors, isDark } = useTheme();
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const user = auth.currentUser;
  const email = useMemo(() => user?.email ?? "", [user?.email]);

  useEffect(() => {
    if (user?.emailVerified) {
      router.replace("/(auth)/onboarding");
    }
  }, [user?.emailVerified]);
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

  const handleResend = async () => {
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
      Alert.alert("Error", e?.message || "Failed to resend email");
    } finally {
      setIsResending(false);
    }
  };

  const handleCheck = async () => {
    const u = requireUser();
    if (!u) return;
    try {
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
          "Please check your email and click the verification link, then come back.",
        );
      }
    } catch (e: any) {
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
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={[styles.iconCircle, { backgroundColor: colors.card }]}>
              <Ionicons name="mail-outline" size={48} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>
              Verify Your Email
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              We sent a verification link to
            </Text>
            <Text style={[styles.emailText, { color: colors.primary }]}>
              {email || "your email"}
            </Text>
          </View>

          <View
            style={[styles.instructionsCard, { backgroundColor: colors.card }]}
          >
            {[
              "Check your email inbox",
              "Click the verification link",
              "Return to complete setup",
            ].map((step) => (
              <View key={step} style={styles.instructionItem}>
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={colors.primary}
                />
                <Text style={[styles.instructionText, { color: colors.text }]}>
                  {step}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
              onPress={handleCheck}
              activeOpacity={0.9}
            >
              <Text style={styles.primaryBtnText}>I've Verified My Email</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.resendBtn,
                {
                  borderColor:
                    isResending || countdown > 0
                      ? colors.border
                      : colors.primary,
                },
              ]}
              onPress={handleResend}
              disabled={isResending || countdown > 0}
              activeOpacity={0.9}
            >
              <Text
                style={[
                  styles.resendBtnText,
                  {
                    color:
                      isResending || countdown > 0
                        ? colors.textTertiary
                        : colors.primary,
                  },
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

          <View style={[styles.infoBox, { backgroundColor: colors.card }]}>
            <Ionicons
              name="information-circle-outline"
              size={20}
              color={colors.textSecondary}
            />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              Didn't receive the email? Check your spam folder or request a new
              verification link.
            </Text>
          </View>

          <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
            <Text style={[styles.skipBtnText, { color: colors.textTertiary }]}>
              Skip for now
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
  },
  header: { alignItems: "center", marginBottom: 32 },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 8 },
  subtitle: { fontSize: 15, marginBottom: 8 },
  emailText: { fontSize: 16, fontWeight: "600" },
  instructionsCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    gap: 16,
  },
  instructionItem: { flexDirection: "row", alignItems: "center", gap: 12 },
  instructionText: { flex: 1, fontSize: 15, lineHeight: 20 },
  actions: { gap: 12, marginBottom: 24 },
  primaryBtn: { paddingVertical: 18, borderRadius: 28, alignItems: "center" },
  primaryBtnText: { color: "#FFFFFF", fontSize: 17, fontWeight: "600" },
  resendBtn: {
    paddingVertical: 18,
    borderRadius: 28,
    alignItems: "center",
    borderWidth: 1,
  },
  resendBtnText: { fontSize: 17, fontWeight: "600" },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 12,
    padding: 16,
    gap: 12,
    marginBottom: 16,
  },
  infoText: { flex: 1, fontSize: 14, lineHeight: 20 },
  skipBtn: { alignItems: "center", paddingVertical: 12 },
  skipBtnText: { fontSize: 15, fontWeight: "500" },
});
