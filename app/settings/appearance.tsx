// app/settings/appearance.tsx — COMPLETED + UPDATED
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTheme } from "@/providers/ThemeProvider";
import { useLocalSearchParams } from "expo-router";
import { closeSettings } from "./routes";

type ThemeOption = "system" | "light" | "dark";

function ThemeOptionRow({
  value,
  title,
  subtitle,
  selected,
  onSelect,
  colors,
}: {
  value: ThemeOption;
  title: string;
  subtitle: string;
  selected: boolean;
  onSelect: (value: ThemeOption) => void;
  colors: any;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onSelect(value)}
      style={[
        styles.option,
        {
          backgroundColor: colors.card,
          borderColor: selected ? colors.primary : colors.border,
        },
      ]}
    >
      <View style={styles.optionLeft}>
        <Text style={[styles.optionTitle, { color: colors.text }]}>
          {title}
        </Text>
        <Text style={[styles.optionSub, { color: colors.textSecondary }]}>
          {subtitle}
        </Text>
      </View>

      {selected ? (
        <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
      ) : (
        <Ionicons
          name="ellipse-outline"
          size={22}
          color={colors.textTertiary}
        />
      )}
    </TouchableOpacity>
  );
}

export default function AppearanceScreen() {
  const { theme, setTheme, colors } = useTheme();
  const params = useLocalSearchParams<{ returnTo?: string }>();

  const onSelect = (value: ThemeOption) => {
    void setTheme(value); // setTheme is async (local + remote persist)
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => closeSettings(params.returnTo)}
          style={[
            styles.headerBtn,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Ionicons name="chevron-back" size={18} color={colors.text} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Appearance
        </Text>

        <View style={{ width: 44 }} />
      </View>

      <Text style={[styles.helper, { color: colors.textSecondary }]}>
        Choose how NebulaNet looks on your device.
      </Text>

      <View style={styles.list}>
        <ThemeOptionRow
          value="system"
          title="System"
          subtitle="Match your device setting"
          selected={theme === "system"}
          onSelect={onSelect}
          colors={colors}
        />
        <ThemeOptionRow
          value="light"
          title="Light"
          subtitle="Always use light mode"
          selected={theme === "light"}
          onSelect={onSelect}
          colors={colors}
        />
        <ThemeOptionRow
          value="dark"
          title="Dark"
          subtitle="Always use dark mode"
          selected={theme === "dark"}
          onSelect={onSelect}
          colors={colors}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 18, paddingTop: 6 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 10,
  },
  headerBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  headerTitle: { fontSize: 18, fontWeight: "800" },
  helper: { marginTop: 4, fontSize: 13, lineHeight: 18 },
  list: { marginTop: 14, gap: 10 },
  option: {
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  optionLeft: { flex: 1, paddingRight: 12 },
  optionTitle: { fontSize: 14, fontWeight: "800" },
  optionSub: { marginTop: 4, fontSize: 12, lineHeight: 16 },
});
