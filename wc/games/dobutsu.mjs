// Dōbutsu shōgi ("animal shōgi", Let's Catch the Lion!).
// A 3×4 board, index = row * 3 + col, row 0 at the top. Player 0 (you) starts at the bottom, mAIa at the top.
// A square holds 0 or type + 8 * owner. Hands count captured giraffes, elephants and chicks.
// Moves are strings: "from>to" on the board, or "g*to" / "e*to" / "c*to" to drop from the hand.

export const meta = {
    name: 'Dōbutsu shōgi',
    goal: "Catch mAIa's lion. Or walk yours safely across.",
    levels: [60, 600, 6000],
    origins: [
        'Not an ancient game, but one distilled from an old one. Madoka Kitao, a professional shōgi player, created it in 2008 with illustrator Maiko Fujita, to bring children (and anyone put off by 81 squares) into Japanese chess.',
        'What survives from shōgi is its most famous idea, centuries old: in this war, nobody really dies. They just change sides.',
        'Twelve squares look like a toy, but computers have played this board out completely: with perfect play, the player who moves second wins. Nobody plays perfectly, which is the fun part.'
    ]
};

const LION = 1, GIRAFFE = 2, ELEPHANT = 3, CHICK = 4, HEN = 5;
const HAND = { g: GIRAFFE, e: ELEPHANT, c: CHICK }, HAND_SLOT = { [GIRAFFE]: 0, [ELEPHANT]: 1, [CHICK]: 2 };
const ORTH = [[-1, 0], [1, 0], [0, -1], [0, 1]], DIAG = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
// Steps for player 0 as [dRow, dCol]; player 1 flips the rows.
const STEPS = {
    [LION]: [...ORTH, ...DIAG],
    [GIRAFFE]: ORTH,
    [ELEPHANT]: DIAG,
    [CHICK]: [[-1, 0]],
    [HEN]: [...ORTH, [-1, -1], [-1, 1]]
};
const owner = v => v >> 3, kind = v => v & 7;
const farRow = who => who === 0 ? 0 : 3;

export function start(first) {
    const b = Array(12).fill(0);
    // Elephant on the lion's left, giraffe on its right, chick in front, for both players.
    b[0] = GIRAFFE + 8; b[1] = LION + 8; b[2] = ELEPHANT + 8; b[4] = CHICK + 8;
    b[9] = ELEPHANT; b[10] = LION; b[11] = GIRAFFE; b[7] = CHICK;
    const s = { b, h: [[0, 0, 0], [0, 0, 0]], t: first, w: null, seen: [] };
    s.seen = [key(s)];
    return s;
}

export const turn = s => s.t;
export const result = s => s.w;

const key = s => s.b.join(',') + '|' + s.h[0].join('') + s.h[1].join('') + s.t;

function targets(b, i) {
    const v = b[i], who = owner(v), r = (i / 3) | 0, c = i % 3, out = [];
    for (const [dr, dc] of STEPS[kind(v)]) {
        const y = r + (who === 0 ? dr : -dr), x = c + dc;
        if (y < 0 || y > 3 || x < 0 || x > 2) continue;
        const to = y * 3 + x;
        if (b[to] && owner(b[to]) === who) continue;
        out.push(to);
    }
    return out;
}

function attacked(b, sq, by) {
    for (let i = 0; i < 12; i++) if (b[i] && owner(b[i]) === by && targets(b, i).includes(sq)) return true;
    return false;
}

export function moves(s) {
    const out = [];
    for (let i = 0; i < 12; i++) {
        if (!s.b[i] || owner(s.b[i]) !== s.t) continue;
        for (const to of targets(s.b, i)) out.push(i + '>' + to);
    }
    const hand = s.h[s.t];
    for (const [letter, type] of Object.entries(HAND)) {
        if (!hand[HAND_SLOT[type]]) continue;
        for (let to = 0; to < 12; to++) if (!s.b[to]) out.push(letter + '*' + to);
    }
    return out.length ? out : ['-'];
}

export function play(s, m) {
    const b = s.b.slice(), h = [s.h[0].slice(), s.h[1].slice()], me = s.t, them = 1 - me;
    let w = null;
    if (m.includes('*')) {
        const type = HAND[m[0]];
        h[me][HAND_SLOT[type]]--;
        b[+m.slice(2)] = type + 8 * me;
    } else if (m !== '-') {
        const [from, to] = m.split('>').map(Number);
        let v = b[from];
        if (b[to]) {
            const taken = kind(b[to]);
            if (taken === LION) w = me;
            else h[me][HAND_SLOT[taken === HEN ? CHICK : taken]]++;
        }
        if (kind(v) === CHICK && ((to / 3) | 0) === farRow(me)) v = HEN + 8 * me;
        b[to] = v;
        b[from] = 0;
    }
    if (w === null) {
        const lion = who => b.indexOf(LION + 8 * who);
        // A lion that reached the far side last turn and was not caught wins.
        if (((lion(them) / 3) | 0) === farRow(them)) w = them;
        // A lion that reaches the far side where it cannot be caught wins at once.
        else if (((lion(me) / 3) | 0) === farRow(me) && !attacked(b, lion(me), them)) w = me;
    }
    const next = { b, h, t: them, w, seen: s.seen };
    if (w === null) {
        // The same position three times is a draw.
        const k = key(next);
        let n = 1;
        for (const x of s.seen) if (x === k) n++;
        if (n >= 3) next.w = 0.5;
        next.seen = [...s.seen, k];
    }
    return next;
}

// ===== VIEW =====
// Pieces are tiles with dots showing where they can step, as on the original set.
const ANIMAL = { [LION]: '🦁', [GIRAFFE]: '🦒', [ELEPHANT]: '🐘', [CHICK]: '🐤', [HEN]: '🐔' };

function tile(type, who) {
    const dots = STEPS[type].map(([dr, dc]) => `<i style="--r:${dr};--c:${dc}"></i>`).join('');
    return `<span class="db-piece p${who}"><span class="db-animal">${ANIMAL[type]}</span>${dots}</span>`;
}

let selected = null; // a board index, or a hand letter

export function view(root, s, ui) {
    const legal = ui.canPlay ? moves(s).filter(m => m !== '-') : [];
    const prefix = x => typeof x === 'number' ? x + '>' : x + '*';
    if (selected !== null && !legal.some(m => m.startsWith(prefix(selected)))) selected = null;
    const targets = new Map();
    if (selected !== null) for (const m of legal) if (m.startsWith(prefix(selected))) targets.set(+m.split(/[>*]/)[1], m);
    const last = new Set(ui.last ?? []);

    const handRow = who => {
        const row = document.createElement('div');
        row.className = 'db-hand p' + who;
        for (const [letter, type] of Object.entries(HAND)) {
            const n = s.h[who][HAND_SLOT[type]];
            if (!n) continue;
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'db-sq' + (who === 0 && selected === letter ? ' sel' : '');
            b.innerHTML = tile(type, who) + (n > 1 ? `<b class="count">${n}</b>` : '');
            if (who === 0) b.addEventListener('click', () => pick(letter));
            row.append(b);
        }
        return row;
    };

    const board = document.createElement('div');
    board.className = 'db-board';
    for (let i = 0; i < 12; i++) {
        const b = document.createElement('button'), v = s.b[i];
        b.type = 'button';
        b.className = 'db-sq' + (selected === i ? ' sel' : '') + (last.has(i) ? ' last' : '') +
            (ui.guides && targets.has(i) ? ' target' + (v ? ' capture' : '') : '');
        if (v) b.innerHTML = tile(kind(v), owner(v));
        b.addEventListener('click', () => tapSquare(i));
        board.append(b);
    }

    function tapSquare(i) {
        if (targets.has(i)) { const m = targets.get(i); selected = null; ui.onMove(m); return; }
        const v = s.b[i];
        pick(v && owner(v) === 0 && selected !== i ? i : null);
    }
    function pick(x) {
        selected = x !== null && selected !== x && legal.some(m => m.startsWith(prefix(x))) ? x : null;
        view(root, s, ui);
    }

    root.replaceChildren(handRow(1), board, handRow(0));
}

export function trace(s, m) {
    if (m === '-') return [];
    return m.includes('*') ? [+m.slice(2)] : m.split('>').map(Number);
}
