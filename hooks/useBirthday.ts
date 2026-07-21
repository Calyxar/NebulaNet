// hooks/useBirthday.ts
// Centralizes the "is it this profile's birthday today" check that was
// previously duplicated inline in app/(tabs)/profile.tsx and
// app/user/[username]/index.tsx. Both screens can migrate to this hook
// instead of keeping their own copy of the same useMemo.

import { FirebaseFirestoreTypes } from "@react-native-firebase/firestore";
import { useMemo } from "react";

type BirthdayProfile = {
  birthDate?: FirebaseFirestoreTypes.Timestamp | null;
  showBirthday?: boolean | null;
};

/**
 * Returns true only when:
 *  - the profile has opted in (showBirthday === true), AND
 *  - today's month/day matches the stored birthDate
 *
 * Does not check the year — a match only ever means "today is their
 * birthday", never anything about age. Age gating is handled separately
 * via age_group / the Cloud Function's over18 sweep, not this hook.
 */
export function useBirthday(profile?: BirthdayProfile | null): boolean {
  return useMemo(() => {
    if (!profile?.birthDate || !profile?.showBirthday) return false;
    if (typeof profile.birthDate.toDate !== "function") return false;

    const birth = profile.birthDate.toDate();
    const now = new Date();
    return (
      birth.getMonth() === now.getMonth() && birth.getDate() === now.getDate()
    );
  }, [profile?.birthDate, profile?.showBirthday]);
}
