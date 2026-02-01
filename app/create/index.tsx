// app/create/index.tsx - NebulaNet DESIGN MATCH (clean + modern + responsive)
import { getTabBarHeight } from "@/components/navigation/CurvedTabBar";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import {
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

type CreateOption = {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  route: string;
};

const CREATE_OPTIONS: CreateOption[] = [
  {
    id: "post",
    title: "Create Post",
    description: "Share your thoughts with the community",
    icon: "create-outline",
    color: "#7C3AED",
    route: "/create/post",
  },
  {
    id: "media",
    title: "Share Media",
    description: "Upload photos or videos",
    icon: "image-outline",
    color: "#10B981",
    route: "/create/media",
  },
  {
    id: "event",
    title: "Create Event",
    description: "Organize a community event",
    icon: "calendar-outline",
    color: "#3B82F6",
    route: "/create/event",
  },
  {
    id: "poll",
    title: "Create Poll",
    description: "Ask for community opinions",
    icon: "stats-chart-outline",
    color: "#F59E0B",
    route: "/create/poll",
  },
  {
    id: "story",
    title: "Add to Story",
    description: "Share moments that disappear in 24 hours",
    icon: "flash-outline",
    color: "#EC4899",
    route: "/create/story",
  },
  {
    id: "article",
    title: "Write Article",
    description: "Share long-form content",
    icon: "document-text-outline",
    color: "#6366F1",
    route: "/create/article",
  },
];

export default function CreateIndexScreen() {
  const insets = useSafeAreaInsets();

  // ✅ IMPORTANT: this is what prevents overlap on Samsung A54 + all devices
  const bottomPad = getTabBarHeight(insets.bottom) + 16;

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
              <Text style={styles.headerTitle}>Create</Text>
              <Text style={styles.headerSub}>
                Choose what you&apos;d like to share
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
            {/* Options Grid */}
            <View style={styles.grid}>
              {CREATE_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={styles.card}
                  activeOpacity={0.9}
                  onPress={() => router.push(option.route as any)}
                >
                  <View
                    style={[
                      styles.iconWrap,
                      { backgroundColor: `${option.color}1A` },
                    ]}
                  >
                    <Ionicons
                      name={option.icon}
                      size={26}
                      color={option.color}
                    />
                  </View>

                  <Text style={styles.cardTitle}>{option.title}</Text>
                  <Text style={styles.cardDesc} numberOfLines={2}>
                    {option.description}
                  </Text>

                  <View style={styles.cardChevron}>
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color="#9CA3AF"
                    />
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* Quick Create */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Quick Create</Text>
              </View>

              <View style={styles.quickRow}>
                <QuickPill
                  label="Text"
                  icon="text-outline"
                  color="#7C3AED"
                  onPress={() => router.push("/create/post" as any)}
                />
                <QuickPill
                  label="Photo"
                  icon="image-outline"
                  color="#10B981"
                  onPress={() => router.push("/create/media" as any)}
                />
                <QuickPill
                  label="Poll"
                  icon="stats-chart-outline"
                  color="#F59E0B"
                  onPress={() => router.push("/create/poll" as any)}
                />
              </View>
            </View>

            {/* Drafts */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Recent Drafts</Text>
                <TouchableOpacity activeOpacity={0.85}>
                  <Text style={styles.seeAll}>See All</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.list}>
                <DraftRow
                  icon="document-text-outline"
                  title="My thoughts on the new update..."
                  meta="Yesterday • 4:30 PM"
                  onPress={() => {}}
                />
                <DraftRow
                  icon="image-outline"
                  title="Vacation photos — draft"
                  meta="2 days ago"
                  onPress={() => {}}
                />
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </>
  );
}

function QuickPill({
  label,
  icon,
  color,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.quickPill}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={[styles.quickIcon, { backgroundColor: `${color}1A` }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={styles.quickLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function DraftRow({
  icon,
  title,
  meta,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  meta: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={20} color="#6B7280" />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.rowMeta}>{meta}</Text>
      </View>

      <Ionicons name="ellipsis-horizontal" size={20} color="#9CA3AF" />
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
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#111827" },
  headerSub: { marginTop: 2, fontSize: 13, color: "#6B7280" },

  content: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 20, // base padding; dynamic paddingBottom added inline
  },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  card: {
    width: "48%",
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
    overflow: "hidden",
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 14.5,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 6,
  },
  cardDesc: {
    fontSize: 12.5,
    color: "#6B7280",
    lineHeight: 17,
    paddingRight: 18,
  },
  cardChevron: {
    position: "absolute",
    right: 10,
    top: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(17,24,39,0.04)",
    alignItems: "center",
    justifyContent: "center",
  },

  section: { marginTop: 18 },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: "900", color: "#111827" },
  seeAll: { fontSize: 13, fontWeight: "800", color: "#7C3AED" },

  quickRow: { flexDirection: "row", gap: 10 },
  quickPill: {
    flex: 1,
    height: 54,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.06)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: Platform.OS === "android" ? 0.06 : 0.04,
    shadowRadius: 14,
    elevation: 1,
  },
  quickIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  quickLabel: { fontSize: 13.5, fontWeight: "900", color: "#111827" },

  list: { gap: 10 },
  row: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.06)",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: Platform.OS === "android" ? 0.06 : 0.04,
    shadowRadius: 14,
    elevation: 1,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "rgba(17,24,39,0.04)",
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: {
    fontSize: 14.5,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 2,
  },
  rowMeta: { fontSize: 12.5, color: "#6B7280" },
});
