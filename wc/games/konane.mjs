// Kōnane, Hawaiian checkers. A 6×6 board filled in a checkerboard; every move is a jump that captures.
// A point holds 0 or owner + 1 (owner 0 = you). Index = row * 6 + col. Black (dark) moves first; s.black says
// who is Black. Moves: "x<i>" lifts one of your own stones (the two opening moves), "from>to" jumps.

export const meta = {
    name: 'Kōnane',
    goal: 'Make the last jump. Leave mAIa stuck.',
    levels: [60, 600, 5000],
    origins: [
        "Kōnane was already old when the first Europeans reached Hawaiʻi. Captain Cook's expedition, in 1778–79, saw a game 'very much like our draughts' played on a board of 14 by 17 holes, and noted that the islanders were great gamblers.",
        "Boards, called papamū, were carved from wood or straight into flat lava rock. The pieces were pebbles: black basalt against white coral.",
        "There is no luck and no draw. Every move takes a piece, and the last player able to move wins, so the game is less about taking than about leaving your opponent nothing to do. Here it is played on 6×6; old boards were much bigger."
    ],
    trivia: [
        ["High stakes.", "People bet heavily on kōnane: mats, cloth, land, and, according to some accounts, their own lives."],
        ["A royal pastime.", "King Kalākaua and Queen Kapiʻolani, in the late 19th century, were reported to be experts."],
        ["Nearly lost.", "Missionaries frowned on the gambling around Hawaiian games, and they faded. By 1924 only one elderly Hawaiian woman was recorded as still knowing kōnane. It is being revived today."],
        ["Boards in the lava.", "At Kapalaoa, on the Big Island, a line of boards is carved into the lava along the shore."]
    ]
};

const N = 6, SIZE = N * N;
const ORTH = [[-1, 0], [1, 0], [0, -1], [0, 1]];
// Black opens by lifting a stone from the centre or a corner; White lifts one next to the hole.
const OPENING = [0, 5, 30, 35, 14, 15, 20, 21];

export function start(first) {
    const b = Array(SIZE).fill(0);
    for (let i = 0; i < SIZE; i++) b[i] = ((((i / N) | 0) + i % N) % 2 === 0 ? first : 1 - first) + 1;
    return { b, black: first, t: first, phase: 0, hole: -1, w: null };
}

export const turn = s => s.t;
export const result = s => s.w;

const at = (i, [dr, dc], k = 1) => {
    const y = ((i / N) | 0) + dr * k, x = i % N + dc * k;
    return y < 0 || y >= N || x < 0 || x >= N ? -1 : y * N + x;
};

function jumps(b, who) {
    const out = [];
    for (let i = 0; i < SIZE; i++) {
        if (b[i] !== who + 1) continue;
        for (const d of ORTH) {
            // Keep jumping in a straight line while there is an enemy stone and a hole behind it.
            for (let k = 1; ; k++) {
                const over = at(i, d, 2 * k - 1), to = at(i, d, 2 * k);
                if (over < 0 || to < 0 || b[over] !== 2 - who || b[to]) break;
                out.push(i + '>' + to);
            }
        }
    }
    return out;
}

function legal(s) {
    if (s.phase === 0) return OPENING.filter(i => s.b[i] === s.t + 1).map(i => 'x' + i);
    if (s.phase === 1) return ORTH.map(d => at(s.hole, d)).filter(i => i >= 0 && s.b[i] === s.t + 1).map(i => 'x' + i);
    return jumps(s.b, s.t);
}

export function moves(s) {
    const out = legal(s);
    return out.length ? out : ['-'];
}

export function play(s, m) {
    const b = s.b.slice(), me = s.t;
    let phase = s.phase, hole = s.hole;
    if (m[0] === 'x') {
        hole = +m.slice(1);
        b[hole] = 0;
        phase++;
    } else if (m !== '-') {
        const [from, to] = m.split('>').map(Number);
        const step = to - from > 0 ? (to - from >= N ? N : 1) : (from - to >= N ? -N : -1);
        for (let k = 1; k < (to - from) / step; k += 2) b[from + k * step] = 0; // every other point is a jumped stone
        b[to] = b[from];
        b[from] = 0;
    }
    const next = { b, black: s.black, t: 1 - me, phase, hole, w: null };
    // Whoever has no jump on their turn loses.
    if (phase === 2 && !jumps(b, 1 - me).length) next.w = me;
    return next;
}

// ===== VIEW =====
let selected = null;

export function view(root, s, ui) {
    const ms = ui.canPlay ? legal(s) : [];
    const lifts = new Set(ms.filter(m => m[0] === 'x').map(m => +m.slice(1)));
    if (selected !== null && !ms.some(m => m.startsWith(selected + '>'))) selected = null;
    const targets = new Map(ms.filter(m => m.startsWith(selected + '>')).map(m => [+m.split('>')[1], m]));
    const movable = new Set(ms.filter(m => m.includes('>')).map(m => +m.split('>')[0]));
    const last = new Set(ui.last ?? []);

    const board = document.createElement('div');
    board.className = 'kn-board';
    for (let i = 0; i < SIZE; i++) {
        const b = document.createElement('button'), v = s.b[i];
        b.type = 'button';
        b.className = 'kn-pt' + (last.has(i) ? ' last' : '') + (selected === i ? ' sel' : '') +
            (ui.guides && (targets.has(i) || lifts.has(i)) ? ' target' : '') +
            (ui.guides && selected === null && movable.has(i) ? ' can' : '');
        if (v) b.innerHTML = `<span class="kn-stone ${v - 1 === s.black ? 'dark' : 'light'}"></span>`;
        b.addEventListener('click', () => {
            if (lifts.has(i)) { ui.onMove('x' + i); return; }
            if (targets.has(i)) { const m = targets.get(i); selected = null; ui.onMove(m); return; }
            selected = movable.has(i) && selected !== i ? i : null;
            view(root, s, ui);
        });
        board.append(b);
    }
    root.replaceChildren(board);
}

export const status = s => s.phase < 2 ? 'Lift one of your stones' : 'Your move';

export function trace(s, m) {
    if (m === '-') return [];
    return m[0] === 'x' ? [+m.slice(1)] : m.split('>').map(Number);
}
