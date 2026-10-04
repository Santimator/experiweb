import {runJobs,close,T,solve} from './lab.mjs';
const params=JSON.parse(process.argv[2]),N=+(process.env.N||160),types=['p','n','b','r','q','k'];
const pct=x=>Math.round(100*x);
for(const t of types){const jobs=[];for(const a of T)for(const b of T)jobs.push({a,b,supA:[t],supB:[],n:N});const r=await runJobs(params,jobs);const M=T.map((x,i)=>T.map((y,j)=>r[i*3+j].pa));const s=solve(M);const pure=T.map((x,i)=>Math.min(...M[i]));
 console.log(`1×${t}: side ahead ${pct(s.value)}%  best mix R${pct(s.mix[0])}/S${pct(s.mix[1])}/P${pct(s.mix[2])}  safest single pick ${T[pure.indexOf(Math.max(...pure))]} (worst case ${pct(Math.max(...pure))}%)  rows R:${M[0].map(pct)} S:${M[1].map(pct)} P:${M[2].map(pct)}`);}
close();
