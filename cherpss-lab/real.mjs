// Counter matchups with realistic support drawn from simulated duels.
import {runJobs,close,COUNTER} from './lab.mjs';
export async function realEval(params,N=+(process.env.N||400)){const r=await runJobs(params,COUNTER.map(([a,b])=>({a,b,n:N,real:true})));return r.map(x=>x.pa);}
if(import.meta.url===`file://${process.argv[1]}`){const params=JSON.parse(process.argv[2]||'{}');
 const base=await runJobs(params,COUNTER.map(([a,b])=>({a,b,n:400})));const real=await realEval(params);
 COUNTER.forEach((c,i)=>console.log(`${(c[0]+'>'+c[1]).padEnd(16)} alone ${Math.round(100*base[i].pa)}%   with realistic support ${Math.round(100*real[i])}%`));close();}
