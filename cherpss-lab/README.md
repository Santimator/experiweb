# CheRPSs balance lab

Simulation tools and tests for `../cherpss/`. This branch (`cherpss-lab`) is never merged, so none of this
is published on the website. Node 22+, no dependencies. Run everything from this folder.

**Caveat:** every number comes from bots fighting bots. `../cherpss/bots.mjs` takes a skill level (0–1:
reaction time, aim, footwork, early swings) as a stand-in for players. Treat results as ±5% and as a guide
for playtesting, not truth.

| Script | What it does |
| --- | --- |
| `npm test` | Rules, arena, match flow and UI-handler tests (DOM/canvas harness, no browser). |
| `node validate.mjs [params.json]` | Champions alone: counter win % at equal skill and three skill gaps, mirrors, fight length (240 fights per cell). |
| `node suppopt.mjs` | Support pieces: what two helpers of each type do to each counter, plus the champion-pick game (equilibrium value and mix). `SUPPORT='{...}'` tries other values; `ITERS=n` searches. |
| `node levers.mjs` | Tries every support effect (incl. experimental ones: attack speed, reach, lifesteal, armour, power, interrupt) at two strengths. |
| `node opt.mjs [start.json]` | Hill-climbs champion stats and move rules toward the targets below. `N`, `ITERS` env vars. Writes `best.json`. |
| `node walls.mjs`, `node cliff.mjs`, `node diag.mjs` | One-off studies: rook walls, the Rock-vs-Paper speed cliff, Rock-vs-Scissors damage breakdown. |
| `lab.mjs`, `worker.mjs` | Parallel fight runner (4 worker threads) and the pick-game solver. |

Params files look like `{"stats":{"rock":{"hp":95}},"rules":{"rockStompRadius":130},"support":{"r":{"power":0.15}}}`
and override the game's values for that run only.

## Targets used

- Counter wins about 70–80% at equal skill, about 50% when the underdog plays clearly better (0.75 vs 0.45).
- With two helpers of the right type, a counter matchup comes to roughly even, and is never flipped hard.
- In the pick game no champion becomes the obvious choice (each picked at least ~10%), and two helpers put
  their side ahead by roughly 55–65%, not more.

## Findings so far

- Rock vs Paper is a speed race with a steep cliff (Rock 170 → Paper wins 96%, 176 → 46%). Keep speed bonuses tiny.
- Fully flipping a counter makes one champion a no-brainer; helpers should bring a matchup near 50%, not past it.
- Armour, lifesteal and large regen help whoever holds them everywhere and break the pick game.
- Rook walls changed nothing measurable (about 3%), so rooks now give stronger specials instead.
- `results/` keeps the tuned champion values and the lever study output.
