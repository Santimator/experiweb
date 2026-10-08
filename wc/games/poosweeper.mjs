// Poosweeper: Minesweeper, except mAIa hid poo instead of mines. Solo: mAIa's level is how much poo.
// Cells: s.poo (placed on the first dig, never under it), s.cell = 0 closed, 1 open, 2 flagged.
// Moves: "d<i>" to dig (on an open number with enough flags, it digs the closed cells around it), "f<i>" to flag.

export const meta = {
    name: 'Poosweeper',
    solo: true,
    goal: 'Uncover every clean square. Don\'t step in it.',
    lost: 'Splat. mAIa wins',
    levels: [{ cols: 8, rows: 9, poo: 9 }, { cols: 8, rows: 11, poo: 15 }, { cols: 9, rows: 12, poo: 22 }],
    foe: [
        ['mAIa only had a light lunch.', 'Not much poo today. mAIa is on a diet.', 'mAIa barely went. A few here and there.'],
        ['mAIa had a normal day. Watch your step.', 'mAIa ate well. Tread carefully.', 'A healthy amount of poo. mAIa is proud.'],
        ['mAIa had the chili.', 'mAIa went to an all-you-can-eat buffet.', 'mAIa has been holding it all week.']
    ],
    origins: [
        'This is Minesweeper with a change of menu. Hidden-mine games existed on early-1980s home computers (Mined-Out, 1983), but the version everyone knows was written by Robert Donner and Curt Johnson for Microsoft, sold in 1990 and bundled with Windows 3.1 in 1992. For a generation of office workers, it was the thing to do while pretending to work.',
        'Mines were never everyone\'s idea of fun: in 2001, an "International Campaign to Ban Winmine" asked for flowers instead, and Windows Vista later offered exactly that. Here, mAIa offers something else.',
        'Most of the time it is pure logic. Sometimes the numbers run out and you must guess, and you can often work out exactly how bad your odds are. In 2000, mathematician Richard Kaye proved that even telling whether a board makes sense is NP-complete, which is maths for very hard in general. In the WC, it is just hard.'
    ],
    // [lead, text] pairs, shown under the origins once the match ends.
    trivia: [
        ["Office training in disguise.", "It is widely said that Microsoft bundled Solitaire to teach drag-and-drop and Minesweeper to teach right-clicking, back when the mouse was new to most office workers. It makes a good story, but no one has produced a memo."],
        ["xyzzy.", "Until Windows XP, typing xyzzy and then Shift+Enter turned a single pixel in the top-left corner of the screen black whenever the pointer was over a mine."],
        ["Who did it first?", "Ian Andrew, who made Mined-Out in 1983, says Microsoft copied his game. Curt Johnson says the idea came from somewhere else, and not from Mined-Out."],
        ["From free to subscription.", "Windows 8 dropped the game in 2012. Its replacement in the Microsoft Store came with 30-second video ads, and later with a subscription to remove them."]
    ]
};

export function start(first, level = 0) {
    const { cols, rows, poo } = meta.levels[level];
    return { cols, rows, n: poo, poo: null, cell: Array(cols * rows).fill(0), t: 0, w: null, boom: -1 };
}

export const turn = () => 0;
export const result = s => s.w;
export const moves = () => [];

function around(s, i) {
    const r = (i / s.cols) | 0, c = i % s.cols, out = [];
    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            const y = r + dr, x = c + dc;
            if ((dr || dc) && y >= 0 && y < s.rows && x >= 0 && x < s.cols) out.push(y * s.cols + x);
        }
    }
    return out;
}
const count = (s, i) => around(s, i).filter(j => s.poo[j]).length;

export function play(s, m) {
    const i = +m.slice(1), next = { ...s, cell: s.cell.slice() };
    if (m[0] === 'f') {
        if (next.cell[i] !== 1) next.cell[i] = next.cell[i] === 2 ? 0 : 2;
        return next;
    }
    if (!next.poo) {
        // The first dig is always safe, and so are its neighbours: you start with an opening.
        const safe = new Set([i, ...around(s, i)]), spots = [];
        for (let j = 0; j < s.cell.length; j++) if (!safe.has(j)) spots.push(j);
        next.poo = Array(s.cell.length).fill(false);
        for (let k = 0; k < s.n; k++) next.poo[spots.splice(Math.random() * spots.length | 0, 1)[0]] = true;
    }
    let dig = [i];
    if (next.cell[i] === 1) {
        const near = around(next, i);
        if (near.filter(j => next.cell[j] === 2).length !== count(next, i)) return s;
        dig = near.filter(j => next.cell[j] === 0);
    } else if (next.cell[i] === 2) return s;
    for (const j of dig) {
        if (next.poo[j]) { next.boom = j; next.w = 1; return next; }
        // Open the cell, and keep going while there are no poos around.
        const stack = [j];
        while (stack.length) {
            const k = stack.pop();
            if (next.cell[k] === 1) continue;
            next.cell[k] = 1;
            if (count(next, k) === 0) for (const x of around(next, k)) if (next.cell[x] === 0) stack.push(x);
        }
    }
    if (next.cell.every((v, k) => v === 1 || next.poo[k])) next.w = 0;
    return next;
}

// ===== VIEW =====
let flagging = false;
const HOLD_MS = 420; // a long press flags too

export function view(root, s, ui) {
    const board = document.createElement('div');
    board.className = 'ps-board';
    board.style.setProperty('--cols', s.cols);
    board.style.setProperty('--rows', s.rows);
    const done = s.w !== null;
    for (let i = 0; i < s.cell.length; i++) {
        const b = document.createElement('button'), v = s.cell[i];
        b.type = 'button';
        const showPoo = done && s.poo?.[i];
        b.className = 'ps-cell' + (v === 1 ? ' open' : '') + (i === s.boom ? ' boom' : '');
        if (showPoo && v !== 2) b.textContent = '💩';
        else if (v === 2) b.textContent = done && !s.poo?.[i] ? '❌' : '🚩';
        else if (v === 1) {
            const n = count(s, i);
            if (n) { b.textContent = n; b.dataset.n = n; }
        }
        let timer = 0, held = false;
        b.addEventListener('pointerdown', () => {
            held = false;
            timer = setTimeout(() => { held = true; if (ui.canPlay) ui.onMove('f' + i); }, HOLD_MS);
        });
        for (const e of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(e, () => clearTimeout(timer));
        b.addEventListener('contextmenu', e => e.preventDefault());
        b.addEventListener('click', () => {
            if (held || !ui.canPlay) return;
            ui.onMove((flagging && v !== 1 ? 'f' : 'd') + i);
        });
        board.append(b);
    }

    const flags = s.cell.filter(v => v === 2).length;
    const mode = document.createElement('button');
    mode.type = 'button';
    mode.className = 'ps-mode' + (flagging ? ' on' : '');
    mode.innerHTML = `<span>${flagging ? '🚩' : '👆'}</span> ${flagging ? 'Flagging' : 'Digging'} <small>${flags} / ${s.n} 💩</small>`;
    mode.addEventListener('click', () => { flagging = !flagging; view(root, s, ui); });
    root.replaceChildren(board, ...(done ? [] : [mode]));
}

export function trace(s, m) {
    return [];
}
