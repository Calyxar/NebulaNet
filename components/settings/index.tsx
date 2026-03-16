// components/settings/index.tsx — UPDATED ✅ dark mode
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

export interface SettingsItemProps {
  title: string;
  description?: string;
  icon?: IconName;
  value?: string;
  onPress?: () => void;
  showChevron?: boolean;
  toggle?: boolean;
  toggleValue?: boolean;
  onToggle?: (value: boolean) => void;
  danger?: boolean;
  disabled?: boolean;
  hideBorder?: boolean;
}

export function SettingsItem({
  title, description, icon, value, onPress,
  showChevron = true, toggle = false, toggleValue = false, onToggle,
  danger = false, disabled = false, hideBorder = false,
}: SettingsItemProps) {
  const { colors } = useTheme();

  const iconColor = danger ? colors.error ?? "#ff3b30" : disabled ? colors.border : colors.textSecondary;
  const titleColor = danger ? colors.error ?? "#ff3b30" : disabled ? colors.textTertiary : colors.text;

  return (
    <TouchableOpacity
      style={[
        styles.item,
        { borderBottomColor: colors.border, backgroundColor: colors.card },
        hideBorder && styles.noBorder,
        disabled && styles.disabled,
      ]}
      onPress={() => { if (!disabled && onPress) onPress(); }}
      disabled={disabled || toggle}
      activeOpacity={disabled ? 1 : 0.7}
    >
      {icon && (
        <Ionicons name={icon} size={22} color={iconColor} style={styles.icon} />
      )}

      <View style={styles.content}>
        <Text style={[styles.title, { color: titleColor }]}>{title}</Text>
        {description && (
          <Text style={[styles.description, { color: colors.textSecondary }]}>{description}</Text>
        )}
        {value && !description && (
          <Text style={[styles.value, { color: colors.textSecondary }]}>{value}</Text>
        )}
      </View>

      {toggle ? (
        <Switch
          value={toggleValue}
          onValueChange={(v) => { if (!disabled && onToggle) onToggle(v); }}
          disabled={disabled}
          trackColor={{ false: colors.border, true: colors.primary + "60" }}
          thumbColor={toggleValue ? colors.primary : colors.textTertiary}
        />
      ) : showChevron && (
        <Ionicons name="chevron-forward" size={20} color={danger ? colors.error ?? "#ff3b30" : colors.textTertiary} />
      )}
    </TouchableOpacity>
  );
}

export interface SettingsGroupProps {
  title: string;
  children: React.ReactNode;
  description?: string;
}

export function SettingsGroup({ title, children, description }: SettingsGroupProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.group}>
      <View style={styles.groupHeader}>
        <Text style={[styles.groupTitle, { color: colors.textSecondary }]}>{title}</Text>
        {description && (
          <Text style={[styles.groupDescription, { color: colors.textTertiary }]}>{description}</Text>
        )}
      </View>
      <View style={[styles.groupContent, { backgroundColor: colors.card }]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { marginBottom: 20 },
  groupHeader: { paddingHorizontal: 16, paddingVertical: 8 },
  groupTitle: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  groupDescription: { fontSize: 11, marginTop: 2 },
  groupContent: { borderRadius: 12, overflow: "hidden", marginHorizontal: 16 },
  item: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, minHeight: 56 },
  noBorder: { borderBottomWidth: 0 },
  disabled: { opacity: 0.5 },
  icon: { marginRight: 12, width: 24 },
  content: { flex: 1, justifyContent: "center" },
  title: { fontSize: 16, fontWeight: "500", lineHeight: 20 },
  description: { fontSize: 13, marginTop: 2, lineHeight: 16 },
  value: { fontSize: 14, marginTop: 2, fontWeight: "400" },
});