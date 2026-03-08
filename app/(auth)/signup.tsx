// app/(auth)/signup.tsx — COMPLETED + UPDATED ✅
import { useAuth } from "@/providers/AuthProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { makeRedirectUri } from "expo-auth-session";
import * as Google from "expo-auth-session/providers/google";
import Constants from "expo-constants";
import { Link, router } from "expo-router";
import { sendEmailVerification } from "firebase/auth";
import React, { useMemo, useState } from "react";
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

export default function SignUpScreen() {
  const {
    user,
    isLoading: authLoading,
    signup,
    googleLogin,
    signOut,
    updateProfile,
  } = useAuth();
  const { colors, isDark } = useTheme();

  const [activeTab, setActiveTab] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  const validatePhone = (v: string) =>
    /^[\+]?[1-9][\d]{0,17}$/.test(v.replace(/\D/g, ""));
  const validateUsername = (v: string) => /^[a-zA-Z0-9_]{3,20}$/.test(v);
  const validatePassword = (v: string) => v.length >= 8;

  const redirectUri = useMemo(
    () => makeRedirectUri({ scheme: "nebulanet", path: "auth/callback" }),
    [],
  );

  const [googleRequest, googleResponse, googlePromptAsync] =
    Google.useAuthRequest({
      clientId:
        Constants.expoConfig?.extra?.googleWebClientId ||
        process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      iosClientId:
        Constants.expoConfig?.extra?.googleIosClientId ||
        process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
      androidClientId:
        Constants.expoConfig?.extra?.googleAndroidClientId ||
        process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
      redirectUri,
      scopes: ["profile", "email"],
    });

  const handleSignUp = async () => {
    if (user) return;
    if (activeTab === "email" && !validateEmail(email)) {
      Alert.alert("Invalid Email", "Please enter a valid email address");
      return;
    }
    if (activeTab === "phone") {
      Alert.alert("Not supported yet", "Use email signup for now.");
      return;
    }
    const uname = username.trim().toLowerCase();
    const name = fullName.trim();
    if (!uname) return Alert.alert("Error", "Please enter a username");
    if (!validateUsername(uname)) {
      return Alert.alert(
        "Invalid Username",
        "3-20 characters, letters/numbers/underscores only.",
      );
    }
    if (!name) return Alert.alert("Error", "Please enter your full name");
    if (!validatePassword(password)) {
      return Alert.alert(
        "Weak Password",
        "Password must be at least 8 characters.",
      );
    }
    if (password !== confirmPassword) {
      return Alert.alert("Error", "Passwords do not match");
    }

    setIsSubmitting(true);
    try {
      const res = await signup.mutateAsync({
        email: email.trim().toLowerCase(),
        password,
      });
      const createdUser = res.user;

      try {
        await updateProfile.mutateAsync({ username: uname, full_name: name });
      } catch (e: any) {
        const m = (e?.message || "").toLowerCase();
        if (m.includes("username") || m.includes("taken")) {
          Alert.alert(
            "Username Issue",
            e?.message || "Username is not available.",
          );
        }
      }

      if (createdUser && !createdUser.emailVerified) {
        await sendEmailVerification(createdUser);
        await signOut();
        Alert.alert(
          "Check your email",
          "We sent you a verification link. Please verify, then log in.",
          [
            {
              text: "OK",
              onPress: () => router.replace("/(auth)/verify-email"),
            },
          ],
        );
        return;
      }
    } catch (error: any) {
      const msg = error?.message || "Sign up failed";
      const lower = msg.toLowerCase();
      let title = "Sign Up Failed";
      let body = msg;
      if (lower.includes("auth/email-already-in-use")) {
        title = "Account Exists";
        body = "An account with this email already exists.";
      } else if (lower.includes("auth/weak-password")) {
        title = "Weak Password";
        body = "Password must be at least 6 characters.";
      }
      Alert.alert(title, body);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignUp = async () => {
    if (user || !googleRequest) return;
    void googleResponse;
    setIsSubmitting(true);
    try {
      const result = await googlePromptAsync();
      if (result.type !== "success") return;
      const { id_token, access_token } = result.params as any;
      if (!id_token) {
        Alert.alert("Google Sign Up Failed", "No ID token received.");
        return;
      }
      await googleLogin.mutateAsync({
        idToken: id_token,
        accessToken: access_token ?? undefined,
      });
    } catch (error: any) {
      const msg = error?.message || "Unable to sign up with Google.";
      if (
        !msg.toLowerCase().includes("cancelled") &&
        !msg.toLowerCase().includes("dismissed")
      ) {
        Alert.alert("Google Sign Up Failed", msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const disabled =
    isSubmitting || authLoading || signup.isPending || googleLogin.isPending;

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
                Create Your Account
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Sign up to personalize your experience.
              </Text>
            </View>

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

            {[
              {
                value: fullName,
                setter: setFullName,
                placeholder: "Full Name",
                capitalize: "words" as const,
              },
              {
                value: username,
                setter: setUsername,
                placeholder: "Username",
                capitalize: "none" as const,
              },
            ].map(({ value, setter, placeholder, capitalize }) => (
              <View
                key={placeholder}
                style={[
                  styles.inputContainer,
                  { backgroundColor: colors.card },
                ]}
              >
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder={placeholder}
                  placeholderTextColor={colors.placeholder}
                  value={value}
                  onChangeText={setter}
                  autoCapitalize={capitalize}
                  autoCorrect={false}
                  editable={!disabled}
                />
              </View>
            ))}

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

            {[
              {
                value: password,
                setter: setPassword,
                show: showPassword,
                toggleShow: () => setShowPassword(!showPassword),
                placeholder: "Password (min. 8 characters)",
              },
              {
                value: confirmPassword,
                setter: setConfirmPassword,
                show: showConfirmPassword,
                toggleShow: () => setShowConfirmPassword(!showConfirmPassword),
                placeholder: "Confirm password",
              },
            ].map(({ value, setter, show, toggleShow, placeholder }) => (
              <View key={placeholder} style={styles.passwordContainer}>
                <View
                  style={[
                    styles.inputWrapper,
                    { backgroundColor: colors.card },
                  ]}
                >
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color={colors.textTertiary}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.passwordInputField, { color: colors.text }]}
                    placeholder={placeholder}
                    placeholderTextColor={colors.placeholder}
                    value={value}
                    onChangeText={setter}
                    secureTextEntry={!show}
                    autoCapitalize="none"
                    editable={!disabled}
                  />
                  <TouchableOpacity onPress={toggleShow} disabled={disabled}>
                    <Ionicons
                      name={show ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color={colors.textTertiary}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            <TouchableOpacity
              style={[styles.signupButton, { backgroundColor: colors.primary }]}
              onPress={handleSignUp}
              disabled={disabled}
              activeOpacity={0.9}
            >
              <Text style={styles.signupButtonText}>
                {disabled ? "Creating account..." : "Sign Up"}
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
                onPress={handleGoogleSignUp}
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

            <View style={styles.loginContainer}>
              <Text style={[styles.loginText, { color: colors.textSecondary }]}>
                Already have an account?{" "}
              </Text>
              <Link
                href="/(auth)/login"
                style={[styles.loginLink, { color: colors.text }]}
              >
                Log In
              </Link>
            </View>

            <Text style={[styles.termsText, { color: colors.textTertiary }]}>
              By signing up, you agree to our{" "}
              <Text style={[styles.termsLink, { color: colors.primary }]}>
                Terms of Service
              </Text>{" "}
              and{" "}
              <Text style={[styles.termsLink, { color: colors.primary }]}>
                Privacy Policy
              </Text>
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 24,
  },
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
  passwordContainer: { marginBottom: 16 },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  inputIcon: { marginRight: 12 },
  passwordInputField: { flex: 1, fontSize: 16, padding: 0 },
  signupButton: {
    paddingVertical: 18,
    borderRadius: 28,
    alignItems: "center",
    marginBottom: 24,
  },
  signupButtonText: { color: "#FFFFFF", fontSize: 17, fontWeight: "600" },
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
  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 24,
  },
  loginText: { fontSize: 15 },
  loginLink: { fontSize: 15, fontWeight: "600" },
  termsText: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 20,
  },
  termsLink: { fontWeight: "500" },
});
