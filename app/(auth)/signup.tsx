// app/(auth)/signup.tsx
import Button from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { Ionicons } from "@expo/vector-icons";
import { Link, router } from "expo-router";
import React, { useState } from "react";
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

export default function SignUpScreen() {
  const { signup } = useAuth();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string) => {
    const phoneRegex = /^[\+]?[1-9][\d]{0,17}$/;
    return phoneRegex.test(phone.replace(/\D/g, ""));
  };

  const validateUsername = (username: string) => {
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    return usernameRegex.test(username);
  };

  const handleStep1Continue = () => {
    if (email && !validateEmail(email)) {
      Alert.alert("Invalid Email", "Please enter a valid email address");
      return;
    }

    if (phone && !validatePhone(phone)) {
      Alert.alert("Invalid Phone", "Please enter a valid phone number");
      return;
    }

    if (!email && !phone) {
      Alert.alert("Required", "Please enter either email or phone number");
      return;
    }

    setStep(2);
  };

  const handleStep2Continue = () => {
    if (password.length < 8) {
      Alert.alert("Weak Password", "Password must be at least 8 characters");
      return;
    }

    // Generate a default username from email if available
    if (email) {
      const generatedUsername = email
        .split("@")[0]
        .replace(/[^a-zA-Z0-9_]/g, "_");
      setUsername(generatedUsername);
    }

    setStep(3);
  };

  const handleSignup = async () => {
    setIsLoading(true);

    try {
      // Validate username if provided
      if (username && !validateUsername(username)) {
        Alert.alert(
          "Invalid Username",
          "Username must be 3-20 characters (letters, numbers, underscore)",
        );
        return;
      }

      // Generate username from email if not provided
      const finalUsername =
        username ||
        (email
          ? email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "_")
          : `user_${Date.now()}`);

      // Prepare user data
      const userData = {
        username: finalUsername,
        full_name: fullName.trim() || finalUsername,
      };

      // Call signup mutation
      const result = await signup.mutateAsync({
        email,
        password,
        userData,
      });

      if (result.data) {
        // Signup successful - redirect to email verification
        Alert.alert(
          "Account Created",
          "Welcome to NebulaNet! Please verify your email to complete setup.",
          [
            {
              text: "Continue to Verification",
              onPress: () => router.push("/(auth)/verify-email"),
            },
          ],
        );
      } else if (result.error) {
        // Handle specific errors
        const errorMessage = result.error.message || "Signup failed";

        if (
          errorMessage.includes("already registered") ||
          errorMessage.includes("User already registered")
        ) {
          Alert.alert(
            "Email Exists",
            "This email is already registered. Try logging in instead.",
            [{ text: "OK", onPress: () => router.push("/(auth)/login") }],
          );
        } else if (
          errorMessage.includes("username") ||
          errorMessage.includes("Username")
        ) {
          Alert.alert(
            "Username Taken",
            "This username is already taken. Please choose another.",
          );
        } else if (errorMessage.includes("weak")) {
          Alert.alert("Weak Password", "Please choose a stronger password");
        } else {
          Alert.alert("Signup Failed", errorMessage);
        }
      }
    } catch (error: any) {
      console.error("Signup error:", error);
      Alert.alert(
        "Error",
        error.message || "Failed to create account. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      router.back();
    }
  };

  const isStep1Valid =
    (email && validateEmail(email)) || (phone && validatePhone(phone));
  const isStep2Valid = password.length >= 8;
  const isStep3Valid = !username || validateUsername(username);

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
            {step > 1 && (
              <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color="#000" />
              </TouchableOpacity>
            )}
            <Text style={styles.title}>
              {step === 1
                ? "Create Your Account"
                : step === 2
                  ? "Create Password"
                  : "Complete Profile"}
            </Text>
            <Text style={styles.subtitle}>
              {step === 1
                ? "Sign up to personalize your experience."
                : step === 2
                  ? "Create a strong password to protect your account."
                  : "Tell us a bit about yourself."}
            </Text>
            <Text style={styles.stepIndicator}>Step {step} of 3</Text>
          </View>

          {step === 1 ? (
            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  editable={!isLoading}
                />
                {email && !validateEmail(email) && (
                  <Text style={styles.errorText}>
                    Please enter a valid email
                  </Text>
                )}
              </View>

              <View style={styles.orContainer}>
                <View style={styles.orLine} />
                <Text style={styles.orText}>or</Text>
                <View style={styles.orLine} />
              </View>

              <View style={styles.phoneContainer}>
                <Text style={styles.inputLabel}>Phone</Text>
                <View style={styles.phoneInputWrapper}>
                  <View style={styles.countryCode}>
                    <Text style={styles.countryCodeText}>+1</Text>
                  </View>
                  <TextInput
                    style={styles.phoneInput}
                    placeholder="882 9983 2233"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    autoComplete="tel"
                    editable={!isLoading}
                  />
                </View>
                {phone && !validatePhone(phone) && (
                  <Text style={styles.errorText}>
                    Please enter a valid phone number
                  </Text>
                )}
              </View>

              <Button
                title="Continue"
                onPress={handleStep1Continue}
                disabled={!isStep1Valid || isLoading}
                loading={isLoading}
                style={styles.continueButton}
              />
            </View>
          ) : step === 2 ? (
            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Password</Text>
                <View style={styles.passwordInputWrapper}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Enter your password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoComplete="password-new"
                    editable={!isLoading}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
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
                    Must be at least 8 characters
                  </Text>
                )}
              </View>

              <View style={styles.passwordRequirements}>
                <Text style={styles.requirementText}>
                  • At least 8 characters (include letters, numbers, and
                  symbols)
                </Text>
                <Text style={styles.requirementText}>
                  • Avoid common words or easily guessed phrases
                </Text>
              </View>

              <Button
                title="Continue"
                onPress={handleStep2Continue}
                disabled={!isStep2Valid || isLoading}
                loading={isLoading}
                style={styles.continueButton}
              />
            </View>
          ) : (
            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Username</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Choose a username"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  editable={!isLoading}
                />
                {username && !validateUsername(username) && (
                  <Text style={styles.errorText}>
                    3-20 characters, letters, numbers, and underscore only
                  </Text>
                )}
                <Text style={styles.inputHint}>
                  This will be your unique identifier on NebulaNet
                </Text>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Full Name (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your full name"
                  value={fullName}
                  onChangeText={setFullName}
                  editable={!isLoading}
                />
                <Text style={styles.inputHint}>
                  This will be displayed on your profile
                </Text>
              </View>

              <View style={styles.accountInfo}>
                <Text style={styles.accountInfoTitle}>Account Information</Text>
                <View style={styles.accountInfoRow}>
                  <Text style={styles.accountInfoLabel}>Email:</Text>
                  <Text style={styles.accountInfoValue}>
                    {email || "Not provided"}
                  </Text>
                </View>
                <View style={styles.accountInfoRow}>
                  <Text style={styles.accountInfoLabel}>Phone:</Text>
                  <Text style={styles.accountInfoValue}>
                    {phone || "Not provided"}
                  </Text>
                </View>
              </View>

              <View style={styles.emailNote}>
                <Ionicons name="mail-outline" size={16} color="#666" />
                <Text style={styles.emailNoteText}>
                  We&apos;ll send a verification email to {email}
                </Text>
              </View>

              <Button
                title="Create Account"
                onPress={handleSignup}
                disabled={!isStep3Valid || isLoading}
                loading={isLoading || signup.isPending}
                style={styles.continueButton}
              />
            </View>
          )}

          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <Link href="/(auth)/login" style={styles.loginLink}>
              Log In
            </Link>
          </View>

          <View style={styles.termsContainer}>
            <Text style={styles.termsText}>
              By signing up, you agree to our{" "}
              <Text style={styles.termsLink}>Terms of Service</Text> and{" "}
              <Text style={styles.termsLink}>Privacy Policy</Text>
            </Text>
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
    position: "relative",
  },
  backButton: {
    position: "absolute",
    left: 0,
    top: 0,
    padding: 8,
    zIndex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 8,
    color: "#000000",
    marginTop: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#666666",
    lineHeight: 22,
    marginBottom: 8,
  },
  stepIndicator: {
    fontSize: 14,
    color: "#999999",
    fontWeight: "500",
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
  inputHint: {
    fontSize: 13,
    color: "#999999",
    marginTop: 4,
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
  errorText: {
    fontSize: 14,
    color: "#FF3B30",
    marginTop: 4,
  },
  orContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
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
  phoneContainer: {
    marginBottom: 24,
  },
  phoneInputWrapper: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    overflow: "hidden",
  },
  countryCode: {
    padding: 16,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    borderRightWidth: 1,
    borderRightColor: "#E0E0E0",
  },
  countryCodeText: {
    fontSize: 16,
    color: "#000000",
    fontWeight: "500",
  },
  phoneInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: "#000000",
    backgroundColor: "#ffffff",
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
  passwordRequirements: {
    marginTop: 8,
    padding: 16,
    backgroundColor: "#F9F9F9",
    borderRadius: 12,
    marginBottom: 20,
  },
  requirementText: {
    fontSize: 14,
    color: "#666666",
    marginBottom: 6,
    lineHeight: 20,
  },
  continueButton: {
    marginTop: 20,
  },
  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 40,
    marginBottom: 20,
  },
  loginText: {
    color: "#666666",
    fontSize: 16,
  },
  loginLink: {
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
  accountInfo: {
    backgroundColor: "#F9F9F9",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  accountInfoTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 12,
  },
  accountInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  accountInfoLabel: {
    fontSize: 14,
    color: "#666666",
  },
  accountInfoValue: {
    fontSize: 14,
    color: "#000000",
    fontWeight: "500",
  },
  emailNote: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F4F8",
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    gap: 8,
  },
  emailNoteText: {
    fontSize: 13,
    color: "#666666",
    flex: 1,
  },
});
