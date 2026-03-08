// app/create/event.tsx — REDESIGNED ✅ matches Twitter-style composer
import { useAuth } from "@/hooks/useAuth";
import { auth, db } from "@/lib/firebase";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
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
  const { profile } = useAuth();

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
        user_id: auth.currentUser!.uid,
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

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.cancelBtn}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.postBtn, !canPost && styles.postBtnDisabled]}
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
            {/* Composer row */}
            <View style={styles.composerRow}>
              <View style={styles.avatarCol}>
                {profile?.avatar_url ? (
                  <Image
                    source={{ uri: profile.avatar_url }}
                    style={styles.avatar}
                  />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarLetter}>{avatarLetter}</Text>
                  </View>
                )}
                <View style={styles.avatarLine} />
              </View>

              <View style={styles.inputCol}>
                <TextInput
                  style={styles.titleInput}
                  placeholder="Event title"
                  placeholderTextColor="#9CA3AF"
                  value={title}
                  onChangeText={setTitle}
                  autoFocus
                  maxLength={100}
                />
                <TextInput
                  style={styles.descInput}
                  placeholder="Describe your event..."
                  placeholderTextColor="#9CA3AF"
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  maxLength={500}
                />
              </View>
            </View>

            {/* Settings section */}
            <View style={styles.settingsSection}>
              <View style={styles.avatarColSpacer} />
              <View style={styles.settingsCol}>
                {/* Date & Time */}
                <Text style={styles.sectionLabel}>Date & time</Text>
                <View style={styles.settingsCard}>
                  <TouchableOpacity
                    style={styles.settingRow}
                    onPress={() => setShowStartPicker(true)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.settingIconWrap}>
                      <Ionicons
                        name="calendar-outline"
                        size={18}
                        color="#7C3AED"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.settingTitle}>Starts</Text>
                      <Text style={styles.settingValue}>
                        {formatDateTime(startDate)}
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color="#D1D5DB"
                    />
                  </TouchableOpacity>

                  <View style={styles.divider} />

                  <TouchableOpacity
                    style={styles.settingRow}
                    onPress={() => setShowEndPicker(true)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.settingIconWrap}>
                      <Ionicons name="time-outline" size={18} color="#7C3AED" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.settingTitle}>Ends</Text>
                      <Text style={styles.settingValue}>
                        {formatDateTime(endDate)}
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color="#D1D5DB"
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

                {/* Location */}
                <Text style={[styles.sectionLabel, { marginTop: 16 }]}>
                  Location
                </Text>
                <View style={styles.chipRow}>
                  {(["In Person", "Online"] as const).map((opt) => {
                    const online = opt === "Online";
                    const active = isOnline === online;
                    return (
                      <TouchableOpacity
                        key={opt}
                        style={[styles.chip, active && styles.chipActive]}
                        onPress={() => setIsOnline(online)}
                      >
                        <Ionicons
                          name={
                            online ? "videocam-outline" : "location-outline"
                          }
                          size={14}
                          color={active ? "#7C3AED" : "#6B7280"}
                        />
                        <Text
                          style={[
                            styles.chipText,
                            active && styles.chipTextActive,
                          ]}
                        >
                          {opt}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <View style={styles.inputWrap}>
                  <TextInput
                    style={styles.fieldInput}
                    value={location}
                    onChangeText={setLocation}
                    placeholder={
                      isOnline
                        ? "Meeting link (Zoom, Google Meet...)"
                        : "Venue address or location"
                    }
                    placeholderTextColor="#9CA3AF"
                  />
                </View>

                {/* Visibility */}
                <Text style={[styles.sectionLabel, { marginTop: 16 }]}>
                  Visibility
                </Text>
                <View style={styles.chipRow}>
                  {(["public", "private", "invite"] as EventType[]).map(
                    (opt) => {
                      const icons = {
                        public: "earth-outline",
                        private: "lock-closed-outline",
                        invite: "people-outline",
                      } as const;
                      const active = eventType === opt;
                      return (
                        <TouchableOpacity
                          key={opt}
                          style={[styles.chip, active && styles.chipActive]}
                          onPress={() => setEventType(opt)}
                        >
                          <Ionicons
                            name={icons[opt]}
                            size={14}
                            color={active ? "#7C3AED" : "#6B7280"}
                          />
                          <Text
                            style={[
                              styles.chipText,
                              active && styles.chipTextActive,
                            ]}
                          >
                            {opt.charAt(0).toUpperCase() + opt.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      );
                    },
                  )}
                </View>

                {/* Capacity */}
                <Text style={[styles.sectionLabel, { marginTop: 16 }]}>
                  Capacity{" "}
                  <Text style={styles.sectionLabelOptional}>(optional)</Text>
                </Text>
                <View style={styles.inputWrap}>
                  <TextInput
                    style={styles.fieldInput}
                    value={maxAttendees}
                    onChangeText={setMaxAttendees}
                    placeholder="Maximum attendees"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                  />
                </View>

                <View style={{ height: 32 }} />
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  cancelBtn: { paddingVertical: 6, paddingHorizontal: 4 },
  cancelText: { fontSize: 16, color: "#374151", fontWeight: "500" },
  postBtn: {
    backgroundColor: "#7C3AED",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 999,
  },
  postBtnDisabled: { backgroundColor: "#C4B5FD" },
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
    backgroundColor: "#7C3AED",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: { color: "#fff", fontWeight: "700", fontSize: 18 },
  avatarLine: {
    width: 2,
    flex: 1,
    minHeight: 20,
    backgroundColor: "#E5E7EB",
    marginTop: 8,
    borderRadius: 1,
  },

  inputCol: { flex: 1, paddingBottom: 8 },
  titleInput: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
    paddingTop: 0,
    marginBottom: 8,
  },
  descInput: {
    fontSize: 15,
    color: "#374151",
    lineHeight: 22,
    minHeight: 60,
    paddingTop: 0,
  },

  settingsSection: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 12,
    paddingTop: 8,
  },
  avatarColSpacer: { width: 44 },
  settingsCol: { flex: 1 },

  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7280",
    marginBottom: 10,
  },
  sectionLabelOptional: {
    fontWeight: "500",
    color: "#9CA3AF",
  },

  settingsCard: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    overflow: "hidden",
  },
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
    backgroundColor: "#EDE9FE",
    alignItems: "center",
    justifyContent: "center",
  },
  settingTitle: { fontSize: 12, color: "#9CA3AF", fontWeight: "600" },
  settingValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginTop: 2,
  },
  divider: { height: 1, backgroundColor: "#F3F4F6", marginHorizontal: 14 },

  chipRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FAFAFA",
  },
  chipActive: {
    backgroundColor: "#EDE9FE",
    borderColor: "#7C3AED",
  },
  chipText: { fontSize: 13, fontWeight: "600", color: "#6B7280" },
  chipTextActive: { color: "#7C3AED" },

  inputWrap: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    backgroundColor: "#FAFAFA",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  fieldInput: {
    fontSize: 15,
    color: "#111827",
  },
});
