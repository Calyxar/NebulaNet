// app/(auth)/create-password.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
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

export default function CreatePasswordScreen() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const hasMinLength = password.length >= 8;
  const hasValidContent = /^(?=.*[a-zA-Z])(?=.*[0-9])/.test(password);
  const passwordsMatch =
    password === confirmPassword && confirmPassword.length > 0;
  const avoidCommonWords = !/(password|12345678|qwerty)/i.test(password);

  const isValid =
    hasMinLength && hasValidContent && passwordsMatch && avoidCommonWords;

  const handleContinue = () => {
    if (isValid) {
      // Navigate to next step
      router.push("/(auth)/onboarding");
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
              <Text style={styles.title}>Create Password</Text>
              <Text style={styles.subtitle}>
                Create a strong password to protect your account.
              </Text>
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color="#9FA8DA"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
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

            {/* Confirm Password Input */}
            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color="#9FA8DA"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Confirm Password"
                  placeholderTextColor="#999"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeButton}
                >
                  <Ionicons
                    name={
                      showConfirmPassword ? "eye-off-outline" : "eye-outline"
                    }
                    size={20}
                    color="#9FA8DA"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Password Requirements */}
            <View style={styles.requirementsContainer}>
              <View style={styles.requirementRow}>
                <Ionicons
                  name={
                    hasMinLength
                      ? "checkmark-circle"
                      : "checkmark-circle-outline"
                  }
                  size={20}
                  color={hasMinLength ? "#5C6BC0" : "#9FA8DA"}
                />
                <Text
                  style={[
                    styles.requirementText,
                    hasMinLength && styles.requirementMet,
                  ]}
                >
                  At least 8 characters (include letters, numbers, and symbols).
                </Text>
              </View>

              <View style={styles.requirementRow}>
                <Ionicons
                  name={
                    avoidCommonWords
                      ? "checkmark-circle"
                      : "checkmark-circle-outline"
                  }
                  size={20}
                  color={avoidCommonWords ? "#5C6BC0" : "#9FA8DA"}
                />
                <Text
                  style={[
                    styles.requirementText,
                    avoidCommonWords && styles.requirementMet,
                  ]}
                >
                  Avoid common words or easily guessed phrases.
                </Text>
              </View>
            </View>

            {/* Continue Button */}
            <TouchableOpacity
              style={[
                styles.continueButton,
                !isValid && styles.continueButtonDisabled,
              ]}
              onPress={handleContinue}
              disabled={!isValid}
              activeOpacity={0.9}
            >
              <Text style={styles.continueButtonText}>Continue</Text>
            </TouchableOpacity>
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
  inputContainer: {
    marginBottom: 16,
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
  input: {
    flex: 1,
    fontSize: 16,
    color: "#000",
    padding: 0,
  },
  eyeButton: {
    padding: 4,
  },
  requirementsContainer: {
    marginTop: 24,
    marginBottom: 32,
  },
  requirementRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  requirementText: {
    flex: 1,
    fontSize: 14,
    color: "#9FA8DA",
    marginLeft: 8,
    lineHeight: 20,
  },
  requirementMet: {
    color: "#5C6BC0",
  },
  continueButton: {
    backgroundColor: "#7C3AED",
    paddingVertical: 18,
    borderRadius: 28,
    alignItems: "center",
    shadowColor: "#7C3AED",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  continueButtonDisabled: {
    backgroundColor: "#C5CAE9",
    shadowOpacity: 0,
    elevation: 0,
  },
  continueButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
  },
});
