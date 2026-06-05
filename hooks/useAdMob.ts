// hooks/useAdMob.ts ✅ — lazy load, no startup lag
import { useEffect, useRef, useState } from "react";
import {
  AdEventType,
  InterstitialAd,
  TestIds,
} from "react-native-google-mobile-ads";

const IS_DEV = __DEV__;

export const BANNER_AD_UNIT_ID = IS_DEV
  ? TestIds.BANNER
  : "ca-app-pub-7224753372359384/3062448071";

const INTERSTITIAL_AD_UNIT_ID = IS_DEV
  ? TestIds.INTERSTITIAL
  : "ca-app-pub-7224753372359384/7354036555";

const INTERSTITIAL_COOLDOWN_MS = 3 * 60 * 1000;

export function useInterstitialAd() {
  const [loaded, setLoaded] = useState(false);
  const adRef = useRef<InterstitialAd | null>(null);
  const lastShownRef = useRef<number>(0);
  const initializedRef = useRef(false);

  useEffect(() => {
    // ✅ Delay init by 3 seconds so home screen loads first
    const initTimer = setTimeout(() => {
      if (initializedRef.current) return;
      initializedRef.current = true;

      const ad = InterstitialAd.createForAdRequest(INTERSTITIAL_AD_UNIT_ID, {
        requestNonPersonalizedAdsOnly: false,
      });

      const loadedSub = ad.addAdEventListener(AdEventType.LOADED, () => {
        setLoaded(true);
      });

      const closedSub = ad.addAdEventListener(AdEventType.CLOSED, () => {
        setLoaded(false);
        setTimeout(() => ad.load(), 1000);
      });

      const errorSub = ad.addAdEventListener(AdEventType.ERROR, () => {
        setLoaded(false);
        setTimeout(() => ad.load(), 60000);
      });

      ad.load();
      adRef.current = ad;

      return () => {
        loadedSub();
        closedSub();
        errorSub();
      };
    }, 3000);

    return () => clearTimeout(initTimer);
  }, []);

  const maybeShowInterstitial = () => {
    const now = Date.now();
    if (!loaded) return;
    if (now - lastShownRef.current < INTERSTITIAL_COOLDOWN_MS) return;
    lastShownRef.current = now;
    adRef.current?.show().catch(() => {});
  };

  return { maybeShowInterstitial, loaded };
}
