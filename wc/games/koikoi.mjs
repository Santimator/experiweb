// Koi-Koi with a hanafuda deck, two players, three hands. A card is 0..47: month = (id >> 2) + 1, and
// TYPES gives what each of the month's four cards is. Phases: 'hand' (play "p<card>" or "p<card>:<field card>"
// when it matches two), 'draw' (the drawn card matches two: "g<field card>"), 'koi' ("stop" or "koikoi").
// mAIa decides with ai(), reading only its own hand, the field and the captured piles.

import { shuffle, pick } from '../cards.mjs';

export const meta = {
    name: 'Koi-Koi',
    goal: 'Collect flower sets. Know when to stop.',
    levels: [0.45, 0.2, 0],
    origins: [
        "Playing cards reached Japan with Portuguese sailors in the 16th century. When the shogunate banned them, card makers disguised their decks, and hanafuda, 'flower cards', is the result: no numbers and no kings, just twelve months, each one a plant.",
        "In 1889 Fusajiro Yamauchi opened a small shop in Kyoto to make hanafuda by hand. It was called Nintendo.",
        "Koi-koi means 'come on!': what you say when you already have a scoring set and decide to play on for more. Greed is the whole game. Three hands; the moon and blossom-viewing sets count."
    ],
    trivia: [
        ["The man with the umbrella.", "The rain man on the November card is the calligrapher Ono no Michikaze. Legend says that, about to give up, he watched a frog try again and again to reach a willow branch until it made it, and he stayed."],
        ["8-9-3.", "The word yakuza is often traced to ya-ku-za, 8-9-3, the worst hand in oicho-kabu, another hanafuda game."],
        ["A card with two lives.", "The sake cup counts both as a ten and as chaff, which is why it turns up in so many sets."]
    ]
};

const HANDS = 3;
// B bright, A animal (ten), R red poetry ribbon, r red ribbon, b blue ribbon, C chaff.
const TYPES = ['BRCC', 'ARCC', 'BRCC', 'ArCC', 'ArCC', 'AbCC', 'ArCC', 'BACC', 'AbCC', 'AbCC', 'BArC', 'BCCC'];
const type = c => TYPES[c >> 2][c & 3];
const month = c => (c >> 2) + 1;
const RAIN_MAN = 40, MOON = 28, CURTAIN = 8, SAKE = 32, BOAR = 24, DEER = 36, BUTTERFLIES = 20;

// The sets (yaku) in a capture pile, as [name, points].
export function yaku(pile) {
    const has = c => pile.includes(c), count = f => pile.filter(f).length, out = [];
    const brights = count(c => type(c) === 'B'), rain = has(RAIN_MAN);
    if (brights === 5) out.push(['Gokō', 10]);
    else if (brights === 4) out.push(rain ? ['Ame-shikō', 7] : ['Shikō', 8]);
    else if (brights === 3 && !rain) out.push(['Sankō', 5]);
    if (has(BOAR) && has(DEER) && has(BUTTERFLIES)) out.push(['Inoshikachō', 5]);
    if ([1, 5, 9].every(has)) out.push(['Akatan', 5]);
    if ([21, 33, 37].every(has)) out.push(['Aotan', 5]);
    if (has(MOON) && has(SAKE)) out.push(['Tsukimi-zake', 5]);
    if (has(CURTAIN) && has(SAKE)) out.push(['Hanami-zake', 5]);
    const tens = count(c => type(c) === 'A'), ribbons = count(c => 'Rrb'.includes(type(c)));
    const chaff = count(c => type(c) === 'C') + (has(SAKE) ? 1 : 0); // the sake cup also counts as chaff
    if (tens >= 5) out.push(['Tane', tens - 4]);
    if (ribbons >= 5) out.push(['Tanzaku', ribbons - 4]);
    if (chaff >= 10) out.push(['Kasu', chaff - 9]);
    return out;
}
const points = pile => yaku(pile).reduce((n, [, p]) => n + p, 0);

function deal(s, dealer) {
    for (;;) {
        const d = shuffle([...Array(48).keys()]);
        const hands = [[], []], field = [];
        hands[1 - dealer] = d.splice(-8); field.push(...d.splice(-8)); hands[dealer] = d.splice(-8);
        const fourOf = cards => cards.some(c => cards.filter(o => month(o) === month(c)).length === 4);
        if (fourOf(field)) continue; // four of a month on the field: deal again
        Object.assign(s, { deck: d, field, hands, caps: [[], []], koi: [false, false], best: [0, 0], dealer, t: dealer, phase: 'hand', pending: null });
        // Four of a month, or four pairs, in a hand scores 6 at once.
        for (const p of [dealer, 1 - dealer]) {
            const months = hands[p].map(month), pairs = new Set(months.filter(m => months.filter(x => x === m).length === 2));
            if (fourOf(hands[p]) || pairs.size === 4) return endHand(s, p, 6, 'Lucky hand');
        }
        return s;
    }
}

function endHand(s, winner, pts, why) {
    s.totals = s.totals.slice();
    if (winner !== null) s.totals[winner] += pts;
    s.results = [...s.results, { winner, pts, why }];
    if (s.results.length >= HANDS) {
        s.phase = 'over';
        s.w = s.totals[0] > s.totals[1] ? 0 : s.totals[1] > s.totals[0] ? 1 : 0.5;
        return s;
    }
    // The winner deals the next hand; with no winner the dealer keeps the deal.
    return deal(s, winner ?? s.dealer);
}

export function start(first) {
    return deal({ totals: [0, 0], results: [], w: null }, first);
}

export const turn = s => s.t;
export const result = s => s.w;

const matches = (s, c) => s.field.filter(f => month(f) === month(c));

function legal(s) {
    if (s.phase === 'koi') return ['stop', 'koikoi'];
    if (s.phase === 'draw') return matches(s, s.pending).map(f => 'g' + f);
    return s.hands[s.t].flatMap(c => {
        const m = matches(s, c);
        return m.length === 2 ? m.map(f => 'p' + c + ':' + f) : ['p' + c];
    });
}

export const moves = legal;

// A card lands on the field: it takes its match (or the chosen one, or all three), or stays.
function land(s, who, c, chosen) {
    const m = matches(s, c);
    if (!m.length) { s.field.push(c); return; }
    const taken = m.length === 2 ? [chosen] : m;
    s.field = s.field.filter(f => !taken.includes(f));
    s.caps[who].push(c, ...taken);
}

function afterTurn(s, me) {
    const now = points(s.caps[me]);
    if (now > s.best[me]) {
        // A new set: stop and score, or call koi-koi and play on. With no cards left there is nothing to risk.
        if (!s.hands[me].length) return stop(s, me);
        s.phase = 'koi';
        s.t = me;
        return s;
    }
    if (!s.hands[0].length && !s.hands[1].length) return endHand(s, s.dealer, 1, 'Nobody scored');
    s.t = 1 - me;
    s.phase = 'hand';
    return s;
}

function stop(s, me) {
    let pts = points(s.caps[me]);
    if (pts >= 7) pts *= 2;
    if (s.koi[1 - me]) pts *= 2; // they called koi-koi and you got there first
    return endHand(s, me, pts, yaku(s.caps[me]).map(([n]) => n).join(' · '));
}

export function play(s0, m) {
    const s = { ...s0, deck: s0.deck.slice(), field: s0.field.slice(), hands: [s0.hands[0].slice(), s0.hands[1].slice()], caps: [s0.caps[0].slice(), s0.caps[1].slice()], koi: s0.koi.slice(), best: s0.best.slice() };
    const me = s.t;
    if (m === 'stop') return stop(s, me);
    if (m === 'koikoi') {
        s.koi[me] = true;
        s.best[me] = points(s.caps[me]);
        s.t = 1 - me;
        s.phase = 'hand';
        if (!s.hands[0].length && !s.hands[1].length) return endHand(s, s.dealer, 1, 'Nobody scored');
        return s;
    }
    if (m[0] === 'g') {
        land(s, me, s.pending, +m.slice(1));
        s.pending = null;
        return afterTurn(s, me);
    }
    const [c, chosen] = m.slice(1).split(':').map(Number);
    s.hands[me].splice(s.hands[me].indexOf(c), 1);
    land(s, me, c, chosen);
    // Then the top card of the deck is turned over and plays the same way.
    const drawn = s.deck.pop();
    if (matches(s, drawn).length === 2) {
        s.pending = drawn;
        s.phase = 'draw';
        return s;
    }
    land(s, me, drawn);
    return afterTurn(s, me);
}

// ===== mAIa =====
const VALUE = { B: 20, A: 10, R: 7, b: 7, r: 5, C: 1 };
const worth = c => VALUE[type(c)] + ([BOAR, DEER, BUTTERFLIES, SAKE, MOON, CURTAIN].includes(c) ? 4 : 0);

export function ai(s, level) {
    const ms = legal(s);
    if (Math.random() < meta.levels[level]) return pick(ms);
    const me = s.t;
    if (s.phase === 'koi') {
        // Play on only with a small score, cards in hand and a quiet opponent.
        const mine = points(s.caps[me]), theirs = points(s.caps[1 - me]);
        return mine < 5 && s.hands[me].length >= 4 && theirs === 0 ? 'koikoi' : 'stop';
    }
    if (s.phase === 'draw') return ms.reduce((a, b) => worth(+a.slice(1)) >= worth(+b.slice(1)) ? a : b);
    // Take the most valuable capture; with none, throw away the cheapest card.
    let best = null, bestScore = -Infinity;
    for (const m of ms) {
        const [c, chosen] = m.slice(1).split(':').map(Number);
        const caught = matches(s, c);
        const gain = caught.length ? worth(c) + (chosen !== undefined ? worth(chosen) : caught.reduce((n, f) => n + worth(f), 0)) : -worth(c);
        if (gain > bestScore) { bestScore = gain; best = m; }
    }
    return best;
}

// ===== VIEW =====
const PLANT = ['🌲', '🌺', '🌸', '🍇', '🪻', '🌹', '☘️', '🌾', '🌼', '🍁', '🌿', '🍃'];
const FEATURE = { 0: '🦢', 4: '🐦', 8: '🎏', 12: '🕊️', 16: '🌉', 20: '🦋', 24: '🐗', 28: '🌕', 29: '🪿', 32: '🍶', 36: '🦌', 40: '☂️', 41: '🐦', 43: '⚡', 44: '🦚' };

export function cardHtml(c, cls = '') {
    const t = type(c), ribbon = 'Rrb'.includes(t);
    return `<span class="hf m${month(c)} t${t}${cls ? ' ' + cls : ''}"><b>${month(c)}</b>` +
        `<i>${FEATURE[c] ?? PLANT[month(c) - 1]}</i>${ribbon ? `<u class="${t === 'b' ? 'blue' : 'red'}${t === 'R' ? ' poem' : ''}"></u>` : ''}</span>`;
}

const pileHtml = (s, who) => {
    const order = 'BARrbC', pile = s.caps[who].slice().sort((a, b) => order.indexOf(type(a)) - order.indexOf(type(b)) || a - b);
    const sets = yaku(pile).map(([n, p]) => `<em>${n} ${p}</em>`).join('');
    return `<div class="kk-pile p${who}">${pile.map(c => cardHtml(c, 'mini')).join('')}${sets ? `<div class="kk-sets">${sets}${s.koi[who] ? '<em class="koi">koi-koi!</em>' : ''}</div>` : ''}</div>`;
};

export const status = s => s.phase === 'koi' ? 'Stop here, or koi-koi?' : s.phase === 'draw' ? 'Which one does it take?' : 'Your move';

export function view(root, s, ui) {
    const ms = ui.canPlay ? legal(s) : [];
    const hand = new Map(), takes = new Map();
    for (const m of ms) {
        if (m[0] === 'p') { const [c, f] = m.slice(1).split(':').map(Number); hand.set(c, [...(hand.get(c) ?? []), m]); if (f !== undefined) takes.set(f, null); }
        if (m[0] === 'g') takes.set(+m.slice(1), m);
    }

    const score = document.createElement('div');
    score.className = 'kk-score';
    const lastResult = s.results[s.results.length - 1];
    score.innerHTML = `<span>Hand ${Math.min(s.results.length + 1, HANDS)}/${HANDS}</span><span>You ${s.totals[0]} · mAIa ${s.totals[1]}</span>` +
        (lastResult ? `<small>Last hand: ${lastResult.winner === null ? 'nobody' : lastResult.winner === 0 ? 'you' : 'mAIa'} +${lastResult.pts}${lastResult.why ? ' · ' + lastResult.why : ''}</small>` : '');

    const theirs = document.createElement('div');
    theirs.className = 'cg-hand theirs';
    theirs.innerHTML = s.hands[1].map(() => '<span class="hf back mini"></span>').join('');

    const field = document.createElement('div');
    field.className = 'kk-field';
    for (const c of s.field) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'kk-fieldcard' + (takes.has(c) ? ' pick' : '');
        b.innerHTML = cardHtml(c);
        b.addEventListener('click', () => { if (takes.get(c)) ui.onMove(takes.get(c)); });
        field.append(b);
    }
    if (s.pending !== null) field.insertAdjacentHTML('afterbegin', `<span class="kk-drawn">${cardHtml(s.pending)}</span>`);

    const mine = document.createElement('div');
    mine.className = 'cg-hand mine';
    for (const c of s.hands[0]) {
        const b = document.createElement('button');
        b.type = 'button';
        const opts = hand.get(c);
        b.className = 'cg-card' + (ui.guides && opts && matches(s, c).length ? ' can' : '');
        b.innerHTML = cardHtml(c);
        b.addEventListener('click', () => {
            if (!opts) return;
            if (opts.length === 1) return ui.onMove(opts[0]);
            // Two field cards match: tap the one to take.
            for (const fb of field.querySelectorAll('.kk-fieldcard')) fb.classList.remove('pick');
            opts.forEach(m => {
                const f = +m.split(':')[1], i = s.field.indexOf(f);
                const fb = field.querySelectorAll('.kk-fieldcard')[i];
                fb.classList.add('pick');
                fb.onclick = () => ui.onMove(m);
            });
        });
        mine.append(b);
    }

    const actions = document.createElement('div');
    actions.className = 'cg-actions';
    if (s.phase === 'koi' && ui.canPlay) {
        for (const [m, label] of [['stop', 'Stop'], ['koikoi', 'Koi-koi!']]) {
            const b = document.createElement('button');
            b.type = 'button';
            b.textContent = label;
            b.addEventListener('click', () => ui.onMove(m));
            actions.append(b);
        }
    }
    const piles = document.createElement('div');
    piles.innerHTML = pileHtml(s, 1);
    const myPile = document.createElement('div');
    myPile.innerHTML = pileHtml(s, 0);
    root.replaceChildren(score, theirs, piles.firstChild, field, myPile.firstChild, actions, mine);
}

export const trace = () => [];

const who = s => s.t === 0 ? 'You' : 'mAIa';
const verb = (s, v) => s.t === 0 ? v : /(o|s|sh|ch|x)$/.test(v) ? v + 'es' : v + 's';
export function note(s, m, n) {
    if (m === 'koikoi') return `${who(s)} ${verb(s, 'call')} koi-koi!`;
    if (m === 'stop') return `${who(s)} ${verb(s, 'stop')} and ${verb(s, 'score')}`;
    if (n.results.length !== s.results.length) return null; // the hand is over; the score line says the rest
    const had = new Set(yaku(s.caps[s.t]).map(([name]) => name));
    const fresh = yaku(n.caps[s.t]).map(([name]) => name).filter(name => !had.has(name));
    return fresh.length ? `${who(s)} ${verb(s, 'make')} ${fresh.join(' and ')}` : null;
}
