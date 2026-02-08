// app/delete-account.tsx
import { ScrollView, StyleSheet, Text } from "react-native";

export default function DeleteAccountPage() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Delete Your NebulaNet Account</Text>

      <Text style={styles.text}>
        You can delete your NebulaNet account at any time.
      </Text>

      <Text style={styles.heading}>How to delete your account</Text>
      <Text style={styles.text}>
        • Open the NebulaNet app{"\n"}• Go to Settings → Account → Delete
        Account{"\n"}• Follow the confirmation steps
      </Text>

      <Text style={styles.heading}>If you cannot access the app</Text>
      <Text style={styles.text}>
        Email us at <Text style={styles.bold}>support@nebulanet.space</Text>{" "}
        with the subject line <Text style={styles.bold}>Delete Account</Text>.
        {"\n\n"}
        Please include:
        {"\n"}• Your username
        {"\n"}• The email or phone number on the account
      </Text>

      <Text style={styles.heading}>Data deletion timeline</Text>
      <Text style={styles.text}>
        Account deletion requests are processed within{" "}
        <Text style={styles.bold}>30 days</Text>.{"\n\n"}
        Your profile and content will be deleted or anonymized. Some data may be
        retained if required for legal, security, or fraud-prevention purposes.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    maxWidth: 720,
    alignSelf: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 16,
  },
  heading: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 24,
    marginBottom: 8,
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
    color: "#333",
  },
  bold: {
    fontWeight: "600",
  },
});
