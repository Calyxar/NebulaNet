// app/settings/deactivate.tsx — UPDATED ✅ dark mode
import Button from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { auth } from "@/lib/firebase";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { useState } from "react";
import {
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function DeactivateAccountScreen() {
  const { user, deactivateAccount, deleteAccount } = useAuth();
  const { colors, isDark } = useTheme();

  const [reason, setReason] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");

  const verifyPassword = async () => {
    const email = user?.email || "";
    if (!email) throw new Error("Missing email");
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("Not signed in");
    await reauthenticateWithCredential(
      currentUser,
      EmailAuthProvider.credential(email, password),
    );
  };

  const handleDeactivate = () => {
    Alert.alert(
      "Deactivate Account",
      "Your profile will be hidden. You can reactivate anytime by logging in.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Deactivate",
          style: "destructive",
          onPress: async () => {
            setIsLoading(true);
            try {
              await verifyPassword();
              await deactivateAccount();
              Alert.alert("Done", "Your account has been deactivated.");
              router.back();
            } catch (e: any) {
              Alert.alert(
                "Error",
                e?.message || "Failed to deactivate account",
              );
            } finally {
              setIsLoading(false);
            }
          },
        },
      ],
    );
  };

  const handleDelete = () => {
    Alert.alert(
      "⚠️ Permanent Deletion",
      "This cannot be undone. Your account will be deleted in 30 days.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Anyway",
          style: "destructive",
          onPress: async () => {
            setIsLoading(true);
            try {
              await verifyPassword();
              await deleteAccount();
              Alert.alert(
                "Scheduled",
                "Account scheduled for deletion. Log in within 30 days to cancel.",
              );
              router.replace("/(auth)/login");
            } catch (e: any) {
              Alert.alert("Error", e?.message || "Failed to delete account");
            } finally {
              setIsLoading(false);
            }
          },
        },
      ],
    );
  };

  const content = (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "transparent" }}
      edges={["left", "right"]}
    >
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[
            styles.backBtn,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
          onPress={() => router.back()}
          activeOpacity={0.85}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Account Status
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* Hero */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              alignItems: "center",
            },
          ]}
        >
          <Ionicons name="warning-outline" size={44} color="#ff9500" />
          <Text style={[styles.heroTitle, { color: colors.text }]}>
            Manage Account Status
          </Text>
          <Text style={[styles.heroSub, { color: colors.textSecondary }]}>
            Deactivate temporarily or delete permanently.
          </Text>
        </View>

        {/* Password field (shared) */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Confirm Your Password
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
            placeholder="Enter your password"
            placeholderTextColor={colors.textTertiary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
          />
        </View>

        {/* Deactivate */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.sectionHead}>
            <Ionicons name="pause-circle-outline" size={22} color="#ff9500" />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Deactivate Account
            </Text>
          </View>

          <View
            style={[
              styles.infoBox,
              { backgroundColor: "#fff3e018", borderColor: "#ff950040" },
            ]}
          >
            <Ionicons
              name="information-circle-outline"
              size={18}
              color="#ff9500"
            />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              {
                "• Profile hidden from other users\n• Posts remain intact\n• Reactivate anytime by logging in"
              }
            </Text>
          </View>

          <Text style={[styles.label, { color: colors.textSecondary }]}>
            Why are you leaving? (Optional)
          </Text>
          <TextInput
            style={[
              styles.input,
              styles.textArea,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
            placeholder="Tell us why..."
            placeholderTextColor={colors.textTertiary}
            value={reason}
            onChangeText={setReason}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          <Button
            title="Deactivate Account"
            onPress={handleDeactivate}
            loading={isLoading}
            disabled={!password || password.length < 6 || isLoading}
            style={{ backgroundColor: "#ff9500" }}
          />
        </View>

        {/* Toggle delete section */}
        <TouchableOpacity
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: "#ff3b3040",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            },
          ]}
          onPress={() => setShowDelete((v) => !v)}
          activeOpacity={0.85}
        >
          <Text
            style={[styles.sectionTitle, { color: colors.error ?? "#ff3b30" }]}
          >
            {showDelete ? "Hide" : "Show"} Permanent Deletion
          </Text>
          <Ionicons
            name={showDelete ? "chevron-up" : "chevron-down"}
            size={20}
            color={colors.error ?? "#ff3b30"}
          />
        </TouchableOpacity>

        {showDelete && (
          <View
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: "#ff3b3040" },
            ]}
          >
            <View style={styles.sectionHead}>
              <Ionicons name="trash-outline" size={22} color="#ff3b30" />
              <Text style={[styles.sectionTitle, { color: "#ff3b30" }]}>
                Delete Permanently
              </Text>
            </View>

            <View
              style={[
                styles.infoBox,
                { backgroundColor: "#ff3b3015", borderColor: "#ff3b3040" },
              ]}
            >
              <Ionicons name="warning-outline" size={18} color="#ff3b30" />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                {
                  "⚠️ THIS CANNOT BE UNDONE\n• Scheduled for deletion\n• Removed permanently in 30 days\n• Cancel by logging in during grace period"
                }
              </Text>
            </View>

            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Reason (Optional)
            </Text>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              placeholder="Why are you deleting your account?"
              placeholderTextColor={colors.textTertiary}
              value={deleteReason}
              onChangeText={setDeleteReason}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <Button
              title="Delete Account Permanently"
              onPress={handleDelete}
              loading={isLoading}
              disabled={!password || password.length < 6 || isLoading}
              style={{ backgroundColor: "#ff3b30" }}
            />
          </View>
        )}

        {/* Help */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              flexDirection: "row",
              gap: 12,
            },
          ]}
        >
          <Ionicons
            name="help-circle-outline"
            size={20}
            color={colors.primary}
          />
          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.sectionTitle,
                { color: colors.text, marginBottom: 4 },
              ]}
            >
              Need Help?
            </Text>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              {
                "• Contact support for account recovery\n• Export your data before deletion"
              }
            </Text>
            <TouchableOpacity
              style={{ marginTop: 8 }}
              onPress={() =>
                Alert.alert("Contact Support", "support@nebulanet.space")
              }
            >
              <Text
                style={{
                  color: colors.primary,
                  fontWeight: "700",
                  fontSize: 14,
                }}
              >
                Contact Support →
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <Button
          title="Cancel"
          variant="outline"
          onPress={() => router.back()}
        />
      </ScrollView>
    </SafeAreaView>
  );

  if (!isDark) {
    return (
      <LinearGradient
        colors={["#DCEBFF", "#EEF4FF", "#FFFFFF"]}
        locations={[0, 0.45, 1]}
        style={{ flex: 1 }}
      >
        {content}
      </LinearGradient>
    );
  }
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 10,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  headerTitle: { fontSize: 17, fontWeight: "800" },
  scroll: { padding: 18, gap: 12, paddingBottom: 32 },
  card: {
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: "800",
    marginTop: 12,
    marginBottom: 6,
  },
  heroSub: { fontSize: 13, textAlign: "center", lineHeight: 18 },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 15, fontWeight: "800" },
  infoBox: {
    flexDirection: "row",
    gap: 10,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  infoText: { flex: 1, fontSize: 13, lineHeight: 20 },
  label: { fontSize: 13, fontWeight: "600", marginBottom: 8 },
  input: {
    borderRadius: 12,
    padding: 13,
    fontSize: 15,
    borderWidth: 1,
    marginBottom: 14,
  },
  textArea: { minHeight: 90, paddingTop: 12 },
});
