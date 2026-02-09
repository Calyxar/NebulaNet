// components/navigation/AppHeader.tsx
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
  right?: React.ReactNode;

  // Wide slots (brand / multi-actions)
  leftWide?: React.ReactNode;
  rightWide?: React.ReactNode;

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
  const hasTitle = !!title && title.trim().length > 0;

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
      >
        <Ionicons name="arrow-back" size={22} color="#111827" />
      </Pressable>
    </View>
  ) : (
    <View style={styles.sideGhost} />
  );

  const RightNode = rightWide ? (
    <View style={styles.rightWide}>{rightWide}</View>
  ) : (
    <View style={styles.side}>
      {right ?? <View style={styles.sideGhost} />}
    </View>
  );

  return (
    <View
      style={[
        styles.shell,
        { paddingTop: insets.top, backgroundColor },
        containerStyle,
      ]}
    >
      <View style={styles.row}>
        {/* LEFT */}
        {hasTitle ? (
          LeftNode
        ) : (
          // ✅ When there's no title, let left occupy remaining space.
          <View style={styles.leftNoTitleWrap}>{LeftNode}</View>
        )}

        {/* CENTER (only if title exists) */}
        {hasTitle ? (
          <View
            style={[
              styles.titleWrap,
              titleAlign === "left" ? styles.titleWrapLeft : undefined,
            ]}
          >
            <Text numberOfLines={1} style={styles.title}>
              {title}
            </Text>
          </View>
        ) : null}

        {/* RIGHT */}
        {RightNode}
      </View>
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

  side: {
    width: SIDE,
    height: SIDE,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  sideGhost: { width: SIDE, height: SIDE },

  // ✅ Critical: flex:1 + minWidth:0 prevents text squish/measure bugs on Android
  leftNoTitleWrap: {
    flex: 1,
    minWidth: 0,
    marginRight: 10,
  },

  leftWide: {
    minHeight: SIDE,
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
  },

  rightWide: {
    minHeight: SIDE,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    flexShrink: 0,
    marginLeft: 10,
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
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  titleWrapLeft: { alignItems: "flex-start" },

  title: {
    fontSize: 16,
    fontWeight: Platform.select({ ios: "900", android: "800" }) as any,
    color: "#111827",
  },
});
