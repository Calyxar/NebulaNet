// app/u/[id].tsx ✅ — route by UID directly, profile screen handles both UID and username lookup
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

export default function UserIdRedirectScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    async function run() {
      const raw = (id || "").toString().trim();
      if (!raw) {
        router.replace("/+not-found");
        return;
      }

      try {
        if (!alive) return;
        // ✅ Route directly by UID — profile screen handles both UID and username lookup
        // No need to resolve username first — avoids User Not Found after username changes
        router.replace(`/user/${raw}` as any);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message || "Failed to open profile.");
      }
    }

    run();
    return () => {
      alive = false;
    };
  }, [id]);

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <ActivityIndicator />
      <Text style={{ marginTop: 12, fontWeight: "700" }}>Opening profile…</Text>
      {!!error && (
        <Text style={{ marginTop: 10, color: "#B42318", textAlign: "center" }}>
          {error}
        </Text>
      )}
    </View>
  );
}
