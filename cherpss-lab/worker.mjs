import {parentPort} from 'node:worker_threads';
const A=await import('../cherpss/arena.mjs'),E=await import('../cherpss/engine.mjs'),B=await import('../cherpss/bots.mjs');
const base=JSON.parse(JSON.stringify({stats:A.STATS,support:E.SUPPORT,caps:E.SUPPORT_CAPS,rules:A.RULES}));
function apply(p={}){for(const k in base.stats)Object.assign(A.STATS[k],base.stats[k],p.stats?.[k]??{});
 for(const k in E.SUPPORT){for(const j in E.SUPPORT[k])delete E.SUPPORT[k][j];Object.assign(E.SUPPORT[k],p.support?.[k]??base.support[k]);}
 Object.assign(E.SUPPORT_CAPS,base.caps,p.caps??{});Object.assign(A.RULES,base.rules,p.rules??{});globalThis.LAB=p.lab??{};}
function fight(a,b,supA,supB,qA,qB,swap){const sel=swap?{w:b,b:a}:{w:a,b},sup=swap?{w:supB,b:supA}:{w:supA,b:supB},sk=swap?{w:qB,b:qA}:{w:qA,b:qB};
 const w=A.makeArena(sel,{w:sup.w.map(t=>({t})),b:sup.b.map(t=>({t}))},E.newGame().roster,{attacker:Math.random()<.5?'w':'b'});w.countdown=0;
 let r=null,t=0;while(!r&&t<120){r=A.stepArena(w,1/60,B.autoInput(w,sk));t+=1/60;}
 const sa=swap?'b':'w',fa=w.fighters.find(f=>f.s===sa),fb=w.fighters.find(f=>f.s!==sa);return{margin:fa.hp/fa.maxHp-fb.hp/fb.maxHp,res:!r?'t':r.winner===null?'d':r.winner===sa?'a':'b',t};}
parentPort.on('message',({params,jobs})=>{apply(params);const out=jobs.map(j=>{const o={a:0,b:0,d:0,t:0,time:0,margin:0};for(let i=0;i<j.n;i++){const r=fight(j.a,j.b,j.supA??[],j.supB??[],j.qA??.6,j.qB??.6,i%2);o[r.res]++;o.time+=r.t;o.margin+=r.margin;}return o;});parentPort.postMessage(out);});
