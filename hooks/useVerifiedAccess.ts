// hooks/useVerifiedAccess.ts
import { useAuth } from "@/hooks/useAuth";
import { router } from "expo-router";
import { Alert } from "react-native";

export const useVerifiedAccess = () => {
  const { isEmailVerified, user } = useAuth();

  const requireVerifiedEmail = (action: string = "perform this action") => {
    if (!isEmailVerified) {
      Alert.alert(
        "Email Verification Required",
        `Please verify your email address to ${action}.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Verify Email",
            onPress: () => router.push("/(auth)/verify-email"),
          },
        ],
      );
      return false;
    }
    return true;
  };

  const getVerificationStatus = () => ({
    isVerified: isEmailVerified,
    email: user?.email,
  });

  return { requireVerifiedEmail, getVerificationStatus };
};
