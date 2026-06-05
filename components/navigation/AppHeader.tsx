// components/navigation/AppHeader.tsx ✅
import { useTheme } from "@/providers/ThemeProvider";
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
  // ✅ Added leftIcon + onLeftPress so notifications screen back button works
  leftIcon?: keyof typeof Ionicons.glyphMap;
  onLeftPress?: () => void;
  left?: React.ReactNode;
  right?: React.ReactNode;
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
  leftIcon,
  onLeftPress,
  left,
  leftWide,
  right,
  rightWide,
  backgroundColor,
  containerStyle,
  titleAlign = "center",
}: Props) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const hasTitle = !!title && title.trim().length > 0;

  const bgColor = backgroundColor ?? colors.background;

  // ✅ onLeftPress + leftIcon takes priority over onBack
  const backHandler = onLeftPress ?? onBack;
  const backIcon: keyof typeof Ionicons.glyphMap = leftIcon ?? "arrow-back";

  const LeftNode = leftWide ? (
    <View style={styles.leftWide}>{leftWide}</View>
  ) : left ? (
    <View style={styles.side}>{left}</View>
  ) : backHandler ? (
    <View style={styles.side}>
      <Pressable
        onPress={backHandler}
        style={[
          styles.circleBtn,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            shadowOpacity: isDark ? 0.22 : 0.08,
          },
        ]}
        android_ripple={{ borderless: true }}
      >
        <Ionicons name={backIcon} size={22} color={colors.text} />
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
        { paddingTop: insets.top, backgroundColor: bgColor },
        containerStyle,
      ]}
    >
      <View style={styles.row}>
        {hasTitle ? (
          LeftNode
        ) : (
          <View style={styles.leftNoTitleWrap}>{LeftNode}</View>
        )}

        {hasTitle ? (
          <View
            style={[
              styles.titleWrap,
              titleAlign === "left" ? styles.titleWrapLeft : undefined,
            ]}
          >
            <Text
              numberOfLines={1}
              style={[styles.title, { color: colors.text }]}
            >
              {title}
            </Text>
          </View>
        ) : null}

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
  leftNoTitleWrap: { flex: 1, minWidth: 0, marginRight: 10 },
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
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
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
  },
});
