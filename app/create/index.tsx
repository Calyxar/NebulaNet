// app/create/index.tsx
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

const CREATE_OPTIONS = [
  {
    id: "post",
    title: "Create Post",
    description: "Share your thoughts with the community",
    icon: "create-outline",
    color: "#007AFF",
    route: "/create/post",
  },
  {
    id: "media",
    title: "Share Media",
    description: "Upload photos or videos",
    icon: "image-outline",
    color: "#34C759",
    route: "/create/media",
  },
  {
    id: "event",
    title: "Create Event",
    description: "Organize a community event",
    icon: "calendar-outline",
    color: "#FF9500",
    route: "/create/event",
  },
  {
    id: "poll",
    title: "Create Poll",
    description: "Ask for community opinions",
    icon: "stats-chart-outline",
    color: "#AF52DE",
    route: "/create/poll",
  },
  {
    id: "story",
    title: "Add to Story",
    description: "Share moments that disappear in 24 hours",
    icon: "camera-outline",
    color: "#FF2D55",
    route: "/create/story",
  },
  {
    id: "article",
    title: "Write Article",
    description: "Share long-form content",
    icon: "document-text-outline",
    color: "#5856D6",
    route: "/create/article",
  },
];

export default function CreateIndexScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Create</Text>
          <Text style={styles.headerDescription}>
            Choose what you&apos;d like to share with the NebulaNet community
          </Text>
        </View>

        <View style={styles.optionsGrid}>
          {CREATE_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={styles.createOption}
              onPress={() => router.push(option.route as any)}
            >
              <View
                style={[styles.optionIcon, { backgroundColor: option.color }]}
              >
                <Ionicons name={option.icon as any} size={28} color="white" />
              </View>
              <Text style={styles.optionTitle}>{option.title}</Text>
              <Text style={styles.optionDescription}>{option.description}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick Create Section */}
        <View style={styles.quickCreateSection}>
          <Text style={styles.sectionTitle}>Quick Create</Text>
          <View style={styles.quickCreateButtons}>
            <TouchableOpacity
              style={[styles.quickButton, { backgroundColor: "#f0f8ff" }]}
              onPress={() => router.push("../create/post")}
            >
              <Ionicons name="text" size={24} color="#007AFF" />
              <Text style={[styles.quickButtonText, { color: "#007AFF" }]}>
                Text
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickButton, { backgroundColor: "#f0fff4" }]}
              onPress={() => router.push("../create/media")}
            >
              <Ionicons name="image" size={24} color="#34C759" />
              <Text style={[styles.quickButtonText, { color: "#34C759" }]}>
                Photo
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickButton, { backgroundColor: "#fff4e6" }]}
              onPress={() => router.push("../create/poll")}
            >
              <Ionicons name="stats-chart" size={24} color="#FF9500" />
              <Text style={[styles.quickButtonText, { color: "#FF9500" }]}>
                Poll
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Drafts */}
        <View style={styles.draftsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Drafts</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.draftsList}>
            <TouchableOpacity style={styles.draftItem}>
              <View style={styles.draftIcon}>
                <Ionicons name="document-text-outline" size={20} color="#666" />
              </View>
              <View style={styles.draftContent}>
                <Text style={styles.draftTitle}>
                  My thoughts on the new update...
                </Text>
                <Text style={styles.draftTime}>Yesterday, 4:30 PM</Text>
              </View>
              <TouchableOpacity style={styles.draftAction}>
                <Ionicons name="ellipsis-horizontal" size={20} color="#666" />
              </TouchableOpacity>
            </TouchableOpacity>

            <TouchableOpacity style={styles.draftItem}>
              <View style={styles.draftIcon}>
                <Ionicons name="image-outline" size={20} color="#666" />
              </View>
              <View style={styles.draftContent}>
                <Text style={styles.draftTitle}>Vacation photos - draft</Text>
                <Text style={styles.draftTime}>2 days ago</Text>
              </View>
              <TouchableOpacity style={styles.draftAction}>
                <Ionicons name="ellipsis-horizontal" size={20} color="#666" />
              </TouchableOpacity>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 24,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "700",
    color: "#000",
    marginBottom: 8,
  },
  headerDescription: {
    fontSize: 16,
    color: "#666",
    lineHeight: 22,
  },
  optionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 16,
    gap: 16,
  },
  createOption: {
    width: "47%",
    padding: 20,
    backgroundColor: "#f9f9f9",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e1e1e1",
    alignItems: "center",
  },
  optionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 8,
    textAlign: "center",
  },
  optionDescription: {
    fontSize: 13,
    color: "#666",
    textAlign: "center",
    lineHeight: 18,
  },
  quickCreateSection: {
    padding: 24,
    paddingTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
    marginBottom: 16,
  },
  quickCreateButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  quickButton: {
    flex: 1,
    paddingVertical: 20,
    borderRadius: 12,
    alignItems: "center",
    gap: 8,
  },
  quickButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  draftsSection: {
    padding: 24,
    paddingTop: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  seeAllText: {
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "500",
  },
  draftsList: {
    gap: 12,
  },
  draftItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e1e1e1",
  },
  draftIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  draftContent: {
    flex: 1,
  },
  draftTitle: {
    fontSize: 15,
    fontWeight: "500",
    color: "#000",
    marginBottom: 4,
  },
  draftTime: {
    fontSize: 13,
    color: "#999",
  },
  draftAction: {
    padding: 4,
  },
});
