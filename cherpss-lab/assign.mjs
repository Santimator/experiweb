import {cond,show} from './cond.mjs';import {close} from './lab.mjs';import fs from 'node:fs';
const PRES={p:.60,n:.21,b:.22,r:.16,q:.12,k:.12},T=['p','n','b','r','q','k'];
const SPACE=[['p.shield',0,4,.5],['p.damage',0,.04,.005],['n.speed',0,.03,.0025],['b.cooldown',0,.3,.025],['b.power',0,.4,.05],['r.power',0,.3,.025],['q.attackSpeed',0,.3,.025],['k.damage',0,.15,.01]];
const caps={shield:24,speed:.05,regen:1.2,cooldown:.3,damage:.2,cover:2,attackSpeed:.4,power:.45};
const get=(o,p)=>p.split('.').reduce((a,k)=>a?.[k],o);function set(o,p,v){const ks=p.split('.');let a=o;for(const k of ks.slice(0,-1))a=a[k]??={};a[ks.at(-1)]=v;}
function loss(res){let l=0;const alls=res.map(x=>x.all),mean=alls.reduce((a,b)=>a+b)/3;
 for(const a of alls)l+=4*(a-mean)**2;l+=(mean-.78)**2;
 const budget=res.map(x=>T.reduce((s,t)=>s+PRES[t]*Math.max(0,-(x.und[t]??0)),0)),bm=budget.reduce((a,b)=>a+b)/3;
 for(const b of budget)l+=30*(b-bm)**2;l+=10*Math.max(0,.06-bm)**2;
 for(const x of res){const best=Math.min(...T.map(t=>x.und[t]??0));l+=2*Math.max(0,best+.14)**2;}
 return{l,budget};}
let best=JSON.parse(process.argv[2]);let r=await cond({support:best,caps},1600);let bs=loss(r);
const report=(tag,res,L)=>{console.log(tag,L.l.toFixed(4),'budgets',L.budget.map(b=>(100*b).toFixed(1)).join('/'),JSON.stringify(best));show(res);};
report('start',r,bs);
for(let it=0;it<+(process.env.ITERS||30);it++){const cand=JSON.parse(JSON.stringify(best));for(let j=0;j<1+Math.floor(Math.random()*2);j++){const [p,lo,hi,st]=SPACE[Math.floor(Math.random()*SPACE.length)];set(cand,p,+Math.min(hi,Math.max(lo,(get(cand,p)??0)+(Math.random()<.5?-1:1)*st*(1+Math.floor(Math.random()*2)))).toFixed(4));}
 const rc=await cond({support:cand,caps},1600),lc=loss(rc);if(lc.l<bs.l){const rr=await cond({support:cand,caps},1600),lr=loss(rr);const avg=(lc.l+lr.l)/2;if(avg<bs.l){best=cand;bs={l:avg,budget:lr.budget};report(it+' ACCEPT',rr,{l:avg,budget:lr.budget});fs.writeFileSync('bestassign.json',JSON.stringify(best));}}}
console.log('FINAL',JSON.stringify(best));close();
