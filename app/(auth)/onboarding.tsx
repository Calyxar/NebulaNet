// app/(auth)/onboarding.tsx — COMPLETED + UPDATED ✅
// ✅ Uses AuthProvider: completeOnboarding() + skipOnboarding()
// ✅ Saves interests to /user_interests/{uid}
// ✅ Works with your Firestore rules
// ✅ Fixes old missing function names: markOnboardingCompleted -> completeOnboarding/skipOnboarding

import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import { router } from "expo-router";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
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

const nowIso = () => new Date().toISOString();

async function saveUserInterests(uid: string, interests: string[]) {
  // Firestore rules: match /user_interests/{userId} allow read,write if isSelf(userId)
  await setDoc(
    doc(db, "user_interests", uid),
    {
      user_id: uid,
      interests,
      updated_at: nowIso(),
      updated_at_ts: serverTimestamp(),
    },
    { merge: true },
  );
}

export default function OnboardingScreen() {
  const {
    user,
    hasCompletedOnboarding,
    completeOnboarding,
    skipOnboarding,
    isLoading,
    isUserSettingsLoading,
  } = useAuth();

  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const maxSelections = 20;
  const selectedCount = selectedInterests.length;

  const progress = useMemo(
    () => (selectedCount / maxSelections) * 100,
    [selectedCount],
  );

  const { height: SCREEN_HEIGHT } = useWindowDimensions();
  const isShort = SCREEN_HEIGHT < 700;

  // ✅ If already completed (or skipped), leave onboarding safely
  useEffect(() => {
    if (!user?.uid) return;
    if (isLoading || isUserSettingsLoading) return;
    if (!hasCompletedOnboarding) return;
    router.replace("/(tabs)/home");
  }, [user?.uid, isLoading, isUserSettingsLoading, hasCompletedOnboarding]);

  const toggleInterest = (interestId: string) => {
    if (saving) return;

    setSelectedInterests((prev) => {
      if (prev.includes(interestId))
        return prev.filter((id) => id !== interestId);
      if (prev.length < maxSelections) return [...prev, interestId];
      return prev;
    });
  };

  const requireAuthOrSendToLogin = () => {
    if (user?.uid) return true;

    Alert.alert(
      "Authentication Required",
      "Please sign in or sign up to continue.",
      [{ text: "OK", onPress: () => router.replace("/(auth)/login") }],
    );

    return false;
  };

  const goHome = () => router.replace("/(tabs)/home");

  const handleSkip = async () => {
    if (saving) return;
    if (!requireAuthOrSendToLogin()) return;

    setSaving(true);
    try {
      // optional: store empty interests (or omit entirely)
      await saveUserInterests(user!.uid, []);
      await skipOnboarding(); // ✅ sets onboarding_skipped=true
      goHome();
    } catch (e: any) {
      console.error("Onboarding skip error:", e);
      Alert.alert("Error", e?.message || "Failed to skip onboarding.");
      goHome();
    } finally {
      setSaving(false);
    }
  };

  const handleContinue = async () => {
    if (saving) return;

    if (selectedCount === 0) {
      Alert.alert("Select Interests", "Please select at least one interest.");
      return;
    }

    if (!requireAuthOrSendToLogin()) return;

    setSaving(true);
    try {
      await saveUserInterests(user!.uid, selectedInterests);
      await completeOnboarding(); // ✅ sets onboarding_completed=true
      goHome();
    } catch (error: any) {
      console.error("Onboarding error:", error);
      Alert.alert(
        "Error",
        error?.message ||
          "Failed to save your preferences. You can update them later in settings.",
        [{ text: "Go to Home", onPress: goHome }],
      );
    } finally {
      setSaving(false);
    }
  };

  const busy = saving || isLoading || isUserSettingsLoading;

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#E8EAF6" />
      <SafeAreaView style={styles.container}>
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
              disabled={busy}
              activeOpacity={0.8}
            >
              <Text style={styles.skipText}>{busy ? "..." : "Skip"}</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            Select more interests to refine your experience.
          </Text>
        </View>

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
                  disabled={busy}
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

        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.continueButton,
              (selectedCount === 0 || busy) && styles.continueButtonDisabled,
            ]}
            onPress={handleContinue}
            disabled={selectedCount === 0 || busy}
            activeOpacity={0.9}
          >
            <Text style={styles.continueButtonText}>
              {busy ? "Loading..." : "Continue"}
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
