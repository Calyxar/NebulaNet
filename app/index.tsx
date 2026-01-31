// app/index.tsx - Welcome Screen (responsive height)
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import {
  Alert,
  ImageBackground,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function WelcomeScreen() {
  const router = useRouter();
  const { height: SCREEN_HEIGHT } = useWindowDimensions();

  const isShort = SCREEN_HEIGHT < 700; // iPhone SE / small Android
  const isVeryShort = SCREEN_HEIGHT < 620; // extra small

  useEffect(() => {
    console.log("WelcomeScreen mounted");
  }, []);

  const handleGetStarted = () => {
    try {
      router.push("/(auth)/signup");
    } catch (error) {
      console.error("Navigation error:", error);
      Alert.alert("Error", "Could not navigate to signup");
    }
  };

  const handleLogin = () => {
    try {
      router.push("/(auth)/login");
    } catch (error) {
      console.error("Navigation error:", error);
      Alert.alert("Error", "Could not navigate to login");
    }
  };

  return (
    <View style={styles.wrapper}>
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />

      <ImageBackground
        source={require("@/assets/images/portrait-millennial-friends-living-life-country-side-after-moving-from-city-1.png")}
        style={styles.background}
        resizeMode="cover"
      >
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.2)", "rgba(0,0,0,0.75)"]}
          locations={[0, 0.5, 1]}
          style={styles.gradient}
        >
          <SafeAreaView edges={["bottom"]} style={styles.safe}>
            <View
              style={[
                styles.container,
                {
                  paddingBottom: isVeryShort ? 18 : isShort ? 32 : 50,
                },
              ]}
            >
              <View
                style={[
                  styles.textContainer,
                  { marginBottom: isShort ? 20 : 40 },
                ]}
              >
                <Text style={[styles.title, { fontSize: isShort ? 30 : 34 }]}>
                  Step Into NebulaNet
                </Text>

                <Text
                  style={[
                    styles.subtitle,
                    {
                      fontSize: isShort ? 14 : 15,
                      lineHeight: isShort ? 20 : 22,
                    },
                  ]}
                >
                  Discover authentic relationships and real growth—one
                  conversation at a time.
                </Text>
              </View>

              <View
                style={[styles.socialRow, { marginBottom: isShort ? 18 : 32 }]}
              >
                <TouchableOpacity
                  style={styles.socialButton}
                  activeOpacity={0.7}
                >
                  <Ionicons name="logo-google" size={24} color="#DB4437" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.socialButton}
                  activeOpacity={0.7}
                >
                  <Ionicons name="logo-facebook" size={24} color="#1877F2" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.socialButton}
                  activeOpacity={0.7}
                >
                  <Ionicons name="logo-apple" size={28} color="#000000" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.ctaButton, { height: isShort ? 52 : 56 }]}
                onPress={handleGetStarted}
                activeOpacity={0.85}
              >
                <Text style={styles.ctaButtonText}>Let&apos;s Get Started</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleLogin}
                activeOpacity={0.7}
                style={styles.loginContainer}
              >
                <Text style={styles.loginText}>
                  Already have an account?{" "}
                  <Text style={styles.loginLink}>Log In</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: "#000" },
  background: { flex: 1, width: "100%", height: "100%" },
  gradient: { flex: 1, justifyContent: "flex-end" },

  safe: { flex: 1, justifyContent: "flex-end" },

  container: {
    paddingHorizontal: 24,
    alignItems: "center",
  },

  textContainer: { alignItems: "center" },

  title: {
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  subtitle: {
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
    paddingHorizontal: 8,
  },

  socialRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  socialButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  ctaButton: {
    width: "100%",
    borderRadius: 28,
    backgroundColor: "#7C3AED",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  ctaButtonText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },

  loginContainer: { paddingVertical: 12 },
  loginText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
  },
  loginLink: { fontWeight: "600", color: "#FFFFFF" },
});
