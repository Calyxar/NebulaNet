// app/settings/account.tsx ✅
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
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

export default function AccountSettingsScreen() {
  const { colors, isDark } = useTheme();
  const { profile, updateProfile } = useAuth();

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.full_name || "");
      setUsername(profile.username || "");
      setLocation((profile as any).location || "");
      setBio(profile.bio || "");
    }
  }, [profile]);

  // ✅ Actually saves via updateProfile mutation instead of showing an alert
  const handleSave = async () => {
    if (!username.trim()) {
      Alert.alert("Validation Error", "Username is required.");
      return;
    }
    if (username.length < 3) {
      Alert.alert(
        "Validation Error",
        "Username must be at least 3 characters.",
      );
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      Alert.alert(
        "Validation Error",
        "Username can only contain letters, numbers, and underscores.",
      );
      return;
    }

    setIsSaving(true);
    try {
      await updateProfile.mutateAsync({
        full_name: name || null,
        username: username.toLowerCase(),
        bio: bio || null,
        location: location || null,
      } as any);
      Alert.alert("Success", "Profile updated successfully!");
      router.back();
    } catch (e: any) {
      Alert.alert("Update Failed", e?.message || "Failed to update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const avatarUrl = profile?.avatar_url;
  const initials = (name || username || "U")[0].toUpperCase();

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
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Edit Profile
        </Text>
        <TouchableOpacity onPress={handleSave} disabled={isSaving}>
          <Text
            style={[
              styles.saveButton,
              { color: isSaving ? colors.textTertiary : colors.primary },
            ]}
          >
            {isSaving ? "Saving…" : "Save"}
          </Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
      >
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar — shows real avatar_url if available */}
          <View
            style={[styles.avatarSection, { borderBottomColor: colors.border }]}
          >
            <View style={styles.avatarWrap}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
              ) : (
                <View
                  style={[
                    styles.avatarFallback,
                    { backgroundColor: colors.primary },
                  ]}
                >
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>
              )}
              {/* Tapping avatar goes to full Edit Profile screen which has the picker */}
              <TouchableOpacity
                style={[
                  styles.editAvatarButton,
                  { backgroundColor: colors.primary, borderColor: colors.card },
                ]}
                onPress={() => router.push("/profile/edit" as any)}
              >
                <Ionicons name="camera" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
            <Text style={[styles.avatarHint, { color: colors.textTertiary }]}>
              Tap camera to change photo
            </Text>
          </View>

          {/* Form */}
          <View style={[styles.form, { borderBottomColor: colors.border }]}>
            {[
              {
                label: "Name",
                value: name,
                onChange: setName,
                placeholder: "Enter your name",
              },
              {
                label: "Username",
                value: username,
                onChange: setUsername,
                placeholder: "Enter username",
                autoCapitalize: "none" as const,
              },
              {
                label: "Location",
                value: location,
                onChange: setLocation,
                placeholder: "Where you're based",
              },
            ].map(({ label, value, onChange, placeholder, autoCapitalize }) => (
              <View key={label} style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  {label}
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      borderColor: colors.border,
                      backgroundColor: colors.surface,
                      color: colors.text,
                    },
                  ]}
                  value={value}
                  onChangeText={onChange}
                  placeholder={placeholder}
                  placeholderTextColor={colors.textTertiary}
                  autoCapitalize={autoCapitalize}
                />
              </View>
            ))}

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Bio
              </Text>
              <TextInput
                style={[
                  styles.input,
                  styles.bioInput,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                    color: colors.text,
                  },
                ]}
                value={bio}
                onChangeText={setBio}
                placeholder="Tell others about yourself"
                placeholderTextColor={colors.textTertiary}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                maxLength={200}
              />
              <Text style={[styles.charCount, { color: colors.textTertiary }]}>
                {bio.length}/200
              </Text>
            </View>
          </View>

          {/* Account actions */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Account Actions
            </Text>
            {[
              {
                icon: "key-outline",
                label: "Change Password",
                route: "/settings/change-password",
              },
              {
                icon: "phone-portrait-outline",
                label: "Phone Number",
                route: null,
              },
            ].map(({ icon, label, route }, idx, arr) => (
              <TouchableOpacity
                key={label}
                style={[
                  styles.actionButton,
                  { borderBottomColor: colors.border },
                  idx === arr.length - 1 && { borderBottomWidth: 0 },
                ]}
                onPress={() =>
                  route
                    ? router.push(route as any)
                    : Alert.alert(label, "Coming soon.")
                }
                activeOpacity={0.85}
              >
                <Ionicons
                  name={icon as any}
                  size={22}
                  color={colors.textSecondary}
                />
                <Text style={[styles.actionText, { color: colors.text }]}>
                  {label}
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={colors.textTertiary}
                />
              </TouchableOpacity>
            ))}
          </View>
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

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: "700" },
  saveButton: { fontSize: 16, fontWeight: "600" },
  content: { flex: 1 },
  avatarSection: {
    alignItems: "center",
    paddingVertical: 28,
    borderBottomWidth: 1,
    gap: 10,
  },
  avatarWrap: { position: "relative" },
  avatarImage: { width: 90, height: 90, borderRadius: 45 },
  avatarFallback: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { color: "#fff", fontSize: 32, fontWeight: "800" },
  editAvatarButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
  },
  avatarHint: { fontSize: 12 },
  form: { padding: 20, borderBottomWidth: 1 },
  inputGroup: { marginBottom: 18 },
  label: { fontSize: 13, fontWeight: "600", marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 15 },
  bioInput: { minHeight: 100, paddingTop: 12 },
  charCount: { fontSize: 12, textAlign: "right", marginTop: 4 },
  section: { padding: 20 },
  sectionTitle: { fontSize: 17, fontWeight: "700", marginBottom: 14 },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
    gap: 12,
  },
  actionText: { flex: 1, fontSize: 15 },
});
