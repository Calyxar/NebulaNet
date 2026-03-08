// app/create/index.tsx — REDESIGNED ✅
import { useAuth } from "@/hooks/useAuth";
import { Ionicons } from "@expo/vector-icons";
import { type Href, router } from "expo-router";
import React from "react";
import {
  Image,
  SafeAreaView,
  StatusBar,
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
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: CreateRoute;
  color: string;
};

const OPTIONS: CreateOption[] = [
  {
    title: "Post",
    subtitle: "Share what's on your mind",
    icon: "create-outline",
    route: "/create/post",
    color: "#7C3AED",
  },
  {
    title: "Share Media",
    subtitle: "Photos, videos & GIFs",
    icon: "image-outline",
    route: "/create/media",
    color: "#10B981",
  },
  {
    title: "Poll",
    subtitle: "Ask your community anything",
    icon: "stats-chart-outline",
    route: "/create/poll",
    color: "#6366F1",
  },
  {
    title: "Event",
    subtitle: "Organize a meetup or event",
    icon: "calendar-outline",
    route: "/create/event",
    color: "#F59E0B",
  },
  {
    title: "Community",
    subtitle: "Start a group around a topic",
    icon: "people-outline",
    route: "/create/community",
    color: "#EF4444",
  },
];

export default function CreateIndexScreen() {
  const { profile } = useAuth();
  const avatarLetter = profile?.username?.charAt(0).toUpperCase() ?? "U";

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Create</Text>
        </View>

        {/* User row */}
        <View style={styles.userRow}>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarLetter}>{avatarLetter}</Text>
            </View>
          )}
          <View>
            <Text style={styles.userName}>
              {profile?.full_name || profile?.username}
            </Text>
            <Text style={styles.userHandle}>@{profile?.username}</Text>
          </View>
        </View>

        {/* Options */}
        <View style={styles.list}>
          {OPTIONS.map((option, index) => (
            <TouchableOpacity
              key={option.title}
              style={[
                styles.card,
                index < OPTIONS.length - 1 && styles.cardBorder,
              ]}
              activeOpacity={0.7}
              onPress={() => router.push(option.route as Href)}
            >
              <View
                style={[
                  styles.iconWrapper,
                  { backgroundColor: option.color + "15" },
                ]}
              >
                <Ionicons name={option.icon} size={22} color={option.color} />
              </View>

              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>{option.title}</Text>
                <Text style={styles.cardSubtitle}>{option.subtitle}</Text>
              </View>

              <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },

  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#111827",
  },

  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
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
  userName: { fontSize: 15, fontWeight: "700", color: "#111827" },
  userHandle: { fontSize: 13, color: "#9CA3AF", marginTop: 1 },

  list: {
    marginTop: 8,
    paddingHorizontal: 16,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 16,
  },
  cardBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  iconWrapper: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: "700", color: "#111827" },
  cardSubtitle: { fontSize: 13, color: "#9CA3AF", marginTop: 2 },
});
