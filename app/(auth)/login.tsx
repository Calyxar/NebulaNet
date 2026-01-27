// app/(auth)/login.tsx
import { useAuth } from "@/hooks/useAuth";
import { Ionicons } from "@expo/vector-icons";
import { Link, router } from "expo-router";
import { useState } from "react";
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

export default function LoginScreen() {
  const { login, googleLogin } = useAuth();
  const [activeTab, setActiveTab] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string) => {
    const phoneRegex = /^[\+]?[1-9][\d]{0,17}$/;
    return phoneRegex.test(phone.replace(/\D/g, ""));
  };

  const handleLogin = async () => {
    if (activeTab === "email" && !validateEmail(email)) {
      Alert.alert("Invalid Email", "Please enter a valid email address");
      return;
    }

    if (activeTab === "phone" && !validatePhone(phone)) {
      Alert.alert("Invalid Phone", "Please enter a valid phone number");
      return;
    }

    if (!password) {
      Alert.alert("Error", "Please enter your password");
      return;
    }

    setIsLoading(true);
    try {
      const result = await login.mutateAsync({
        email: activeTab === "email" ? email : phone,
        password,
      });

      if (result.error) {
        throw result.error;
      }

      if (result.data) {
        setTimeout(() => {
          router.replace("/(tabs)/home");
        }, 500);
      }
    } catch (error: any) {
      const errorMessage = error.message || "Login failed";
      let alertTitle = "Login Failed";
      let alertMessage = errorMessage;

      if (errorMessage.includes("Invalid login credentials")) {
        alertTitle = "Invalid Credentials";
        alertMessage = "The email or password you entered is incorrect.";
      } else if (errorMessage.includes("Email not confirmed")) {
        alertTitle = "Email Not Verified";
        alertMessage = "Please verify your email before logging in.";
      }

      Alert.alert(alertTitle, alertMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      await googleLogin.mutateAsync();
    } catch (error: any) {
      if (!error.message.includes("cancelled")) {
        Alert.alert(
          "Google Login Failed",
          error.message || "Unable to sign in with Google.",
        );
      }
    } finally {
      setIsLoading(false);
    }
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
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Welcome Back</Text>
              <Text style={styles.subtitle}>
                Sign in to continue your journey.
              </Text>
            </View>

            {/* Tab Selector */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tab, activeTab === "email" && styles.activeTab]}
                onPress={() => setActiveTab("email")}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === "email" && styles.activeTabText,
                  ]}
                >
                  Email
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === "phone" && styles.activeTab]}
                onPress={() => setActiveTab("phone")}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === "phone" && styles.activeTabText,
                  ]}
                >
                  Phone
                </Text>
              </TouchableOpacity>
            </View>

            {/* Email/Phone Input */}
            {activeTab === "email" ? (
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor="#999"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
            ) : (
              <View style={styles.phoneInputContainer}>
                <View style={styles.countrySelector}>
                  <Text style={styles.flagEmoji}>🇺🇸</Text>
                  <Text style={styles.countryCode}>+1</Text>
                  <Ionicons name="chevron-down" size={16} color="#666" />
                </View>
                <TextInput
                  style={styles.phoneInput}
                  placeholder="882 9983 2233"
                  placeholderTextColor="#999"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </View>
            )}

            {/* Password Input */}
            <View style={styles.passwordContainer}>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color="#9FA8DA"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.passwordInputField}
                  placeholder="Password"
                  placeholderTextColor="#999"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color="#9FA8DA"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Forgot Password */}
            <TouchableOpacity style={styles.forgotPassword}>
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            {/* Login Button */}
            <TouchableOpacity
              style={styles.loginButton}
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.9}
            >
              <Text style={styles.loginButtonText}>
                {isLoading ? "Signing in..." : "Continue"}
              </Text>
            </TouchableOpacity>

            {/* OR Divider */}
            <View style={styles.orContainer}>
              <View style={styles.orLine} />
              <Text style={styles.orText}>or</Text>
              <View style={styles.orLine} />
            </View>

            {/* Social Login Buttons */}
            <View style={styles.socialContainer}>
              <TouchableOpacity
                style={styles.socialButton}
                onPress={handleGoogleLogin}
                disabled={isLoading}
              >
                <Ionicons name="logo-google" size={24} color="#DB4437" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.socialButton}>
                <Ionicons name="logo-facebook" size={24} color="#1877F2" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.socialButton}>
                <Ionicons name="logo-apple" size={28} color="#000" />
              </TouchableOpacity>
            </View>

            {/* Sign Up Link */}
            <View style={styles.signupContainer}>
              <Text style={styles.signupText}>
                Don&apos;t have an account?{" "}
              </Text>
              <Link href="/(auth)/signup" style={styles.signupLink}>
                Sign Up
              </Link>
            </View>
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
    paddingTop: 40,
  },
  header: {
    marginBottom: 32,
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
    lineHeight: 22,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#D1D5F0",
    borderRadius: 25,
    padding: 4,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 22,
    alignItems: "center",
  },
  activeTab: {
    backgroundColor: "#FFFFFF",
  },
  tabText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#7986CB",
  },
  activeTabText: {
    color: "#000",
    fontWeight: "600",
  },
  inputContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 16,
  },
  input: {
    fontSize: 16,
    color: "#000",
    padding: 0,
  },
  phoneInputContainer: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  countrySelector: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 12,
    borderRightWidth: 1,
    borderRightColor: "#E0E0E0",
    marginRight: 12,
  },
  flagEmoji: {
    fontSize: 20,
    marginRight: 6,
  },
  countryCode: {
    fontSize: 16,
    color: "#000",
    fontWeight: "500",
    marginRight: 4,
  },
  phoneInput: {
    flex: 1,
    fontSize: 16,
    color: "#000",
    padding: 0,
  },
  passwordContainer: {
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  passwordInputField: {
    flex: 1,
    fontSize: 16,
    color: "#000",
    padding: 0,
  },
  eyeButton: {
    padding: 4,
  },
  forgotPassword: {
    alignSelf: "flex-end",
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: "#5C6BC0",
    fontWeight: "500",
  },
  loginButton: {
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
  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
  },
  orContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#C5CAE9",
  },
  orText: {
    marginHorizontal: 16,
    color: "#9FA8DA",
    fontSize: 14,
    fontWeight: "500",
  },
  socialContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    marginBottom: 32,
  },
  socialButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  signupContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 16,
  },
  signupText: {
    fontSize: 15,
    color: "#9FA8DA",
  },
  signupLink: {
    fontSize: 15,
    color: "#000",
    fontWeight: "600",
  },
});
