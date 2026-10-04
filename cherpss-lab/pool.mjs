// With N champions per type and "loser is eliminated": how do games end? Semi-greedy movers, picks random among
// available types, duel won by the counter ~78% (mirror 50%), as measured in the lab.
import {newGame,allMoves,applyMove,captureTarget} from '../cherpss/engine.mjs';
const VAL={p:1,n:3,b:3,r:5,q:9,k:50},T=['rock','scissors','paper'],BEATS={rock:'scissors',scissors:'paper',paper:'rock'};
for(const per of [3,4,5]){let kingEnd=0,rosterEnd=0,typeOut=0,duelsTot=0,G=2000,noEnd=0;
 for(let g=0;g<G;g++){let s=newGame('duel');const pool={w:{rock:per,scissors:per,paper:per},b:{rock:per,scissors:per,paper:per}};let ended=false,anyTypeOut=false;
  for(let ply=0;ply<300&&!ended;ply++){const ms=allMoves(s);if(!ms.length)break;const caps=ms.filter(m=>captureTarget(s,m));let m;
   if(caps.length&&Math.random()<.6){caps.sort((a,b)=>VAL[captureTarget(s,b).t]-VAL[captureTarget(s,a).t]);m=caps[Math.random()<.7?0:Math.floor(Math.random()*caps.length)];}else m=ms[Math.floor(Math.random()*ms.length)];
   if(captureTarget(s,m)){duelsTot++;const att=s.turn,def=att==='w'?'b':'w',pick=x=>{const av=T.filter(t=>pool[x][t]>0);return av[Math.floor(Math.random()*av.length)];};const a=pick(att),d=pick(def);
    const pA=a===d?.5:BEATS[a]===d?.78:.22,attWins=Math.random()<pA;pool[attWins?def:att][attWins?d:a]--;
    if(T.some(t=>pool.w[t]===0)||T.some(t=>pool.b[t]===0))anyTypeOut=true;
    s=applyMove(s,m,attWins);if(T.every(t=>pool.w[t]===0)||T.every(t=>pool.b[t]===0)){rosterEnd++;ended=true;break;}
    if(!s.board.some(p=>p?.t==='k'&&p.s==='w')||!s.board.some(p=>p?.t==='k'&&p.s==='b')){kingEnd++;ended=true;break;}}
   else s=applyMove(s,m);}
  if(!ended)noEnd++;if(anyTypeOut)typeOut++;}
 console.log(`${per} per type (${per*3} champions): king falls ${Math.round(100*kingEnd/G)}%, a side runs out of champions ${Math.round(100*rosterEnd/G)}%, no result in 300 plies ${Math.round(100*noEnd/G)}% | some type exhausted during the game ${Math.round(100*typeOut/G)}% | ${(duelsTot/G).toFixed(1)} duels/game`);}
