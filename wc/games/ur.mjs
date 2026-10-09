// The Royal Game of Ur, with Irving Finkel's reconstructed rules.
// Player 0 is you, player 1 is mAIa. Each has 7 pieces; a piece's position runs along its own route:
// 0 = waiting, 1–4 own lane, 5–12 the shared middle lane, 13–14 own lane, 15 = home.
// Moves are strings "from>to", or "-" when there is nothing to play.

export const meta = {
    name: 'The Royal Game of Ur',
    goal: 'Race all seven pieces home before mAIa does.',
    // Simulations per move for mAIa's three moods. Dice hide a lot, so even the top level is quick.
    levels: [20, 250, 2500],
    origins: [
        'In the 1920s, Leonard Woolley dug up the Royal Cemetery of Ur, in southern Iraq, and found five boards like this one. They are about 4,500 years old, and versions of the game were played across the Middle East for well over two thousand years.',
        'Nobody wrote the rules down on the boards. They come from a Babylonian clay tablet copied by a scribe called Itti-Marduk-balāṭu in 177 BC, which Irving Finkel of the British Museum deciphered and used to rebuild the game. Remarkably, a version of it was still played by the Jewish community of Cochin, in India, until the 1950s.',
        'It is one of the oldest games we can still play, and it already had the balance good games keep chasing: the dice decide how far, you decide what it means.'
    ],
    // [lead, text] pairs, shown under the origins once the match ends.
    trivia: [
        ["The triangles are dice.", "Ur's players threw small four-cornered pyramids with two of the four tips inlaid with a white dot. Each one is a coin toss, so four of them score 0 to 4: a 2 comes up 6 times in 16, while 0 and 4 are rare (1 in 16). The Babylonian tablet, written two thousand years later, used knucklebones instead: one from a sheep and, oddly, one from an ox."],
        ["The rules that waited a century.", "The rules tablet reached the British Museum around 1880. Its first reader took it for astronomy and bird omens, and it sat in storage for about a hundred years, until Finkel noticed the game grid on its back in the early 1980s. Part of that grid was used for telling fortunes."],
        ["Bored guards played it too.", "A twenty-squares board is scratched between the hooves of a winged bull that guarded a gate of Sargon II's citadel at Khorsabad, around 700 BC. The sculpture is in the British Museum."],
        ["A pharaoh packed it for eternity.", "Tutankhamun was buried with at least five game boxes: senet on one side, the game of twenty squares on the other."]
    ]
};

const HOME = 15, PIECES = 7;
const ROSETTES = new Set([4, 8, 14]);
const shared = pos => pos >= 5 && pos <= 12;

function roll() {
    const dice = [0, 0, 0, 0].map(() => Math.random() < 0.5 ? 1 : 0);
    return { dice, r: dice[0] + dice[1] + dice[2] + dice[3] };
}

export function start(first) {
    return { p: [Array(PIECES).fill(0), Array(PIECES).fill(0)], t: first, w: null, ...roll() };
}

export const turn = s => s.t;
export const result = s => s.w;

export function moves(s) {
    const mine = s.p[s.t], theirs = s.p[1 - s.t], out = [];
    if (s.r > 0) {
        for (const from of new Set(mine)) {
            const to = from + s.r;
            if (from === HOME || to > HOME) continue;
            if (to < HOME && mine.includes(to)) continue;
            if (to === 8 && theirs.includes(8)) continue; // the central rosette is a safe square
            out.push(from + '>' + to);
        }
    }
    return out.length ? out : ['-'];
}

export function play(s, m) {
    const p = [s.p[0].slice(), s.p[1].slice()];
    let next = 1 - s.t, w = null;
    if (m !== '-') {
        const [from, to] = m.split('>').map(Number);
        p[s.t][p[s.t].indexOf(from)] = to;
        if (shared(to)) {
            const hit = p[1 - s.t].indexOf(to);
            if (hit >= 0) p[1 - s.t][hit] = 0;
        }
        if (ROSETTES.has(to)) next = s.t;
        if (p[s.t].every(x => x === HOME)) w = s.t;
    }
    return { p, t: next, w, ...roll() };
}

// ===== VIEW =====
// The board stands upright for a phone: three columns (mAIa's lane, the shared lane, yours) by
// eight rows. The gap in the outer lanes holds each side's waiting pieces and the pieces home.

// Where a route position sits in the grid, for player `who`: [row, column].
function cell(pos, who) {
    const col = pos >= 5 && pos <= 12 ? 1 : who === 0 ? 2 : 0;
    if (pos === 0) return [3, col];
    if (pos === HOME) return [2, col];
    if (pos <= 4) return [3 + pos, col];
    if (pos <= 12) return [12 - pos, col];
    return [pos === 13 ? 0 : 1, col];
}
const cellKey = (pos, who) => cell(pos, who).join(',');

const dieSvg = up => `<svg class="ur-die${up ? ' up' : ''}" viewBox="0 0 24 22" aria-hidden="true"><path d="M12 2 L22 20 H2 Z"/><circle cx="12" cy="13" r="2.6"/></svg>`;

// view(root, state, ui): draws the position. ui = { guides, canPlay, last, onMove(move) }.
// Selection lives here: tap a piece, then its destination.
let selected = null;

export function view(root, s, ui) {
    const legal = ui.canPlay ? moves(s).filter(m => m !== '-') : [];
    if (selected !== null && !legal.some(m => m.startsWith(selected + '>'))) selected = null;
    const targets = new Map(legal.filter(m => m.startsWith(selected + '>')).map(m => [cellKey(+m.split('>')[1], 0), m]));
    const movable = new Set(legal.map(m => cellKey(+m.split('>')[0], 0)));

    // Who stands where.
    const at = new Map();
    for (const who of [0, 1]) {
        for (const pos of s.p[who]) {
            const k = cellKey(pos, who), e = at.get(k);
            at.set(k, e ? { who, n: e.n + 1, pos } : { who, n: 1, pos });
        }
    }
    const lastCells = new Set((ui.last ?? []).map(([pos, who]) => cellKey(pos, who)));
    // A turn of several moves (extra throws) is numbered step by step.
    const steps = ui.last?.length > 2 ? new Map(ui.last.map(([pos, who], i) => [cellKey(pos, who), i + 1])) : null;

    const board = document.createElement('div');
    board.className = 'ur-board';
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 3; col++) {
            const k = row + ',' + col, b = document.createElement('button');
            const tray = (row === 2 || row === 3) && col !== 1;
            b.type = 'button';
            b.className = tray ? 'ur-tray ' + (row === 3 ? 'start' : 'home') : 'ur-sq';
            if (!tray && ((row === 7 || row === 1) && col !== 1 || row === 4 && col === 1)) b.classList.add('rosette');
            if (lastCells.has(k)) b.classList.add('last');
            const here = at.get(k);
            if (here && !(tray && here.who !== (col === 2 ? 0 : 1))) {
                b.innerHTML = `<span class="ur-piece p${here.who}"><i></i><i></i><i></i><i></i><i></i></span>` + (here.n > 1 ? `<b class="count">${here.n}</b>` : '');
            }
            if (tray && !here) b.classList.add('empty');
            if (steps?.has(k)) b.insertAdjacentHTML('beforeend', `<em class="step">${steps.get(k)}</em>`);
            if (ui.guides && movable.has(k) && selected === null) b.classList.add('can');
            if (selected !== null && cellKey(selected, 0) === k) b.classList.add('sel');
            if (ui.guides && targets.has(k)) b.classList.add('target');
            b.addEventListener('click', () => tap(k));
            board.append(b);
        }
    }

    function tap(k) {
        if (targets.has(k)) { const m = targets.get(k); selected = null; ui.onMove(m); return; }
        const here = at.get(k);
        selected = here && here.who === 0 && movable.has(k) && selected !== here.pos ? here.pos : null;
        view(root, s, ui);
    }

    const dice = document.createElement('div');
    dice.className = 'ur-dice' + (s.t === 1 ? ' theirs' : '');
    dice.innerHTML = s.dice.map(dieSvg).join('') + `<span>${s.r}</span>`;
    root.replaceChildren(dice, board);
}

// The cells a move touched, for the "last move" marks: [[pos, who], ...].
export function trace(s, m) {
    if (m === '-') return [];
    const [from, to] = m.split('>').map(Number);
    return [[from, s.t], [to, s.t]];
}

const who = s => s.t === 0 ? 'You' : 'mAIa';
const verb = (s, v) => s.t === 0 ? v : /(o|s|sh|ch|x)$/.test(v) ? v + 'es' : v + 's';
// What just happened, in a few words.
export function note(s, m, n) {
    if (m === '-') return s.r === 0 ? `${who(s)} rolled a zero` : `${who(s)} can't move`;
    const to = +m.split('>')[1], out = [];
    const waiting = p => p.filter(x => x === 0).length;
    if (waiting(n.p[1 - s.t]) > waiting(s.p[1 - s.t])) out.push('Knocked back to the start!');
    if (to === HOME) out.push('One more piece home');
    if (n.w === null && n.t === s.t) out.push(`${who(s)} ${verb(s, 'go')} again`);
    return out.join(' · ') || null;
}
