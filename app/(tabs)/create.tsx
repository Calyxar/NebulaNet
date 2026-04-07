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

type CreateOptionId =
  | "post"
  | "story"
  | "media"
  | "poll"
  | "event"
  | "community";

interface CreateOption {
  id: CreateOptionId;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
}

export default function CreateScreen() {
  const { colors, isDark } = useTheme();

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
      {
        id: "community",
        title: "Create Community",
        subtitle: "Start your own space",
        icon: "people-outline",
        route: "/create/community",
      },
    ],
    [],
  );

  const go = (route: string) => router.push(route as any);

  return (
    <>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        translucent
        backgroundColor="transparent"
      />
      <SafeAreaView
        style={[styles.safe, { backgroundColor: colors.background }]}
        edges={["top", "left", "right"]}
      >
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Create
          </Text>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                shadowOpacity: isDark ? 0.22 : 0.05,
              },
            ]}
          >
            {options.map((o, idx) => (
              <TouchableOpacity
                key={o.id}
                style={[
                  styles.row,
                  idx !== 0 && [
                    styles.rowBorder,
                    { borderTopColor: colors.border },
                  ],
                ]}
                onPress={() => go(o.route)}
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

                <View style={styles.rowText}>
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

          <View
            style={[
              styles.tip,
              {
                backgroundColor: colors.card,
                shadowOpacity: isDark ? 0.22 : 0.05,
              },
            ]}
          >
            <View style={[styles.tipIcon, { backgroundColor: colors.surface }]}>
              <Ionicons name="bulb-outline" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.tipTitle, { color: colors.text }]}>
                Pro Tip
              </Text>
              <Text style={[styles.tipText, { color: colors.textTertiary }]}>
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
  safe: { flex: 1 },

  header: {
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "900",
  },

  content: {
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 24,
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
    paddingVertical: 14,
    gap: 12,
  },
  rowBorder: {
    borderTopWidth: 1,
  },

  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },

  rowText: { flex: 1 },

  rowTitle: {
    fontSize: 14.5,
    fontWeight: "900",
  },
  rowSubtitle: {
    marginTop: 2,
    fontSize: 12.5,
    fontWeight: "700",
  },

  tip: {
    marginTop: 14,
    borderRadius: 22,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 16,
    elevation: 2,
  },
  tipIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },

  tipTitle: {
    fontSize: 13.5,
    fontWeight: "900",
    marginBottom: 2,
  },

  tipText: {
    fontSize: 12.5,
    fontWeight: "700",
    lineHeight: 18,
  },
});
