// app/(auth)/login.tsx ✅
import { useAuth } from "@/hooks/useAuth";
import { usePhoneAuth } from "@/hooks/usePhoneAuth";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import authNative from "@react-native-firebase/auth";
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

export default function LoginScreen() {
  const { user, isLoading: authLoading, login } = useAuth();
  const { colors, isDark } = useTheme();
  const { sendOTP, state: phoneState, error: phoneError } = usePhoneAuth();

  const [activeTab, setActiveTab] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedCountry, setSelectedCountry] = useState(COUNTRY_CODES[0]);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (phoneError) Alert.alert("Error", phoneError);
  }, [phoneError]);

  const validateEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const handleLogin = async () => {
    if (user) return;

    if (activeTab === "phone") {
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
          params: { phoneNumber: fullNumber },
        } as any);
      }
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert("Invalid Email", "Please enter a valid email address");
      return;
    }
    if (!password) {
      Alert.alert("Error", "Please enter your password");
      return;
    }

    setIsSubmitting(true);
    try {
      await login.mutateAsync({
        email: email.trim().toLowerCase(),
        password,
      });
    } catch (error: any) {
      const code: string = error?.code ?? "";
      const lower = (error?.message || "").toLowerCase();

      // ✅ MFA required — use verifyPhoneNumber directly (no PhoneAuthProvider constructor)
      if (code === "auth/multi-factor-auth-required") {
        try {
          const resolver = authNative().getMultiFactorResolver(error);
          if (!resolver) {
            Alert.alert("Error", "MFA session could not be established.");
            return;
          }
          (global as any).__mfaResolver = resolver;
          const hint = resolver.hints[0] as any;
          const phoneNumber: string = hint?.phoneNumber ?? "";

          // ✅ verifyPhoneNumber on the auth instance — no constructor needed
          const verificationId = await new Promise<string>(
            (resolve, reject) => {
              authNative()
                .verifyPhoneNumber(phoneNumber)
                .on(
                  "state_changed",
                  (snapshot: any) => {
                    if (
                      snapshot.state === authNative.PhoneAuthState.CODE_SENT
                    ) {
                      resolve(snapshot.verificationId);
                    } else if (
                      snapshot.state === authNative.PhoneAuthState.ERROR
                    ) {
                      reject(snapshot.error);
                    }
                  },
                  reject,
                );
            },
          );

          router.push({
            pathname: "/(auth)/phone-otp",
            params: { phoneNumber, verificationId },
          } as any);
        } catch (mfaError: any) {
          Alert.alert("Error", mfaError?.message ?? "MFA challenge failed");
        }
        return;
      }

      let title = "Login Failed",
        message = error?.message || "Login failed";
      if (
        lower.includes("auth/wrong-password") ||
        lower.includes("auth/invalid-credential")
      ) {
        title = "Invalid Credentials";
        message = "The email or password you entered is incorrect.";
      } else if (lower.includes("auth/user-not-found")) {
        title = "Account Not Found";
        message = "No account found for this email.";
      } else if (lower.includes("auth/too-many-requests")) {
        title = "Too Many Attempts";
        message = "Too many failed attempts. Please wait.";
      }
      Alert.alert(title, message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSendingOTP = phoneState === "sending";
  const disabled =
    isSubmitting || authLoading || login.isPending || isSendingOTP;

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

            {activeTab === "email" && (
              <>
                <View style={styles.passwordContainer}>
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
                    style={[
                      styles.forgotPasswordText,
                      { color: colors.primary },
                    ]}
                  >
                    Forgot Password?
                  </Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity
              style={[styles.loginButton, { backgroundColor: colors.primary }]}
              onPress={handleLogin}
              disabled={disabled}
              activeOpacity={0.9}
            >
              <Text style={styles.loginButtonText}>
                {isSendingOTP
                  ? "Sending code..."
                  : disabled
                    ? "Signing in..."
                    : activeTab === "phone"
                      ? "Send Code"
                      : "Continue"}
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
                disabled
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
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 22,
    alignItems: "center",
  },
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
  orContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
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
  signupContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 16,
  },
  signupText: { fontSize: 15 },
  signupLink: { fontSize: 15, fontWeight: "600" },
});
