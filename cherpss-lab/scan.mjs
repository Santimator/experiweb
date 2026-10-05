import {runJobs,close,T} from './lab.mjs';
const N=+(process.env.N||2000),UNDER={rock:'paper',scissors:'rock',paper:'scissors'};
const shape={p:m=>({shield:m}),n:m=>({speed:m}),b:m=>({cooldown:m,power:+(.83*m).toFixed(4)}),r:m=>({power:m}),q:m=>({attackSpeed:m}),k:m=>({damage:m})};
const BIG={shield:1e9,speed:1e9,cooldown:.9,damage:1e9,attackSpeed:.9,power:1e9};
const lg=p=>{p=Math.min(.985,Math.max(.015,p));return Math.log(p/(1-p));};
const GRID=JSON.parse(process.argv[2]);// {"q.rock":[...], ...} all same length
const keys=Object.keys(GRID),L=GRID[keys[0]].length;
const base=await runJobs({caps:BIG},T.flatMap(a=>[a,UNDER[a]].map(b=>({a,b,n:3*N,tag:[a,b]}))));const B=(a,b)=>base.find(x=>x.tag[0]===a&&x.tag[1]===b).pa;
const out={};for(let i=0;i<L;i++){
 // each key gets its own fake piece slot so values don't collide: use different pieces only
 const support={};for(const k of keys){const [t,a]=k.split('.');support[t]??={};for(const [s,v] of Object.entries(shape[t](GRID[k][i])))(support[t][s]??={})[a]=v;}
 const r=await runJobs({support,caps:BIG},keys.flatMap(k=>{const [t,a]=k.split('.');return [a,UNDER[a]].map(b=>({a,b,n:N,supA:[t],tag:[k,b]}));}));
 for(const k of keys){const a=k.split('.')[1],W=b=>r.find(x=>x.tag[0]===k&&x.tag[1]===b).pa,u=lg(W(UNDER[a]))-lg(B(a,UNDER[a])),m=lg(W(a))-lg(B(a,a));(out[k]??=[]).push(`${GRID[k][i]}:${(.6*u+.4*m).toFixed(2)}(u${u.toFixed(2)} m${m.toFixed(2)})`);}}
for(const k of keys)console.log(k.padEnd(12),out[k].join('  '));close();
