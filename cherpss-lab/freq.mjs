// How often each piece type supports a duel, from simulated games (semi-greedy movers, coin-flip duels).
import {newGame,allMoves,applyMove,collectSupport,captureTarget} from '../cherpss/engine.mjs';
const VAL={p:1,n:3,b:3,r:5,q:9,k:50},T=['p','n','b','r','q','k'];
const games=+(process.env.G||3000),samples=[];let duels=0;const any={},sum={},two={},role={attacker:{},defender:{}};
for(let g=0;g<games;g++){let s=newGame('duel');
 for(let ply=0;ply<200;ply++){const ms=allMoves(s);if(!ms.length)break;
  const caps=ms.filter(m=>captureTarget(s,m));
  // Mostly take the most valuable capture when one exists (like a player), else a random move.
  let m;if(caps.length&&Math.random()<.6){caps.sort((a,b)=>VAL[captureTarget(s,b).t]-VAL[captureTarget(s,a).t]);m=caps[Math.random()<.7?0:Math.floor(Math.random()*caps.length)];}else m=ms[Math.floor(Math.random()*ms.length)];
  const tgt=captureTarget(s,m);
  if(tgt){duels++;const sup=collectSupport(s,m);const att=s.board[m.from];role.attacker[att.t]=(role.attacker[att.t]||0)+1;role.defender[tgt.t]=(role.defender[tgt.t]||0)+1;
   samples.push({w:sup.w.map(p=>p.t),b:sup.b.map(p=>p.t)});
   for(const side of ['w','b']){const c={};for(const p of sup[side])c[p.t]=(c[p.t]||0)+1;for(const t of T){const n=c[t]||0;sum[t]=(sum[t]||0)+n;if(n>=1)any[t]=(any[t]||0)+1;if(n>=2)two[t]=(two[t]||0)+1;}}
   s=applyMove(s,m,Math.random()<.5?true:false);if(!s.board.some(p=>p?.t==='k'&&p.s==='w')||!s.board.some(p=>p?.t==='k'&&p.s==='b'))break;}
  else s=applyMove(s,m);}
}
const sides=duels*2,pc=x=>(100*x/sides).toFixed(0).padStart(3)+'%';
console.log(`${games} games, ${duels} duels (${(duels/games).toFixed(1)} per game). Per side of a duel:`);
console.log('piece  avg count  has ≥1  has ≥2   (as attacker / defender of the capture)');
for(const t of T)console.log(`  ${t}      ${(sum[t]/sides).toFixed(2)}     ${pc(any[t]||0)}   ${pc(two[t]||0)}    (${(100*(role.attacker[t]||0)/duels).toFixed(0)}% / ${(100*(role.defender[t]||0)/duels).toFixed(0)}%)`);

import fs from 'node:fs';fs.writeFileSync('supports.json',JSON.stringify(samples));
