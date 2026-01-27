// app/settings/index.tsx
import { Ionicons } from "@expo/vector-icons";
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
    route: "./account-center",
  },
  {
    id: "feed-preferences",
    title: "Feed Preferences",
    icon: "grid-outline",
    route: "./feed-preferences",
  },
  {
    id: "saved-content",
    title: "Saved & Hidden Content",
    icon: "bookmark-outline",
    route: "./saved-content",
  },
  {
    id: "language",
    title: "Language & Region",
    icon: "globe-outline",
    route: "./language",
  },
];

const securityOptions: SettingsOption[] = [
  {
    id: "privacy",
    title: "Privacy & Visibility",
    icon: "eye-off-outline",
    route: "./privacy",
  },
  {
    id: "blocked",
    title: "Blocked & Muted Accounts",
    icon: "ban-outline",
    route: "./blocked",
  },
  {
    id: "notifications",
    title: "Community Notifications",
    icon: "notifications-outline",
    route: "./notifications",
  },
  {
    id: "security",
    title: "Security & Login",
    icon: "lock-closed-outline",
    route: "./security",
  },
  {
    id: "linked-accounts",
    title: "Linked Accounts",
    icon: "link-outline",
    route: "./linked-accounts",
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
    >
      <View style={styles.optionLeft}>
        <View style={styles.iconContainer}>
          <Ionicons name={option.icon} size={20} color="#666" />
        </View>
        <Text style={styles.optionTitle}>{option.title}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#999" />
    </TouchableOpacity>
  );

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#E8EAF6" />
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
          <TouchableOpacity style={styles.menuButton}>
            <Ionicons name="ellipsis-horizontal" size={24} color="#000" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Personalization & Preferences Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Personalization & Preferences
            </Text>
            <View style={styles.settingsCard}>
              {personalizationOptions.map((option, index) => (
                <View key={option.id}>
                  {renderSettingsOption(option)}
                  {index < personalizationOptions.length - 1 && (
                    <View style={styles.divider} />
                  )}
                </View>
              ))}
            </View>
          </View>

          {/* Account & Security Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account & Security</Text>
            <View style={styles.settingsCard}>
              {securityOptions.map((option, index) => (
                <View key={option.id}>
                  {renderSettingsOption(option)}
                  {index < securityOptions.length - 1 && (
                    <View style={styles.divider} />
                  )}
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E8EAF6",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#E8EAF6",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  settingsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
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
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: "500",
    color: "#000",
  },
  divider: {
    height: 1,
    backgroundColor: "#F0F0F0",
    marginLeft: 60,
  },
});
