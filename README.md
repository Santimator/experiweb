# Games

A small collection of browser games at [santiago-mj.com](https://santiago-mj.com). Everything is static HTML, CSS and vanilla JavaScript: no build step, no accounts, no server.

## Games

| Game | Page | Players | Notes |
| --- | --- | --- | --- |
| **Carrom** | `carrom.html` | 2–4, or 1 vs AI | Flick the striker to pocket your pieces. |
| **Go** | `go.html` | 2, or 1 vs AI | 9×9, 13×13 or 19×19 board, with a pass rule and scoring. |
| **CheRPSs** | `cherpss/` | 2 (local), or 1 vs AI | Chess where every capture becomes a real-time Rock / Scissors / Paper monster duel. **Unlisted** while in playtesting: no lobby card, not indexed; open it by URL. |

`index.html` is the lobby that links to each listed game.

### CheRPSs

Chess + Rock-Paper-Scissors. Normal chess moves, but a capture doesn't just happen. Both players secretly pick a champion, and the two fight it out in an arena. The pieces around the target square give each side bonuses. Each side has four champions of each type; the loser of a duel is eliminated. You win by defeating the enemy king or eliminating all of the opponent's champions. The loser can then ask to finish the game as ordinary chess.

- **Desktop:** one shared keyboard, a player at each end: White moves with E S D F (E up) and acts with Q A Z; Black moves with P L ; . turned sideways (L up, ; down) and acts with the arrow keys. Double-click any key in a player's panel to change it. Two gamepads also work.
- **Phone:** private pass-and-play picks, then automatic battles.
- **Solo:** play against the AI, Hellagoof (beatable, mostly) or Hellagood (a real challenge), in both the chess and the duels (`ai.mjs`).
- `cherpss/art.html` loops an automatic demo fight.
- Matches are saved in the browser's `localStorage`.
- The code is ES modules (`*.mjs`), so it needs to be served over HTTP. Opening the file directly from disk won't work.

## Project layout

```
index.html            Lobby
carrom.html/.js       Carrom
go.html/.js           Go
style.css             Shared styles for the lobby, Carrom and Go
cherpss/              Self-contained CheRPSs (own HTML, CSS, modules, art)
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
