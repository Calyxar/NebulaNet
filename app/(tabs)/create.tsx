// app/(tabs)/create.tsx - FIXED
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

interface CreateOption {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  color: string;
}

const createOptions: CreateOption[] = [
  {
    id: "post",
    title: "Create Post",
    description: "Share your thoughts with text, images, or videos",
    icon: "document-text-outline",
    route: "/create/post",
    color: "#7C3AED",
  },
  {
    id: "story",
    title: "Add Story",
    description: "Share a moment that disappears after 24 hours",
    icon: "flash-outline",
    route: "/create/story",
    color: "#EC4899",
  },
  {
    id: "media",
    title: "Upload Media",
    description: "Share photos, videos, or audio files",
    icon: "images-outline",
    route: "/create/media",
    color: "#10B981",
  },
  {
    id: "poll",
    title: "Create Poll",
    description: "Ask your community a question with multiple choices",
    icon: "bar-chart-outline",
    route: "/create/poll",
    color: "#F59E0B",
  },
  {
    id: "event",
    title: "Create Event",
    description: "Organize a meetup or virtual gathering",
    icon: "calendar-outline",
    route: "/create/event",
    color: "#3B82F6",
  },
];

export default function CreateScreen() {
  const handleOptionPress = (route: string) => {
    router.push(route as any);
  };

  const handleClose = () => {
    router.back();
  };

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <SafeAreaView style={styles.container}>
        {/* Header - Single, Clean */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Create Options */}
          {createOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={styles.optionCard}
              onPress={() => handleOptionPress(option.route)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.optionIconContainer,
                  { backgroundColor: `${option.color}15` },
                ]}
              >
                <Ionicons name={option.icon} size={28} color={option.color} />
              </View>

              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>{option.title}</Text>
                <Text style={styles.optionDescription}>
                  {option.description}
                </Text>
              </View>

              <Ionicons name="chevron-forward" size={24} color="#C5CAE9" />
            </TouchableOpacity>
          ))}

          {/* Quick Actions */}
          <View style={styles.quickActionsContainer}>
            <Text style={styles.quickActionsTitle}>Quick Actions</Text>

            <View style={styles.quickActionsGrid}>
              <TouchableOpacity
                style={styles.quickActionCard}
                onPress={() => router.push("/create/post")}
              >
                <View style={styles.quickActionIcon}>
                  <Ionicons name="add" size={24} color="#7C3AED" />
                </View>
                <Text style={styles.quickActionText}>Quick Post</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionCard}
                onPress={() => router.push("/create/story")}
              >
                <View style={styles.quickActionIcon}>
                  <Ionicons name="camera" size={24} color="#EC4899" />
                </View>
                <Text style={styles.quickActionText}>Take Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionCard}
                onPress={() => router.push("/create/media")}
              >
                <View style={styles.quickActionIcon}>
                  <Ionicons name="videocam" size={24} color="#10B981" />
                </View>
                <Text style={styles.quickActionText}>Record Video</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Tips */}
          <View style={styles.tipsContainer}>
            <View style={styles.tipCard}>
              <Ionicons name="bulb-outline" size={24} color="#F59E0B" />
              <View style={styles.tipContent}>
                <Text style={styles.tipTitle}>Pro Tip</Text>
                <Text style={styles.tipText}>
                  Posts with images get 2.3x more engagement than text-only
                  posts
                </Text>
              </View>
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
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  closeButton: {
    padding: 4,
    width: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  optionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#000",
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  quickActionsContainer: {
    marginTop: 32,
    marginBottom: 24,
  },
  quickActionsTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#000",
    marginBottom: 16,
  },
  quickActionsGrid: {
    flexDirection: "row",
    gap: 12,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: "#F8F8F8",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#000",
    textAlign: "center",
  },
  tipsContainer: {
    marginTop: 8,
  },
  tipCard: {
    flexDirection: "row",
    backgroundColor: "#FFFBEB",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#FEF3C7",
  },
  tipContent: {
    flex: 1,
    marginLeft: 12,
  },
  tipTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#92400E",
    marginBottom: 4,
  },
  tipText: {
    fontSize: 14,
    color: "#78350F",
    lineHeight: 20,
  },
});
