// mocks/react-native-google-mobile-ads.js
// Web stub — AdMob is native only, stub it out for Vercel web builds

const BannerAd = () => null;
const BannerAdSize = {
  ANCHORED_ADAPTIVE_BANNER: "ANCHORED_ADAPTIVE_BANNER",
  BANNER: "BANNER",
  FULL_BANNER: "FULL_BANNER",
  LARGE_BANNER: "LARGE_BANNER",
  LEADERBOARD: "LEADERBOARD",
  MEDIUM_RECTANGLE: "MEDIUM_RECTANGLE",
};
const InterstitialAd = {
  createForAdRequest: () => ({
    load: () => {},
    show: () => {},
    addAdEventListener: () => () => {},
  }),
};
const RewardedAd = {
  createForAdRequest: () => ({
    load: () => {},
    show: () => {},
    addAdEventListener: () => () => {},
  }),
};
const AdEventType = {
  LOADED: "loaded",
  ERROR: "error",
  OPENED: "opened",
  CLICKED: "clicked",
  CLOSED: "closed",
};
const RewardedAdEventType = {
  LOADED: "loaded",
  EARNED_REWARD: "earned_reward",
};
const TestIds = {
  BANNER: "test-banner",
  INTERSTITIAL: "test-interstitial",
  REWARDED: "test-rewarded",
};

module.exports = {
  BannerAd,
  BannerAdSize,
  InterstitialAd,
  RewardedAd,
  AdEventType,
  RewardedAdEventType,
  TestIds,
};
