import admin from "firebase-admin";
import { readFileSync } from "node:fs";

// Download a service account JSON from:
// Firebase Console → Project settings → Service accounts → Generate new private key
const serviceAccount = JSON.parse(
  readFileSync("./serviceAccountKey.json", "utf8"),
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const uid = process.argv[2];
if (!uid) throw new Error("Usage: node scripts/setAdminClaim.mjs <UID>");

await admin.auth().setCustomUserClaims(uid, { admin: true });

console.log("✅ Admin claim set for:", uid);
process.exit(0);
