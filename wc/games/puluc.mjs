// Puluc (Bul), the Maya race-and-capture game, two-player version after Sapper and Bell.
// A track of 9 spaces between the two homes. Index 0 is next to your home, 8 next to mAIa's.
// A space holds null or a stack: owners from the top down; the top piece owns it, the rest are prisoners
// (or freed friends) riding along. Moves: "h>to" (enter from home), "from>to", "from>off" (reach the end),
// or "-" when nothing can move.

export const meta = {
    name: 'Puluc',
    goal: "Leave mAIa with nothing to move.",
    levels: [40, 400, 3000],
    origins: [
        "Puluc, or bul, is played by the Q'eqchi' (Kekchi) and Mopan Maya of Guatemala and Belize. Nobody knows whether it goes back to the ancient Maya or grew up after the Spanish conquest: no ancient board has been found.",
        "In 1993–94, the linguist Lieve Verbeeck watched Mopan and Q'eqchi' farmers in Santa Cruz, Belize, play it in teams as part of the vigil of the maize, the night before sowing.",
        "It is a war in a single line. Warriors run at each other, take prisoners and carry them home, and a lost fight hands the whole pile to the other side. This is the two-player version after the accounts of Karl Sapper and R. C. Bell, on a track of 9."
    ],
    trivia: [
        ["Corn for dice.", "The four dice are corn kernels, blackened on one side. A throw with no marks at all is the best: it counts five."],
        ["Many names.", "Puluc, bul, buul and boolik are all the same game, and every community plays it a little differently."]
    ]
};

const LEN = 9, PIECES = 5;

function roll() {
    const kernels = [0, 0, 0, 0].map(() => Math.random() < 0.5 ? 1 : 0);
    const marked = kernels[0] + kernels[1] + kernels[2] + kernels[3];
    return { kernels, r: marked || 5 }; // no marks counts as five
}

export function start(first) {
    return { track: Array(LEN).fill(null), home: [PIECES, PIECES], dead: [0, 0], t: first, w: null, ...roll() };
}

export const turn = s => s.t;
export const result = s => s.w;

// Player who's own steps: 1..9 along the track, 10+ is the far end.
const index = (who, step) => who === 0 ? step - 1 : LEN - step;
const stepOf = (who, i) => who === 0 ? i + 1 : LEN - i;

function legal(s) {
    const me = s.t, out = [];
    const target = from => {
        const step = (from === 'h' ? 0 : stepOf(me, from)) + s.r;
        if (step > LEN) return from + '>off';
        const to = index(me, step), there = s.track[to];
        return there && there[0] === me ? null : from + '>' + to; // never onto your own stack
    };
    if (s.home[me]) out.push(target('h'));
    s.track.forEach((st, i) => { if (st && st[0] === me) out.push(target(i)); });
    return out.filter(Boolean);
}

export function moves(s) {
    const out = legal(s);
    return out.length ? out : ['-'];
}

const alive = (s, who) => s.home[who] > 0 || s.track.some(st => st && st[0] === who);

export function play(s, m) {
    const track = s.track.map(st => st && st.slice()), home = s.home.slice(), dead = s.dead.slice(), me = s.t;
    let w = null;
    if (m !== '-') {
        const [from, to] = m.split('>');
        let stack;
        if (from === 'h') { stack = [me]; home[me]--; }
        else { stack = track[+from]; track[+from] = null; }
        if (to === 'off') {
            // Home at last: prisoners die, your own pieces walk back to start again.
            for (const p of stack) { if (p === me) home[me]++; else dead[p]++; }
        } else {
            const there = track[+to];
            track[+to] = there ? [...stack, ...there] : stack;
        }
    }
    const next = { track, home, dead, t: 1 - me, w, ...roll() };
    if (!alive(next, 1 - me)) next.w = me;
    else if (!alive(next, me)) next.w = 1 - me;
    return next;
}

// ===== VIEW =====
let selected = null;

const kernel = up => `<span class="pl-kernel${up ? ' up' : ''}"></span>`;
const stackHtml = st => `<span class="pl-stack">${st.map((p, k) => `<span class="pl-piece p${p}${k ? ' under' : ''}"></span>`).join('')}</span>`;

export function view(root, s, ui) {
    const ms = ui.canPlay ? legal(s) : [];
    const key = x => String(x);
    if (selected !== null && !ms.some(m => m.startsWith(key(selected) + '>'))) selected = null;
    const targets = new Map(ms.filter(m => m.startsWith(key(selected) + '>')).map(m => [m.split('>')[1], m]));
    const movable = new Set(ms.map(m => m.split('>')[0]));
    const last = new Set((ui.last ?? []).map(String));

    const tap = k => {
        if (targets.has(k)) { const m = targets.get(k); selected = null; ui.onMove(m); return; }
        selected = movable.has(k) && key(selected) !== k ? (k === 'h' ? 'h' : +k) : null;
        view(root, s, ui);
    };
    const cell = (k, cls, html) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = cls + (last.has(k) ? ' last' : '') + (key(selected) === k ? ' sel' : '') +
            (ui.guides && targets.has(k) ? ' target' : '') + (ui.guides && selected === null && movable.has(k) ? ' can' : '');
        b.innerHTML = html;
        b.addEventListener('click', () => tap(k));
        return b;
    };
    const homeHtml = who => `<span class="pl-home-pieces">${`<span class="pl-piece p${who}"></span>`.repeat(s.home[who])}</span>` +
        (s.dead[who] ? `<small>${'✝'.repeat(s.dead[who])}</small>` : '');

    const track = document.createElement('div');
    track.className = 'pl-track';
    // mAIa's home sits at the far end of your run: that is where "off" lands for you.
    track.append(cell('off', 'pl-home theirs', homeHtml(1)));
    for (let i = LEN - 1; i >= 0; i--) track.append(cell(String(i), 'pl-sq', s.track[i] ? stackHtml(s.track[i]) : ''));
    track.append(cell('h', 'pl-home mine', homeHtml(0)));

    const dice = document.createElement('div');
    dice.className = 'pl-dice' + (s.t === 1 ? ' theirs' : '');
    dice.innerHTML = s.kernels.map(kernel).join('') + `<span>${s.r}</span>`;
    root.replaceChildren(dice, track);
}

export function trace(s, m) {
    if (m === '-') return [];
    const [from, to] = m.split('>');
    return [from === 'h' ? (s.t === 0 ? 'h' : 'off') : from, to === 'off' ? (s.t === 0 ? 'off' : 'h') : to];
}

const who = s => s.t === 0 ? 'You' : 'mAIa';
const verb = (s, v) => s.t === 0 ? v : /(o|s|sh|ch|x)$/.test(v) ? v + 'es' : v + 's';
export function note(s, m, n) {
    if (m === '-') return `${who(s)} can't move`;
    const [from, to] = m.split('>'), me = s.t;
    const stack = from === 'h' ? [me] : s.track[+from];
    if (to === 'off') {
        const killed = stack.filter(p => p !== me).length;
        return killed ? `Home with ${killed} prisoner${killed > 1 ? 's' : ''}: gone for good` : 'Back home, ready to go again';
    }
    const there = s.track[+to];
    if (!there) return null;
    return there.includes(me) ? 'Prisoners freed!' : 'Prisoner taken!';
}
