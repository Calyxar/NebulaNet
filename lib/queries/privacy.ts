// lib/queries/privacy.ts

export const PRIVACY_OPTIONS = [
  "Everyone",
  "Followers",
  "People you follow",
  "No one",
] as const;

export type PrivacySelect = (typeof PRIVACY_OPTIONS)[number];

export type UserPrivacySettings = {
  user_id: string;

  private_account: boolean;
  discoverable: boolean;
  activity_status: boolean;
  read_receipts: boolean;

  hide_likes: boolean;
  hide_followers: boolean;
  hide_following: boolean;
  allow_tagging: boolean;
  message_requests: boolean;
  reduce_sensitive: boolean;

  who_can_comment: PrivacySelect;
  who_can_message: PrivacySelect;
  mentions: PrivacySelect;

  updated_at: string;
};

// Back-compat alias if other files import PrivacySettings
export type PrivacySettings = UserPrivacySettings;

export const DEFAULT_PRIVACY_SETTINGS: Omit<
  UserPrivacySettings,
  "user_id" | "updated_at"
> = {
  private_account: false,
  discoverable: true,
  activity_status: true,
  read_receipts: true,

  hide_likes: false,
  hide_followers: false,
  hide_following: false,
  allow_tagging: true,
  message_requests: true,
  reduce_sensitive: false,

  who_can_comment: "Everyone",
  who_can_message: "Followers",
  mentions: "Everyone",
};

export function isPrivacySelect(v: unknown): v is PrivacySelect {
  return (
    v === "Everyone" ||
    v === "Followers" ||
    v === "People you follow" ||
    v === "No one"
  );
}
