// app/(tabs)/create.tsx — CLEAN MINIMAL VERSION ✅

import AppHeader from "@/components/navigation/AppHeader";
import { useTheme } from "@/providers/ThemeProvider";
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

type CreateRoute =
  | "/create/post"
  | "/create/story"
  | "/create/media"
  | "/create/poll"
  | "/create/event"
  | "/create/community";

interface CreateOption {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: CreateRoute;
}

export default function CreateScreen() {
  const { colors, isDark } = useTheme();

  const options: CreateOption[] = useMemo(
    () => [
      {
        title: "Create Post",
        subtitle: "Text, images, or videos",
        icon: "document-text-outline",
        route: "/create/post",
      },
      {
        title: "Add Story",
        subtitle: "Disappears after 24 hours",
        icon: "flash-outline",
        route: "/create/story",
      },
      {
        title: "Upload Media",
        subtitle: "Photos, videos, or audio",
        icon: "images-outline",
        route: "/create/media",
      },
      {
        title: "Create Poll",
        subtitle: "Ask your audience",
        icon: "bar-chart-outline",
        route: "/create/poll",
      },
      {
        title: "Create Event",
        subtitle: "Meetups or virtual",
        icon: "calendar-outline",
        route: "/create/event",
      },
      {
        title: "Create Community",
        subtitle: "Start a space people can join",
        icon: "people-outline",
        route: "/create/community",
      },
    ],
    [],
  );

  return (
    <>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        translucent
        backgroundColor="transparent"
      />

      <SafeAreaView
        style={[styles.safe, { backgroundColor: colors.background }]}
        edges={["left", "right"]}
      >
        <AppHeader
          title="Create"
          backgroundColor="transparent"
          onBack={() => router.back()}
        />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                shadowOpacity: isDark ? 0.25 : 0.05,
              },
            ]}
          >
            {options.map((o, idx) => (
              <TouchableOpacity
                key={o.title}
                style={[
                  styles.row,
                  idx !== 0 && [
                    styles.rowBorder,
                    { borderTopColor: colors.border },
                  ],
                ]}
                onPress={() => router.push(o.route)}
                activeOpacity={0.85}
              >
                <View
                  style={[
                    styles.iconCircle,
                    { backgroundColor: colors.surface },
                  ]}
                >
                  <Ionicons name={o.icon} size={22} color={colors.primary} />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowTitle, { color: colors.text }]}>
                    {o.title}
                  </Text>
                  <Text
                    style={[styles.rowSubtitle, { color: colors.textTertiary }]}
                  >
                    {o.subtitle}
                  </Text>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={colors.textTertiary}
                />
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ height: 30 }} />
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  content: {
    paddingHorizontal: 18,
    paddingTop: 6,
  },

  card: {
    borderRadius: 22,
    paddingVertical: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 16,
    elevation: 2,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 16,
    gap: 12,
  },

  rowBorder: {
    borderTopWidth: 1,
  },

  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },

  rowTitle: {
    fontSize: 15,
    fontWeight: "900",
  },

  rowSubtitle: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: "600",
  },
});
