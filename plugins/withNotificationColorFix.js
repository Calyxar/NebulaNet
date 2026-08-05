const { withAndroidManifest } = require("@expo/config-plugins");

module.exports = function withNotificationColorFix(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;

    manifest.$ = manifest.$ || {};
    manifest.$["xmlns:tools"] = "http://schemas.android.com/tools";

    const app = manifest.application?.[0];
    if (!app) return config;

    app["meta-data"] = app["meta-data"] || [];

    const existing = app["meta-data"].find(
      (m) =>
        m.$["android:name"] ===
        "com.google.firebase.messaging.default_notification_color",
    );

    if (existing) {
      existing.$["android:resource"] = "@color/notification_icon_color";
      existing.$["tools:replace"] = "android:resource";
    } else {
      app["meta-data"].push({
        $: {
          "android:name":
            "com.google.firebase.messaging.default_notification_color",
          "android:resource": "@color/notification_icon_color",
          "tools:replace": "android:resource",
        },
      });
    }

    return config;
  });
};
