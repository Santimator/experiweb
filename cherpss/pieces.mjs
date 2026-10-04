// Vector chess pieces avoid emoji substitution and font-dependent size/colour.
const ART={
 p:'<circle cx="32" cy="19" r="7"/><path d="M26 28h12l-3 12 9 8H20l9-8z"/><path d="M18 49h28v5H18z"/>',
 r:'<path d="M18 10h7v7h5v-7h5v7h5v-7h7v14l-5 5v15l6 5v5H16v-5l6-5V29l-4-5z"/><path d="M23 26h18M23 45h18" fill="none"/>',
 n:'<path d="M18 53v-7l6-5 1-10-8-1 2-10 10-6 2-7 9 6 6 11-2 14 5 9v6z"/><path d="M20 27l10-3M30 18h4M27 39l9-10M19 48h28" fill="none"/>',
 b:'<path d="M32 6l9 13q5 9-4 14l-1 10 10 6v5H18v-5l10-6-1-10q-9-5-4-14z"/><path d="M34 17l-7 9M26 35h12M22 48h20" fill="none"/>',
 q:'<path d="M18 21l4 15h20l4-15-9 7-5-13-5 13zM23 38h18l-2 7 8 5v4H17v-4l8-5z"/><circle cx="17" cy="17" r="3"/><circle cx="32" cy="11" r="3"/><circle cx="47" cy="17" r="3"/><path d="M23 48h18" fill="none"/>',
 k:'<path d="M30 6h4v5h5v4h-5v6h-4v-6h-5v-4h5zM23 23q9-8 18 0l-3 13H26zM26 38h12l-2 7 10 5v4H18v-4l10-5z"/><path d="M23 49h18" fill="none"/>'
};
export function pieceSvg(t,s){return `<svg class="chess-vector ${s} piece-${t}" viewBox="0 0 64 64" aria-hidden="true" focusable="false" fill="currentColor" stroke="var(--piece-outline)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round">${ART[t]}</svg>`;}
