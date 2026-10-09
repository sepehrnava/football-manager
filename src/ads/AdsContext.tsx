import Constants, { ExecutionEnvironment } from 'expo-constants';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Modal, Platform, StyleSheet, Text, View } from 'react-native';

import { Button } from '../ui/components';
import { loadAdsLib, type AdsLib } from './adsLib';
import { colors } from '../ui/theme';

/**
 * Ads: rewarded (small sponsor bonus, free scouting) and one occasional interstitial.
 * Real AdMob ads need a development or store build. Where they can't run (Expo Go, web),
 * development shows a simulated ad so the flow can be tried; release builds then show none.
 */

const IN_EXPO_GO = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
const NATIVE = Platform.OS !== 'web' && !IN_EXPO_GO;
const SIMULATED = !NATIVE && __DEV__;

/** At most one interstitial per this long. */
const INTERSTITIAL_EVERY = 10 * 60 * 1000;

/** Real ad unit IDs from EXPO_PUBLIC_ADMOB_* (README, Ads); test units in development or when unset. */
function unitId(lib: AdsLib, kind: 'REWARDED' | 'INTERSTITIAL') {
  const env =
    Platform.OS === 'ios'
      ? kind === 'REWARDED'
        ? process.env.EXPO_PUBLIC_ADMOB_IOS_REWARDED
        : process.env.EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL
      : kind === 'REWARDED'
        ? process.env.EXPO_PUBLIC_ADMOB_ANDROID_REWARDED
        : process.env.EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL;
  return __DEV__ || !env ? lib.TestIds[kind] : env;
}

interface AdsValue {
  /** False hides every ad offer (no ads possible on this device or build). */
  available: boolean;
  /** Shows a rewarded ad; true if the player earned the reward. */
  showRewarded: () => Promise<boolean>;
  /** Shows an interstitial unless one was shown recently. */
  maybeInterstitial: () => Promise<void>;
}

const AdsContext = createContext<AdsValue | null>(null);

/** What play() needs from a rewarded or interstitial ad (their listener types don't combine). */
interface FullScreenAd {
  loaded: boolean;
  load: () => void;
  show: () => Promise<void>;
  addAdEventListener: (type: string, listener: () => void) => () => void;
}

/** Waits for a full-screen ad to load (or fail / time out), then shows it and waits for it to close. */
function play(lib: AdsLib, ad: FullScreenAd, onEarned?: () => void) {
  return new Promise<void>((resolve) => {
    const offs: (() => void)[] = [];
    const finish = () => {
      offs.forEach((off) => off());
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(finish, 10_000);
    offs.push(ad.addAdEventListener(lib.AdEventType.CLOSED, finish));
    offs.push(ad.addAdEventListener(lib.AdEventType.ERROR, finish));
    if (onEarned) offs.push(ad.addAdEventListener(lib.RewardedAdEventType.EARNED_REWARD, onEarned));
    const show = () => {
      clearTimeout(timer);
      ad.show().catch(finish);
    };
    if (ad.loaded) show();
    else {
      offs.push(ad.addAdEventListener(lib.AdEventType.LOADED, show));
      ad.load();
    }
  });
}

export function AdsProvider({ children }: { children: ReactNode }) {
  const lib = useRef<AdsLib | null>(null);
  const [ready, setReady] = useState(SIMULATED);
  // Counts from app start, so no interstitial in a session's first minutes either.
  const lastInterstitial = useRef(0);
  useEffect(() => {
    lastInterstitial.current = Date.now();
  }, []);
  const [fake, setFake] = useState<{ kind: 'rewarded' | 'interstitial'; done: (earned: boolean) => void } | null>(
    null,
  );

  // Consent first (EU form when required), then start the SDK. Ads are optional: failures are ignored.
  useEffect(() => {
    if (!NATIVE) return;
    const ads = loadAdsLib();
    if (!ads) return;
    lib.current = ads;
    let started = false;
    const start = async () => {
      const { canRequestAds } = await ads.AdsConsent.getConsentInfo();
      if (!canRequestAds || started) return;
      started = true;
      await ads.default().initialize();
      setReady(true);
    };
    ads.AdsConsent.gatherConsent().then(start).catch(start);
    start().catch(() => {});
  }, []);

  const showRewarded = useCallback(async () => {
    if (SIMULATED) return new Promise<boolean>((done) => setFake({ kind: 'rewarded', done }));
    const ads = lib.current;
    if (!ads || !ready) return false;
    let earned = false;
    const ad = ads.RewardedAd.createForAdRequest(unitId(ads, 'REWARDED'));
    await play(ads, ad as unknown as FullScreenAd, () => (earned = true));
    return earned;
  }, [ready]);

  const maybeInterstitial = useCallback(async () => {
    if (Date.now() - lastInterstitial.current < INTERSTITIAL_EVERY) return;
    lastInterstitial.current = Date.now();
    if (SIMULATED) {
      await new Promise<boolean>((done) => setFake({ kind: 'interstitial', done }));
      return;
    }
    const ads = lib.current;
    if (!ads || !ready) return;
    const ad = ads.InterstitialAd.createForAdRequest(unitId(ads, 'INTERSTITIAL'));
    await play(ads, ad as unknown as FullScreenAd);
  }, [ready]);

  return (
    <AdsContext.Provider value={{ available: ready, showRewarded, maybeInterstitial }}>
      {children}
      {fake ? (
        <SimulatedAd
          kind={fake.kind}
          onClose={(earned) => {
            fake.done(earned);
            setFake(null);
          }}
        />
      ) : null}
    </AdsContext.Provider>
  );
}

/** Development stand-in for a full-screen ad: a short countdown, then close. */
function SimulatedAd({ kind, onClose }: { kind: 'rewarded' | 'interstitial'; onClose: (earned: boolean) => void }) {
  const [left, setLeft] = useState(3);
  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft(left - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  return (
    <Modal visible transparent={false} animationType="fade" onRequestClose={() => onClose(false)}>
      <View style={s.fake}>
        <Text style={s.fakeKicker}>TEST AD · DEVELOPMENT ONLY</Text>
        <Text style={s.fakeTitle}>{kind === 'rewarded' ? 'Rewarded ad' : 'Interstitial ad'}</Text>
        <Text style={s.fakeText}>A real build shows a Google ad here.</Text>
        <Button
          label={left > 0 ? `${left}…` : kind === 'rewarded' ? 'CLOSE AND GET REWARD' : 'CLOSE'}
          variant="green"
          disabled={left > 0}
          onPress={() => onClose(kind === 'rewarded')}
          style={s.fakeButton}
        />
      </View>
    </Modal>
  );
}

export function useAds() {
  const ctx = useContext(AdsContext);
  if (!ctx) throw new Error('useAds must be used inside AdsProvider');
  return ctx;
}

const s = StyleSheet.create({
  fake: { flex: 1, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 10 },
  fakeKicker: { color: colors.gold, fontSize: 12, fontWeight: '900', letterSpacing: 1.5 },
  fakeTitle: { color: '#FFFFFF', fontSize: 28, fontWeight: '900' },
  fakeText: { color: '#BDBDB6', fontSize: 15, fontWeight: '600' },
  fakeButton: { alignSelf: 'stretch', marginTop: 24 },
});
