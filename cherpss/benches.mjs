import {PIECES} from './engine.mjs';
// The piece whose life is on the line comes first, marked "At stake"; helpers follow.
export function benchHtml(pieces=[],side='w',centre){
 const team=side==='w'?'White':'Black',stake=p=>p.attacker||p.i===centre;pieces=[...pieces].sort((a,b)=>stake(b)-stake(a));
 return `<div class="bench-heading"><strong>${team} bench</strong><span>${pieces.length} aid${pieces.length===1?'':'s'}</span></div><div class="bench-seats">${pieces.length?pieces.map(p=>`<div class="bench-seat${stake(p)?' at-stake':''}"><span class="aid-figurine aid-${p.t} ${side}" aria-hidden="true"></span><div><b>${PIECES[p.t]}</b>${stake(p)?'<small>At stake</small>':''}</div></div>`).join(''):'<p class="empty-bench">No pieces supporting this duel.</p>'}</div>`;
}
