# Games

A small collection of browser games at [santiago-mj.com](https://santiago-mj.com). Everything is static HTML, CSS and vanilla JavaScript: no build step, no accounts, no server.

## Games

| Game | Page | Players | Notes |
| --- | --- | --- | --- |
| **WC Games!** | `wc/` | 1 vs AI | One random short game (~5 min) against mAIa at a random strength. One tap, no menus. |
| **Carrom** | `carrom.html` | 2–4, or 1 vs AI | Flick the striker to pocket your pieces. |
| **Go** | `go.html` | 2, or 1 vs AI | 9×9, 13×13 or 19×19 board, with a pass rule and scoring. |
| **CheRPSs** | `cherpss/` | 2 (local), or 1 vs AI | Chess where every capture becomes a real-time Rock / Scissors / Paper monster duel. |

`index.html` is the lobby that links to each listed game.

### CheRPSs

Chess + Rock-Paper-Scissors. Normal chess moves, but a capture doesn't just happen. Both players secretly pick a champion, and the two fight it out in an arena. The pieces around the target square give each side bonuses. Each side has four champions of each type; the loser of a duel is eliminated. You win by defeating the enemy king or eliminating all of the opponent's champions. The loser can then ask to finish the game as ordinary chess.

- **Desktop:** one shared keyboard, a player at each end: White moves with E S D F (E up) and acts with Q A Z; Black moves with P L ; . turned sideways (L up, ; down) and acts with the arrow keys. Double-click any key in a player's panel to change it. Two gamepads also work.
- **Phone:** private pass-and-play picks, then automatic battles.
- **Solo:** play against the AI, Hellagoof (beatable, mostly) or Hellagood (a real challenge), in both the chess and the duels (`ai.mjs`).
- `cherpss/art.html` loops an automatic demo fight.
- Matches are saved in the browser's `localStorage`.
- The code is ES modules (`*.mjs`), so it needs to be served over HTTP. Opening the file directly from disk won't work.

### WC Games!

Tap the card and you land in a random game against mAIa, the AI, at a random level (3). Move guides (legal-move highlights) are also on or off at random. No rules are explained: you get a one-line goal and learn by playing. Rematch replays the same game, level and guides. Nothing is saved: close the tab and the match is gone. After 10 minutes on the page (rematches included) a time's-up card covers it, with one button; the card survives reloads (`localStorage`) until that button is pressed. The game's origins are shown only once the match ends.

- **Games:** The Royal Game of Ur, Dōbutsu shōgi, Brandubh (you get attackers or defenders at random), Fanorona, Poosweeper (solo Minesweeper: mAIa's level is how much poo it hid), Kōnane, Hasami shōgi, Surakarta, Puluc, Tâb, and three card games: Durak, Koi-Koi and Cuttle.
- **Trying one game:** `wc/?game=fanorona&level=2&guides=1` (all optional). `&limit=5` brings the time's-up card after 5 seconds.
- **Following along:** with no rules on screen, a short note says what just happened ("mAIa goes again", "3 captured"), a turn of several moves is numbered on the board, captured pieces leave a ghost until the turn ends, and mAIa slows down when it chains moves.
- **Adding a game:** one module in `wc/games/` (rules, goal line, origins text, levels, view; the interface is listed at the top of `app.mjs`), its styles in `wc.css`, and its name in `GAMES`. Only the picked game's module is loaded.
- **AI:** one generic Monte Carlo tree search (`mcts.mjs`) in a Web Worker. It only knows each game's rules; a level is just a number of simulations per move (`meta.levels`). It handles dice too. Card games hide information, so they bring their own rule-based `ai()` that reads only what mAIa's seat can see; there a level is how often mAIa plays a random legal move.

## Project layout

```
index.html            Lobby
carrom.html/.js       Carrom
go.html/.js           Go
style.css             Shared styles for the lobby, Carrom and Go
cherpss/              Self-contained CheRPSs (own HTML, CSS, modules, art)
wc/                   WC Games! (page, generic AI, one module per game)
favicon.svg
_headers              Cloudflare Pages headers (security + caching)
robots.txt
```

## Running locally

Any static server works:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Deployment

Hosted on Cloudflare Pages straight from the repo root (no build command, output directory `/`).

`_headers` caches `*.css` and `*.js` for a year. **When you change a stylesheet or script, bump its `?v=` query string** in the HTML that loads it, or returning visitors will keep the old file. CheRPSs's `.mjs` modules are cached for an hour.
