// app/settings/change-password.tsx
import Button from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface PasswordStrength {
  score: number;
  text: string;
  color: string;
}

export default function ChangePasswordScreen() {
  const { user, updatePassword } = useAuth();
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = () => {
    if (!formData.currentPassword) {
      Alert.alert("Error", "Please enter your current password");
      return false;
    }

    if (!formData.newPassword) {
      Alert.alert("Error", "Please enter a new password");
      return false;
    }

    if (formData.newPassword.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters long");
      return false;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      Alert.alert("Error", "New passwords do not match");
      return false;
    }

    if (formData.currentPassword === formData.newPassword) {
      Alert.alert(
        "Error",
        "New password must be different from current password",
      );
      return false;
    }

    return true;
  };

  const handleUpdatePassword = async () => {
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      // First, verify current password by signing in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || "",
        password: formData.currentPassword,
      });

      if (signInError) {
        Alert.alert("Error", "Current password is incorrect");
        return;
      }

      // Update to new password
      await updatePassword.mutateAsync({ newPassword: formData.newPassword });

      // Clear form
      setFormData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      Alert.alert("Success", "Your password has been updated successfully.", [
        { text: "OK" },
      ]);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to update password");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    Alert.alert(
      "Forgot Password?",
      "We can send a password reset link to your email address.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send Reset Link",
          onPress: async () => {
            try {
              const { error } = await supabase.auth.resetPasswordForEmail(
                user?.email || "",
                {
                  redirectTo: `${process.env.EXPO_PUBLIC_APP_URL}/reset-password`,
                },
              );

              if (error) throw error;

              Alert.alert(
                "Reset Link Sent",
                "Check your email for instructions to reset your password.",
              );
            } catch (error: any) {
              Alert.alert("Error", error.message);
            }
          },
        },
      ],
    );
  };

  const passwordStrength = (password: string): PasswordStrength => {
    if (!password) return { score: 0, text: "", color: "#f0f0f0" };

    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    const strength: Record<number, { text: string; color: string }> = {
      0: { text: "Very weak", color: "#ff3b30" },
      1: { text: "Weak", color: "#ff9500" },
      2: { text: "Fair", color: "#ffcc00" },
      3: { text: "Good", color: "#34c759" },
      4: { text: "Strong", color: "#32d74b" },
      5: { text: "Very strong", color: "#30d158" },
    };

    const strengthLevel = Math.min(score, 5);
    return {
      score,
      text: strength[strengthLevel].text,
      color: strength[strengthLevel].color,
    };
  };

  const newPasswordStrength = passwordStrength(formData.newPassword);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Change Password</Text>
        <Text style={styles.headerDescription}>
          Update your password to keep your account secure
        </Text>
      </View>

      <View style={styles.form}>
        {/* Current Password */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Current Password</Text>
          <View style={styles.passwordInputContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Enter current password"
              value={formData.currentPassword}
              onChangeText={(text) =>
                setFormData({ ...formData, currentPassword: text })
              }
              secureTextEntry={!showCurrentPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowCurrentPassword(!showCurrentPassword)}
            >
              <Ionicons
                name={showCurrentPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color="#666"
              />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.forgotPasswordLink}
            onPress={handleForgotPassword}
          >
            <Text style={styles.forgotPasswordText}>Forgot password?</Text>
          </TouchableOpacity>
        </View>

        {/* New Password */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>New Password</Text>
          <View style={styles.passwordInputContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Enter new password"
              value={formData.newPassword}
              onChangeText={(text) =>
                setFormData({ ...formData, newPassword: text })
              }
              secureTextEntry={!showNewPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowNewPassword(!showNewPassword)}
            >
              <Ionicons
                name={showNewPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color="#666"
              />
            </TouchableOpacity>
          </View>

          {/* Password Strength Indicator */}
          {formData.newPassword && (
            <View style={styles.strengthContainer}>
              <View style={styles.strengthBar}>
                {[1, 2, 3, 4, 5].map((index) => (
                  <View
                    key={index}
                    style={[
                      styles.strengthSegment,
                      index <= newPasswordStrength.score && {
                        backgroundColor: newPasswordStrength.color,
                      },
                    ]}
                  />
                ))}
              </View>
              <Text
                style={[
                  styles.strengthText,
                  { color: newPasswordStrength.color },
                ]}
              >
                {newPasswordStrength.text}
              </Text>
            </View>
          )}

          {/* Password Requirements */}
          <View style={styles.requirementsContainer}>
            <Text style={styles.requirementsTitle}>Password must include:</Text>
            <View style={styles.requirementItem}>
              <Ionicons
                name={
                  formData.newPassword.length >= 8
                    ? "checkmark-circle"
                    : "ellipse-outline"
                }
                size={16}
                color={formData.newPassword.length >= 8 ? "#34c759" : "#999"}
              />
              <Text
                style={[
                  styles.requirementText,
                  formData.newPassword.length >= 8 && styles.requirementMet,
                ]}
              >
                At least 8 characters
              </Text>
            </View>
            <View style={styles.requirementItem}>
              <Ionicons
                name={
                  /[A-Z]/.test(formData.newPassword) &&
                  /[a-z]/.test(formData.newPassword)
                    ? "checkmark-circle"
                    : "ellipse-outline"
                }
                size={16}
                color={
                  /[A-Z]/.test(formData.newPassword) &&
                  /[a-z]/.test(formData.newPassword)
                    ? "#34c759"
                    : "#999"
                }
              />
              <Text
                style={[
                  styles.requirementText,
                  /[A-Z]/.test(formData.newPassword) &&
                    /[a-z]/.test(formData.newPassword) &&
                    styles.requirementMet,
                ]}
              >
                Upper and lowercase letters
              </Text>
            </View>
            <View style={styles.requirementItem}>
              <Ionicons
                name={
                  /[0-9]/.test(formData.newPassword)
                    ? "checkmark-circle"
                    : "ellipse-outline"
                }
                size={16}
                color={/[0-9]/.test(formData.newPassword) ? "#34c759" : "#999"}
              />
              <Text
                style={[
                  styles.requirementText,
                  /[0-9]/.test(formData.newPassword) && styles.requirementMet,
                ]}
              >
                At least one number
              </Text>
            </View>
            <View style={styles.requirementItem}>
              <Ionicons
                name={
                  /[^A-Za-z0-9]/.test(formData.newPassword)
                    ? "checkmark-circle"
                    : "ellipse-outline"
                }
                size={16}
                color={
                  /[^A-Za-z0-9]/.test(formData.newPassword) ? "#34c759" : "#999"
                }
              />
              <Text
                style={[
                  styles.requirementText,
                  /[^A-Za-z0-9]/.test(formData.newPassword) &&
                    styles.requirementMet,
                ]}
              >
                At least one special character
              </Text>
            </View>
          </View>
        </View>

        {/* Confirm Password */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Confirm New Password</Text>
          <View style={styles.passwordInputContainer}>
            <TextInput
              style={[
                styles.passwordInput,
                formData.confirmPassword &&
                  formData.newPassword !== formData.confirmPassword &&
                  styles.inputError,
              ]}
              placeholder="Confirm new password"
              value={formData.confirmPassword}
              onChangeText={(text) =>
                setFormData({ ...formData, confirmPassword: text })
              }
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              <Ionicons
                name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color="#666"
              />
            </TouchableOpacity>
          </View>
          {formData.confirmPassword &&
            formData.newPassword !== formData.confirmPassword && (
              <Text style={styles.errorText}>Passwords do not match</Text>
            )}
          {formData.confirmPassword &&
            formData.newPassword === formData.confirmPassword && (
              <Text style={styles.successText}>Passwords match ✓</Text>
            )}
        </View>
      </View>

      <View style={styles.infoBox}>
        <Ionicons name="shield-checkmark-outline" size={20} color="#007AFF" />
        <View style={styles.infoContent}>
          <Text style={styles.infoTitle}>Security Tips</Text>
          <Text style={styles.infoText}>
            • Use a unique password not used on other sites{"\n"}• Consider
            using a password manager{"\n"}• Change your password regularly{"\n"}
            • Never share your password with anyone
          </Text>
        </View>
      </View>

      <View style={styles.buttonContainer}>
        <Button
          title="Update Password"
          onPress={handleUpdatePassword}
          loading={isLoading || updatePassword.isPending}
          disabled={
            !formData.currentPassword ||
            !formData.newPassword ||
            !formData.confirmPassword ||
            formData.newPassword !== formData.confirmPassword ||
            formData.newPassword.length < 6
          }
        />

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => {
            setFormData({
              currentPassword: "",
              newPassword: "",
              confirmPassword: "",
            });
          }}
          disabled={isLoading || updatePassword.isPending}
        >
          <Text style={styles.cancelButtonText}>Clear Form</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Need help?{" "}
          <Text
            style={styles.footerLink}
            onPress={() => {
              // Open help center
            }}
          >
            Visit our help center
          </Text>
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    padding: 20,
    backgroundColor: "white",
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#000",
    marginBottom: 8,
  },
  headerDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  form: {
    backgroundColor: "white",
    marginBottom: 16,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    color: "#000",
    marginBottom: 8,
  },
  passwordInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f8f8",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  passwordInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: "#000",
  },
  eyeButton: {
    padding: 12,
  },
  inputError: {
    borderColor: "#ff3b30",
  },
  forgotPasswordLink: {
    alignSelf: "flex-end",
    marginTop: 8,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: "#007AFF",
  },
  strengthContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    gap: 12,
  },
  strengthBar: {
    flex: 1,
    flexDirection: "row",
    height: 4,
    backgroundColor: "#f0f0f0",
    borderRadius: 2,
    overflow: "hidden",
  },
  strengthSegment: {
    flex: 1,
    height: "100%",
    marginHorizontal: 1,
  },
  strengthText: {
    fontSize: 12,
    fontWeight: "500",
  },
  requirementsContainer: {
    marginTop: 16,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
    marginBottom: 8,
  },
  requirementItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 8,
  },
  requirementText: {
    fontSize: 14,
    color: "#999",
  },
  requirementMet: {
    color: "#34c759",
  },
  errorText: {
    fontSize: 14,
    color: "#ff3b30",
    marginTop: 4,
  },
  successText: {
    fontSize: 14,
    color: "#34c759",
    marginTop: 4,
  },
  infoBox: {
    flexDirection: "row",
    backgroundColor: "#e8f4f8",
    margin: 16,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: "#666",
    lineHeight: 18,
  },
  buttonContainer: {
    padding: 20,
    gap: 12,
  },
  cancelButton: {
    alignItems: "center",
    padding: 16,
  },
  cancelButtonText: {
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
  footer: {
    padding: 20,
    marginBottom: 16,
  },
  footerText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
  },
  footerLink: {
    color: "#007AFF",
    fontWeight: "500",
  },
});
