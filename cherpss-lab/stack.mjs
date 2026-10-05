// Helper strength audit: logit shift in win% from helpers, per piece and per champion type, plus lopsided stacks.
import {runJobs,close,T} from './lab.mjs';
const P=['p','n','b','r','q','k'],N=+(process.env.N||300),params=JSON.parse(process.argv[2]||'{}');
const lg=p=>Math.log(Math.min(.98,Math.max(.02,p))/(1-Math.min(.98,Math.max(.02,p))));
const jobs=[];for(const a of T)for(const b of T){jobs.push({a,b,n:N,tag:['base',a,b]});for(const t of P)jobs.push({a,b,n:N,supA:[t,t],tag:[t,a,b]});
 jobs.push({a,b,n:N,supA:['p','p','n','b'],tag:['stack4',a,b]});jobs.push({a,b,n:N,supA:['p','p','n','b','r'],supB:['p'],tag:['5v1',a,b]});}
const t0=Date.now(),r=await runJobs(params,jobs);const get=(k,a,b)=>r.find(x=>x.tag[0]===k&&x.tag[1]===a&&x.tag[2]===b).pa;
console.log('logit shift for the holder (2 copies), averaged over opponents | rows: piece, cols: holder champion');
const rows={};for(const t of [...P,'stack4','5v1']){const cols=T.map(a=>T.reduce((s,b)=>s+lg(get(t,a,b))-lg(get('base',a,b)),0)/3);rows[t]=cols;
 console.log(t.padEnd(7),cols.map(x=>x.toFixed(2).padStart(6)).join(' '),' mean',(cols.reduce((a,b)=>a+b)/3).toFixed(2),' spread',(Math.max(...cols)-Math.min(...cols)).toFixed(2));}
console.log('win% for holder: base / stack4 / 5v1');for(const a of T)for(const b of T)console.log(`${a}>${b}`.padEnd(18),[get('base',a,b),get('stack4',a,b),get('5v1',a,b)].map(x=>Math.round(100*x)+'%').join(' / '));
console.log('secs',Math.round((Date.now()-t0)/1000));close();
