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
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
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

// ─── DOB Verification Modal ───────────────────────────────────────────────────
// Props include uid so we can do the Firestore check here without any hooks.
// onVerified is called only when the entered DOB matches the stored one.
function BirthdateVerifyModal({
  visible,
  uid,
  onClose,
  onVerified,
  colors,
  isDark,
}: {
  visible: boolean;
  uid: string;
  onClose: () => void;
  onVerified: () => void;
  colors: any;
  isDark: boolean;
}) {
  const [month, setMonth] = useState("");
  const [day, setDay] = useState("");
  const [year, setYear] = useState("");
  const [verifying, setVerifying] = useState(false);

  const dayRef = useRef<TextInput>(null);
  const yearRef = useRef<TextInput>(null);

  const reset = () => {
    setMonth("");
    setDay("");
    setYear("");
    setVerifying(false);
  };

  const handleClose = () => {
    Keyboard.dismiss();
    reset();
    onClose();
  };

  const handleVerify = async () => {
    const mm = month.padStart(2, "0");
    const dd = day.padStart(2, "0");
    const yyyy = year;

    if (mm.length !== 2 || dd.length !== 2 || yyyy.length !== 4) {
      Alert.alert("Incomplete", "Please enter a valid MM / DD / YYYY date.");
      return;
    }

    // Build ISO string matching what birthdate.tsx writes: YYYY-MM-DD
    const entered = `${yyyy}-${mm}-${dd}`;
    setVerifying(true);

    try {
      const snap = await firestore().collection("profiles").doc(uid).get();
      // birthdate.tsx writes the field as "birthdate" — match that exactly
      const stored: string | undefined = snap.data()?.birthdate;

      if (!stored) {
        // No DOB on record yet — let them set one freely
        Keyboard.dismiss();
        reset();
        onVerified();
        return;
      }

      if (stored !== entered) {
        Alert.alert(
          "Incorrect Birthdate",
          "The birthdate you entered doesn't match our records. For security, we cannot update your birthdate.",
        );
        // Keep modal open so they can try again
        return;
      }

      // ✅ Match
      Keyboard.dismiss();
      reset();
      onVerified();
    } catch (e: any) {
      Alert.alert(
        "Error",
        e?.message || "Verification failed. Please try again.",
      );
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      {/* Dim backdrop — tap to dismiss */}
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.modalBackdrop} />
      </TouchableWithoutFeedback>

      {/*
        KAV sits at the bottom of the screen.
        On Android "height" shrinks the view; on iOS "padding" pushes it up.
        Both keep the sheet above the keyboard.
      */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalKAV}
        keyboardVerticalOffset={0}
      >
        <View
          style={[
            styles.modalSheet,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.modalHandle} />

          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Verify Current Birthdate
            </Text>
            <TouchableOpacity onPress={handleClose} hitSlop={12}>
              <Ionicons name="close" size={22} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.securityNote,
              {
                backgroundColor: isDark
                  ? "rgba(138,124,250,0.12)"
                  : "rgba(138,124,250,0.08)",
                borderColor: colors.primary + "40",
              },
            ]}
          >
            <Ionicons
              name="shield-checkmark-outline"
              size={18}
              color={colors.primary}
              style={{ marginRight: 8 }}
            />
            <Text
              style={[styles.securityNoteText, { color: colors.textSecondary }]}
            >
              For security, please confirm your current birthdate before making
              changes.
            </Text>
          </View>

          <Text
            style={[styles.securitySubText, { color: colors.textTertiary }]}
          >
            Your entered birthdate must match our records exactly.
          </Text>

          {/* MM / DD / YYYY inputs */}
          <View style={styles.dobRow}>
            {/* MONTH */}
            <View style={styles.dobFieldWrap}>
              <Text style={[styles.dobLabel, { color: colors.textTertiary }]}>
                MONTH
              </Text>
              <View
                style={[
                  styles.dobInput,
                  {
                    backgroundColor: colors.surface,
                    borderColor:
                      month.length > 0 ? colors.primary : colors.border,
                  },
                ]}
              >
                <TextInput
                  style={[styles.dobInputText, { color: colors.text }]}
                  value={month}
                  onChangeText={(v) => {
                    const num = v.replace(/[^0-9]/g, "").slice(0, 2);
                    setMonth(num);
                    if (num.length === 2) dayRef.current?.focus();
                  }}
                  keyboardType="number-pad"
                  placeholder="09"
                  placeholderTextColor={colors.textTertiary}
                  maxLength={2}
                  returnKeyType="next"
                  onSubmitEditing={() => dayRef.current?.focus()}
                  textAlign="center"
                />
              </View>
            </View>

            <Text style={[styles.dobSeparator, { color: colors.textTertiary }]}>
              /
            </Text>

            {/* DAY */}
            <View style={styles.dobFieldWrap}>
              <Text style={[styles.dobLabel, { color: colors.textTertiary }]}>
                DAY
              </Text>
              <View
                style={[
                  styles.dobInput,
                  {
                    backgroundColor: colors.surface,
                    borderColor:
                      day.length > 0 ? colors.primary : colors.border,
                  },
                ]}
              >
                <TextInput
                  ref={dayRef}
                  style={[styles.dobInputText, { color: colors.text }]}
                  value={day}
                  onChangeText={(v) => {
                    const num = v.replace(/[^0-9]/g, "").slice(0, 2);
                    setDay(num);
                    if (num.length === 2) yearRef.current?.focus();
                  }}
                  keyboardType="number-pad"
                  placeholder="28"
                  placeholderTextColor={colors.textTertiary}
                  maxLength={2}
                  returnKeyType="next"
                  onSubmitEditing={() => yearRef.current?.focus()}
                  textAlign="center"
                />
              </View>
            </View>

            <Text style={[styles.dobSeparator, { color: colors.textTertiary }]}>
              /
            </Text>

            {/* YEAR */}
            <View style={[styles.dobFieldWrap, styles.dobYearField]}>
              <Text style={[styles.dobLabel, { color: colors.textTertiary }]}>
                YEAR
              </Text>
              <View
                style={[
                  styles.dobInput,
                  styles.dobYearInput,
                  {
                    backgroundColor: colors.surface,
                    borderColor:
                      year.length > 0 ? colors.primary : colors.border,
                  },
                ]}
              >
                <TextInput
                  ref={yearRef}
                  style={[styles.dobInputText, { color: colors.text }]}
                  value={year}
                  onChangeText={(v) => {
                    setYear(v.replace(/[^0-9]/g, "").slice(0, 4));
                  }}
                  keyboardType="number-pad"
                  placeholder="2004"
                  placeholderTextColor={colors.textTertiary}
                  maxLength={4}
                  returnKeyType="done"
                  onSubmitEditing={handleVerify}
                  textAlign="center"
                />
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.verifyBtn,
              { backgroundColor: colors.primary },
              verifying && { opacity: 0.6 },
            ]}
            onPress={handleVerify}
            disabled={verifying}
            activeOpacity={0.88}
          >
            <Text style={styles.verifyBtnText}>
              {verifying ? "Verifying…" : "Verify"}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
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

  // DOB state
  const [dobModalVisible, setDobModalVisible] = useState(false);
  const [dobVerified, setDobVerified] = useState(false);
  const [newDobMonth, setNewDobMonth] = useState("");
  const [newDobDay, setNewDobDay] = useState("");
  const [newDobYear, setNewDobYear] = useState("");

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
      const mimeType = guessMimeType(ext);
      const filePath = `avatars/${user.uid}/${Date.now()}.${ext}`;
      const fileRef = storage().ref(filePath);
      await fileRef.putFile(uri, { contentType: mimeType });
      const publicUrl = await fileRef.getDownloadURL();
      if (!publicUrl)
        throw new Error("Could not create download URL for avatar.");
      setAvatar(publicUrl);
      Alert.alert(
        "Success",
        "Avatar uploaded! Click Continue to save your changes.",
      );
    } catch (e: any) {
      console.error("Avatar upload error:", e);
      Alert.alert(
        "Upload Failed",
        e?.message || "Failed to upload avatar. Please try again.",
      );
      setAvatar(profile?.avatar_url || "");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // ── DOB verification flow ─────────────────────────────────────────────────
  const handleDobChangePress = () => {
    setDobVerified(false);
    setNewDobMonth("");
    setNewDobDay("");
    setNewDobYear("");
    setDobModalVisible(true);
  };

  // Called by modal only after Firestore confirms the entered DOB matches
  const handleDobVerified = () => {
    setDobVerified(true);
    setDobModalVisible(false);
  };

  // ── Main save ─────────────────────────────────────────────────────────────
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

    // Build new DOB string synchronously right here — no setState needed
    let newBirthdate: string | null = null;
    if (dobVerified && (newDobMonth || newDobDay || newDobYear)) {
      const mm = newDobMonth.padStart(2, "0");
      const dd = newDobDay.padStart(2, "0");
      const yyyy = newDobYear;
      if (mm.length !== 2 || dd.length !== 2 || yyyy.length !== 4) {
        Alert.alert(
          "Validation Error",
          "Please complete the new date of birth (MM/DD/YYYY).",
        );
        return;
      }
      newBirthdate = `${yyyy}-${mm}-${dd}`;
    }

    try {
      const updates: any = {
        full_name: formData.full_name || null,
        username: formData.username.toLowerCase(),
        bio: formData.bio || null,
        location: formData.location || null,
        ...(avatar !== profile?.avatar_url && { avatar_url: avatar }),
      };

      // Write "birthdate" — same field name birthdate.tsx uses
      if (newBirthdate) {
        updates.birthdate = newBirthdate;
      }

      await updateProfileMutation.mutateAsync(updates);
      Alert.alert("Success", "Profile updated successfully!");
      setTimeout(() => router.back(), 300);
    } catch (error: any) {
      console.error("Save profile error:", error);
      let errorMessage = "Failed to update profile";
      if (
        error?.message?.includes("duplicate") &&
        error?.message?.includes("username")
      ) {
        errorMessage = "This username is already taken";
      } else if (error?.message?.includes("already taken")) {
        errorMessage = "This username is already taken";
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (error?.code) {
        errorMessage = error.code;
      }
      Alert.alert("Update Failed", errorMessage);
    }
  };

  const isLoading = isUploadingAvatar || updateProfileMutation.isPending;

  // Read "birthdate" — matching what birthdate.tsx writes
  const currentDobDisplay = useMemo(() => {
    const raw: string | undefined = (profile as any)?.birthdate;
    if (!raw) return "Not set";
    const [yyyy, mm, dd] = raw.split("-");
    if (!yyyy || !mm || !dd) return raw; // fallback if format is unexpected
    return `${mm}/${dd}/${yyyy}`;
  }, [profile]);

  return (
    <>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        {/* Header */}
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
                    onChangeText={(text) =>
                      setFormData({ ...formData, full_name: text })
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
                    onChangeText={(text) =>
                      setFormData({ ...formData, username: text.toLowerCase() })
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
                    onChangeText={(text) =>
                      setFormData({ ...formData, location: text })
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
                    onChangeText={(text) =>
                      setFormData({ ...formData, bio: text })
                    }
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

            {/* ── Date of Birth Section ─────────────────────────────────── */}
            <View style={[styles.formCard, { backgroundColor: colors.card }]}>
              <View style={styles.dobSectionHeader}>
                <Text style={[styles.label, { color: colors.text }]}>
                  Date of Birth
                </Text>
                {dobVerified && (
                  <View style={styles.verifiedBadge}>
                    <Ionicons
                      name="shield-checkmark"
                      size={14}
                      color={colors.primary}
                    />
                    <Text
                      style={[
                        styles.verifiedBadgeText,
                        { color: colors.primary },
                      ]}
                    >
                      Verified
                    </Text>
                  </View>
                )}
              </View>

              {!dobVerified ? (
                // Locked state — show current value + Change button
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
                    <Text
                      style={[styles.dobLockedText, { color: colors.text }]}
                    >
                      {currentDobDisplay}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.dobChangeBtn,
                      { borderColor: colors.primary },
                    ]}
                    onPress={handleDobChangePress}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.dobChangeBtnText,
                        { color: colors.primary },
                      ]}
                    >
                      Change
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                // Verified — show new DOB entry fields
                <>
                  <Text
                    style={[styles.dobHint, { color: colors.textTertiary }]}
                  >
                    Enter your new date of birth
                  </Text>
                  <View style={styles.dobRow}>
                    <View style={styles.dobFieldWrap}>
                      <Text
                        style={[
                          styles.dobLabel,
                          { color: colors.textTertiary },
                        ]}
                      >
                        MONTH
                      </Text>
                      <View
                        style={[
                          styles.dobInput,
                          {
                            backgroundColor: colors.surface,
                            borderColor:
                              newDobMonth.length > 0
                                ? colors.primary
                                : colors.border,
                          },
                        ]}
                      >
                        <TextInput
                          style={[styles.dobInputText, { color: colors.text }]}
                          value={newDobMonth}
                          onChangeText={(v) =>
                            setNewDobMonth(v.replace(/[^0-9]/g, "").slice(0, 2))
                          }
                          keyboardType="number-pad"
                          placeholder="MM"
                          placeholderTextColor={colors.textTertiary}
                          maxLength={2}
                          textAlign="center"
                        />
                      </View>
                    </View>
                    <Text
                      style={[
                        styles.dobSeparator,
                        { color: colors.textTertiary },
                      ]}
                    >
                      /
                    </Text>
                    <View style={styles.dobFieldWrap}>
                      <Text
                        style={[
                          styles.dobLabel,
                          { color: colors.textTertiary },
                        ]}
                      >
                        DAY
                      </Text>
                      <View
                        style={[
                          styles.dobInput,
                          {
                            backgroundColor: colors.surface,
                            borderColor:
                              newDobDay.length > 0
                                ? colors.primary
                                : colors.border,
                          },
                        ]}
                      >
                        <TextInput
                          style={[styles.dobInputText, { color: colors.text }]}
                          value={newDobDay}
                          onChangeText={(v) =>
                            setNewDobDay(v.replace(/[^0-9]/g, "").slice(0, 2))
                          }
                          keyboardType="number-pad"
                          placeholder="DD"
                          placeholderTextColor={colors.textTertiary}
                          maxLength={2}
                          textAlign="center"
                        />
                      </View>
                    </View>
                    <Text
                      style={[
                        styles.dobSeparator,
                        { color: colors.textTertiary },
                      ]}
                    >
                      /
                    </Text>
                    <View style={[styles.dobFieldWrap, styles.dobYearField]}>
                      <Text
                        style={[
                          styles.dobLabel,
                          { color: colors.textTertiary },
                        ]}
                      >
                        YEAR
                      </Text>
                      <View
                        style={[
                          styles.dobInput,
                          styles.dobYearInput,
                          {
                            backgroundColor: colors.surface,
                            borderColor:
                              newDobYear.length > 0
                                ? colors.primary
                                : colors.border,
                          },
                        ]}
                      >
                        <TextInput
                          style={[styles.dobInputText, { color: colors.text }]}
                          value={newDobYear}
                          onChangeText={(v) =>
                            setNewDobYear(v.replace(/[^0-9]/g, "").slice(0, 4))
                          }
                          keyboardType="number-pad"
                          placeholder="YYYY"
                          placeholderTextColor={colors.textTertiary}
                          maxLength={4}
                          textAlign="center"
                        />
                      </View>
                    </View>
                  </View>
                </>
              )}
            </View>

            {/* Save button */}
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

      {/* DOB verify modal — outside SafeAreaView so it covers the full screen */}
      {user?.uid ? (
        <BirthdateVerifyModal
          visible={dobModalVisible}
          uid={user.uid}
          onClose={() => setDobModalVisible(false)}
          onVerified={handleDobVerified}
          colors={colors}
          isDark={isDark}
        />
      ) : null}
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
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
  formCard: { borderRadius: 16, padding: 20, gap: 20, marginBottom: 24 },
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

  // DOB section (main form)
  dobSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  verifiedBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
  verifiedBadgeText: { fontSize: 12, fontWeight: "700" },
  dobLockedRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  dobLockedValue: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderWidth: 1,
  },
  dobLockedText: { fontSize: 15, fontWeight: "600" },
  dobChangeBtn: {
    borderRadius: 10,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  dobChangeBtnText: { fontSize: 14, fontWeight: "700" },
  dobHint: { fontSize: 13, marginBottom: 4 },
  dobRow: { flexDirection: "row", alignItems: "flex-end", gap: 4 },
  dobFieldWrap: { alignItems: "center", flex: 1 },
  dobYearField: { flex: 1.6 },
  dobLabel: { fontSize: 11, fontWeight: "700", marginBottom: 6 },
  dobInput: {
    width: "100%",
    borderRadius: 10,
    borderWidth: 1.5,
    paddingVertical: 10,
    alignItems: "center",
  },
  dobYearInput: {},
  dobInputText: { fontSize: 20, fontWeight: "700" },
  dobSeparator: {
    fontSize: 22,
    fontWeight: "700",
    paddingBottom: 10,
    alignSelf: "flex-end",
  },

  // DOB modal
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  modalKAV: { position: "absolute", bottom: 0, left: 0, right: 0 },
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingBottom: 32,
    borderTopWidth: 1,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(150,150,150,0.35)",
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 4,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  modalTitle: { fontSize: 17, fontWeight: "800" },
  securityNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  securityNoteText: { flex: 1, fontSize: 13, lineHeight: 18 },
  securitySubText: { fontSize: 12, marginBottom: 16 },
  verifyBtn: {
    marginTop: 20,
    paddingVertical: 16,
    borderRadius: 24,
    alignItems: "center",
  },
  verifyBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});
