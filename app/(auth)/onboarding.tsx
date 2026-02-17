// app/(auth)/onboarding.tsx — COMPLETED + UPDATED ✅
// Fixes included:
// ✅ No POP_TO_TOP warning (no dismissAll / popToTop)
// ✅ Redirect only when logged in + completed
// ✅ Prevents double-tap Skip/Continue
// ✅ Skip + Continue both consistent + safe

import { useAuth } from "@/hooks/useAuth";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const INTERESTS = [
  { id: "art", name: "Art", emoji: "🎨" },
  { id: "gaming", name: "Gaming", emoji: "🎮" },
  { id: "books", name: "Books", emoji: "📚" },
  { id: "music", name: "Music", emoji: "🎵" },
  { id: "fitness", name: "Fitness", emoji: "🔥" },
  { id: "food", name: "Food", emoji: "🍔" },
  { id: "travel", name: "Travel", emoji: "✈️" },
  { id: "movies", name: "Movies & TV", emoji: "🎬" },
  { id: "wellness", name: "Wellness", emoji: "💆" },
  { id: "fashion", name: "Fashion", emoji: "👗" },
  { id: "environment", name: "Environment", emoji: "🌍" },
  { id: "business", name: "Business", emoji: "💼" },
  { id: "tech", name: "Tech", emoji: "📱" },
  { id: "photography", name: "Photography", emoji: "📷" },
  { id: "events", name: "Events", emoji: "🧸" },
  { id: "podcasts", name: "Podcasts", emoji: "🎙️" },
  { id: "startups", name: "Startups", emoji: "📈" },
  { id: "mindfulness", name: "Mindfulness", emoji: "🧘" },
  { id: "inspiration", name: "Inspiration", emoji: "💡" },
  { id: "sports", name: "Sports", emoji: "🏀" },
];

export default function OnboardingScreen() {
  const { user, hasCompletedOnboarding, markOnboardingCompleted } = useAuth();

  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const maxSelections = 20;
  const selectedCount = selectedInterests.length;

  const progress = useMemo(
    () => (selectedCount / maxSelections) * 100,
    [selectedCount],
  );

  const { height: SCREEN_HEIGHT } = useWindowDimensions();
  const isShort = SCREEN_HEIGHT < 700;

  // ✅ If already completed, exit onboarding safely (only when logged in)
  useEffect(() => {
    if (!user?.id) return;
    if (!hasCompletedOnboarding) return;

    router.replace("/(tabs)/home");
     
  }, [user?.id, hasCompletedOnboarding]);

  const toggleInterest = (interestId: string) => {
    if (isLoading) return;

    setSelectedInterests((prev) => {
      if (prev.includes(interestId))
        return prev.filter((id) => id !== interestId);
      if (prev.length < maxSelections) return [...prev, interestId];
      return prev;
    });
  };

  const requireAuthOrSendToLogin = () => {
    if (user?.id) return true;

    Alert.alert(
      "Authentication Required",
      "Please sign in or sign up to continue.",
      [
        {
          text: "OK",
          onPress: () => router.replace("/(auth)/login"),
        },
      ],
    );

    return false;
  };

  const goHome = () => router.replace("/(tabs)/home");

  const handleSkip = async () => {
    if (isLoading) return;
    if (!requireAuthOrSendToLogin()) return;

    setIsLoading(true);
    try {
      await markOnboardingCompleted([]); // mark complete, no interests
    } catch (e) {
      console.error("Onboarding skip error:", e);
      // still proceed so user isn't stuck
    } finally {
      setIsLoading(false);
      goHome();
    }
  };

  const handleContinue = async () => {
    if (isLoading) return;

    if (selectedCount === 0) {
      Alert.alert(
        "Select Interests",
        "Please select at least one interest to continue.",
      );
      return;
    }

    if (!requireAuthOrSendToLogin()) return;

    setIsLoading(true);
    try {
      await markOnboardingCompleted(selectedInterests);
      goHome();
    } catch (error) {
      console.error("Onboarding error:", error);
      Alert.alert(
        "Error",
        "Failed to save your preferences. You can update them later in settings.",
        [{ text: "Go to Home", onPress: goHome }],
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#E8EAF6" />
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View
          style={[
            styles.header,
            { paddingTop: isShort ? 12 : 20, paddingBottom: isShort ? 10 : 16 },
          ]}
        >
          <View style={styles.headerRow}>
            <Text style={styles.title}>Select Your Interest</Text>

            <TouchableOpacity
              onPress={handleSkip}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <Text style={styles.skipText}>{isLoading ? "..." : "Skip"}</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            Select more interests to refine your experience.
          </Text>
        </View>

        {/* Progress */}
        <View
          style={[
            styles.progressContainer,
            { marginBottom: isShort ? 14 : 24 },
          ]}
        >
          <Text style={styles.progressText}>
            {selectedCount}/{maxSelections}
          </Text>

          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: `${progress}%` }]} />
          </View>
        </View>

        {/* Interests Grid */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.interestsGrid, { gap: isShort ? 10 : 12 }]}>
            {INTERESTS.map((interest) => {
              const isSelected = selectedInterests.includes(interest.id);
              return (
                <TouchableOpacity
                  key={interest.id}
                  style={[
                    styles.interestButton,
                    {
                      paddingHorizontal: isShort ? 14 : 16,
                      paddingVertical: isShort ? 10 : 12,
                      borderRadius: isShort ? 22 : 24,
                    },
                    isSelected && styles.interestButtonSelected,
                  ]}
                  onPress={() => toggleInterest(interest.id)}
                  activeOpacity={0.7}
                  disabled={isLoading}
                >
                  <Text style={styles.interestEmoji}>{interest.emoji}</Text>
                  <Text
                    style={[
                      styles.interestText,
                      isSelected && styles.interestTextSelected,
                    ]}
                  >
                    {interest.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* Continue */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.continueButton,
              (selectedCount === 0 || isLoading) &&
                styles.continueButtonDisabled,
            ]}
            onPress={handleContinue}
            disabled={selectedCount === 0 || isLoading}
            activeOpacity={0.9}
          >
            <Text style={styles.continueButtonText}>
              {isLoading ? "Loading..." : "Continue"}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#E8EAF6" },

  header: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { fontSize: 28, fontWeight: "700", color: "#000", marginBottom: 8 },
  subtitle: { fontSize: 15, color: "#9FA8DA", lineHeight: 22 },

  skipText: { fontSize: 15, fontWeight: "700", color: "#7C3AED" },

  progressContainer: { paddingHorizontal: 24, marginBottom: 24 },
  progressText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 8,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: "#D1D5F0",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBar: { height: "100%", backgroundColor: "#7C3AED", borderRadius: 4 },

  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 24 },

  interestsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  interestButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  interestButtonSelected: { backgroundColor: "#7C3AED" },
  interestEmoji: { fontSize: 18 },
  interestText: { fontSize: 15, fontWeight: "500", color: "#000" },
  interestTextSelected: { color: "#FFFFFF", fontWeight: "600" },

  footer: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: "#E8EAF6",
  },
  continueButton: {
    backgroundColor: "#7C3AED",
    paddingVertical: 18,
    borderRadius: 28,
    alignItems: "center",
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  continueButtonDisabled: {
    backgroundColor: "#C5CAE9",
    shadowOpacity: 0,
    elevation: 0,
  },
  continueButtonText: { color: "#FFFFFF", fontSize: 17, fontWeight: "600" },
});
