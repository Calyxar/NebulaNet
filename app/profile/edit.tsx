// app/profile/edit.tsx ✅
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import firestore from "@react-native-firebase/firestore";
import storage from "@react-native-firebase/storage";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width: SCREEN_W } = Dimensions.get("window");
const IS_SMALL = SCREEN_W < 380;

function guessExtFromUri(uri: string) {
  const clean = uri.split("?")[0];
  const ext = clean.split(".").pop()?.toLowerCase();
  if (!ext || ext.length > 5) return "jpg";
  if (ext === "jpeg") return "jpg";
  if (ext === "png" || ext === "jpg" || ext === "webp" || ext === "heic")
    return ext;
  return "jpg";
}
function guessMimeType(ext: string) {
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "heic") return "image/heic";
  return "image/jpeg";
}
function calculateAge(birthdate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthdate.getFullYear();
  const m = today.getMonth() - birthdate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthdate.getDate())) age--;
  return age;
}
function getAgeGroup(age: number): "under_13" | "teen" | "adult" {
  if (age < 13) return "under_13";
  if (age < 18) return "teen";
  return "adult";
}
function formatBirthdate(iso: string): string {
  if (!iso) return "Not set";
  const [year, month, day] = iso.split("-");
  return `${month}/${day}/${year}`;
}

// ─── DOB Sheet ────────────────────────────────────────────────────────────────
// Plain View overlay (NOT a Modal) so Android KAV pushes it up correctly.
function BirthdateSheet({
  visible,
  uid,
  currentBirthdate,
  currentAgeGroup,
  onClose,
  onSaved,
  colors,
  isDark,
}: {
  visible: boolean;
  uid: string;
  currentBirthdate: string | null;
  currentAgeGroup: string | null;
  onClose: () => void;
  onSaved: () => void;
  colors: any;
  isDark: boolean;
}) {
  const [step, setStep] = useState<"confirm" | "new">("confirm");
  const [confirmMonth, setConfirmMonth] = useState("");
  const [confirmDay, setConfirmDay] = useState("");
  const [confirmYear, setConfirmYear] = useState("");
  const [newMonth, setNewMonth] = useState("");
  const [newDay, setNewDay] = useState("");
  const [newYear, setNewYear] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const dayConfirmRef = useRef<TextInput>(null);
  const yearConfirmRef = useRef<TextInput>(null);
  const dayNewRef = useRef<TextInput>(null);
  const yearNewRef = useRef<TextInput>(null);

  const reset = () => {
    setStep("confirm");
    setConfirmMonth("");
    setConfirmDay("");
    setConfirmYear("");
    setNewMonth("");
    setNewDay("");
    setNewYear("");
    setSaving(false);
    setErrorMsg("");
  };

  const handleClose = () => {
    Keyboard.dismiss();
    reset();
    onClose();
  };

  const isValidDate = (m: string, d: string, y: string) => {
    const month = parseInt(m),
      day = parseInt(d),
      year = parseInt(y);
    if (!month || !day || !year) return false;
    if (month < 1 || month > 12 || day < 1 || day > 31) return false;
    if (year < 1900 || year > new Date().getFullYear()) return false;
    const date = new Date(year, month - 1, day);
    return (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    );
  };

  const handleVerify = () => {
    setErrorMsg("");

    // ✅ No birthdate on record — skip verify, go straight to new DOB step
    if (!currentBirthdate) {
      setStep("new");
      return;
    }

    if (!isValidDate(confirmMonth, confirmDay, confirmYear)) {
      setErrorMsg("Please enter a complete valid date.");
      return;
    }

    const entered = `${confirmYear.padStart(4, "0")}-${confirmMonth.padStart(2, "0")}-${confirmDay.padStart(2, "0")}`;

    if (entered !== currentBirthdate) {
      // ✅ Inline error — no Alert that steals keyboard focus on Android
      setErrorMsg("Birthdate doesn't match our records. Please try again.");
      return;
    }

    setStep("new");
  };

  const handleSave = async () => {
    setErrorMsg("");
    if (!isValidDate(newMonth, newDay, newYear)) {
      setErrorMsg("Please enter a valid date of birth.");
      return;
    }

    const newBirthdateDate = new Date(
      parseInt(newYear),
      parseInt(newMonth) - 1,
      parseInt(newDay),
    );
    const newAge = calculateAge(newBirthdateDate);
    const newAgeGroup = getAgeGroup(newAge);
    const newBirthdateIso = `${newYear.padStart(4, "0")}-${newMonth.padStart(2, "0")}-${newDay.padStart(2, "0")}`;

    if (currentAgeGroup === "adult" && newAgeGroup === "under_13") {
      setErrorMsg("This birthdate indicates under 13. Please contact support.");
      return;
    }

    if (currentAgeGroup === "adult" && newAgeGroup === "teen") {
      Alert.alert(
        "Age Change Detected",
        "Changing to under 18 will restrict some content. Continue?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Continue",
            onPress: () => saveNewBirthdate(newBirthdateIso, newAgeGroup),
          },
        ],
      );
      return;
    }

    await saveNewBirthdate(newBirthdateIso, newAgeGroup);
  };

  const saveNewBirthdate = async (
    birthdateIso: string,
    newAgeGroup: string,
  ) => {
    if (!uid) return;
    setSaving(true);
    try {
      if (newAgeGroup === "under_13") {
        handleClose();
        router.push({
          pathname: "/(auth)/parental-approval",
          params: {
            birthdate: birthdateIso,
            age: calculateAge(new Date(birthdateIso)).toString(),
          },
        } as any);
        return;
      }

      await firestore().collection("profiles").doc(uid).update({
        birthdate: birthdateIso,
        age_group: newAgeGroup,
        updated_at: new Date().toISOString(),
        updated_at_ts: firestore.FieldValue.serverTimestamp(),
      });

      await firestore()
        .collection("user_settings")
        .doc(uid)
        .set(
          {
            nsfw_locked: newAgeGroup === "teen",
            updated_at: new Date().toISOString(),
          },
          { merge: true },
        );

      handleClose();
      onSaved();
    } catch (err: any) {
      setErrorMsg(
        err?.message || "Failed to update birthdate. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (!visible) return null;

  const month = step === "confirm" ? confirmMonth : newMonth;
  const day = step === "confirm" ? confirmDay : newDay;
  const year = step === "confirm" ? confirmYear : newYear;

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
      <TouchableWithoutFeedback onPress={handleClose}>
        <View
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: "rgba(0,0,0,0.55)" },
          ]}
        />
      </TouchableWithoutFeedback>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "padding"}
        style={styles.sheetKAV}
        keyboardVerticalOffset={0}
      >
        <View
          style={[
            styles.sheet,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.sheetHandle} />

          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: colors.text }]}>
              {step === "confirm"
                ? "Verify Current Birthdate"
                : "Enter New Birthdate"}
            </Text>
            <TouchableOpacity onPress={handleClose} hitSlop={12}>
              <Ionicons name="close" size={22} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.sheetSub, { color: colors.textSecondary }]}>
            {step === "confirm"
              ? "Confirm your current birthdate before making changes."
              : "Enter your new date of birth. This may affect your content settings."}
          </Text>

          <View style={styles.dobRow}>
            {/* MONTH */}
            <View style={styles.dobField}>
              <Text style={[styles.dobLabel, { color: colors.textTertiary }]}>
                MM
              </Text>
              <View
                style={[
                  styles.dobBox,
                  {
                    backgroundColor: colors.surface,
                    borderColor:
                      month.length > 0 ? colors.primary : colors.border,
                  },
                ]}
              >
                <TextInput
                  style={[styles.dobText, { color: colors.text }]}
                  value={month}
                  onChangeText={(v) => {
                    const n = v.replace(/\D/g, "").slice(0, 2);
                    step === "confirm" ? setConfirmMonth(n) : setNewMonth(n);
                    if (n.length === 2)
                      (step === "confirm"
                        ? dayConfirmRef
                        : dayNewRef
                      ).current?.focus();
                  }}
                  keyboardType="number-pad"
                  placeholder="09"
                  placeholderTextColor={colors.textTertiary}
                  maxLength={2}
                  textAlign="center"
                  returnKeyType="next"
                />
              </View>
            </View>

            <Text style={[styles.dobSep, { color: colors.textTertiary }]}>
              /
            </Text>

            {/* DAY */}
            <View style={styles.dobField}>
              <Text style={[styles.dobLabel, { color: colors.textTertiary }]}>
                DD
              </Text>
              <View
                style={[
                  styles.dobBox,
                  {
                    backgroundColor: colors.surface,
                    borderColor:
                      day.length > 0 ? colors.primary : colors.border,
                  },
                ]}
              >
                <TextInput
                  ref={step === "confirm" ? dayConfirmRef : dayNewRef}
                  style={[styles.dobText, { color: colors.text }]}
                  value={day}
                  onChangeText={(v) => {
                    const n = v.replace(/\D/g, "").slice(0, 2);
                    step === "confirm" ? setConfirmDay(n) : setNewDay(n);
                    if (n.length === 2)
                      (step === "confirm"
                        ? yearConfirmRef
                        : yearNewRef
                      ).current?.focus();
                  }}
                  keyboardType="number-pad"
                  placeholder="28"
                  placeholderTextColor={colors.textTertiary}
                  maxLength={2}
                  textAlign="center"
                  returnKeyType="next"
                />
              </View>
            </View>

            <Text style={[styles.dobSep, { color: colors.textTertiary }]}>
              /
            </Text>

            {/* YEAR */}
            <View style={[styles.dobField, { flex: IS_SMALL ? 1.4 : 1.6 }]}>
              <Text style={[styles.dobLabel, { color: colors.textTertiary }]}>
                YYYY
              </Text>
              <View
                style={[
                  styles.dobBox,
                  {
                    backgroundColor: colors.surface,
                    borderColor:
                      year.length > 0 ? colors.primary : colors.border,
                  },
                ]}
              >
                <TextInput
                  ref={step === "confirm" ? yearConfirmRef : yearNewRef}
                  style={[styles.dobText, { color: colors.text }]}
                  value={year}
                  onChangeText={(v) => {
                    const n = v.replace(/\D/g, "").slice(0, 4);
                    step === "confirm" ? setConfirmYear(n) : setNewYear(n);
                  }}
                  keyboardType="number-pad"
                  placeholder="2004"
                  placeholderTextColor={colors.textTertiary}
                  maxLength={4}
                  textAlign="center"
                  returnKeyType="done"
                  onSubmitEditing={
                    step === "confirm" ? handleVerify : handleSave
                  }
                />
              </View>
            </View>
          </View>

          {/* Inline error — no Alert */}
          {!!errorMsg && (
            <View
              style={[
                styles.errorBox,
                { backgroundColor: "#EF444420", borderColor: "#EF4444" },
              ]}
            >
              <Ionicons
                name="alert-circle-outline"
                size={15}
                color="#EF4444"
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.errorText, { color: "#EF4444" }]}>
                {errorMsg}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.sheetBtn,
              { backgroundColor: colors.primary },
              saving && { opacity: 0.6 },
            ]}
            onPress={step === "confirm" ? handleVerify : handleSave}
            disabled={saving}
            activeOpacity={0.88}
          >
            <Text style={styles.sheetBtnText}>
              {saving
                ? "Saving…"
                : step === "confirm"
                  ? "Verify"
                  : "Save Birthdate"}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function EditProfileScreen() {
  const { profile, user, updateProfile: updateProfileMutation } = useAuth();
  const { colors, isDark } = useTheme();

  const [formData, setFormData] = useState({
    full_name: profile?.full_name || "",
    username: profile?.username || "",
    bio: profile?.bio || "",
    location: (profile as any)?.location || "",
  });
  const [avatar, setAvatar] = useState(profile?.avatar_url || "");
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [showBirthdateSheet, setShowBirthdateSheet] = useState(false);

  const currentBirthdate = (profile as any)?.birthdate as string | null;
  const currentAgeGroup = (profile as any)?.age_group as string | null;

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || "",
        username: profile.username || "",
        bio: profile.bio || "",
        location: (profile as any)?.location || "",
      });
      setAvatar(profile.avatar_url || "");
    }
  }, [profile]);

  const displayAvatar = useMemo(() => {
    if (!avatar) return "";
    const join = avatar.includes("?") ? "&" : "?";
    return `${avatar}${join}t=${Date.now()}`;
  }, [avatar]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission required",
        "We need camera roll permissions to upload photos.",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (result.canceled) return;
    const pickedUri = result.assets?.[0]?.uri;
    if (!pickedUri) {
      Alert.alert("Error", "Could not read selected image.");
      return;
    }
    setAvatar(pickedUri);
    await uploadAvatar(pickedUri);
  };

  const uploadAvatar = async (uri: string) => {
    if (!user?.uid) {
      Alert.alert("Error", "User not found. Please log in again.");
      return;
    }
    setIsUploadingAvatar(true);
    try {
      const ext = guessExtFromUri(uri);
      const fileRef = storage().ref(`avatars/${user.uid}/${Date.now()}.${ext}`);
      await fileRef.putFile(uri, { contentType: guessMimeType(ext) });
      const publicUrl = await fileRef.getDownloadURL();
      if (!publicUrl) throw new Error("Could not create download URL.");
      setAvatar(publicUrl);
      Alert.alert("Success", "Avatar uploaded! Tap Continue to save.");
    } catch (e: any) {
      Alert.alert("Upload Failed", e?.message || "Failed to upload avatar.");
      setAvatar(profile?.avatar_url || "");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    if (!formData.username.trim()) {
      Alert.alert("Validation Error", "Username is required");
      return;
    }
    if (formData.username.length < 3) {
      Alert.alert("Validation Error", "Username must be at least 3 characters");
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      Alert.alert(
        "Validation Error",
        "Username can only contain letters, numbers, and underscores",
      );
      return;
    }

    try {
      const updates: any = {
        full_name: formData.full_name || null,
        username: formData.username.toLowerCase(),
        bio: formData.bio || null,
        location: formData.location || null,
        ...(avatar !== profile?.avatar_url && { avatar_url: avatar }),
      };
      await updateProfileMutation.mutateAsync(updates);
      Alert.alert("Success", "Profile updated successfully!", [
        { text: "OK", onPress: () => router.replace("/(tabs)/profile") },
      ]);
    } catch (error: any) {
      let msg = "Failed to update profile";
      if (error?.message?.includes("already taken"))
        msg = "This username is already taken";
      else if (error?.message) msg = error.message;
      Alert.alert("Update Failed", msg);
    }
  };

  const isLoading = isUploadingAvatar || updateProfileMutation.isPending;

  return (
    <>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={[styles.header, { backgroundColor: colors.background }]}>
          <TouchableOpacity
            style={[
              styles.headerBtn,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                shadowOpacity: isDark ? 0.22 : 0.08,
              },
            ]}
            onPress={() => router.back()}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Edit Profile
          </Text>
          <TouchableOpacity
            style={[
              styles.headerBtn,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                shadowOpacity: isDark ? 0.22 : 0.08,
              },
            ]}
            onPress={handleSave}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            <Ionicons
              name="checkmark"
              size={22}
              color={isLoading ? colors.textTertiary : colors.primary}
            />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        >
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Avatar */}
            <TouchableOpacity
              style={styles.avatarContainer}
              onPress={pickImage}
              disabled={isLoading}
              activeOpacity={0.9}
            >
              {avatar ? (
                <Image source={{ uri: displayAvatar }} style={styles.avatar} />
              ) : (
                <View
                  style={[
                    styles.avatarPlaceholder,
                    { backgroundColor: colors.surface },
                  ]}
                >
                  <Ionicons
                    name="person"
                    size={48}
                    color={colors.textTertiary}
                  />
                </View>
              )}
              {isLoading && (
                <View style={styles.avatarOverlay}>
                  <Text style={styles.avatarOverlayText}>
                    {isUploadingAvatar ? "Uploading…" : "Saving…"}
                  </Text>
                </View>
              )}
              {!isLoading && (
                <View
                  style={[
                    styles.cameraBadge,
                    {
                      backgroundColor: colors.primary,
                      borderColor: colors.background,
                    },
                  ]}
                >
                  <Ionicons name="camera" size={20} color="#fff" />
                </View>
              )}
            </TouchableOpacity>

            {/* Profile fields */}
            <View style={[styles.formCard, { backgroundColor: colors.card }]}>
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Name</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Ionicons
                    name="person-outline"
                    size={20}
                    color={colors.textTertiary}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    value={formData.full_name}
                    onChangeText={(t) =>
                      setFormData({ ...formData, full_name: t })
                    }
                    placeholder="Enter your full name"
                    placeholderTextColor={colors.placeholder}
                    editable={!isLoading}
                  />
                </View>
              </View>
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text }]}>
                  Username
                </Text>
                <View
                  style={[
                    styles.inputWrapper,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Ionicons
                    name="at"
                    size={20}
                    color={colors.textTertiary}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    value={formData.username}
                    onChangeText={(t) =>
                      setFormData({ ...formData, username: t.toLowerCase() })
                    }
                    placeholder="username"
                    placeholderTextColor={colors.placeholder}
                    autoCapitalize="none"
                    editable={!isLoading}
                  />
                </View>
              </View>
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text }]}>
                  Location
                </Text>
                <View
                  style={[
                    styles.inputWrapper,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Ionicons
                    name="location-outline"
                    size={20}
                    color={colors.textTertiary}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    value={formData.location}
                    onChangeText={(t) =>
                      setFormData({ ...formData, location: t })
                    }
                    placeholder="Let others know where you're based"
                    placeholderTextColor={colors.placeholder}
                    editable={!isLoading}
                  />
                </View>
              </View>
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Bio</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    styles.bioWrapper,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Ionicons
                    name="information-circle-outline"
                    size={20}
                    color={colors.textTertiary}
                    style={styles.bioIcon}
                  />
                  <TextInput
                    style={[
                      styles.input,
                      styles.bioInput,
                      { color: colors.text },
                    ]}
                    value={formData.bio}
                    onChangeText={(t) => setFormData({ ...formData, bio: t })}
                    placeholder="Tell us about yourself"
                    placeholderTextColor={colors.placeholder}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    maxLength={200}
                    editable={!isLoading}
                  />
                </View>
                <Text
                  style={[styles.charCount, { color: colors.textTertiary }]}
                >
                  {formData.bio.length}/200 characters
                </Text>
              </View>
            </View>

            {/* DOB section */}
            <View style={[styles.formCard, { backgroundColor: colors.card }]}>
              <View style={styles.dobSectionHeader}>
                <Text style={[styles.label, { color: colors.text }]}>
                  Date of Birth
                </Text>
              </View>
              <View style={styles.dobLockedRow}>
                <View
                  style={[
                    styles.dobLockedValue,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={18}
                    color={colors.textTertiary}
                    style={{ marginRight: 8 }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[styles.dobLockedText, { color: colors.text }]}
                    >
                      {currentBirthdate
                        ? formatBirthdate(currentBirthdate)
                        : "Not set"}
                    </Text>
                    <Text
                      style={[
                        styles.dobSubText,
                        { color: colors.textTertiary },
                      ]}
                    >
                      {currentAgeGroup === "adult"
                        ? "Adult (18+)"
                        : currentAgeGroup === "teen"
                          ? "Teen (13–17) — Some content restricted"
                          : currentAgeGroup === "under_13"
                            ? "Under 13 — Parental approval required"
                            : "Not verified"}
                      {" · "}
                      <Text style={{ color: colors.primary }}>
                        Not shown publicly
                      </Text>
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.dobChangeBtn, { borderColor: colors.primary }]}
                  onPress={() => setShowBirthdateSheet(true)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[styles.dobChangeBtnText, { color: colors.primary }]}
                  >
                    Change
                  </Text>
                </TouchableOpacity>
              </View>
              <View
                style={[
                  styles.ageNotice,
                  {
                    backgroundColor: colors.primary + "08",
                    borderColor: colors.primary + "20",
                  },
                ]}
              >
                <Ionicons
                  name="shield-checkmark-outline"
                  size={15}
                  color={colors.primary}
                />
                <Text
                  style={[styles.ageNoticeText, { color: colors.textTertiary }]}
                >
                  Your birthdate is used to keep NebulaNet safe. Providing a
                  false birthdate violates our Terms of Service and may result
                  in account suspension.
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.continueButton,
                { backgroundColor: colors.primary },
                isLoading && { opacity: 0.55 },
              ]}
              onPress={handleSave}
              disabled={isLoading}
              activeOpacity={0.9}
            >
              <Text style={styles.continueButtonText}>
                {isLoading ? "Saving..." : "Continue"}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* DOB sheet — plain View overlay outside SafeAreaView so KAV works on Android */}
      {user?.uid && (
        <BirthdateSheet
          visible={showBirthdateSheet}
          uid={user.uid}
          currentBirthdate={currentBirthdate}
          currentAgeGroup={currentAgeGroup}
          onClose={() => setShowBirthdateSheet(false)}
          onSaved={() =>
            Alert.alert(
              "Birthdate Updated",
              "Your birthdate has been updated successfully.",
            )
          }
          colors={colors}
          isDark={isDark}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 3,
  },
  headerTitle: { fontSize: 18, fontWeight: "800" },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },
  avatarContainer: {
    alignSelf: "center",
    marginVertical: 24,
    position: "relative",
  },
  avatar: { width: 120, height: 120, borderRadius: 60 },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarOverlay: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarOverlayText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  cameraBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
  },
  formCard: { borderRadius: 16, padding: 20, gap: 20, marginBottom: 16 },
  inputGroup: { gap: 8 },
  label: { fontSize: 14, fontWeight: "800" },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  bioWrapper: { alignItems: "flex-start", paddingVertical: 12 },
  inputIcon: { marginRight: 8 },
  bioIcon: { marginRight: 8, marginTop: 2 },
  input: { flex: 1, fontSize: 15, paddingVertical: 12 },
  bioInput: { minHeight: 80, paddingVertical: 0 },
  charCount: { fontSize: 12, alignSelf: "flex-end" },
  continueButton: {
    paddingVertical: 18,
    borderRadius: 28,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 5,
  },
  continueButtonText: { color: "#FFFFFF", fontSize: 17, fontWeight: "800" },
  // DOB
  dobSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dobLockedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
  },
  dobLockedValue: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
  },
  dobLockedText: { fontSize: 15, fontWeight: "600" },
  dobSubText: { fontSize: 11, marginTop: 2 },
  dobChangeBtn: {
    borderRadius: 10,
    borderWidth: 1.5,
    paddingHorizontal: IS_SMALL ? 10 : 14,
    paddingVertical: 10,
  },
  dobChangeBtnText: { fontSize: IS_SMALL ? 13 : 14, fontWeight: "700" },
  ageNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
  },
  ageNoticeText: { flex: 1, fontSize: 12, lineHeight: 17 },
  // Sheet
  sheetKAV: { position: "absolute", bottom: 0, left: 0, right: 0 },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingBottom: 36,
    borderTopWidth: 1,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(150,150,150,0.35)",
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  sheetTitle: { fontSize: 17, fontWeight: "800" },
  sheetSub: { fontSize: 13, lineHeight: 18, marginBottom: 16 },
  dobRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: IS_SMALL ? 2 : 4,
  },
  dobField: { alignItems: "center", flex: 1 },
  dobLabel: {
    fontSize: IS_SMALL ? 9 : 11,
    fontWeight: "700",
    marginBottom: 6,
    textAlign: "center",
  },
  dobBox: {
    width: "100%",
    borderRadius: 10,
    borderWidth: 1.5,
    paddingVertical: IS_SMALL ? 8 : 10,
    alignItems: "center",
  },
  dobText: { fontSize: IS_SMALL ? 16 : 20, fontWeight: "700" },
  dobSep: {
    fontSize: IS_SMALL ? 18 : 22,
    fontWeight: "700",
    paddingBottom: IS_SMALL ? 8 : 10,
    alignSelf: "flex-end",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
    marginTop: 10,
  },
  errorText: { flex: 1, fontSize: 12, fontWeight: "600", lineHeight: 17 },
  sheetBtn: {
    marginTop: 16,
    paddingVertical: 16,
    borderRadius: 24,
    alignItems: "center",
  },
  sheetBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});
