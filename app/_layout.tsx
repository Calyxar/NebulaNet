// app/index.tsx - Welcome Screen
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { ImageBackground, Text, TouchableOpacity, View } from "react-native";

export default function WelcomeScreen() {
  const router = useRouter();

  const handleGetStarted = () => {
    router.push("/(auth)/signup");
  };

  const handleLogin = () => {
    router.push("/(auth)/login");
  };

  return (
    <ImageBackground
      source={require("@/assets/images/nebula-background.png")}
      className="flex-1"
    >
      <LinearGradient
        colors={["rgba(0,0,0,0.7)", "rgba(0,0,0,0.3)", "transparent"]}
        className="absolute inset-0"
      />

      <View className="flex-1 justify-between px-6 py-12">
        {/* Header */}
        <View className="mt-20 items-center">
          <Text className="text-5xl font-bold text-white text-center mb-4">
            NebulaNet
          </Text>
          <Text className="text-xl text-gray-200 text-center px-4">
            Discover authentic relationships and real growth—one conversation at
            a time.
          </Text>
        </View>

        {/* Buttons */}
        <View className="mb-16 gap-4">
          <TouchableOpacity
            className="bg-purple-600 py-4 rounded-full items-center shadow-lg"
            onPress={handleGetStarted}
          >
            <Text className="text-white font-bold text-lg">
              Let&apos;s Get Started
            </Text>
          </TouchableOpacity>

          <TouchableOpacity className="py-4 items-center" onPress={handleLogin}>
            <Text className="text-gray-300 text-base">
              Already have an account? Log In
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ImageBackground>
  );
}
