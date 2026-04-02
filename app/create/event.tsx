// app/create/event.tsx — UPDATED ✅ dark mode + app design
// ✅ FIXED: use user from useAuth() instead of auth.currentUser directly
// ✅ FIXED: added creator_id field to match Firestore rules
// ✅ FIXED: guard against null user before submitting

import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import React, { useState } from "react";
import {
  Alert,
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

type EventType = "public" | "private" | "invite";

export default function CreateEventScreen() {
  const { profile, user } = useAuth();
  const { colors, isDark } = useTheme();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [isOnline, setIsOnline] = useState(false);
  const [eventType, setEventType] = useState<EventType>("public");
  const [maxAttendees, setMaxAttendees] = useState("");
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 2 * 60 * 60 * 1000),
  );
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const avatarLetter = profile?.username?.charAt(0).toUpperCase() ?? "U";
  const canPost = title.trim().length > 0 && !isLoading;

  const formatDateTime = (date: Date) =>
    date.toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const handlePost = async () => {
    if (!canPost) return;
    if (!user?.uid) {
      Alert.alert("Error", "You must be logged in to create an event.");
      return;
    }
    if (endDate <= startDate) {
      Alert.alert("Error", "End time must be after start time.");
      return;
    }
    const max = maxAttendees.trim() ? Number(maxAttendees.trim()) : null;
    if (maxAttendees.trim() && (!Number.isFinite(max) || max! <= 0)) {
      Alert.alert("Error", "Capacity must be a valid number.");
      return;
    }
    setIsLoading(true);
    try {
      await addDoc(collection(db, "events"), {
        user_id: user.uid,
        creator_id: user.uid, // ✅ required by Firestore rules
        title: title.trim(),
        description: description.trim() || null,
        location: location.trim() || null,
        is_online: isOnline,
        event_type: eventType,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        max_attendees: max,
        attendees_count: 0,
        created_at: serverTimestamp(),
      });
      router.back();
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to create event.");
    } finally {
      setIsLoading(false);
    }
  };

  const content = (
    <SafeAreaView
      style={[styles.container, { backgroundColor: "transparent" }]}
      edges={["top", "left", "right"]}
    >
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.cancelBtn}
            disabled={isLoading}
          >
            <Text style={[styles.cancelText, { color: colors.text }]}>
              Cancel
            </Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Create Event
          </Text>
          <TouchableOpacity
            style={[
              styles.postBtn,
              {
                backgroundColor: canPost
                  ? colors.primary
                  : colors.primary + "60",
              },
            ]}
            onPress={handlePost}
            disabled={!canPost}
          >
            <Text style={styles.postBtnText}>
              {isLoading ? "Creating..." : "Create"}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.composerRow}>
            <View style={styles.avatarCol}>
              {profile?.avatar_url ? (
                <Image
                  source={{ uri: profile.avatar_url }}
                  style={styles.avatar}
                />
              ) : (
                <View
                  style={[
                    styles.avatarFallback,
                    { backgroundColor: colors.primary },
                  ]}
                >
                  <Text style={styles.avatarLetter}>{avatarLetter}</Text>
                </View>
              )}
              <View
                style={[styles.avatarLine, { backgroundColor: colors.border }]}
              />
            </View>
            <View style={styles.inputCol}>
              <TextInput
                style={[styles.titleInput, { color: colors.text }]}
                placeholder="Event title"
                placeholderTextColor={colors.textTertiary}
                value={title}
                onChangeText={setTitle}
                autoFocus
                maxLength={100}
              />
              <TextInput
                style={[styles.descInput, { color: colors.text }]}
                placeholder="Describe your event..."
                placeholderTextColor={colors.textTertiary}
                value={description}
                onChangeText={setDescription}
                multiline
                maxLength={500}
              />
            </View>
          </View>

          <View style={styles.settingsSection}>
            <View style={styles.avatarColSpacer} />
            <View style={styles.settingsCol}>
              <Text
                style={[styles.sectionLabel, { color: colors.textSecondary }]}
              >
                Date & Time
              </Text>
              <View
                style={[
                  styles.settingsCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <TouchableOpacity
                  style={styles.settingRow}
                  onPress={() => setShowStartPicker(true)}
                  activeOpacity={0.85}
                >
                  <View
                    style={[
                      styles.settingIconWrap,
                      { backgroundColor: colors.primary + "18" },
                    ]}
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={18}
                      color={colors.primary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.settingTitle,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Starts
                    </Text>
                    <Text style={[styles.settingValue, { color: colors.text }]}>
                      {formatDateTime(startDate)}
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={colors.textTertiary}
                  />
                </TouchableOpacity>
                <View
                  style={[styles.divider, { backgroundColor: colors.border }]}
                />
                <TouchableOpacity
                  style={styles.settingRow}
                  onPress={() => setShowEndPicker(true)}
                  activeOpacity={0.85}
                >
                  <View
                    style={[
                      styles.settingIconWrap,
                      { backgroundColor: colors.primary + "18" },
                    ]}
                  >
                    <Ionicons
                      name="time-outline"
                      size={18}
                      color={colors.primary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.settingTitle,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Ends
                    </Text>
                    <Text style={[styles.settingValue, { color: colors.text }]}>
                      {formatDateTime(endDate)}
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={colors.textTertiary}
                  />
                </TouchableOpacity>
              </View>

              {showStartPicker && (
                <DateTimePicker
                  value={startDate}
                  mode="datetime"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={(_, d) => {
                    setShowStartPicker(false);
                    if (d) setStartDate(d);
                  }}
                  minimumDate={new Date()}
                />
              )}
              {showEndPicker && (
                <DateTimePicker
                  value={endDate}
                  mode="datetime"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={(_, d) => {
                    setShowEndPicker(false);
                    if (d) setEndDate(d);
                  }}
                  minimumDate={startDate}
                />
              )}

              <Text
                style={[
                  styles.sectionLabel,
                  { color: colors.textSecondary, marginTop: 16 },
                ]}
              >
                Location
              </Text>
              <View style={styles.chipRow}>
                {(["In Person", "Online"] as const).map((opt) => {
                  const online = opt === "Online";
                  const active = isOnline === online;
                  return (
                    <TouchableOpacity
                      key={opt}
                      activeOpacity={0.85}
                      style={[
                        styles.chip,
                        {
                          borderColor: colors.border,
                          backgroundColor: colors.surface,
                        },
                        active && {
                          backgroundColor: colors.primary + "18",
                          borderColor: colors.primary,
                        },
                      ]}
                      onPress={() => setIsOnline(online)}
                    >
                      <Ionicons
                        name={online ? "videocam-outline" : "location-outline"}
                        size={14}
                        color={active ? colors.primary : colors.textTertiary}
                      />
                      <Text
                        style={[
                          styles.chipText,
                          {
                            color: active
                              ? colors.primary
                              : colors.textTertiary,
                          },
                        ]}
                      >
                        {opt}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View
                style={[
                  styles.inputWrap,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <TextInput
                  style={[styles.fieldInput, { color: colors.text }]}
                  value={location}
                  onChangeText={setLocation}
                  placeholder={
                    isOnline
                      ? "Meeting link (Zoom, Google Meet...)"
                      : "Venue address or location"
                  }
                  placeholderTextColor={colors.textTertiary}
                />
              </View>

              <Text
                style={[
                  styles.sectionLabel,
                  { color: colors.textSecondary, marginTop: 16 },
                ]}
              >
                Visibility
              </Text>
              <View style={styles.chipRow}>
                {(["public", "private", "invite"] as EventType[]).map((opt) => {
                  const icons = {
                    public: "earth-outline",
                    private: "lock-closed-outline",
                    invite: "people-outline",
                  } as const;
                  const active = eventType === opt;
                  return (
                    <TouchableOpacity
                      key={opt}
                      activeOpacity={0.85}
                      style={[
                        styles.chip,
                        {
                          borderColor: colors.border,
                          backgroundColor: colors.surface,
                        },
                        active && {
                          backgroundColor: colors.primary + "18",
                          borderColor: colors.primary,
                        },
                      ]}
                      onPress={() => setEventType(opt)}
                    >
                      <Ionicons
                        name={icons[opt]}
                        size={14}
                        color={active ? colors.primary : colors.textTertiary}
                      />
                      <Text
                        style={[
                          styles.chipText,
                          {
                            color: active
                              ? colors.primary
                              : colors.textTertiary,
                          },
                        ]}
                      >
                        {opt.charAt(0).toUpperCase() + opt.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text
                style={[
                  styles.sectionLabel,
                  { color: colors.textSecondary, marginTop: 16 },
                ]}
              >
                Capacity{" "}
                <Text style={{ fontWeight: "500", color: colors.textTertiary }}>
                  (optional)
                </Text>
              </Text>
              <View
                style={[
                  styles.inputWrap,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <TextInput
                  style={[styles.fieldInput, { color: colors.text }]}
                  value={maxAttendees}
                  onChangeText={setMaxAttendees}
                  placeholder="Maximum attendees"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="numeric"
                />
              </View>
              <View style={{ height: 32 }} />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

  if (!isDark) {
    return (
      <LinearGradient
        colors={["#DCEBFF", "#EEF4FF", "#FFFFFF"]}
        locations={[0, 0.45, 1]}
        style={{ flex: 1 }}
      >
        {content}
      </LinearGradient>
    );
  }
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {content}
    </View>
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
    borderBottomWidth: 1,
  },
  cancelBtn: { paddingVertical: 6, paddingHorizontal: 4, minWidth: 60 },
  cancelText: { fontSize: 16, fontWeight: "500" },
  headerTitle: { fontSize: 16, fontWeight: "800" },
  postBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 999,
    minWidth: 72,
    alignItems: "center",
  },
  postBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  scroll: { flex: 1 },
  composerRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  avatarCol: { alignItems: "center" },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: { color: "#fff", fontWeight: "700", fontSize: 18 },
  avatarLine: {
    width: 2,
    flex: 1,
    minHeight: 20,
    marginTop: 8,
    borderRadius: 1,
  },
  inputCol: { flex: 1, paddingBottom: 8 },
  titleInput: {
    fontSize: 17,
    fontWeight: "700",
    paddingTop: 0,
    marginBottom: 8,
  },
  descInput: { fontSize: 15, lineHeight: 22, minHeight: 60, paddingTop: 0 },
  settingsSection: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 12,
    paddingTop: 8,
  },
  avatarColSpacer: { width: 44 },
  settingsCol: { flex: 1 },
  sectionLabel: { fontSize: 13, fontWeight: "700", marginBottom: 10 },
  settingsCard: { borderRadius: 16, overflow: "hidden", borderWidth: 1 },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
  },
  settingIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  settingTitle: { fontSize: 12, fontWeight: "600" },
  settingValue: { fontSize: 14, fontWeight: "700", marginTop: 2 },
  divider: { height: 1, marginHorizontal: 14 },
  chipRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: { fontSize: 13, fontWeight: "600" },
  inputWrap: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  fieldInput: { fontSize: 15 },
});
