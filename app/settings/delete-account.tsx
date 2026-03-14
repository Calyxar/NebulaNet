// app/settings/delete-account.tsx — UPDATED ✅ dark mode
import Button from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { useDeleteAccount } from "@/hooks/useDeleteAccount";
import { auth } from "@/lib/firebase";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { useMemo, useState } from "react";
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

export default function DeleteAccountScreen() {
  const { user, profile, signOut } = useAuth();
  const { colors, isDark } = useTheme();
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
  const isConfirmValid =
    confirmationText.trim().toLowerCase() === confirmPhrase.toLowerCase();

  const handleDelete = () => {
    Alert.alert(
      "Delete Account Permanently",
      "This cannot be undone. All your data will be permanently deleted.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Account",
          style: "destructive",
          onPress: async () => {
            if (!user?.email) {
              Alert.alert("Error", "You must be logged in.");
              return;
            }
            if (!isConfirmValid) {
              Alert.alert("Text doesn't match", `Type: ${confirmPhrase}`);
              return;
            }
            if (!password) {
              Alert.alert("Password required", "Please enter your password.");
              return;
            }

            setIsLoading(true);
            try {
              const currentUser = auth.currentUser;
              if (!currentUser) {
                Alert.alert("Error", "Not signed in");
                return;
              }
              try {
                await reauthenticateWithCredential(
                  currentUser,
                  EmailAuthProvider.credential(user.email!, password),
                );
              } catch {
                Alert.alert("Incorrect password", "Please try again.");
                return;
              }

              await deleteAccount.mutateAsync({
                reason: reason.trim() || null,
              });
              await signOut();
              router.replace("/");
              Alert.alert(
                "Deleted",
                "Your account and data have been deleted.",
              );
            } catch (err: any) {
              Alert.alert(
                "Delete failed",
                err?.message || "Something went wrong.",
              );
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
          Delete Account
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
          <Ionicons name="trash-outline" size={44} color="#ff3b30" />
          <Text style={[styles.heroTitle, { color: colors.text }]}>
            Delete Account
          </Text>
          <Text style={[styles.heroSub, { color: colors.textSecondary }]}>
            Permanently delete your account and all associated data.
          </Text>
        </View>

        {/* Warning */}
        <View
          style={[
            styles.card,
            { backgroundColor: "#ff3b3012", borderColor: "#ff3b3035" },
          ]}
        >
          <View style={styles.row}>
            <Ionicons name="warning-outline" size={20} color="#ff3b30" />
            <Text style={[styles.warnTitle, { color: "#ff3b30" }]}>
              This action is irreversible
            </Text>
          </View>
          <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
            {
              "• All posts, comments, and messages deleted\n• Profile permanently removed\n• Cannot be undone\n• You will lose all access"
            }
          </Text>
        </View>

        {/* Reason */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.label, { color: colors.text }]}>
            Why are you leaving? (Optional)
          </Text>
          <Text style={[styles.sublabel, { color: colors.textSecondary }]}>
            Your feedback helps us improve.
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
        </View>

        {/* Confirm phrase */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.label, { color: colors.text }]}>
            Confirm Your Identity
          </Text>
          <Text style={[styles.sublabel, { color: colors.textSecondary }]}>
            Type{" "}
            <Text style={{ fontWeight: "800", color: colors.text }}>
              {confirmPhrase}
            </Text>{" "}
            to confirm
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.surface,
                borderColor:
                  !isConfirmValid && confirmationText
                    ? "#ff3b30"
                    : colors.border,
                color: colors.text,
              },
            ]}
            placeholder={`Type "${confirmPhrase}"`}
            placeholderTextColor={colors.textTertiary}
            value={confirmationText}
            onChangeText={setConfirmationText}
            autoCapitalize="none"
          />
          {!!confirmationText && !isConfirmValid && (
            <Text style={styles.errText}>Text does not match</Text>
          )}
        </View>

        {/* Password */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.label, { color: colors.text }]}>
            Enter Your Password
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

        {/* Alternatives */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.label, { color: colors.text }]}>
            Consider these alternatives:
          </Text>
          {[
            {
              icon: "pause-circle-outline",
              label: "Deactivate account",
              sub: " — temporarily hide your profile",
              route: "/settings/deactivate",
            },
            {
              icon: "settings-outline",
              label: "Adjust privacy settings",
              sub: " instead",
              route: "/settings/privacy",
            },
          ].map(({ icon, label, sub, route }) => (
            <TouchableOpacity
              key={label}
              style={styles.altRow}
              onPress={() => router.push(route as any)}
              activeOpacity={0.85}
            >
              <Ionicons
                name={icon as any}
                size={18}
                color={colors.textSecondary}
              />
              <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
                <Text style={{ color: colors.primary, fontWeight: "600" }}>
                  {label}
                </Text>
                {sub}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Buttons */}
        <View style={styles.btnWrap}>
          <Button
            title="Delete Account Permanently"
            onPress={handleDelete}
            loading={isLoading || deleteAccount.isPending}
            disabled={!isConfirmValid || !password || deleteAccount.isPending}
            style={{ backgroundColor: "#ff3b30" }}
          />
          <Button
            title="Cancel"
            variant="outline"
            onPress={() => router.back()}
          />
        </View>
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
  row: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  warnTitle: { fontSize: 14, fontWeight: "800" },
  label: { fontSize: 14, fontWeight: "700", marginBottom: 6 },
  sublabel: { fontSize: 13, marginBottom: 10 },
  bodyText: { fontSize: 13, lineHeight: 20 },
  input: {
    borderRadius: 12,
    padding: 13,
    fontSize: 15,
    borderWidth: 1,
    marginTop: 4,
  },
  textArea: { minHeight: 80, paddingTop: 12 },
  errText: { fontSize: 13, color: "#ff3b30", marginTop: 4 },
  altRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginTop: 10,
  },
  btnWrap: { gap: 10 },
});
