// One generic Monte Carlo tree search for every WC game. It knows nothing about any game: it only
// calls the game module's turn / moves / play / result. Strength is just the number of simulations.
//
// The tree is "open loop": nodes are reached by move strings, not stored states, so a game with dice
// (play() rolls for the next turn) just works. Each pass replays moves from the root with fresh luck,
// and a move that is legal only on some rolls is judged by how often it was actually available.

const EXPLORE = 0.7;      // UCB exploration constant (rewards are 0..1)
const ROLLOUT_LIMIT = 300; // plies; a playout that runs longer counts as a draw

function rollout(G, s) {
    for (let i = 0; i < ROLLOUT_LIMIT; i++) {
        const r = G.result(s);
        if (r !== null) return r;
        const ms = G.moves(s);
        s = G.play(s, ms[Math.random() * ms.length | 0]);
    }
    return 0.5;
}

const reward = (r, who) => r === 0.5 ? 0.5 : r === who ? 1 : 0;

// Returns the most visited move for the player to move in `root`.
export function search(G, root, simulations) {
    const ms = G.moves(root);
    if (ms.length === 1) return ms[0];
    const tree = { kids: new Map() };
    for (let i = 0; i < simulations; i++) {
        let s = root, node = tree;
        const path = [];
        while (G.result(s) === null) {
            const who = G.turn(s), legal = G.moves(s), untried = [];
            let best = null, bestMove = null, bestScore = -Infinity;
            for (const m of legal) {
                const c = node.kids.get(m);
                if (!c) { untried.push(m); continue; }
                c.avail++;
                const score = c.w / c.n + EXPLORE * Math.sqrt(Math.log(c.avail) / c.n);
                if (score > bestScore) { bestScore = score; best = c; bestMove = m; }
            }
            if (untried.length) {
                const m = untried[Math.random() * untried.length | 0];
                const c = { n: 0, w: 0, avail: 1, who, kids: new Map() };
                node.kids.set(m, c);
                path.push(c);
                s = G.play(s, m);
                break;
            }
            path.push(best);
            s = G.play(s, bestMove);
            node = best;
        }
        const r = rollout(G, s);
        for (const c of path) { c.n++; c.w += reward(r, c.who); }
    }
    let pick = ms[0], most = -1;
    for (const [m, c] of tree.kids) if (c.n > most) { most = c.n; pick = m; }
    return pick;
}
