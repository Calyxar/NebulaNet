// app/(auth)/signup.tsx
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
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
  // ✅ Fixed: Removed all unused variables
  const [activeTab, setActiveTab] = useState<"email" | "phone">("phone");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string) => {
    const phoneRegex = /^[\+]?[1-9][\d]{0,17}$/;
    return phoneRegex.test(phone.replace(/\D/g, ""));
  };

  const handleContinue = async () => {
    if (activeTab === "email" && !validateEmail(email)) {
      Alert.alert("Invalid Email", "Please enter a valid email address");
      return;
    }

    if (activeTab === "phone" && !validatePhone(phone)) {
      Alert.alert("Invalid Phone", "Please enter a valid phone number");
      return;
    }

    // Route to create password screen
    router.push("/(auth)/create-password");
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
              <Text style={styles.title}>Create Your Account</Text>
              <Text style={styles.subtitle}>
                Sign up to personalize your experience.
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

            {/* Input Field */}
            {activeTab === "phone" ? (
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
            ) : (
              <View style={styles.emailInputContainer}>
                <TextInput
                  style={styles.emailInput}
                  placeholder="Enter your email"
                  placeholderTextColor="#999"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
            )}

            {/* OR Divider */}
            <View style={styles.orContainer}>
              <View style={styles.orLine} />
              <Text style={styles.orText}>or</Text>
              <View style={styles.orLine} />
            </View>

            {/* Social Login Buttons */}
            <View style={styles.socialContainer}>
              <TouchableOpacity style={styles.socialButton}>
                <Ionicons name="logo-google" size={24} color="#DB4437" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.socialButton}>
                <Ionicons name="logo-facebook" size={24} color="#1877F2" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.socialButton}>
                <Ionicons name="logo-apple" size={28} color="#000" />
              </TouchableOpacity>
            </View>

            {/* Continue Button */}
            <TouchableOpacity
              style={styles.continueButton}
              onPress={handleContinue}
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
  phoneInputContainer: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 24,
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
  emailInputContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 24,
  },
  emailInput: {
    fontSize: 16,
    color: "#000",
    padding: 0,
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
  continueButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
  },
});
