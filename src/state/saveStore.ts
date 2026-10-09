import AsyncStorage from '@react-native-async-storage/async-storage';

import { EMPTY_META, type Meta } from '../game/meta';
import type { GameState } from '../game/types';

/** The career and today's Daily Challenge are saved separately. */
export type Slot = 'career' | 'challenge';

// Saves are large (the whole world of clubs and players), and Android's storage
// fails on single values around 2 MB. So a save is written as small chunks plus
// a manifest saying how many there are.
const KEYS: Record<Slot, string> = {
  // Keys keep the app's first name (Pocket Manager): changing them would lose saves.
  career: 'pocket-manager/save-v3',
  challenge: 'pocket-manager/challenge-v1',
};
const META_KEY = 'pocket-manager/meta-v1';
const CHUNK = 400_000;

interface Manifest {
  chunks: number;
  /** Bumped on every write so a half-finished write is never read as a save. */
  stamp: number;
}

let writing: Promise<void> = Promise.resolve();

/** Writes run one after another, so two quick saves can't interleave their chunks. */
export function saveGame(slot: Slot, state: GameState) {
  const KEY = KEYS[slot];
  writing = writing.then(async () => {
    try {
      const text = JSON.stringify(state);
      const chunks = Math.ceil(text.length / CHUNK);
      const stamp = Date.now();
      const pairs: [string, string][] = [];
      for (let i = 0; i < chunks; i++) pairs.push([`${KEY}/${stamp}/${i}`, text.slice(i * CHUNK, (i + 1) * CHUNK)]);
      await AsyncStorage.multiSet(pairs);
      const old = await readManifest(slot);
      await AsyncStorage.setItem(KEY, JSON.stringify({ chunks, stamp } satisfies Manifest));
      if (old) await AsyncStorage.multiRemove(chunkKeys(slot, old));
    } catch {
      // A failed save is retried by the next change.
    }
  });
  return writing;
}

async function readManifest(slot: Slot): Promise<Manifest | null> {
  const raw = await AsyncStorage.getItem(KEYS[slot]);
  if (!raw) return null;
  try {
    const m = JSON.parse(raw) as Manifest;
    return typeof m.chunks === 'number' && typeof m.stamp === 'number' ? m : null;
  } catch {
    return null;
  }
}

function chunkKeys(slot: Slot, m: Manifest) {
  return Array.from({ length: m.chunks }, (_, i) => `${KEYS[slot]}/${m.stamp}/${i}`);
}

export async function loadGame(slot: Slot): Promise<GameState | null> {
  await writing;
  const m = await readManifest(slot);
  if (!m) return null;
  const pairs = await AsyncStorage.multiGet(chunkKeys(slot, m));
  if (pairs.some(([, v]) => v === null)) return null;
  const saved = JSON.parse(pairs.map(([, v]) => v).join('')) as GameState;
  return saved?.version === 2 ? saved : null;
}

export async function clearGame(slot: Slot) {
  await writing;
  const m = await readManifest(slot);
  await AsyncStorage.multiRemove([KEYS[slot], ...(m ? chunkKeys(slot, m) : [])]);
}

export async function loadMeta(): Promise<Meta> {
  try {
    const raw = await AsyncStorage.getItem(META_KEY);
    const meta = raw ? (JSON.parse(raw) as Meta) : null;
    return meta?.version === 1 ? { ...EMPTY_META, ...meta } : EMPTY_META;
  } catch {
    return EMPTY_META;
  }
}

export function saveMeta(meta: Meta) {
  AsyncStorage.setItem(META_KEY, JSON.stringify(meta)).catch(() => {});
}
