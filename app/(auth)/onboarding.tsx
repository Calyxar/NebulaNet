// app/(auth)/onboarding.tsx — COMPLETED + UPDATED ✅
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import { useTheme } from "@/providers/ThemeProvider";
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
  const { colors, isDark } = useTheme();
  const { height: SCREEN_HEIGHT } = useWindowDimensions();
  const isShort = SCREEN_HEIGHT < 700;

  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const maxSelections = 20;
  const selectedCount = selectedInterests.length;
  const progress = useMemo(
    () => (selectedCount / maxSelections) * 100,
    [selectedCount],
  );

  useEffect(() => {
    if (
      !user?.uid ||
      isLoading ||
      isUserSettingsLoading ||
      !hasCompletedOnboarding
    )
      return;
    router.replace("/(tabs)/home");
  }, [user?.uid, isLoading, isUserSettingsLoading, hasCompletedOnboarding]);

  const toggleInterest = (id: string) => {
    if (saving) return;
    setSelectedInterests((prev) =>
      prev.includes(id)
        ? prev.filter((i) => i !== id)
        : prev.length < maxSelections
          ? [...prev, id]
          : prev,
    );
  };

  const goHome = () => router.replace("/(tabs)/home");

  const handleSkip = async () => {
    if (saving || !user?.uid) return;
    setSaving(true);
    try {
      await saveUserInterests(user.uid, []);
      await skipOnboarding();
      goHome();
    } catch (e: any) {
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
    if (!user?.uid) {
      Alert.alert("Authentication Required", "Please sign in to continue.");
      return;
    }
    setSaving(true);
    try {
      await saveUserInterests(user.uid, selectedInterests);
      await completeOnboarding();
      goHome();
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to save preferences.", [
        { text: "Go to Home", onPress: goHome },
      ]);
    } finally {
      setSaving(false);
    }
  };

  const busy = saving || isLoading || isUserSettingsLoading;

  return (
    <>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View
          style={[
            styles.header,
            { paddingTop: isShort ? 12 : 20, paddingBottom: isShort ? 10 : 16 },
          ]}
        >
          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: colors.text }]}>
              Select Your Interest
            </Text>
            <TouchableOpacity
              onPress={handleSkip}
              disabled={busy}
              activeOpacity={0.8}
            >
              <Text style={[styles.skipText, { color: colors.primary }]}>
                {busy ? "..." : "Skip"}
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Select more interests to refine your experience.
          </Text>
        </View>

        <View
          style={[
            styles.progressContainer,
            { marginBottom: isShort ? 14 : 24 },
          ]}
        >
          <Text style={[styles.progressText, { color: colors.text }]}>
            {selectedCount}/{maxSelections}
          </Text>
          <View
            style={[
              styles.progressBarContainer,
              { backgroundColor: colors.inputBackground },
            ]}
          >
            <View
              style={[
                styles.progressBar,
                { width: `${progress}%`, backgroundColor: colors.primary },
              ]}
            />
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
                      backgroundColor: colors.card,
                    },
                    isSelected && { backgroundColor: colors.primary },
                  ]}
                  onPress={() => toggleInterest(interest.id)}
                  activeOpacity={0.7}
                  disabled={busy}
                >
                  <Text style={styles.interestEmoji}>{interest.emoji}</Text>
                  <Text
                    style={[
                      styles.interestText,
                      { color: colors.text },
                      isSelected && { color: "#fff", fontWeight: "600" },
                    ]}
                  >
                    {interest.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        <View style={[styles.footer, { backgroundColor: colors.background }]}>
          <TouchableOpacity
            style={[
              styles.continueButton,
              { backgroundColor: colors.primary },
              (selectedCount === 0 || busy) && {
                backgroundColor: colors.border,
              },
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
  container: { flex: 1 },
  header: { paddingHorizontal: 24 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 8 },
  subtitle: { fontSize: 15, lineHeight: 22 },
  skipText: { fontSize: 15, fontWeight: "700" },
  progressContainer: { paddingHorizontal: 24 },
  progressText: { fontSize: 16, fontWeight: "600", marginBottom: 8 },
  progressBarContainer: { height: 8, borderRadius: 4, overflow: "hidden" },
  progressBar: { height: "100%", borderRadius: 4 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 24 },
  interestsGrid: { flexDirection: "row", flexWrap: "wrap" },
  interestButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  interestEmoji: { fontSize: 18 },
  interestText: { fontSize: 15, fontWeight: "500" },
  footer: { paddingHorizontal: 24, paddingVertical: 20 },
  continueButton: {
    paddingVertical: 18,
    borderRadius: 28,
    alignItems: "center",
  },
  continueButtonText: { color: "#FFFFFF", fontSize: 17, fontWeight: "600" },
});
