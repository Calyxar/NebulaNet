// metro.config.js
const { getDefaultConfig } = require("expo/metro-config");

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

module.exports = config;
