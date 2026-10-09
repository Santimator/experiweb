// Surakarta, from Java. A 6×6 grid of points; the lines at index 1 and 4 join into a small circuit through
// four small corner loops, the lines at 2 and 3 into a large circuit through four large loops.
// A point holds 0 or owner + 1 (owner 0 = you, at the bottom). Index = row * 6 + col.
// Moves: "from>to" for a step to a neighbouring point, "from>toX" for a capture along a circuit.

export const meta = {
    name: 'Surakarta',
    goal: "Take all of mAIa's pieces.",
    levels: [40, 250, 800],
    origins: [
        "Surakarta is named after the royal city of Surakarta (Solo), in Central Java. Nobody knows how old it is. It was traditionally scratched into the sand and played with stones against cowrie shells; in Java it is also called dam-daman.",
        "Its capture, a run around the loops before striking, is not known from any other traditional board game. The West met it late: it was published in France in 1970, and the American game designer Sid Sackson later called it 'Roundabouts'.",
        "Corners are safe and useless; the middle, where a piece sits on two circuits, is where games are won. In this version a capturing piece's own starting point counts as empty."
    ],
    trivia: [
        ["The game, plainly.", "In Indonesian it is often just called permainan: 'the game'."],
        ["Machines love it.", "Since 2007 it has been an event at the Computer Olympiad. Mark Winands's program SIA has won gold there five times."],
        ["A bigger cousin.", "Nearby Yogyakarta plays the same game on a 7×7 board, under the name bas-basan sepur."]
    ]
};

const N = 6, SIZE = N * N;
const KING = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];

// A circuit as a closed walk of 24 points; LOOP marks the corner loops between its four lines.
const LOOP = -1;
function circuit(k) {
    const j = N - 1 - k, path = [];
    for (let c = 0; c < N; c++) path.push(k * N + c);          // row k, left to right
    path.push(LOOP);
    for (let r = 0; r < N; r++) path.push(r * N + j);          // column j, top to bottom
    path.push(LOOP);
    for (let c = N - 1; c >= 0; c--) path.push(j * N + c);     // row j, right to left
    path.push(LOOP);
    for (let r = N - 1; r >= 0; r--) path.push(r * N + k);     // column k, bottom to top
    path.push(LOOP);
    return path;
}
const CIRCUITS = [circuit(1), circuit(2)];

export function start(first) {
    const b = Array(SIZE).fill(0);
    for (let i = 0; i < 12; i++) { b[i] = 2; b[SIZE - 1 - i] = 1; }
    return { b, t: first, w: null };
}

export const turn = s => s.t;
export const result = s => s.w;

// Captures from point i: run along each circuit in both directions over empty points (the mover's own
// point counts as empty), through at least one loop, onto an enemy piece.
function captures(b, i, who) {
    const out = new Set();
    for (const path of CIRCUITS) {
        const L = path.length;
        for (let start = 0; start < L; start++) {
            if (path[start] !== i) continue;
            for (const dir of [1, -1]) {
                let loops = 0;
                for (let k = 1; k < L; k++) {
                    const p = path[((start + dir * k) % L + L) % L];
                    if (p === LOOP) { loops++; continue; }
                    if (p === i || !b[p]) continue;
                    if (b[p] === 2 - who && loops > 0) out.add(i + '>' + p + 'X');
                    break;
                }
            }
        }
    }
    return [...out];
}

function legal(s) {
    const out = [];
    for (let i = 0; i < SIZE; i++) {
        if (s.b[i] !== s.t + 1) continue;
        const r = (i / N) | 0, c = i % N;
        for (const [dr, dc] of KING) {
            const y = r + dr, x = c + dc;
            if (y >= 0 && y < N && x >= 0 && x < N && !s.b[y * N + x]) out.push(i + '>' + (y * N + x));
        }
        out.push(...captures(s.b, i, s.t));
    }
    return out;
}

export function moves(s) {
    const out = legal(s);
    return out.length ? out : ['-'];
}

export function play(s, m) {
    const b = s.b.slice(), me = s.t;
    let w = null;
    if (m === '-') w = 1 - me;
    else {
        const [from, to] = m.replace('X', '').split('>').map(Number);
        b[to] = b[from];
        b[from] = 0;
        if (!b.includes(2 - me)) w = me;
    }
    return { b, t: 1 - me, w };
}

// ===== VIEW =====
let selected = null;

export function view(root, s, ui) {
    const ms = ui.canPlay ? legal(s) : [];
    if (selected !== null && !ms.some(m => m.startsWith(selected + '>'))) selected = null;
    const targets = new Map(ms.filter(m => m.startsWith(selected + '>')).map(m => [parseInt(m.split('>')[1]), m]));
    const movable = new Set(ms.map(m => +m.split('>')[0]));
    const last = new Set(ui.last ?? []);

    const board = document.createElement('div');
    board.className = 'sk-board';
    board.innerHTML = lines();
    for (let i = 0; i < SIZE; i++) {
        const b = document.createElement('button'), v = s.b[i];
        b.type = 'button';
        b.className = 'sk-pt' + (last.has(i) ? ' last' : '') + (selected === i ? ' sel' : '') +
            (ui.guides && targets.has(i) ? ' target' + (v ? ' capture' : '') : '') +
            (ui.guides && selected === null && movable.has(i) ? ' can' : '');
        if (v) b.innerHTML = `<span class="sk-piece p${v - 1}"></span>`;
        b.addEventListener('click', () => {
            if (targets.has(i)) { const m = targets.get(i); selected = null; ui.onMove(m); return; }
            selected = movable.has(i) && selected !== i ? i : null;
            view(root, s, ui);
        });
        board.append(b);
    }
    root.replaceChildren(board);
}

// The grid and its eight loops, in grid units: points at 0..5, loops reaching out into the margin.
let svg = null;
function lines() {
    if (svg) return svg;
    let grid = '';
    for (let k = 0; k < N; k++) grid += `M0 ${k}H5M${k} 0V5`;
    const loops = (k, cls) => {
        // Three-quarter circles around each corner, joining line k on both sides of it.
        const r = k, j = N - 1 - k;
        return `<path class="${cls}" d="M0 ${r}A${r} ${r} 0 1 1 ${r} 0M5 ${r}A${r} ${r} 0 1 0 ${j} 0M5 ${j}A${r} ${r} 0 1 1 ${j} 5M0 ${j}A${r} ${r} 0 1 0 ${r} 5"/>`;
    };
    return svg = `<svg class="sk-lines" viewBox="-2.3 -2.3 9.6 9.6" aria-hidden="true"><path class="grid" d="${grid}"/>${loops(1, 'small')}${loops(2, 'large')}</svg>`;
}

export function trace(s, m) {
    return m === '-' ? [] : m.replace('X', '').split('>').map(Number);
}

const who = s => s.t === 0 ? 'You' : 'mAIa';
const verb = (s, v) => s.t === 0 ? v : /(o|s|sh|ch|x)$/.test(v) ? v + 'es' : v + 's';
export function note(s, m) {
    return m.endsWith('X') ? 'Round the loop: captured!' : null;
}
