// components/navigation/AppHeader.tsx ✅ FIXED (2nd pass)
// ✅ FIXED: the row unconditionally inserted a `{flex:1}` spacer
// whenever `leftWide` was absent, with no check for `rightWide`. On
// screens using rightWide alone (e.g. Chat: search + "New Chat"), that
// gave TWO competing flex:1 boxes — the spacer AND rightWide's own
// wideSlot — splitting the remaining width 50/50 instead of letting
// rightWide claim it all. That shoved the right-side buttons toward the
// horizontal center instead of the true right edge, which visually
// crowded/overlapped the absolutely-centered title text (row paints on
// top of the title layer since it's the later sibling) — reading as the
// title being "misaligned" rather than truly centered.
// Fix: only insert the spacer when NEITHER side is a "wide" slot —
// `!leftWide && !rightWide` — since a wide slot already claims flex:1
// on its own and needs no extra spacer competing with it.
// ✅ FIXED: rightWide's wideSlot previously defaulted to
// `alignItems: "stretch"` (the RN default for a column container),
// stretching whatever's inside it (e.g. headerActions) to the slot's
// full width — and since that inner content had no justifyContent of
// its own, it hugged the LEFT edge of the stretched box, not the right
// edge of the header. rightWide now gets its own style with
// `alignItems: "flex-end"` so right-side content is pushed flush
// against the true right edge regardless of what a given screen puts
// inside it. leftWide keeps the original stretch behavior (correct for
// things like a full-width search bar).

import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";

interface AppHeaderProps {
  title?: string;
  backgroundColor?: string;
  compact?: boolean;
  left?: React.ReactNode;
  leftWide?: React.ReactNode;
  right?: React.ReactNode;
  rightWide?: React.ReactNode;
  onBack?: () => void;
  onLeftPress?: () => void;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  backIcon?: keyof typeof Ionicons.glyphMap;
  containerStyle?: ViewStyle;
}

export default function AppHeader({
  title,
  backgroundColor = "transparent",
  compact = false,
  left,
  leftWide,
  right,
  rightWide,
  onBack,
  onLeftPress,
  leftIcon,
  backIcon = "arrow-back",
  containerStyle,
}: AppHeaderProps) {
  const { colors } = useTheme();

  const backHandler = onLeftPress ?? onBack;
  const hasTitle = !!title && title.length > 0;

  // leftWide takes over the whole left side (e.g. a search bar, or a
  // brand row) and always wins over a plain back button — a screen
  // passing leftWide has already decided what goes there.
  const leftNode = leftWide ? (
    leftWide
  ) : left ? (
    left
  ) : backHandler ? (
    <Pressable
      onPress={backHandler}
      hitSlop={10}
      style={[
        styles.iconBtn,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <Ionicons name={leftIcon ?? backIcon} size={20} color={colors.text} />
    </Pressable>
  ) : (
    <View style={styles.side} />
  );

  const rightNode = rightWide ? (
    rightWide
  ) : right ? (
    right
  ) : (
    <View style={styles.side} />
  );

  // When leftWide is the only real content and there's no right content
  // at all, skip rendering a matching-width ghost spacer on the right —
  // leftWide is meant to flexibly claim space (e.g. a search bar filling
  // most of the row), not be mirrored.
  const skipRightGhost = !!leftWide && !right && !rightWide;

  // ✅ FIX: only add the middle spacer when NEITHER side is "wide" —
  // a wide slot already claims flex:1 itself, so pairing it with this
  // spacer double-counts the available space and shrinks/shifts the
  // wide content away from its edge instead of letting it fill up to it.
  const needsMiddleSpacer = !leftWide && !rightWide;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor, height: compact ? 48 : 56 },
        containerStyle,
      ]}
    >
      {/* Centered title layer, stacked beneath the row below.
          pointerEvents="none" lets taps pass through to the real
          left/right buttons on top of it. */}
      {hasTitle && (
        <View style={styles.titleLayer} pointerEvents="none">
          <Text
            style={[styles.title, { color: colors.text }]}
            numberOfLines={1}
          >
            {title}
          </Text>
        </View>
      )}

      <View style={styles.row}>
        {leftWide ? (
          <View style={styles.wideSlotLeft}>{leftWide}</View>
        ) : (
          <View style={styles.side}>{leftNode}</View>
        )}
        {needsMiddleSpacer && <View style={{ flex: 1 }} />}
        {rightWide ? (
          <View style={styles.wideSlotRight}>{rightWide}</View>
        ) : !skipRightGhost ? (
          <View style={styles.side}>{rightNode}</View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  titleLayer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 17,
    fontWeight: "800",
    textAlign: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  side: {
    minWidth: 40,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  // leftWide keeps stretch behavior — correct for full-width content
  // like a search bar that's meant to fill the space it's given.
  wideSlotLeft: {
    flex: 1,
    minWidth: 0,
  },
  // rightWide is pinned to the true right edge instead of stretching
  // and hugging the left of its own slot.
  wideSlotRight: {
    flex: 1,
    minWidth: 0,
    alignItems: "flex-end",
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
});
