// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      "dist/*",
      "supabase/functions/**", // ✅ Deno Edge Functions are not a Node/Expo lint target
    ],
  },
]);
