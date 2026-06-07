// app/settings/about.tsx ✅
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import * as Application from "expo-application";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import {
  Linking,
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

  // ✅ Always reads from build.gradle — never needs manual updates
  const version = Application.nativeApplicationVersion ?? "1.0.0";
  const buildNumber = Application.nativeBuildVersion ?? "1";

  const content = (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "transparent" }}
      edges={["top", "left", "right"]}
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
          {/* Brand row */}
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

          {/* ✅ Version pulled from build.gradle automatically */}
          {[
            { label: "Version", value: `${version} (${buildNumber})` },
            {
              label: "Support",
              value: "support@nebulanet.space",
              onPress: () => Linking.openURL("mailto:support@nebulanet.space"),
            },
            {
              label: "Security",
              value: "security@nebulanet.space",
              onPress: () => Linking.openURL("mailto:security@nebulanet.space"),
            },
            {
              label: "Website",
              value: "nebulanet.space",
              onPress: () => Linking.openURL("https://nebulanet.space"),
            },
          ].map(({ label, value, onPress }) => (
            <TouchableOpacity
              key={label}
              style={[
                styles.infoRow,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              onPress={onPress}
              disabled={!onPress}
              activeOpacity={onPress ? 0.75 : 1}
            >
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                {label}
              </Text>
              <View style={styles.infoRight}>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {value}
                </Text>
                {!!onPress && (
                  <Ionicons
                    name="open-outline"
                    size={14}
                    color={colors.textTertiary}
                  />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Legal */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              marginTop: 12,
            },
          ]}
        >
          {[
            { label: "Terms of Service", url: "https://nebulanet.space/terms" },
            { label: "Privacy Policy", url: "https://nebulanet.space/privacy" },
          ].map(({ label, url }, idx) => (
            <TouchableOpacity
              key={label}
              style={[
                styles.legalRow,
                { borderColor: colors.border },
                idx !== 0 && { borderTopWidth: 1 },
              ]}
              onPress={() => Linking.openURL(url)}
              activeOpacity={0.75}
            >
              <Text style={[styles.legalLabel, { color: colors.text }]}>
                {label}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.textTertiary}
              />
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.footer, { color: colors.textTertiary }]}>
          © {new Date().getFullYear()} NebulaNet. All rights reserved.
        </Text>
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
  body: { fontSize: 14, lineHeight: 20, marginBottom: 4 },
  infoRow: {
    marginTop: 10,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  infoLabel: { fontSize: 13, fontWeight: "700" },
  infoRight: { flexDirection: "row", alignItems: "center", gap: 4 },
  infoValue: { fontSize: 13, fontWeight: "700" },
  legalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  legalLabel: { fontSize: 14, fontWeight: "700" },
  footer: { fontSize: 12, textAlign: "center", marginTop: 16 },
});
