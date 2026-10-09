// Turns data/<country>/clubs.csv and players.csv for every country into
// src/data/leagues.json, the world the game loads. Usage: npm run build:league
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
/** Countries in display order, with the adjective used in league names. */
const COUNTRIES = [
  ['english', 'English'],
  ['spanish', 'Spanish'],
  ['german', 'German'],
  ['italian', 'Italian'],
  ['french', 'French'],
  ['dutch', 'Dutch'],
];
let league = '';
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

function buildCountry() {
const clubs = readCsv('clubs.csv').map((r) => {
  const where = `${league}/clubs.csv line ${r.line}`;
  if (!/^[A-Z]{3}$/.test(r.short)) errors.push(`${where}: short must be 3 capital letters`);
  if (!r.name) errors.push(`${where}: name is empty`);
  for (const col of ['primary', 'secondary']) {
    if (!/^#[0-9A-Fa-f]{6}$/.test(r[col])) errors.push(`${where}: ${col} must be a colour like #C8102E`);
  }
  if (!PATTERNS.has(r.pattern)) errors.push(`${where}: pattern must be solid, stripes, half or band`);
  const strength = Number(r.strength);
  if (!(strength >= 55 && strength <= 90)) errors.push(`${where}: strength must be 55-90`);
  const division = r.division ? Number(r.division) : 1;
  if (!Number.isInteger(division) || division < 1 || division > 4) errors.push(`${where}: division must be 1-4`);
  return {
    short: r.short,
    name: r.name,
    primary: r.primary.toUpperCase(),
    secondary: r.secondary.toUpperCase(),
    pattern: r.pattern,
    level: Math.round(strength),
    division,
  };
});

const shorts = new Set(clubs.map((c) => c.short));
if (shorts.size !== clubs.length) errors.push('clubs.csv: two clubs share the same short code');
const divisions = [...new Set(clubs.map((c) => c.division))].sort();
divisions.forEach((d, i) => {
  if (d !== i + 1) errors.push(`clubs.csv: divisions must be numbered 1, 2, ... without gaps`);
  const n = clubs.filter((c) => c.division === d).length;
  if (n % 2 || n < 4) errors.push(`clubs.csv: division ${d} needs an even number of clubs, at least 4 (has ${n})`);
});

const players = readCsv('players.csv').map((r) => {
  const where = `${league}/players.csv line ${r.line}`;
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

  return { clubs, players, divisions };
}

const countries = [];
for (const [id, adjective] of COUNTRIES) {
  if (!existsSync(join(root, 'data', id, 'clubs.csv'))) continue;
  league = id;
  const before = errors.length;
  const { clubs, players, divisions } = buildCountry();
  if (errors.length > before) continue;
  countries.push({ id, name: adjective, clubs, players });
  const filled = clubs.filter((c) => players.some((p) => p.club === c.short)).length;
  console.log(
    `${adjective}: ${divisions.map((d) => `division ${d} ${clubs.filter((c) => c.division === d).length} clubs`).join(', ')}; ` +
      `${players.length} players (${filled} clubs with real players)`,
  );
}

if (errors.length) {
  console.error(`${errors.length} problem(s):\n- ${errors.join('\n- ')}`);
  process.exit(1);
}

const out = join(root, 'src', 'data', 'leagues.json');
writeFileSync(out, `${JSON.stringify({ countries }, null, 1)}\n`);
console.log(`Wrote ${out}`);
