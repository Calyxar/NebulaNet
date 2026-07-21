import { FirebaseFirestoreTypes } from "@react-native-firebase/firestore";

export interface UserProfile {
  id: string;

  username: string;
  full_name?: string | null;

  avatar_url?: string | null;
  bio?: string | null;
  website?: string | null;
  location?: string | null;

  follower_count: number;
  following_count: number;
  post_count: number;

  created_at:
    | FirebaseFirestoreTypes.Timestamp
    | string
    | FirebaseFirestoreTypes.FieldValue
    | null;

  updated_at:
    | FirebaseFirestoreTypes.Timestamp
    | string
    | FirebaseFirestoreTypes.FieldValue
    | null;

  is_private?: boolean;

  // Follow state
  is_following?: boolean;
  is_followed_by?: boolean;
  is_self?: boolean;

  // Birthday
  birthDate?: FirebaseFirestoreTypes.Timestamp | null;
  birthMMDD?: string | null;
  showBirthday?: boolean;

  // Future moderation / verification
  is_official?: boolean;
  role?: string;
  age_group?: "under_13" | "teen" | "adult";
}
