// French playing cards for the WC card games. A card is suit * 16 + rank, rank 2..14 (14 = ace).

export const SUITS = ['♣', '♦', '♥', '♠'];
const LABEL = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };

export const rank = c => c & 15;
export const suit = c => c >> 4;
export const make = (r, s) => s * 16 + r;

export function deck(lowest = 2) {
    const out = [];
    for (let s = 0; s < 4; s++) for (let r = lowest; r <= 14; r++) out.push(make(r, s));
    return out;
}

export function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.random() * (i + 1) | 0;
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

export const label = c => (LABEL[rank(c)] ?? rank(c)) + SUITS[suit(c)];

export function cardHtml(c, cls = '') {
    const red = suit(c) === 1 || suit(c) === 2;
    return `<span class="pc${red ? ' red' : ''}${cls ? ' ' + cls : ''}" data-card="${c}"><b>${LABEL[rank(c)] ?? rank(c)}</b><i>${SUITS[suit(c)]}</i></span>`;
}

export const backHtml = (cls = '') => `<span class="pc back${cls ? ' ' + cls : ''}"></span>`;

export const pick = list => list[Math.random() * list.length | 0];
