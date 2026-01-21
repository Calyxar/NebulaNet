import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { router, Stack } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function VerifyEmailHandlerScreen() {
  const { checkSession } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<"verifying" | "success" | "error">(
    "verifying",
  );
  const [message, setMessage] = useState("Verifying your email...");
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    // Get user email first
    const getUserEmail = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user?.email) {
          setEmail(user.email);
        }
      } catch (error) {
        console.error("Error getting user email:", error);
      }
    };

    getUserEmail();
    handleVerification();
  }, []);

  const handleVerification = async () => {
    try {
      console.log("🔄 Starting email verification handler...");

      // Get the current URL
      let currentUrl = "";

      // Try to get URL from different sources
      if (Platform.OS === "web" && typeof window !== "undefined") {
        currentUrl = window.location.href;
        console.log("🌐 Web URL:", currentUrl);
      } else {
        // Try to get deep link URL
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl) {
          currentUrl = initialUrl;
          console.log("📱 Deep link URL:", currentUrl);
        }
      }

      // First, try to get the current session
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error("Session error:", sessionError);
        throw sessionError;
      }

      console.log("👤 Current session user:", session?.user?.email);

      // Check if user is already verified
      if (session?.user?.email_confirmed_at) {
        console.log("✅ Email already verified");
        setStatus("success");
        setMessage("Your email is already verified! Redirecting to home...");

        setTimeout(() => {
          router.replace("/(tabs)/home");
        }, 2000);
        return;
      }

      // Extract token from URL
      let token: string | null = null;
      let type: string | null = null;

      if (currentUrl) {
        try {
          const urlObj = new URL(currentUrl);
          token = urlObj.searchParams.get("token");
          type = urlObj.searchParams.get("type");
          console.log("🔑 Extracted params - Token:", !!token, "Type:", type);
        } catch (e) {
          console.error("Error parsing URL:", e);
        }
      }

      if (token && (type === "signup" || type === "email_change")) {
        console.log("🔑 Verifying OTP token...");

        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: type as any,
        });

        if (error) {
          console.error("❌ OTP verification error:", error.message);

          // Check specific error types
          if (
            error.message?.includes("already confirmed") ||
            error.message?.includes("already verified")
          ) {
            console.log("ℹ️ Email already confirmed");
            setStatus("success");
            setMessage("Your email is already verified! Redirecting...");

            // Refresh session to get updated user data
            await checkSession();

            setTimeout(() => {
              router.replace("/(tabs)/home");
            }, 2000);
            return;
          }

          if (error.message?.includes("expired")) {
            throw new Error(
              "The verification link has expired. Please request a new one.",
            );
          }

          if (error.message?.includes("Invalid")) {
            throw new Error(
              "The verification link is invalid. Please request a new one.",
            );
          }

          throw error;
        }

        console.log("✅ OTP verification success");

        if (data) {
          // Refresh the session to get updated user data
          await checkSession();

          setStatus("success");
          setMessage("🎉 Email verified successfully! Redirecting to home...");

          setTimeout(() => {
            router.replace("/(tabs)/home");
          }, 2500);
        }
      } else {
        console.log("⚠️ No valid token found in URL");

        // If no token but user is logged in, check their status
        if (session?.user) {
          const {
            data: { user },
            error: userError,
          } = await supabase.auth.getUser();

          if (userError) throw userError;

          if (user?.email_confirmed_at) {
            setStatus("success");
            setMessage("Your email is already verified! Redirecting...");

            setTimeout(() => {
              router.replace("/(tabs)/home");
            }, 2000);
          } else {
            throw new Error(
              "No verification token found. Please check your email for the verification link.",
            );
          }
        } else {
          throw new Error(
            "No verification token found and no active session. Please log in and try again.",
          );
        }
      }
    } catch (error: any) {
      console.error("❌ Verification error:", error);

      let errorMessage = error.message || "Email verification failed. ";

      if (errorMessage.includes("expired")) {
        errorMessage =
          "The verification link has expired. Please request a new one.";
      } else if (errorMessage.includes("Invalid")) {
        errorMessage =
          "The verification link is invalid. Please request a new one.";
      } else if (errorMessage.includes("already confirmed")) {
        errorMessage = "Your email is already verified!";
        setStatus("success");
      } else {
        errorMessage =
          "Verification failed. Please try requesting a new verification email.";
      }

      setMessage(errorMessage);

      // If it's a success (already verified) but we're showing error, change status
      if (errorMessage.includes("already verified")) {
        setStatus("success");
        setTimeout(() => {
          router.replace("/(tabs)/home");
        }, 3000);
      } else {
        setStatus("error");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    setIsLoading(true);
    setStatus("verifying");
    setMessage("Verifying your email...");
    handleVerification();
  };

  const handleGoToLogin = () => {
    router.replace("/(auth)/login");
  };

  const handleGoToHome = () => {
    router.replace("/(tabs)/home");
  };

  const handleResendVerification = async () => {
    try {
      if (!email) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user?.email) {
          throw new Error("No email found. Please log in again.");
        }
      }

      // Get redirect URL based on platform
      let redirectTo = "";
      if (Platform.OS === "web") {
        // For web, use your domain
        redirectTo = "https://nebulanet.space/verify-email-handler";
      } else {
        // For mobile, use the app scheme
        redirectTo = "nebulanet://verify-email-handler";
      }

      console.log(
        "📧 Resending verification to:",
        email,
        "Redirect:",
        redirectTo,
      );

      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email,
        options: {
          emailRedirectTo: redirectTo,
        },
      });

      if (error) throw error;

      Alert.alert(
        "✅ Verification Email Sent",
        `A new verification link has been sent to ${email}. Please check your inbox and click the link to verify your email.`,
        [
          {
            text: "Go to Verify Screen",
            onPress: () => router.replace("/(auth)/verify-email"),
          },
          {
            text: "Stay Here",
            style: "cancel",
          },
        ],
      );
    } catch (error: any) {
      Alert.alert(
        "❌ Error",
        error.message ||
          "Failed to resend verification email. Please try again later.",
      );
    }
  };

  const handleGoToVerifyScreen = () => {
    router.replace("/(auth)/verify-email");
  };

  const handleOpenEmailApp = () => {
    const emailUrl = Platform.OS === "ios" ? "message://" : "mailto:";
    Linking.openURL(emailUrl).catch(() => {
      Alert.alert("Error", "Could not open email app");
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: false,
          title: "Email Verification",
          animation: "fade",
        }}
      />

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          {status === "verifying" && (
            <ActivityIndicator size="large" color="#007AFF" />
          )}
          {status === "success" && (
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={80} color="#34C759" />
            </View>
          )}
          {status === "error" && (
            <View style={styles.errorIcon}>
              <Ionicons name="alert-circle" size={80} color="#FF3B30" />
            </View>
          )}
        </View>

        <Text style={styles.title}>
          {status === "verifying"
            ? "Verifying Email..."
            : status === "success"
              ? "Email Verified! 🎉"
              : "Verification Failed"}
        </Text>

        <Text style={styles.message}>{message}</Text>

        {email && (
          <View style={styles.emailContainer}>
            <Ionicons name="mail-outline" size={16} color="#666" />
            <Text style={styles.emailText}>{email}</Text>
          </View>
        )}

        {status === "error" && (
          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={handleRetry}
              disabled={isLoading}
            >
              <Ionicons name="refresh" size={20} color="white" />
              <Text style={styles.buttonText}>Try Again</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={handleResendVerification}
              disabled={isLoading}
            >
              <Ionicons name="mail-outline" size={20} color="#007AFF" />
              <Text style={[styles.buttonText, styles.secondaryButtonText]}>
                Resend Verification Email
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.outlineButton]}
              onPress={handleOpenEmailApp}
            >
              <Ionicons name="open-outline" size={20} color="#007AFF" />
              <Text style={[styles.buttonText, styles.outlineButtonText]}>
                Open Email App
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.ghostButton]}
              onPress={handleGoToVerifyScreen}
            >
              <Ionicons name="arrow-back" size={20} color="#666" />
              <Text style={[styles.buttonText, styles.ghostButtonText]}>
                Back to Verify Screen
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {status === "success" && (
          <View style={styles.successButtons}>
            <TouchableOpacity
              style={[styles.button, styles.successButton]}
              onPress={handleGoToHome}
            >
              <Ionicons name="home-outline" size={20} color="white" />
              <Text style={styles.buttonText}>Go to Home</Text>
            </TouchableOpacity>

            <Text style={styles.redirectText}>
              Redirecting in a few seconds...
            </Text>
          </View>
        )}

        {status === "verifying" && (
          <View style={styles.verifyingInfo}>
            <Text style={styles.loadingText}>
              Please wait while we verify your email...
            </Text>
            <Text style={styles.infoText}>
              This should only take a few seconds.
            </Text>
          </View>
        )}

        {__DEV__ && (
          <View style={styles.debugInfo}>
            <Text style={styles.debugTitle}>Debug Info (Dev Only):</Text>
            <Text style={styles.debugText}>
              Platform: {Platform.OS}
              {"\n"}
              Status: {status}
              {"\n"}
              Loading: {isLoading ? "Yes" : "No"}
              {"\n"}
              Email: {email || "Not found"}
            </Text>
            <TouchableOpacity
              style={styles.debugButton}
              onPress={() => {
                Alert.alert("Debug Actions", "Choose an action:", [
                  {
                    text: "Simulate Success",
                    onPress: () => {
                      setStatus("success");
                      setMessage("Simulated success - email verified!");
                    },
                  },
                  {
                    text: "Simulate Error",
                    onPress: () => {
                      setStatus("error");
                      setMessage("Simulated error - verification failed!");
                    },
                  },
                  {
                    text: "Test Deep Link",
                    onPress: () => {
                      Linking.openURL(
                        "nebulanet://verify-email-handler?token=test123&type=signup",
                      );
                    },
                  },
                  { text: "Cancel", style: "cancel" },
                ]);
              }}
            >
              <Text style={styles.debugButtonText}>Debug Actions</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  iconContainer: {
    marginBottom: 32,
    height: 100,
    justifyContent: "center",
    alignItems: "center",
  },
  successIcon: {
    alignItems: "center",
  },
  errorIcon: {
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#000000",
    marginBottom: 16,
    textAlign: "center",
  },
  message: {
    fontSize: 16,
    color: "#666666",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  emailContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F8F8",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 24,
    gap: 8,
  },
  emailText: {
    fontSize: 14,
    color: "#666666",
    fontWeight: "500",
  },
  buttonsContainer: {
    width: "100%",
    maxWidth: 300,
    gap: 12,
    marginTop: 20,
  },
  successButtons: {
    width: "100%",
    maxWidth: 300,
    marginTop: 20,
    alignItems: "center",
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: "#007AFF",
  },
  secondaryButton: {
    backgroundColor: "#F2F2F7",
    borderWidth: 1,
    borderColor: "#007AFF",
  },
  outlineButton: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#007AFF",
  },
  successButton: {
    backgroundColor: "#34C759",
    width: "100%",
  },
  ghostButton: {
    backgroundColor: "transparent",
    padding: 12,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButtonText: {
    color: "#007AFF",
  },
  outlineButtonText: {
    color: "#007AFF",
  },
  ghostButtonText: {
    color: "#666",
    fontSize: 14,
  },
  verifyingInfo: {
    alignItems: "center",
    marginTop: 20,
  },
  loadingText: {
    fontSize: 14,
    color: "#8E8E93",
    fontStyle: "italic",
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: "#C7C7CC",
  },
  redirectText: {
    fontSize: 13,
    color: "#8E8E93",
    fontStyle: "italic",
    marginTop: 12,
  },
  debugInfo: {
    position: "absolute",
    bottom: 20,
    backgroundColor: "#F2F2F7",
    padding: 12,
    borderRadius: 8,
    alignSelf: "center",
    alignItems: "center",
  },
  debugTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#8E8E93",
    marginBottom: 4,
  },
  debugText: {
    fontSize: 11,
    color: "#8E8E93",
    fontFamily: "monospace",
    textAlign: "center",
    marginBottom: 8,
  },
  debugButton: {
    backgroundColor: "#8E8E93",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  debugButtonText: {
    color: "white",
    fontSize: 10,
    fontWeight: "600",
  },
});
