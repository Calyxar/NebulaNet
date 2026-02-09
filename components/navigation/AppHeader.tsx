// components/navigation/AppHeader.tsx — COMPLETED + UPDATED
// ✅ Pixel-perfect, prevents "squish" for NebulaNet brand + wide search bars + multi-actions
// ✅ Wide areas can truly take space (no 44px clamp)
// ✅ Title never pushes/squeezes left/right wide content
// ✅ Consistent 56px row height + 44px side targets

import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View,
    ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  title?: string;
  onBack?: () => void;

  // 44x44 slot (icon)
  left?: React.ReactNode;

  // Wide slots (brand / search bar / multi-actions)
  leftWide?: React.ReactNode;
  rightWide?: React.ReactNode;

  // 44x44 slot (icon)
  right?: React.ReactNode;

  backgroundColor?: string;
  containerStyle?: ViewStyle;
  titleAlign?: "center" | "left";
};

const HEADER_ROW_HEIGHT = 56;
const SIDE = 44;

export default function AppHeader({
  title,
  onBack,
  left,
  leftWide,
  right,
  rightWide,
  backgroundColor = "#F5F7FF",
  containerStyle,
  titleAlign = "center",
}: Props) {
  const insets = useSafeAreaInsets();

  const LeftNode = leftWide ? (
    <View style={styles.leftWide}>{leftWide}</View>
  ) : left ? (
    <View style={styles.side}>{left}</View>
  ) : onBack ? (
    <View style={styles.side}>
      <Pressable
        onPress={onBack}
        style={styles.circleBtn}
        android_ripple={{ borderless: true }}
        hitSlop={8}
      >
        <Ionicons name="arrow-back" size={22} color="#111827" />
      </Pressable>
    </View>
  ) : (
    <View style={styles.sideGhost} />
  );

  const RightNode = rightWide ? (
    <View style={styles.rightWide}>{rightWide}</View>
  ) : right ? (
    <View style={styles.side}>{right}</View>
  ) : (
    <View style={styles.sideGhost} />
  );

  // If either side is "wide" we should not reserve center title space.
  // Otherwise, keep a centered title like a normal header.
  const hasWide = !!leftWide || !!rightWide;

  return (
    <View
      style={[
        styles.shell,
        { paddingTop: insets.top, backgroundColor },
        containerStyle,
      ]}
    >
      <View style={styles.row}>
        {/* Left */}
        <View style={styles.leftWrap}>{LeftNode}</View>

        {/* Center title (only when not using wide layouts) */}
        {!hasWide && (
          <View
            style={[
              styles.titleWrap,
              titleAlign === "left" && styles.titleWrapLeft,
            ]}
          >
            {!!title && (
              <Text numberOfLines={1} style={styles.title}>
                {title}
              </Text>
            )}
          </View>
        )}

        {/* Right */}
        <View style={styles.rightWrap}>{RightNode}</View>
      </View>

      {/* When using wide layouts, show the title BELOW row if provided (optional) */}
      {hasWide && !!title && (
        <View style={styles.wideTitleRow}>
          <Text numberOfLines={1} style={styles.title}>
            {title}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {},

  row: {
    height: HEADER_ROW_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
  },

  // Wraps ensure left/right don’t get constrained by center title
  leftWrap: {
    flexShrink: 1,
    minWidth: SIDE,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  rightWrap: {
    flexShrink: 0,
    minWidth: SIDE,
    alignItems: "flex-end",
    justifyContent: "center",
  },

  // 44x44 tap targets
  side: {
    width: SIDE,
    height: SIDE,
    alignItems: "center",
    justifyContent: "center",
  },
  sideGhost: { width: SIDE, height: SIDE },

  // Wide areas: allow them to take real width
  leftWide: {
    minHeight: SIDE,
    flexDirection: "row",
    alignItems: "center",
    flexGrow: 1,
    flexShrink: 1,
  },
  rightWide: {
    minHeight: SIDE,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    flexShrink: 0,
  },

  circleBtn: {
    width: SIDE,
    height: SIDE,
    borderRadius: SIDE / 2,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },

  titleWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  titleWrapLeft: { alignItems: "flex-start" },

  wideTitleRow: {
    paddingHorizontal: 18,
    paddingBottom: 10,
  },

  title: {
    fontSize: 16,
    fontWeight: Platform.select({ ios: "900", android: "800" }) as any,
    color: "#111827",
  },
});
