// app/privacy.tsx
import React from "react";
import { ScrollView, Text } from "react-native";

export default function Privacy() {
  return (
    <ScrollView style={{ padding: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: "800" }}>
        NebulaNet Privacy Policy
      </Text>
      <Text style={{ marginTop: 12 }}>Contact: support@nebulanet.space</Text>
    </ScrollView>
  );
}
