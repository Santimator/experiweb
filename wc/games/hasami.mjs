// Hasami shōgi, "sandwich shōgi": the children's game played with shōgi pawns on a 9×9 board.
// A square holds 0 or owner + 1 (owner 0 = you, at the bottom). Index = row * 9 + col.
// Moves are "from>to" (rook steps). First to capture five wins.

export const meta = {
    name: 'Hasami shōgi',
    goal: 'Take five of mAIa\'s pieces first.',
    levels: [40, 250, 800],
    origins: [
        "Hasami means 'sandwiching', and that is the whole idea. It is a children's game, played in Japan on an ordinary shōgi board with nothing but the pawns.",
        "Nobody knows who invented it. It is what children do with a shōgi set before they have the patience for shōgi itself.",
        "Every piece slides like a rook, so nothing in the open is ever far from danger. The children's rule is to take all but one; here, to keep it short, the first to take five wins."
    ],
    trivia: [
        ["Two faces of one pawn.", "The first player uses pawns face up (歩, fu); the second turns them over to show the promoted side (と, tokin)."],
        ["The big one.", "Dai hasami shōgi, 'big' hasami shōgi, uses 18 pieces a side. There aren't enough pawns in a shōgi box for that, so it is usually played with go stones on a go board."],
        ["Another way to win.", "In a second version, you win by making a line of five, as in gomoku."]
    ]
};

const N = 9, SIZE = N * N, TO_WIN = 5;
const ORTH = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const CORNERS = [[0, 1, 9], [8, 7, 17], [72, 63, 73], [80, 71, 79]]; // corner, its two neighbours

export function start(first) {
    const b = Array(SIZE).fill(0);
    for (let c = 0; c < N; c++) { b[c] = 2; b[72 + c] = 1; }
    return { b, first, t: first, taken: [0, 0], w: null };
}

export const turn = s => s.t;
export const result = s => s.w;

const at = (i, [dr, dc], k = 1) => {
    const y = ((i / N) | 0) + dr * k, x = i % N + dc * k;
    return y < 0 || y >= N || x < 0 || x >= N ? -1 : y * N + x;
};

function legal(s) {
    const out = [];
    for (let i = 0; i < SIZE; i++) {
        if (s.b[i] !== s.t + 1) continue;
        for (const d of ORTH) for (let k = 1, to; (to = at(i, d, k)) >= 0 && !s.b[to]; k++) out.push(i + '>' + to);
    }
    return out;
}

export function moves(s) {
    const out = legal(s);
    return out.length ? out : ['-'];
}

export function play(s, m) {
    const b = s.b.slice(), me = s.t, mine = me + 1, foe = 2 - me, taken = s.taken.slice();
    let w = null;
    if (m === '-') w = 1 - me;
    else {
        const [from, to] = m.split('>').map(Number);
        b[to] = mine;
        b[from] = 0;
        // Sandwich: a line of enemy pieces closed off by the piece that just moved and another of yours.
        for (const d of ORTH) {
            const line = [];
            let k = 1, p;
            while ((p = at(to, d, k)) >= 0 && b[p] === foe) { line.push(p); k++; }
            if (line.length && p >= 0 && b[p] === mine) for (const q of line) { b[q] = 0; taken[me]++; }
        }
        // A piece in a corner is caught by holding both squares next to it.
        for (const [c, x, y] of CORNERS) {
            if (b[c] === foe && (to === x || to === y) && b[x] === mine && b[y] === mine) { b[c] = 0; taken[me]++; }
        }
        if (taken[me] >= TO_WIN) w = me;
    }
    return { b, first: s.first, t: 1 - me, taken, w };
}

// ===== VIEW =====
let selected = null;

export function view(root, s, ui) {
    const ms = ui.canPlay ? legal(s) : [];
    if (selected !== null && !ms.some(m => m.startsWith(selected + '>'))) selected = null;
    const targets = new Map(ms.filter(m => m.startsWith(selected + '>')).map(m => [+m.split('>')[1], m]));
    const movable = new Set(ms.map(m => +m.split('>')[0]));
    const last = new Set(ui.last ?? []);

    const score = who => `<div class="hs-score p${who}">${'<i></i>'.repeat(s.taken[who])}${'<i class="off"></i>'.repeat(TO_WIN - s.taken[who])}</div>`;
    const board = document.createElement('div');
    board.className = 'hs-board';
    for (let i = 0; i < SIZE; i++) {
        const b = document.createElement('button'), v = s.b[i];
        b.type = 'button';
        b.className = 'hs-sq' + (last.has(i) ? ' last' : '') + (selected === i ? ' sel' : '') + (ui.guides && targets.has(i) ? ' target' : '');
        if (v) b.innerHTML = `<span class="hs-piece p${v - 1}">${v - 1 === s.first ? '歩' : 'と'}</span>`;
        b.addEventListener('click', () => {
            if (targets.has(i)) { const m = targets.get(i); selected = null; ui.onMove(m); return; }
            selected = movable.has(i) && selected !== i ? i : null;
            view(root, s, ui);
        });
        board.append(b);
    }
    const top = document.createElement('div'), bottom = document.createElement('div');
    top.innerHTML = score(1);
    bottom.innerHTML = score(0);
    root.replaceChildren(top.firstChild, board, bottom.firstChild);
}

export function trace(s, m) {
    return m === '-' ? [] : m.split('>').map(Number);
}

const who = s => s.t === 0 ? 'You' : 'mAIa';
const verb = (s, v) => s.t === 0 ? v : /(o|s|sh|ch|x)$/.test(v) ? v + 'es' : v + 's';
export function note(s, m, n) {
    const k = n.taken[s.t] - s.taken[s.t];
    return k ? `Sandwiched! ${k} taken` : null;
}
