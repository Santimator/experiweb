import {runJobs,close} from './lab.mjs';
const N=6000,j=[
 {a:'scissors',b:'scissors',supA:['p','p','p','n'],supB:['q'],n:N,tag:'3 pawns+knight vs queen'},
 {a:'scissors',b:'scissors',supA:['p','p','p','n'],supB:[],n:N,tag:'3 pawns+knight vs nothing'},
 {a:'scissors',b:'scissors',supA:['q'],supB:[],n:N,tag:'queen vs nothing'},
 {a:'scissors',b:'scissors',supA:[],supB:[],n:N,tag:'nothing vs nothing'},
 {a:'rock',b:'rock',supA:['p','p','p','n'],supB:['q'],n:N,tag:'ROCK mirror, same helpers'},
 {a:'paper',b:'paper',supA:['p','p','p','n'],supB:['q'],n:N,tag:'PAPER mirror, same helpers'}];
const r=await runJobs({},j);for(const x of r)console.log(x.tag.padEnd(28),'side A wins',Math.round(100*x.pa)+'%','  avg fight',x.avg.toFixed(1)+'s','  avg HP margin',(100*x.margin).toFixed(0)+'%');close();
