// app/(auth)/onboarding.tsx — UPDATED ✅
// ✅ FIXED: removed redirect-away useEffect — _layout.tsx handles routing now
// ✅ FIXED: skip button works immediately and goes to home
// ✅ FIXED: crash-safe null guards on user
// ✅ FIXED: onboarding always shows for new users

import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import { useTheme } from "@/providers/ThemeProvider";
import firestore from "@react-native-firebase/firestore";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
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
  await db.collection("user_interests").doc(uid).set(
    {
      user_id: uid,
      interests,
      updated_at: nowIso(),
      updated_at_ts: firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

export default function OnboardingScreen() {
  const { user, completeOnboarding, skipOnboarding } = useAuth();
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

  const goHome = () => router.replace("/(tabs)/home");

  // ✅ FIXED: skip immediately completes onboarding and goes home
  const handleSkip = async () => {
    if (saving) return;
    setSaving(true);
    try {
      if (user?.uid) {
        await saveUserInterests(user.uid, []);
      }
      await skipOnboarding();
    } catch {
      // Even if saving fails, still complete onboarding
      try {
        await skipOnboarding();
      } catch {}
    } finally {
      setSaving(false);
      goHome();
    }
  };

  const handleContinue = async () => {
    if (saving) return;
    if (selectedCount === 0) {
      Alert.alert(
        "Select Interests",
        "Please select at least one interest, or tap Skip.",
      );
      return;
    }
    if (!user?.uid) {
      goHome();
      return;
    }
    setSaving(true);
    try {
      await saveUserInterests(user.uid, selectedInterests);
      await completeOnboarding();
    } catch {
      try {
        await completeOnboarding();
      } catch {}
    } finally {
      setSaving(false);
      goHome();
    }
  };

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
              Select Your Interests
            </Text>
            <TouchableOpacity
              onPress={handleSkip}
              disabled={saving}
              activeOpacity={0.8}
            >
              <Text style={[styles.skipText, { color: colors.primary }]}>
                {saving ? "..." : "Skip"}
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Pick what you're into — your feed will reflect it. You can change
            this anytime.
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
              { backgroundColor: colors.border },
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
                      backgroundColor: isSelected
                        ? colors.primary
                        : colors.card,
                    },
                  ]}
                  onPress={() => toggleInterest(interest.id)}
                  activeOpacity={0.7}
                  disabled={saving}
                >
                  <Text style={styles.interestEmoji}>{interest.emoji}</Text>
                  <Text
                    style={[
                      styles.interestText,
                      { color: isSelected ? "#fff" : colors.text },
                      isSelected && { fontWeight: "600" },
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
              {
                backgroundColor:
                  selectedCount === 0 || saving
                    ? colors.border
                    : colors.primary,
              },
            ]}
            onPress={handleContinue}
            disabled={selectedCount === 0 || saving}
            activeOpacity={0.9}
          >
            <Text style={styles.continueButtonText}>
              {saving ? "Saving..." : "Continue"}
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
  title: { fontSize: 26, fontWeight: "700", marginBottom: 8, flex: 1 },
  subtitle: { fontSize: 14, lineHeight: 20 },
  skipText: { fontSize: 15, fontWeight: "700", paddingLeft: 16 },
  progressContainer: { paddingHorizontal: 24 },
  progressText: { fontSize: 14, fontWeight: "600", marginBottom: 8 },
  progressBarContainer: { height: 6, borderRadius: 3, overflow: "hidden" },
  progressBar: { height: "100%", borderRadius: 3 },
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
