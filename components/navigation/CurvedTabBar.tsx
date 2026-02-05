import { Home, MessageCircle, Search, User } from "lucide-react-native";
import React from "react";
import { Image, StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

export const TAB_BAR_BASE_HEIGHT = 88;

export function getTabBarHeight(insetsBottom: number) {
  return TAB_BAR_BASE_HEIGHT + Math.max(insetsBottom, 10);
}

function TabIcon({
  route,
  focused,
}: {
  route: "home" | "explore" | "chat" | "profile";
  focused: boolean;
}) {
  const color = focused ? "#7C3AED" : "#9CA3AF";
  const size = 24;

  switch (route) {
    case "home":
      return <Home size={size} color={color} />;
    case "explore":
      return <Search size={size} color={color} />;
    case "chat":
      return <MessageCircle size={size} color={color} />;
    case "profile":
      return <User size={size} color={color} />;
  }
}

export function CurvedTabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  const height = getTabBarHeight(insets.bottom);

  return (
    <View style={[styles.wrapper, { height }]} pointerEvents="box-none">
      {/* SVG BAR WITH NOTCH */}
      <Svg width="100%" height={88} viewBox="0 0 390 88" style={styles.svg}>
        <Path
          d="
            M0 28
            Q0 0 28 0
            H140
            C155 0 165 12 170 22
            C178 40 212 40 220 22
            C225 12 235 0 250 0
            H362
            Q390 0 390 28
            V88
            H0
            Z
          "
          fill="rgba(255,255,255,0.98)"
          stroke="rgba(17,24,39,0.06)"
          strokeWidth={1}
        />
      </Svg>

      {/* TABS */}
      <View style={styles.row}>
        {state.routes.map((route: any, index: number) => {
          if (route.name === "notifications") return null;

          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          if (route.name === "create") {
            return (
              <View key={route.key} style={styles.centerSlot}>
                <TouchableOpacity
                  onPress={onPress}
                  activeOpacity={0.9}
                  style={styles.createBtn}
                >
                  <Image
                    source={require("@/assets/images/512_512_c.png")}
                    style={styles.createImg}
                  />
                </TouchableOpacity>
              </View>
            );
          }

          const mapped =
            route.name === "home"
              ? "home"
              : route.name === "explore"
                ? "explore"
                : route.name === "chat"
                  ? "chat"
                  : "profile";

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              activeOpacity={0.85}
              style={styles.tab}
            >
              <TabIcon route={mapped as any} focused={isFocused} />
              <View style={[styles.dot, isFocused && styles.dotActive]} />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
  },

  svg: {
    position: "absolute",
    bottom: 0,
  },

  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 22,
    paddingBottom: 10,
    height: 88,
  },

  tab: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },

  dot: {
    marginTop: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "transparent",
  },

  dotActive: {
    backgroundColor: "#7C3AED",
  },

  centerSlot: {
    width: 86,
    alignItems: "center",
  },

  createBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#7C3AED",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
    shadowColor: "#7C3AED",
    shadowOpacity: 0.25,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 14,
  },

  createImg: {
    width: 42,
    height: 42,
    resizeMode: "contain",
  },
});
