import {PIECES} from './engine.mjs';
export const AID={p:'Shield & edge',n:'Speed',b:'Faster, stronger specials',r:'Stronger specials',q:'Faster attacks',k:'More damage'};
export function benchHtml(pieces=[],side='w'){
 const team=side==='w'?'Ivory':'Ember';
 return `<div class="bench-heading"><strong>${team} bench</strong><span>${pieces.length} aid${pieces.length===1?'':'s'}</span></div><div class="bench-seats">${pieces.length?pieces.map(p=>`<div class="bench-seat" title="${PIECES[p.t]} · ${AID[p.t]}"><span class="aid-figurine aid-${p.t} ${side}" aria-hidden="true"></span><div><b>${PIECES[p.t]}</b><small>${AID[p.t]}</small></div></div>`).join(''):'<p class="empty-bench">No pieces supporting this duel.</p>'}</div>`;
}
