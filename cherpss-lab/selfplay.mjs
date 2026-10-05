// Self-play: full duel-chess games; every capture is fought in the real arena by bots at each side's skill.
import {newGame,allMoves,applyMove,captureTarget,collectSupport,recordWounds,exhaust,TYPES} from './dist/engine.mjs';
import {makeArena,stepArena} from './dist/arena.mjs';import {autoInput} from './dist/bots.mjs';
import {chooseMove,chooseChampion,fightSkill} from './dist/ai.mjs';
const [A,B,N,TIME]=[process.argv[2],process.argv[3],+process.argv[4]||2,+process.argv[5]||250];
const policy={random:{move:g=>{const l=allMoves(g);return l[Math.floor(Math.random()*l.length)];},pick:(g,sup,s)=>{const a=TYPES.filter(t=>g.roster[s][t]>0);return a[Math.floor(Math.random()*a.length)];},skill:.6},
 goof:{move:g=>chooseMove(g,'goof'),pick:(g,sup,s,att)=>chooseChampion(g,sup,s,att,'goof'),skill:fightSkill('goof')},
 good:{move:g=>chooseMove(g,'good',{timeMs:TIME}),pick:(g,sup,s,att)=>chooseChampion(g,sup,s,att,'good'),skill:fightSkill('good')}};
let reasons={},kingDuels={tries:0,won:0},score={[A]:0,[B]:0,draw:0},duels={[A]:[0,0],[B]:[0,0]},plies=0;
for(let n=0;n<N;n++){const side={w:n%2?B:A,b:n%2?A:B};let g=newGame(),winner=null;
 for(let ply=0;ply<300;ply++){const P=policy[side[g.turn]],m=P.move(g);if(!m)break;
  if(captureTarget(g,m)){const sup=collectSupport(g,m),att=g.turn,sel={w:policy[side.w].pick(g,sup,'w',att),b:policy[side.b].pick(g,sup,'b',att)};
   const w=makeArena(sel,sup,g.roster,{attacker:att});w.countdown=0;let r=null,t=0;while(!r&&t<200){r=stepArena(w,1/60,autoInput(w,{w:policy[side.w].skill,b:policy[side.b].skill}));t+=1/60;}
   const win=r?.winner??null;if(captureTarget(g,m).t==='k'){kingDuels.tries++;if(win===att)kingDuels.won++;}if(win){duels[side[win]][0]++;duels[side[win==='w'?'b':'w']][1]++;}
   g=applyMove(g,m,win===null?null:win===att);g=recordWounds(g,sel,win);}
  else g=applyMove(g,m);
  const kings=['w','b'].filter(s=>g.board.some(p=>p?.s===s&&p.t==='k'));if(kings.length<2){winner=kings[0]??null;reasons.king=(reasons.king??0)+1;break;}
  const ex=['w','b'].filter(s=>exhaust(g,s));if(ex.length){winner=ex.length===2?null:ex[0]==='w'?'b':'w';reasons.roster=(reasons.roster??0)+1;break;}}
 plies+=g.ply;if(winner)score[side[winner]]++;else score.draw++;console.error(`game ${n+1}: ${winner?side[winner]+' wins':'draw'} after ${g.ply} plies`);}
console.log(JSON.stringify({score,reasons,kingDuels,duels,avgPlies:Math.round(plies/N)}));
