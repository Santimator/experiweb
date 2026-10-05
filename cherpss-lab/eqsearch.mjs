// Score per-champion multipliers on the helped side's pick equilibrium: how far from an even split it drifts.
import {runJobs,close,T,solve} from './lab.mjs';import fs from 'node:fs';
const N=+(process.env.N||800),P=['p','n','b','r','q','k'];
const base=JSON.parse(fs.readFileSync(process.env.BASE||'params-help.json'));
const sets={p1:['p'],n1:['n'],b1:['b'],r1:['r'],q1:['q'],k1:['k'],p2:['p','p'],mix3:['p','n','b'],mix4:['p','p','n','b'],big5:['p','p','n','b','r'],qk:['q','k'],rk:['r','k']};
export function scaled(g){const p=JSON.parse(JSON.stringify(base));for(const part of ['support','caps']){const walk=o=>{for(const [k,v] of Object.entries(o)){if(v&&typeof v==='object'&&'rock' in v){for(const a of T)v[a]=+(v[a]*g[a]).toPrecision(3);}else if(v&&typeof v==='object')walk(v);}};if(p[part])walk(p[part]);}return p;}
const none=await runJobs({},T.flatMap(a=>T.map(b=>({a,b,n:2*N,tag:['none',a,b]}))));
for(const g of JSON.parse(process.argv[2])){const params=scaled(g);
 const r=[...none,...await runJobs(params,Object.entries(sets).flatMap(([k,s])=>T.flatMap(a=>T.map(b=>({a,b,n:N,supA:s,tag:[k,a,b]})))))];
 const pa=(k,a,b)=>r.find(x=>x.tag[0]===k&&x.tag[1]===a&&x.tag[2]===b).pa;let score=0;const lines=[];
 for(const k of Object.keys(sets)){const M=T.map(a=>T.map(b=>pa(k,a,b))),row=solve(M),col=solve(T.map((_,j)=>T.map((_,i)=>1-M[i][j])));
  const d=row.mix.concat(col.mix).reduce((s,x)=>s+Math.abs(x-1/3),0);score+=d;lines.push(`${k}:${Math.round(100*row.value)}% [${row.mix.map(x=>Math.round(100*x)).join('/')}|${col.mix.map(x=>Math.round(100*x)).join('/')}]`);}
 console.log(JSON.stringify(g),'score',(score/Object.keys(sets).length).toFixed(2));console.log('  '+lines.join('  '));}
close();
