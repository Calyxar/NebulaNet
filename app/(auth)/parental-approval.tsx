// app/(auth)/parental-approval.tsx ✅
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import functions from "@react-native-firebase/functions";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ParentalApprovalScreen() {
  const { user, completeOnboarding } = useAuth();
  const { colors, isDark } = useTheme();
  const { birthdate, age } = useLocalSearchParams<{
    birthdate: string;
    age: string;
  }>();

  const [parentEmail, setParentEmail] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const gradientColors = isDark
    ? ([colors.background, colors.background] as const)
    : (["#DCEBFF", "#EEF4FF", "#FFFFFF"] as const);

  const validateEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const handleSendCode = async () => {
    if (!validateEmail(parentEmail)) {
      Alert.alert(
        "Invalid Email",
        "Please enter a valid parent email address.",
      );
      return;
    }
    setSending(true);
    try {
      await functions().httpsCallable("sendParentalVerificationEmail")({
        parentEmail,
        childUserId: user?.uid,
        childUsername: user?.displayName ?? "your child",
      });
      setCodeSent(true);
      Alert.alert(
        "Code Sent!",
        `A 6-digit verification code has been sent to ${parentEmail}. Please ask your parent to check their email.`,
      );
    } catch (err: any) {
      Alert.alert(
        "Error",
        err?.message ?? "Failed to send code. Please try again.",
      );
    } finally {
      setSending(false);
    }
  };

  const handleVerifyCode = async () => {
    if (code.length !== 6) {
      Alert.alert("Invalid Code", "Please enter the 6-digit code.");
      return;
    }
    setVerifying(true);
    try {
      await functions().httpsCallable("verifyParentalCode")({
        childUserId: user?.uid,
        code,
      });

      // ✅ Save birthdate + age group + parental approval
      const { db } = await import("@/lib/firebase");
      const firestore = (await import("@react-native-firebase/firestore"))
        .default;
      await db.collection("profiles").doc(user!.uid).update({
        birthdate,
        age_group: "under_13",
        parental_approved: true,
        parental_email: parentEmail,
        updated_at: new Date().toISOString(),
        updated_at_ts: firestore.FieldValue.serverTimestamp(),
      });

      // ✅ Lock all restricted content
      await db.collection("user_settings").doc(user!.uid).set(
        {
          nsfw_locked: true,
          content_restricted: true,
          updated_at: new Date().toISOString(),
        },
        { merge: true },
      );

      // ✅ Complete onboarding so _layout.tsx doesn't redirect back
      await completeOnboarding();

      Alert.alert(
        "Welcome to NebulaNet!",
        "Your parent has approved your account. You can now use NebulaNet with safe content settings.",
        [{ text: "Let's Go!", onPress: () => router.replace("/(tabs)/home") }],
      );
    } catch (err: any) {
      const msg = err?.message ?? "";
      if (msg.includes("expired")) {
        Alert.alert(
          "Code Expired",
          "The verification code has expired. Please request a new one.",
        );
        setCodeSent(false);
        setCode("");
      } else if (msg.includes("Invalid")) {
        Alert.alert("Wrong Code", "That code is incorrect. Please try again.");
      } else {
        Alert.alert("Error", msg || "Verification failed. Please try again.");
      }
    } finally {
      setVerifying(false);
    }
  };

  return (
    <LinearGradient
      colors={gradientColors as any}
      locations={[0, 0.5, 1]}
      style={{ flex: 1 }}
    >
      <SafeAreaView
        style={styles.container}
        edges={["top", "left", "right", "bottom"]}
      >
        <StatusBar
          barStyle={isDark ? "light-content" : "dark-content"}
          backgroundColor="transparent"
          translucent
        />

        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.content}>
          <View
            style={[styles.iconWrap, { backgroundColor: "#FF9500" + "18" }]}
          >
            <Text style={styles.iconEmoji}>👨‍👩‍👧</Text>
          </View>

          <Text style={[styles.title, { color: colors.text }]}>
            Parental Approval Required
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            NebulaNet requires parental consent for users under 13. Please ask a
            parent or guardian to verify your account.
          </Text>

          <View
            style={[
              styles.ageNotice,
              {
                backgroundColor: "#FF9500" + "12",
                borderColor: "#FF9500" + "30",
              },
            ]}
          >
            <Ionicons
              name="information-circle-outline"
              size={18}
              color="#FF9500"
            />
            <Text
              style={[styles.ageNoticeText, { color: colors.textSecondary }]}
            >
              You entered a birthdate that indicates you are under 13 years old.
              A parent or guardian must approve your account.
            </Text>
          </View>

          {!codeSent ? (
            <>
              <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>
                Parent or Guardian's Email
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                placeholder="parent@email.com"
                placeholderTextColor={colors.textTertiary}
                value={parentEmail}
                onChangeText={setParentEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text style={[styles.emailNote, { color: colors.textTertiary }]}>
                We'll send a 6-digit verification code to this email. Your
                parent will need to provide the code to complete setup.
              </Text>
            </>
          ) : (
            <>
              <View
                style={[
                  styles.sentNotice,
                  {
                    backgroundColor: colors.primary + "12",
                    borderColor: colors.primary + "30",
                  },
                ]}
              >
                <Ionicons
                  name="mail-outline"
                  size={18}
                  color={colors.primary}
                />
                <Text
                  style={[
                    styles.sentNoticeText,
                    { color: colors.textSecondary },
                  ]}
                >
                  A code was sent to {parentEmail}. Ask your parent to check
                  their email and share the code with you.
                </Text>
              </View>

              <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>
                Enter 6-Digit Code
              </Text>
              <TextInput
                style={[
                  styles.codeInput,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                placeholder="• • • • • •"
                placeholderTextColor={colors.textTertiary}
                value={code}
                onChangeText={(v) => setCode(v.replace(/\D/g, "").slice(0, 6))}
                keyboardType="number-pad"
                maxLength={6}
              />

              <TouchableOpacity
                onPress={() => {
                  setCodeSent(false);
                  setCode("");
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.resendText, { color: colors.primary }]}>
                  Didn't receive it? Send again
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={styles.footer}>
          {!codeSent ? (
            <TouchableOpacity
              style={[
                styles.btn,
                {
                  backgroundColor: validateEmail(parentEmail)
                    ? colors.primary
                    : colors.border,
                },
              ]}
              onPress={handleSendCode}
              disabled={!validateEmail(parentEmail) || sending}
              activeOpacity={0.9}
            >
              {sending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.btnText}>Send Code to Parent</Text>
                  <Ionicons name="send-outline" size={18} color="#fff" />
                </>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.btn,
                {
                  backgroundColor:
                    code.length === 6 ? colors.primary : colors.border,
                },
              ]}
              onPress={handleVerifyCode}
              disabled={code.length !== 6 || verifying}
              activeOpacity={0.9}
            >
              {verifying ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.btnText}>Verify & Continue</Text>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={20}
                    color="#fff"
                  />
                </>
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.exitBtn}
            onPress={() => {
              Alert.alert(
                "Exit Setup",
                "You need parental approval to use NebulaNet. Your account will not be accessible until a parent approves it.",
                [
                  { text: "Stay", style: "cancel" },
                  {
                    text: "Exit",
                    style: "destructive",
                    onPress: () => router.replace("/(auth)/login"),
                  },
                ],
              );
            }}
            activeOpacity={0.8}
          >
            <Text style={[styles.exitText, { color: colors.textTertiary }]}>
              Exit without approving
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backBtn: { padding: 20, paddingBottom: 0 },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: "center",
    gap: 16,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  iconEmoji: { fontSize: 44 },
  title: {
    fontSize: 26,
    fontWeight: "900",
    textAlign: "center",
    lineHeight: 32,
  },
  subtitle: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  ageNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  ageNoticeText: { flex: 1, fontSize: 13, lineHeight: 18 },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: "600",
  },
  emailNote: { fontSize: 12, lineHeight: 18 },
  sentNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  sentNoticeText: { flex: 1, fontSize: 13, lineHeight: 18 },
  codeInput: {
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 28,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: 12,
  },
  resendText: { fontSize: 14, fontWeight: "600", textAlign: "center" },
  footer: { paddingHorizontal: 24, paddingVertical: 20, gap: 12 },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
    borderRadius: 28,
  },
  btnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  exitBtn: { alignItems: "center", paddingVertical: 8 },
  exitText: { fontSize: 14, fontWeight: "600" },
});
