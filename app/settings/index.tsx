// app/settings/index.tsx
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface SettingsOption {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
}

const personalizationOptions: SettingsOption[] = [
  {
    id: "account-center",
    title: "Account Center",
    icon: "person-outline",
    route: "account-center",
  },
  {
    id: "feed-preferences",
    title: "Feed Preferences",
    icon: "grid-outline",
    route: "feed-preferences",
  },
  {
    id: "saved-content",
    title: "Saved & Hidden Content",
    icon: "bookmark-outline",
    route: "saved-content",
  },
  {
    id: "language",
    title: "Language & Region",
    icon: "globe-outline",
    route: "language",
  },
];

const securityOptions: SettingsOption[] = [
  {
    id: "privacy",
    title: "Privacy & Visibility",
    icon: "eye-off-outline",
    route: "privacy",
  },
  {
    id: "blocked",
    title: "Blocked & Muted Accounts",
    icon: "ban-outline",
    route: "blocked",
  },
  {
    id: "notifications",
    title: "Community Notifications",
    icon: "notifications-outline",
    route: "notifications",
  },
  {
    id: "security",
    title: "Security & Login",
    icon: "lock-closed-outline",
    route: "security",
  },
  {
    id: "linked-accounts",
    title: "Linked Accounts",
    icon: "link-outline",
    route: "linked-accounts",
  },
];

export default function SettingsScreen() {
  const handleNavigate = (route: string) => {
    router.push(route as any);
  };

  const renderSettingsOption = (option: SettingsOption) => (
    <TouchableOpacity
      key={option.id}
      style={styles.settingsOption}
      onPress={() => handleNavigate(option.route)}
      activeOpacity={0.75}
    >
      <View style={styles.optionLeft}>
        <View style={styles.iconCircle}>
          <Ionicons name={option.icon} size={18} color="#7C3AED" />
        </View>
        <Text style={styles.optionTitle}>{option.title}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
    </TouchableOpacity>
  );

  return (
    <>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />

      {/* Gradient background like the design */}
      <LinearGradient
        colors={["#DCEBFF", "#EEF4FF", "#FFFFFF"]}
        locations={[0, 0.45, 1]}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.container}>
          {/* Header: floating circular buttons + centered title */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.headerCircleButton}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={22} color="#111827" />
            </TouchableOpacity>

            <Text style={styles.headerTitle}>Settings</Text>

            <TouchableOpacity
              style={styles.headerCircleButton}
              onPress={() => {}}
              activeOpacity={0.8}
            >
              <Ionicons name="ellipsis-horizontal" size={22} color="#111827" />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Personalization & Preferences */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Personalization & Preferences
              </Text>

              <View style={styles.card}>
                {personalizationOptions.map((option, idx) => (
                  <View key={option.id}>
                    {renderSettingsOption(option)}
                    {idx < personalizationOptions.length - 1 && (
                      <View style={styles.divider} />
                    )}
                  </View>
                ))}
              </View>
            </View>

            {/* Account & Security */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Account & Security</Text>

              <View style={styles.card}>
                {securityOptions.map((option, idx) => (
                  <View key={option.id}>
                    {renderSettingsOption(option)}
                    {idx < securityOptions.length - 1 && (
                      <View style={styles.divider} />
                    )}
                  </View>
                ))}
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  headerCircleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",

    // subtle shadow like the mock
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },

  scrollContent: {
    paddingHorizontal: 18,
    paddingBottom: 28,
  },

  section: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 10,
    paddingHorizontal: 4,
  },

  // big soft card
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    overflow: "hidden",

    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 2,
  },

  settingsOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  optionLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },

  // outlined icon circle (key detail from design)
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#D6D9FF",
    alignItems: "center",
    justifyContent: "center",
  },

  optionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },

  // inset divider like the mock (starts after icon)
  divider: {
    height: 1,
    backgroundColor: "#EEF2FF",
    marginLeft: 64,
  },
});
