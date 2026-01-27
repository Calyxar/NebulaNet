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
  StatusBar,
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
      router.replace("/(auth)/onboarding");
    }
  }, [user]);

  // Handle deep links for email verification
  useEffect(() => {
    const handleDeepLink = async (url: string) => {
      console.log("Deep link received:", url);

      if (url.includes("verify-email-handler")) {
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
                  "Your email has been successfully verified.",
                  [
                    {
                      text: "Continue",
                      onPress: () => {
                        checkSession();
                        router.replace("/(auth)/onboarding");
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

    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink(url);
    });

    const subscription = Linking.addEventListener("url", ({ url }) => {
      handleDeepLink(url);
    });

    return () => {
      subscription.remove();
    };
  }, [checkSession]);

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleResendVerification = async () => {
    if (countdown > 0) {
      Alert.alert("Please Wait", `Wait ${countdown} seconds before resending.`);
      return;
    }

    setIsResending(true);
    try {
      let redirectTo = "";

      if (Platform.OS === "web") {
        redirectTo = `${window.location.origin}/verify-email-handler`;
      } else {
        redirectTo = "nebulanet://verify-email-handler";
      }

      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email,
        options: {
          emailRedirectTo: redirectTo,
        },
      });

      if (error) throw error;

      setCountdown(60);
      Alert.alert(
        "Email Sent",
        "Please check your inbox for the verification link.",
      );
    } catch (error: any) {
      console.error("Error resending verification:", error);
      Alert.alert("Error", error.message || "Failed to resend email");
    } finally {
      setIsResending(false);
    }
  };

  const handleCheckVerification = async () => {
    try {
      await checkSession();

      if (user?.email_confirmed_at) {
        Alert.alert("Email Verified!", "Your email has been verified.", [
          {
            text: "Continue",
            onPress: () => router.replace("/(auth)/onboarding"),
          },
        ]);
      } else {
        Alert.alert(
          "Not Verified Yet",
          "Please check your email and click the verification link.",
        );
      }
    } catch {
      Alert.alert("Error", "Failed to check verification status");
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
            <Text style={styles.email}>{email}</Text>
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
  container: {
    flex: 1,
    backgroundColor: "#E8EAF6",
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#000",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: "#9FA8DA",
    marginBottom: 8,
  },
  email: {
    fontSize: 16,
    fontWeight: "600",
    color: "#5C6BC0",
  },
  instructionsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    gap: 16,
  },
  instructionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  checkIcon: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  instructionText: {
    flex: 1,
    fontSize: 15,
    color: "#000",
    lineHeight: 20,
  },
  actions: {
    gap: 12,
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: "#7C3AED",
    paddingVertical: 18,
    borderRadius: 28,
    alignItems: "center",
    shadowColor: "#7C3AED",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
  },
  resendButton: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 18,
    borderRadius: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#7C3AED",
  },
  resendButtonDisabled: {
    borderColor: "#C5CAE9",
  },
  resendButtonText: {
    color: "#7C3AED",
    fontSize: 17,
    fontWeight: "600",
  },
  resendButtonTextDisabled: {
    color: "#C5CAE9",
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    gap: 12,
    marginBottom: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: "#9FA8DA",
    lineHeight: 20,
  },
  skipButton: {
    alignItems: "center",
    paddingVertical: 12,
  },
  skipButtonText: {
    fontSize: 15,
    color: "#9FA8DA",
    fontWeight: "500",
  },
});
