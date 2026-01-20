// app/settings/index.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type SettingsItem = {
  title: string;
  description: string;
  icon: string;
  route: any; // Use 'any' to bypass strict route type checking
  color?: string;
};

type SettingsSection = {
  title: string;
  items: SettingsItem[];
};

export default function SettingsScreen() {
  const router = useRouter();

  const settingsSections: SettingsSection[] = [
    {
      title: "Account",
      items: [
        {
          title: "Account Center",
          description: "Manage your connected accounts",
          icon: "apps-outline",
          route: "/settings/account-center",
        },
        {
          title: "Edit Profile",
          description: "Update your profile information",
          icon: "person-outline",
          route: "/profile/edit",
        },
        {
          title: "Change Password",
          description: "Update your password",
          icon: "key-outline",
          route: "/settings/change-password",
        },
        {
          title: "Linked Accounts",
          description: "Manage connected social accounts",
          icon: "link-outline",
          route: "/settings/linked-accounts",
        },
      ],
    },
    {
      title: "Privacy & Security",
      items: [
        {
          title: "Privacy",
          description: "Control your privacy settings",
          icon: "lock-closed-outline",
          route: "/settings/privacy",
        },
        {
          title: "Security",
          description: "Security and login settings",
          icon: "shield-checkmark-outline",
          route: "/settings/security",
        },
        {
          title: "Blocked Accounts",
          description: "Manage blocked users",
          icon: "ban-outline",
          route: "/settings/blocked",
        },
        {
          title: "Saved Content",
          description: "View your saved posts",
          icon: "bookmark-outline",
          route: "/settings/saved-content",
        },
      ],
    },
    {
      title: "Preferences",
      items: [
        {
          title: "Notifications",
          description: "Configure notification settings",
          icon: "notifications-outline",
          route: "/settings/notifications",
        },
        {
          title: "Feed Preferences",
          description: "Customize your feed",
          icon: "newspaper-outline",
          route: "/settings/feed-preferences",
        },
        {
          title: "Language",
          description: "App language settings",
          icon: "language-outline",
          route: "/settings/language",
        },
      ],
    },
    {
      title: "Account Actions",
      items: [
        {
          title: "Deactivate Account",
          description: "Temporarily disable your account",
          icon: "pause-circle-outline",
          route: "/settings/deactivate",
          color: "#FF9500",
        },
        {
          title: "Delete Account",
          description: "Permanently delete your account",
          icon: "trash-outline",
          route: "/settings/delete-account",
          color: "#FF3B30",
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {settingsSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionContent}>
              {section.items.map((item, itemIndex) => (
                <TouchableOpacity
                  key={itemIndex}
                  style={styles.item}
                  onPress={() => router.push(item.route)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.itemIconContainer,
                      item.color && { backgroundColor: `${item.color}20` }, // 20 = 12% opacity in hex
                    ]}
                  >
                    <Ionicons
                      name={item.icon as any}
                      size={22}
                      color={item.color || "#007AFF"}
                    />
                  </View>

                  <View style={styles.itemTextContainer}>
                    <Text
                      style={[
                        styles.itemTitle,
                        item.color && { color: item.color },
                      ]}
                    >
                      {item.title}
                    </Text>
                    <Text style={styles.itemDescription}>
                      {item.description}
                    </Text>
                  </View>

                  <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <View style={styles.footer}>
          <Text style={styles.versionText}>NebulaNet v1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F2F7",
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#000000",
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#8E8E93",
    textTransform: "uppercase",
    marginLeft: 16,
    marginBottom: 8,
  },
  sectionContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginHorizontal: 16,
    overflow: "hidden",
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E5EA",
  },
  itemIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(0, 122, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  itemTextContainer: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    color: "#000000",
    marginBottom: 2,
  },
  itemDescription: {
    fontSize: 14,
    color: "#8E8E93",
  },
  footer: {
    alignItems: "center",
    paddingVertical: 24,
  },
  versionText: {
    fontSize: 14,
    color: "#8E8E93",
  },
});
