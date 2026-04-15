// app/u/[id].tsx — REACT NATIVE FIREBASE ✅
import firestore from "@react-native-firebase/firestore";
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

      // If it looks like a UUID, treat it as a user id; otherwise as a username.
      const looksLikeUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          raw,
        );

      try {
        let username: string | null = null;

        if (looksLikeUuid) {
          // Direct doc lookup by id
          const docSnap = await firestore()
            .collection("profiles")
            .doc(raw)
            .get();
          if (docSnap.exists()) {
            const data = docSnap.data() as any;
            username = data?.username ?? null;
          }
        } else {
          // Lookup by username
          const snap = await firestore()
            .collection("profiles")
            .where("username", "==", raw)
            .limit(1)
            .get();
          if (!snap.empty) {
            const data = snap.docs[0].data() as any;
            username = data?.username ?? null;
          }
        }

        if (!alive) return;

        if (username) {
          router.replace(`/user/${username}`);
          return;
        }

        router.replace("/+not-found");
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
