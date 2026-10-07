// Fanorona, from Madagascar. 5 rows × 9 points, joined by lines; only "strong" points (row + col even)
// have diagonals. A point holds 0, or owner + 1. Index = row * 9 + col; you start at the bottom.
// Moves: "from>to" (a plain step), "from>toA" (capture by approach) or "from>toW" (by withdrawal),
// and "-" to stop a capture chain. A chain keeps the turn with the same player (s.chain).

export const meta = {
    name: 'Fanorona',
    goal: "Capture all of mAIa's pieces.",
    levels: [60, 400, 2000],
    origins: [
        'Fanorona is the national board game of Madagascar. Nobody knows exactly how old it is: it most likely grew out of alquerque, an older game known around the Mediterranean and the Arab world, played on a board half this size.',
        'A Malagasy legend tells of King Ralambo, who promised his throne to whichever son reached him first. One son could not leave a difficult game of Fanorona, and lost a kingdom. Another says that when the French invaded in 1895, Queen Ranavalona III trusted a ritual game more than her army. Both are told; neither is proven.',
        'It opens with a massacre and ends in a chase. In 2007, researchers at Maastricht University proved that with perfect play it is a draw. Nobody plays perfectly in the WC.'
    ]
};

const R = 5, C = 9, SIZE = R * C;

function dirs(i) {
    const r = (i / C) | 0, c = i % C, out = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    if ((r + c) % 2 === 0) out.push([-1, -1], [-1, 1], [1, -1], [1, 1]);
    return out;
}
const step = (i, [dr, dc], k = 1) => {
    const y = ((i / C) | 0) + dr * k, x = i % C + dc * k;
    return y < 0 || y >= R || x < 0 || x >= C ? -1 : y * C + x;
};
const dirKey = d => d.join(',');

export function start(first) {
    const b = Array(SIZE).fill(0);
    for (let i = 0; i < 18; i++) b[i] = 2;            // mAIa: the top two rows
    for (let i = 27; i < SIZE; i++) b[i] = 1;         // you: the bottom two rows
    [2, 1, 2, 1, 0, 2, 1, 2, 1].forEach((v, c) => b[18 + c] = v); // the middle row alternates, centre empty
    return { b, t: first, w: null, chain: null };
}

export const turn = s => s.t;
export const result = s => s.w;

// All moves of the piece at `i` for player `who`, with the chain restrictions if any.
function pieceMoves(b, i, who, chain, out) {
    const foe = 2 - who;
    for (const d of dirs(i)) {
        const to = step(i, d);
        if (to < 0 || b[to]) continue;
        if (chain && (chain.visited.includes(to) || dirKey(d) === chain.dir)) continue;
        const ahead = step(to, d), behind = step(i, d, -1);
        let captured = false;
        if (ahead >= 0 && b[ahead] === foe) { out.push(i + '>' + to + 'A'); captured = true; }
        if (behind >= 0 && b[behind] === foe) { out.push(i + '>' + to + 'W'); captured = true; }
        if (!captured && !chain) out.push(i + '>' + to);
    }
}

function legal(s) {
    if (s.chain) {
        const out = [];
        pieceMoves(s.b, s.chain.at, s.t, s.chain, out);
        return out.filter(m => /[AW]$/.test(m));
    }
    const all = [];
    for (let i = 0; i < SIZE; i++) if (s.b[i] === s.t + 1) pieceMoves(s.b, i, s.t, null, all);
    const captures = all.filter(m => /[AW]$/.test(m));
    return captures.length ? captures : all; // capturing is compulsory
}

export function moves(s) {
    const out = legal(s);
    if (s.chain) out.push('-');
    return out.length ? out : ['-'];
}

const parse = m => {
    const [from, rest] = m.split('>');
    return { from: +from, to: parseInt(rest), how: rest.replace(/\d/g, '') };
};

// The squares a capture removes: the unbroken line of enemy pieces in front of (A) or behind (W) the move.
function victims(b, from, to, how, foe) {
    const r0 = (from / C) | 0, d = [((to / C) | 0) - r0, to % C - from % C];
    const out = [];
    for (let p = how === 'A' ? step(to, d) : step(from, d, -1); p >= 0 && b[p] === foe;
        p = how === 'A' ? step(p, d) : step(p, d, -1)) out.push(p);
    return { out, d };
}

export function play(s, m) {
    const b = s.b.slice(), me = s.t, foe = 2 - me;
    let chain = null;
    if (m !== '-') {
        const { from, to, how } = parse(m);
        b[to] = b[from];
        b[from] = 0;
        if (how) {
            const { out, d } = victims(s.b, from, to, how, foe);
            for (const p of out) b[p] = 0;
            // The same piece may keep capturing, never in the same direction twice running or onto a point it visited.
            const c = { at: to, dir: dirKey(d), visited: [...(s.chain?.visited ?? [from]), to] };
            const more = [];
            pieceMoves(b, to, me, c, more);
            if (more.some(x => /[AW]$/.test(x))) chain = c;
        }
    }
    const next = { b, t: chain ? me : 1 - me, w: null, chain };
    if (!b.includes(foe)) next.w = me;
    else if (!b.includes(me + 1)) next.w = foe - 1;
    return next;
}

// ===== VIEW =====
let selected = null, choosing = null; // choosing: { to, options: Map(first victim -> move) }

export function view(root, s, ui) {
    const ms = ui.canPlay ? legal(s) : [];
    if (s.chain && ui.canPlay) selected = s.chain.at;
    if (selected !== null && !ms.some(m => m.startsWith(selected + '>'))) { selected = null; choosing = null; }
    const mineMoves = selected === null ? [] : ms.filter(m => m.startsWith(selected + '>'));
    const targets = new Map();
    for (const m of mineMoves) {
        const t = parse(m).to;
        targets.set(t, [...(targets.get(t) ?? []), m]);
    }
    const movable = new Set(ms.map(m => parse(m).from));
    const last = new Set(ui.last ?? []);

    const board = document.createElement('div');
    board.className = 'fn-board';
    board.innerHTML = lines();
    for (let i = 0; i < SIZE; i++) {
        const b = document.createElement('button'), v = s.b[i];
        b.type = 'button';
        const pick = choosing?.options.has(i);
        b.className = 'fn-pt' + (last.has(i) ? ' last' : '') + (selected === i ? ' sel' : '') +
            (ui.guides && !choosing && targets.has(i) ? ' target' : '') + (pick ? ' pick' : '') +
            (ui.guides && selected === null && movable.has(i) ? ' can' : '');
        if (v) b.innerHTML = `<span class="fn-piece p${v - 1}"></span>`;
        b.addEventListener('click', () => tap(i));
        board.append(b);
    }

    function tap(i) {
        if (choosing) {
            const m = choosing.options.get(i);
            choosing = null;
            if (m) { selected = null; ui.onMove(m); return; }
        } else if (targets.has(i)) {
            const options = targets.get(i);
            if (options.length === 1) { selected = null; ui.onMove(options[0]); return; }
            // One step that could capture forwards or backwards: tap the line you want gone.
            const foe = 2 - s.t;
            choosing = { to: i, options: new Map(options.map(m => [victims(s.b, selected, i, parse(m).how, foe).out[0], m])) };
        } else if (!s.chain) {
            selected = movable.has(i) && selected !== i ? i : null;
        }
        view(root, s, ui);
    }

    const parts = [board];
    if (s.chain && ui.canPlay) {
        const stop = document.createElement('button');
        stop.type = 'button';
        stop.className = 'fn-stop';
        stop.textContent = 'Stop here';
        stop.addEventListener('click', () => { selected = null; choosing = null; ui.onMove('-'); });
        parts.push(stop);
    }
    root.replaceChildren(...parts);
}

let linesSvg = null;
function lines() {
    if (linesSvg) return linesSvg;
    let d = '';
    for (let r = 0; r < R; r++) d += `M0 ${r}H${C - 1}`;
    for (let c = 0; c < C; c++) d += `M${c} 0V${R - 1}`;
    for (let r = 0; r < R - 1; r++) {
        for (let c = 0; c < C - 1; c++) {
            if ((r + c) % 2 === 0) d += `M${c} ${r}L${c + 1} ${r + 1}`;
            else d += `M${c + 1} ${r}L${c} ${r + 1}`;
        }
    }
    return linesSvg = `<svg class="fn-lines" viewBox="-0.5 -0.5 ${C} ${R}" preserveAspectRatio="none" aria-hidden="true"><path d="${d}"/></svg>`;
}

export function trace(s, m) {
    if (m === '-') return [];
    const { from, to } = parse(m);
    return [from, to];
}
