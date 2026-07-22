// components/navigation/AppHeader.tsx ✅ FIXED
// ✅ FIXED: title was flex-centered between whatever's in left/leftWide
// and right/rightWide. When those two sides have unequal width (e.g.
// Analytics: a back button on the left, nothing on the right at all),
// the title visibly drifted toward the emptier side instead of staying
// centered on screen — confirmed via the Analytics screen's "Analytics"
// title sitting off to one side.
// Fix: the title now renders as its own absolutely-positioned layer
// (left: 0, right: 0, textAlign: 'center'), stacked UNDER the row of
// interactive left/right buttons via pointerEvents="none" — so it's
// centered against the full header width regardless of what's on either
// side, and taps still pass through to the real buttons on top of it.

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

  return (
    <View
      style={[
        styles.container,
        { backgroundColor, height: compact ? 48 : 56 },
        containerStyle,
      ]}
    >
      {/* ✅ FIX: absolutely-positioned centered title layer, stacked
          beneath the row below. pointerEvents="none" lets taps pass
          through to the real left/right buttons on top of it. */}
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
          <View style={styles.wideSlot}>{leftWide}</View>
        ) : (
          <View style={styles.side}>{leftNode}</View>
        )}
        {/* Spacer — no title rendered here anymore; the title is the
            absolutely-positioned layer above, not part of this row's
            flex layout, so it can't be pushed off-center by unequal
            left/right widths. Collapses to zero width when leftWide is
            already flex:1 and filling the row itself. */}
        {!leftWide && <View style={{ flex: 1 }} />}
        {rightWide ? (
          <View style={styles.wideSlot}>{rightWide}</View>
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
  wideSlot: {
    flex: 1,
    minWidth: 0,
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
