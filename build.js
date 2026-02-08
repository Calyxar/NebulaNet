// build.js
const { execSync } = require("child_process");
require("dotenv").config();

console.log("🔧 Starting NebulaNet build...");
console.log(
  `- Supabase URL: ${process.env.EXPO_PUBLIC_SUPABASE_URL ? "Set" : "Not Set"}`,
);
console.log(
  `- App Domain: ${process.env.EXPO_PUBLIC_APP_DOMAIN || "nebulanet.space"}`,
);
console.log(
  `- App URL: ${process.env.EXPO_PUBLIC_APP_URL || "https://nebulanet.space"}`,
);

try {
  // Set environment variables for the build
  const env = {
    ...process.env,
    EXPO_PUBLIC_APP_DOMAIN:
      process.env.EXPO_PUBLIC_APP_DOMAIN || "nebulanet.space",
    EXPO_PUBLIC_APP_URL:
      process.env.EXPO_PUBLIC_APP_URL || "https://nebulanet.space",
  };

  console.log("📦 Building web version...");

  // Use execSync with proper environment
  execSync("npx expo export --platform web --output-dir dist", {
    stdio: "inherit",
    env: env,
    shell: true,
  });

  console.log("✅ Build completed successfully!");
  console.log("📁 Output directory: dist/");
} catch (error) {
  console.error("❌ Build failed:", error.message);
  process.exit(1);
}
