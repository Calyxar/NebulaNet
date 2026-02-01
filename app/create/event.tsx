// app/create/event.tsx - NebulaNet DESIGN MATCH (clean + modern + responsive)
import { getTabBarHeight } from "@/components/navigation/CurvedTabBar";
import Button from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

type EventType = "public" | "private" | "invite";

export default function CreateEventScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");

  const [isLoading, setIsLoading] = useState(false);

  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 2 * 60 * 60 * 1000),
  );
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const [eventType, setEventType] = useState<EventType>("public");
  const [maxAttendees, setMaxAttendees] = useState<string>("");
  const [isOnline, setIsOnline] = useState(false);

  const bottomPad = useMemo(
    () => getTabBarHeight(insets.bottom) + 18,
    [insets.bottom],
  );

  const formatDateTime = (date: Date) =>
    date.toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const handleCreateEvent = async () => {
    if (!title.trim()) {
      Alert.alert("Error", "Please enter an event title");
      return;
    }
    if (!user) {
      Alert.alert("Error", "You must be logged in to create an event");
      return;
    }
    if (endDate <= startDate) {
      Alert.alert("Error", "End time must be after start time");
      return;
    }

    const max = maxAttendees.trim() ? Number(maxAttendees.trim()) : null;
    if (maxAttendees.trim() && (!Number.isFinite(max) || max! <= 0)) {
      Alert.alert("Error", "Capacity must be a valid number");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.from("events").insert({
        user_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        location: location.trim() || null,
        is_online: isOnline,
        event_type: eventType,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        max_attendees: max,
        attendees_count: 0,
      });

      if (error) throw error;

      Alert.alert("Success", "Event created successfully!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert(
        "Error",
        e?.message || "Failed to create event. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <StatusBar
        barStyle="dark-content"
        translucent
        backgroundColor="transparent"
      />

      <LinearGradient
        colors={["#DCEBFF", "#EEF4FF", "#FFFFFF"]}
        locations={[0, 0.45, 1]}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.safe}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.circleBtn}
              onPress={() => router.back()}
              activeOpacity={0.85}
            >
              <Ionicons name="arrow-back" size={22} color="#111827" />
            </TouchableOpacity>

            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>Create Event</Text>
              <Text style={styles.headerSub}>
                Schedule something your community can join
              </Text>
            </View>

            <View style={{ width: 44 }} />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.content,
              { paddingBottom: bottomPad },
            ]}
          >
            {/* Title */}
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Event Title</Text>
              <TextInput
                style={styles.bigInput}
                value={title}
                onChangeText={setTitle}
                placeholder="What's your event about?"
                placeholderTextColor="#9CA3AF"
                maxLength={100}
              />
              <Text style={styles.counter}>{title.length}/100</Text>
            </View>

            {/* Description */}
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Description</Text>
              <TextInput
                style={styles.textArea}
                value={description}
                onChangeText={setDescription}
                placeholder="Describe your event..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                maxLength={500}
              />
              <Text style={styles.counter}>{description.length}/500</Text>
            </View>

            {/* Date & Time */}
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Date & Time</Text>

              <RowButton
                icon="calendar-outline"
                iconColor="#7C3AED"
                label="Starts"
                value={formatDateTime(startDate)}
                onPress={() => setShowStartPicker(true)}
              />

              <View style={styles.rowDivider} />

              <RowButton
                icon="time-outline"
                iconColor="#7C3AED"
                label="Ends"
                value={formatDateTime(endDate)}
                onPress={() => setShowEndPicker(true)}
              />

              {showStartPicker && (
                <DateTimePicker
                  value={startDate}
                  mode="datetime"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={(_, selectedDate) => {
                    setShowStartPicker(false);
                    if (selectedDate) setStartDate(selectedDate);
                  }}
                  minimumDate={new Date()}
                />
              )}

              {showEndPicker && (
                <DateTimePicker
                  value={endDate}
                  mode="datetime"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={(_, selectedDate) => {
                    setShowEndPicker(false);
                    if (selectedDate) setEndDate(selectedDate);
                  }}
                  minimumDate={startDate}
                />
              )}
            </View>

            {/* Location */}
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Location</Text>

              <View style={styles.pillToggle}>
                <Pill
                  active={!isOnline}
                  label="In Person"
                  icon="location-outline"
                  onPress={() => setIsOnline(false)}
                />
                <Pill
                  active={isOnline}
                  label="Online"
                  icon="videocam-outline"
                  onPress={() => setIsOnline(true)}
                />
              </View>

              <TextInput
                style={styles.input}
                value={location}
                onChangeText={setLocation}
                placeholder={
                  isOnline
                    ? "Enter meeting link (Zoom, Google Meet, etc.)"
                    : "Enter venue address or location"
                }
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* Event Type */}
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Event Type</Text>

              <View style={styles.pillToggle}>
                <Pill
                  active={eventType === "public"}
                  label="Public"
                  icon="earth-outline"
                  onPress={() => setEventType("public")}
                />
                <Pill
                  active={eventType === "private"}
                  label="Private"
                  icon="lock-closed-outline"
                  onPress={() => setEventType("private")}
                />
                <Pill
                  active={eventType === "invite"}
                  label="Invite"
                  icon="people-outline"
                  onPress={() => setEventType("invite")}
                />
              </View>

              <Text style={styles.helper}>
                {eventType === "public"
                  ? "Anyone can see and join."
                  : eventType === "private"
                    ? "Only approved followers can see details."
                    : "Only invited people can join."}
              </Text>
            </View>

            {/* Capacity */}
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Capacity (Optional)</Text>
              <TextInput
                style={styles.input}
                value={maxAttendees}
                onChangeText={setMaxAttendees}
                placeholder="Maximum number of attendees"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
              />
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <Button
                title="Create Event"
                onPress={handleCreateEvent}
                loading={isLoading}
                disabled={!title.trim()}
                style={styles.primaryBtn}
              />

              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => router.back()}
                activeOpacity={0.85}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </>
  );
}

function RowButton({
  icon,
  iconColor,
  label,
  value,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  label: string;
  value: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.rowBtn}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={[styles.rowIconWrap, { backgroundColor: `${iconColor}1A` }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue} numberOfLines={1}>
          {value}
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
    </TouchableOpacity>
  );
}

function Pill({
  active,
  label,
  icon,
  onPress,
}: {
  active: boolean;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.pill, active && styles.pillActive]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <Ionicons name={icon} size={18} color={active ? "#7C3AED" : "#6B7280"} />
      <Text style={[styles.pillText, active && styles.pillTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: { flex: 1 },

  header: {
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  circleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { fontSize: 20, fontWeight: "900", color: "#111827" },
  headerSub: {
    marginTop: 2,
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
  },

  content: {
    paddingHorizontal: 18,
    paddingTop: 8,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.06)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: Platform.OS === "android" ? 0.08 : 0.06,
    shadowRadius: 16,
    elevation: 2,
    marginBottom: 12,
  },
  cardLabel: {
    fontSize: 14,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 10,
  },

  bigInput: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: "rgba(17,24,39,0.03)",
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.06)",
  },
  input: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: "rgba(17,24,39,0.03)",
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.06)",
  },
  textArea: {
    fontSize: 14.5,
    color: "#111827",
    padding: 12,
    borderRadius: 16,
    minHeight: 120,
    backgroundColor: "rgba(17,24,39,0.03)",
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.06)",
  },
  counter: {
    marginTop: 8,
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "700",
    alignSelf: "flex-end",
  },

  rowBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
  },
  rowIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: {
    fontSize: 12.5,
    color: "#6B7280",
    fontWeight: "800",
    marginBottom: 2,
  },
  rowValue: { fontSize: 14.5, color: "#111827", fontWeight: "900" },
  rowDivider: {
    height: 1,
    backgroundColor: "rgba(17,24,39,0.06)",
    marginVertical: 6,
  },

  pillToggle: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  pill: {
    flex: 1,
    height: 48,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.06)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: Platform.OS === "android" ? 0.06 : 0.04,
    shadowRadius: 14,
    elevation: 1,
  },
  pillActive: {
    borderColor: "rgba(124,58,237,0.25)",
    backgroundColor: "rgba(124,58,237,0.06)",
  },
  pillText: { fontSize: 13.5, fontWeight: "900", color: "#6B7280" },
  pillTextActive: { color: "#7C3AED" },

  helper: {
    marginTop: 2,
    fontSize: 12.5,
    color: "#6B7280",
    fontWeight: "700",
  },

  actions: {
    marginTop: 6,
    gap: 12,
  },
  primaryBtn: {
    backgroundColor: "#7C3AED",
  },
  cancelBtn: {
    alignItems: "center",
    paddingVertical: 12,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#6B7280",
  },
});
