import {Worker} from 'node:worker_threads';
const W=4,workers=Array.from({length:W},()=>new Worker(new URL('./worker.mjs',import.meta.url)));
export async function runJobs(params,jobs){// split each job's n across workers
 const parts=workers.map(()=>[]);for(const j of jobs){const per=Math.ceil(j.n/W);for(let k=0;k<W;k++)parts[k].push({...j,n:per});}
 const res=await Promise.all(workers.map((w,k)=>new Promise(r=>{w.once('message',r);w.postMessage({params,jobs:parts[k]});})));
 return jobs.map((j,i)=>{const o={a:0,b:0,d:0,t:0,time:0,margin:0};for(const r of res)for(const k in o)o[k]+=r[i][k];const n=o.a+o.b+o.d+o.t;return{...j,n,pa:(o.a+.5*o.d+.5*o.t)/n,dbl:o.d/n,to:o.t/n,avg:o.time/n,margin:o.margin/n};});}
export function close(){workers.forEach(w=>w.terminate());}
export const T=['rock','scissors','paper'],COUNTER=[['rock','scissors'],['scissors','paper'],['paper','rock']];
// zero-sum 3x3 solve by grid search over mixed strategies: row maximizes min column payoff
export function solve(M){let best=-1,bx=null;for(let i=0;i<=100;i++)for(let j=0;j<=100-i;j++){const x=[i/100,j/100,(100-i-j)/100];let m=Infinity;for(let c=0;c<3;c++){let v=0;for(let r=0;r<3;r++)v+=x[r]*M[r][c];m=Math.min(m,v);}if(m>best){best=m;bx=x;}}return{value:best,mix:bx};}
