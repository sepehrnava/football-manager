import type { AdsLib } from './adsLib';

export type { AdsLib };

/** No AdMob on web. */
export function loadAdsLib(): AdsLib | null {
  return null;
}
