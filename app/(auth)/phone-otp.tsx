// app/(auth)/phone-otp.tsx — REACT NATIVE FIREBASE ✅
// OTP verification screen — navigated to from login/signup phone flow
// Params: phoneNumber (display only), twoFactor (bool), email, password

import { usePhoneAuth } from "@/hooks/usePhoneAuth";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import auth from "@react-native-firebase/auth";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const CODE_LENGTH = 6;

export default function PhoneOTPScreen() {
  const { colors, isDark } = useTheme();
  const { phoneNumber, twoFactor, email, password } = useLocalSearchParams<{
    phoneNumber: string;
    twoFactor?: string;
    email?: string;
    password?: string;
  }>();
  const { verifyOTP, state, error, reset } = usePhoneAuth();

  const [code, setCode] = useState("");
  const [countdown, setCountdown] = useState(60);
  const inputRef = useRef<TextInput>(null);

  const gradientColors = isDark
    ? [colors.background, colors.background, colors.background]
    : (["#DCEBFF", "#EEF4FF", "#FFFFFF"] as const);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  useEffect(() => {
    if (error) Alert.alert("Verification Failed", error);
  }, [error]);

  // ─── FIX: Two-factor sign-in with proper error handling ─────────────────
  // Previously this silently swallowed errors, which could leave the user
  // phone-verified but not email-signed-in with no feedback or recovery path.
  const finishTwoFactor = async (): Promise<boolean> => {
    if (twoFactor !== "1" || !email || !password) return true;
    try {
      await auth().signInWithEmailAndPassword(email, password);
      return true;
    } catch (e: any) {
      // Phone verification succeeded but email re-auth failed.
      // This can happen if the session expired. Show a clear message
      // and send them to login so they can start fresh.
      Alert.alert(
        "Session Expired",
        "Phone verified successfully, but your session expired. Please log in again.",
        [
          {
            text: "Log In",
            onPress: () => router.replace("/(auth)/login"),
          },
        ],
      );
      return false;
    }
  };

  const handleVerify = async () => {
    if (code.length !== CODE_LENGTH) return;
    const otpUser = await verifyOTP(code);
    if (otpUser) {
      const ok = await finishTwoFactor();
      if (ok) router.replace("/(tabs)/home" as any);
    }
  };

  const handleCodeChange = (text: string) => {
    const clean = text.replace(/\D/g, "").slice(0, CODE_LENGTH);
    setCode(clean);
    if (clean.length === CODE_LENGTH) {
      setTimeout(async () => {
        const otpUser = await verifyOTP(clean);
        if (otpUser) {
          const ok = await finishTwoFactor();
          if (ok) router.replace("/(tabs)/home" as any);
        }
      }, 200);
    }
  };

  const isVerifying = state === "verifying";

  const renderBoxes = () =>
    Array(CODE_LENGTH)
      .fill(0)
      .map((_, i) => {
        const char = code[i] ?? "";
        const isActive = i === code.length && !isVerifying;
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
            <Text style={[styles.boxChar, { color: colors.text }]}>{char}</Text>
          </View>
        );
      });

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

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            reset();
            router.back();
          }}
          style={[
            styles.backBtn,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.content}>
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: colors.primary + "18" },
            ]}
          >
            <Ionicons
              name="phone-portrait-outline"
              size={32}
              color={colors.primary}
            />
          </View>

          <Text style={[styles.title, { color: colors.text }]}>
            Enter the code
          </Text>
          <Text style={[styles.subtitle, { color: colors.textTertiary }]}>
            We sent a 6-digit code to{"\n"}
            <Text style={{ color: colors.text, fontWeight: "700" }}>
              {phoneNumber}
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
            editable={!isVerifying}
          />

          <TouchableOpacity
            style={styles.boxes}
            onPress={() => inputRef.current?.focus()}
            activeOpacity={1}
          >
            {renderBoxes()}
          </TouchableOpacity>

          {!!error && (
            <Text style={[styles.errorText, { color: "#EF4444" }]}>
              {error}
            </Text>
          )}

          <TouchableOpacity
            style={[
              styles.verifyBtn,
              {
                backgroundColor:
                  code.length === CODE_LENGTH && !isVerifying
                    ? colors.primary
                    : colors.border,
              },
            ]}
            onPress={handleVerify}
            disabled={code.length !== CODE_LENGTH || isVerifying}
            activeOpacity={0.85}
          >
            <Text style={styles.verifyBtnText}>
              {isVerifying ? "Verifying..." : "Verify"}
            </Text>
          </TouchableOpacity>

          <View style={styles.resendRow}>
            <Text style={[styles.resendLabel, { color: colors.textTertiary }]}>
              Didn't get a code?{" "}
            </Text>
            {countdown > 0 ? (
              <Text
                style={[styles.resendTimer, { color: colors.textTertiary }]}
              >
                Resend in {countdown}s
              </Text>
            ) : (
              <TouchableOpacity
                onPress={() => {
                  reset();
                  router.back();
                }}
              >
                <Text style={[styles.resendLink, { color: colors.primary }]}>
                  Resend
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
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
  header: { paddingHorizontal: 20, paddingTop: 12 },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  title: { fontSize: 26, fontWeight: "800", textAlign: "center" },
  subtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 8,
  },
  hiddenInput: { position: "absolute", opacity: 0, width: 0, height: 0 },
  boxes: { flexDirection: "row", gap: 10, marginBottom: 8 },
  box: {
    width: 48,
    height: 58,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  boxChar: { fontSize: 24, fontWeight: "800" },
  errorText: { fontSize: 13, fontWeight: "600", textAlign: "center" },
  verifyBtn: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 28,
    alignItems: "center",
    marginTop: 8,
  },
  verifyBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  resendRow: { flexDirection: "row", alignItems: "center" },
  resendLabel: { fontSize: 14 },
  resendTimer: { fontSize: 14, fontWeight: "600" },
  resendLink: { fontSize: 14, fontWeight: "700" },
});
