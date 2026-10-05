// Iteratively calibrate per-champion helper values: one copy should shift the holder's pooled win logit by TARGET[piece].
import {runJobs,close,T} from './lab.mjs';import fs from 'node:fs';
const N=+(process.env.N||1500),ROUNDS=+(process.env.ROUNDS||3),P=['p','n','b','r','q','k'];
const TARGET=JSON.parse(process.env.TARGET||'{"p":0.3,"n":0.3,"b":0.4,"r":0.55,"q":0.7,"k":0.7}');
const LIMIT={p:30,n:.2,b:.3,r:.9,q:.25,k:.25};
const shape={p:m=>({shield:m}),n:m=>({speed:m}),b:m=>({cooldown:m,power:+(.83*m).toFixed(4)}),r:m=>({power:m}),q:m=>({attackSpeed:m}),k:m=>({damage:m})};
const BIG={shield:1e9,speed:1e9,cooldown:.9,damage:1e9,attackSpeed:.9,power:1e9};
const lg=p=>{p=Math.min(.985,Math.max(.015,p));return Math.log(p/(1-p));};
let V=JSON.parse(fs.readFileSync(process.argv[2]));
const UNDER={rock:'paper',scissors:'rock',paper:'scissors'},OPP=a=>[a,UNDER[a]];
const base=await runJobs({caps:BIG},T.flatMap(a=>OPP(a).map(b=>({a,b,n:3*N,tag:[a,b]}))));const B=(a,b)=>base.find(x=>x.tag[0]===a&&x.tag[1]===b).pa;
export function supportOf(V){const out={};for(const t of P){out[t]={};for(const a of T)for(const [k,v] of Object.entries(shape[t](V[t][a])))(out[t][k]??={})[a]=v;}return out;}
for(let round=0;round<=ROUNDS;round++){
 const r=await runJobs({support:supportOf(V),caps:BIG},P.flatMap(t=>T.flatMap(a=>OPP(a).map(b=>({a,b,n:N,supA:[t],tag:[t,a,b]})))));
 const S={};for(const t of P){S[t]={};for(const a of T){const W=b=>r.find(x=>x.tag[0]===t&&x.tag[1]===a&&x.tag[2]===b).pa;S[t][a]=.6*(lg(W(UNDER[a]))-lg(B(a,UNDER[a])))+.4*(lg(W(a))-lg(B(a,a)));}}
 console.log(`round ${round}`);for(const t of P)console.log(' ',t,'target',TARGET[t],T.map(a=>`${a}:${V[t][a]}→${S[t][a].toFixed(2)}`).join('  '));
 fs.writeFileSync('calib-out.json',JSON.stringify({V,S},null,1));
 if(round===ROUNDS)break;
 const nv={};for(const t of P){nv[t]={};for(const a of T){const s=Math.max(.03,S[t][a]),f=Math.min(1.6,Math.max(.6,(TARGET[t]/s)**.7));nv[t][a]=+Math.min(LIMIT[t],V[t][a]*f).toPrecision(3);}}V=nv;}
close();
