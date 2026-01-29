// app.config.js
require("dotenv").config();

module.exports = {
  expo: {
    name: "NebulaNet",
    slug: "nebulanet",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "nebulanet",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    splash: {
      image: "./assets/images/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
      dark: {
        image: "./assets/images/splash-icon-dark.png",
        backgroundColor: "#000000",
      },
    },
    assetBundlePatterns: ["**/*"],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.nebulanet.app",
      buildNumber: "1",
      // ADD THIS - Associated Domains for Universal Links
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
      // ADD THIS - Intent Filters for App Links
      intentFilters: [
        {
          action: "VIEW",
          autoVerify: true,
          data: [
            {
              scheme: "https",
              host: "nebulanet.space",
              pathPrefix: "/post",
            },
            {
              scheme: "https",
              host: "nebulanet.space",
              pathPrefix: "/user",
            },
            {
              scheme: "https",
              host: "nebulanet.space",
              pathPrefix: "/community",
            },
            {
              scheme: "https",
              host: "nebulanet.space",
              pathPrefix: "/invite",
            },
          ],
          category: ["BROWSABLE", "DEFAULT"],
        },
      ],
      adaptiveIcon: {
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png",
        backgroundColor: "#E6F4FE",
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
      versionName: "1.0.0",
    },
    androidStatusBar: {
      barStyle: "dark-content",
      backgroundColor: "#ffffff",
      translucent: false,
    },
    androidNavigationBar: {
      barStyle: "dark-content",
      backgroundColor: "#ffffff",
    },
    web: {
      output: "static",
      favicon: "./assets/images/favicon.png",
      bundler: "metro",
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
          dark: {
            image: "./assets/images/splash-icon-dark.png",
            backgroundColor: "#000000",
          },
        },
      ],
      "expo-dev-client",
      "expo-web-browser",
      [
        "expo-notifications",
        {
          icon: "./assets/images/notification-icon.png",
          color: "#E6F4FE",
          sounds: ["./assets/sounds/notification.wav"],
        },
      ],
      "expo-font",
    ],
    extra: {
      eas: {
        projectId: "e048836d-bf2b-4423-95d8-e6355b78b981",
      },
      supabaseUrl:
        process.env.EXPO_PUBLIC_SUPABASE_URL || "https://nebulanet.space",
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "",
      supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
      appDomain: process.env.EXPO_PUBLIC_APP_DOMAIN || "nebulanet.space",
      appUrl: process.env.EXPO_PUBLIC_APP_URL || "https://nebulanet.space",
      enableAnalytics: process.env.EXPO_PUBLIC_ENABLE_ANALYTICS === "true",
      enableDebug: process.env.EXPO_PUBLIC_ENABLE_DEBUG === "true",
      appVersion: "1.0.0",
      buildVersion: process.env.EXPO_PUBLIC_BUILD_VERSION || "1",
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
