import { FORMATIONS } from './constants';
import { createRng } from './rng';
import type { FormationId, Position } from './types';

/**
 * 2D match highlights: a short, replayable story of a match whose score is
 * already decided. It picks the key moments (goals with their real scorers,
 * plus some saves and misses) and turns each into a quick passing move for a
 * top-down pitch. Purely visual: it never changes a result.
 *
 * Pitch coordinates run 0–1; y = 0 is the top goal. The home side attacks
 * upwards, the away side downwards. Players 0–10 are home, 11–21 away;
 * index 0 and 11 are the goalkeepers.
 */
export interface Dot {
  x: number;
  y: number;
}

export interface Frame {
  players: Dot[];
  ball: Dot;
  /** Time to move into this frame at normal speed. */
  ms: number;
}

export interface Moment {
  minute: number;
  side: 'home' | 'away';
  kind: 'goal' | 'save' | 'miss';
  /** Shown during the build-up, before the outcome is known. */
  lead: string;
  /** Shown once the shot is taken. */
  text: string;
  frames: Frame[];
  /** Score once this moment is over. */
  score: [number, number];
}

export interface Lineup {
  formation: FormationId;
  /** Surname per formation slot (slot 0 is the goalkeeper). */
  names: string[];
  /** Relative attacking strength, for how often this side gets chances. */
  attack: number;
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** Where each player stands at kick-off. */
export function basePositions(home: Lineup, away: Lineup): Dot[] {
  const h = FORMATIONS[home.formation].slots.map((s) => ({ x: s.x, y: s.y }));
  const a = FORMATIONS[away.formation].slots.map((s) => ({ x: 1 - s.x, y: 1 - s.y }));
  return [...h, ...a];
}

/** How far forward a position plays: higher = closer to the opponent's goal. */
const ATTACKING: Record<Position, number> = {
  GK: 0,
  CB: 1,
  LB: 2,
  RB: 2,
  CDM: 3,
  CM: 4,
  LM: 5,
  RM: 5,
  CAM: 6,
  LW: 7,
  RW: 7,
  ST: 8,
};

export function buildHighlights(
  home: Lineup,
  away: Lineup,
  score: { home: number; away: number },
  scorers: { home: string[]; away: string[] },
  seed: number,
): Moment[] {
  const rng = createRng(seed);
  const base = basePositions(home, away);
  const slots = { home: FORMATIONS[home.formation].slots, away: FORMATIONS[away.formation].slots };

  // Goals as they happened, plus a few chances that came to nothing.
  const kinds: { side: 'home' | 'away'; kind: Moment['kind'] }[] = [];
  for (let i = 0; i < score.home; i++) kinds.push({ side: 'home', kind: 'goal' });
  for (let i = 0; i < score.away; i++) kinds.push({ side: 'away', kind: 'goal' });
  const homeShare = home.attack / Math.max(1, home.attack + away.attack);
  const extra = 3 + rng.int(0, 3);
  for (let i = 0; i < extra; i++) {
    kinds.push({ side: rng.next() < homeShare ? 'home' : 'away', kind: rng.chance(0.55) ? 'save' : 'miss' });
  }
  const minutes = new Set<number>();
  while (minutes.size < kinds.length) minutes.add(rng.int(2, 90));
  const sorted = [...minutes].sort((a, b) => a - b);
  // Shuffle which moment happens when.
  for (let i = kinds.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [kinds[i], kinds[j]] = [kinds[j], kinds[i]];
  }

  const goalQueue = { home: [...scorers.home], away: [...scorers.away] };
  const tally: [number, number] = [0, 0];
  return kinds.map(({ side, kind }, n) => {
    const offset = side === 'home' ? 0 : 11;
    const defOffset = side === 'home' ? 11 : 0;
    const dir = side === 'home' ? -1 : 1;
    const mySlots = slots[side];
    const lineup = side === 'home' ? home : away;
    const keeper = (side === 'home' ? away : home).names[0];

    // The shooter: the real scorer for a goal, otherwise an attacker.
    const byDepth = mySlots
      .map((s, i) => ({ i, depth: ATTACKING[s.pos] }))
      .filter((s) => s.i !== 0)
      .sort((a, b) => a.depth - b.depth);
    const wanted = kind === 'goal' ? goalQueue[side].shift() : undefined;
    let shooter = wanted ? lineup.names.findIndex((name, i) => i > 0 && name === wanted) : -1;
    if (shooter < 0) {
      const front = byDepth.filter((s) => s.depth >= 5);
      shooter = (front.length ? rng.pick(front) : byDepth[byDepth.length - 1]).i;
    }
    // Build-up: two or three passes moving up the pitch to the shooter.
    const chain: number[] = [];
    const starters = byDepth.filter((s) => s.depth >= 1 && s.depth <= 4 && s.i !== shooter);
    chain.push((starters.length ? rng.pick(starters) : byDepth[0]).i);
    const middle = byDepth.filter((s) => s.depth >= 3 && s.depth <= 7 && s.i !== shooter && !chain.includes(s.i));
    for (let k = 0, passes = rng.int(1, 2); k < passes && middle.length; k++) {
      const pick = middle.splice(rng.int(0, middle.length - 1), 1)[0];
      chain.push(pick.i);
    }
    chain.push(shooter);

    const frames: Frame[] = [];
    const steps = chain.length;
    chain.forEach((slot, k) => {
      const push = 0.08 + (0.32 * k) / Math.max(1, steps - 1);
      const holder = offset + slot;
      const ballX = clamp(base[holder].x + (rng.next() - 0.5) * 0.12, 0.08, 0.92);
      const players = base.map((p, i) => {
        const attacking = i >= offset && i < offset + 11;
        if (i === offset || i === defOffset) {
          // Keepers stay home and follow the ball sideways.
          return { x: clamp(0.5 + (ballX - 0.5) * 0.25, 0.38, 0.62), y: p.y };
        }
        // Attackers move up; defenders fall back towards their own goal (the same direction).
        const forward = attacking ? push : push * 0.35;
        const squeeze = attacking ? 0.18 : 0.32;
        return {
          x: clamp(p.x + (ballX - p.x) * squeeze + (rng.next() - 0.5) * 0.03, 0.04, 0.96),
          y: clamp(p.y + dir * forward + (rng.next() - 0.5) * 0.02, 0.11, 0.89),
        };
      });
      players[holder] = { x: ballX, y: players[holder].y };
      frames.push({ players, ball: { x: ballX, y: players[holder].y + 0.012 }, ms: k === 0 ? 450 : 600 });
    });

    // The shot.
    const last = frames[frames.length - 1].players.map((p) => ({ ...p }));
    const goalY = side === 'home' ? -0.01 : 1.01;
    const gk = defOffset;
    let ball: Dot;
    if (kind === 'goal') {
      ball = { x: 0.5 + (rng.chance(0.5) ? 1 : -1) * (0.03 + rng.next() * 0.04), y: goalY };
      last[gk] = { x: ball.x > 0.5 ? 0.43 : 0.57, y: last[gk].y };
    } else if (kind === 'save') {
      ball = { x: 0.5 + (rng.next() - 0.5) * 0.08, y: last[gk].y };
      last[gk] = { x: ball.x, y: last[gk].y };
    } else {
      ball = { x: 0.5 + (rng.chance(0.5) ? 1 : -1) * (0.13 + rng.next() * 0.06), y: goalY };
    }
    frames.push({ players: last, ball, ms: 420 });
    frames.push({ players: last, ball, ms: 900 });

    if (kind === 'goal') tally[side === 'home' ? 0 : 1] += 1;
    const name = lineup.names[shooter];
    const minute = sorted[n];
    const text =
      kind === 'goal'
        ? `${minute}' GOAL! ${name} scores`
        : kind === 'save'
          ? `${minute}' ${name} shoots, saved by ${keeper}`
          : `${minute}' ${name} fires wide`;
    const lead = `${minute}' ${lineup.names[chain[0]]} starts a move…`;
    return { minute, side, kind, lead, text, frames, score: [tally[0], tally[1]] };
  });
}
