import AsyncStorage from '@react-native-async-storage/async-storage';

import type { GameState } from '../game/types';

// Saves are large (the whole world of clubs and players), and Android's storage
// fails on single values around 2 MB. So a save is written as small chunks plus
// a manifest saying how many there are.
const KEY = 'pocket-manager/save-v3';
const CHUNK = 400_000;

interface Manifest {
  chunks: number;
  /** Bumped on every write so a half-finished write is never read as a save. */
  stamp: number;
}

let writing: Promise<void> = Promise.resolve();

/** Writes run one after another, so two quick saves can't interleave their chunks. */
export function saveGame(state: GameState) {
  writing = writing.then(async () => {
    try {
      const text = JSON.stringify(state);
      const chunks = Math.ceil(text.length / CHUNK);
      const stamp = Date.now();
      const pairs: [string, string][] = [];
      for (let i = 0; i < chunks; i++) pairs.push([`${KEY}/${stamp}/${i}`, text.slice(i * CHUNK, (i + 1) * CHUNK)]);
      await AsyncStorage.multiSet(pairs);
      const old = await readManifest();
      await AsyncStorage.setItem(KEY, JSON.stringify({ chunks, stamp } satisfies Manifest));
      if (old) await AsyncStorage.multiRemove(chunkKeys(old));
    } catch {
      // A failed save is retried by the next change.
    }
  });
  return writing;
}

async function readManifest(): Promise<Manifest | null> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return null;
  try {
    const m = JSON.parse(raw) as Manifest;
    return typeof m.chunks === 'number' && typeof m.stamp === 'number' ? m : null;
  } catch {
    return null;
  }
}

function chunkKeys(m: Manifest) {
  return Array.from({ length: m.chunks }, (_, i) => `${KEY}/${m.stamp}/${i}`);
}

export async function loadGame(): Promise<GameState | null> {
  const m = await readManifest();
  if (!m) return null;
  const pairs = await AsyncStorage.multiGet(chunkKeys(m));
  if (pairs.some(([, v]) => v === null)) return null;
  const saved = JSON.parse(pairs.map(([, v]) => v).join('')) as GameState;
  return saved?.version === 2 ? saved : null;
}

export async function clearGame() {
  await writing;
  const m = await readManifest();
  await AsyncStorage.multiRemove([KEY, ...(m ? chunkKeys(m) : [])]);
}
