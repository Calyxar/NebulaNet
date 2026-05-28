import { useSettings } from "@/hooks/useSettings";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type ThemeOption = "system" | "light" | "dark";
type FontSize = "small" | "medium" | "large";

function SectionTitle({ label, colors }: { label: string; colors: any }) {
  return (
    <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>
      {label}
    </Text>
  );
}

function OptionRow({
  title,
  subtitle,
  selected,
  onPress,
  colors,
}: {
  title: string;
  subtitle?: string;
  selected: boolean;
  onPress: () => void;
  colors: any;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
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
        {subtitle ? (
          <Text style={[styles.optionSub, { color: colors.textSecondary }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Ionicons
        name={selected ? "checkmark-circle" : "ellipse-outline"}
        size={22}
        color={selected ? colors.primary : colors.textTertiary}
      />
    </TouchableOpacity>
  );
}

export default function AppearanceScreen() {
  const { theme, setTheme, colors, isDark, fontScale } = useTheme();
  const { settings, updatePreferences } = useSettings();
  const params = useLocalSearchParams<{ returnTo?: string }>();

  const currentFontSize =
    (settings?.preferences?.font_size as FontSize) ?? "medium";
  const currentReduceAnimations =
    settings?.preferences?.reduce_animations ?? false;
  const hapticsEnabled = settings?.preferences?.haptics_enabled ?? true;

  const handleTheme = (value: ThemeOption) => {
    void setTheme(value);
  };

  const handleFontSize = (value: FontSize) => {
    updatePreferences.mutate({ font_size: value });
  };

  const handleReduceAnimations = (value: boolean) => {
    updatePreferences.mutate({ reduce_animations: value });
  };

  const handleHaptics = (value: boolean) => {
    updatePreferences.mutate({ haptics_enabled: value });
  };

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
          activeOpacity={0.85}
          onPress={() => router.back()}
          style={[
            styles.headerBtn,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Ionicons name="arrow-back" size={18} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Appearance
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* Preview card */}
        <View
          style={[
            styles.previewCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text
            style={[
              styles.previewTitle,
              { color: colors.text, fontSize: 16 * fontScale },
            ]}
          >
            Preview
          </Text>
          <Text
            style={[
              styles.previewBody,
              { color: colors.textSecondary, fontSize: 13 * fontScale },
            ]}
          >
            This text reflects your current font size setting.
          </Text>
        </View>

        {/* Theme */}
        <SectionTitle label="THEME" colors={colors} />
        <View style={styles.group}>
          <OptionRow
            title="System"
            subtitle="Match your device setting"
            selected={theme === "system"}
            onPress={() => handleTheme("system")}
            colors={colors}
          />
          <OptionRow
            title="Light"
            subtitle="Always use light mode"
            selected={theme === "light"}
            onPress={() => handleTheme("light")}
            colors={colors}
          />
          <OptionRow
            title="Dark"
            subtitle="Always use dark mode"
            selected={theme === "dark"}
            onPress={() => handleTheme("dark")}
            colors={colors}
          />
        </View>

        {/* Font size */}
        <SectionTitle label="FONT SIZE" colors={colors} />
        <View style={styles.group}>
          <OptionRow
            title="Small"
            subtitle="Compact text, more content visible"
            selected={currentFontSize === "small"}
            onPress={() => handleFontSize("small")}
            colors={colors}
          />
          <OptionRow
            title="Medium"
            subtitle="Default size"
            selected={currentFontSize === "medium"}
            onPress={() => handleFontSize("medium")}
            colors={colors}
          />
          <OptionRow
            title="Large"
            subtitle="Easier to read"
            selected={currentFontSize === "large"}
            onPress={() => handleFontSize("large")}
            colors={colors}
          />
        </View>

        {/* Accessibility */}
        <SectionTitle label="ACCESSIBILITY" colors={colors} />
        <View style={styles.group}>
          <View
            style={[
              styles.toggleCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.toggleLeft}>
              <Text style={[styles.optionTitle, { color: colors.text }]}>
                Reduce Animations
              </Text>
              <Text style={[styles.optionSub, { color: colors.textSecondary }]}>
                Minimise motion effects throughout the app
              </Text>
            </View>
            <Switch
              value={currentReduceAnimations}
              onValueChange={handleReduceAnimations}
              trackColor={{ false: colors.border, true: colors.primary + "60" }}
              thumbColor={
                currentReduceAnimations ? colors.primary : colors.textTertiary
              }
            />
          </View>

          <View
            style={[
              styles.toggleCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.toggleLeft}>
              <Text style={[styles.optionTitle, { color: colors.text }]}>
                Haptic Feedback
              </Text>
              <Text style={[styles.optionSub, { color: colors.textSecondary }]}>
                Vibration feedback on interactions
              </Text>
            </View>
            <Switch
              value={hapticsEnabled}
              onValueChange={handleHaptics}
              trackColor={{ false: colors.border, true: colors.primary + "60" }}
              thumbColor={hapticsEnabled ? colors.primary : colors.textTertiary}
            />
          </View>
        </View>

        <Text style={[styles.footer, { color: colors.textTertiary }]}>
          Font size changes apply immediately. Theme changes apply instantly.
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
  headerBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  headerTitle: { fontSize: 17, fontWeight: "800" },
  scroll: { padding: 16, paddingBottom: 32, gap: 8 },
  previewCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    marginBottom: 8,
  },
  previewTitle: { fontWeight: "800", marginBottom: 6 },
  previewBody: { lineHeight: 20 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginTop: 8,
    marginBottom: 6,
    marginLeft: 4,
  },
  group: { gap: 8 },
  option: {
    borderRadius: 16,
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
  toggleCard: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  toggleLeft: { flex: 1, paddingRight: 12 },
  footer: {
    textAlign: "center",
    fontSize: 12,
    marginTop: 12,
    paddingHorizontal: 8,
  },
});
