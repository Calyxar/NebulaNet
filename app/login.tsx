// app/login.tsx
import { router } from "expo-router";
import { useEffect } from "react";

export default function LoginRedirect() {
  useEffect(() => {
    router.replace("/(auth)/login");
  }, []);

  return null;
}
