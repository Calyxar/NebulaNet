// hooks/useAdMob.ts — ads disabled until AdMob is configured
export const BANNER_AD_UNIT_ID = "";

export function useInterstitialAd() {
  return {
    maybeShowInterstitial: () => {},
    loaded: false,
  };
}
