const A=await import('../cherpss/arena.mjs'),E=await import('../cherpss/engine.mjs'),B=await import('../cherpss/bots.mjs');import fs from 'node:fs';
const p=(process.env.P?JSON.parse(fs.readFileSync(process.env.P)):{});for(const k in p.stats??{})Object.assign(A.STATS[k],p.stats[k]);Object.assign(A.RULES,p.rules??{});
const [a,b,qa,qb]=process.argv.slice(2);const tot={};let wins=0;const n=20;
for(let k=0;k<n;k++){const w=A.makeArena({w:a,b},{w:[],b:[]},E.newGame().roster,{attacker:'w'});w.countdown=0;let r=null,t=0;let pw=w.fighters[0].hp,pb=w.fighters[1].hp;
 while(!r&&t<120){const inp=B.autoInput(w,{w:+qa,b:+qb});r=A.stepArena(w,1/60,inp);t+=1/60;for(const e of w.events)tot[e]=(tot[e]||0)+1;
  const [W,Bf]=w.fighters;tot.dmgToB=(tot.dmgToB||0)+Math.max(0,pb-Bf.hp);tot.dmgToW=(tot.dmgToW||0)+Math.max(0,pw-W.hp);pw=W.hp;pb=Bf.hp;tot.dsum=(tot.dsum||0)+Math.hypot(W.x-Bf.x,W.y-Bf.y);tot.frames=(tot.frames||0)+1;tot.bSlowed=(tot.bSlowed||0)+(Bf.slow>0?1:0);}
 if(r?.winner==='w')wins++;tot.time=(tot.time||0)+t;}
for(const k in tot)tot[k]=+(tot[k]/n).toFixed(1);tot.avgDist=+(tot.dsum/tot.frames).toFixed(0);tot.slowedPct=Math.round(100*tot.bSlowed/tot.frames);delete tot.dsum;
console.log(a,'(w) wins',wins,'/',n,tot);
