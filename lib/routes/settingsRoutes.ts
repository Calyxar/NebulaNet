// lib/routes/settingsRoutes.ts
import { router } from "expo-router";

export const SETTINGS_ROUTES = {
  index: "/settings",
  accountCenter: "/settings/account-center",
  feedPreferences: "/settings/feed-preferences",
  savedContent: "/settings/saved-content",
  language: "/settings/language",
  appearance: "/settings/appearance",
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

export function closeSettings(returnTo?: string) {
  if (returnTo && typeof returnTo === "string" && returnTo.length > 0) {
    router.replace(returnTo as any);
    return;
  }
  router.replace("/(tabs)/profile" as any);
}
