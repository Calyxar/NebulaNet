// app/(tabs)/_layout.tsx - RESPONSIVE FOR ALL DEVICES
import { useAuth } from "@/hooks/useAuth";
import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  StyleSheet,
  TouchableOpacity,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Get screen dimensions
const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Determine device type
const isSmallPhone = SCREEN_WIDTH < 375; // iPhone SE, small Androids
const isTablet = SCREEN_WIDTH >= 768; // iPads, Android tablets
const isLargeTablet = SCREEN_WIDTH >= 1024; // iPad Pro, large tablets

// Responsive sizing based on device
const getResponsiveSizes = () => {
  if (isLargeTablet) {
    return {
      tabBarHeight: 85,
      centerButtonSize: 80,
      centerButtonElevation: -35,
      iconSize: 28,
      borderWidth: 6,
      cornerRadius: 28,
      horizontalPadding: 40,
    };
  } else if (isTablet) {
    return {
      tabBarHeight: 75,
      centerButtonSize: 72,
      centerButtonElevation: -32,
      iconSize: 26,
      borderWidth: 6,
      cornerRadius: 24,
      horizontalPadding: 30,
    };
  } else if (isSmallPhone) {
    return {
      tabBarHeight: 60,
      centerButtonSize: 58,
      centerButtonElevation: -25,
      iconSize: 22,
      borderWidth: 4,
      cornerRadius: 18,
      horizontalPadding: 12,
    };
  } else {
    // Standard phones (iPhone 12-15, Samsung A54, etc.)
    return {
      tabBarHeight: 65,
      centerButtonSize: 64,
      centerButtonElevation: -28,
      iconSize: 24,
      borderWidth: 5,
      cornerRadius: 20,
      horizontalPadding: 16,
    };
  }
};

const sizes = getResponsiveSizes();

// Custom tab bar that adapts to all screen sizes
function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.tabBarContainer}>
      <View
        style={[
          styles.tabBar,
          {
            paddingBottom: Math.max(insets.bottom, isTablet ? 12 : 8),
            height: sizes.tabBarHeight,
            paddingHorizontal: sizes.horizontalPadding,
            borderTopLeftRadius: sizes.cornerRadius,
            borderTopRightRadius: sizes.cornerRadius,
          },
        ]}
      >
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          // Skip the create tab as it will be the center button
          if (route.name === "create") {
            return null;
          }

          // Skip notifications tab
          if (route.name === "notifications") {
            return null;
          }

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

          // Get icon name based on route
          let iconName: keyof typeof Ionicons.glyphMap = "home";
          if (route.name === "home") {
            iconName = isFocused ? "home" : "home-outline";
          } else if (route.name === "explore") {
            iconName = isFocused ? "search" : "search-outline";
          } else if (route.name === "chat") {
            iconName = isFocused ? "chatbubbles" : "chatbubbles-outline";
          } else if (route.name === "profile") {
            iconName = isFocused ? "person" : "person-outline";
          }

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              testID={options.tabBarTestID}
              onPress={onPress}
              style={styles.tabButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name={iconName}
                size={sizes.iconSize}
                color={isFocused ? "#7C3AED" : "#9CA3AF"}
              />
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Center Create Button - Responsive */}
      <TouchableOpacity
        style={[
          styles.centerButton,
          {
            top: sizes.centerButtonElevation,
            width: sizes.centerButtonSize,
            height: sizes.centerButtonSize,
            borderRadius: sizes.centerButtonSize / 2,
            borderWidth: sizes.borderWidth,
          },
        ]}
        onPress={() => navigation.navigate("create")}
        activeOpacity={0.8}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Image
          source={require("@/assets/images/512_512_c.png")}
          style={[
            styles.centerButtonImage,
            {
              width: sizes.centerButtonSize - 10,
              height: sizes.centerButtonSize - 10,
            },
          ]}
          resizeMode="contain"
        />
      </TouchableOpacity>
    </View>
  );
}

export default function TabsLayout() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="home" options={{ title: "Home" }} />
      <Tabs.Screen name="explore" options={{ title: "Explore" }} />
      <Tabs.Screen name="create" options={{ title: "Create" }} />
      <Tabs.Screen name="chat" options={{ title: "Chat" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F7FA",
  },
  tabBarContainer: {
    position: "relative",
    backgroundColor: "transparent",
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#000000",
    paddingTop: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -3,
    },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  centerButton: {
    position: "absolute",
    alignSelf: "center",
    backgroundColor: "#7C3AED",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#7C3AED",
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 12,
    borderColor: "#000000",
    overflow: "hidden",
  },
  centerButtonImage: {
    // Width and height set dynamically based on device
  },
});
