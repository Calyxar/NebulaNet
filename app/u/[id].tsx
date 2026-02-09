import { supabase } from "@/lib/supabase";
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

      // If someone typed /u/testuser, treat it like a username too.
      // If it looks like a UUID, treat it like a user id.
      const looksLikeUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          raw,
        );

      try {
        const q = supabase
          .from("profiles")
          .select("id, username")
          .limit(1)
          .maybeSingle();

        const { data, error } = looksLikeUuid
          ? await q.eq("id", raw)
          : await q.eq("username", raw);

        if (!alive) return;

        if (error) throw error;

        // If we found a username, redirect to the canonical URL
        if (data?.username) {
          router.replace(`/user/${data.username}`);
          return;
        }

        // If we found only id (no username set), go to profile by id (optional),
        // otherwise show not found.
        // If you do NOT have a /user-id/[id] route, keep not-found.
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
