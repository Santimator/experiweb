// Durak, "the fool", classic two-player game: 36 cards, 6 to ace, the last card of the talon is trump.
// Nobody wins Durak; the one left holding cards loses.
// Phases: 'attack' (the attacker leads or adds: "a<card>", or "done" once everything is beaten),
// 'defend' (beat the open card: "d<card>", or "take"), 'throw' (after a take, the attacker may add:
// "a<card>" or "done"). mAIa decides with ai(), which only reads its own hand and the table.

import { deck, shuffle, rank, suit, cardHtml, backHtml, pick } from '../cards.mjs';

export const meta = {
    name: 'Durak',
    goal: "Get rid of your cards. Don't be the fool.",
    levels: [0.45, 0.2, 0], // how often mAIa plays a random legal move instead of thinking
    lost: "You're the durak",
    origins: [
        "Durak means 'fool', and the game has no winner, only a loser: whoever is left holding cards. It is Russia's most popular card game.",
        "It was already played in the Russian Empire in the late 18th century, when a card players' handbook described its rules. For a long time it was a game of peasants and workers; after the 1917 revolution it became the most popular card game in the Soviet Union.",
        "A game about not taking trouble home: every card you can't beat comes back with you. This is the throw-in version for two, with 36 cards."
    ],
    trivia: [
        ["The fool with epaulettes.", "In a popular house rule, if the last attack is made with sixes, the loser has to wear them on the shoulders: durak s pogonami."],
        ["Thirty-six cards.", "Russian decks traditionally run from 6 to ace, so a 52-card deck needs trimming before you can play."],
        ["A soldiers' story.", "One theory says conscripts spread it across Europe during the wars against Napoleon. It is a nice story; nobody has proved it."]
    ]
};

const HAND = 6, MAX_ATTACK = 6;

export function start(first) {
    const d = shuffle(deck(6));
    const hands = [d.splice(-HAND), d.splice(-HAND)];
    const trump = d[0]; // drawn last, face up under the talon
    const t = suit(trump);
    // The lowest trump in hand attacks first; with no trumps about, a coin decides.
    const low = h => Math.min(...h.filter(c => suit(c) === t).map(rank), 99);
    const a = low(hands[0]) < low(hands[1]) ? 0 : low(hands[1]) < low(hands[0]) ? 1 : first;
    return { deck: d, trump, hands, table: [], attacker: a, limit: Math.min(MAX_ATTACK, HAND), phase: 'attack', t: a, out: 0, w: null };
}

export const turn = s => s.t;
export const result = s => s.w;

const beats = (s, d, a) => suit(d) === suit(a) ? rank(d) > rank(a) : suit(d) === suit(s.trump) && suit(a) !== suit(s.trump);
const ranksOnTable = s => new Set(s.table.flatMap(p => p.d === null ? [rank(p.a)] : [rank(p.a), rank(p.d)]));

function legal(s) {
    const hand = s.hands[s.t];
    if (s.phase === 'defend') {
        const open = s.table.find(p => p.d === null);
        return [...hand.filter(c => beats(s, c, open.a)).map(c => 'd' + c), 'take'];
    }
    const out = [];
    if (!s.table.length) return hand.map(c => 'a' + c);
    const ranks = ranksOnTable(s), defender = 1 - s.attacker;
    // Never more attacks than the limit, nor more open cards than the defender could answer.
    const open = s.table.filter(p => p.d === null).length;
    if (s.table.length < s.limit && s.hands[defender].length > open) out.push(...hand.filter(c => ranks.has(rank(c))).map(c => 'a' + c));
    out.push('done');
    return out;
}

export function moves(s) {
    return legal(s);
}

function refill(s) {
    for (const p of [s.attacker, 1 - s.attacker]) while (s.hands[p].length < HAND && s.deck.length) s.hands[p].push(s.deck.pop());
}

export function play(s, m) {
    const n = { ...s, deck: s.deck.slice(), hands: [s.hands[0].slice(), s.hands[1].slice()], table: s.table.map(p => ({ ...p })) };
    const me = s.t, take = c => n.hands[me].splice(n.hands[me].indexOf(c), 1);
    if (m[0] === 'a') {
        const c = +m.slice(1);
        take(c);
        n.table.push({ a: c, d: null });
        if (s.phase === 'attack') { n.phase = 'defend'; n.t = 1 - me; }
    } else if (m[0] === 'd' && m !== 'done') {
        const c = +m.slice(1);
        take(c);
        n.table.find(p => p.d === null).d = c;
        n.phase = 'attack';
        n.t = s.attacker;
    } else if (m === 'take') {
        n.phase = 'throw';
        n.t = s.attacker;
    } else if (m === 'done') {
        const defender = 1 - s.attacker;
        if (s.phase === 'throw') {
            // The defender picks everything up; the same attacker goes again.
            n.hands[defender].push(...n.table.flatMap(p => p.d === null ? [p.a] : [p.a, p.d]));
        } else {
            n.out += n.table.length * 2;
            n.attacker = defender;
        }
        n.table = [];
        refill(n);
        n.phase = 'attack';
        n.t = n.attacker;
        n.limit = Math.min(MAX_ATTACK, n.hands[1 - n.attacker].length);
        if (!n.deck.length) {
            const empty = [0, 1].filter(p => !n.hands[p].length);
            if (empty.length === 2) n.w = 0.5;
            else if (empty.length === 1) n.w = empty[0];
        }
    }
    return n;
}

// ===== mAIa =====
// Cheap cards first, trumps last; keep high trumps while the talon is long.
const cost = (s, c) => rank(c) + (suit(c) === suit(s.trump) ? 20 : 0);

export function ai(s, level) {
    const ms = legal(s);
    if (Math.random() < meta.levels[level]) return pick(ms);
    const cards = ms.filter(m => m !== 'done' && m !== 'take').map(m => +m.slice(1)).sort((x, y) => cost(s, x) - cost(s, y));
    if (s.phase === 'defend') {
        if (!cards.length) return 'take';
        const best = cards[0];
        // Not worth a big trump on a small attack early on.
        if (s.deck.length > 6 && suit(best) === suit(s.trump) && rank(best) >= 12 && s.table.length < 3) return 'take';
        return 'd' + best;
    }
    if (!s.table.length) {
        // Lead the cheapest card, preferring a rank you hold twice.
        const twice = cards.find(c => cards.some(o => o !== c && rank(o) === rank(c)) && suit(c) !== suit(s.trump));
        return 'a' + (twice ?? cards[0]);
    }
    // Add cheap cards; once the talon is gone, add anything that fits.
    const cheap = cards.filter(c => s.deck.length === 0 || (suit(c) !== suit(s.trump) && rank(c) <= 10));
    return cheap.length ? 'a' + cheap[0] : 'done';
}

// ===== VIEW =====
export const status = s => s.phase === 'defend' ? 'Your turn to answer' : s.table.length ? 'Add, or call it' : 'Your lead';

export function view(root, s, ui) {
    const ms = ui.canPlay ? legal(s) : [];
    const playable = new Map(ms.filter(m => m !== 'done' && m !== 'take').map(m => [+m.slice(1), m]));

    const theirs = document.createElement('div');
    theirs.className = 'cg-hand theirs';
    theirs.innerHTML = s.hands[1].map(() => backHtml('small')).join('');

    const middle = document.createElement('div');
    middle.className = 'dk-middle';
    // The trump lies crossways under the talon; once it is drawn, only its suit is left as a reminder.
    middle.innerHTML = `<div class="dk-talon">${s.deck.length ? cardHtml(s.trump, 'trump') : `<span class="dk-suit">${'♣♦♥♠'[suit(s.trump)]}</span>`}${s.deck.length > 1 ? `<span class="dk-stack">${backHtml()}<b class="count">${s.deck.length}</b></span>` : ''}</div>` +
        `<div class="dk-table">${s.table.map(p => `<span class="dk-pair">${cardHtml(p.a)}${p.d !== null ? cardHtml(p.d, 'over') : ''}</span>`).join('')}</div>`;

    const mine = document.createElement('div');
    mine.className = 'cg-hand mine';
    const sorted = s.hands[0].slice().sort((x, y) => cost(s, x) - cost(s, y));
    for (const c of sorted) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'cg-card' + (ui.guides && playable.has(c) ? ' can' : '');
        b.innerHTML = cardHtml(c);
        b.addEventListener('click', () => { if (playable.has(c)) ui.onMove(playable.get(c)); });
        mine.append(b);
    }

    const actions = document.createElement('div');
    actions.className = 'cg-actions';
    for (const m of ms.filter(m => m === 'take' || m === 'done')) {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = m === 'take' ? 'Take them' : s.phase === 'throw' ? 'Hand them over' : 'Done';
        b.addEventListener('click', () => ui.onMove(m));
        actions.append(b);
    }
    root.replaceChildren(theirs, middle, actions, mine);
}

export const trace = () => [];
