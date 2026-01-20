// app/(tabs)/create.tsx
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function CreateTabScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <TouchableOpacity
          style={styles.createOption}
          onPress={() => router.push("../../create/post")}
        >
          <View style={[styles.optionIcon, { backgroundColor: "#007AFF" }]}>
            <Ionicons name="create-outline" size={32} color="white" />
          </View>
          <Text style={styles.optionTitle}>Create Post</Text>
          <Text style={styles.optionDescription}>
            Share your thoughts with the community
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.createOption}
          onPress={() => router.push("../../create/media")}
        >
          <View style={[styles.optionIcon, { backgroundColor: "#34C759" }]}>
            <Ionicons name="image-outline" size={32} color="white" />
          </View>
          <Text style={styles.optionTitle}>Share Media</Text>
          <Text style={styles.optionDescription}>Upload photos or videos</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.createOption}
          onPress={() => router.push("../../create/event")}
        >
          <View style={[styles.optionIcon, { backgroundColor: "#FF9500" }]}>
            <Ionicons name="calendar-outline" size={32} color="white" />
          </View>
          <Text style={styles.optionTitle}>Create Event</Text>
          <Text style={styles.optionDescription}>
            Organize a community event
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    width: "80%",
    maxWidth: 400,
    gap: 24,
  },
  createOption: {
    alignItems: "center",
    padding: 24,
    backgroundColor: "#f9f9f9",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e1e1e1",
  },
  optionIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  optionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#000",
    marginBottom: 8,
  },
  optionDescription: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
});
