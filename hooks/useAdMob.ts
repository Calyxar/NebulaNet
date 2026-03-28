// hooks/useAdMob.ts ✅ UPDATED — ad unit IDs from env vars
import { useEffect, useRef, useState } from "react";
import {
    AdEventType,
    InterstitialAd,
    TestIds,
} from "react-native-google-mobile-ads";

const IS_DEV = __DEV__;

// ✅ Read from .env — never hardcoded in source
export const BANNER_AD_UNIT_ID = IS_DEV
  ? TestIds.BANNER
  : process.env.EXPO_PUBLIC_ADMOB_BANNER_ID!;

export const INTERSTITIAL_AD_UNIT_ID = IS_DEV
  ? TestIds.INTERSTITIAL
  : process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID!;

// ✅ Show interstitial every N post opens (default: every 5)
const INTERSTITIAL_FREQUENCY = 5;

export function useInterstitialAd() {
  const interstitialRef = useRef<InterstitialAd | null>(null);
  const [loaded, setLoaded] = useState(false);
  const openCountRef = useRef(0);

  useEffect(() => {
    const ad = InterstitialAd.createForAdRequest(INTERSTITIAL_AD_UNIT_ID, {
      requestNonPersonalizedAdsOnly: false,
    });

    const unsubLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
      setLoaded(true);
    });

    const unsubClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
      setLoaded(false);
      ad.load();
    });

    const unsubError = ad.addAdEventListener(AdEventType.ERROR, () => {
      setLoaded(false);
    });

    interstitialRef.current = ad;
    ad.load();

    return () => {
      unsubLoaded();
      unsubClosed();
      unsubError();
    };
  }, []);

  const maybeShowInterstitial = () => {
    openCountRef.current += 1;
    if (
      openCountRef.current % INTERSTITIAL_FREQUENCY === 0 &&
      loaded &&
      interstitialRef.current
    ) {
      interstitialRef.current.show();
    }
  };

  return { maybeShowInterstitial, loaded };
}
