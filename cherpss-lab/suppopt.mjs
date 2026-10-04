// Support-phase evaluation/optimisation on top of fixed champion stats.
import {runJobs,close,T,COUNTER,solve} from './lab.mjs';
import fs from 'node:fs';
const base=process.env.BASE?JSON.parse(fs.readFileSync(process.env.BASE)):{},N=+(process.env.N||48),ITERS=+(process.env.ITERS||0);
const types=['p','n','b','r','q','k'];
// support space: per-piece values
const SPACE=[['support.p.shield',0,12,1],['support.n.speed',0,.12,.01],['support.b.regen',0,2,.1],['support.r.shield',0,14,1],['support.q.cooldown',0,.25,.02],['support.k.damage',0,.2,.02]];
const get=(o,p)=>p.split('.').reduce((a,k)=>a?.[k],o);function set(o,p,v){const ks=p.split('.');let a=o;for(const k of ks.slice(0,-1))a=a[k]??={};a[ks.at(-1)]=v;}
const merge=s=>({...base,support:s.support,caps:{shield:40,speed:.3,regen:3,cooldown:.4,damage:.4,cover:2,power:1}});
export async function evaluate(sp,verbose){const params=merge(sp);let jobs=[];
 for(const [a,b] of COUNTER)for(const t of types){jobs.push({a,b,supB:[t,t],n:N});jobs.push({a,b,supA:[t,t],n:N});}
 for(const t of types)for(const a of T)for(const b of T)jobs.push({a,b,supA:[t,t],n:N});
 const r=await runJobs(params,jobs);let loss=0;const lines=[];
 // levers
 COUNTER.forEach(([a,b],i)=>{const und=types.map((t,k)=>r[i*12+k*2].pa),fav=types.map((t,k)=>r[i*12+k*2+1].pa);
  // best tide-turner should bring the favourite to ~50%; others should still matter a bit but not flip
  const minU=Math.min(...und);loss+=(minU-.5)**2*2;for(const u of und)if(u<.35)loss+=(.35-u)**2*3;
  for(const f of fav)if(f>.9)loss+=(f-.9)**2*2;
  lines.push(`${(a+'>'+b).padEnd(15)} underdog+2: `+types.map((t,k)=>`${t}${Math.round(100*und[k])}`).join(' ')+`   favourite+2: `+types.map((t,k)=>`${t}${Math.round(100*fav[k])}`).join(' '));});
 // pick game
 const off=36;types.forEach((t,k)=>{const M=T.map((x,i)=>T.map((y,j)=>r[off+k*9+i*3+j].pa));const s=solve(M);const minMix=Math.min(...s.mix);
  if(s.value>.66)loss+=(s.value-.66)**2*4;if(minMix<.12)loss+=(.12-minMix)**2*6;if(s.value<.52)loss+=(.52-s.value)**2*2;
  lines.push(`pick 2×${t}: value ${Math.round(100*s.value)}% mix R${Math.round(100*s.mix[0])}/S${Math.round(100*s.mix[1])}/P${Math.round(100*s.mix[2])}  matrix ${M.map(row=>row.map(v=>Math.round(100*v)).join(',')).join(' | ')}`);});
 return{loss,lines};}
let best={support:JSON.parse(process.env.SUPPORT||'{"p":{"shield":4},"n":{"speed":0.04},"b":{"regen":0.6},"r":{"shield":7,"cover":1},"q":{"cooldown":0.09},"k":{"damage":0.06}}')};
let bs=await evaluate(best);console.log('start',bs.loss.toFixed(4));console.log(bs.lines.join('\n'));
for(let it=0;it<ITERS;it++){const cand=JSON.parse(JSON.stringify(best));const k=1+Math.floor(Math.random()*2);
 for(let j=0;j<k;j++){const [p,lo,hi,st]=SPACE[Math.floor(Math.random()*SPACE.length)];const v=(get(cand,p)??0)+(Math.random()<.5?-1:1)*st*(1+Math.floor(Math.random()*3));set(cand,p,+Math.min(hi,Math.max(lo,v)).toFixed(3));}
 const cs=await evaluate(cand);if(cs.loss<bs.loss){const re=await evaluate(cand);const avg=(cs.loss+re.loss)/2;if(avg<bs.loss){best=cand;bs={loss:avg,lines:re.lines};console.log(it,'ACCEPT',avg.toFixed(4),JSON.stringify(best.support));fs.writeFileSync('bestsupport.json',JSON.stringify(best));}}}
if(ITERS){console.log('FINAL');console.log(bs.lines.join('\n'));}
close();
