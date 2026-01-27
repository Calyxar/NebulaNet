import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

export default function WebVerifyEmailHandler() {
  const router = useRouter();

  useEffect(() => {
    const handleWebRedirect = () => {
      try {
        // Extract query parameters from URL
        const searchParams = new URLSearchParams(window.location.search);
        const token = searchParams.get("token");
        const type = searchParams.get("type");

        console.log("Web handler - Token:", token, "Type:", type);

        // Navigate to the main handler with parameters
        if (token && type) {
          router.replace(`/verify-email-handler?token=${token}&type=${type}`);
        } else {
          router.replace("/verify-email-handler");
        }
      } catch (error) {
        console.error("Web redirect error:", error);
        router.replace("/verify-email-handler");
      }
    };

    handleWebRedirect();
  }, [router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#007AFF" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
  },
});
