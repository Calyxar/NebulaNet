// app/create/event.tsx
import Button from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import { useState } from "react";
import {
    Alert,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

export default function CreateEventScreen() {
  const { user } = useAuth(); // Removed unused profile
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 2 * 60 * 60 * 1000)
  ); // 2 hours later
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const [eventType, setEventType] = useState<"public" | "private" | "invite">(
    "public"
  );
  const [maxAttendees, setMaxAttendees] = useState<string>("");
  const [isOnline, setIsOnline] = useState(false);

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

    setIsLoading(true);
    try {
      const { error } = await supabase.from("events").insert({
        user_id: user.id,
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        is_online: isOnline,
        event_type: eventType,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        max_attendees: maxAttendees ? parseInt(maxAttendees) : null,
        attendees_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;

      Alert.alert("Success", "Event created successfully!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.message || "Failed to create event. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const formatDateTime = (date: Date) => {
    return date.toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <ScrollView style={styles.container}>
      {/* Event Title */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Event Title</Text>
        <TextInput
          style={styles.titleInput}
          value={title}
          onChangeText={setTitle}
          placeholder="What's your event about?"
          placeholderTextColor="#999"
          maxLength={100}
        />
        <Text style={styles.charCount}>{title.length}/100</Text>
      </View>

      {/* Event Description */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Description</Text>
        <TextInput
          style={styles.descriptionInput}
          value={description}
          onChangeText={setDescription}
          placeholder="Describe your event..."
          placeholderTextColor="#999"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          maxLength={500}
        />
        <Text style={styles.charCount}>{description.length}/500</Text>
      </View>

      {/* Date & Time */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Date & Time</Text>

        <TouchableOpacity
          style={styles.dateTimeButton}
          onPress={() => setShowStartPicker(true)}
        >
          <Ionicons name="calendar-outline" size={20} color="#007AFF" />
          <View style={styles.dateTimeContent}>
            <Text style={styles.dateTimeLabel}>Starts</Text>
            <Text style={styles.dateTimeValue}>
              {formatDateTime(startDate)}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.dateTimeButton}
          onPress={() => setShowEndPicker(true)}
        >
          <Ionicons name="time-outline" size={20} color="#007AFF" />
          <View style={styles.dateTimeContent}>
            <Text style={styles.dateTimeLabel}>Ends</Text>
            <Text style={styles.dateTimeValue}>{formatDateTime(endDate)}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>

        {showStartPicker && (
          <DateTimePicker
            value={startDate}
            mode="datetime"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={(event, selectedDate) => {
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
            onChange={(event, selectedDate) => {
              setShowEndPicker(false);
              if (selectedDate) setEndDate(selectedDate);
            }}
            minimumDate={startDate}
          />
        )}
      </View>

      {/* Location */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Location</Text>

        <TouchableOpacity
          style={styles.locationToggle}
          onPress={() => setIsOnline(!isOnline)}
        >
          <View style={styles.toggleContainer}>
            <View
              style={[styles.toggleOption, !isOnline && styles.toggleActive]}
            >
              <Ionicons
                name="location-outline"
                size={20}
                color={!isOnline ? "#007AFF" : "#666"}
              />
              <Text
                style={[
                  styles.toggleText,
                  !isOnline && styles.toggleActiveText,
                ]}
              >
                In Person
              </Text>
            </View>
            <View
              style={[styles.toggleOption, isOnline && styles.toggleActive]}
            >
              <Ionicons
                name="videocam-outline"
                size={20}
                color={isOnline ? "#007AFF" : "#666"}
              />
              <Text
                style={[styles.toggleText, isOnline && styles.toggleActiveText]}
              >
                Online
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {!isOnline ? (
          <TextInput
            style={styles.locationInput}
            value={location}
            onChangeText={setLocation}
            placeholder="Enter venue address or location"
            placeholderTextColor="#999"
          />
        ) : (
          <TextInput
            style={styles.locationInput}
            value={location}
            onChangeText={setLocation}
            placeholder="Enter meeting link (Zoom, Google Meet, etc.)"
            placeholderTextColor="#999"
          />
        )}
      </View>

      {/* Event Type */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Event Type</Text>
        <View style={styles.eventTypeContainer}>
          {(["public", "private", "invite"] as const).map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.eventTypeButton,
                eventType === type && styles.eventTypeActive,
              ]}
              onPress={() => setEventType(type)}
            >
              <Ionicons
                name={
                  type === "public"
                    ? "earth-outline"
                    : type === "private"
                      ? "lock-closed-outline"
                      : "people-outline"
                }
                size={20}
                color={eventType === type ? "#007AFF" : "#666"}
              />
              <Text
                style={[
                  styles.eventTypeText,
                  eventType === type && styles.eventTypeActiveText,
                ]}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Capacity */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Capacity (Optional)</Text>
        <TextInput
          style={styles.capacityInput}
          value={maxAttendees}
          onChangeText={setMaxAttendees}
          placeholder="Maximum number of attendees"
          placeholderTextColor="#999"
          keyboardType="numeric"
        />
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <Button
          title="Create Event"
          onPress={handleCreateEvent}
          loading={isLoading}
          disabled={!title.trim()}
          style={styles.createButton}
        />

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => router.back()}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 16,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
    marginBottom: 16,
  },
  titleInput: {
    fontSize: 20,
    fontWeight: "600",
    color: "#000",
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e1e1e1",
  },
  descriptionInput: {
    fontSize: 16,
    color: "#333",
    minHeight: 120,
    textAlignVertical: "top",
    padding: 12,
    backgroundColor: "#f8f8f8",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  charCount: {
    fontSize: 12,
    color: "#999",
    alignSelf: "flex-end",
    marginTop: 4,
  },
  dateTimeButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    gap: 12,
  },
  dateTimeContent: {
    flex: 1,
  },
  dateTimeLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
  },
  dateTimeValue: {
    fontSize: 16,
    fontWeight: "500",
    color: "#000",
  },
  locationToggle: {
    marginBottom: 16,
  },
  toggleContainer: {
    flexDirection: "row",
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    padding: 4,
  },
  toggleOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  toggleActive: {
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  toggleActiveText: {
    color: "#007AFF",
    fontWeight: "600",
  },
  locationInput: {
    fontSize: 16,
    color: "#333",
    padding: 12,
    backgroundColor: "#f8f8f8",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  eventTypeContainer: {
    flexDirection: "row",
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    padding: 4,
  },
  eventTypeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  eventTypeActive: {
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  eventTypeText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  eventTypeActiveText: {
    color: "#007AFF",
    fontWeight: "600",
  },
  capacityInput: {
    fontSize: 16,
    color: "#333",
    padding: 12,
    backgroundColor: "#f8f8f8",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  actionButtons: {
    gap: 12,
    marginBottom: 32,
  },
  createButton: {
    backgroundColor: "#007AFF",
  },
  cancelButton: {
    alignItems: "center",
    padding: 16,
  },
  cancelButtonText: {
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
});
