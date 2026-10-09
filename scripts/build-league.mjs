// Turns data/<league>/clubs.csv and players.csv into src/data/<league>.json,
// the league pack the game loads. Usage: npm run build:league [-- english]
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const league = process.argv[2] ?? 'english';
const POSITIONS = new Set(['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST']);
const PATTERNS = new Set(['solid', 'stripes', 'half', 'band']);
const errors = [];

/** Minimal CSV reader: quoted fields, commas inside quotes, # comment lines. */
function readCsv(file) {
  const text = readFileSync(join(root, 'data', league, file), 'utf8');
  const rows = [];
  text.split(/\r?\n/).forEach((line, i) => {
    if (!line.trim() || line.trim().startsWith('#')) return;
    const cells = [];
    let cur = '';
    let quoted = false;
    for (let k = 0; k < line.length; k++) {
      const ch = line[k];
      if (quoted) {
        if (ch === '"' && line[k + 1] === '"') (cur += '"'), k++;
        else if (ch === '"') quoted = false;
        else cur += ch;
      } else if (ch === '"') quoted = true;
      else if (ch === ',') cells.push(cur.trim()), (cur = '');
      else cur += ch;
    }
    cells.push(cur.trim());
    rows.push({ line: i + 1, cells });
  });
  const [header, ...body] = rows;
  return body.map(({ line, cells }) => ({
    line,
    ...Object.fromEntries(header.cells.map((h, j) => [h, cells[j] ?? ''])),
  }));
}

/** "GB" -> 🇬🇧 */
function flag(code) {
  const c = code.toUpperCase();
  if (!/^[A-Z]{2}$/.test(c)) return '🏳️';
  return String.fromCodePoint(...[...c].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65));
}

const clubs = readCsv('clubs.csv').map((r) => {
  const where = `clubs.csv line ${r.line}`;
  if (!/^[A-Z]{3}$/.test(r.short)) errors.push(`${where}: short must be 3 capital letters`);
  if (!r.name) errors.push(`${where}: name is empty`);
  for (const col of ['primary', 'secondary']) {
    if (!/^#[0-9A-Fa-f]{6}$/.test(r[col])) errors.push(`${where}: ${col} must be a colour like #C8102E`);
  }
  if (!PATTERNS.has(r.pattern)) errors.push(`${where}: pattern must be solid, stripes, half or band`);
  const strength = Number(r.strength);
  if (!(strength >= 55 && strength <= 90)) errors.push(`${where}: strength must be 55-90`);
  return {
    short: r.short,
    name: r.name,
    primary: r.primary.toUpperCase(),
    secondary: r.secondary.toUpperCase(),
    pattern: r.pattern,
    level: Math.round(strength),
  };
});

const shorts = new Set(clubs.map((c) => c.short));
if (shorts.size !== clubs.length) errors.push('clubs.csv: two clubs share the same short code');
if (clubs.length % 2) errors.push(`clubs.csv: the league needs an even number of clubs (has ${clubs.length})`);

const players = readCsv('players.csv').map((r) => {
  const where = `players.csv line ${r.line}`;
  if (!shorts.has(r.club)) errors.push(`${where}: unknown club "${r.club}"`);
  if (!r.name) errors.push(`${where}: name is empty`);
  const positions = r.positions.split('/').map((p) => p.trim().toUpperCase()).filter(Boolean);
  if (!positions.length || positions.length > 2 || positions.some((p) => !POSITIONS.has(p))) {
    errors.push(`${where}: positions must be one or two of ${[...POSITIONS].join(' ')}`);
  }
  const age = Number(r.age);
  const rating = Number(r.rating);
  const potential = r.potential ? Number(r.potential) : null;
  if (!(age >= 15 && age <= 45)) errors.push(`${where}: age must be 15-45`);
  if (!(rating >= 40 && rating <= 95)) errors.push(`${where}: rating must be 40-95`);
  if (potential !== null && !(potential >= rating && potential <= 99)) {
    errors.push(`${where}: potential must be between the rating and 99`);
  }
  return { club: r.club, name: r.name, positions, age, flag: flag(r.nation), rating, potential };
});

if (errors.length) {
  console.error(`League "${league}" has ${errors.length} problem(s):\n- ${errors.join('\n- ')}`);
  process.exit(1);
}

const name = { english: 'English League' }[league] ?? `${league[0].toUpperCase()}${league.slice(1)} League`;
const out = join(root, 'src', 'data', `${league}.json`);
writeFileSync(out, `${JSON.stringify({ id: league, name, clubs, players }, null, 2)}\n`);
const perClub = clubs.map((c) => `${c.short} ${players.filter((p) => p.club === c.short).length}`);
console.log(`Wrote ${out}\n${clubs.length} clubs, ${players.length} players (${perClub.join(', ')})`);
