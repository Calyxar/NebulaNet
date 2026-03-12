// app/(auth)/login.tsx — COMPLETED + UPDATED ✅
import { useAuth } from "@/providers/AuthProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import { Link, router } from "expo-router";
import { useEffect, useState } from "react";
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

// ✅ Configure Google Sign-In once on module load
GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  offlineAccess: false,
  forceCodeForRefreshToken: false,
});

export default function LoginScreen() {
  const { user, isLoading: authLoading, login, googleLogin } = useAuth();
  const { colors, isDark } = useTheme();

  const [activeTab, setActiveTab] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sign out of Google on mount to force account picker each time
  useEffect(() => {
    GoogleSignin.signOut().catch(() => {});
  }, []);

  const validateEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  const validatePhone = (v: string) =>
    /^[\+]?[1-9][\d]{0,17}$/.test(v.replace(/\D/g, ""));

  const handleLogin = async () => {
    if (user) return;
    if (activeTab === "email" && !validateEmail(email)) {
      Alert.alert("Invalid Email", "Please enter a valid email address");
      return;
    }
    if (activeTab === "phone") {
      if (!validatePhone(phone)) {
        Alert.alert("Invalid Phone", "Please enter a valid phone number");
        return;
      }
      Alert.alert("Not supported yet", "Use email login for now.");
      return;
    }
    if (!password) {
      Alert.alert("Error", "Please enter your password");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await login.mutateAsync({
        email: email.trim().toLowerCase(),
        password,
      });
      if (res.user && res.user.emailVerified === false) {
        Alert.alert(
          "Email Not Verified",
          "Please verify your email before continuing.",
          [{ text: "OK", onPress: () => router.push("/(auth)/verify-email") }],
        );
        return;
      }
    } catch (error: any) {
      const lower = (error?.message || "").toLowerCase();
      let title = "Login Failed";
      let message = error?.message || "Login failed";
      if (
        lower.includes("auth/wrong-password") ||
        lower.includes("auth/invalid-credential")
      ) {
        title = "Invalid Credentials";
        message = "The email or password you entered is incorrect.";
      } else if (lower.includes("auth/user-not-found")) {
        title = "Account Not Found";
        message = "No account found for this email. Please sign up.";
      } else if (lower.includes("auth/too-many-requests")) {
        title = "Too Many Attempts";
        message = "Too many failed attempts. Please wait and try again.";
      } else if (lower.includes("auth/invalid-email")) {
        title = "Invalid Email";
        message = "Please enter a valid email address.";
      }
      Alert.alert(title, message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (user) return;
    setIsSubmitting(true);
    try {
      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });
      const signInResult = await GoogleSignin.signIn();

      // ✅ Support both old and new SDK response shapes
      const idToken =
        (signInResult as any).data?.idToken ??
        (signInResult as any).idToken ??
        null;

      if (!idToken) {
        Alert.alert("Google Login Failed", "No ID token received from Google.");
        return;
      }

      await googleLogin.mutateAsync({ idToken });
    } catch (error: any) {
      if (error?.code === statusCodes.SIGN_IN_CANCELLED) return;
      if (error?.code === statusCodes.IN_PROGRESS) return;
      if (error?.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert("Error", "Google Play Services not available.");
        return;
      }
      const msg = error?.message || "Unable to sign in with Google.";
      Alert.alert("Google Login Failed", msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const disabled =
    isSubmitting || authLoading || login.isPending || googleLogin.isPending;

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
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.text }]}>
                Welcome Back
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Sign in to continue your journey.
              </Text>
            </View>

            {/* Tab selector */}
            <View
              style={[
                styles.tabContainer,
                { backgroundColor: colors.inputBackground },
              ]}
            >
              {(["email", "phone"] as const).map((tab) => (
                <TouchableOpacity
                  key={tab}
                  style={[
                    styles.tab,
                    activeTab === tab && { backgroundColor: colors.card },
                  ]}
                  onPress={() => setActiveTab(tab)}
                  disabled={disabled}
                >
                  <Text
                    style={[
                      styles.tabText,
                      { color: colors.textSecondary },
                      activeTab === tab && {
                        color: colors.text,
                        fontWeight: "600",
                      },
                    ]}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Email / Phone input */}
            {activeTab === "email" ? (
              <View
                style={[
                  styles.inputContainer,
                  { backgroundColor: colors.card },
                ]}
              >
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Enter your email"
                  placeholderTextColor={colors.placeholder}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!disabled}
                />
              </View>
            ) : (
              <View
                style={[
                  styles.phoneInputContainer,
                  { backgroundColor: colors.card },
                ]}
              >
                <View
                  style={[
                    styles.countrySelector,
                    { borderRightColor: colors.border },
                  ]}
                >
                  <Text style={styles.flagEmoji}>🇺🇸</Text>
                  <Text style={[styles.countryCode, { color: colors.text }]}>
                    +1
                  </Text>
                  <Ionicons
                    name="chevron-down"
                    size={16}
                    color={colors.textTertiary}
                  />
                </View>
                <TextInput
                  style={[styles.phoneInput, { color: colors.text }]}
                  placeholder="882 9983 2233"
                  placeholderTextColor={colors.placeholder}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  editable={!disabled}
                />
              </View>
            )}

            {/* Password */}
            <View style={styles.passwordContainer}>
              <View
                style={[styles.inputWrapper, { backgroundColor: colors.card }]}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={colors.textTertiary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.passwordInputField, { color: colors.text }]}
                  placeholder="Password"
                  placeholderTextColor={colors.placeholder}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  editable={!disabled}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  disabled={disabled}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={colors.textTertiary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={styles.forgotPassword}
              onPress={() => router.push("/(auth)/forgot-password")}
              disabled={disabled}
            >
              <Text
                style={[styles.forgotPasswordText, { color: colors.primary }]}
              >
                Forgot Password?
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.loginButton, { backgroundColor: colors.primary }]}
              onPress={handleLogin}
              disabled={disabled}
              activeOpacity={0.9}
            >
              <Text style={styles.loginButtonText}>
                {disabled ? "Signing in..." : "Continue"}
              </Text>
            </TouchableOpacity>

            <View style={styles.orContainer}>
              <View
                style={[styles.orLine, { backgroundColor: colors.border }]}
              />
              <Text style={[styles.orText, { color: colors.textTertiary }]}>
                or
              </Text>
              <View
                style={[styles.orLine, { backgroundColor: colors.border }]}
              />
            </View>

            <View style={styles.socialContainer}>
              <TouchableOpacity
                style={[styles.socialButton, { backgroundColor: colors.card }]}
                onPress={handleGoogleLogin}
                disabled={disabled}
              >
                <Ionicons name="logo-google" size={24} color="#DB4437" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.socialButton, { backgroundColor: colors.card }]}
                disabled
              >
                <Ionicons name="logo-facebook" size={24} color="#1877F2" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.socialButton, { backgroundColor: colors.card }]}
                disabled
              >
                <Ionicons name="logo-apple" size={28} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.signupContainer}>
              <Text
                style={[styles.signupText, { color: colors.textSecondary }]}
              >
                Don&apos;t have an account?{" "}
              </Text>
              <Link
                href="/(auth)/signup"
                style={[styles.signupLink, { color: colors.text }]}
              >
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
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 40 },
  header: { marginBottom: 32 },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 8 },
  subtitle: { fontSize: 15, lineHeight: 22 },
  tabContainer: {
    flexDirection: "row",
    borderRadius: 25,
    padding: 4,
    marginBottom: 24,
  },
  tab: { flex: 1, paddingVertical: 12, borderRadius: 22, alignItems: "center" },
  tabText: { fontSize: 15, fontWeight: "500" },
  inputContainer: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 16,
  },
  input: { fontSize: 16, padding: 0 },
  phoneInputContainer: {
    flexDirection: "row",
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
    marginRight: 12,
  },
  flagEmoji: { fontSize: 20, marginRight: 6 },
  countryCode: { fontSize: 16, fontWeight: "500", marginRight: 4 },
  phoneInput: { flex: 1, fontSize: 16, padding: 0 },
  passwordContainer: { marginBottom: 8 },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  inputIcon: { marginRight: 12 },
  passwordInputField: { flex: 1, fontSize: 16, padding: 0 },
  forgotPassword: { alignSelf: "flex-end", marginBottom: 24 },
  forgotPasswordText: { fontSize: 14, fontWeight: "500" },
  loginButton: {
    paddingVertical: 18,
    borderRadius: 28,
    alignItems: "center",
    marginBottom: 24,
  },
  loginButtonText: { color: "#FFFFFF", fontSize: 17, fontWeight: "600" },
  orContainer: { flexDirection: "row", alignItems: "center", marginBottom: 24 },
  orLine: { flex: 1, height: 1 },
  orText: { marginHorizontal: 16, fontSize: 14, fontWeight: "500" },
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
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  signupContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 16,
  },
  signupText: { fontSize: 15 },
  signupLink: { fontSize: 15, fontWeight: "600" },
});
