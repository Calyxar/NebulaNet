// app/(auth)/onboarding.tsx — ✅ FIXED: 4-step onboarding flow
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import firestore from "@react-native-firebase/firestore";
import storage from "@react-native-firebase/storage";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width: SCREEN_W } = Dimensions.get("window");

const INTERESTS = [
  { id: "art", name: "Art", emoji: "🎨" },
  { id: "gaming", name: "Gaming", emoji: "🎮" },
  { id: "books", name: "Books", emoji: "📚" },
  { id: "music", name: "Music", emoji: "🎵" },
  { id: "fitness", name: "Fitness", emoji: "💪" },
  { id: "food", name: "Food", emoji: "🍔" },
  { id: "travel", name: "Travel", emoji: "✈️" },
  { id: "movies", name: "Movies & TV", emoji: "🎬" },
  { id: "wellness", name: "Wellness", emoji: "💆" },
  { id: "fashion", name: "Fashion", emoji: "👗" },
  { id: "environment", name: "Environment", emoji: "🌍" },
  { id: "business", name: "Business", emoji: "💼" },
  { id: "tech", name: "Tech", emoji: "📱" },
  { id: "photography", name: "Photography", emoji: "📷" },
  { id: "events", name: "Events", emoji: "🎉" },
  { id: "podcasts", name: "Podcasts", emoji: "🎙️" },
  { id: "startups", name: "Startups", emoji: "🚀" },
  { id: "mindfulness", name: "Mindfulness", emoji: "🧘" },
  { id: "inspiration", name: "Inspiration", emoji: "💡" },
  { id: "sports", name: "Sports", emoji: "🏀" },
];

const STEPS = [
  "welcome",
  "avatar",
  "username",
  "interests",
  "congrats",
] as const;
type Step = (typeof STEPS)[number];

const nowIso = () => new Date().toISOString();

async function checkUsernameAvailable(
  username: string,
  uid: string,
): Promise<boolean> {
  const lc = username.toLowerCase();
  const snap = await firestore()
    .collection("profiles")
    .where("username_lc", "==", lc)
    .get();
  return snap.docs.every((d) => d.id === uid);
}

async function uploadAvatar(uid: string, uri: string): Promise<string> {
  const ext = uri.split("?")[0].split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `avatars/${uid}/${Date.now()}.${ext}`;
  const ref = storage().ref(path);
  await ref.putFile(uri, {
    contentType: ext === "png" ? "image/png" : "image/jpeg",
  });
  return ref.getDownloadURL();
}

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
  const { user, completeOnboarding, updateProfile } = useAuth();
  const { colors, isDark } = useTheme();

  const [step, setStep] = useState<Step>("welcome");
  const [saving, setSaving] = useState(false);

  // Avatar
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Username
  const [username, setUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<
    "idle" | "checking" | "available" | "taken" | "invalid"
  >("idle");
  const usernameCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Interests
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const maxSelections = 20;
  const progress = useMemo(
    () => (selectedInterests.length / maxSelections) * 100,
    [selectedInterests.length],
  );

  const gradientColors = isDark
    ? ([colors.background, colors.background] as const)
    : (["#DCEBFF", "#EEF4FF", "#FFFFFF"] as const);

  const stepIndex = STEPS.indexOf(step);

  const goToStep = (s: Step) => setStep(s);
  const goHome = () => router.replace("/(tabs)/home");

  // ─── Avatar ───────────────────────────────────────────────
  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Please allow photo access.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes:
        (ImagePicker as any).MediaType?.Images ??
        (ImagePicker as any).MediaTypeOptions?.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled && result.assets?.[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const handleAvatarContinue = async () => {
    if (!user?.uid) {
      goToStep("username");
      return;
    }
    if (!avatarUri) {
      goToStep("username");
      return;
    }

    setUploadingAvatar(true);
    try {
      const url = await uploadAvatar(user.uid, avatarUri);
      await db.collection("profiles").doc(user.uid).update({
        avatar_url: url,
        updated_at: nowIso(),
        updated_at_ts: firestore.FieldValue.serverTimestamp(),
      });
    } catch (e) {
      console.warn("Avatar upload failed:", e);
    } finally {
      setUploadingAvatar(false);
    }
    goToStep("username");
  };

  // ─── Username ─────────────────────────────────────────────
  const validateUsername = (val: string) => {
    if (val.length < 3) return "invalid";
    if (!/^[a-zA-Z0-9_.]+$/.test(val)) return "invalid";
    return "valid";
  };

  const onUsernameChange = (val: string) => {
    const cleaned = val.toLowerCase().replace(/[^a-z0-9_.]/g, "");
    setUsername(cleaned);
    setUsernameStatus("idle");

    if (usernameCheckTimer.current) clearTimeout(usernameCheckTimer.current);
    if (!cleaned || cleaned.length < 3) {
      setUsernameStatus(cleaned.length > 0 ? "invalid" : "idle");
      return;
    }
    if (!/^[a-zA-Z0-9_.]+$/.test(cleaned)) {
      setUsernameStatus("invalid");
      return;
    }

    setUsernameStatus("checking");
    usernameCheckTimer.current = setTimeout(async () => {
      try {
        const available = await checkUsernameAvailable(
          cleaned,
          user?.uid ?? "",
        );
        setUsernameStatus(available ? "available" : "taken");
      } catch {
        setUsernameStatus("idle");
      }
    }, 500);
  };

  const handleUsernameContinue = async () => {
    if (!user?.uid) {
      goToStep("interests");
      return;
    }
    if (!username || usernameStatus === "taken" || usernameStatus === "invalid")
      return;

    setSaving(true);
    try {
      await db.collection("profiles").doc(user.uid).update({
        username,
        username_lc: username.toLowerCase(),
        updated_at: nowIso(),
        updated_at_ts: firestore.FieldValue.serverTimestamp(),
      });
    } catch (e) {
      console.warn("Username save failed:", e);
    } finally {
      setSaving(false);
    }
    goToStep("interests");
  };

  // ─── Interests ────────────────────────────────────────────
  const toggleInterest = (id: string) => {
    setSelectedInterests((prev) =>
      prev.includes(id)
        ? prev.filter((i) => i !== id)
        : prev.length < maxSelections
          ? [...prev, id]
          : prev,
    );
  };

  const handleInterestsContinue = async () => {
    if (!user?.uid) {
      goToStep("congrats");
      return;
    }
    if (selectedInterests.length === 0) {
      Alert.alert(
        "Select Interests",
        "Please select at least one interest, or tap Skip.",
      );
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
    }
    goToStep("congrats");
  };

  const handleSkipInterests = async () => {
    if (!user?.uid) {
      goToStep("congrats");
      return;
    }
    setSaving(true);
    try {
      await saveUserInterests(user.uid, []);
      await completeOnboarding();
    } catch {
      try {
        await completeOnboarding();
      } catch {}
    } finally {
      setSaving(false);
    }
    goToStep("congrats");
  };

  // ─── Step indicator ───────────────────────────────────────
  const visibleSteps = ["avatar", "username", "interests"];
  const currentVisibleIndex = visibleSteps.indexOf(step);

  const StepDots = () => (
    <View style={styles.dotsRow}>
      {visibleSteps.map((s, i) => (
        <View
          key={s}
          style={[
            styles.dot,
            {
              backgroundColor:
                i <= currentVisibleIndex ? colors.primary : colors.border,
              width: i === currentVisibleIndex ? 20 : 8,
            },
          ]}
        />
      ))}
    </View>
  );

  // ─── RENDER ───────────────────────────────────────────────

  // WELCOME
  if (step === "welcome") {
    return (
      <LinearGradient
        colors={gradientColors as any}
        locations={[0, 0.5, 1]}
        style={{ flex: 1 }}
      >
        <SafeAreaView
          style={styles.container}
          edges={["top", "left", "right", "bottom"]}
        >
          <StatusBar
            barStyle={isDark ? "light-content" : "dark-content"}
            backgroundColor="transparent"
            translucent
          />
          <View style={styles.welcomeContent}>
            <View
              style={[
                styles.welcomeLogoWrap,
                { backgroundColor: colors.primary + "18" },
              ]}
            >
              <Text style={styles.welcomeLogoText}>🌌</Text>
            </View>
            <Text style={[styles.welcomeTitle, { color: colors.text }]}>
              Welcome to{"\n"}NebulaNet
            </Text>
            <Text
              style={[styles.welcomeSubtitle, { color: colors.textSecondary }]}
            >
              Your space to share, connect, and discover what matters to you.
            </Text>

            <View style={styles.welcomeFeatures}>
              {[
                {
                  icon: "people-outline",
                  text: "Follow people you care about",
                },
                {
                  icon: "trending-up-outline",
                  text: "Discover trending content",
                },
                {
                  icon: "chatbubble-outline",
                  text: "Join communities and conversations",
                },
              ].map((f) => (
                <View key={f.text} style={styles.welcomeFeatureRow}>
                  <View
                    style={[
                      styles.welcomeFeatureIcon,
                      { backgroundColor: colors.primary + "18" },
                    ]}
                  >
                    <Ionicons
                      name={f.icon as any}
                      size={20}
                      color={colors.primary}
                    />
                  </View>
                  <Text
                    style={[styles.welcomeFeatureText, { color: colors.text }]}
                  >
                    {f.text}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
              onPress={() => goToStep("avatar")}
              activeOpacity={0.9}
            >
              <Text style={styles.primaryBtnText}>Get Started</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // AVATAR
  if (step === "avatar") {
    return (
      <LinearGradient
        colors={gradientColors as any}
        locations={[0, 0.5, 1]}
        style={{ flex: 1 }}
      >
        <SafeAreaView
          style={styles.container}
          edges={["top", "left", "right", "bottom"]}
        >
          <StatusBar
            barStyle={isDark ? "light-content" : "dark-content"}
            backgroundColor="transparent"
            translucent
          />
          <View style={styles.stepHeader}>
            <StepDots />
            <TouchableOpacity
              onPress={() => goToStep("username")}
              activeOpacity={0.8}
            >
              <Text style={[styles.skipText, { color: colors.textSecondary }]}>
                Skip
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: colors.text }]}>
              Add a profile photo
            </Text>
            <Text
              style={[styles.stepSubtitle, { color: colors.textSecondary }]}
            >
              Help people recognize you. You can change this later.
            </Text>

            <TouchableOpacity
              style={styles.avatarPickerWrap}
              onPress={pickAvatar}
              activeOpacity={0.85}
            >
              {avatarUri ? (
                <Image
                  source={{ uri: avatarUri }}
                  style={styles.avatarPreview}
                />
              ) : (
                <View
                  style={[
                    styles.avatarPlaceholder,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Ionicons
                    name="camera-outline"
                    size={40}
                    color={colors.primary}
                  />
                  <Text
                    style={[
                      styles.avatarPlaceholderText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Tap to add photo
                  </Text>
                </View>
              )}
              {avatarUri && (
                <View
                  style={[
                    styles.avatarEditBadge,
                    { backgroundColor: colors.primary },
                  ]}
                >
                  <Ionicons name="pencil" size={14} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.primaryBtn,
                {
                  backgroundColor: uploadingAvatar
                    ? colors.border
                    : colors.primary,
                },
              ]}
              onPress={handleAvatarContinue}
              disabled={uploadingAvatar}
              activeOpacity={0.9}
            >
              {uploadingAvatar ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.primaryBtnText}>
                    {avatarUri ? "Continue" : "Skip for now"}
                  </Text>
                  <Ionicons name="arrow-forward" size={20} color="#fff" />
                </>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // USERNAME
  if (step === "username") {
    const canContinue =
      username.length >= 3 &&
      usernameStatus !== "taken" &&
      usernameStatus !== "invalid" &&
      usernameStatus !== "checking" &&
      !saving;

    const statusColor =
      usernameStatus === "available"
        ? "#34C759"
        : usernameStatus === "taken"
          ? "#FF3B30"
          : usernameStatus === "invalid"
            ? "#FF9500"
            : colors.textTertiary;

    const statusText =
      usernameStatus === "available"
        ? "Username is available!"
        : usernameStatus === "taken"
          ? "Username is already taken"
          : usernameStatus === "invalid"
            ? "3+ characters, letters, numbers, . and _ only"
            : usernameStatus === "checking"
              ? "Checking availability..."
              : "";

    return (
      <LinearGradient
        colors={gradientColors as any}
        locations={[0, 0.5, 1]}
        style={{ flex: 1 }}
      >
        <SafeAreaView
          style={styles.container}
          edges={["top", "left", "right", "bottom"]}
        >
          <StatusBar
            barStyle={isDark ? "light-content" : "dark-content"}
            backgroundColor="transparent"
            translucent
          />
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <View style={styles.stepHeader}>
              <TouchableOpacity
                onPress={() => goToStep("avatar")}
                activeOpacity={0.85}
              >
                <Ionicons name="arrow-back" size={22} color={colors.text} />
              </TouchableOpacity>
              <StepDots />
              <TouchableOpacity
                onPress={() => goToStep("interests")}
                activeOpacity={0.8}
              >
                <Text
                  style={[styles.skipText, { color: colors.textSecondary }]}
                >
                  Skip
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.stepContent}>
              <Text style={[styles.stepTitle, { color: colors.text }]}>
                Choose a username
              </Text>
              <Text
                style={[styles.stepSubtitle, { color: colors.textSecondary }]}
              >
                This is how people will find and mention you.
              </Text>

              <View
                style={[
                  styles.usernameInputWrap,
                  {
                    backgroundColor: colors.card,
                    borderColor:
                      usernameStatus === "available"
                        ? "#34C759"
                        : usernameStatus === "taken" ||
                            usernameStatus === "invalid"
                          ? "#FF3B30"
                          : colors.border,
                  },
                ]}
              >
                <Text
                  style={[styles.usernameAt, { color: colors.textTertiary }]}
                >
                  @
                </Text>
                <TextInput
                  style={[styles.usernameInput, { color: colors.text }]}
                  placeholder="your_username"
                  placeholderTextColor={colors.textTertiary}
                  value={username}
                  onChangeText={onUsernameChange}
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={30}
                  returnKeyType="done"
                />
                {usernameStatus === "checking" && (
                  <ActivityIndicator size="small" color={colors.primary} />
                )}
                {usernameStatus === "available" && (
                  <Ionicons name="checkmark-circle" size={22} color="#34C759" />
                )}
                {(usernameStatus === "taken" ||
                  usernameStatus === "invalid") && (
                  <Ionicons name="close-circle" size={22} color="#FF3B30" />
                )}
              </View>

              {!!statusText && (
                <Text style={[styles.usernameStatus, { color: statusColor }]}>
                  {statusText}
                </Text>
              )}
            </View>

            <View style={styles.footer}>
              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  {
                    backgroundColor: canContinue
                      ? colors.primary
                      : colors.border,
                  },
                ]}
                onPress={handleUsernameContinue}
                disabled={!canContinue}
                activeOpacity={0.9}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.primaryBtnText}>Continue</Text>
                    <Ionicons name="arrow-forward" size={20} color="#fff" />
                  </>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // INTERESTS
  if (step === "interests") {
    return (
      <LinearGradient
        colors={gradientColors as any}
        locations={[0, 0.5, 1]}
        style={{ flex: 1 }}
      >
        <SafeAreaView
          style={styles.container}
          edges={["top", "left", "right", "bottom"]}
        >
          <StatusBar
            barStyle={isDark ? "light-content" : "dark-content"}
            backgroundColor="transparent"
            translucent
          />

          <View style={styles.stepHeader}>
            <TouchableOpacity
              onPress={() => goToStep("username")}
              activeOpacity={0.85}
            >
              <Ionicons name="arrow-back" size={22} color={colors.text} />
            </TouchableOpacity>
            <StepDots />
            <TouchableOpacity
              onPress={handleSkipInterests}
              disabled={saving}
              activeOpacity={0.8}
            >
              <Text style={[styles.skipText, { color: colors.textSecondary }]}>
                {saving ? "..." : "Skip"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.interestsHeader}>
            <Text style={[styles.stepTitle, { color: colors.text }]}>
              What are you into?
            </Text>
            <Text
              style={[styles.stepSubtitle, { color: colors.textSecondary }]}
            >
              Pick your interests and we'll tailor your feed. Select as many as
              you like.
            </Text>

            <View style={styles.progressRow}>
              <Text style={[styles.progressText, { color: colors.text }]}>
                {selectedInterests.length}/{maxSelections}
              </Text>
              <View
                style={[
                  styles.progressBarBg,
                  { backgroundColor: colors.border, flex: 1, marginLeft: 10 },
                ]}
              >
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${progress}%`, backgroundColor: colors.primary },
                  ]}
                />
              </View>
            </View>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.interestsGrid}
            showsVerticalScrollIndicator={false}
          >
            {INTERESTS.map((interest) => {
              const isSelected = selectedInterests.includes(interest.id);
              return (
                <TouchableOpacity
                  key={interest.id}
                  style={[
                    styles.interestChip,
                    {
                      backgroundColor: isSelected
                        ? colors.primary
                        : colors.card,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => toggleInterest(interest.id)}
                  activeOpacity={0.75}
                  disabled={saving}
                >
                  <Text style={styles.interestEmoji}>{interest.emoji}</Text>
                  <Text
                    style={[
                      styles.interestText,
                      { color: isSelected ? "#fff" : colors.text },
                    ]}
                  >
                    {interest.name}
                  </Text>
                  {isSelected && (
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={[styles.footer, { backgroundColor: "transparent" }]}>
            <TouchableOpacity
              style={[
                styles.primaryBtn,
                {
                  backgroundColor:
                    selectedInterests.length === 0 || saving
                      ? colors.border
                      : colors.primary,
                },
              ]}
              onPress={handleInterestsContinue}
              disabled={selectedInterests.length === 0 || saving}
              activeOpacity={0.9}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.primaryBtnText}>Continue</Text>
                  <Ionicons name="arrow-forward" size={20} color="#fff" />
                </>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // CONGRATS
  return (
    <LinearGradient
      colors={gradientColors as any}
      locations={[0, 0.5, 1]}
      style={{ flex: 1 }}
    >
      <SafeAreaView
        style={styles.container}
        edges={["top", "left", "right", "bottom"]}
      >
        <StatusBar
          barStyle={isDark ? "light-content" : "dark-content"}
          backgroundColor="transparent"
          translucent
        />
        <View style={styles.congratsContent}>
          <View
            style={[
              styles.congratsIconWrap,
              { backgroundColor: colors.primary + "18" },
            ]}
          >
            <Text style={styles.congratsEmoji}>🎉</Text>
          </View>
          <Text style={[styles.congratsTitle, { color: colors.text }]}>
            You're all set!
          </Text>
          <Text
            style={[styles.congratsSubtitle, { color: colors.textSecondary }]}
          >
            Welcome to NebulaNet. Your feed is ready and tailored just for you.
          </Text>

          {selectedInterests.length > 0 && (
            <View style={styles.congratsInterestsWrap}>
              <Text
                style={[
                  styles.congratsInterestsLabel,
                  { color: colors.textTertiary },
                ]}
              >
                Your interests
              </Text>
              <View style={styles.congratsChips}>
                {selectedInterests.slice(0, 6).map((id) => {
                  const interest = INTERESTS.find((i) => i.id === id);
                  if (!interest) return null;
                  return (
                    <View
                      key={id}
                      style={[
                        styles.congratsChip,
                        {
                          backgroundColor: colors.primary + "18",
                          borderColor: colors.primary + "30",
                        },
                      ]}
                    >
                      <Text style={styles.congratsChipEmoji}>
                        {interest.emoji}
                      </Text>
                      <Text
                        style={[
                          styles.congratsChipText,
                          { color: colors.primary },
                        ]}
                      >
                        {interest.name}
                      </Text>
                    </View>
                  );
                })}
                {selectedInterests.length > 6 && (
                  <View
                    style={[
                      styles.congratsChip,
                      {
                        backgroundColor: colors.primary + "18",
                        borderColor: colors.primary + "30",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.congratsChipText,
                        { color: colors.primary },
                      ]}
                    >
                      +{selectedInterests.length - 6} more
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            onPress={goHome}
            activeOpacity={0.9}
          >
            <Text style={styles.primaryBtnText}>Explore NebulaNet</Text>
            <Ionicons name="rocket-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Welcome
  welcomeContent: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: "center",
    gap: 24,
  },
  welcomeLogoWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  welcomeLogoText: { fontSize: 44 },
  welcomeTitle: {
    fontSize: 34,
    fontWeight: "900",
    textAlign: "center",
    lineHeight: 40,
  },
  welcomeSubtitle: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
  },
  welcomeFeatures: { gap: 14 },
  welcomeFeatureRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  welcomeFeatureIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  welcomeFeatureText: { fontSize: 15, fontWeight: "600", flex: 1 },

  // Step header
  stepHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  dotsRow: { flexDirection: "row", gap: 6, alignItems: "center" },
  dot: { height: 8, borderRadius: 4 },
  skipText: { fontSize: 15, fontWeight: "600" },

  // Step content
  stepContent: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: "center",
    gap: 16,
  },
  stepTitle: { fontSize: 28, fontWeight: "900", lineHeight: 34 },
  stepSubtitle: { fontSize: 15, lineHeight: 22 },

  // Avatar
  avatarPickerWrap: {
    alignSelf: "center",
    marginTop: 24,
    position: "relative",
  },
  avatarPreview: {
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  avatarPlaceholder: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  avatarPlaceholderText: { fontSize: 13, fontWeight: "600" },
  avatarEditBadge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },

  // Username
  usernameInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    height: 56,
    gap: 8,
    marginTop: 8,
  },
  usernameAt: { fontSize: 18, fontWeight: "700" },
  usernameInput: { flex: 1, fontSize: 17, fontWeight: "600" },
  usernameStatus: { fontSize: 13, fontWeight: "600", marginTop: 4 },

  // Interests
  interestsHeader: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 8,
  },
  progressRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  progressText: { fontSize: 13, fontWeight: "700", minWidth: 44 },
  progressBarBg: { height: 6, borderRadius: 3, overflow: "hidden" },
  progressBarFill: { height: "100%", borderRadius: 3 },
  interestsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  interestChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
  },
  interestEmoji: { fontSize: 16 },
  interestText: { fontSize: 14, fontWeight: "600" },

  // Congrats
  congratsContent: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
  },
  congratsIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  congratsEmoji: { fontSize: 56 },
  congratsTitle: { fontSize: 32, fontWeight: "900", textAlign: "center" },
  congratsSubtitle: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
  },
  congratsInterestsWrap: { width: "100%", gap: 10 },
  congratsInterestsLabel: {
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  congratsChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
  },
  congratsChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  congratsChipEmoji: { fontSize: 14 },
  congratsChipText: { fontSize: 13, fontWeight: "700" },

  // Footer
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
    borderRadius: 28,
  },
  primaryBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
});
