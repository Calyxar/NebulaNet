module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      "react-native-reanimated/plugin",
      [
        "module-resolver",
        {
          root: ["./"],
          alias: {
            "@": "./",
            "@components": "./components",
            "@providers": "./providers",
            "@utils": "./utils",
            "@hooks": "./hooks",
            "@constants": "./constants",
            "@types": "./types",
            "@assets": "./assets",
            "@lib": "./lib",
          },
          extensions: [
            ".js",
            ".jsx",
            ".ts",
            ".tsx",
            ".android.js",
            ".android.tsx",
            ".ios.js",
            ".ios.tsx",
            ".web.js",
            ".web.tsx",
          ],
        },
      ],
    ],
  };
};
