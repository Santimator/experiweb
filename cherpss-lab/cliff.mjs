import {runJobs,close} from './lab.mjs';
const N=+(process.env.N||200),jobs=[];const sets=[0,.01,.02,.03,.04,.06];
for(const v of sets)jobs.push({a:'paper',b:'rock',supB:['n','n'],n:N,params:v});
const out=[];for(const v of sets){const r=await runJobs({support:{n:{speed:v}},caps:{speed:.3}},[{a:'paper',b:'rock',supB:['n','n'],n:N}]);out.push(`knight speed ${v}/piece (Rock +${Math.round(200*v)}%): Paper wins ${Math.round(100*r[0].pa)}%`);}
const r0=await runJobs({},[{a:'paper',b:'rock',n:N}]);console.log('no support: Paper wins',Math.round(100*r0[0].pa)+'%');console.log(out.join('\n'));
for(const sp of [170,173,176,179,182]){const r=await runJobs({stats:{rock:{speed:sp}}},[{a:'paper',b:'rock',n:N}]);console.log('rock speed',sp,'Paper wins',Math.round(100*r[0].pa)+'%');}
close();
