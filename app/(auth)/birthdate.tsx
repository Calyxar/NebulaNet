// app/(auth)/birthdate.tsx ✅
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import firestore from "@react-native-firebase/firestore";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function calculateAge(birthdate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthdate.getFullYear();
  const m = today.getMonth() - birthdate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthdate.getDate())) age--;
  return age;
}

function getAgeGroup(age: number): "under_13" | "teen" | "adult" {
  if (age < 13) return "under_13";
  if (age < 18) return "teen";
  return "adult";
}

export default function BirthdateScreen() {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();

  const [month, setMonth] = useState("");
  const [day, setDay] = useState("");
  const [year, setYear] = useState("");
  const [saving, setSaving] = useState(false);

  const gradientColors = isDark
    ? ([colors.background, colors.background] as const)
    : (["#DCEBFF", "#EEF4FF", "#FFFFFF"] as const);

  const isValid = () => {
    const m = parseInt(month);
    const d = parseInt(day);
    const y = parseInt(year);
    if (!m || !d || !y) return false;
    if (m < 1 || m > 12) return false;
    if (d < 1 || d > 31) return false;
    if (y < 1900 || y > new Date().getFullYear()) return false;
    const date = new Date(y, m - 1, d);
    return (
      date.getFullYear() === y &&
      date.getMonth() === m - 1 &&
      date.getDate() === d
    );
  };

  const handleContinue = async () => {
    if (!isValid()) {
      Alert.alert("Invalid Date", "Please enter a valid date of birth.");
      return;
    }

    const birthdate = new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
    );
    const age = calculateAge(birthdate);
    const ageGroup = getAgeGroup(age);
    const birthdateIso = birthdate.toISOString().split("T")[0];

    if (ageGroup === "under_13") {
      // Route to parental approval screen
      router.push({
        pathname: "/(auth)/parental-approval",
        params: { birthdate: birthdateIso, age: age.toString() },
      } as any);
      return;
    }

    setSaving(true);
    try {
      if (user?.uid) {
        await db.collection("profiles").doc(user.uid).update({
          birthdate: birthdateIso,
          age_group: ageGroup,
          updated_at: new Date().toISOString(),
          updated_at_ts: firestore.FieldValue.serverTimestamp(),
        });
      }

      if (ageGroup === "teen") {
        // Lock NSFW in settings
        await db
          .collection("user_settings")
          .doc(user!.uid)
          .set(
            { nsfw_locked: true, updated_at: new Date().toISOString() },
            { merge: true },
          );
      }

      router.replace("/(tabs)/home");
    } catch (err) {
      console.warn("Birthdate save failed:", err);
      router.replace("/(tabs)/home");
    } finally {
      setSaving(false);
    }
  };

  return (
    <LinearGradient
      colors={gradientColors as any}
      locations={[0, 0.5, 1]}
      style={{ flex: 1 }}
    >
      <SafeAreaView
        style={styles.container}
        edges={["top", "left", "right", "bottom"]}
      >
        <StatusBar
          barStyle={isDark ? "light-content" : "dark-content"}
          backgroundColor="transparent"
          translucent
        />

        <View style={styles.content}>
          <View
            style={[
              styles.iconWrap,
              { backgroundColor: colors.primary + "18" },
            ]}
          >
            <Text style={styles.iconEmoji}>🎂</Text>
          </View>

          <Text style={[styles.title, { color: colors.text }]}>
            When's your birthday?
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            We use this to personalize your experience and keep NebulaNet safe
            for everyone. Your birthday won't be shown publicly.
          </Text>

          <View style={styles.dateRow}>
            <View style={styles.dateFieldWrap}>
              <Text style={[styles.dateLabel, { color: colors.textTertiary }]}>
                Month
              </Text>
              <TextInput
                style={[
                  styles.dateInput,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                placeholder="MM"
                placeholderTextColor={colors.textTertiary}
                value={month}
                onChangeText={(v) => setMonth(v.replace(/\D/g, "").slice(0, 2))}
                keyboardType="number-pad"
                maxLength={2}
              />
            </View>
            <Text style={[styles.dateSep, { color: colors.textTertiary }]}>
              /
            </Text>
            <View style={styles.dateFieldWrap}>
              <Text style={[styles.dateLabel, { color: colors.textTertiary }]}>
                Day
              </Text>
              <TextInput
                style={[
                  styles.dateInput,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                placeholder="DD"
                placeholderTextColor={colors.textTertiary}
                value={day}
                onChangeText={(v) => setDay(v.replace(/\D/g, "").slice(0, 2))}
                keyboardType="number-pad"
                maxLength={2}
              />
            </View>
            <Text style={[styles.dateSep, { color: colors.textTertiary }]}>
              /
            </Text>
            <View style={[styles.dateFieldWrap, { flex: 2 }]}>
              <Text style={[styles.dateLabel, { color: colors.textTertiary }]}>
                Year
              </Text>
              <TextInput
                style={[
                  styles.dateInput,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                placeholder="YYYY"
                placeholderTextColor={colors.textTertiary}
                value={year}
                onChangeText={(v) => setYear(v.replace(/\D/g, "").slice(0, 4))}
                keyboardType="number-pad"
                maxLength={4}
              />
            </View>
          </View>

          <View
            style={[
              styles.notice,
              {
                backgroundColor: colors.primary + "12",
                borderColor: colors.primary + "30",
              },
            ]}
          >
            <Ionicons
              name="shield-checkmark-outline"
              size={18}
              color={colors.primary}
            />
            <Text style={[styles.noticeText, { color: colors.textSecondary }]}>
              Users under 13 require parental consent. Users under 18 have
              restricted content settings.
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.btn,
              { backgroundColor: isValid() ? colors.primary : colors.border },
            ]}
            onPress={handleContinue}
            disabled={!isValid() || saving}
            activeOpacity={0.9}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.btnText}>Continue</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: "center",
    gap: 20,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  iconEmoji: { fontSize: 44 },
  title: {
    fontSize: 28,
    fontWeight: "900",
    textAlign: "center",
    lineHeight: 34,
  },
  subtitle: { fontSize: 15, textAlign: "center", lineHeight: 22 },
  dateRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginTop: 8,
  },
  dateFieldWrap: { flex: 1, gap: 6 },
  dateLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    textAlign: "center",
  },
  dateInput: {
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 14,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  dateSep: { fontSize: 24, fontWeight: "300", paddingBottom: 14 },
  notice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 4,
  },
  noticeText: { flex: 1, fontSize: 13, lineHeight: 18 },
  footer: { paddingHorizontal: 24, paddingVertical: 20 },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
    borderRadius: 28,
  },
  btnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
});
