import {runJobs,close,T,COUNTER,solve} from './lab.mjs';
const N=+(process.env.N||80);
const EFFECTS=[['attackSpeed',[.08,.15],'faster normal attacks'],['reach',[6,12],'longer melee reach (px)'],['lifesteal',[.1,.2],'heal % of damage dealt'],['armor',[.08,.15],'less damage taken'],['power',[.15,.3],'stronger specials'],['interrupt',[.25,.5],'hits cancel wind-ups (chance)'],
 ['cooldown',[.1,.2],'special recharges faster'],['speed',[.02,.05],'move faster'],['shield',[4,8],'shield HP'],['regen',[.5,1],'HP per second'],['damage',[.08,.15],'more damage']];
const caps={shield:60,speed:.3,regen:4,cooldown:.5,damage:.5,cover:2,attackSpeed:.6,reach:40,lifesteal:.6,armor:.6,power:1,interrupt:1};
const pct=x=>String(Math.round(100*x)).padStart(3);
console.log('per piece | S>R w/ 2 on Scissors (Rock wins%) | P>S? Paper+2 (Scissors wins%) | Rock+2 vs Paper (Paper wins%) | pick game: value, mix R/S/P');
const r0=await runJobs({},COUNTER.map(([a,b])=>({a,b,n:N})));console.log('baseline  ',COUNTER.map((c,i)=>c.join('>')+' '+pct(r0[i].pa)).join('  '));
for(const [eff,levels,desc] of EFFECTS)for(const m of levels){
 const params={support:{p:{shield:0,[eff]:m}},caps};const jobs=[];
 for(const [a,b] of COUNTER)jobs.push({a,b,supB:['p','p'],n:N});
 for(const a of T)for(const b of T)jobs.push({a,b,supA:['p','p'],n:N});
 const r=await runJobs(params,jobs);const M=T.map((x,i)=>T.map((y,j)=>r[3+i*3+j].pa));const s=solve(M);
 console.log(`${(eff+' '+m).padEnd(17)} R>S ${pct(r[0].pa)}%   S>P ${pct(r[1].pa)}%   P>R ${pct(r[2].pa)}%   | pick ${pct(s.value)}%  mix ${s.mix.map(x=>Math.round(100*x)).join('/')}  (${desc})`);}
close();
