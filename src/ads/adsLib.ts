/** The AdMob library on Android and iOS (adsLib.web.ts stands in on web, where it can't be bundled). */
export type AdsLib = typeof import('react-native-google-mobile-ads');

export function loadAdsLib(): AdsLib | null {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('react-native-google-mobile-ads') as AdsLib;
}
