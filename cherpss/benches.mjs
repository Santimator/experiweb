import {PIECES} from './engine.mjs';
export const AID={p:'A little damage',n:'Speed',b:'Faster, stronger specials',r:'Stronger specials',q:'Faster attacks',k:'More damage'};
// The piece whose life is on the line comes first, marked "At stake"; helpers follow.
export function benchHtml(pieces=[],side='w',centre){
 const team=side==='w'?'White':'Black',stake=p=>p.attacker||p.i===centre;pieces=[...pieces].sort((a,b)=>stake(b)-stake(a));
 return `<div class="bench-heading"><strong>${team} bench</strong><span>${pieces.length} aid${pieces.length===1?'':'s'}</span></div><div class="bench-seats">${pieces.length?pieces.map(p=>`<div class="bench-seat${stake(p)?' at-stake':''}" title="${PIECES[p.t]} · ${AID[p.t]}"><span class="aid-figurine aid-${p.t} ${side}" aria-hidden="true"></span><div><b>${PIECES[p.t]}</b><small>${stake(p)?'At stake · ':''}${AID[p.t]}</small></div></div>`).join(''):'<p class="empty-bench">No pieces supporting this duel.</p>'}</div>`;
}
