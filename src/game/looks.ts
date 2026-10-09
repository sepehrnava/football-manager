/**
 * A player's drawn look: a few traits a cartoon face is built from. Real players
 * only get a look when their data says so; generated players get a random one
 * that never changes (seeded by their id). Nationality is deliberately not used.
 */
export const HAIR_STYLES = [
  'bald',
  'buzz',
  'short',
  'sidePart',
  'quiff',
  'curly',
  'afro',
  'twists',
  'bun',
  'long',
] as const;
export const BEARDS = ['none', 'stubble', 'short', 'full', 'goatee', 'moustache'] as const;

export type HairStyle = (typeof HAIR_STYLES)[number];
export type Beard = (typeof BEARDS)[number];

export interface Looks {
  /** Index into SKIN_TONES, lightest first. */
  skin: number;
  hair: HairStyle;
  /** Index into HAIR_COLORS. */
  hairColor: number;
  beard: Beard;
  headband: boolean;
}

export const SKIN_TONES = ['#F7DCC9', '#EDC4A4', '#D9A47E', '#B87C56', '#8C5A3C', '#5C3A27'];
export const HAIR_COLORS = ['#1F1A17', '#3D2B21', '#6E4A31', '#D6B160', '#B4592F', '#A9A6A1', '#ECE2C6'];

function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Small deterministic generator so the same id always draws the same face. */
function rng(seed: number) {
  let s = seed || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

function pick<T>(r: () => number, items: readonly T[], weights?: number[]) {
  if (!weights) return items[Math.floor(r() * items.length)];
  const total = weights.reduce((a, b) => a + b, 0);
  let x = r() * total;
  for (let i = 0; i < items.length; i++) {
    x -= weights[i];
    if (x < 0) return items[i];
  }
  return items[items.length - 1];
}

/** A random but stable look for a generated player. `age` greys some older players. */
export function randomLooks(id: string, age = 25): Looks {
  const r = rng(hash(`looks:${id}`));
  const skin = Math.floor(r() * SKIN_TONES.length);
  const hair = pick(r, HAIR_STYLES, [4, 12, 16, 10, 8, 10, 6, 6, 4, 5]);
  // Darker hair is more common; grey only appears from the late twenties.
  let hairColor = pick(r, [0, 1, 2, 3, 4], [40, 28, 16, 10, 6]);
  if (age >= 30 && r() < (age - 28) * 0.06) hairColor = 5;
  const beard = pick(r, BEARDS, [44, 22, 14, 10, 6, 4]);
  return { skin, hair, hairColor, beard, headband: r() < 0.06 };
}
