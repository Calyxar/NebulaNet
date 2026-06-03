// app/settings/two-factor.tsx ✅
// Enable / disable two-factor authentication via phone number + OTP

import { usePhoneAuth } from "@/hooks/usePhoneAuth";
import {
  useDisableTwoFactor,
  useEnableTwoFactor,
  useTwoFactorStatus,
} from "@/hooks/useTwoFactorAuth";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
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

const CODE_LENGTH = 6;

type Step = "overview" | "enter_phone" | "enter_otp";

export default function TwoFactorScreen() {
  const { colors, isDark } = useTheme();
  const { data: twoFactor, isLoading } = useTwoFactorStatus();
  const enableMutation = useEnableTwoFactor();
  const disableMutation = useDisableTwoFactor();
  const {
    sendOTP,
    sendOTPForLink,
    verifyOTP,
    state: phoneState,
    error: phoneError,
    reset,
  } = usePhoneAuth();

  const [step, setStep] = useState<Step>("overview");
  const [selectedCountry, setSelectedCountry] = useState(COUNTRY_CODES[0]);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [phone, setPhone] = useState("");
  const [fullNumber, setFullNumber] = useState("");
  const [code, setCode] = useState("");
  const inputRef = useRef<TextInput>(null);

  const gradientColors = isDark
    ? [colors.background, colors.background, colors.background]
    : (["#DCEBFF", "#EEF4FF", "#FFFFFF"] as const);

  const handleSendOTP = async () => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 7) {
      Alert.alert("Invalid number", "Enter a valid phone number.");
      return;
    }
    const num = `${selectedCountry.code}${digits}`;
    const ok = await sendOTPForLink(num);
    if (ok) {
      setFullNumber(num);
      setStep("enter_otp");
    } else if (phoneError) Alert.alert("Error", phoneError);
  };

  const handleVerifyAndEnable = async () => {
    if (code.length !== CODE_LENGTH) return;
    const user = await verifyOTP(code);
    if (user) {
      await enableMutation.mutateAsync(fullNumber);
      Alert.alert(
        "2FA Enabled",
        "Two-factor authentication is now active on your account.",
        [{ text: "Done", onPress: () => router.back() }],
      );
    } else if (phoneError) {
      Alert.alert("Wrong code", phoneError);
    }
  };

  const handleDisable = () => {
    Alert.alert(
      "Disable 2FA?",
      "Your account will be less secure without two-factor authentication.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disable",
          style: "destructive",
          onPress: async () => {
            await disableMutation.mutateAsync();
            Alert.alert(
              "2FA Disabled",
              "Two-factor authentication has been turned off.",
            );
          },
        },
      ],
    );
  };

  const handleCodeChange = (text: string) => {
    const clean = text.replace(/\D/g, "").slice(0, CODE_LENGTH);
    setCode(clean);
    if (clean.length === CODE_LENGTH) {
      setTimeout(() => handleVerifyAndEnable(), 200);
    }
  };

  const inner = (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "transparent" }}
      edges={["top", "left", "right"]}
    >
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => {
            if (step === "overview") router.back();
            else {
              reset();
              setStep("overview");
              setCode("");
              setPhone("");
            }
          }}
          style={[
            styles.backBtn,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Two-Factor Auth
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── OVERVIEW ── */}
          {step === "overview" && (
            <>
              <View
                style={[
                  styles.iconCircle,
                  { backgroundColor: colors.primary + "18" },
                ]}
              >
                <Ionicons
                  name="shield-checkmark-outline"
                  size={36}
                  color={colors.primary}
                />
              </View>
              <Text style={[styles.title, { color: colors.text }]}>
                Two-Factor Authentication
              </Text>
              <Text style={[styles.subtitle, { color: colors.textTertiary }]}>
                Add an extra layer of security. When enabled, you'll be asked to
                verify your identity with a code sent to your phone every time
                you log in.
              </Text>

              {isLoading ? null : twoFactor?.enabled ? (
                <>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: "#10B98120" },
                    ]}
                  >
                    <Ionicons
                      name="checkmark-circle"
                      size={18}
                      color="#10B981"
                    />
                    <Text style={[styles.statusText, { color: "#10B981" }]}>
                      2FA is enabled
                    </Text>
                  </View>
                  {twoFactor.phone_number && (
                    <Text
                      style={[
                        styles.phoneDisplay,
                        { color: colors.textTertiary },
                      ]}
                    >
                      Linked to{" "}
                      {twoFactor.phone_number.replace(
                        /(\+\d{1,3})\d+(\d{4})/,
                        "$1••••$2",
                      )}
                    </Text>
                  )}
                  <TouchableOpacity
                    style={[
                      styles.btn,
                      {
                        backgroundColor: "#EF444420",
                        borderColor: "#EF4444",
                        borderWidth: 1,
                      },
                    ]}
                    onPress={handleDisable}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.btnText, { color: "#EF4444" }]}>
                      Disable 2FA
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: colors.surface },
                    ]}
                  >
                    <Ionicons
                      name="shield-outline"
                      size={18}
                      color={colors.textTertiary}
                    />
                    <Text
                      style={[
                        styles.statusText,
                        { color: colors.textTertiary },
                      ]}
                    >
                      2FA is not enabled
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.btn, { backgroundColor: colors.primary }]}
                    onPress={() => setStep("enter_phone")}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.btnText, { color: "#fff" }]}>
                      Enable 2FA
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              {/* Info cards */}
              <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
                {[
                  {
                    icon: "phone-portrait-outline",
                    text: "A code is sent to your phone each time you sign in",
                  },
                  {
                    icon: "lock-closed-outline",
                    text: "Protects your account even if your password is compromised",
                  },
                  {
                    icon: "time-outline",
                    text: "Codes expire after a short time for extra security",
                  },
                ].map((item, i) => (
                  <View
                    key={i}
                    style={[
                      styles.infoRow,
                      i !== 0 && {
                        borderTopWidth: 1,
                        borderTopColor: colors.border,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.infoIcon,
                        { backgroundColor: colors.primary + "18" },
                      ]}
                    >
                      <Ionicons
                        name={item.icon as any}
                        size={18}
                        color={colors.primary}
                      />
                    </View>
                    <Text
                      style={[styles.infoText, { color: colors.textTertiary }]}
                    >
                      {item.text}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* ── ENTER PHONE ── */}
          {step === "enter_phone" && (
            <>
              <View
                style={[
                  styles.iconCircle,
                  { backgroundColor: colors.primary + "18" },
                ]}
              >
                <Ionicons
                  name="phone-portrait-outline"
                  size={36}
                  color={colors.primary}
                />
              </View>
              <Text style={[styles.title, { color: colors.text }]}>
                Add your phone
              </Text>
              <Text style={[styles.subtitle, { color: colors.textTertiary }]}>
                We'll send a verification code to this number each time you log
                in.
              </Text>

              {/* Phone input */}
              <View style={[styles.phoneRow, { backgroundColor: colors.card }]}>
                <TouchableOpacity
                  style={[
                    styles.countryBtn,
                    { borderRightColor: colors.border },
                  ]}
                  onPress={() => setShowCountryPicker(!showCountryPicker)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.flag}>{selectedCountry.flag}</Text>
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
                  placeholderTextColor={colors.textTertiary}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </View>

              {showCountryPicker && (
                <View
                  style={[
                    styles.dropdown,
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
                        styles.dropdownItem,
                        { borderBottomColor: colors.border },
                      ]}
                      onPress={() => {
                        setSelectedCountry(c);
                        setShowCountryPicker(false);
                      }}
                    >
                      <Text style={styles.flag}>{c.flag}</Text>
                      <Text
                        style={[styles.dropdownLabel, { color: colors.text }]}
                      >
                        {c.label} {c.code}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <TouchableOpacity
                style={[
                  styles.btn,
                  {
                    backgroundColor:
                      phoneState === "sending" ? colors.border : colors.primary,
                  },
                ]}
                onPress={handleSendOTP}
                disabled={phoneState === "sending"}
                activeOpacity={0.85}
              >
                <Text style={[styles.btnText, { color: "#fff" }]}>
                  {phoneState === "sending"
                    ? "Sending..."
                    : "Send verification code"}
                </Text>
              </TouchableOpacity>
            </>
          )}

          {/* ── ENTER OTP ── */}
          {step === "enter_otp" && (
            <>
              <View
                style={[
                  styles.iconCircle,
                  { backgroundColor: colors.primary + "18" },
                ]}
              >
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={36}
                  color={colors.primary}
                />
              </View>
              <Text style={[styles.title, { color: colors.text }]}>
                Enter the code
              </Text>
              <Text style={[styles.subtitle, { color: colors.textTertiary }]}>
                We sent a 6-digit code to{"\n"}
                <Text style={{ color: colors.text, fontWeight: "700" }}>
                  {fullNumber}
                </Text>
              </Text>

              <TextInput
                ref={inputRef}
                value={code}
                onChangeText={handleCodeChange}
                keyboardType="number-pad"
                maxLength={CODE_LENGTH}
                style={styles.hiddenInput}
                autoFocus
              />

              <TouchableOpacity
                style={styles.boxes}
                onPress={() => inputRef.current?.focus()}
                activeOpacity={1}
              >
                {Array(CODE_LENGTH)
                  .fill(0)
                  .map((_, i) => {
                    const char = code[i] ?? "";
                    const isActive = i === code.length;
                    return (
                      <View
                        key={i}
                        style={[
                          styles.box,
                          {
                            backgroundColor: colors.card,
                            borderColor: isActive
                              ? colors.primary
                              : char
                                ? colors.primary + "60"
                                : colors.border,
                            borderWidth: isActive ? 2 : 1,
                          },
                        ]}
                      >
                        <Text style={[styles.boxChar, { color: colors.text }]}>
                          {char}
                        </Text>
                      </View>
                    );
                  })}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.btn,
                  {
                    backgroundColor:
                      code.length === CODE_LENGTH
                        ? colors.primary
                        : colors.border,
                  },
                ]}
                onPress={handleVerifyAndEnable}
                disabled={
                  code.length !== CODE_LENGTH || phoneState === "verifying"
                }
                activeOpacity={0.85}
              >
                <Text style={[styles.btnText, { color: "#fff" }]}>
                  {phoneState === "verifying"
                    ? "Verifying..."
                    : "Verify & Enable"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  reset();
                  setStep("enter_phone");
                  setCode("");
                }}
              >
                <Text style={[styles.resend, { color: colors.primary }]}>
                  Resend code
                </Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

  if (!isDark) {
    return (
      <LinearGradient
        colors={gradientColors as any}
        locations={[0, 0.42, 1]}
        style={{ flex: 1 }}
      >
        {inner}
      </LinearGradient>
    );
  }
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>{inner}</View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  headerTitle: { fontSize: 16, fontWeight: "800" },
  content: { padding: 24, alignItems: "center", gap: 16 },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: { fontSize: 22, fontWeight: "900", textAlign: "center" },
  subtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 320,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },
  statusText: { fontSize: 14, fontWeight: "700" },
  phoneDisplay: { fontSize: 13, fontWeight: "600" },
  btn: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 28,
    alignItems: "center",
  },
  btnText: { fontSize: 15, fontWeight: "800" },
  infoCard: {
    width: "100%",
    borderRadius: 20,
    overflow: "hidden",
    marginTop: 8,
  },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  infoText: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: "500" },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    width: "100%",
  },
  countryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingRight: 12,
    borderRightWidth: 1,
    marginRight: 12,
  },
  flag: { fontSize: 20 },
  countryCode: { fontSize: 15, fontWeight: "600" },
  phoneInput: { flex: 1, fontSize: 16 },
  dropdown: {
    width: "100%",
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  dropdownLabel: { fontSize: 14, fontWeight: "500" },
  hiddenInput: { position: "absolute", opacity: 0, width: 0, height: 0 },
  boxes: { flexDirection: "row", gap: 10 },
  box: {
    width: 48,
    height: 58,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  boxChar: { fontSize: 24, fontWeight: "800" },
  resend: { fontSize: 14, fontWeight: "700", marginTop: 4 },
});
