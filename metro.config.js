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

// ✅ Add mocks folder to watchFolders so Metro can hash the files
config.watchFolders = [
  ...(config.watchFolders ?? []),
  path.resolve(__dirname, "mocks"),
];

// ✅ Stub native-only libraries on web
// These libraries use native modules that don't exist on web
const WEB_STUBS = {
  "react-native-google-mobile-ads": path.resolve(
    __dirname,
    "mocks",
    "react-native-google-mobile-ads.js",
  ),
  "react-native-image-viewing": path.resolve(
    __dirname,
    "mocks",
    "react-native-image-viewing.js",
  ),
};

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === "web" && WEB_STUBS[moduleName]) {
    return {
      filePath: WEB_STUBS[moduleName],
      type: "sourceFile",
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
