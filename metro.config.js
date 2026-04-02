// metro.config.js
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// ✅ Make .svg load as source (component), not asset (number)
config.transformer.babelTransformerPath =
  require.resolve("react-native-svg-transformer");

config.resolver.assetExts = config.resolver.assetExts.filter(
  (ext) => ext !== "svg",
);

config.resolver.sourceExts = [
  ...config.resolver.sourceExts,
  "svg",
  "ttf",
  "otf",
  "woff",
  "woff2",
];

// ✅ FIXED: stub react-native-google-mobile-ads on web
// Prevents Vercel build failure: "Importing native-only module on web"
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === "web" && moduleName === "react-native-google-mobile-ads") {
    return {
      filePath: path.resolve(
        __dirname,
        "mocks/react-native-google-mobile-ads.js",
      ),
      type: "sourceFile",
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
