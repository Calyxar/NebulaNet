// metro.config.js
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// IMPORTANT: treat .svg as source, not asset
config.resolver.assetExts = config.resolver.assetExts.filter(
  (ext) => ext !== "svg",
);
config.resolver.sourceExts.push("svg");

// keep your font extensions
config.resolver.assetExts.push("ttf", "otf", "woff", "woff2");

config.transformer.babelTransformerPath =
  require.resolve("react-native-svg-transformer");

module.exports = config;
