// app/(auth)/verify-email.tsx
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function VerifyEmailScreen() {
  const { user, checkSession } = useAuth();
  const [isResending, setIsResending] = useState(false);
  const [email] = useState(user?.email || "");
  const [countdown, setCountdown] = useState(0);

  // Check if user is already verified
  useEffect(() => {
    if (user?.email_confirmed_at) {
      router.replace("/(tabs)/home");
    }
  }, [user]);

  // Handle deep links for email verification
  useEffect(() => {
    const handleDeepLink = async (url: string) => {
      console.log("Deep link received in verify-email screen:", url);

      if (url.includes("verify-email-handler")) {
        // Redirect to the dedicated handler screen
        router.replace("/verify-email-handler");
        return;
      }

      if (url.includes("type=signup") || url.includes("type=email_change")) {
        try {
          const urlObj = new URL(url);
          const token = urlObj.searchParams.get("token");
          const type = urlObj.searchParams.get("type");

          if (token && type === "signup") {
            try {
              const { data, error } = await supabase.auth.verifyOtp({
                token_hash: token,
                type: "signup",
              });

              if (error) throw error;

              if (data) {
                Alert.alert(
                  "Email Verified!",
                  "Your email has been successfully verified. You can now access all features.",
                  [
                    {
                      text: "Continue",
                      onPress: () => {
                        checkSession(); // Refresh session
                        router.replace("/(tabs)/home");
                      },
                    },
                  ],
                );
              }
            } catch (error: any) {
              Alert.alert(
                "Verification Failed",
                error.message || "Invalid or expired verification link",
              );
            }
          }
        } catch {
          // Invalid URL, ignore
        }
      }
    };

    // Get initial URL
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log("Initial URL in verify-email:", url);
        handleDeepLink(url);
      }
    });

    // Listen for incoming links
    const subscription = Linking.addEventListener("url", ({ url }) => {
      console.log("URL event in verify-email:", url);
      handleDeepLink(url);
    });

    return () => {
      subscription.remove();
    };
  }, [checkSession]);

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleResendVerification = async () => {
    if (countdown > 0) {
      Alert.alert(
        `Please wait ${countdown} seconds before requesting another verification email.`,
      );
      return;
    }

    setIsResending(true);
    try {
      // Get platform-specific redirect URL
      let redirectTo = "";

      if (Platform.OS === "web") {
        // For web, use the current origin
        redirectTo = `${window.location.origin}/verify-email-handler`;
      } else {
        // For mobile, use the app scheme
        redirectTo = "nebulanet://verify-email-handler";
      }

      console.log("Sending verification email with redirectTo:", redirectTo);

      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email,
        options: {
          emailRedirectTo: redirectTo,
        },
      });

      if (error) throw error;

      setCountdown(60); // 60 second cooldown
      Alert.alert(
        "Verification Email Sent",
        "Please check your inbox for the verification link. Click the link to verify your email.",
        [{ text: "OK" }],
      );
    } catch (error: any) {
      console.error("Error resending verification:", error);
      Alert.alert(
        "Error",
        error.message || "Failed to resend verification email",
      );
    } finally {
      setIsResending(false);
    }
  };

  const handleOpenEmailApp = () => {
    // Open default email app based on platform
    const emailUrl = Platform.OS === "ios" ? "message://" : "mailto:";
    Linking.openURL(emailUrl).catch(() => {
      Alert.alert("Error", "Could not open email app");
    });
  };

  const handleCheckVerification = async () => {
    try {
      await checkSession();

      if (user?.email_confirmed_at) {
        Alert.alert(
          "Email Verified!",
          "Your email has been successfully verified.",
          [{ text: "Continue", onPress: () => router.replace("/(tabs)/home") }],
        );
      } else {
        Alert.alert(
          "Not Verified Yet",
          "Please check your email and click the verification link. If you already clicked it, try refreshing.",
          [
            { text: "Refresh", onPress: () => checkSession() },
            { text: "Got It", style: "cancel" },
          ],
        );
      }
    } catch {
      Alert.alert("Error", "Failed to check verification status");
    }
  };

  const handleSkipForNow = () => {
    Alert.alert(
      "Skip Email Verification",
      "Some features will be limited until you verify your email. You can verify later in settings.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue Anyway",
          onPress: () => {
            // Set a flag in storage that user skipped verification
            router.replace("/(tabs)/home");
          },
        },
      ],
    );
  };

  const handleGoToVerificationHandler = () => {
    // Manually navigate to the verification handler
    router.push("/verify-email-handler");
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Ionicons name="mail-outline" size={64} color="#007AFF" />
          <Text style={styles.title}>Verify Your Email</Text>
          <Text style={styles.subtitle}>We sent a verification link to:</Text>
          <Text style={styles.email}>{email}</Text>
        </View>

        <View style={styles.instructions}>
          <Text style={styles.instructionsTitle}>To complete signup:</Text>
          <View style={styles.instructionItem}>
            <Ionicons name="mail-open-outline" size={20} color="#007AFF" />
            <Text style={styles.instructionText}>Check your email inbox</Text>
          </View>
          <View style={styles.instructionItem}>
            <Ionicons name="link-outline" size={20} color="#007AFF" />
            <Text style={styles.instructionText}>
              Click the verification link (opens app)
            </Text>
          </View>
          <View style={styles.instructionItem}>
            <Ionicons
              name="checkmark-circle-outline"
              size={20}
              color="#007AFF"
            />
            <Text style={styles.instructionText}>
              App will automatically verify and redirect
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.openEmailButton}
            onPress={handleOpenEmailApp}
          >
            <Ionicons name="mail-outline" size={20} color="white" />
            <Text style={styles.openEmailButtonText}>Open Email App</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resendButton}
            onPress={handleResendVerification}
            disabled={isResending || countdown > 0}
          >
            <Ionicons
              name={isResending ? "sync" : "refresh-outline"}
              size={20}
              color="#007AFF"
            />
            <Text style={styles.resendButtonText}>
              {isResending
                ? "Sending..."
                : countdown > 0
                  ? `Resend in ${countdown}s`
                  : "Resend Verification Email"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.checkButton}
            onPress={handleCheckVerification}
          >
            <Ionicons name="checkmark-done-outline" size={20} color="#34C759" />
            <Text style={styles.checkButtonText}>
              I&apos;ve Verified My Email
            </Text>
          </TouchableOpacity>

          {/* Debug button - can be removed in production */}
          <TouchableOpacity
            style={styles.debugButton}
            onPress={handleGoToVerificationHandler}
          >
            <Ionicons name="bug-outline" size={20} color="#8E8E93" />
            <Text style={styles.debugButtonText}>
              Debug: Go to Verification Handler
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.troubleshoot}>
          <Text style={styles.troubleshootTitle}>Troubleshooting Tips:</Text>
          <Text style={styles.troubleshootText}>
            • Check spam/junk folder{"\n"}• Make sure email is correct: {email}
            {"\n"}• Wait a few minutes for email delivery{"\n"}• Add
            noreply@mail.app.supabase.io to contacts{"\n"}• Clicking the link
            should open the NebulaNet app{"\n"}• If link doesn&apos;t work,
            request a new one
          </Text>
        </View>

        <View style={styles.warningBox}>
          <Ionicons name="warning-outline" size={20} color="#FF9500" />
          <Text style={styles.warningText}>
            You won&apos;t be able to reset your password or access all features
            until your email is verified.
          </Text>
        </View>

        <TouchableOpacity style={styles.skipButton} onPress={handleSkipForNow}>
          <Text style={styles.skipButtonText}>Skip for now</Text>
          <Ionicons name="arrow-forward" size={16} color="#666" />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#000000",
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#666666",
    textAlign: "center",
  },
  email: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000000",
    marginTop: 8,
    textAlign: "center",
  },
  instructions: {
    backgroundColor: "#F8F8F8",
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 16,
  },
  instructionItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 12,
  },
  instructionText: {
    fontSize: 14,
    color: "#666666",
    lineHeight: 20,
    flex: 1,
  },
  actions: {
    gap: 12,
    marginBottom: 24,
  },
  openEmailButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#007AFF",
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  openEmailButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  resendButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#007AFF",
    gap: 8,
  },
  resendButtonText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "600",
  },
  checkButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#34C759",
    gap: 8,
  },
  checkButtonText: {
    color: "#34C759",
    fontSize: 16,
    fontWeight: "600",
  },
  debugButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F2F2F7",
    padding: 12,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  debugButtonText: {
    color: "#8E8E93",
    fontSize: 14,
    fontWeight: "500",
  },
  troubleshoot: {
    backgroundColor: "#FFF3E0",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  troubleshootTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 8,
  },
  troubleshootText: {
    fontSize: 13,
    color: "#666666",
    lineHeight: 18,
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFF9E6",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  warningText: {
    fontSize: 13,
    color: "#666666",
    lineHeight: 18,
    flex: 1,
  },
  skipButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  skipButtonText: {
    color: "#666666",
    fontSize: 16,
    marginRight: 4,
  },
});
