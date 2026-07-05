const { withAndroidManifest } = require("@expo/config-plugins");

module.exports = function withNotificationColorFix(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;

    manifest.$ = manifest.$ || {};
    manifest.$["xmlns:tools"] = "http://schemas.android.com/tools";

    const app = manifest.application?.[0];
    if (app?.["meta-data"]) {
      for (const meta of app["meta-data"]) {
        if (
          meta.$["android:name"] ===
          "com.google.firebase.messaging.default_notification_color"
        ) {
          meta.$["tools:replace"] = "android:resource";
        }
      }
    }
    return config;
  });
};
