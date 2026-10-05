import {runJobs,close} from './lab.mjs';
const N=5000,S='scissors',j=[['p','p','p'],['n'],['k'],['p','p','p','n','k']].map(a=>({a:S,b:S,supA:a,supB:['q'],n:N,tag:a.join('+')+' vs queen'}));
j.push({a:S,b:S,supA:['q'],supB:['q'],n:N,tag:'queen vs queen'});
const r=await runJobs({},j);for(const x of r)console.log(x.tag.padEnd(22),'side A wins',Math.round(100*x.pa)+'%');
// skill: same helpers, but the helped side plays worse / better
const r2=await runJobs({},[.4,.6,.8].map(q=>({a:S,b:S,supA:['p','p','p','n'],supB:['q'],qA:.6,qB:q,n:N,tag:'queen side skill '+q})));for(const x of r2)console.log(x.tag.padEnd(22),'4-helper side wins',Math.round(100*x.pa)+'%');
close();
