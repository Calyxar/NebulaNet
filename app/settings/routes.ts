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

  // Optional / future pages (add files to enable typed Href in router later)
  report: "/settings/report",
  about: "/settings/about",
} as const;

export type SettingsRouteKey = keyof typeof SETTINGS_ROUTES;
export type SettingsRoutePath = (typeof SETTINGS_ROUTES)[SettingsRouteKey];

export function pushSettings(key: SettingsRouteKey) {
  router.push(SETTINGS_ROUTES[key] as any);
}

export function replaceSettings(key: SettingsRouteKey) {
  router.replace(SETTINGS_ROUTES[key] as any);
}
