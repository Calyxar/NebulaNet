// app/(tabs)/_layout.tsx - COMPLETE UPDATED VERSION
import { useAuth } from "@/hooks/useAuth";
import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

// Custom tab bar with center create button
function CustomTabBar({ state, descriptors, navigation }: any) {
  return (
    <View style={styles.tabBarContainer}>
      <View style={styles.tabBar}>
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          // Skip the create tab as it will be the center button
          if (route.name === "create") {
            return null;
          }

          // Skip notifications tab (accessed via header button)
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
            >
              <View style={isFocused ? styles.activeTab : styles.inactiveTab}>
                <Ionicons
                  name={iconName}
                  size={26}
                  color={isFocused ? "#7C3AED" : "#9CA3AF"}
                />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Center Create Button */}
      <TouchableOpacity
        style={styles.centerButton}
        onPress={() => navigation.navigate("create")}
        activeOpacity={0.8}
      >
        <View style={styles.centerButtonInner}>
          <View style={styles.centerButtonLogo}>
            <View style={styles.logoSwirl}>
              <View style={styles.logoSwirlInner} />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
}

export default function TabsLayout() {
  const { user, isLoading } = useAuth();

  // Show loading state
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  // Redirect to login if not authenticated
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
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Explore",
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: "Create",
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          href: null, // Hide from tab bar, accessed via header button
        }}
      />
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
    backgroundColor: "#1A1A1A",
    height: Platform.OS === "ios" ? 88 : 70,
    paddingBottom: Platform.OS === "ios" ? 28 : 12,
    paddingTop: 12,
    paddingHorizontal: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  activeTab: {
    alignItems: "center",
    justifyContent: "center",
  },
  inactiveTab: {
    alignItems: "center",
    justifyContent: "center",
  },
  centerButton: {
    position: "absolute",
    top: -32,
    alignSelf: "center",
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#7C3AED",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#7C3AED",
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 6,
    borderColor: "#1A1A1A",
  },
  centerButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#7C3AED",
    alignItems: "center",
    justifyContent: "center",
  },
  centerButtonLogo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#7C3AED",
    alignItems: "center",
    justifyContent: "center",
  },
  logoSwirl: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  logoSwirlInner: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#7C3AED",
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
});
