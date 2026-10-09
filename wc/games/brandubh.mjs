// Brandubh, the 7×7 Irish tafl game. One side is the attackers (8, dark), the other the king and his 4
// defenders (light). Who plays which side changes every match: the attackers always move first.
// A square holds 0, ATT, DEF or KING; index = row * 7 + col. s.att is the player (0 you, 1 mAIa) on attack.
// Moves are "from>to".

export const meta = {
    name: 'Brandubh',
    goal: s => s.att === 0 ? "Trap mAIa's king before it escapes." : 'Get your king to a corner.',
    levels: [60, 400, 1500],
    origins: [
        'Tafl games were the board games of the Norse world, played from Scandinavia to Ireland centuries before chess arrived there. Brandubh, "black raven" in Old Irish, is the small Irish one.',
        'A 10th-century yew board with 7×7 holes, found in 1932 at Ballinderry, in Ireland, is usually linked to it. The rules were never written down by the people who played them: what you just played is a modern reconstruction, and reconstructions disagree on the details.',
        'It is a fight between two shapes: a small, strong group in the middle and a larger, thinner ring around it. Neither side can win by being the other.'
    ],
    // [lead, text] pairs, shown under the origins once the match ends.
    trivia: [
        ["Five against eight.", "Medieval Irish texts describe brandub with thirteen pieces, five against eight, and call the central piece the branán, the chief. That is where the modern setup comes from: a king, four defenders and eight attackers."],
        ["An Irish board, not a Viking one.", "The Ballinderry board has a carved head at each end as a handle and Irish-style interlace on its border, which suggests it was made for an Irish owner, not a Norse one."],
        ["Two centuries of a typo.", "The only eyewitness account of tafl rules comes from the botanist Linnaeus, who watched the Sámi play tablut in Lapland in 1732. The 1811 English translation of his diary garbled them, and for most of the next two centuries everyone played the translator's mistakes."],
        ["A king carved from a whale.", "A 10th-century grave at Baldursheimur, in Iceland, held a whole set: 24 pieces and a small whalebone king. It is now in the National Museum of Iceland."]
    ]
};

const N = 7, THRONE = 24, CORNERS = new Set([0, 6, 42, 48]);
const ATT = 1, DEF = 2, KING = 3;
const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];

// Which player a piece belongs to.
const side = (s, v) => v === ATT ? s.att : 1 - s.att;

export function start(first) {
    const b = Array(N * N).fill(0);
    for (const i of [3, 10, 38, 45, 21, 22, 26, 27]) b[i] = ATT;
    for (const i of [17, 31, 23, 25]) b[i] = DEF;
    b[THRONE] = KING;
    const s = { b, att: first, t: first, w: null, ply: 0, seen: [] };
    s.seen = [key(s)];
    return s;
}

export const turn = s => s.t;
export const result = s => s.w;
const key = s => s.b.join('') + s.t;

function targets(b, i) {
    const out = [], r = (i / N) | 0, c = i % N, king = b[i] === KING;
    for (const [dr, dc] of DIRS) {
        for (let y = r + dr, x = c + dc; y >= 0 && y < N && x >= 0 && x < N; y += dr, x += dc) {
            const to = y * N + x;
            if (b[to]) break;
            // Only the king may stop on the throne or a corner; anyone may pass over the empty throne.
            if (!king && (to === THRONE || CORNERS.has(to))) continue;
            out.push(to);
        }
    }
    return out;
}

function legal(s) {
    const out = [];
    for (let i = 0; i < N * N; i++) {
        if (!s.b[i] || side(s, s.b[i]) !== s.t) continue;
        for (const to of targets(s.b, i)) out.push(i + '>' + to);
    }
    return out;
}

export function moves(s) {
    const out = legal(s);
    return out.length ? out : ['-'];
}

const at = (i, dr, dc) => {
    const y = ((i / N) | 0) + dr, x = i % N + dc;
    return y < 0 || y >= N || x < 0 || x >= N ? -1 : y * N + x;
};

export function play(s, m) {
    const b = s.b.slice(), me = s.t;
    let w = null;
    if (m === '-') {
        w = 1 - me; // a side that cannot move has lost
    } else {
        const [from, to] = m.split('>').map(Number);
        b[to] = b[from];
        b[from] = 0;
        const mine = i => i >= 0 && b[i] && side(s, b[i]) === me;
        // Corners help both sides capture. The throne helps against attackers always, against defenders only when empty.
        const hostile = (i, victim) => CORNERS.has(i) || i === THRONE && (!b[i] || victim === ATT) || mine(i);
        for (const [dr, dc] of DIRS) {
            const n = at(to, dr, dc), f = at(to, 2 * dr, 2 * dc);
            if (n < 0 || !b[n] || side(s, b[n]) === me) continue;
            if (b[n] === KING) {
                // On the throne the king must be surrounded; anywhere else two attackers (or one and a corner) do.
                if (n === THRONE) {
                    if (DIRS.every(([y, x]) => b[at(n, y, x)] === ATT)) w = me;
                } else if (f >= 0 && (b[f] === ATT || CORNERS.has(f))) w = me;
            } else if (f >= 0 && hostile(f, b[n])) {
                b[n] = 0;
            }
        }
        if (CORNERS.has(to) && b[to] === KING) w = me;
    }
    const next = { b, att: s.att, t: 1 - me, w, ply: s.ply + 1, seen: s.seen };
    if (w === null) {
        const k = key(next);
        // Captures can't be undone, so only positions since the last one can repeat.
        const seen = b.filter(Boolean).length === s.b.filter(Boolean).length ? s.seen : [];
        let n = 1;
        for (const x of seen) if (x === k) n++;
        if (n >= 3) next.w = 0.5;
        next.seen = [...seen, k];
    }
    return next;
}

// ===== VIEW =====
let selected = null;

export function view(root, s, ui) {
    const ms = ui.canPlay ? legal(s) : [];
    if (selected !== null && !ms.some(m => m.startsWith(selected + '>'))) selected = null;
    const targets = new Map(ms.filter(m => m.startsWith(selected + '>')).map(m => [+m.split('>')[1], m]));
    const movable = new Set(ms.map(m => +m.split('>')[0]));
    const last = new Set(ui.last ?? []);

    const board = document.createElement('div');
    board.className = 'bd-board';
    for (let i = 0; i < N * N; i++) {
        const b = document.createElement('button'), v = s.b[i];
        b.type = 'button';
        b.className = 'bd-sq' + (CORNERS.has(i) || i === THRONE ? ' refuge' : '') + (last.has(i) ? ' last' : '') +
            (selected === i ? ' sel' : '') + (ui.guides && targets.has(i) ? ' target' : '');
        if (v) b.innerHTML = `<span class="bd-piece ${v === ATT ? 'att' : 'def'}${v === KING ? ' king' : ''}${v && side(s, v) === 0 ? ' mine' : ''}"></span>`;
        b.addEventListener('click', () => {
            if (targets.has(i)) { const m = targets.get(i); selected = null; ui.onMove(m); return; }
            selected = movable.has(i) && selected !== i ? i : null;
            view(root, s, ui);
        });
        board.append(b);
    }
    root.replaceChildren(board);
}

export function trace(s, m) {
    return m === '-' ? [] : m.split('>').map(Number);
}

const who = s => s.t === 0 ? 'You' : 'mAIa';
const verb = (s, v) => s.t === 0 ? v : /(o|s|sh|ch|x)$/.test(v) ? v + 'es' : v + 's';
export function note(s, m, n) {
    if (m === '-') return `${who(s)} can't move`;
    const to = +m.split('>')[1];
    if (n.w === s.t && n.b[to] === KING && CORNERS.has(to)) return 'The king escapes!';
    if (n.w === s.t) return 'The king is caught!';
    const taken = s.b.filter(Boolean).length - n.b.filter(Boolean).length;
    return taken ? (taken > 1 ? `${taken} captured` : 'Captured!') : null;
}
