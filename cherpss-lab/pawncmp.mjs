import {runJobs,close,T} from './lab.mjs';
const N=+(process.env.N||1500),lg=p=>{p=Math.min(.985,Math.max(.015,p));return Math.log(p/(1-p));};
const per=(r,s,p)=>({rock:r,scissors:s,paper:p});
const V={shield:{p:{shield:per(5.5,4.4,7.2)},cap:{shield:per(11,17.6,29)}},
 armor:{p:{armor:per(.045,.03,.04)},cap:{armor:per(.135,.09,.12)}},
 ward:{p:{ward:per(.45,.4,.42)},cap:{ward:per(1.35,1.2,1.26)}}};
const base=await runJobs({},T.flatMap(a=>T.map(b=>({a,b,n:2*N,tag:[a,b]}))));const pb=a=>T.reduce((s,b)=>s+base.find(x=>x.tag[0]===a&&x.tag[1]===b).pa,0)/3;
for(const [name,v] of Object.entries(V.constructor===Object?V:{})){const params={support:{p:v.p},caps:v.cap};
 const sets=[['p1',['p']],['p2',['p','p']],['p4',['p','p','p','p']]];
 const r=await runJobs(params,[...T.flatMap(a=>T.flatMap(b=>sets.map(([k,s])=>({a,b,n:N,supA:s,tag:[k,a,b]})))),...T.map(a=>({a,b:a,n:3*N,supA:['p','p','p','n'],supB:['q'],tag:['mirror',a,a]}))]);
 const sh=k=>T.map(a=>(lg(T.reduce((s,b)=>s+r.find(x=>x.tag[0]===k&&x.tag[1]===a&&x.tag[2]===b).pa,0)/3)-lg(pb(a))).toFixed(2).padStart(5));
 console.log(name.padEnd(7),'R/S/P  1 pawn',sh('p1').join(' '),' | 2 pawns',sh('p2').join(' '),' | 4 pawns',sh('p4').join(' '),' | mirror 3p+knight vs queen:',T.map(a=>a[0].toUpperCase()+' '+Math.round(100*r.find(x=>x.tag[0]==='mirror'&&x.tag[1]===a).pa)+'%').join(' '));}
close();
