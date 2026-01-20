// app/(auth)/login.tsx
import Button from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { Ionicons } from "@expo/vector-icons";
import { Link, router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function LoginScreen() {
  const { login, googleLogin, resetPassword, testConnection } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleLogin = async () => {
    console.log("🚀 handleLogin called");

    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert("Invalid Email", "Please enter a valid email address");
      return;
    }

    setIsLoading(true);
    try {
      console.log("📤 Calling login mutation...");
      const result = await login.mutateAsync({
        email,
        password,
      });

      console.log("📥 Login mutation result:", {
        hasData: !!result.data,
        hasError: !!result.error,
        errorMessage: result.error?.message,
      });

      // Check for error in the result
      if (result.error) {
        console.error("❌ Login failed with error:", result.error);
        throw result.error;
      }

      if (result.data) {
        console.log("✅ Login successful! Navigating to home...");
        // Login successful - wait a moment for state to update
        setTimeout(() => {
          router.replace("/(tabs)/home");
        }, 500);
      }
    } catch (error: any) {
      console.error("💥 Login catch block error:", {
        message: error.message,
        name: error.name,
        status: error.status,
      });

      const errorMessage = error.message || "Login failed";
      let alertTitle = "Login Failed";
      let alertMessage = errorMessage;

      // More specific error messages
      if (
        errorMessage.includes("Invalid login credentials") ||
        errorMessage.includes("Invalid credentials") ||
        errorMessage.includes("Email and password") ||
        errorMessage.includes("Invalid email or password") ||
        errorMessage.includes("Invalid login")
      ) {
        alertTitle = "Invalid Credentials";
        alertMessage =
          "The email or password you entered is incorrect. Please try again.";
      } else if (errorMessage.includes("Email not confirmed")) {
        alertTitle = "Email Not Verified";
        alertMessage =
          "Please check your email and verify your account before logging in.";
      } else if (errorMessage.includes("rate limit")) {
        alertTitle = "Too Many Attempts";
        alertMessage = "Please wait a few minutes before trying again.";
      } else if (errorMessage.includes("User not found")) {
        alertTitle = "Account Not Found";
        alertMessage =
          "No account found with this email. Please sign up first.";
      }

      Alert.alert(alertTitle, alertMessage, [
        { text: "OK", style: "default" },
        ...(alertTitle === "Invalid Credentials"
          ? [
              {
                text: "Reset Password",
                onPress: () => handleForgotPassword(),
              },
            ]
          : []),
        ...(alertTitle === "Email Not Verified"
          ? [
              {
                text: "Resend Verification",
                onPress: () => handleResendVerification(),
              },
            ]
          : []),
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      await googleLogin.mutateAsync();
    } catch (error: any) {
      console.error("❌ Google login error:", error);
      if (
        !error.message.includes("cancelled") &&
        !error.message.includes("dismissed")
      ) {
        Alert.alert(
          "Google Login Failed",
          error.message || "Unable to sign in with Google. Please try again.",
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    Alert.prompt(
      "Reset Password",
      "Enter your email address to receive a password reset link",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send",
          onPress: async (emailInput: string | undefined) => {
            if (emailInput) {
              if (!validateEmail(emailInput)) {
                Alert.alert(
                  "Invalid Email",
                  "Please enter a valid email address",
                );
                return;
              }

              try {
                await resetPassword.mutateAsync({ email: emailInput });
              } catch (error: any) {
                console.error("❌ Password reset error:", error);
              }
            }
          },
        },
      ],
      "plain-text",
      email,
    );
  };

  const handleResendVerification = async () => {
    try {
      const { supabase } = await import("@/lib/supabase");
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email.trim().toLowerCase(),
      });

      if (error) throw error;
      Alert.alert(
        "Verification Email Sent",
        "Please check your inbox for the verification link.",
      );
    } catch (error: any) {
      console.error("❌ Resend verification error:", error);
      Alert.alert("Error", "Failed to resend verification email.");
    }
  };

  const handleTestAccount = async () => {
    Alert.alert(
      "Test Account",
      "Use test credentials to explore NebulaNet features.\n\nEmail: test@example.com\nPassword: password123",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Use Test Account",
          onPress: () => {
            setEmail("test@example.com");
            setPassword("password123");
          },
        },
      ],
    );
  };

  const handleTestConnection = async () => {
    console.log("🔌 Testing Supabase connection...");
    const result = await testConnection();

    if (result.success) {
      Alert.alert(
        "Connection Test",
        `✅ Connection successful!\nSession exists: ${result.session ? "Yes" : "No"}`,
      );
    } else {
      Alert.alert("Connection Test", `❌ Connection failed: ${result.error}`);
    }
  };

  const isFormValid = email && password && validateEmail(email);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>
              Sign in to continue your journey
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={[
                  styles.input,
                  email && !validateEmail(email) && styles.inputError,
                ]}
                placeholder="Enter your email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                editable={!isLoading && !login.isPending}
              />
              {email && !validateEmail(email) && (
                <Text style={styles.errorText}>Please enter a valid email</Text>
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Password</Text>
              <View
                style={[
                  styles.passwordInputWrapper,
                  password && password.length < 8 && styles.inputError,
                ]}
              >
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Enter your password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                  editable={!isLoading && !login.isPending}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                  disabled={isLoading || login.isPending}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color="#666"
                  />
                </TouchableOpacity>
              </View>
              {password && password.length < 8 && (
                <Text style={styles.errorText}>
                  Password must be at least 8 characters
                </Text>
              )}

              <TouchableOpacity
                style={styles.forgotPasswordButton}
                onPress={handleForgotPassword}
                disabled={
                  isLoading || login.isPending || resetPassword.isPending
                }
              >
                <Text style={styles.forgotPasswordText}>
                  {resetPassword.isPending
                    ? "Sending reset email..."
                    : "Forgot Password?"}
                </Text>
              </TouchableOpacity>
            </View>

            <Button
              title={login.isPending ? "Signing in..." : "Continue"}
              onPress={handleLogin}
              disabled={!isFormValid || isLoading || login.isPending}
              loading={isLoading || login.isPending}
              style={styles.continueButton}
            />

            {/* Debug buttons - remove in production */}
            {__DEV__ && (
              <View style={styles.debugButtons}>
                <TouchableOpacity
                  style={styles.debugButton}
                  onPress={handleTestConnection}
                >
                  <Text style={styles.debugButtonText}>Test Connection</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.debugButton}
                  onPress={handleTestAccount}
                  disabled={isLoading || login.isPending}
                >
                  <Text style={styles.debugButtonText}>Test Account</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.orContainer}>
              <View style={styles.orLine} />
              <Text style={styles.orText}>or continue with</Text>
              <View style={styles.orLine} />
            </View>

            <TouchableOpacity
              style={[
                styles.googleButton,
                (isLoading || googleLogin.isPending) &&
                  styles.googleButtonDisabled,
              ]}
              onPress={handleGoogleLogin}
              disabled={isLoading || googleLogin.isPending}
            >
              {googleLogin.isPending ? (
                <Ionicons name="sync" size={20} color="#DB4437" />
              ) : (
                <Ionicons name="logo-google" size={20} color="#DB4437" />
              )}
              <Text style={styles.googleButtonText}>
                {googleLogin.isPending
                  ? "Connecting..."
                  : "Continue with Google"}
              </Text>
            </TouchableOpacity>

            <View style={styles.signupContainer}>
              <Text style={styles.signupText}>
                Don&apos;t have an account?{" "}
              </Text>
              <Link
                href="/(auth)/signup"
                style={styles.signupLink}
                disabled={isLoading || login.isPending}
              >
                Sign Up
              </Link>
            </View>

            <View style={styles.termsContainer}>
              <Text style={styles.termsText}>
                By continuing, you agree to our{" "}
                <Text style={styles.termsLink}>Terms of Service</Text> and{" "}
                <Text style={styles.termsLink}>Privacy Policy</Text>
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: "#ffffff",
    paddingTop: 60,
  },
  header: {
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 8,
    color: "#000000",
  },
  subtitle: {
    fontSize: 16,
    color: "#666666",
    lineHeight: 22,
  },
  form: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#000000",
    backgroundColor: "#ffffff",
  },
  inputError: {
    borderColor: "#FF3B30",
  },
  errorText: {
    fontSize: 14,
    color: "#FF3B30",
    marginTop: 4,
  },
  passwordInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    overflow: "hidden",
  },
  passwordInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: "#000000",
  },
  eyeButton: {
    padding: 16,
  },
  forgotPasswordButton: {
    alignSelf: "flex-end",
    marginTop: 8,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: "#000000",
    fontWeight: "500",
  },
  continueButton: {
    marginTop: 8,
  },
  debugButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    gap: 8,
  },
  debugButton: {
    flex: 1,
    backgroundColor: "#FF3B30",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  debugButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "500",
  },
  orContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E0E0E0",
  },
  orText: {
    marginHorizontal: 10,
    color: "#666666",
    fontSize: 14,
    fontWeight: "500",
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    backgroundColor: "#ffffff",
  },
  googleButtonDisabled: {
    opacity: 0.6,
  },
  googleButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "500",
    color: "#000000",
  },
  signupContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 40,
    marginBottom: 20,
  },
  signupText: {
    color: "#666666",
    fontSize: 16,
  },
  signupLink: {
    color: "#000000",
    fontWeight: "600",
    fontSize: 16,
  },
  termsContainer: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  termsText: {
    color: "#666666",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  termsLink: {
    color: "#000000",
    fontWeight: "500",
  },
});
