// Cuttle, standard rules (pagat.com), two players. Reach 21 points on your side; kings lower that.
// Board: s.pts = point cards [{ c, owner, jacks: [{ c, by }] }] (the last jack's player controls it),
// s.perms[p] = 8s, queens and kings in front of p. Phases: 'main', 'counter' (answer a one-off with a 2),
// 'three' (pick from the scrap), 'seven' (play the card the 7 turned over).
// Moves: draw, pass, pt<c>, sc<c>:<t>, u<c>[:<t>], pm<c>, j<c>:<t>, k<c> (counter), ok, take<c>, scrap7.

import { deck, shuffle, rank, suit, cardHtml, backHtml, pick, label } from '../cards.mjs';

export const meta = {
    name: 'Cuttle',
    goal: 'Get 21 points on your side of the table.',
    levels: [0.45, 0.2, 0],
    origins: [
        "Cuttle is a folk game: no author, no box. Richard Sipie, who put the first rules anyone can find online in 2000, said he learned it in 1975. Pagat.com, the great encyclopaedia of card games, calls it the earliest combat card game it knows.",
        "Every card can be several things: points, a weapon, a trick. If that sounds like Magic: The Gathering, Pagat thinks the resemblance is probably a coincidence.",
        "Everything you build is also a target. These are pagat.com's standard rules, with a hand limit of 8; a 4 takes two cards from your opponent's hand at random."
    ],
    trivia: [
        ["Rules with gaps.", "Sipie admitted that some of his rules were his own guesses where his memory failed. In 2015 John McLeod wrote a fuller version for pagat.com."],
        ["Back online.", "Since 2022, cuttle.cards lets people play it live, and its players keep refining a competitive ruleset."],
        ["Glasses.", "The 8 played sideways is called 'glasses': while it is down, its owner sees the opponent's hand."]
    ]
};

const LIMIT = 8;
const TARGETS = [21, 14, 10, 7, 5];
const val = c => rank(c) === 14 ? 1 : rank(c);
const isPoint = c => rank(c) <= 10 || rank(c) === 14;
const ONE_OFF = new Set([14, 2, 3, 4, 5, 6, 7, 9]);

export function start(first) {
    const d = shuffle(deck());
    const hands = [[], []];
    hands[first] = d.splice(-5); // the player who moves first gets five, the dealer six
    hands[1 - first] = d.splice(-6);
    return { deck: d, scrap: [], hands, pts: [], perms: [[], []], t: first, phase: 'main', pending: null, seven: null, passes: 0, w: null };
}

export const turn = s => s.t;
export const result = s => s.w;

const ctrl = e => e.jacks.length ? e.jacks[e.jacks.length - 1].by : e.owner;
const score = (s, p) => s.pts.filter(e => ctrl(e) === p).reduce((n, e) => n + val(e.c), 0);
const goal = (s, p) => TARGETS[Math.min(4, s.perms[p].filter(c => rank(c) === 13).length)];
const hasQueen = (s, p) => s.perms[p].some(c => rank(c) === 12);
const glasses = (s, p) => s.perms[p].some(c => rank(c) === 8);

// Permanents someone could target with a 2 or a 9: [card, holder]. A queen shields its holder's other cards.
function permTargets(s, me) {
    const out = [];
    for (const p of [0, 1]) for (const c of s.perms[p]) if (p === me || rank(c) === 12 || !hasQueen(s, 1 - me)) out.push(c);
    for (const e of s.pts) for (const j of e.jacks) if (j.by === me || !hasQueen(s, j.by)) out.push(j.c);
    return out;
}

// Every way to play card c from hand (or the card a 7 turned over).
function cardMoves(s, me, c) {
    const out = [], r = rank(c), theirs = s.pts.filter(e => ctrl(e) !== me);
    if (isPoint(c)) {
        out.push('pt' + c);
        for (const e of theirs) if (val(c) > val(e.c) || (val(c) === val(e.c) && suit(c) > suit(e.c))) out.push('sc' + c + ':' + e.c);
    }
    if (ONE_OFF.has(r)) {
        if (r === 2 || r === 9) for (const t of permTargets(s, me)) out.push('u' + c + ':' + t);
        else if (r === 3) { if (s.scrap.length) out.push('u' + c); }
        else if (r === 7) { if (s.deck.length) out.push('u' + c); }
        else if (r === 4) { if (s.hands[1 - me].length) out.push('u' + c); }
        else out.push('u' + c);
    }
    if (r === 8 || r === 12 || r === 13) out.push('pm' + c);
    if (r === 11 && !hasQueen(s, 1 - me)) for (const e of theirs) out.push('j' + c + ':' + e.c);
    return out;
}

function legal(s) {
    const me = s.t;
    if (s.phase === 'counter') return [...s.hands[me].filter(c => rank(c) === 2).map(c => 'k' + c), 'ok'];
    if (s.phase === 'three') return s.scrap.filter(c => c !== s.three).map(c => 'take' + c); // not the 3 itself
    if (s.phase === 'seven') {
        const out = cardMoves(s, me, s.seven);
        return out.length ? out : ['scrap7'];
    }
    const out = [];
    if (s.deck.length) { if (s.hands[me].length < LIMIT) out.push('draw'); }
    else out.push('pass');
    for (const c of s.hands[me]) out.push(...cardMoves(s, me, c));
    return out;
}

export const moves = legal;

function clone(s) {
    return { ...s, deck: s.deck.slice(), scrap: s.scrap.slice(), hands: [s.hands[0].slice(), s.hands[1].slice()],
        pts: s.pts.map(e => ({ ...e, jacks: e.jacks.slice() })), perms: [s.perms[0].slice(), s.perms[1].slice()],
        pending: s.pending && { ...s.pending, counters: s.pending.counters.slice() } };
}

function endTurn(s) {
    const me = s.t;
    for (const p of [me, 1 - me]) if (score(s, p) >= goal(s, p)) { s.w = p; return s; }
    s.phase = 'main';
    s.t = 1 - me;
    return s;
}

function draw(s, p, n) {
    for (let i = 0; i < n && s.deck.length && s.hands[p].length < LIMIT; i++) s.hands[p].push(s.deck.pop());
}

function scrapPerm(s, t, toHand) {
    for (const p of [0, 1]) {
        const k = s.perms[p].indexOf(t);
        if (k >= 0) { s.perms[p].splice(k, 1); (toHand ? s.hands[p] : s.scrap).push(t); return; }
    }
    for (const e of s.pts) {
        const k = e.jacks.findIndex(j => j.c === t);
        if (k >= 0) { const [j] = e.jacks.splice(k, 1); (toHand ? s.hands[j.by] : s.scrap).push(t); return; }
    }
}

function resolve(s, c, by, t) {
    const r = rank(c);
    s.t = by;
    if (r === 14) { for (const e of s.pts) s.scrap.push(e.c, ...e.jacks.map(j => j.c)); s.pts = []; }
    else if (r === 2) scrapPerm(s, t, false);
    else if (r === 9) scrapPerm(s, t, true);
    else if (r === 3) { if (s.scrap.some(x => x !== c)) { s.three = c; s.phase = 'three'; return s; } }
    else if (r === 4) {
        const h = s.hands[1 - by];
        for (let i = 0; i < 2 && h.length; i++) s.scrap.push(h.splice(Math.random() * h.length | 0, 1)[0]);
    }
    else if (r === 5) draw(s, by, 2);
    else if (r === 6) {
        for (const p of [0, 1]) { s.scrap.push(...s.perms[p]); s.perms[p] = []; }
        for (const e of s.pts) { s.scrap.push(...e.jacks.map(j => j.c)); e.jacks = []; }
    }
    else if (r === 7) { s.seven = s.deck.pop(); s.phase = 'seven'; return s; }
    return endTurn(s);
}

export function play(s0, m) {
    const s = clone(s0), me = s.t;
    if (m === 'ok') {
        // The chain settles: an even number of 2s means the one-off goes through.
        const { c, by, t, counters } = s.pending;
        s.scrap.push(...counters);
        s.pending = null;
        if (counters.length % 2) { s.t = by; return endTurn(s); }
        return resolve(s, c, by, t);
    }
    if (m[0] === 'k') {
        const c = +m.slice(1);
        s.hands[me].splice(s.hands[me].indexOf(c), 1);
        s.pending.counters.push(c);
        s.t = 1 - me;
        if (!s.hands[s.t].some(x => rank(x) === 2)) return play(s, 'ok');
        return s;
    }
    if (m.startsWith('take')) {
        const c = +m.slice(4);
        s.scrap.splice(s.scrap.indexOf(c), 1);
        s.hands[me].push(c);
        return endTurn(s);
    }
    if (m === 'scrap7') { s.scrap.push(s.seven); s.seven = null; return endTurn(s); }
    if (m === 'draw') { s.passes = 0; draw(s, me, 1); return endTurn(s); }
    if (m === 'pass') {
        s.passes++;
        if (s.passes >= 3) { s.w = 0.5; return s; }
        return endTurn(s);
    }
    s.passes = 0;
    const [head, target] = m.split(':');
    const kind = head.match(/^[a-z]+/)[0], c = +head.slice(kind.length), t = target === undefined ? undefined : +target;
    // The card comes from the hand, or it is the one the 7 turned over.
    if (s.phase === 'seven') s.seven = null;
    else s.hands[me].splice(s.hands[me].indexOf(c), 1);
    if (kind === 'pt') { s.pts.push({ c, owner: me, jacks: [] }); return endTurn(s); }
    if (kind === 'sc') {
        const k = s.pts.findIndex(e => e.c === t), [e] = s.pts.splice(k, 1);
        s.scrap.push(c, e.c, ...e.jacks.map(j => j.c));
        return endTurn(s);
    }
    if (kind === 'pm') { s.perms[me].push(c); return endTurn(s); }
    if (kind === 'j') { s.pts.find(e => e.c === t).jacks.push({ c, by: me }); return endTurn(s); }
    // A one-off goes to the scrap and waits for an answer, if the other side holds a 2.
    s.scrap.push(c);
    s.pending = { c, by: me, t, counters: [] };
    if (s.hands[1 - me].some(x => rank(x) === 2)) { s.phase = 'counter'; s.t = 1 - me; return s; }
    return play(s, 'ok');
}

// ===== mAIa =====
// mAIa sees its hand, the table and the scrap, and your hand only while it has an 8 down.
export function ai(s, level) {
    const ms = legal(s);
    if (Math.random() < meta.levels[level]) return pick(ms);
    const me = s.t, you = 1 - me, mine = score(s, me), yours = score(s, you), need = goal(s, me), danger = goal(s, you) - yours;
    const permOf = c => [0, 1].find(p => s.perms[p].includes(c)) ?? s.pts.flatMap(e => e.jacks).find(j => j.c === c)?.by;
    const rate = m => {
        if (m === 'ok') {
            const { c, t } = s.pending, r = rank(c);
            const hurts = (r === 14 && mine > yours) || (r === 6 && s.perms[me].length > s.perms[you].length) || r === 4 ||
                ((r === 2 || r === 9) && permOf(t) === me);
            return hurts ? -1 : 1;
        }
        if (m[0] === 'k') return 0;
        if (m.startsWith('take')) { const c = +m.slice(4); return rank(c) === 13 ? 50 : rank(c) === 11 ? 30 : val(c); }
        if (m === 'draw') return s.hands[me].length < 5 ? 8 : 2;
        if (m === 'pass' || m === 'scrap7') return 0;
        const [head, target] = m.split(':'), kind = head.match(/^[a-z]+/)[0], c = +head.slice(kind.length), t = +target, r = rank(c);
        if (kind === 'pt') return mine + val(c) >= need ? 1000 : 10 + val(c);
        if (kind === 'sc') return val(t) * 3 - val(c) + (danger <= 6 ? 40 : 0);
        if (kind === 'j') return mine + val(t) >= need ? 1000 : val(t) * 2 + 6 + (danger <= 6 ? 20 : 0);
        if (kind === 'pm') return r === 13 ? 26 : r === 12 ? 9 : 6;
        if (r === 14) return yours - mine >= 6 ? 45 : -10;
        if (r === 6) return s.perms[you].length > s.perms[me].length ? 30 : -10;
        if (r === 2 || r === 9) { const p = permOf(t); return p === me ? -20 : rank(t) === 13 ? 35 : rank(t) === 11 ? 30 : rank(t) === 12 ? 20 : 10; }
        if (r === 5) return s.hands[me].length < 6 ? 12 : 1;
        if (r === 4) return 14;
        if (r === 3) return Math.max(0, ...s.scrap.map(x => rank(x) === 13 ? 20 : val(x))) / 2;
        if (r === 7) return 9;
        return 0;
    };
    return ms.reduce((a, b) => rate(b) > rate(a) ? b : a);
}

// ===== VIEW =====
let selected = null, aiming = null; // aiming: the moves of one action that need a target

export const status = s => s.phase === 'counter' ? 'mAIa played a one-off. Answer?' : s.phase === 'three' ? 'Pick a card from the scrap' :
    s.phase === 'seven' ? 'Play the card you turned over' : 'Your move';

const KIND = { pt: 'Points', sc: 'Scuttle', u: 'Use', pm: 'Place', j: 'Place' };

export function view(root, s, ui) {
    const ms = ui.canPlay ? legal(s) : [];
    const own = s.phase === 'seven' ? s.seven : selected;
    if (s.phase !== 'seven' && selected !== null && !s.hands[0].includes(selected)) { selected = null; aiming = null; }
    const forCard = c => ms.filter(m => /^(pt|sc|u|pm|j)\d/.test(m) && +m.split(':')[0].replace(/^[a-z]+/, '') === c);
    const pickable = new Map((aiming ?? []).map(m => [+m.split(':')[1], m]));

    const side = who => {
        const el = document.createElement('div');
        el.className = 'ct-side p' + who;
        const perms = s.perms[who].map(c => targetable(c, cardHtml(c, 'small'))).join('');
        const pts = s.pts.filter(e => ctrl(e) === who).map(e => targetable(e.c, `<span class="ct-pt">${cardHtml(e.c, 'small')}${e.jacks.map(j => targetable(j.c, cardHtml(j.c, 'small jack'))).join('')}</span>`)).join('');
        el.innerHTML = `<div class="ct-score">${who === 0 ? 'You' : 'mAIa'} <b>${score(s, who)}</b>/${goal(s, who)}</div><div class="ct-row">${pts}</div><div class="ct-row perms">${perms}</div>`;
        return el;
    };
    const targetable = (c, html) => pickable.has(c) ? `<button type="button" class="ct-target" data-t="${c}">${html}</button>` : html;

    const theirs = document.createElement('div');
    theirs.className = 'cg-hand theirs';
    theirs.innerHTML = s.hands[1].map(c => glasses(s, 0) ? cardHtml(c, 'small') : backHtml('small')).join('');

    const middle = document.createElement('div');
    middle.className = 'ct-middle';
    const top = s.scrap[s.scrap.length - 1];
    middle.innerHTML = `<span class="ct-deck">${s.deck.length ? backHtml() + `<b class="count">${s.deck.length}</b>` : ''}</span>` +
        `<span class="ct-scrap">${top !== undefined ? cardHtml(top) + `<b class="count">${s.scrap.length}</b>` : ''}</span>` +
        (s.pending ? `<span class="ct-pending">${cardHtml(s.pending.c)}${s.pending.counters.map(c => cardHtml(c, 'small')).join('')}</span>` : '') +
        (s.phase === 'seven' ? `<span class="ct-pending">${cardHtml(s.seven, 'sel')}</span>` : '');

    // Picking from the scrap after a 3.
    const scrapPick = document.createElement('div');
    if (s.phase === 'three' && ui.canPlay) {
        scrapPick.className = 'ct-scrappick';
        for (const c of s.scrap) {
            const b = document.createElement('button');
            b.type = 'button';
            b.innerHTML = cardHtml(c, 'small');
            b.addEventListener('click', () => ui.onMove('take' + c));
            scrapPick.append(b);
        }
    }

    const actions = document.createElement('div');
    actions.className = 'cg-actions';
    const button = (text, fn) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = text;
        b.addEventListener('click', fn);
        actions.append(b);
    };
    if (ui.canPlay) {
        if (s.phase === 'counter') {
            const two = ms.find(m => m[0] === 'k');
            if (two) button('Counter with a 2', () => ui.onMove(two));
            button('Let it be', () => ui.onMove('ok'));
        } else if (s.phase === 'main' || s.phase === 'seven') {
            if (own !== null) {
                // The ways to play the chosen card, one button per kind.
                const byKind = new Map();
                for (const m of forCard(own)) { const k = m.match(/^[a-z]+/)[0]; byKind.set(k, [...(byKind.get(k) ?? []), m]); }
                for (const [k, list] of byKind) {
                    const label = KIND[k] + (k === 'pt' ? ` (${val(own)})` : '');
                    button(label + (list[0].includes(':') ? '…' : ''), () => {
                        if (!list[0].includes(':')) { selected = null; aiming = null; ui.onMove(list[0]); return; }
                        aiming = list;
                        view(root, s, ui);
                    });
                }
            }
            if (s.phase === 'seven' && ms[0] === 'scrap7') button('Scrap it', () => ui.onMove('scrap7'));
            if (ms.includes('draw')) button('Draw', () => { selected = null; aiming = null; ui.onMove('draw'); });
            if (ms.includes('pass')) button('Pass', () => ui.onMove('pass'));
        }
    }

    const mine = document.createElement('div');
    mine.className = 'cg-hand mine';
    for (const c of s.hands[0]) {
        const b = document.createElement('button');
        b.type = 'button';
        const can = s.phase === 'main' && forCard(c).length;
        b.className = 'cg-card' + (selected === c ? ' sel' : '') + (ui.guides && can ? ' can' : '');
        b.innerHTML = cardHtml(c);
        b.addEventListener('click', () => {
            if (s.phase !== 'main' || !ui.canPlay) return;
            selected = selected === c ? null : c;
            aiming = null;
            view(root, s, ui);
        });
        mine.append(b);
    }

    root.replaceChildren(theirs, side(1), middle, scrapPick, side(0), actions, mine);
    for (const b of root.querySelectorAll('.ct-target')) {
        b.addEventListener('click', e => {
            e.stopPropagation();
            const m = pickable.get(+b.dataset.t);
            selected = null; aiming = null;
            ui.onMove(m);
        });
    }
}

export const trace = () => [];

const who = s => s.t === 0 ? 'You' : 'mAIa';
const verb = (s, v) => s.t === 0 ? v : /(o|s|sh|ch|x)$/.test(v) ? v + 'es' : v + 's';
export function note(s, m, n) {
    if (m === 'draw') return `${who(s)} ${verb(s, 'draw')}`;
    if (m === 'pass') return `${who(s)} ${verb(s, 'pass')}`;
    if (m === 'ok') return s.pending.counters.length % 2 ? 'Countered!' : null;
    if (m[0] === 'k') return `${who(s)} ${verb(s, 'counter')} with a 2`;
    if (m.startsWith('take')) return `${who(s)} ${verb(s, 'take')} the ${label(+m.slice(4))} from the scrap`;
    if (m === 'scrap7') return `The ${label(s.seven)} goes to the scrap`;
    const [head, target] = m.split(':'), kind = head.match(/^[a-z]+/)[0], c = +head.slice(kind.length);
    const out = kind === 'pt' ? `${who(s)} ${verb(s, 'play')} the ${label(c)} for points`
        : kind === 'sc' ? `${who(s)} ${verb(s, 'scuttle')} the ${label(+target)}`
        : kind === 'j' ? `${who(s)} ${verb(s, 'take')} the ${label(+target)} with a jack`
        : kind === 'pm' ? `${who(s)} ${verb(s, 'place')} the ${label(c)}`
        : `${who(s)} ${verb(s, 'use')} the ${label(c)}` + (target ? ` on the ${label(+target)}` : '');
    return n.phase === 'seven' && n.t === s.t ? `${out} · turns over the ${label(n.seven)}` : out;
}
