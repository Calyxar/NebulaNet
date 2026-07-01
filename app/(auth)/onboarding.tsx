// app/(auth)/onboarding.tsx ✅
// ✅ Twitter-style onboarding with skip on every step
// Steps: Welcome → Username → Topics → Avatar → Suggested Accounts
// ✅ REDESIGN: uses real app icon on welcome, cleaner cards throughout,
//    fixed topics "at least 3" vs enabled-at-1 inconsistency (now "any"),
//    avatar placeholder redesigned, suggestions match Explore style.

import { useAuth } from "@/hooks/useAuth";
import { useFollowActions } from "@/hooks/useFollowActions";
import { db } from "@/lib/firebase";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import firestore from "@react-native-firebase/firestore";
import storage from "@react-native-firebase/storage";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width: SCREEN_W } = Dimensions.get("window");
const CARD_W = (SCREEN_W - 48 - 12) / 2;

// ── Topics ────────────────────────────────────────────────────────────────────
const TOPICS = [
  { id: "gaming", name: "Gaming", icon: "game-controller-outline" },
  { id: "tech", name: "Tech", icon: "hardware-chip-outline" },
  { id: "music", name: "Music", icon: "musical-notes-outline" },
  { id: "movies", name: "Movies & TV", icon: "film-outline" },
  { id: "sports", name: "Sports", icon: "football-outline" },
  { id: "food", name: "Food", icon: "restaurant-outline" },
  { id: "travel", name: "Travel", icon: "airplane-outline" },
  { id: "art", name: "Art", icon: "color-palette-outline" },
  { id: "fitness", name: "Fitness", icon: "barbell-outline" },
  { id: "business", name: "Business", icon: "briefcase-outline" },
  { id: "photography", name: "Photography", icon: "camera-outline" },
  { id: "books", name: "Books", icon: "book-outline" },
  { id: "wellness", name: "Wellness", icon: "heart-outline" },
  { id: "fashion", name: "Fashion", icon: "shirt-outline" },
  { id: "startups", name: "Startups", icon: "rocket-outline" },
  { id: "mindfulness", name: "Mindfulness", icon: "leaf-outline" },
  { id: "podcasts", name: "Podcasts", icon: "mic-outline" },
  { id: "environment", name: "Environment", icon: "earth-outline" },
  { id: "events", name: "Events", icon: "calendar-outline" },
  { id: "inspiration", name: "Inspiration", icon: "bulb-outline" },
] as const;

type TopicId = (typeof TOPICS)[number]["id"];

const STEPS = [
  "welcome",
  "username",
  "topics",
  "avatar",
  "suggestions",
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

// ── Progress bar ──────────────────────────────────────────────────────────────
function ProgressBar({
  current,
  total,
  colors,
}: {
  current: number;
  total: number;
  colors: any;
}) {
  const pct = Math.round(((current + 1) / total) * 100);
  return (
    <View style={{ flex: 1, marginHorizontal: 16 }}>
      <View style={[styles.progressBarBg, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.progressBarFill,
            { width: `${pct}%` as any, backgroundColor: colors.primary },
          ]}
        />
      </View>
      <Text style={[styles.progressLabel, { color: colors.textTertiary }]}>
        Step {current + 1} of {total}
      </Text>
    </View>
  );
}

// ── Topic card ────────────────────────────────────────────────────────────────
function TopicCard({
  topic,
  selected,
  onPress,
  colors,
}: {
  topic: (typeof TOPICS)[number];
  selected: boolean;
  onPress: () => void;
  colors: any;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.topicCard,
        {
          backgroundColor: selected ? colors.primary : colors.card,
          borderColor: selected ? colors.primary : colors.border,
          width: CARD_W,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.82}
    >
      <View
        style={[
          styles.topicIconCircle,
          {
            backgroundColor: selected
              ? "rgba(255,255,255,0.2)"
              : colors.primary + "18",
          },
        ]}
      >
        <Ionicons
          name={topic.icon as any}
          size={24}
          color={selected ? "#fff" : colors.primary}
        />
      </View>
      <Text
        style={[styles.topicName, { color: selected ? "#fff" : colors.text }]}
      >
        {topic.name}
      </Text>
      {selected && (
        <View style={styles.topicCheck}>
          <Ionicons name="checkmark-circle" size={18} color="#fff" />
        </View>
      )}
    </TouchableOpacity>
  );
}

// ── Suggested account row ─────────────────────────────────────────────────────
function SuggestedAccountRow({
  profile,
  colors,
  isDark,
}: {
  profile: {
    id: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
    is_private: boolean;
  };
  colors: any;
  isDark: boolean;
}) {
  const { follow, unfollow, isFollowingBusy } = useFollowActions(
    profile.id,
    profile.is_private,
  );
  const [followed, setFollowed] = useState(false);
  const name = profile.full_name || profile.username || "User";

  return (
    <View
      style={[
        styles.suggestRow,
        { backgroundColor: colors.card, shadowOpacity: isDark ? 0.2 : 0.05 },
      ]}
    >
      {profile.avatar_url ? (
        <Image
          source={{ uri: profile.avatar_url }}
          style={styles.suggestAvatar}
        />
      ) : (
        <View
          style={[
            styles.suggestAvatarFallback,
            { backgroundColor: colors.primary },
          ]}
        >
          <Text style={styles.suggestAvatarLetter}>
            {(name[0] || "U").toUpperCase()}
          </Text>
        </View>
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={[styles.suggestName, { color: colors.text }]}
          numberOfLines={1}
        >
          {name}
        </Text>
        {!!profile.username && (
          <Text
            style={[styles.suggestHandle, { color: colors.textTertiary }]}
            numberOfLines={1}
          >
            @{profile.username}
          </Text>
        )}
      </View>
      <TouchableOpacity
        style={[
          styles.followBtn,
          {
            backgroundColor: followed ? colors.surface : colors.primary,
            borderColor: followed ? colors.border : colors.primary,
          },
        ]}
        onPress={async () => {
          if (followed) {
            await unfollow();
            setFollowed(false);
          } else {
            await follow();
            setFollowed(true);
          }
        }}
        disabled={isFollowingBusy}
        activeOpacity={0.85}
      >
        {isFollowingBusy ? (
          <ActivityIndicator
            size={12}
            color={followed ? colors.text : "#fff"}
          />
        ) : (
          <Text
            style={[
              styles.followBtnText,
              { color: followed ? colors.text : "#fff" },
            ]}
          >
            {followed ? "Following" : "Follow"}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function OnboardingScreen() {
  const { user, completeOnboarding } = useAuth();
  const { colors, isDark } = useTheme();

  const [step, setStep] = useState<Step>("welcome");
  const [saving, setSaving] = useState(false);

  // Username
  const [username, setUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<
    "idle" | "checking" | "available" | "taken" | "invalid"
  >("idle");
  const usernameTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Topics
  const [selectedTopics, setSelectedTopics] = useState<TopicId[]>([]);

  // Avatar
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Suggestions
  const [suggested, setSuggested] = useState<any[]>([]);
  const [loadingSuggested, setLoadingSuggested] = useState(false);

  const gradientColors = isDark
    ? ([colors.background, colors.background] as const)
    : (["#DCEBFF", "#EEF4FF", "#FFFFFF"] as const);

  // ── Username ──────────────────────────────────────────────────────────────
  const onUsernameChange = (val: string) => {
    const cleaned = val.toLowerCase().replace(/[^a-z0-9_.]/g, "");
    setUsername(cleaned);
    setUsernameStatus("idle");
    if (usernameTimer.current) clearTimeout(usernameTimer.current);
    if (!cleaned || cleaned.length < 3) {
      setUsernameStatus(cleaned.length > 0 ? "invalid" : "idle");
      return;
    }
    setUsernameStatus("checking");
    usernameTimer.current = setTimeout(async () => {
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
      setStep("topics");
      return;
    }
    if (
      !username ||
      usernameStatus === "taken" ||
      usernameStatus === "invalid" ||
      usernameStatus === "checking"
    )
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
    setStep("topics");
  };

  // ── Topics ────────────────────────────────────────────────────────────────
  const toggleTopic = (id: TopicId) => {
    setSelectedTopics((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  };

  const handleTopicsContinue = async () => {
    if (!user?.uid) {
      setStep("avatar");
      return;
    }
    setSaving(true);
    try {
      if (selectedTopics.length > 0) {
        await saveUserInterests(user.uid, selectedTopics);
      }
    } catch (e) {
      console.warn("Topics save failed:", e);
    } finally {
      setSaving(false);
    }
    setStep("avatar");
  };

  // ── Avatar ────────────────────────────────────────────────────────────────
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
    if (!result.canceled && result.assets?.[0])
      setAvatarUri(result.assets[0].uri);
  };

  const handleAvatarContinue = async () => {
    if (!user?.uid || !avatarUri) {
      setStep("suggestions");
      fetchSuggested();
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
    setStep("suggestions");
    fetchSuggested();
  };

  // ── Suggested accounts ────────────────────────────────────────────────────
  const fetchSuggested = async () => {
    if (!user?.uid) return;
    setLoadingSuggested(true);
    try {
      const interestsSnap =
        selectedTopics.length > 0
          ? await firestore()
              .collection("user_interests")
              .where(
                "interests",
                "array-contains-any",
                selectedTopics.slice(0, 10),
              )
              .limit(30)
              .get()
          : null;

      const suggestedUids = new Set<string>();
      interestsSnap?.docs.forEach((d) => {
        const uid = (d.data() as any).user_id;
        if (uid && uid !== user.uid) suggestedUids.add(uid);
      });

      const topSnap = await firestore()
        .collection("profiles")
        .orderBy("follower_count", "desc")
        .limit(20)
        .get();
      topSnap.docs.forEach((d) => {
        if (d.id !== user.uid) suggestedUids.add(d.id);
      });

      const uids = Array.from(suggestedUids).slice(0, 15);
      if (!uids.length) {
        setSuggested([]);
        return;
      }

      const chunks: string[][] = [];
      for (let i = 0; i < uids.length; i += 10)
        chunks.push(uids.slice(i, i + 10));

      const profiles: any[] = [];
      for (const chunk of chunks) {
        const snap = await firestore()
          .collection("profiles")
          .where(firestore.FieldPath.documentId(), "in", chunk)
          .get();
        snap.docs.forEach((d) => profiles.push({ id: d.id, ...d.data() }));
      }
      setSuggested(profiles.slice(0, 10));
    } catch (e) {
      console.warn("fetchSuggested failed:", e);
      setSuggested([]);
    } finally {
      setLoadingSuggested(false);
    }
  };

  const handleFinish = async () => {
    if (user?.uid) {
      try {
        await completeOnboarding();
      } catch {}
    }
    router.replace("/(auth)/birthdate" as any);
  };

  // ── Wrapper ───────────────────────────────────────────────────────────────
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
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
        {children}
      </SafeAreaView>
    </LinearGradient>
  );

  // ── WELCOME ───────────────────────────────────────────────────────────────
  if (step === "welcome") {
    return (
      <Wrapper>
        <View style={styles.welcomeContent}>
          {/* Real app icon instead of emoji */}
          <View
            style={[styles.welcomeIconWrap, { shadowColor: colors.primary }]}
          >
            <Image
              source={require("@/assets/images/icon.png")}
              style={styles.welcomeIcon}
            />
          </View>

          <View style={styles.welcomeTextBlock}>
            <Text style={[styles.welcomeTitle, { color: colors.text }]}>
              Welcome to{"\n"}NebulaNet
            </Text>
            <Text
              style={[styles.welcomeSubtitle, { color: colors.textSecondary }]}
            >
              Your space to share, connect, and discover what matters to you.
            </Text>
          </View>

          <View style={styles.welcomeFeatures}>
            {[
              { icon: "people-outline", text: "Follow people you care about" },
              {
                icon: "trending-up-outline",
                text: "Discover trending content",
              },
              {
                icon: "chatbubble-outline",
                text: "Join communities and conversations",
              },
            ].map((f) => (
              <View
                key={f.text}
                style={[
                  styles.welcomeFeatureRow,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
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
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={colors.textTertiary}
                />
              </View>
            ))}
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            onPress={() => setStep("username")}
            activeOpacity={0.9}
          >
            <Text style={styles.primaryBtnText}>Get Started</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.replace("/(auth)/birthdate" as any)}
            activeOpacity={0.8}
            style={styles.skipSetupBtn}
          >
            <Text
              style={[styles.skipSetupText, { color: colors.textTertiary }]}
            >
              Skip setup for now
            </Text>
          </TouchableOpacity>
        </View>
      </Wrapper>
    );
  }

  // ── USERNAME ──────────────────────────────────────────────────────────────
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
        : usernameStatus === "taken" || usernameStatus === "invalid"
          ? "#FF3B30"
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
      <Wrapper>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.stepHeader}>
            <ProgressBar current={0} total={4} colors={colors} />
            <TouchableOpacity
              onPress={() => setStep("topics")}
              activeOpacity={0.8}
            >
              <Text style={[styles.skipText, { color: colors.textSecondary }]}>
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
              This is how people will find and mention you on NebulaNet.
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
              <Text style={[styles.usernameAt, { color: colors.textTertiary }]}>
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
                onSubmitEditing={handleUsernameContinue}
                autoFocus
              />
              {usernameStatus === "checking" && (
                <ActivityIndicator size="small" color={colors.primary} />
              )}
              {usernameStatus === "available" && (
                <Ionicons name="checkmark-circle" size={22} color="#34C759" />
              )}
              {(usernameStatus === "taken" || usernameStatus === "invalid") && (
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
                  backgroundColor: canContinue ? colors.primary : colors.border,
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
      </Wrapper>
    );
  }

  // ── TOPICS ────────────────────────────────────────────────────────────────
  if (step === "topics") {
    return (
      <Wrapper>
        <View style={styles.stepHeader}>
          <TouchableOpacity
            onPress={() => setStep("username")}
            activeOpacity={0.85}
          >
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <ProgressBar current={1} total={4} colors={colors} />
          <TouchableOpacity
            onPress={handleTopicsContinue}
            disabled={saving}
            activeOpacity={0.8}
          >
            <Text style={[styles.skipText, { color: colors.textSecondary }]}>
              {saving ? "..." : "Skip"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.topicsHeaderWrap}>
          <Text style={[styles.stepTitle, { color: colors.text }]}>
            What are you into?
          </Text>
          <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
            Pick topics to personalize your For You feed.
          </Text>
          {selectedTopics.length > 0 && (
            <View style={styles.topicsCountRow}>
              <View
                style={[
                  styles.topicsCountBadge,
                  {
                    backgroundColor: colors.primary + "18",
                    borderColor: colors.primary + "30",
                  },
                ]}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={14}
                  color={colors.primary}
                />
                <Text
                  style={[styles.topicsCountText, { color: colors.primary }]}
                >
                  {selectedTopics.length} selected
                </Text>
              </View>
            </View>
          )}
        </View>

        <FlatList
          data={TOPICS}
          keyExtractor={(t) => t.id}
          numColumns={2}
          columnWrapperStyle={styles.topicsRow}
          contentContainerStyle={styles.topicsGrid}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TopicCard
              topic={item}
              selected={selectedTopics.includes(item.id)}
              onPress={() => toggleTopic(item.id)}
              colors={colors}
            />
          )}
        />

        <View style={[styles.footer, { backgroundColor: "transparent" }]}>
          <TouchableOpacity
            style={[
              styles.primaryBtn,
              {
                backgroundColor:
                  selectedTopics.length >= 1 && !saving
                    ? colors.primary
                    : colors.border,
              },
            ]}
            onPress={handleTopicsContinue}
            disabled={selectedTopics.length === 0 || saving}
            activeOpacity={0.9}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.primaryBtnText}>
                  {selectedTopics.length === 0
                    ? "Select a topic to continue"
                    : "Continue"}
                </Text>
                {selectedTopics.length > 0 && (
                  <Ionicons name="arrow-forward" size={20} color="#fff" />
                )}
              </>
            )}
          </TouchableOpacity>
        </View>
      </Wrapper>
    );
  }

  // ── AVATAR ────────────────────────────────────────────────────────────────
  if (step === "avatar") {
    return (
      <Wrapper>
        <View style={styles.stepHeader}>
          <TouchableOpacity
            onPress={() => setStep("topics")}
            activeOpacity={0.85}
          >
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <ProgressBar current={2} total={4} colors={colors} />
          <TouchableOpacity
            onPress={() => {
              setStep("suggestions");
              fetchSuggested();
            }}
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
          <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
            Help people recognize you. You can always change this later.
          </Text>

          <TouchableOpacity
            style={styles.avatarPickerWrap}
            onPress={pickAvatar}
            activeOpacity={0.85}
          >
            {avatarUri ? (
              <>
                <Image
                  source={{ uri: avatarUri }}
                  style={styles.avatarPreview}
                />
                <View
                  style={[
                    styles.avatarEditBadge,
                    {
                      backgroundColor: colors.primary,
                      borderColor: colors.background,
                    },
                  ]}
                >
                  <Ionicons name="pencil" size={14} color="#fff" />
                </View>
              </>
            ) : (
              <View
                style={[
                  styles.avatarPlaceholder,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <View
                  style={[
                    styles.avatarPlaceholderInner,
                    { backgroundColor: colors.primary + "18" },
                  ]}
                >
                  <Ionicons
                    name="person-outline"
                    size={44}
                    color={colors.primary}
                  />
                </View>
                <View
                  style={[
                    styles.avatarCameraBtn,
                    {
                      backgroundColor: colors.primary,
                      borderColor: colors.background,
                    },
                  ]}
                >
                  <Ionicons name="camera" size={16} color="#fff" />
                </View>
              </View>
            )}
          </TouchableOpacity>

          <Text style={[styles.avatarHint, { color: colors.textTertiary }]}>
            Tap to choose from your photo library
          </Text>
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
              <>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.primaryBtnText}>Uploading…</Text>
              </>
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
      </Wrapper>
    );
  }

  // ── SUGGESTIONS ───────────────────────────────────────────────────────────
  if (step === "suggestions") {
    return (
      <Wrapper>
        <View style={styles.stepHeader}>
          <TouchableOpacity
            onPress={() => setStep("avatar")}
            activeOpacity={0.85}
          >
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <ProgressBar current={3} total={4} colors={colors} />
          <TouchableOpacity onPress={handleFinish} activeOpacity={0.8}>
            <Text style={[styles.skipText, { color: colors.textSecondary }]}>
              Skip
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.suggestHeaderWrap}>
          <Text style={[styles.stepTitle, { color: colors.text }]}>
            Who to follow
          </Text>
          <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
            {selectedTopics.length > 0
              ? "People who share your interests on NebulaNet."
              : "Popular accounts on NebulaNet to get started."}
          </Text>
        </View>

        {loadingSuggested ? (
          <View style={styles.suggestLoading}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text
              style={[
                styles.suggestLoadingText,
                { color: colors.textSecondary },
              ]}
            >
              Finding people for you…
            </Text>
          </View>
        ) : suggested.length > 0 ? (
          <FlatList
            data={suggested}
            keyExtractor={(p) => p.id}
            contentContainerStyle={styles.suggestList}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            renderItem={({ item }) => (
              <SuggestedAccountRow
                profile={{
                  id: item.id,
                  username: item.username ?? null,
                  full_name: item.full_name ?? null,
                  avatar_url: item.avatar_url ?? null,
                  is_private: !!item.is_private,
                }}
                colors={colors}
                isDark={isDark}
              />
            )}
          />
        ) : (
          <View style={styles.suggestEmpty}>
            <View
              style={[
                styles.suggestEmptyIcon,
                { backgroundColor: colors.card },
              ]}
            >
              <Ionicons
                name="people-outline"
                size={40}
                color={colors.textTertiary}
              />
            </View>
            <Text
              style={[styles.suggestEmptyText, { color: colors.textTertiary }]}
            >
              No suggestions yet — more people are joining every day!
            </Text>
          </View>
        )}

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            onPress={handleFinish}
            activeOpacity={0.9}
          >
            <Text style={styles.primaryBtnText}>Let's go</Text>
            <Ionicons name="rocket-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </Wrapper>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Welcome
  welcomeContent: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
    gap: 28,
  },
  welcomeIconWrap: {
    alignSelf: "center",
    borderRadius: 28,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
  },
  welcomeIcon: {
    width: 90,
    height: 90,
    borderRadius: 24,
  },
  welcomeTextBlock: { alignItems: "center", gap: 10 },
  welcomeTitle: {
    fontSize: 34,
    fontWeight: "900",
    textAlign: "center",
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  welcomeSubtitle: { fontSize: 16, textAlign: "center", lineHeight: 24 },
  welcomeFeatures: { gap: 10 },
  welcomeFeatureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 2,
  },
  welcomeFeatureIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  welcomeFeatureText: { fontSize: 14, fontWeight: "700", flex: 1 },

  // Step header
  stepHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  progressBarBg: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
    width: "100%",
  },
  progressBarFill: { height: 4, borderRadius: 2 },
  progressLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 4,
    textAlign: "center",
  },
  skipText: { fontSize: 15, fontWeight: "600" },
  skipSetupBtn: { alignItems: "center", paddingTop: 14 },
  skipSetupText: { fontSize: 14, fontWeight: "600" },

  // Step content
  stepContent: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: "center",
    gap: 14,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 34,
    letterSpacing: -0.3,
  },
  stepSubtitle: { fontSize: 15, lineHeight: 22 },

  // Username
  usernameInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    height: 58,
    gap: 8,
    marginTop: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 2,
  },
  usernameAt: { fontSize: 18, fontWeight: "700" },
  usernameInput: { flex: 1, fontSize: 17, fontWeight: "600" },
  usernameStatus: { fontSize: 13, fontWeight: "600", marginTop: 4 },

  // Topics
  topicsHeaderWrap: { paddingHorizontal: 20, paddingBottom: 8, gap: 6 },
  topicsCountRow: { flexDirection: "row", marginTop: 4 },
  topicsCountBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  topicsCountText: { fontSize: 13, fontWeight: "800" },
  topicsGrid: { paddingHorizontal: 16, paddingBottom: 8 },
  topicsRow: { gap: 12, marginBottom: 12 },
  topicCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 14,
    alignItems: "flex-start",
    gap: 10,
    position: "relative",
    minHeight: 100,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 2,
  },
  topicIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  topicName: { fontSize: 13, fontWeight: "800", lineHeight: 17 },
  topicCheck: { position: "absolute", top: 10, right: 10 },

  // Avatar
  avatarPickerWrap: {
    alignSelf: "center",
    marginTop: 16,
    position: "relative",
  },
  avatarPreview: { width: 140, height: 140, borderRadius: 70 },
  avatarPlaceholder: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 3,
  },
  avatarPlaceholderInner: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarCameraBtn: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  avatarEditBadge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  avatarHint: {
    textAlign: "center",
    fontSize: 13,
    fontWeight: "500",
    marginTop: 12,
  },

  // Suggestions
  suggestHeaderWrap: { paddingHorizontal: 20, paddingBottom: 12, gap: 4 },
  suggestList: { paddingHorizontal: 16, paddingBottom: 16 },
  suggestRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 2,
  },
  suggestAvatar: { width: 46, height: 46, borderRadius: 23 },
  suggestAvatarFallback: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  suggestAvatarLetter: { fontSize: 18, fontWeight: "900", color: "#fff" },
  suggestName: { fontSize: 14, fontWeight: "900" },
  suggestHandle: { fontSize: 12, marginTop: 2, fontWeight: "600" },
  followBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    minWidth: 90,
    alignItems: "center",
  },
  followBtnText: { fontSize: 13, fontWeight: "800" },
  suggestLoading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  suggestLoadingText: { fontSize: 14, fontWeight: "600" },
  suggestEmpty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    paddingHorizontal: 32,
  },
  suggestEmptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  suggestEmptyText: { fontSize: 14, textAlign: "center", lineHeight: 20 },

  // Footer
  footer: { paddingHorizontal: 24, paddingVertical: 20 },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
    borderRadius: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 4,
  },
  primaryBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
});
