// app/create/index.tsx
import { Ionicons } from "@expo/vector-icons";
import { type Href, router } from "expo-router";
import React from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type CreateRoute =
  | "/create/post"
  | "/create/media"
  | "/create/event"
  | "/create/poll"
  | "/create/community";

type CreateOption = {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: CreateRoute;
  color: string;
};

const OPTIONS: CreateOption[] = [
  { title: "Post", icon: "create-outline", route: "/create/post", color: "#6366F1" },
  { title: "Share Media", icon: "image-outline", route: "/create/media", color: "#10B981" },
  { title: "Event", icon: "calendar-outline", route: "/create/event", color: "#F59E0B" },
  { title: "Poll", icon: "stats-chart-outline", route: "/create/poll", color: "#EF4444" },
  { title: "Community", icon: "people-outline", route: "/create/community", color: "#7C3AED" },
];

export default function CreateIndexScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Create</Text>
        <Text style={styles.subtitle}>What would you like to create today?</Text>

        <View style={styles.grid}>
          {OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.title}
              style={styles.card}
              activeOpacity={0.8}
              onPress={() => router.push(option.route as Href)}
            >
              <View style={[styles.iconWrapper, { backgroundColor: option.color + "20" }]}>
                <Ionicons name={option.icon} size={24} color={option.color} />
              </View>

              <Text style={styles.cardText}>{option.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ----------------------------- styles ----------------------------- */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 20 },
  title: { fontSize: 26, fontWeight: "900", marginBottom: 6 },
  subtitle: { fontSize: 14, color: "#6B7280", marginBottom: 20 },
  grid: { gap: 14 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  cardText: { fontSize: 16, fontWeight: "700" },
});
