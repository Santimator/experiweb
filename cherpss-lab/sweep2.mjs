import {runJobs,close,COUNTER} from './lab.mjs';
const sets=JSON.parse(process.argv[2]),N=+(process.env.N||40),only=process.env.ONLY;
const pct=x=>String(Math.round(100*x)).padStart(3);
for(const params of sets){const jobs=[];const cs=only?COUNTER.filter(c=>c.join('>')===only):COUNTER;
 for(const [a,b] of cs){jobs.push({a,b,n:N});jobs.push({a,b,n:N,qA:.3,qB:.9});jobs.push({a,b,n:N,qA:.9,qB:.3});}
 const r=await runJobs(params,jobs);
 console.log(cs.map((c,i)=>`${c[0][0].toUpperCase()}>${c[1][0].toUpperCase()} ${pct(r[i*3].pa)}/${pct(r[i*3+1].pa)}/${pct(r[i*3+2].pa)} ${r[i*3].avg.toFixed(0)}s`).join(' | '),'  ',JSON.stringify(params));}
close();
