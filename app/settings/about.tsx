// app/settings/about.tsx — UPDATED ✅ dark mode
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AboutScreen() {
  const { colors, isDark } = useTheme();

  const content = (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "transparent" }}
      edges={["left", "right"]}
    >
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />

      <View style={styles.header}>
        <TouchableOpacity
          style={[
            styles.circleBtn,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          About NebulaNet
        </Text>
        <View style={styles.circleBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.brandRow}>
            <View
              style={[
                styles.logoBubble,
                { backgroundColor: colors.primary + "18" },
              ]}
            >
              <Ionicons
                name="planet-outline"
                size={22}
                color={colors.primary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.appName, { color: colors.text }]}>
                NebulaNet
              </Text>
              <Text style={[styles.appMeta, { color: colors.textSecondary }]}>
                nebulanet.space
              </Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <Text style={[styles.body, { color: colors.textSecondary }]}>
            NebulaNet is built for communities — fast posting, clean discovery,
            and privacy you can control.
          </Text>

          {[
            { label: "Version", value: "1.0.1" },
            { label: "Support", value: "support@nebulanet.space" },
            { label: "Security", value: "security@nebulanet.space" },
          ].map(({ label, value }) => (
            <View
              key={label}
              style={[
                styles.infoRow,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                {label}
              </Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {value}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );

  if (!isDark) {
    return (
      <LinearGradient
        colors={["#DCEBFF", "#EEF4FF", "#FFFFFF"]}
        locations={[0, 0.45, 1]}
        style={{ flex: 1 }}
      >
        {content}
      </LinearGradient>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 10,
  },
  headerTitle: { fontSize: 16, fontWeight: "700" },
  circleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  scroll: { paddingHorizontal: 18, paddingBottom: 28 },
  card: {
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 2,
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  logoBubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  appName: { fontSize: 18, fontWeight: "800" },
  appMeta: { fontSize: 12, marginTop: 2 },
  divider: { height: 1, marginVertical: 14 },
  body: { fontSize: 14, lineHeight: 20 },
  infoRow: {
    marginTop: 10,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  infoLabel: { fontSize: 13, fontWeight: "700" },
  infoValue: { fontSize: 13, fontWeight: "700" },
});
