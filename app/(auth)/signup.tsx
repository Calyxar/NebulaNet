// app/(auth)/signup.tsx ✅ — with Google SSO + device fingerprinting
// ✅ FIXED: email verification no longer blocks onboarding
//           verification email sent in background, user proceeds to onboarding

import { useAuth } from "@/hooks/useAuth";
import { usePhoneAuth } from "@/hooks/usePhoneAuth";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import authNative from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import * as Application from "expo-application";
import * as Device from "expo-device";
import { Link, router } from "expo-router";
import React, { useEffect, useState } from "react";
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

GoogleSignin.configure({
  webClientId:
    "651919287297-p47sq6itdfidob7nrluutl0ggqlgoe8p.apps.googleusercontent.com",
});

const COUNTRY_CODES = [
  { flag: "🇺🇸", code: "+1", label: "US" },
  { flag: "🇬🇧", code: "+44", label: "UK" },
  { flag: "🇨🇦", code: "+1", label: "CA" },
  { flag: "🇦🇺", code: "+61", label: "AU" },
  { flag: "🇩🇪", code: "+49", label: "DE" },
  { flag: "🇫🇷", code: "+33", label: "FR" },
  { flag: "🇮🇳", code: "+91", label: "IN" },
  { flag: "🇧🇷", code: "+55", label: "BR" },
  { flag: "🇲🇽", code: "+52", label: "MX" },
  { flag: "🇳🇬", code: "+234", label: "NG" },
];

export default function SignUpScreen() {
  const {
    user,
    isLoading: authLoading,
    signup,
    signOut,
    updateProfile,
  } = useAuth();
  const { colors, isDark } = useTheme();
  const { sendOTP, state: phoneState, error: phoneError } = usePhoneAuth();

  const [activeTab, setActiveTab] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedCountry, setSelectedCountry] = useState(COUNTRY_CODES[0]);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  useEffect(() => {
    if (phoneError) Alert.alert("Error", phoneError);
  }, [phoneError]);

  const validateEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  const validateUsername = (v: string) => /^[a-zA-Z0-9_]{3,20}$/.test(v);
  const validatePassword = (v: string) => v.length >= 8;

  const saveDeviceFingerprint = async (uid: string) => {
    try {
      const deviceId =
        (await Application.getAndroidId()) ??
        `${Device.modelName ?? "unknown"}_${Device.osVersion ?? "0"}`;
      const flaggedSnap = await firestore()
        .collection("flagged_devices")
        .doc(deviceId)
        .get();
      await firestore()
        .collection("profiles")
        .doc(uid)
        .update({
          device_id: deviceId,
          device_info: {
            device_id: deviceId,
            device_name: Device.deviceName ?? null,
            os_version: Device.osVersion ?? null,
            model: Device.modelName ?? null,
            updated_at: new Date().toISOString(),
          },
        });
      if (flaggedSnap.exists()) {
        const flagData = flaggedSnap.data() as any;
        if (flagData?.reason === "under_13_blocked") {
          await firestore().collection("profiles").doc(uid).update({
            requires_parental_approval: true,
            device_flagged: true,
          });
        }
      }
    } catch (err) {
      console.warn("Device fingerprint failed:", err);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });
      await GoogleSignin.signIn();
      const tokens = await GoogleSignin.getTokens();
      const googleCredential = authNative.GoogleAuthProvider.credential(
        tokens.idToken,
      );
      const result = await authNative().signInWithCredential(googleCredential);
      if (result.user?.uid) {
        await saveDeviceFingerprint(result.user.uid);
      }
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) return;
      if (error.code === statusCodes.IN_PROGRESS) return;
      if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert("Error", "Google Play Services not available.");
        return;
      }
      Alert.alert(
        "Google Sign-In Failed",
        error?.message ?? "Please try again.",
      );
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (user) return;

    if (activeTab === "phone") {
      const uname = username.trim().toLowerCase();
      const name = fullName.trim();
      if (!uname) {
        Alert.alert("Error", "Please enter a username");
        return;
      }
      if (!validateUsername(uname)) {
        Alert.alert(
          "Invalid Username",
          "3-20 characters, letters/numbers/underscores only.",
        );
        return;
      }
      if (!name) {
        Alert.alert("Error", "Please enter your full name");
        return;
      }
      const digits = phone.replace(/\D/g, "");
      if (digits.length < 7) {
        Alert.alert("Invalid number", "Enter a valid phone number.");
        return;
      }
      const fullNumber = `${selectedCountry.code}${digits}`;
      const ok = await sendOTP(fullNumber);
      if (ok) {
        router.push({
          pathname: "/(auth)/phone-otp",
          params: { phoneNumber: fullNumber, username: uname, fullName: name },
        } as any);
      }
      return;
    }

    const uname = username.trim().toLowerCase();
    const name = fullName.trim();
    if (!uname) {
      Alert.alert("Error", "Please enter a username");
      return;
    }
    if (!validateUsername(uname)) {
      Alert.alert(
        "Invalid Username",
        "3-20 characters, letters/numbers/underscores only.",
      );
      return;
    }
    if (!name) {
      Alert.alert("Error", "Please enter your full name");
      return;
    }
    if (!validateEmail(email)) {
      Alert.alert("Invalid Email", "Please enter a valid email address");
      return;
    }
    if (!validatePassword(password)) {
      Alert.alert("Weak Password", "Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
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

      // ✅ Save device fingerprint
      if (createdUser?.uid) {
        await saveDeviceFingerprint(createdUser.uid);
      }

      // ✅ Send verification email silently in background.
      // Do NOT sign the user out or block onboarding.
      // _layout.tsx will route them to onboarding immediately.
      // They can verify their email later from settings.
      if (createdUser && !createdUser.emailVerified) {
        createdUser.sendEmailVerification().catch((emailErr: any) => {
          console.warn("Verification email failed to send:", emailErr?.message);
        });
      }

      // ✅ _layout.tsx takes over from here — routes to onboarding automatically
    } catch (error: any) {
      const msg = error?.message || "Sign up failed";
      const lower = msg.toLowerCase();
      let title = "Sign Up Failed",
        body = msg;
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

  const isSendingOTP = phoneState === "sending";
  const disabled =
    isSubmitting ||
    authLoading ||
    signup.isPending ||
    isSendingOTP ||
    isGoogleLoading;

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

            {activeTab === "email" && (
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
            )}

            {activeTab === "phone" && (
              <>
                <View
                  style={[
                    styles.phoneInputContainer,
                    { backgroundColor: colors.card },
                  ]}
                >
                  <TouchableOpacity
                    style={[
                      styles.countrySelector,
                      { borderRightColor: colors.border },
                    ]}
                    onPress={() => setShowCountryPicker(true)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.flagEmoji}>{selectedCountry.flag}</Text>
                    <Text style={[styles.countryCode, { color: colors.text }]}>
                      {selectedCountry.code}
                    </Text>
                    <Ionicons
                      name="chevron-down"
                      size={14}
                      color={colors.textTertiary}
                    />
                  </TouchableOpacity>
                  <TextInput
                    style={[styles.phoneInput, { color: colors.text }]}
                    placeholder="Phone number"
                    placeholderTextColor={colors.placeholder}
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    editable={!disabled}
                  />
                </View>
                {showCountryPicker && (
                  <View
                    style={[
                      styles.countryDropdown,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    {COUNTRY_CODES.map((c) => (
                      <TouchableOpacity
                        key={c.label}
                        style={[
                          styles.countryOption,
                          { borderBottomColor: colors.border },
                        ]}
                        onPress={() => {
                          setSelectedCountry(c);
                          setShowCountryPicker(false);
                        }}
                      >
                        <Text style={styles.flagEmoji}>{c.flag}</Text>
                        <Text
                          style={[
                            styles.countryOptionText,
                            { color: colors.text },
                          ]}
                        >
                          {c.label} {c.code}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </>
            )}

            {activeTab === "email" &&
              [
                {
                  value: password,
                  setter: setPassword,
                  show: showPassword,
                  toggle: () => setShowPassword(!showPassword),
                  placeholder: "Password (min. 8 characters)",
                },
                {
                  value: confirmPassword,
                  setter: setConfirmPassword,
                  show: showConfirmPassword,
                  toggle: () => setShowConfirmPassword(!showConfirmPassword),
                  placeholder: "Confirm password",
                },
              ].map(({ value, setter, show, toggle, placeholder }) => (
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
                      style={[
                        styles.passwordInputField,
                        { color: colors.text },
                      ]}
                      placeholder={placeholder}
                      placeholderTextColor={colors.placeholder}
                      value={value}
                      onChangeText={setter}
                      secureTextEntry={!show}
                      autoCapitalize="none"
                      editable={!disabled}
                    />
                    <TouchableOpacity onPress={toggle} disabled={disabled}>
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
                {isSendingOTP
                  ? "Sending code..."
                  : isSubmitting
                    ? "Creating account..."
                    : activeTab === "phone"
                      ? "Send Code"
                      : "Sign Up"}
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
                style={[
                  styles.socialButton,
                  { backgroundColor: colors.card },
                  isGoogleLoading && { opacity: 0.6 },
                ]}
                onPress={handleGoogleSignIn}
                disabled={disabled}
                activeOpacity={0.85}
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
    marginBottom: 8,
  },
  countrySelector: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 12,
    borderRightWidth: 1,
    marginRight: 12,
    gap: 4,
  },
  flagEmoji: { fontSize: 20 },
  countryCode: { fontSize: 15, fontWeight: "600" },
  phoneInput: { flex: 1, fontSize: 16, padding: 0 },
  countryDropdown: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    overflow: "hidden",
  },
  countryOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  countryOptionText: { fontSize: 14, fontWeight: "500" },
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
