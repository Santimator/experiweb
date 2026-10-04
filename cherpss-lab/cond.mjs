// Realistic support: favourite win% overall, and how it moves when the underdog (or favourite) has a given piece nearby.
import {runJobs,close,COUNTER} from './lab.mjs';
const T=['p','n','b','r','q','k'],pct=x=>x==null?'  - ':String(Math.round(100*x)).padStart(3)+'%';
export async function cond(params,N=+(process.env.N||1600)){
 const r=await runJobs(params,COUNTER.map(([a,b])=>({a,b,n:N,real:true,record:true})));
 return r.map(x=>{const win=res=>res==='a'?1:res==='b'?0:.5,all=x.rec.reduce((s,[,,res])=>s+win(res),0)/x.rec.length;
  const und={},fav={};for(const t of T){const u=x.rec.filter(([sa,sb])=>sb.includes(t)),f=x.rec.filter(([sa,sb])=>sa.includes(t)),un=x.rec.filter(([sa,sb])=>!sb.includes(t));
   und[t]=u.length>40?u.reduce((s,[,,res])=>s+win(res),0)/u.length-un.reduce((s,[,,res])=>s+win(res),0)/un.length:null;
   fav[t]=f.length>40?f.reduce((s,[,,res])=>s+win(res),0)/f.length-x.rec.filter(([sa])=>!sa.includes(t)).reduce((s,[,,res])=>s+win(res),0)/x.rec.filter(([sa])=>!sa.includes(t)).length:null;}
  return{all,und,fav};});}
export function show(res){COUNTER.forEach((c,i)=>{const x=res[i];console.log(`${(c[0]+'>'+c[1]).padEnd(15)} ${pct(x.all)} | underdog has: `+T.map(t=>`${t}${x.und[t]==null?' -':(x.und[t]>=0?'+':'')+Math.round(100*x.und[t])}`).join(' ')+` | favourite has: `+T.map(t=>`${t}${x.fav[t]==null?' -':(x.fav[t]>=0?'+':'')+Math.round(100*x.fav[t])}`).join(' '));});}
if(import.meta.url===`file://${process.argv[1]}`){const res=await cond(JSON.parse(process.argv[2]||'{}'));console.log('favourite win% with realistic support | change in favourite win% when a side has that piece nearby');show(res);close();}
