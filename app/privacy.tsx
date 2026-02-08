// app/privacy.tsx
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PrivacyPolicy() {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.h1}>NebulaNet Privacy Policy</Text>
        <Text style={styles.muted}>Effective date: February 7, 2026</Text>

        <Section title="Overview">
          NebulaNet is a social media app that lets users create accounts, share
          posts and stories, and interact with others. This Privacy Policy
          explains what information we collect, how we use it, and your choices.
        </Section>

        <Section title="Information we collect">
          • Account information: email address, username, and profile details
          you provide (name, bio, avatar).{"\n"}• User content: posts, stories,
          comments, messages, and media you upload.{"\n"}• App activity:
          interactions such as likes, follows, saves, shares, views, and
          engagement signals.{"\n"}• Diagnostics: basic crash logs and
          performance diagnostics to improve stability.
        </Section>

        <Section title="How we use information">
          • Provide core features (login, feed, stories, messaging,
          communities).{"\n"}• Personalize and improve the experience (show
          relevant content, fix bugs).{"\n"}• Maintain safety and security
          (prevent abuse, enforce rules, respond to reports).
        </Section>

        <Section title="Sharing">
          We do not sell your personal information. We may share information
          with service providers that help us operate the app (for example,
          hosting and database providers) only as needed to provide the service.
        </Section>

        <Section title="Data retention">
          We retain information as long as needed to provide the service, comply
          with legal obligations, and resolve disputes. You can request deletion
          as described below.
        </Section>

        <Section title="Your choices & account deletion">
          You can update certain profile details within the app. You can request
          account deletion by emailing:{"\n\n"}
          <Text style={styles.bold}>support@nebulanet.space</Text>
        </Section>

        <Section title="Security">
          We use reasonable safeguards to protect information. However, no
          method of transmission or storage is 100% secure.
        </Section>

        <Section title="Children">
          NebulaNet is not intended for children under 13. If you believe a
          child has provided personal information, contact us and we will take
          appropriate action.
        </Section>

        <Section title="Contact">
          If you have questions about this policy, contact us at:{"\n\n"}
          <Text style={styles.bold}>support@nebulanet.space</Text>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.h2}>{title}</Text>
      <Text style={styles.p}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  container: { padding: 16, paddingBottom: 48 },
  h1: { fontSize: 26, fontWeight: "800", marginBottom: 4 },
  muted: { color: "#555", marginBottom: 16 },
  section: { marginTop: 16 },
  h2: { fontSize: 18, fontWeight: "700", marginBottom: 6 },
  p: { fontSize: 14, lineHeight: 20, color: "#111" },
  bold: { fontWeight: "700" },
});
