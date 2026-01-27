// app/index.tsx - Welcome Screen
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
} from "react-native";

export default function WelcomeScreen() {
  const router = useRouter();

  useEffect(() => {
    console.log("WelcomeScreen mounted");
  }, []);

  const handleGetStarted = () => {
    console.log("Get Started pressed");
    try {
      router.push("/(auth)/signup");
    } catch (error) {
      console.error("Navigation error:", error);
      Alert.alert("Error", "Could not navigate to signup");
    }
  };

  const handleLogin = () => {
    console.log("Login pressed");
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
          {/* Main Content Container */}
          <View style={styles.container}>
            {/* Title and Description */}
            <View style={styles.textContainer}>
              <Text style={styles.title}>Step Into NebulaNet</Text>
              <Text style={styles.subtitle}>
                Discover authentic relationships and real growth—one
                conversation at a time.
              </Text>
            </View>

            {/* Social Login Icons */}
            <View style={styles.socialRow}>
              <TouchableOpacity
                style={styles.socialButton}
                activeOpacity={0.7}
                onPress={() => console.log("Google login")}
              >
                <Ionicons name="logo-google" size={24} color="#DB4437" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.socialButton}
                activeOpacity={0.7}
                onPress={() => console.log("Facebook login")}
              >
                <Ionicons name="logo-facebook" size={24} color="#1877F2" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.socialButton}
                activeOpacity={0.7}
                onPress={() => console.log("Apple login")}
              >
                <Ionicons name="logo-apple" size={28} color="#000000" />
              </TouchableOpacity>
            </View>

            {/* Primary CTA Button */}
            <TouchableOpacity
              style={styles.ctaButton}
              onPress={handleGetStarted}
              activeOpacity={0.85}
            >
              <Text style={styles.ctaButtonText}>Let&apos;s Get Started</Text>
            </TouchableOpacity>

            {/* Login Link */}
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
        </LinearGradient>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: "#000",
  },
  background: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  gradient: {
    flex: 1,
    justifyContent: "flex-end",
  },
  container: {
    paddingHorizontal: 24,
    paddingBottom: 50,
    alignItems: "center",
  },
  textContainer: {
    marginBottom: 40,
    alignItems: "center",
  },
  title: {
    fontSize: 34,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  socialRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    marginBottom: 32,
  },
  socialButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  ctaButton: {
    width: "100%",
    height: 56,
    borderRadius: 28,
    backgroundColor: "#7C3AED",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#7C3AED",
    shadowOffset: {
      width: 0,
      height: 4,
    },
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
  loginContainer: {
    paddingVertical: 12,
  },
  loginText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
  },
  loginLink: {
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
