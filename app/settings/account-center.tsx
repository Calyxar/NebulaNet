// app/settings/account-center.tsx — UPDATED ✅ real Firebase functions + header fix
import { useAuth } from "@/hooks/useAuth";
import { auth, db } from "@/lib/firebase";
import { closeSettings, pushSettings } from "@/lib/routes/settingsRoutes";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  verifyBeforeUpdateEmail
} from "firebase/auth";
import {
  collection,
  doc,
  getDocs,
  limit,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
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

export default function AccountCenterScreen() {
  const { user, profile } = useAuth();
  const { colors, isDark } = useTheme();

  const [activePanel, setActivePanel] = useState<"email" | "username" | null>(
    null,
  );
  const [password, setPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const closePanel = () => {
    setActivePanel(null);
    setPassword("");
    setNewEmail("");
    setNewUsername("");
  };

  const handleEmailChange = async () => {
    if (!newEmail.trim() || !password) {
      Alert.alert("Error", "Please enter your new email and current password.");
      return;
    }
    if (!newEmail.includes("@")) {
      Alert.alert("Error", "Please enter a valid email address.");
      return;
    }
    setIsLoading(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser?.email) throw new Error("Not signed in");
      // Re-authenticate first
      await reauthenticateWithCredential(
        currentUser,
        EmailAuthProvider.credential(currentUser.email, password),
      );
      // Send verification to new email
      await verifyBeforeUpdateEmail(currentUser, newEmail.trim());
      // Update in Firestore profiles
      if (user?.uid) {
        await updateDoc(doc(db, "profiles", user.uid), {
          email: newEmail.trim(),
        });
      }
      closePanel();
      Alert.alert(
        "Verification sent",
        `Check ${newEmail.trim()} to confirm your new email address.`,
      );
    } catch (e: any) {
      if (
        e?.code === "auth/wrong-password" ||
        e?.code === "auth/invalid-credential"
      ) {
        Alert.alert("Error", "Incorrect password. Please try again.");
      } else if (e?.code === "auth/email-already-in-use") {
        Alert.alert(
          "Error",
          "This email is already in use by another account.",
        );
      } else {
        Alert.alert("Error", e?.message || "Failed to update email.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleUsernameChange = async () => {
    const trimmed = newUsername.trim().toLowerCase().replace(/\s/g, "_");
    if (!trimmed || trimmed.length < 3) {
      Alert.alert("Error", "Username must be at least 3 characters.");
      return;
    }
    if (!/^[a-z0-9_]+$/.test(trimmed)) {
      Alert.alert(
        "Error",
        "Username can only contain letters, numbers, and underscores.",
      );
      return;
    }
    if (trimmed === profile?.username) {
      Alert.alert("Error", "That's already your username.");
      return;
    }
    setIsLoading(true);
    try {
      // Check uniqueness
      const snap = await getDocs(
        query(
          collection(db, "profiles"),
          where("username", "==", trimmed),
          limit(1),
        ),
      );
      if (!snap.empty) {
        Alert.alert("Taken", "That username is already taken. Try another.");
        return;
      }
      // Update profile
      if (user?.uid) {
        await updateDoc(doc(db, "profiles", user.uid), {
          username: trimmed,
          username_lc: trimmed,
        });
      }
      closePanel();
      Alert.alert("Done", `Your username is now @${trimmed}`);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to update username.");
    } finally {
      setIsLoading(false);
    }
  };

  const content = (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "transparent" }}
      edges={["top", "left", "right"]}
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
            styles.circleBtn,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
          onPress={() => router.back()}
          activeOpacity={0.85}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View
            style={[
              styles.circleBtn,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Ionicons
              name="person-circle-outline"
              size={20}
              color={colors.primary}
            />
          </View>
          <View style={{ flexShrink: 1 }}>
            <Text
              style={[styles.headerTitle, { color: colors.text }]}
              numberOfLines={1}
            >
              Account Center
            </Text>
            <Text
              style={[styles.headerSub, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              Manage identity and account access
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={[
            styles.circleBtn,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
          onPress={() => closeSettings()}
          activeOpacity={0.85}
        >
          <Ionicons name="close" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Identity */}
          <SectionLabel title="Identity" colors={colors} />
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            {/* Email row */}
            <TouchableOpacity
              style={[styles.row, { borderBottomColor: colors.border }]}
              activeOpacity={0.85}
              onPress={() => {
                setActivePanel(activePanel === "email" ? null : "email");
                setPassword("");
                setNewEmail("");
              }}
            >
              <View
                style={[
                  styles.rowIcon,
                  { backgroundColor: colors.primary + "18" },
                ]}
              >
                <Ionicons
                  name="mail-outline"
                  size={18}
                  color={colors.primary}
                />
              </View>
              <View style={styles.rowText}>
                <Text style={[styles.rowTitle, { color: colors.text }]}>
                  Email Address
                </Text>
                <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>
                  {user?.email || "Not set"}
                </Text>
              </View>
              <Ionicons
                name={
                  activePanel === "email" ? "chevron-up" : "chevron-forward"
                }
                size={18}
                color={colors.textTertiary}
              />
            </TouchableOpacity>

            {activePanel === "email" && (
              <View
                style={[styles.inlineForm, { borderTopColor: colors.border }]}
              >
                <Text
                  style={[styles.formLabel, { color: colors.textSecondary }]}
                >
                  New Email Address
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
                  placeholder="Enter new email"
                  placeholderTextColor={colors.textTertiary}
                  value={newEmail}
                  onChangeText={setNewEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Text
                  style={[
                    styles.formLabel,
                    { color: colors.textSecondary, marginTop: 10 },
                  ]}
                >
                  Current Password
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
                  placeholder="Confirm with password"
                  placeholderTextColor={colors.textTertiary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />
                <Text style={[styles.formHint, { color: colors.textTertiary }]}>
                  A verification link will be sent to your new email.
                </Text>
                <View style={styles.formBtns}>
                  <TouchableOpacity
                    style={[
                      styles.saveBtn,
                      {
                        backgroundColor: colors.primary,
                        opacity: isLoading ? 0.6 : 1,
                      },
                    ]}
                    onPress={handleEmailChange}
                    disabled={isLoading}
                  >
                    <Text style={styles.saveBtnText}>
                      {isLoading ? "Saving..." : "Update Email"}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.cancelBtn, { borderColor: colors.border }]}
                    onPress={closePanel}
                  >
                    <Text
                      style={[styles.cancelBtnText, { color: colors.text }]}
                    >
                      Cancel
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Username row */}
            <TouchableOpacity
              style={[styles.row, { borderBottomWidth: 0 }]}
              activeOpacity={0.85}
              onPress={() => {
                setActivePanel(activePanel === "username" ? null : "username");
                setNewUsername("");
              }}
            >
              <View
                style={[
                  styles.rowIcon,
                  { backgroundColor: colors.primary + "18" },
                ]}
              >
                <Ionicons name="at-outline" size={18} color={colors.primary} />
              </View>
              <View style={styles.rowText}>
                <Text style={[styles.rowTitle, { color: colors.text }]}>
                  Username
                </Text>
                <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>
                  {profile?.username ? `@${profile.username}` : "Not set"}
                </Text>
              </View>
              <Ionicons
                name={
                  activePanel === "username" ? "chevron-up" : "chevron-forward"
                }
                size={18}
                color={colors.textTertiary}
              />
            </TouchableOpacity>

            {activePanel === "username" && (
              <View
                style={[styles.inlineForm, { borderTopColor: colors.border }]}
              >
                <Text
                  style={[styles.formLabel, { color: colors.textSecondary }]}
                >
                  New Username
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
                  placeholder="Enter new username"
                  placeholderTextColor={colors.textTertiary}
                  value={newUsername}
                  onChangeText={setNewUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Text style={[styles.formHint, { color: colors.textTertiary }]}>
                  Letters, numbers, and underscores only. Minimum 3 characters.
                </Text>
                <View style={styles.formBtns}>
                  <TouchableOpacity
                    style={[
                      styles.saveBtn,
                      {
                        backgroundColor: colors.primary,
                        opacity: isLoading ? 0.6 : 1,
                      },
                    ]}
                    onPress={handleUsernameChange}
                    disabled={isLoading}
                  >
                    <Text style={styles.saveBtnText}>
                      {isLoading ? "Saving..." : "Update Username"}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.cancelBtn, { borderColor: colors.border }]}
                    onPress={closePanel}
                  >
                    <Text
                      style={[styles.cancelBtnText, { color: colors.text }]}
                    >
                      Cancel
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* Account */}
          <SectionLabel title="Account" colors={colors} />
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <TouchableOpacity
              style={[styles.row, { borderBottomColor: colors.border }]}
              activeOpacity={0.85}
              onPress={() => pushSettings("changePassword")}
            >
              <View
                style={[
                  styles.rowIcon,
                  { backgroundColor: colors.primary + "18" },
                ]}
              >
                <Ionicons name="key-outline" size={18} color={colors.primary} />
              </View>
              <View style={styles.rowText}>
                <Text style={[styles.rowTitle, { color: colors.text }]}>
                  Change Password
                </Text>
                <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>
                  Update your account password
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.textTertiary}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.row, { borderBottomWidth: 0 }]}
              activeOpacity={0.85}
              onPress={() => pushSettings("linkedAccounts")}
            >
              <View
                style={[
                  styles.rowIcon,
                  { backgroundColor: colors.primary + "18" },
                ]}
              >
                <Ionicons
                  name="link-outline"
                  size={18}
                  color={colors.primary}
                />
              </View>
              <View style={styles.rowText}>
                <Text style={[styles.rowTitle, { color: colors.text }]}>
                  Linked Accounts
                </Text>
                <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>
                  Connect Google and more
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.textTertiary}
              />
            </TouchableOpacity>
          </View>

          <Text style={[styles.footer, { color: colors.textTertiary }]}>
            nebulanet.space • Account changes may require re-authentication.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
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

function SectionLabel({ title, colors }: { title: string; colors: any }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  circleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: "800" },
  headerSub: { fontSize: 12, marginTop: 2 },
  scroll: { paddingHorizontal: 18, paddingBottom: 28 },
  sectionHeader: { marginTop: 14, marginBottom: 8, paddingHorizontal: 2 },
  sectionText: { fontSize: 13, fontWeight: "800", letterSpacing: 0.4 },
  card: {
    borderRadius: 22,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 14, fontWeight: "800" },
  rowDesc: { marginTop: 3, fontSize: 12, lineHeight: 16 },
  inlineForm: { paddingHorizontal: 14, paddingVertical: 14, borderTopWidth: 1 },
  formLabel: { fontSize: 12, fontWeight: "700", marginBottom: 6 },
  formHint: { fontSize: 11, lineHeight: 16, marginTop: 6 },
  input: { borderRadius: 12, padding: 12, borderWidth: 1, fontSize: 15 },
  formBtns: { flexDirection: "row", gap: 10, marginTop: 14 },
  saveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  saveBtnText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
  },
  cancelBtnText: { fontWeight: "800", fontSize: 14 },
  footer: { marginTop: 14, fontSize: 12, textAlign: "center", lineHeight: 18 },
});
