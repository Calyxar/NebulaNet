// hooks/useForceUpdate.ts ✅
// Checks Firestore for min_version on app launch.
// If current app version is below min_version, returns forceUpdate: true.
//
// Firestore setup — create this document manually:
//   Collection: app_config
//   Document:   android
//   Fields:
//     min_version: "1.0.0"   (string — bump this to force users to update)
//     store_url: "https://play.google.com/store/apps/details?id=com.nebulanet.app"

import { db } from "@/lib/firebase";
import Constants from "expo-constants";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";

type ForceUpdateState = {
  checking: boolean;
  forceUpdate: boolean;
  storeUrl: string;
};

// Compare semver strings — returns true if current < minimum
function isOutdated(current: string, minimum: string): boolean {
  const parse = (v: string) => v.split(".").map((n) => parseInt(n, 10) || 0);
  const [cMaj, cMin, cPatch] = parse(current);
  const [mMaj, mMin, mPatch] = parse(minimum);
  if (cMaj !== mMaj) return cMaj < mMaj;
  if (cMin !== mMin) return cMin < mMin;
  return cPatch < mPatch;
}

const STORE_URL =
  "https://play.google.com/store/apps/details?id=com.nebulanet.app";

export function useForceUpdate(): ForceUpdateState {
  const [state, setState] = useState<ForceUpdateState>({
    checking: true,
    forceUpdate: false,
    storeUrl: STORE_URL,
  });

  useEffect(() => {
    let mounted = true;

    const check = async () => {
      try {
        const snap = await getDoc(doc(db, "app_config", "android"));
        if (!snap.exists() || !mounted) {
          setState({
            checking: false,
            forceUpdate: false,
            storeUrl: STORE_URL,
          });
          return;
        }

        const data = snap.data() as any;
        const minVersion: string = data.min_version ?? "1.0.0";
        const storeUrl: string = data.store_url ?? STORE_URL;

        // Get current app version from app.json via Constants
        const currentVersion: string =
          Constants.expoConfig?.version ??
          (Constants.manifest as any)?.version ??
          "1.0.0";

        const outdated = isOutdated(currentVersion, minVersion);

        if (mounted) {
          setState({ checking: false, forceUpdate: outdated, storeUrl });
        }
      } catch {
        // On error don't block the user
        if (mounted) {
          setState({
            checking: false,
            forceUpdate: false,
            storeUrl: STORE_URL,
          });
        }
      }
    };

    check();
    return () => {
      mounted = false;
    };
  }, []);

  return state;
}
