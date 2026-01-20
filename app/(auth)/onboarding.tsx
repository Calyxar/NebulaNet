// app/(auth)/onboarding.tsx
import Button from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const interestCategories = [
  {
    id: "tech",
    name: "Technology",
    emoji: "💻",
    interests: ["Programming", "AI", "Gadgets", "Startups", "Web3"],
  },
  {
    id: "creative",
    name: "Creative",
    emoji: "🎨",
    interests: ["Art", "Design", "Photography", "Music", "Writing"],
  },
  {
    id: "lifestyle",
    name: "Lifestyle",
    emoji: "🌟",
    interests: ["Fitness", "Food", "Travel", "Fashion", "Wellness"],
  },
  {
    id: "entertainment",
    name: "Entertainment",
    emoji: "🎭",
    interests: ["Gaming", "Movies", "TV Shows", "Anime", "Podcasts"],
  },
  {
    id: "knowledge",
    name: "Knowledge",
    emoji: "📚",
    interests: ["Science", "Books", "History", "Philosophy", "Learning"],
  },
  {
    id: "social",
    name: "Social",
    emoji: "👥",
    interests: ["Community", "Events", "Networking", "Activism", "Culture"],
  },
];

const popularInterests = [
  "Art",
  "Gaming",
  "Books",
  "Music",
  "Fitness",
  "Food",
  "Travel",
  "Movies & TV",
  "Wellness",
  "Fashion",
  "Environment",
  "Business",
  "Tech",
  "Photography",
  "Events",
  "Podcasts",
  "Startups",
  "Mindfulness",
  "Inspiration",
  "Sports",
  "AI",
  "Crypto",
  "Sustainability",
  "DIY",
  "Parenting",
];

export default function OnboardingScreen() {
  // Remove unused updateProfile - we'll use markOnboardingCompleted instead
  const { user, profile, markOnboardingCompleted } = useAuth();
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);
  const selectedCount = selectedInterests.length;

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest],
    );
  };

  const handleContinue = async () => {
    if (step === 1) {
      if (selectedCount < 3) {
        Alert.alert(
          "Select More Interests",
          "Please select at least 3 interests to personalize your feed.",
          [
            { text: "OK", style: "default" },
            {
              text: "Skip Anyway",
              style: "destructive",
              onPress: () => skipToHome(),
            },
          ],
        );
        return;
      }
      setStep(2);
    } else {
      await handleCompleteOnboarding();
    }
  };

  const handleCompleteOnboarding = async () => {
    setIsLoading(true);
    try {
      // Use the new helper function from useAuth
      const success = await markOnboardingCompleted(selectedInterests);

      if (!success) {
        throw new Error("Failed to save onboarding data");
      }

      // Create user interests in database (optional)
      if (user?.id && selectedInterests.length > 0) {
        try {
          await supabase.from("user_interests").insert(
            selectedInterests.map((interest) => ({
              user_id: user.id,
              interest: interest.toLowerCase(),
              created_at: new Date().toISOString(),
            })),
          );
        } catch (error) {
          console.error("Error saving interests to database:", error);
          // Continue anyway - not critical
        }
      }

      // Clear navigation stack and go to home
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

  const skipToHome = async () => {
    setIsLoading(true);
    try {
      // Use the new helper function with empty interests
      const success = await markOnboardingCompleted([]);

      if (!success) {
        console.warn("Failed to update profile, but continuing to home...");
      }

      // Clear navigation stack and go to home
      router.dismissAll();
      router.replace("/(tabs)/home");
    } catch (error) {
      console.error("Skip error:", error);
      // Force navigation even if update fails
      router.dismissAll();
      router.replace("/(tabs)/home");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    if (step === 2) {
      // If on step 2, just go back to step 1
      setStep(1);
      return;
    }

    if (selectedCount > 0) {
      Alert.alert(
        "Skip Onboarding",
        `You've selected ${selectedCount} interest(s). Would you like to save them or skip completely?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Skip Without Saving",
            style: "destructive",
            onPress: skipToHome,
          },
          {
            text: "Save and Continue",
            onPress: async () => {
              await handleCompleteOnboarding();
            },
          },
        ],
      );
    } else {
      Alert.alert(
        "Skip Onboarding",
        "You can always set up interests later in settings. Your feed will show popular content until then.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Skip Anyway",
            style: "default",
            onPress: skipToHome,
          },
        ],
      );
    }
  };

  const renderStep1 = () => (
    <>
      <View style={styles.header}>
        <Text style={styles.title}>
          Welcome to NebulaNet
          {profile?.full_name ? `, ${profile.full_name}` : ""}! 👋
        </Text>
        <Text style={styles.subtitle}>
          Let&apos;s personalize your feed with content you&apos;ll love
        </Text>
        <View style={styles.counter}>
          <Text style={styles.counterText}>
            {selectedCount} interest{selectedCount !== 1 ? "s" : ""} selected
          </Text>
          <Text style={styles.counterHint}>Select at least 3</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Category-based interests */}
        <Text style={styles.sectionTitle}>Explore by Category</Text>
        <View style={styles.categoriesContainer}>
          {interestCategories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={styles.categoryCard}
              onPress={() => {
                // Add all category interests
                const newInterests = category.interests.filter(
                  (interest) => !selectedInterests.includes(interest),
                );
                if (newInterests.length > 0) {
                  setSelectedInterests([...selectedInterests, ...newInterests]);
                }
              }}
            >
              <Text style={styles.categoryEmoji}>{category.emoji}</Text>
              <Text style={styles.categoryName}>{category.name}</Text>
              <Text style={styles.categoryCount}>
                {category.interests.length} interests
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Popular interests */}
        <Text style={styles.sectionTitle}>Popular Interests</Text>
        <View style={styles.interestsGrid}>
          {popularInterests.map((interest) => (
            <TouchableOpacity
              key={interest}
              style={[
                styles.interestButton,
                selectedInterests.includes(interest) &&
                  styles.interestButtonSelected,
              ]}
              onPress={() => toggleInterest(interest)}
            >
              <Text
                style={[
                  styles.interestText,
                  selectedInterests.includes(interest) &&
                    styles.interestTextSelected,
                ]}
              >
                {interest}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Custom interest note */}
        <View style={styles.customInterestContainer}>
          <Text style={styles.sectionTitle}>Add Your Own</Text>
          <Text style={styles.customInterestHint}>
            💡 You can add custom interests later in Settings → Feed Preferences
          </Text>
        </View>
      </ScrollView>
    </>
  );

  const renderStep2 = () => (
    <>
      <View style={styles.header}>
        <Text style={styles.title}>Almost There! 🚀</Text>
        <Text style={styles.subtitle}>
          Review your selected interests before we continue
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.selectedInterestsContainer}>
          <View style={styles.selectedHeader}>
            <Text style={styles.selectedCount}>
              {selectedCount} interest{selectedCount !== 1 ? "s" : ""} selected
            </Text>
            <TouchableOpacity onPress={() => setStep(1)}>
              <Text style={styles.editButton}>Edit</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.selectedGrid}>
            {selectedInterests.map((interest) => (
              <View key={interest} style={styles.selectedInterest}>
                <Text style={styles.selectedInterestText}>{interest}</Text>
                <TouchableOpacity
                  onPress={() => toggleInterest(interest)}
                  style={styles.removeButton}
                >
                  <Text style={styles.removeButtonText}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>

          <View style={styles.recommendationNote}>
            <Text style={styles.recommendationTitle}>
              Based on your interests, you might like:
            </Text>
            <View style={styles.recommendationList}>
              <Text style={styles.recommendationItem}>
                • Personalized content recommendations
              </Text>
              <Text style={styles.recommendationItem}>
                • Relevant communities and groups
              </Text>
              <Text style={styles.recommendationItem}>
                • Tailored event suggestions
              </Text>
            </View>
          </View>

          <View style={styles.disclaimer}>
            <Text style={styles.disclaimerText}>
              ✨ You can always update your interests in Settings → Feed
              Preferences
            </Text>
          </View>
        </View>
      </ScrollView>
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Close button at top right - instantly skips to home */}
      <TouchableOpacity
        style={styles.closeButton}
        onPress={skipToHome}
        disabled={isLoading}
      >
        <Text style={styles.closeButtonText}>×</Text>
      </TouchableOpacity>

      {step === 1 ? renderStep1() : renderStep2()}

      <View style={styles.footer}>
        <View style={styles.stepIndicator}>
          {[1, 2].map((stepNum) => (
            <View
              key={stepNum}
              style={[styles.stepDot, step === stepNum && styles.stepDotActive]}
            />
          ))}
        </View>

        <Button
          title={
            step === 1
              ? selectedCount >= 3
                ? `Continue with ${selectedCount} interests`
                : `Select ${3 - selectedCount} more to continue`
              : "Complete Setup"
          }
          onPress={handleContinue}
          loading={isLoading}
          style={styles.continueButton}
        />

        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
          disabled={isLoading}
        >
          <Text style={styles.skipButtonText}>
            {step === 1
              ? selectedCount === 0
                ? "Skip setup for now"
                : "Save and skip to app"
              : "Back to edit"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  closeButton: {
    position: "absolute",
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  closeButtonText: {
    fontSize: 24,
    color: "#666666",
    fontWeight: "300",
  },
  header: {
    padding: 24,
    paddingTop: 80,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 8,
    color: "#000000",
  },
  subtitle: {
    fontSize: 16,
    color: "#666666",
    lineHeight: 22,
  },
  counter: {
    marginTop: 20,
  },
  counterText: {
    fontSize: 14,
    color: "#000000",
    fontWeight: "600",
  },
  counterHint: {
    fontSize: 13,
    color: "#999999",
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 16,
    marginTop: 8,
  },
  categoriesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  categoryCard: {
    width: "48%",
    padding: 20,
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: "#F8F8F8",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  categoryEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 4,
  },
  categoryCount: {
    fontSize: 13,
    color: "#666666",
  },
  interestsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  interestButton: {
    width: "48%",
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  interestButtonSelected: {
    backgroundColor: "#000000",
    borderColor: "#000000",
  },
  interestText: {
    fontSize: 16,
    color: "#000000",
    fontWeight: "500",
  },
  interestTextSelected: {
    color: "#ffffff",
    fontWeight: "600",
  },
  customInterestContainer: {
    marginBottom: 24,
  },
  customInterestHint: {
    fontSize: 14,
    color: "#666666",
    lineHeight: 20,
  },
  selectedInterestsContainer: {
    marginBottom: 24,
  },
  selectedHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  selectedCount: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
  },
  editButton: {
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "500",
  },
  selectedGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 24,
  },
  selectedInterest: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#000000",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
  },
  selectedInterestText: {
    fontSize: 14,
    color: "#ffffff",
    fontWeight: "500",
  },
  removeButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  removeButtonText: {
    fontSize: 14,
    color: "#ffffff",
    fontWeight: "600",
    lineHeight: 14,
  },
  recommendationNote: {
    backgroundColor: "#E8F4F8",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  recommendationTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 8,
  },
  recommendationList: {
    marginLeft: 8,
  },
  recommendationItem: {
    fontSize: 13,
    color: "#666666",
    marginBottom: 4,
    lineHeight: 18,
  },
  disclaimer: {
    backgroundColor: "#FFF3E0",
    borderRadius: 12,
    padding: 16,
  },
  disclaimerText: {
    fontSize: 13,
    color: "#666666",
    lineHeight: 18,
  },
  footer: {
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    backgroundColor: "#ffffff",
    gap: 16,
  },
  stepIndicator: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E0E0E0",
  },
  stepDotActive: {
    backgroundColor: "#007AFF",
  },
  continueButton: {
    marginTop: 0,
  },
  skipButton: {
    alignItems: "center",
    padding: 12,
  },
  skipButtonText: {
    fontSize: 16,
    color: "#666666",
    fontWeight: "500",
  },
});
