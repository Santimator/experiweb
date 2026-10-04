import {runJobs,close,T} from './lab.mjs';
const N=+(process.env.N||160);
const pct=x=>String(Math.round(100*x)).padStart(3)+'%';
console.log('Row champion holds 2 rooks; win% vs column champion (no support).  WITH walls / WITHOUT walls (rook shield kept)');
for(const a of T){const row=[];for(const b of T){const [w]=await runJobs({},[{a,b,supA:['r','r'],n:N}]);const [nw]=await runJobs({support:{r:{shield:3,cover:0}}},[{a,b,supA:['r','r'],n:N}]);row.push(`${b.padEnd(8)} ${pct(w.pa)} /${pct(nw.pa)}`);}console.log(a.padEnd(9),row.join('   '));}
close();
