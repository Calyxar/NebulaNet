// app/settings/delete-account.tsx
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
  View,
} from "react-native";

export default function DeleteAccountScreen() {
  const { user, deleteAccount } = useAuth();
  const [confirmationText, setConfirmationText] = useState("");
  const [password, setPassword] = useState("");
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleDelete = () => {
    Alert.alert(
      "Delete Account Permanently",
      "This action cannot be undone. All your data will be permanently deleted.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Account",
          style: "destructive",
          onPress: async () => {
            setIsLoading(true);
            try {
              // Verify password first
              const { error: signInError } =
                await supabase.auth.signInWithPassword({
                  email: user?.email || "",
                  password: password,
                });

              if (signInError) {
                Alert.alert("Error", "Incorrect password. Please try again.");
                return;
              }

              // Delete account
              await deleteAccount.mutateAsync({ reason });
            } catch (error: any) {
              Alert.alert("Error", error.message);
            } finally {
              setIsLoading(false);
            }
          },
        },
      ],
    );
  };

  const isConfirmTextValid =
    confirmationText === `delete @${user?.email?.split("@")[0]}`;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="trash-outline" size={48} color="#ff3b30" />
        <Text style={styles.headerTitle}>Delete Account</Text>
        <Text style={styles.headerDescription}>
          Permanently delete your account and all associated data.
        </Text>
      </View>

      <View style={styles.warningBox}>
        <Ionicons name="warning-outline" size={20} color="#ff3b30" />
        <View style={styles.warningContent}>
          <Text style={styles.warningTitle}>This action is irreversible</Text>
          <Text style={styles.warningText}>
            • All your posts, comments, and messages will be deleted{"\n"}• Your
            profile will be permanently removed{"\n"}• This action cannot be
            undone{"\n"}• You will lose access to all NebulaNet features
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Why are you leaving? (Optional)</Text>
        <Text style={styles.sectionDescription}>
          Your feedback helps us improve NebulaNet
        </Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Tell us why you're deleting your account..."
          value={reason}
          onChangeText={setReason}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Confirm Your Identity</Text>
        <Text style={styles.sectionDescription}>
          Type{" "}
          <Text style={styles.confirmText}>
            delete @{user?.email?.split("@")[0]}
          </Text>{" "}
          to confirm
        </Text>
        <TextInput
          style={[
            styles.input,
            !isConfirmTextValid && confirmationText && styles.inputError,
          ]}
          placeholder={`Type "delete @${user?.email?.split("@")[0]}"`}
          value={confirmationText}
          onChangeText={setConfirmationText}
          autoCapitalize="none"
        />
        {confirmationText && !isConfirmTextValid && (
          <Text style={styles.errorText}>Text does not match</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Enter Your Password</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
        />
      </View>

      <View style={styles.alternativesBox}>
        <Text style={styles.alternativesTitle}>
          Consider these alternatives:
        </Text>
        <View style={styles.alternativeItem}>
          <Ionicons name="pause-circle-outline" size={20} color="#666" />
          <Text style={styles.alternativeText}>
            <Text style={styles.alternativeLink}>Deactivate account</Text> -
            Temporarily hide your profile
          </Text>
        </View>
        <View style={styles.alternativeItem}>
          <Ionicons name="download-outline" size={20} color="#666" />
          <Text style={styles.alternativeText}>
            <Text style={styles.alternativeLink}>Download your data</Text>{" "}
            before deleting
          </Text>
        </View>
        <View style={styles.alternativeItem}>
          <Ionicons name="settings-outline" size={20} color="#666" />
          <Text style={styles.alternativeText}>
            <Text style={styles.alternativeLink}>Adjust privacy settings</Text>{" "}
            instead
          </Text>
        </View>
      </View>

      <View style={styles.buttonContainer}>
        <Button
          title="Delete Account Permanently"
          onPress={handleDelete}
          loading={isLoading || deleteAccount.isPending}
          disabled={!isConfirmTextValid || !password}
          style={styles.deleteButton}
        />

        <Button
          title="Cancel"
          variant="outline"
          onPress={() => router.back()}
        />
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
  warningBox: {
    flexDirection: "row",
    backgroundColor: "#ffeaea",
    margin: 16,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
    marginBottom: 4,
  },
  warningText: {
    fontSize: 13,
    color: "#666",
    lineHeight: 18,
  },
  section: {
    backgroundColor: "white",
    marginBottom: 16,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
  },
  confirmText: {
    fontWeight: "700",
    color: "#000",
  },
  input: {
    backgroundColor: "#f8f8f8",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  textArea: {
    minHeight: 80,
    paddingTop: 12,
  },
  inputError: {
    borderColor: "#ff3b30",
  },
  errorText: {
    fontSize: 14,
    color: "#ff3b30",
    marginTop: 4,
  },
  alternativesBox: {
    backgroundColor: "#e8f4f8",
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  alternativesTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
    marginBottom: 12,
  },
  alternativeItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
    gap: 8,
  },
  alternativeText: {
    fontSize: 13,
    color: "#666",
    lineHeight: 18,
    flex: 1,
  },
  alternativeLink: {
    color: "#007AFF",
    fontWeight: "500",
  },
  buttonContainer: {
    padding: 20,
    gap: 12,
  },
  deleteButton: {
    backgroundColor: "#ff3b30",
  },
});
