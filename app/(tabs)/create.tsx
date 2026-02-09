// app/(tabs)/create.tsx
import AppHeader from "@/components/navigation/AppHeader";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo } from "react";
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type CreateOptionId = "post" | "story" | "media" | "poll" | "event";

interface CreateOption {
  id: CreateOptionId;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
}

export default function CreateScreen() {
  const options: CreateOption[] = useMemo(
    () => [
      {
        id: "post",
        title: "Create Post",
        subtitle: "Text, images, or videos",
        icon: "document-text-outline",
        route: "/create/post",
      },
      {
        id: "story",
        title: "Add Story",
        subtitle: "Disappears after 24 hours",
        icon: "flash-outline",
        route: "/create/story",
      },
      {
        id: "media",
        title: "Upload Media",
        subtitle: "Photos, videos, or audio",
        icon: "images-outline",
        route: "/create/media",
      },
      {
        id: "poll",
        title: "Create Poll",
        subtitle: "Ask your community",
        icon: "bar-chart-outline",
        route: "/create/poll",
      },
      {
        id: "event",
        title: "Create Event",
        subtitle: "Meetups or virtual",
        icon: "calendar-outline",
        route: "/create/event",
      },
    ],
    [],
  );

  const go = (route: string) => router.push(route as any);

  return (
    <>
      <StatusBar
        barStyle="dark-content"
        translucent
        backgroundColor="transparent"
      />

      {/* ✅ AppHeader handles TOP safe-area; keep only left/right here */}
      <SafeAreaView style={styles.safe} edges={["left", "right"]}>
        <AppHeader
          title="Create"
          backgroundColor="#F5F7FF"
          onBack={() => router.back()}
        />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <View style={styles.card}>
            {options.map((o, idx) => (
              <TouchableOpacity
                key={o.id}
                style={[styles.row, idx !== 0 && styles.rowBorder]}
                onPress={() => go(o.route)}
                activeOpacity={0.85}
              >
                <View style={styles.iconCircle}>
                  <Ionicons name={o.icon} size={22} color="#7C3AED" />
                </View>

                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>{o.title}</Text>
                  <Text style={styles.rowSubtitle}>{o.subtitle}</Text>
                </View>

                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.quickWrap}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>

            <View style={styles.quickRow}>
              <TouchableOpacity
                style={styles.quickCard}
                onPress={() => go("/create/post")}
                activeOpacity={0.85}
              >
                <View style={styles.quickIcon}>
                  <Ionicons name="add" size={20} color="#7C3AED" />
                </View>
                <Text style={styles.quickText}>Quick Post</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickCard}
                onPress={() => go("/create/story")}
                activeOpacity={0.85}
              >
                <View style={styles.quickIcon}>
                  <Ionicons name="camera" size={20} color="#7C3AED" />
                </View>
                <Text style={styles.quickText}>Story</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickCard}
                onPress={() => go("/create/media")}
                activeOpacity={0.85}
              >
                <View style={styles.quickIcon}>
                  <Ionicons name="videocam" size={20} color="#7C3AED" />
                </View>
                <Text style={styles.quickText}>Media</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.tip}>
            <View style={styles.tipIcon}>
              <Ionicons name="bulb-outline" size={20} color="#7C3AED" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.tipTitle}>Pro Tip</Text>
              <Text style={styles.tipText}>
                Posts with images usually get more engagement.
              </Text>
            </View>
          </View>

          <View style={{ height: 18 }} />
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F5F7FF",
  },

  content: {
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 24,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    paddingVertical: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 2,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },

  rowBorder: {
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },

  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F3ECFF",
    alignItems: "center",
    justifyContent: "center",
  },

  rowText: { flex: 1 },

  rowTitle: {
    fontSize: 14.5,
    fontWeight: "900",
    color: "#111827",
  },

  rowSubtitle: {
    marginTop: 2,
    fontSize: 12.5,
    fontWeight: "700",
    color: "#6B7280",
  },

  quickWrap: {
    marginTop: 16,
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 10,
    paddingLeft: 2,
  },

  quickRow: {
    flexDirection: "row",
    gap: 10,
  },

  quickCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 2,
  },

  quickIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },

  quickText: {
    fontSize: 12.5,
    fontWeight: "900",
    color: "#111827",
  },

  tip: {
    marginTop: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 2,
  },

  tipIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F3ECFF",
    alignItems: "center",
    justifyContent: "center",
  },

  tipTitle: {
    fontSize: 13.5,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 2,
  },

  tipText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#6B7280",
    lineHeight: 18,
  },
});
