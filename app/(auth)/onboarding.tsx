// app/(auth)/onboarding.tsx
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const interests = [
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
  const { user, markOnboardingCompleted } = useAuth();
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const maxSelections = 20;
  const selectedCount = selectedInterests.length;
  const progress = (selectedCount / maxSelections) * 100;

  const toggleInterest = (interestId: string) => {
    setSelectedInterests((prev) => {
      if (prev.includes(interestId)) {
        return prev.filter((id) => id !== interestId);
      } else if (prev.length < maxSelections) {
        return [...prev, interestId];
      }
      return prev;
    });
  };

  const handleContinue = async () => {
    if (selectedCount === 0) {
      Alert.alert(
        "Select Interests",
        "Please select at least one interest to continue.",
      );
      return;
    }

    setIsLoading(true);
    try {
      const success = await markOnboardingCompleted(selectedInterests);

      if (!success) {
        throw new Error("Failed to save onboarding data");
      }

      // Save interests to database
      if (user?.id && selectedInterests.length > 0) {
        try {
          await supabase.from("user_interests").insert(
            selectedInterests.map((interestId) => ({
              user_id: user.id,
              interest: interestId,
              created_at: new Date().toISOString(),
            })),
          );
        } catch (error) {
          console.error("Error saving interests:", error);
        }
      }

      router.dismissAll();
      router.replace("/(tabs)/home");
    } catch (error: any) {
      console.error("Onboarding error:", error);
      Alert.alert(
        "Error",
        "Failed to save your preferences. You can update them later in settings.",
        [
          {
            text: "Go to Home",
            onPress: () => {
              router.dismissAll();
              router.replace("/(tabs)/home");
            },
          },
        ],
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
        <View style={styles.header}>
          <Text style={styles.title}>Select Your Interest</Text>
          <Text style={styles.subtitle}>
            Select more interests to refine your experience.
          </Text>
        </View>

        {/* Progress Counter */}
        <View style={styles.progressContainer}>
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
          <View style={styles.interestsGrid}>
            {interests.map((interest) => {
              const isSelected = selectedInterests.includes(interest.id);
              return (
                <TouchableOpacity
                  key={interest.id}
                  style={[
                    styles.interestButton,
                    isSelected && styles.interestButtonSelected,
                  ]}
                  onPress={() => toggleInterest(interest.id)}
                  activeOpacity={0.7}
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

        {/* Continue Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.continueButton,
              selectedCount === 0 && styles.continueButtonDisabled,
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
  container: {
    flex: 1,
    backgroundColor: "#E8EAF6",
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#000",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: "#9FA8DA",
    lineHeight: 22,
  },
  progressContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
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
  progressBar: {
    height: "100%",
    backgroundColor: "#7C3AED",
    borderRadius: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  interestsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  interestButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  interestButtonSelected: {
    backgroundColor: "#7C3AED",
  },
  interestEmoji: {
    fontSize: 18,
  },
  interestText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#000",
  },
  interestTextSelected: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
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
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  continueButtonDisabled: {
    backgroundColor: "#C5CAE9",
    shadowOpacity: 0,
    elevation: 0,
  },
  continueButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
  },
});
