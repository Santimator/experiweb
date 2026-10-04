const A=await import('../cherpss/arena.mjs'),E=await import('../cherpss/engine.mjs'),B=await import('../cherpss/bots.mjs');
const n=200,tot={};let rockWins=0;
for(let k=0;k<n;k++){const w=A.makeArena({w:'rock',b:'scissors'},{w:[],b:[]},E.newGame().roster,{attacker:k%2?'w':'b'});w.countdown=0;let r=null,t=0;
 let pr=w.fighters[0].hp,ps=w.fighters[1].hp;
 while(!r&&t<200){const inp=B.autoInput(w);r=A.stepArena(w,1/60,inp);t+=1/60;const [R,S]=w.fighters;const ev=w.events;
  const dS=ps-S.hp,dR=pr-R.hp;
  if(dS>0){const src=ev.includes('special-rock')||R.chargeKind==='stomp'&&R.chargeLeft>0?'stomp':'swing';tot['rock '+src]=(tot['rock '+src]||0)+dS;}
  if(dR>0){const src=ev.includes('special-scissors')?'dash slash':'slash';tot['scissors '+src]=(tot['scissors '+src]||0)+dR;}
  for(const e of ev)if(['swing-rock','special-rock','swing-scissors','special-scissors','guard','hit'].includes(e))tot['#'+e]=(tot['#'+e]||0)+1;
  ps=S.hp;pr=R.hp;}
 if(r?.winner==='w')rockWins++;tot.time=(tot.time||0)+t;tot.rockHpLeft=(tot.rockHpLeft||0)+(r?.winner==='w'?w.fighters[0].hp:0);}
for(const k in tot)tot[k]=+(tot[k]/n).toFixed(1);console.log('rock wins',rockWins/n,tot);
