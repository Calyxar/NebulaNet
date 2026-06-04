// app/profile/edit.tsx ✅ — with birthdate display, change, and age enforcement
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import firestore from "@react-native-firebase/firestore";
import storage from "@react-native-firebase/storage";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
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

  // ─── Birthdate change modal state ─────────────────────────
  const [showBirthdateModal, setShowBirthdateModal] = useState(false);
  const [bdStep, setBdStep] = useState<"confirm" | "new">("confirm");
  const [confirmMonth, setConfirmMonth] = useState("");
  const [confirmDay, setConfirmDay] = useState("");
  const [confirmYear, setConfirmYear] = useState("");
  const [newMonth, setNewMonth] = useState("");
  const [newDay, setNewDay] = useState("");
  const [newYear, setNewYear] = useState("");
  const [bdSaving, setBdSaving] = useState(false);

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
      const mimeType = guessMimeType(ext);
      const fileName = `${Date.now()}.${ext}`;
      const filePath = `avatars/${user.uid}/${fileName}`;
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

  const handleSave = async () => {
    if (!formData.username.trim()) {
      Alert.alert("Validation Error", "Username is required");
      return;
    }
    if (formData.username.length < 3) {
      Alert.alert("Validation Error", "Username must be at least 3 characters");
      return;
    }
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(formData.username)) {
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
      }
      Alert.alert("Update Failed", errorMessage);
    }
  };

  // ─── Birthdate change logic ────────────────────────────────
  const openBirthdateModal = () => {
    setBdStep("confirm");
    setConfirmMonth("");
    setConfirmDay("");
    setConfirmYear("");
    setNewMonth("");
    setNewDay("");
    setNewYear("");
    setShowBirthdateModal(true);
  };

  const isValidDate = (m: string, d: string, y: string) => {
    const month = parseInt(m);
    const day = parseInt(d);
    const year = parseInt(y);
    if (!month || !day || !year) return false;
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;
    if (year < 1900 || year > new Date().getFullYear()) return false;
    const date = new Date(year, month - 1, day);
    return (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    );
  };

  const handleConfirmCurrentBirthdate = () => {
    if (!isValidDate(confirmMonth, confirmDay, confirmYear)) {
      Alert.alert("Invalid Date", "Please enter a valid date.");
      return;
    }
    const entered = `${confirmYear.padStart(4, "0")}-${confirmMonth.padStart(2, "0")}-${confirmDay.padStart(2, "0")}`;
    if (entered !== currentBirthdate) {
      Alert.alert(
        "Incorrect Birthdate",
        "The birthdate you entered doesn't match our records. For security, we cannot update your birthdate.",
      );
      return;
    }
    setBdStep("new");
  };

  const handleSaveNewBirthdate = async () => {
    if (!isValidDate(newMonth, newDay, newYear)) {
      Alert.alert("Invalid Date", "Please enter a valid date of birth.");
      return;
    }

    const newBirthdate = new Date(
      parseInt(newYear),
      parseInt(newMonth) - 1,
      parseInt(newDay),
    );
    const newAge = calculateAge(newBirthdate);
    const newAgeGroup = getAgeGroup(newAge);
    const newBirthdateIso = `${newYear.padStart(4, "0")}-${newMonth.padStart(2, "0")}-${newDay.padStart(2, "0")}`;

    // ✅ Prevent lying about age — if previously adult/teen, can't suddenly be under_13
    // without going through the full parental approval flow
    if (currentAgeGroup === "adult" && newAgeGroup === "under_13") {
      Alert.alert(
        "Age Verification Required",
        "This birthdate indicates you are under 13. Please contact support if you believe this is an error.",
      );
      return;
    }

    // ✅ Warn if downgrading from adult to teen
    if (currentAgeGroup === "adult" && newAgeGroup === "teen") {
      Alert.alert(
        "Age Change Detected",
        "Changing your birthdate to indicate you are under 18 will restrict certain content. Are you sure?",
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
    if (!user?.uid) return;
    setBdSaving(true);
    try {
      // ✅ If under 13, route to parental approval
      if (newAgeGroup === "under_13") {
        setShowBirthdateModal(false);
        router.push({
          pathname: "/(auth)/parental-approval",
          params: {
            birthdate: birthdateIso,
            age: calculateAge(new Date(birthdateIso)).toString(),
          },
        } as any);
        return;
      }

      await firestore().collection("profiles").doc(user.uid).update({
        birthdate: birthdateIso,
        age_group: newAgeGroup,
        updated_at: new Date().toISOString(),
        updated_at_ts: firestore.FieldValue.serverTimestamp(),
      });

      // ✅ Apply or lift content restrictions based on new age group
      if (newAgeGroup === "teen") {
        await firestore()
          .collection("user_settings")
          .doc(user.uid)
          .set(
            { nsfw_locked: true, updated_at: new Date().toISOString() },
            { merge: true },
          );
      } else if (newAgeGroup === "adult") {
        await firestore()
          .collection("user_settings")
          .doc(user.uid)
          .set(
            { nsfw_locked: false, updated_at: new Date().toISOString() },
            { merge: true },
          );
      }

      setShowBirthdateModal(false);
      Alert.alert(
        "Birthdate Updated",
        "Your birthdate has been updated successfully.",
      );
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to update birthdate.");
    } finally {
      setBdSaving(false);
    }
  };

  const isLoading = isUploadingAvatar || updateProfileMutation.isPending;

  // ─── Birthdate modal ──────────────────────────────────────
  const BirthdateModal = () => (
    <Modal
      visible={showBirthdateModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowBirthdateModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {bdStep === "confirm"
                ? "Verify Current Birthdate"
                : "Enter New Birthdate"}
            </Text>
            <TouchableOpacity
              onPress={() => setShowBirthdateModal(false)}
              activeOpacity={0.8}
            >
              <Ionicons name="close" size={22} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
            {bdStep === "confirm"
              ? "For security, please confirm your current birthdate before making changes."
              : "Enter your new date of birth. This will be verified and may affect your content settings."}
          </Text>

          {bdStep === "confirm" && (
            <View
              style={[
                styles.noticeBanner,
                {
                  backgroundColor: colors.primary + "12",
                  borderColor: colors.primary + "30",
                },
              ]}
            >
              <Ionicons
                name="shield-checkmark-outline"
                size={16}
                color={colors.primary}
              />
              <Text
                style={[styles.noticeText, { color: colors.textSecondary }]}
              >
                Your entered birthdate must match our records exactly.
              </Text>
            </View>
          )}

          {bdStep === "new" && (
            <View
              style={[
                styles.noticeBanner,
                {
                  backgroundColor: "#FF9500" + "12",
                  borderColor: "#FF9500" + "30",
                },
              ]}
            >
              <Ionicons name="warning-outline" size={16} color="#FF9500" />
              <Text
                style={[styles.noticeText, { color: colors.textSecondary }]}
              >
                Changing your age may affect content restrictions on your
                account.
              </Text>
            </View>
          )}

          <View style={styles.dateRow}>
            {/* Month */}
            <View style={styles.dateFieldWrap}>
              <Text style={[styles.dateLabel, { color: colors.textTertiary }]}>
                Month
              </Text>
              <TextInput
                style={[
                  styles.dateInput,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                placeholder="MM"
                placeholderTextColor={colors.textTertiary}
                value={bdStep === "confirm" ? confirmMonth : newMonth}
                onChangeText={(v) => {
                  const clean = v.replace(/\D/g, "").slice(0, 2);
                  bdStep === "confirm"
                    ? setConfirmMonth(clean)
                    : setNewMonth(clean);
                }}
                keyboardType="number-pad"
                maxLength={2}
              />
            </View>
            <Text style={[styles.dateSep, { color: colors.textTertiary }]}>
              /
            </Text>
            {/* Day */}
            <View style={styles.dateFieldWrap}>
              <Text style={[styles.dateLabel, { color: colors.textTertiary }]}>
                Day
              </Text>
              <TextInput
                style={[
                  styles.dateInput,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                placeholder="DD"
                placeholderTextColor={colors.textTertiary}
                value={bdStep === "confirm" ? confirmDay : newDay}
                onChangeText={(v) => {
                  const clean = v.replace(/\D/g, "").slice(0, 2);
                  bdStep === "confirm"
                    ? setConfirmDay(clean)
                    : setNewDay(clean);
                }}
                keyboardType="number-pad"
                maxLength={2}
              />
            </View>
            <Text style={[styles.dateSep, { color: colors.textTertiary }]}>
              /
            </Text>
            {/* Year */}
            <View style={[styles.dateFieldWrap, { flex: 2 }]}>
              <Text style={[styles.dateLabel, { color: colors.textTertiary }]}>
                Year
              </Text>
              <TextInput
                style={[
                  styles.dateInput,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                placeholder="YYYY"
                placeholderTextColor={colors.textTertiary}
                value={bdStep === "confirm" ? confirmYear : newYear}
                onChangeText={(v) => {
                  const clean = v.replace(/\D/g, "").slice(0, 4);
                  bdStep === "confirm"
                    ? setConfirmYear(clean)
                    : setNewYear(clean);
                }}
                keyboardType="number-pad"
                maxLength={4}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.modalBtn, { backgroundColor: colors.primary }]}
            onPress={
              bdStep === "confirm"
                ? handleConfirmCurrentBirthdate
                : handleSaveNewBirthdate
            }
            disabled={bdSaving}
            activeOpacity={0.9}
          >
            <Text style={styles.modalBtnText}>
              {bdSaving
                ? "Saving..."
                : bdStep === "confirm"
                  ? "Verify"
                  : "Save Birthdate"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

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

            {/* Form fields */}
            <View style={[styles.formCard, { backgroundColor: colors.card }]}>
              {/* Full Name */}
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

              {/* Username */}
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

              {/* Location */}
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

              {/* Bio */}
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

            {/* ✅ Birthdate section */}
            <View style={[styles.formCard, { backgroundColor: colors.card }]}>
              <View style={styles.birthdateRow}>
                <View
                  style={[
                    styles.birthdateIconWrap,
                    { backgroundColor: colors.primary + "18" },
                  ]}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={20}
                    color={colors.primary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { color: colors.text }]}>
                    Date of Birth
                  </Text>
                  <Text
                    style={[
                      styles.birthdateValue,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {currentBirthdate
                      ? formatBirthdate(currentBirthdate)
                      : "Not set"}
                  </Text>
                  <Text
                    style={[
                      styles.birthdateNote,
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
                <TouchableOpacity
                  style={[
                    styles.changeBtn,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={openBirthdateModal}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[styles.changeBtnText, { color: colors.primary }]}
                  >
                    Change
                  </Text>
                </TouchableOpacity>
              </View>

              {/* ✅ Age enforcement notice */}
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

      <BirthdateModal />
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

  // Birthdate
  birthdateRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  birthdateIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  birthdateValue: { fontSize: 15, fontWeight: "700", marginTop: 2 },
  birthdateNote: { fontSize: 12, marginTop: 3, lineHeight: 16 },
  changeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  changeBtnText: { fontSize: 13, fontWeight: "800" },
  ageNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
  },
  ageNoticeText: { flex: 1, fontSize: 12, lineHeight: 17 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 28,
    gap: 16,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTitle: { fontSize: 18, fontWeight: "900" },
  modalSubtitle: { fontSize: 14, lineHeight: 20 },
  noticeBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  noticeText: { flex: 1, fontSize: 13, lineHeight: 18 },
  dateRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  dateFieldWrap: { flex: 1, gap: 6 },
  dateLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    textAlign: "center",
  },
  dateInput: {
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 10,
    paddingVertical: 14,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  dateSep: { fontSize: 22, fontWeight: "300", paddingBottom: 14 },
  modalBtn: {
    paddingVertical: 16,
    borderRadius: 24,
    alignItems: "center",
    marginTop: 4,
  },
  modalBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },

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
});
