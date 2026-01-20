// app/create/poll.tsx
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

export default function CreatePollScreen() {
  const { user } = useAuth(); // Removed unused profile
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]); // Start with 2 empty options
  const [isLoading, setIsLoading] = useState(false);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);

  const addOption = () => {
    if (options.length < 6) {
      setOptions([...options, ""]);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      const newOptions = [...options];
      newOptions.splice(index, 1);
      setOptions(newOptions);
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleCreatePoll = async () => {
    if (!question.trim()) {
      Alert.alert("Error", "Please enter a poll question");
      return;
    }

    const validOptions = options.filter((opt) => opt.trim() !== "");
    if (validOptions.length < 2) {
      Alert.alert("Error", "Please add at least 2 options");
      return;
    }

    if (!user) {
      Alert.alert("Error", "You must be logged in to create a poll");
      return;
    }

    setIsLoading(true);
    try {
      const { data: pollData, error: pollError } = await supabase
        .from("polls")
        .insert({
          user_id: user.id,
          question: question.trim(),
          expires_at: expiresAt?.toISOString() || null,
          allow_multiple: allowMultiple,
          is_anonymous: isAnonymous,
          votes_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (pollError) throw pollError;

      // Insert poll options
      const pollOptions = validOptions.map((option, index) => ({
        poll_id: pollData.id,
        option_text: option.trim(),
        option_order: index,
        votes_count: 0,
        created_at: new Date().toISOString(),
      }));

      const { error: optionsError } = await supabase
        .from("poll_options")
        .insert(pollOptions);

      if (optionsError) throw optionsError;

      // Create a post for the poll
      const { error: postError } = await supabase.from("posts").insert({
        user_id: user.id,
        title: `Poll: ${question.trim()}`,
        content: `Vote on this poll!`,
        poll_id: pollData.id,
        post_type: "poll",
        likes_count: 0,
        comments_count: 0,
        shares_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (postError) throw postError;

      Alert.alert("Success", "Poll created successfully!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.message || "Failed to create poll. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const formatDateTime = (date: Date) => {
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <ScrollView style={styles.container}>
      {/* Poll Question */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Poll Question</Text>
        <TextInput
          style={styles.questionInput}
          value={question}
          onChangeText={setQuestion}
          placeholder="What would you like to ask?"
          placeholderTextColor="#999"
          maxLength={200}
        />
        <Text style={styles.charCount}>{question.length}/200</Text>
      </View>

      {/* Poll Options */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Options</Text>
          <Text style={styles.optionsCount}>
            {options.filter((opt) => opt.trim() !== "").length}/6
          </Text>
        </View>

        {options.map((option, index) => (
          <View key={index} style={styles.optionRow}>
            <View style={styles.optionBullet}>
              <Text style={styles.optionBulletText}>
                {String.fromCharCode(65 + index)}
              </Text>
            </View>
            <TextInput
              style={styles.optionInput}
              value={option}
              onChangeText={(value) => updateOption(index, value)}
              placeholder={`Option ${index + 1}`}
              placeholderTextColor="#999"
              maxLength={100}
            />
            {options.length > 2 && (
              <TouchableOpacity
                style={styles.removeOptionButton}
                onPress={() => removeOption(index)}
              >
                <Ionicons name="close-circle" size={20} color="#ff3b30" />
              </TouchableOpacity>
            )}
          </View>
        ))}

        {options.length < 6 && (
          <TouchableOpacity style={styles.addOptionButton} onPress={addOption}>
            <Ionicons name="add-circle-outline" size={20} color="#007AFF" />
            <Text style={styles.addOptionText}>Add Option</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Poll Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Poll Settings</Text>

        {/* Expiration */}
        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => setShowDatePicker(true)}
        >
          <Ionicons name="time-outline" size={20} color="#666" />
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>Ends</Text>
            <Text style={styles.settingValue}>
              {expiresAt ? formatDateTime(expiresAt) : "Never"}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)} // Default 1 week
            mode="datetime"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              setExpiresAt(selectedDate || null);
            }}
            minimumDate={new Date()}
          />
        )}

        {/* Multiple Votes */}
        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => setAllowMultiple(!allowMultiple)}
        >
          <Ionicons
            name={allowMultiple ? "checkbox-outline" : "square-outline"}
            size={20}
            color="#666"
          />
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>Allow multiple votes</Text>
            <Text style={styles.settingDescription}>
              Users can vote for more than one option
            </Text>
          </View>
          <View style={styles.settingToggle}>
            <View
              style={[
                styles.toggleCircle,
                allowMultiple && styles.toggleCircleActive,
              ]}
            />
          </View>
        </TouchableOpacity>

        {/* Anonymous Voting */}
        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => setIsAnonymous(!isAnonymous)}
        >
          <Ionicons
            name={isAnonymous ? "eye-off-outline" : "eye-outline"}
            size={20}
            color="#666"
          />
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>Anonymous voting</Text>
            <Text style={styles.settingDescription}>Hide voter identities</Text>
          </View>
          <View style={styles.settingToggle}>
            <View
              style={[
                styles.toggleCircle,
                isAnonymous && styles.toggleCircleActive,
              ]}
            />
          </View>
        </TouchableOpacity>
      </View>

      {/* Preview */}
      <View style={styles.previewSection}>
        <Text style={styles.sectionTitle}>Preview</Text>
        <View style={styles.previewCard}>
          <Text style={styles.previewQuestion} numberOfLines={2}>
            {question || "What's your poll question?"}
          </Text>

          <View style={styles.previewOptions}>
            {options.map((option, index) => (
              <View
                key={`preview-${index}`} // Fixed: Removed duplicate key attribute
                style={styles.previewOption}
              >
                <View style={styles.previewOptionBullet}>
                  <Text style={styles.previewOptionBulletText}>
                    {String.fromCharCode(65 + index)}
                  </Text>
                </View>
                <Text style={styles.previewOptionText} numberOfLines={1}>
                  {option || `Option ${index + 1}`}
                </Text>
                <View style={styles.previewOptionVotes}>
                  <Text style={styles.previewOptionVotesText}>0%</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.previewStats}>
            <Text style={styles.previewStatsText}>0 votes • 0% voted</Text>
            <Text style={styles.previewTimeText}>
              {expiresAt ? `Ends ${formatDateTime(expiresAt)}` : "No end date"}
            </Text>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <Button
          title="Create Poll"
          onPress={handleCreatePoll}
          loading={isLoading}
          disabled={
            !question.trim() ||
            options.filter((opt) => opt.trim() !== "").length < 2
          }
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
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
  },
  optionsCount: {
    fontSize: 14,
    color: "#666",
  },
  questionInput: {
    fontSize: 20,
    fontWeight: "600",
    color: "#000",
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e1e1e1",
  },
  charCount: {
    fontSize: 12,
    color: "#999",
    alignSelf: "flex-end",
    marginTop: 4,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 12,
  },
  optionBullet: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
  },
  optionBulletText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },
  optionInput: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    padding: 12,
    backgroundColor: "#f8f8f8",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  removeOptionButton: {
    padding: 4,
  },
  addOptionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    backgroundColor: "#f0f8ff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#007AFF",
    borderStyle: "dashed",
    gap: 8,
  },
  addOptionText: {
    fontSize: 16,
    color: "#007AFF",
    fontWeight: "500",
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    gap: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#000",
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 14,
    color: "#666",
  },
  settingValue: {
    fontSize: 16,
    color: "#666",
  },
  settingToggle: {
    width: 40,
    height: 24,
    backgroundColor: "#e0e0e0",
    borderRadius: 12,
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  toggleCircle: {
    width: 20,
    height: 20,
    backgroundColor: "white",
    borderRadius: 10,
  },
  toggleCircleActive: {
    backgroundColor: "#007AFF",
    alignSelf: "flex-end",
  },
  previewSection: {
    marginBottom: 32,
  },
  previewCard: {
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e1e1e1",
  },
  previewQuestion: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
    marginBottom: 20,
  },
  previewOptions: {
    gap: 12,
    marginBottom: 20,
  },
  previewOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "white",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e1e1e1",
    gap: 12,
  },
  previewOptionBullet: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  previewOptionBulletText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
  },
  previewOptionText: {
    flex: 1,
    fontSize: 14,
    color: "#333",
  },
  previewOptionVotes: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#f0f0f0",
    borderRadius: 4,
  },
  previewOptionVotesText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
  },
  previewStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  previewStatsText: {
    fontSize: 13,
    color: "#666",
  },
  previewTimeText: {
    fontSize: 13,
    color: "#999",
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
