// Pooled single-pawn effect per holder champion for alternative pawn stats.
import {runJobs,close,T} from './lab.mjs';
const N=+(process.env.N||1500),lg=p=>{p=Math.min(.985,Math.max(.015,p));return Math.log(p/(1-p));};
const base=await runJobs({},T.flatMap(a=>T.map(b=>({a,b,n:2*N,tag:[a,b]}))));const pb=a=>T.reduce((s,b)=>s+base.find(x=>x.tag[0]===a&&x.tag[1]===b).pa,0)/3;
for(const [stat,vals] of JSON.parse(process.argv[2]))for(const v of vals){const support={p:{[stat]:v}};
 const r=await runJobs({support},T.flatMap(a=>T.map(b=>[['p1',['p']],['p2',['p','p']]].map(([k,s])=>({a,b,n:N,supA:s,tag:[k,a,b]}))).flat()));
 const sh=k=>T.map(a=>(lg(T.reduce((s,b)=>s+r.find(x=>x.tag[0]===k&&x.tag[1]===a&&x.tag[2]===b).pa,0)/3)-lg(pb(a))).toFixed(2));
 console.log(`${stat}=${v}`.padEnd(13),'1 pawn R/S/P',sh('p1').join(' '),' | 2 pawns',sh('p2').join(' '));}
close();
