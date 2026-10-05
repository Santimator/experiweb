// Fit each helper's per-champion magnitude so one copy shifts the holder's win logit by a target, for every champion.
import {runJobs,close,T} from './lab.mjs';import fs from 'node:fs';
const N=+(process.env.N||600),P=['p','n','b','r','q','k'];
const MAX=JSON.parse(process.env.MAX||'{"p":24,"n":0.1,"b":0.2,"r":0.45,"q":0.16,"k":0.16}'),TARGET=JSON.parse(process.env.TARGET||'{"p":0.3,"n":0.55,"b":0.65,"r":0.65,"q":0.8,"k":0.8}');
export const shape={p:m=>({shield:m}),n:m=>({speed:m}),b:m=>({cooldown:m,power:.83*m}),r:m=>({power:m}),q:m=>({attackSpeed:m}),k:m=>({damage:m})};
const BIG={shield:1e9,speed:1e9,cooldown:.9,damage:1e9,attackSpeed:.9,power:1e9};
const lg=p=>{p=Math.min(.985,Math.max(.015,p));return Math.log(p/(1-p));};
const base=await runJobs({caps:BIG},T.flatMap(a=>T.map(b=>({a,b,n:4*N,tag:[a,b]}))));const B=(a,b)=>base.find(x=>x.tag[0]===a&&x.tag[1]===b).pa;
const levels=[.25,.5,.75,1],pts={};
for(const g of levels){const support=Object.fromEntries(P.map(t=>[t,shape[t](g*MAX[t])]));
 const r=await runJobs({support,caps:BIG},P.flatMap(t=>T.flatMap(a=>T.map(b=>({a,b,n:N,supA:[t],tag:[t,a,b]})))));
 for(const t of P)for(const a of T){const pw=T.reduce((acc,b)=>acc+r.find(x=>x.tag[0]===t&&x.tag[1]===a&&x.tag[2]===b).pa,0)/3,pb=T.reduce((acc,b)=>acc+B(a,b),0)/3,s=lg(pw)-lg(pb);(pts[t+a]??=[]).push([g*MAX[t],s]);}
 console.error('level',g,'done');}
const fit={};for(const t of P){fit[t]={};for(const a of T){const xy=pts[t+a];
 // least squares shift = c1 m + c2 m^2, then solve for the target (fallback: linear)
 let s11=0,s12=0,s22=0,y1=0,y2=0;for(const [m,y] of xy){s11+=m*m;s12+=m**3;s22+=m**4;y1+=m*y;y2+=m*m*y;}const det=s11*s22-s12*s12,c1=(y1*s22-y2*s12)/det,c2=(s11*y2-s12*y1)/det;
 const tg=TARGET[t];let m=null;for(let k=1;k<=400;k++){const x=MAX[t]*1.5*k/400;if(c1*x+c2*x*x>=tg){m=x;break;}}if(m==null)m=tg/Math.max(1e-6,y1/s11);
 fit[t][a]=+m.toFixed(4);console.log(t,a,xy.map(([m,y])=>`${+m.toFixed(3)}:${y.toFixed(2)}`).join(' '),'->',fit[t][a]);}}
fs.writeFileSync('helpfit.json',JSON.stringify(fit,null,1));close();
