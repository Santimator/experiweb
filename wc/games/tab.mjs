// Tâb, as E. W. Lane saw it played in Egypt in the 1820s. A 4×9 board: your home row is the bottom one,
// mAIa's the top one. A cell is null or { o: owner, p: [piece codes] }, code bit 1 = active, bit 2 = has been
// in the enemy's home row. Moves: "from>to" (the whole stack), "from.to" (one piece off a stack, on a tâb)
// and "-" (you never have to use a throw).

export const meta = {
    name: 'Tâb',
    goal: "Capture every one of mAIa's pieces.",
    levels: [40, 300, 1200],
    origins: [
        "Tâb belongs to a family of 'running-fight' games played from West Africa to India. These are the rules Edward William Lane wrote down in Cairo in the 1820s, in Manners and Customs of the Modern Egyptians (1836), a book that has never been out of print.",
        "Lane's players threw four flat sticks cut from palm branches, white on one side, against a wall or a stick pushed into the ground. A single white side up is the tâb that gives the game its name. The pieces were called kiláb: dogs.",
        "Nothing happens until someone throws a tâb, and then everything does. Everybody runs the same way round the middle rows, and nobody is safe there. Board 4×9; Lane's rule that shrinks big stacks is left out."
    ],
    trivia: [
        ["A new old board.", "In 2026, a board of this family was identified scratched into the floor of a medieval bathhouse in Morocco, possibly from the 8th–11th centuries: perhaps the oldest evidence of the game in North Africa."],
        ["Hard to date.", "Boards for ṭāb are carved all over Petra, in Jordan, but a survey of them found little that dates when the game began."],
        ["Relatives.", "Somalia plays a version called deleb; India has a cousin called tablan."]
    ]
};

const R = 4, C = 9, SIZE = R * C;
const ACTIVE = 1, ENTERED = 2;

// Four sticks, white side counted. No whites scores 6. Throws of 1 (a tâb), 4 and 6 throw again.
function throwSticks() {
    const sticks = [0, 0, 0, 0].map(() => Math.random() < 0.5 ? 1 : 0);
    const white = sticks[0] + sticks[1] + sticks[2] + sticks[3];
    return { sticks, r: white || 6, again: white === 0 || white === 1 || white === 4 };
}

export function start(first) {
    const b = Array(SIZE).fill(null);
    for (let c = 0; c < C; c++) { b[c] = { o: 1, p: [0] }; b[27 + c] = { o: 0, p: [0] }; }
    return { b, t: first, w: null, ...throwSticks() };
}

export const turn = s => s.t;
export const result = s => s.w;

// Paths are worked out as if you were player 0; player 1 sees the board turned around.
const frame = (who, i) => who === 0 ? i : SIZE - 1 - i;

// Where a piece goes after one step, in player-0 terms: home row left to right, row 2 right to left,
// row 1 left to right, then (once per piece) into the enemy row right to left, or round row 2 again.
function nextSteps(i, mayEnter) {
    const r = (i / C) | 0, c = i % C;
    if (r === 3) return [c < C - 1 ? i + 1 : 2 * C + C - 1];
    if (r === 2) return [c > 0 ? i - 1 : C];
    if (r === 0) return [c > 0 ? i - 1 : C];
    if (c < C - 1) return [i + 1];
    return mayEnter ? [C - 1, 2 * C + C - 1] : [2 * C + C - 1];
}

function walk(i, n, mayEnter) {
    if (n === 0) return [i];
    return nextSteps(i, mayEnter).flatMap(j => walk(j, n - 1, mayEnter && j >= C));
}

function legal(s) {
    const me = s.t, out = [];
    const homeLeft = s.b.some((cell, i) => cell && cell.o === me && frame(me, i) >= 27);
    for (let i = 0; i < SIZE; i++) {
        const cell = s.b[i];
        if (!cell || cell.o !== me) continue;
        const f = frame(me, i);
        if (f < C && homeLeft) continue; // stuck in the enemy row while you still have pieces at home
        const inactive = !(cell.p[0] & ACTIVE);
        if (inactive && s.r !== 1) continue; // a piece wakes up only with a tâb
        const tries = [{ sep: '>', mayEnter: cell.p.every(p => !(p & ENTERED)) }];
        if (cell.p.length > 1 && s.r === 1) tries.push({ sep: '.', mayEnter: cell.p.some(p => !(p & ENTERED)) });
        for (const { sep, mayEnter } of tries) {
            for (const g of new Set(walk(f, s.r, mayEnter))) {
                const to = frame(me, g), there = s.b[to];
                if (there && there.o === me && !(there.p[0] & ACTIVE)) continue;
                out.push(i + sep + to);
            }
        }
    }
    return out;
}

export function moves(s) {
    return [...legal(s), '-'];
}

export function play(s, m) {
    const b = s.b.map(cell => cell && { o: cell.o, p: cell.p.slice() }), me = s.t;
    if (m !== '-') {
        const split = m.includes('.'), [from, to] = m.split(/[>.]/).map(Number);
        let moving;
        if (split) {
            // One piece leaves the stack: one that may still enter the enemy row, if any.
            const k = b[from].p.findIndex(p => !(p & ENTERED));
            moving = b[from].p.splice(k < 0 ? 0 : k, 1);
        } else {
            moving = b[from].p;
            b[from].p = [];
        }
        if (!b[from].p.length) b[from] = null;
        const enters = frame(me, to) < C && frame(me, from) >= C;
        moving = moving.map(p => p | ACTIVE | (enters ? ENTERED : 0));
        const there = b[to];
        b[to] = there && there.o === me ? { o: me, p: [...there.p, ...moving] } : { o: me, p: moving }; // enemies there are captured
    }
    const left = who => b.some(cell => cell && cell.o === who);
    const next = { b, t: s.again ? me : 1 - me, w: null, ...throwSticks() };
    if (!left(1 - me)) next.w = me;
    return next;
}

// ===== VIEW =====
let selected = null, single = false; // single: move one piece off the selected stack

const stick = white => `<span class="tb-stick${white ? ' white' : ''}"></span>`;

export function view(root, s, ui) {
    const ms = ui.canPlay ? legal(s) : [];
    if (selected !== null && !ms.some(m => parseInt(m) === selected)) selected = null;
    const sep = single ? '.' : '>';
    const targets = new Map(ms.filter(m => parseInt(m) === selected && m.includes(sep)).map(m => [+m.split(/[>.]/)[1], m]));
    const canSplit = ms.some(m => parseInt(m) === selected && m.includes('.'));
    const movable = new Set(ms.map(m => parseInt(m)));
    const last = new Set(ui.last ?? []);
    const steps = ui.last?.length > 2 ? new Map(ui.last.map((p, i) => [p, i + 1])) : null;

    const board = document.createElement('div');
    board.className = 'tb-board';
    for (let i = 0; i < SIZE; i++) {
        const b = document.createElement('button'), cell = s.b[i];
        b.type = 'button';
        b.className = 'tb-sq' + (last.has(i) ? ' last' : '') + (selected === i ? ' sel' + (single ? ' single' : '') : '') +
            (ui.guides && targets.has(i) ? ' target' : '') + (ui.guides && selected === null && movable.has(i) ? ' can' : '');
        if (cell) {
            const asleep = !(cell.p[0] & ACTIVE), been = cell.p.some(p => p & ENTERED);
            b.innerHTML = `<span class="tb-piece p${cell.o}${asleep ? ' asleep' : ''}${been ? ' been' : ''}"></span>` +
                (cell.p.length > 1 ? `<b class="count">${cell.p.length}</b>` : '');
        }
        if (steps?.has(i)) b.insertAdjacentHTML('beforeend', `<em class="step">${steps.get(i)}</em>`);
        b.addEventListener('click', () => {
            if (targets.has(i)) { const m = targets.get(i); selected = null; single = false; ui.onMove(m); return; }
            // Tapping a selected stack again picks up just one piece (on a tâb); once more lets go.
            if (selected === i && canSplit && !single) single = true;
            else { selected = movable.has(i) && selected !== i ? i : null; single = false; }
            view(root, s, ui);
        });
        board.append(b);
    }

    const bar = document.createElement('div');
    bar.className = 'tb-bar' + (s.t === 1 ? ' theirs' : '');
    bar.innerHTML = `<span class="tb-sticks">${s.sticks.map(stick).join('')}</span><span class="tb-roll">${s.r}${s.again ? '<small>+</small>' : ''}</span>`;
    if (ui.canPlay) {
        const skip = document.createElement('button');
        skip.type = 'button';
        skip.className = 'tb-skip';
        skip.textContent = 'Skip';
        skip.addEventListener('click', () => { selected = null; single = false; ui.onMove('-'); });
        bar.append(skip);
    }
    root.replaceChildren(bar, board);
}

export function trace(s, m) {
    return m === '-' ? [] : m.split(/[>.]/).map(Number);
}

const who = s => s.t === 0 ? 'You' : 'mAIa';
const verb = (s, v) => s.t === 0 ? v : /(o|s|sh|ch|x)$/.test(v) ? v + 'es' : v + 's';
export function note(s, m, n) {
    const out = [];
    if (m === '-') out.push(legal(s).length ? `${who(s)} ${verb(s, 'let')} the ${s.r} go` : `Nothing to do with a ${s.r}`);
    else {
        const [from, to] = m.split(/[>.]/).map(Number);
        if (!(s.b[from].p[0] & ACTIVE)) out.push('A piece wakes up');
        if (s.b[to] && s.b[to].o !== s.t) out.push(`${s.b[to].p.length} captured`);
        if (frame(s.t, to) < C && frame(s.t, from) >= C) out.push('Into the enemy row');
    }
    if (n.w === null && n.t === s.t) out.push(`${who(s)} ${verb(s, 'throw')} again`);
    return out.join(' · ') || null;
}
