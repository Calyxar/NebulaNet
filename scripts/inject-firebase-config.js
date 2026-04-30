// scripts/inject-firebase-config.js
// ✅ FIXED: loads .env automatically so it works locally and on Vercel

require("dotenv").config({
  path: require("path").join(__dirname, "..", ".env"),
});
// Also try .env.production and .env.local as fallbacks
require("dotenv").config({
  path: require("path").join(__dirname, "..", ".env.production"),
  override: false,
});
require("dotenv").config({
  path: require("path").join(__dirname, "..", ".env.local"),
  override: false,
});

const fs = require("fs");
const path = require("path");

const FILES = [
  path.join(__dirname, "..", "public", "auth", "verify.html"),
  path.join(__dirname, "..", "public", "auth", "reset.html"),
  path.join(__dirname, "..", "public", "auth.html"),
  path.join(__dirname, "..", "public", "verify.html"),
  path.join(__dirname, "..", "public", "reset.html"),
];

const REQUIRED_VARS = [
  "EXPO_PUBLIC_FIREBASE_API_KEY",
  "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "EXPO_PUBLIC_FIREBASE_PROJECT_ID",
];

const MAPPING = {
  __FIREBASE_API_KEY__: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  __FIREBASE_AUTH_DOMAIN__: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  __FIREBASE_PROJECT_ID__: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
};

function main() {
  const missing = REQUIRED_VARS.filter((k) => !process.env[k]);
  if (missing.length) {
    console.error(
      `[inject-firebase-config] Missing required env vars: ${missing.join(", ")}`,
    );
    process.exit(1);
  }

  for (const file of FILES) {
    if (!fs.existsSync(file)) {
      console.warn(`[inject-firebase-config] Skipping (not found): ${file}`);
      continue;
    }

    let content = fs.readFileSync(file, "utf8");
    let changed = false;

    for (const [placeholder, value] of Object.entries(MAPPING)) {
      if (content.includes(placeholder)) {
        content = content.split(placeholder).join(value);
        changed = true;
      }
    }

    if (changed) {
      fs.writeFileSync(file, content, "utf8");
      console.log(`[inject-firebase-config] Injected: ${file}`);
    } else {
      console.log(`[inject-firebase-config] No placeholders found in: ${file}`);
    }
  }

  console.log("[inject-firebase-config] Done.");
}

main();
