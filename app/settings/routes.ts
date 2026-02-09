// app/settings/routes.ts
import { router } from "expo-router";

export const SETTINGS_ROUTES = {
  index: "/settings",
  accountCenter: "/settings/account-center",
  feedPreferences: "/settings/feed-preferences",
  savedContent: "/settings/saved-content",
  language: "/settings/language",
  privacy: "/settings/privacy",
  blocked: "/settings/blocked",
  notifications: "/settings/notifications",
  security: "/settings/security",
  linkedAccounts: "/settings/linked-accounts",
  changePassword: "/settings/change-password",
  deactivate: "/settings/deactivate",
  deleteAccount: "/settings/delete-account",
  report: "/settings/report",
  about: "/settings/about",
} as const;

export type SettingsRouteKey = keyof typeof SETTINGS_ROUTES;

export function pushSettings(key: SettingsRouteKey) {
  router.push(SETTINGS_ROUTES[key] as any);
}

export function replaceSettings(key: SettingsRouteKey) {
  router.replace(SETTINGS_ROUTES[key] as any);
}

/**
 * ✅ CLOSE SETTINGS FOR REAL:
 * Always "replace" out of settings to avoid looping inside the settings stack.
 */
export function closeSettings(returnTo?: string) {
  // If caller gave us a route, go there.
  if (returnTo && typeof returnTo === "string" && returnTo.length) {
    router.replace(returnTo as any);
    return;
  }

  // Otherwise go to your own profile tab (adjust if your route differs)
  router.replace("/(tabs)/profile" as any);
}
