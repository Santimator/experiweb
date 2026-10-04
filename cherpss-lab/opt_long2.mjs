import {runJobs,close,COUNTER} from './lab.mjs';
import fs from 'node:fs';
const N=+(process.env.N||40),ITERS=+(process.env.ITERS||60);
// parameter space: [path, min, max, step]
const SPACE=[
['stats.rock.range',60,85,3],['stats.scissors.range',55,78,3],['stats.rock.hp',100,280,8],['stats.rock.speed',135,195,3],['rules.paperCastSlow',.3,1,.05],['stats.rock.hit',10,22,1],['stats.rock.attackCd',.6,1.1,.05],
['rules.rockSwingWindup',.03,.4,.02],['rules.rockStompWindup',.15,.6,.03],['rules.rockStompRadius',80,170,5],['rules.rockStomp',8,28,1],
['stats.scissors.hp',90,260,8],['stats.scissors.speed',185,235,4],['stats.scissors.hit',6,13,1],['stats.scissors.attackCd',.25,.5,.03],['rules.scissorsDash',100,190,10],
['rules.slowFactor',.35,.85,.05],['rules.slowTime',.8,2.6,.2],['stats.paper.specialCd',3.5,6.5,.3],['stats.scissors.specialCd',4,8,.4],['rules.scissorsDashHit',10,30,1],['stats.rock.specialCd',4,8,.4],['stats.paper.hp',100,280,8],['stats.paper.speed',165,205,3],['stats.paper.hit',6,14,1],['stats.paper.attackCd',.5,.9,.05],['rules.paperBlast',8,22,1],['rules.blinkDistance',100,260,15],['rules.blinkCd',4,14,.5]];
const get=(o,p)=>p.split('.').reduce((a,k)=>a?.[k],o);function set(o,p,v){const ks=p.split('.');let a=o;for(const k of ks.slice(0,-1))a=a[k]??={};a[ks.at(-1)]=v;}
const SK=[[.6,.6,.85,1],[.45,.75,.60,.7],[.3,.9,.35,.4]];
async function score(params,n=N){const jobs=[];for(const [a,b] of COUNTER)for(const [qa,qb] of SK)jobs.push({a,b,qA:qa,qB:qb,n});
 const r=await runJobs(params,jobs);let loss=0;const rows=[];
 COUNTER.forEach((c,i)=>{const row=[];SK.forEach(([,,target,w],k)=>{const x=r[i*3+k];loss+=w*(x.pa-target)**2;if(k===0)loss+=.5*(x.margin-.2)**2;row.push(Math.round(100*x.pa));if(k===0){if(x.avg<14)loss+=.4*((14-x.avg)/14)**2;if(x.avg>35)loss+=.25*((x.avg-35)/35)**2;}});rows.push(`${c[0][0].toUpperCase()}>${c[1][0].toUpperCase()} ${row.join('/')} m${r[i*3].margin.toFixed(2)} ${r[i*3].avg.toFixed(0)}s`);});
 return{loss,rows:rows.join(' | ')};}
let best=JSON.parse(process.argv[2]||'{}');
const A=await import('../cherpss/arena.mjs'),defaults=JSON.parse(JSON.stringify({stats:A.STATS,rules:A.RULES}));for(const [p] of SPACE)if(get(best,p)===undefined)set(best,p,get(defaults,p));
let bs=await score(best);console.log('start',bs.loss.toFixed(4),bs.rows);
for(let it=0;it<ITERS;it++){const cand=JSON.parse(JSON.stringify(best));const k=1+Math.floor(Math.random()*3);
 for(let j=0;j<k;j++){const [p,lo,hi,st]=SPACE[Math.floor(Math.random()*SPACE.length)];const v=get(cand,p)+(Math.random()<.5?-1:1)*st*(1+Math.floor(Math.random()*2));set(cand,p,+Math.min(hi,Math.max(lo,v)).toFixed(3));}
 const cs=await score(cand);
 if(cs.loss<bs.loss){const re=await score(cand);const avg=(cs.loss+re.loss)/2;const bre=await score(best);const bavg=(bs.loss+bre.loss)/2;
  if(avg<bavg){best=cand;bs={loss:avg,rows:re.rows};console.log(it,'ACCEPT',avg.toFixed(4),re.rows,JSON.stringify(best));fs.writeFileSync('best.json',JSON.stringify(best));}else bs.loss=bavg;}
}
console.log('FINAL',JSON.stringify(best));close();
