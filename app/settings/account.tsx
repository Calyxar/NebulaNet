// app/settings/account-settings.tsx — UPDATED ✅ dark mode + real auth data
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
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

export default function AccountSettingsScreen() {
  const { colors, isDark } = useTheme();
  const { profile } = useAuth();

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");

  useEffect(() => {
    if (profile) {
      setName(profile.full_name || "");
      setUsername(profile.username || "");
      setLocation((profile as any).location || "");
      setBio(profile.bio || "");
    }
  }, [profile]);

  const handleSave = () => {
    Alert.alert(
      "Save",
      "To update your profile, use Edit Profile on the Profile tab.",
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
        <TouchableOpacity onPress={handleSave}>
          <Text style={[styles.saveButton, { color: colors.primary }]}>
            Save
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Avatar */}
        <View
          style={[styles.avatarSection, { borderBottomColor: colors.border }]}
        >
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>
              {(name || username || "U")[0].toUpperCase()}
            </Text>
            <TouchableOpacity
              style={[
                styles.editAvatarButton,
                { backgroundColor: colors.primary, borderColor: colors.card },
              ]}
            >
              <Ionicons name="camera" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
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
              maxLength={150}
            />
            <Text style={[styles.charCount, { color: colors.textTertiary }]}>
              {bio.length}/150
            </Text>
          </View>
        </View>

        {/* Account actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Account Actions
          </Text>
          {[
            { icon: "mail-outline", label: "Change Email" },
            { icon: "key-outline", label: "Change Password" },
            { icon: "phone-portrait-outline", label: "Phone Number" },
          ].map(({ icon, label }, idx, arr) => (
            <TouchableOpacity
              key={label}
              style={[
                styles.actionButton,
                { borderBottomColor: colors.border },
                idx === arr.length - 1 && { borderBottomWidth: 0 },
              ]}
              onPress={() => Alert.alert(label, "Coming soon.")}
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
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
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

  form: { padding: 20, borderBottomWidth: 1 },
  inputGroup: { marginBottom: 18 },
  label: { fontSize: 13, fontWeight: "600", marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
  },
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
