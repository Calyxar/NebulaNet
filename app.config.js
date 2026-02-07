// app.config.js
require("dotenv").config();

module.exports = {
  expo: {
    name: "NebulaNet",
    slug: "nebulanet",
    version: "1.0.0",
    orientation: "portrait",

    // ✅ NEW ICON (replaces favicon.png everywhere)
    icon: "./assets/images/nebulanet-icon.png",

    scheme: "nebulanet",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,

    splash: {
      image: "./assets/images/nebulanet-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
      dark: {
        image: "./assets/images/nebulanet-icon.png",
        backgroundColor: "#000000",
      },
    },

    assetBundlePatterns: ["**/*"],

    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.nebulanet.app",
      buildNumber: "1",

      // ✅ Universal Links
      associatedDomains: ["applinks:nebulanet.space"],

      infoPlist: {
        UIBackgroundModes: ["remote-notification"],
        NSPhotoLibraryUsageDescription:
          "Allow NebulaNet to access your photo library to upload profile pictures and posts.",
        NSCameraUsageDescription:
          "Allow NebulaNet to use your camera to take photos and videos for posts.",
        NSMicrophoneUsageDescription:
          "Allow NebulaNet to use your microphone for video posts.",
      },

      config: {
        usesNonExemptEncryption: false,
      },
    },

    android: {
      package: "com.nebulanet.app",
      versionCode: 1,
      versionName: "1.0.0",

      // ✅ App Links (deep linking)
      intentFilters: [
        {
          action: "VIEW",
          autoVerify: true,
          category: ["BROWSABLE", "DEFAULT"],
          data: [
            { scheme: "https", host: "nebulanet.space", pathPrefix: "/user" },
            { scheme: "https", host: "nebulanet.space", pathPrefix: "/u" },
            { scheme: "https", host: "nebulanet.space", pathPrefix: "/post" },
            {
              scheme: "https",
              host: "nebulanet.space",
              pathPrefix: "/community",
            },
            { scheme: "https", host: "nebulanet.space", pathPrefix: "/invite" },
          ],
        },
      ],

      adaptiveIcon: {
        foregroundImage: "./assets/images/nebulanet-icon.png",
        backgroundColor: "#0B0F1A",
      },

      permissions: [
        "RECEIVE_BOOT_COMPLETED",
        "SCHEDULE_EXACT_ALARM",
        "VIBRATE",
        "CAMERA",
        "RECORD_AUDIO",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE",
        "ACCESS_NOTIFICATION_POLICY",
      ],

      softwareKeyboardLayoutMode: "resize",
    },

    androidStatusBar: {
      barStyle: "dark-content",
      backgroundColor: "#ffffff",
    },

    androidNavigationBar: {
      barStyle: "dark-content",
      backgroundColor: "#ffffff",
    },

    web: {
      output: "static",

      // ✅ favicon replaced
      favicon: "./assets/images/nebulanet-icon.png",

      bundler: "metro",
    },

    plugins: [
      "expo-router",
      "expo-dev-client",
      "expo-web-browser",
      "expo-font",
      [
        "expo-notifications",
        {
          icon: "./assets/images/nebulanet-icon.png",
          color: "#6D8BFF",
          sounds: ["./assets/sounds/notification.wav"],
        },
      ],
    ],

    extra: {
      eas: {
        projectId: "e048836d-bf2b-4423-95d8-e6355b78b981",
      },

      // ✅ SAFE client keys only
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,

      appDomain: "nebulanet.space",
      appUrl: "https://nebulanet.space",

      enableAnalytics: false,
      enableDebug: true,
      appVersion: "1.0.0",
    },

    experiments: {
      typedRoutes: true,
      tsconfigPaths: true,
    },

    owner: "alyjbak28",

    runtimeVersion: {
      policy: "appVersion",
    },

    updates: {
      url: "https://u.expo.dev/e048836d-bf2b-4423-95d8-e6355b78b981",
      fallbackToCacheTimeout: 0,
      enabled: true,
    },
  },
};
