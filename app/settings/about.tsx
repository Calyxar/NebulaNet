// app/settings/about.tsx
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AboutScreen() {
  return (
    <LinearGradient
      colors={["#DCEBFF", "#EEF4FF", "#FFFFFF"]}
      locations={[0, 0.45, 1]}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerCircleButton}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>About NebulaNet</Text>

          <View style={styles.headerCircleButton} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <View style={styles.brandRow}>
              <View style={styles.logoBubble}>
                <Ionicons name="planet-outline" size={22} color="#7C3AED" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.appName}>NebulaNet</Text>
                <Text style={styles.appMeta}>nebulanet.space</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <Text style={styles.body}>
              NebulaNet is built for communities — fast posting, clean
              discovery, and privacy you can control.
            </Text>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Version</Text>
              <Text style={styles.infoValue}>1.0.0</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Support</Text>
              <Text style={styles.infoValue}>support@nebulanet.space</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Security</Text>
              <Text style={styles.infoValue}>security@nebulanet.space</Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1, backgroundColor: "transparent" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 10,
  },
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
  headerCircleButton: {
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

  scrollContent: { paddingHorizontal: 18, paddingBottom: 28 },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 16,
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
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },

  appName: { fontSize: 18, fontWeight: "800", color: "#111827" },
  appMeta: { fontSize: 12, color: "#6B7280", marginTop: 2 },

  divider: { height: 1, backgroundColor: "#EEF2FF", marginVertical: 14 },

  body: { fontSize: 14, color: "#374151", lineHeight: 20 },

  infoRow: {
    marginTop: 14,
    backgroundColor: "#F8FAFF",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E6E9FF",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  infoLabel: { fontSize: 13, color: "#6B7280", fontWeight: "700" },
  infoValue: { fontSize: 13, color: "#111827", fontWeight: "700" },
});
