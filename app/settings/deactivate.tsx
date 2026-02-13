// app/settings/deactivate.tsx
import Button from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
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

export default function DeactivateAccountScreen() {
  const { user, deactivateAccount, deleteAccount } = useAuth();

  const [reason, setReason] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteSection, setShowDeleteSection] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");

  const verifyPassword = async () => {
    const email = user?.email || "";
    if (!email) throw new Error("Missing email");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw new Error("Incorrect password. Please try again.");
  };

  const handleDeactivate = () => {
    Alert.alert(
      "Deactivate Account",
      "Are you sure you want to deactivate your account?\n\nYour profile will be hidden and you won't appear in search results. You can reactivate anytime by logging in.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Deactivate",
          style: "destructive",
          onPress: async () => {
            setIsLoading(true);
            try {
              await verifyPassword();
              await deactivateAccount(reason);
              Alert.alert("Done", "Your account has been deactivated.");
              router.back();
            } catch (error: any) {
              Alert.alert(
                "Error",
                error?.message || "Failed to deactivate account",
              );
            } finally {
              setIsLoading(false);
            }
          },
        },
      ],
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "⚠️ PERMANENT ACCOUNT DELETION",
      "This action cannot be undone!\n\nYour account will be scheduled for deletion and permanently removed in 30 days. During this period, you can cancel the deletion by logging in.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "I Understand, Delete Anyway",
          style: "destructive",
          onPress: async () => {
            setIsLoading(true);
            try {
              await verifyPassword();
              await deleteAccount(deleteReason);
              Alert.alert(
                "Scheduled",
                "Your account is scheduled for deletion. You can cancel by logging in within 30 days.",
              );
              router.replace("/(auth)/login");
            } catch (error: any) {
              Alert.alert(
                "Error",
                error?.message || "Failed to delete account",
              );
            } finally {
              setIsLoading(false);
            }
          },
        },
      ],
    );
  };

  const busy = isLoading;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="warning-outline" size={48} color="#ff9500" />
        <Text style={styles.headerTitle}>Account Status</Text>
        <Text style={styles.headerDescription}>
          Manage your account status - deactivate temporarily or delete
          permanently
        </Text>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="pause-circle-outline" size={24} color="#ff9500" />
          <Text style={styles.sectionTitle}>Deactivate Account</Text>
        </View>

        <View style={styles.warningBox}>
          <Ionicons
            name="information-circle-outline"
            size={20}
            color="#ff9500"
          />
          <View style={styles.warningContent}>
            <Text style={styles.warningTitle}>
              What happens when you deactivate:
            </Text>
            <Text style={styles.warningText}>
              • Your profile will be hidden from other users{"\n"}• Your posts
              and comments will remain visible{"\n"}• You won&apos;t appear in
              search results{"\n"}• You can reactivate by logging in anytime
            </Text>
          </View>
        </View>

        <Text style={styles.inputLabel}>Why are you leaving? (Optional)</Text>
        <Text style={styles.inputDescription}>
          Your feedback helps us improve NebulaNet
        </Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Tell us why you're deactivating..."
          value={reason}
          onChangeText={setReason}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        <Text style={styles.inputLabel}>Confirm Your Password</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your password to confirm"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
        />

        <View style={styles.buttonContainer}>
          <Button
            title="Deactivate Account"
            onPress={handleDeactivate}
            loading={busy}
            disabled={!password || password.length < 6 || busy}
            style={styles.deactivateButton}
          />
        </View>
      </View>

      <TouchableOpacity
        style={styles.toggleSection}
        onPress={() => setShowDeleteSection(!showDeleteSection)}
        activeOpacity={0.85}
      >
        <Text style={styles.toggleSectionText}>
          {showDeleteSection ? "▼ Hide" : "▶ Show"} Permanent Deletion Options
        </Text>
        <Ionicons
          name={showDeleteSection ? "chevron-up" : "chevron-down"}
          size={20}
          color="#ff3b30"
        />
      </TouchableOpacity>

      {showDeleteSection && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="trash-outline" size={24} color="#ff3b30" />
            <Text style={styles.sectionTitle}>Delete Account Permanently</Text>
          </View>

          <View style={styles.dangerBox}>
            <Ionicons name="warning-outline" size={20} color="#ff3b30" />
            <View style={styles.warningContent}>
              <Text style={styles.dangerTitle}>
                ⚠️ THIS ACTION IS PERMANENT
              </Text>
              <Text style={styles.dangerText}>
                • Your account will be scheduled for deletion{"\n"}• Data will
                be permanently removed in 30 days{"\n"}• This action cannot be
                undone{"\n"}• During grace period, you can cancel deletion by
                logging in
              </Text>
            </View>
          </View>

          <Text style={styles.inputLabel}>Reason for deletion (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Why are you deleting your account?"
            value={deleteReason}
            onChangeText={setDeleteReason}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          <View style={styles.buttonContainer}>
            <Button
              title="Delete Account Permanently"
              onPress={handleDeleteAccount}
              loading={busy}
              disabled={!password || password.length < 6 || busy}
              style={styles.deleteButton}
            />
          </View>
        </View>
      )}

      <View style={styles.cancelSection}>
        <Button
          title="Cancel"
          variant="outline"
          onPress={() => router.back()}
        />
      </View>

      <View style={styles.helpSection}>
        <Ionicons name="help-circle-outline" size={20} color="#007AFF" />
        <View style={styles.helpContent}>
          <Text style={styles.helpTitle}>Need Help?</Text>
          <Text style={styles.helpText}>
            • Contact support for account recovery{"\n"}• Export your data
            before deletion{"\n"}• Read our account policy
          </Text>
          <TouchableOpacity
            style={styles.helpLink}
            activeOpacity={0.85}
            onPress={() =>
              Alert.alert(
                "Contact Support",
                "support@nebulanet.space\n\nWe're here to help!",
              )
            }
          >
            <Text style={styles.helpLinkText}>Contact Support →</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  header: {
    padding: 40,
    backgroundColor: "white",
    alignItems: "center",
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#000",
    marginTop: 16,
    marginBottom: 8,
  },
  headerDescription: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
  },
  section: {
    backgroundColor: "white",
    marginBottom: 16,
    padding: 20,
    borderRadius: 12,
    marginHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: "600", color: "#000" },

  warningBox: {
    flexDirection: "row",
    backgroundColor: "#fff3e0",
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    gap: 12,
  },
  dangerBox: {
    flexDirection: "row",
    backgroundColor: "#ffeaea",
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: "#ffcccc",
  },
  warningContent: { flex: 1 },
  warningTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
    marginBottom: 4,
  },
  dangerTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ff3b30",
    marginBottom: 4,
  },
  warningText: { fontSize: 13, color: "#666", lineHeight: 18 },
  dangerText: { fontSize: 13, color: "#666", lineHeight: 18 },

  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 8,
  },
  inputDescription: { fontSize: 14, color: "#666", marginBottom: 12 },

  input: {
    backgroundColor: "#f8f8f8",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    marginBottom: 16,
  },
  textArea: { minHeight: 100, paddingTop: 12 },

  buttonContainer: { gap: 8 },
  deactivateButton: { backgroundColor: "#ff9500" },
  deleteButton: { backgroundColor: "#ff3b30" },

  toggleSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "white",
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
  },
  toggleSectionText: { fontSize: 16, fontWeight: "600", color: "#ff3b30" },

  cancelSection: { padding: 20, marginTop: 8 },

  helpSection: {
    flexDirection: "row",
    backgroundColor: "#e8f4f8",
    margin: 16,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  helpContent: { flex: 1 },
  helpTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
    marginBottom: 4,
  },
  helpText: { fontSize: 13, color: "#666", lineHeight: 18, marginBottom: 8 },
  helpLink: { alignSelf: "flex-start" },
  helpLinkText: { fontSize: 14, color: "#007AFF", fontWeight: "500" },
});
