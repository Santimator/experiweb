// Pooled helper audit: holder's win% averaged over the three opponent picks, as logit shift vs no help.
import {runJobs,close,T,solve} from './lab.mjs';import fs from 'node:fs';
const N=+(process.env.N||1200),params=JSON.parse(fs.readFileSync(process.argv[2]));const P=['p','n','b','r','q','k'];
const lg=p=>{p=Math.min(.985,Math.max(.015,p));return Math.log(p/(1-p));};
const sets={none:[],...Object.fromEntries(P.map(t=>[t+'1',[t]])),...Object.fromEntries(P.map(t=>[t+'2',[t,t]])),p4:['p','p','p','p'],mix4:['p','p','n','b'],big5:['p','p','n','b','r'],qk:['q','k']};
const r=await runJobs(params,Object.entries(sets).flatMap(([k,s])=>T.flatMap(a=>T.map(b=>({a,b,n:k==='none'?3*N:N,supA:s,tag:[k,a,b]})))));
const pa=(k,a,b)=>r.find(x=>x.tag[0]===k&&x.tag[1]===a&&x.tag[2]===b).pa,pool=(k,a)=>T.reduce((s,b)=>s+pa(k,a,b),0)/3;
console.log('set     '+T.map(a=>a.padStart(9)).join('')+'   spread   (pooled logit shift for the holder)');
for(const k of Object.keys(sets).filter(k=>k!=='none')){const v=T.map(a=>lg(pool(k,a))-lg(pool('none',a)));console.log(k.padEnd(8)+v.map(x=>x.toFixed(2).padStart(9)).join('')+'   '+(Math.max(...v)-Math.min(...v)).toFixed(2));}
console.log('\nequilibrium for helped side: value | helped mix R/S/P | opponent mix R/S/P');
for(const k of Object.keys(sets)){const M=T.map(a=>T.map(b=>pa(k,a,b))),row=solve(M),col=solve(T.map((_,j)=>T.map((_,i)=>1-M[i][j])));console.log(k.padEnd(8),(100*row.value).toFixed(0).padStart(4)+'%',' | ',row.mix.map(x=>(100*x).toFixed(0).padStart(3)).join(' '),' | ',col.mix.map(x=>(100*x).toFixed(0).padStart(3)).join(' '));}
fs.writeFileSync('audit-'+(process.env.TAG||'x')+'.json',JSON.stringify(r.map(x=>({tag:x.tag,pa:x.pa}))));
console.log('\nwin% holder vs opponent: none / mix4 / big5');for(const a of T)for(const b of T)console.log(`${a}>${b}`.padEnd(18),['none','mix4','big5'].map(k=>Math.round(100*pa(k,a,b))+'%').join(' / '));
close();
