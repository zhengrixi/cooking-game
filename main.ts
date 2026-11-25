// Sunny Side Diner — hand-in program for the make.fun cooking-game bounty.
//
// The game itself is the static site in game/ (open game/index.html in a desktop
// browser; it plays offline and loads nothing from the network). This program is
// the courier, not the game: it carries game/ and screenshots/ into the output
// directory the grader reads and writes dossier.json there, using the vendored
// make.fun dossier library in vendor/makefun-game.ts (kept byte for byte as the
// kit ships it, because the gate rebuilds the dossier with the same library and
// compares the two).
//
// Run it the way the grader does, with the output directory named by the
// MAKEFUN_OUTPUT_DIR environment variable (which stands in for /output):
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoDir = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The sealed gate's own limits, passed to the dossier builder so the dossier it
// writes is exactly the one the gate would write: the source text is capped,
// screenshots are at most 4 files of at most 256 KiB, and game/ holds at most
// 993 entries, 48 MiB in all, with no path longer than 1000 bytes.
const GATE_LIMITS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function handIn() {
  mkdirSync(outputDir, { recursive: true });
  cpSync(join(repoDir, 'game'), join(outputDir, 'game'), { recursive: true });
  const shotsDir = join(outputDir, 'screenshots');
  mkdirSync(shotsDir, { recursive: true });
  if (existsSync(join(repoDir, 'screenshots'))) {
    cpSync(join(repoDir, 'screenshots'), shotsDir, { recursive: true });
  }
  const dossier = buildDossier(outputDir, GATE_LIMITS);
  writeFileSync(join(outputDir, 'dossier.json'), dossier);
  console.log(`handed in: game/ + screenshots/ -> ${outputDir}, dossier.json ${dossier.length} bytes`);
}

handIn();
