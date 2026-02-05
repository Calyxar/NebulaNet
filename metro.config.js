const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push("ttf", "otf", "woff", "woff2");

config.transformer.babelTransformerPath =
  require.resolve("react-native-svg-transformer");

config.resolver.sourceExts = [...config.resolver.sourceExts, "svg"];

module.exports = config;
