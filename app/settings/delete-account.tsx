import Button from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { useDeleteAccount } from "@/hooks/useDeleteAccount";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

export default function DeleteAccountScreen() {
  const { user, profile, signOut } = useAuth();
  const deleteAccount = useDeleteAccount();

  const [confirmationText, setConfirmationText] = useState("");
  const [password, setPassword] = useState("");
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handle = useMemo(() => {
    const username =
      profile?.username?.trim() || user?.email?.split("@")[0]?.trim() || "user";
    return `@${username}`;
  }, [profile?.username, user?.email]);

  const confirmPhrase = useMemo(() => `delete ${handle}`, [handle]);

  const isConfirmTextValid =
    confirmationText.trim().toLowerCase() === confirmPhrase.toLowerCase();

  const hardResetToWelcome = () => {
    // Replace to root so back stack doesn't return to authenticated screens
    router.replace("/");
  };

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
            if (!user?.email) {
              Alert.alert(
                "Error",
                "You must be logged in to delete your account.",
              );
              return;
            }

            if (!isConfirmTextValid) {
              Alert.alert(
                "Confirm text doesn't match",
                `Type: ${confirmPhrase}`,
              );
              return;
            }

            if (!password) {
              Alert.alert("Password required", "Please enter your password.");
              return;
            }

            setIsLoading(true);

            try {
              // ✅ OPTIONAL re-auth: keeps Play reviewers happy and protects user
              // NOTE: This does NOT leak any keys; it's normal user auth.
              const { error: signInError } =
                await supabase.auth.signInWithPassword({
                  email: user.email,
                  password,
                });

              if (signInError) {
                Alert.alert("Incorrect password", "Please try again.");
                return;
              }

              // ✅ Call Edge Function (safe) via your hook
              await deleteAccount.mutateAsync({
                reason: reason.trim() || null,
              });

              // ✅ Ensure local session is cleared and app returns to public state
              await signOut();
              hardResetToWelcome();

              Alert.alert(
                "Account deleted",
                "Your account and data have been deleted successfully.",
              );
            } catch (err: any) {
              const msg =
                err?.message ||
                (typeof err === "string" ? err : "Something went wrong.");
              Alert.alert("Delete failed", msg);
            } finally {
              setIsLoading(false);
            }
          },
        },
      ],
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 28 }}
    >
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
          Your feedback helps us improve NebulaNet.
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
          Type <Text style={styles.confirmText}>{confirmPhrase}</Text> to
          confirm
        </Text>
        <TextInput
          style={[
            styles.input,
            !isConfirmTextValid && confirmationText ? styles.inputError : null,
          ]}
          placeholder={`Type "${confirmPhrase}"`}
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

        <Text
          style={styles.alternativeRow}
          onPress={() => router.push("/settings/deactivate")}
        >
          <Ionicons name="pause-circle-outline" size={18} color="#666" />{" "}
          <Text style={styles.alternativeLink}>Deactivate account</Text> —
          temporarily hide your profile
        </Text>

        <Text
          style={styles.alternativeRow}
          onPress={() => router.push("/settings/account-center")}
        >
          <Ionicons name="download-outline" size={18} color="#666" />{" "}
          <Text style={styles.alternativeLink}>Download your data</Text> before
          deleting
        </Text>

        <Text
          style={styles.alternativeRow}
          onPress={() => router.push("/settings/privacy")}
        >
          <Ionicons name="settings-outline" size={18} color="#666" />{" "}
          <Text style={styles.alternativeLink}>Adjust privacy settings</Text>{" "}
          instead
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <Button
          title="Delete Account Permanently"
          onPress={handleDelete}
          loading={isLoading || deleteAccount.isPending}
          disabled={!isConfirmTextValid || !password || deleteAccount.isPending}
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

  warningBox: {
    flexDirection: "row",
    backgroundColor: "#ffeaea",
    margin: 16,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  warningContent: { flex: 1 },
  warningTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
    marginBottom: 4,
  },
  warningText: { fontSize: 13, color: "#666", lineHeight: 18 },

  section: { backgroundColor: "white", marginBottom: 16, padding: 20 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 8,
  },
  sectionDescription: { fontSize: 14, color: "#666", marginBottom: 12 },

  confirmText: { fontWeight: "700", color: "#000" },

  input: {
    backgroundColor: "#f8f8f8",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  textArea: { minHeight: 80, paddingTop: 12 },
  inputError: { borderColor: "#ff3b30" },
  errorText: { fontSize: 14, color: "#ff3b30", marginTop: 4 },

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
  alternativeRow: {
    fontSize: 13,
    color: "#666",
    lineHeight: 20,
    marginBottom: 10,
  },
  alternativeLink: { color: "#007AFF", fontWeight: "500" },

  buttonContainer: { padding: 20, gap: 12 },
  deleteButton: { backgroundColor: "#ff3b30" },
});
