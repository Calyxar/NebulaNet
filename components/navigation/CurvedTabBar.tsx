import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
    Dimensions,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

const { width: W } = Dimensions.get("window");

// Curved bar with center notch
function getBarPath(width: number) {
  // tweak these to match your mock perfectly
  const notchW = 92; // width of the notch opening
  const notchDepth = 34; // how deep the notch goes downward
  const radius = 26; // corner radius
  const leftNotch = (width - notchW) / 2;
  const rightNotch = leftNotch + notchW;

  // SVG path for a rounded rectangle with a curved notch in the top middle
  return `
    M ${radius} 0
    H ${leftNotch - 14}
    C ${leftNotch - 6} 0, ${leftNotch - 4} ${notchDepth}, ${leftNotch + 18} ${notchDepth}
    C ${leftNotch + 34} ${notchDepth}, ${leftNotch + 36} 0, ${leftNotch + 52} 0
    H ${rightNotch - 52}
    C ${rightNotch - 36} 0, ${rightNotch - 34} ${notchDepth}, ${rightNotch - 18} ${notchDepth}
    C ${rightNotch + 4} ${notchDepth}, ${rightNotch + 6} 0, ${rightNotch + 14} 0
    H ${width - radius}
    Q ${width} 0, ${width} ${radius}
    V 120
    H 0
    V ${radius}
    Q 0 0, ${radius} 0
    Z
  `;
}

export function CurvedTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();

  const active = "#7C3AED";
  const inactive = "#8E8E93";
  const barBg = "#0B0B0F"; // slightly off-black like your mock

  const barHeight = 78 + Math.max(insets.bottom, 10);

  const routeMeta: Record<
    string,
    { label: string; icon: keyof typeof Ionicons.glyphMap }
  > = {
    home: { label: "Home", icon: "home" },
    explore: { label: "Explore", icon: "search" },
    chat: { label: "Chat", icon: "chatbubble-ellipses" },
    profile: { label: "Profile", icon: "person" },
  };

  return (
    <View style={[styles.wrap, { height: barHeight }]}>
      {/* SVG Bar Background (curved + notch) */}
      <View style={StyleSheet.absoluteFill}>
        <Svg
          width={W}
          height={barHeight}
          viewBox={`0 0 ${W} 120`}
          style={{ position: "absolute", bottom: 0 }}
        >
          <Path d={getBarPath(W)} fill={barBg} />
        </Svg>
      </View>

      {/* Center Button */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => navigation.navigate("create")}
        style={[
          styles.centerBtn,
          {
            backgroundColor: active,
            shadowColor: active,
            borderColor: barBg,
          },
        ]}
      >
        <Ionicons name="aperture" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Tabs Row */}
      <View
        style={[styles.row, { paddingBottom: Math.max(insets.bottom, 10) }]}
      >
        {state.routes.map((route: any, index: number) => {
          const name = route.name;

          // keep create + notifications hidden in the row
          if (name === "create" || name === "notifications") return null;

          const isFocused = state.index === index;

          const meta = routeMeta[name];
          if (!meta) return null;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented)
              navigation.navigate(name);
          };

          // Insert a spacer BEFORE the 3rd visible tab to make room for center button
          // (Home, Explore, [spacer], Chat, Profile)
          const isChat = name === "chat";

          return (
            <React.Fragment key={route.key}>
              {isChat && <View style={styles.spacer} />}
              <TouchableOpacity
                onPress={onPress}
                activeOpacity={0.75}
                style={styles.tab}
              >
                <Ionicons
                  name={meta.icon}
                  size={24}
                  color={isFocused ? active : inactive}
                  style={{ marginBottom: 2 }}
                />
                <Text
                  style={[
                    styles.label,
                    { color: isFocused ? "#FFFFFF" : inactive },
                  ]}
                >
                  {meta.label}
                </Text>
              </TouchableOpacity>
            </React.Fragment>
          );
        })}
      </View>

      {/* Soft top highlight (gives that “glass edge” feel) */}
      <View pointerEvents="none" style={styles.topGlow} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "relative",
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
    paddingTop: 18,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingVertical: 10,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  spacer: {
    width: 92,
  },
  centerBtn: {
    position: "absolute",
    alignSelf: "center",
    top: -18,
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 6,

    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: Platform.OS === "android" ? 16 : 0,
    zIndex: 10,
  },
  topGlow: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 120,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    // subtle highlight edge
    backgroundColor: "transparent",
    shadowColor: "#FFFFFF",
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
});
