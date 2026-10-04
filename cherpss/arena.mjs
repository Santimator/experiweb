import {bonuses} from './engine.mjs';
export const SIZE=640;
export const STATS={rock:{hp:95,speed:173,hit:17,range:74,attackCd:1.08,specialCd:6.8,color:'#ccb895'},scissors:{hp:87,speed:202,hit:8,range:78,attackCd:.31,specialCd:7,color:'#97bdad'},paper:{hp:100,speed:187,hit:8,range:0,attackCd:.75,specialCd:5.9,color:'#a2abd7'}};
// Move tuning. The Rock hits hardest but telegraphs: its swing winds up before landing where it
// faced, and its stomp winds up before shaking the ground all around it. The Scissors' dash is
// the assassin's tool: it lunges wherever the player is moving, in for a heavy slash or out to escape.
// Attacker surge: a duel still running after surgeAt seconds starts favouring the attacker, whose
// speed, reach and damage double every surgeDouble seconds (x2 at 2:00, x4 at 3:00...). Hiding can't last.
export const RULES={surgeAt:60,surgeDouble:60,paperCastSlow:.55,rockSwingWindup:.05,rockStompWindup:.25,rockStompRadius:130,rockStomp:17,scissorsDash:115,scissorsDashHit:26,paperBlast:18,slowFactor:.55,slowTime:.8};
export function makeArena(selection,support,vitality,{duration=null,night=false,attacker='w'}={}){
 const fighters=['w','b'].map((s,i)=>{const t=selection[s],base=STATS[t],buff=bonuses(support[s]??[]),maxHp=base.hp;
 return{s,t,x:i?480:160,y:320,dx:i?-1:1,dy:0,r:21,hp:maxHp*Math.max(.3,vitality[s][t]/100),startHp:maxHp*Math.max(.3,vitality[s][t]/100),maxHp,shield:buff.shield,stamina:100,cd:0,specialCd:0,cast:0,castSlow:.12,charge:0,guard:false,guardDelay:0,slow:0,flash:0,buff,base};});
 const obstacles=[];for(const f of fighters)for(let k=0;k<f.buff.cover;k++)obstacles.push({x:f.s==='w'?210:390,y:k===0?165:425,w:40,h:50,hp:55,s:f.s});
 return{fighters,projectiles:[],effects:[],events:[],lastCountdown:null,obstacles,time:duration===60?60:null,duration:duration===60?60:null,attacker,countdown:2.4,night,elapsed:0,done:false,result:null};
}
function distance(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
function collides(f,o){const x=Math.max(o.x,Math.min(f.x,o.x+o.w)),y=Math.max(o.y,Math.min(f.y,o.y+o.h));return Math.hypot(f.x-x,f.y-y)<f.r;}
function move(world,f,dx,dy){const oldX=f.x,oldY=f.y;f.x=Math.max(25,Math.min(SIZE-25,f.x+dx));if(world.obstacles.some(o=>o.hp>0&&collides(f,o)))f.x=oldX;f.y=Math.max(25,Math.min(SIZE-25,f.y+dy));if(world.obstacles.some(o=>o.hp>0&&collides(f,o)))f.y=oldY;}
export function surge(world,f){return f.s===world.attacker&&world.elapsed>RULES.surgeAt?2**((world.elapsed-RULES.surgeAt)/RULES.surgeDouble):1;}
function dash(world,f,dx,dy,stride){for(let i=0;i<10;i++)move(world,f,dx*stride/10,dy*stride/10);effect(world,{kind:'pulse',x:f.x,y:f.y,color:'#a1d2b8'});}
function stomp(world,f){const target=world.fighters.find(x=>x!==f),r=RULES.rockStompRadius*surge(world,f);effect(world,{kind:'pulse',x:f.x,y:f.y,color:'#d6bd90'});effect(world,{kind:'quake',x:f.x,y:f.y,r,color:'#d6bd90',life:.45,total:.45});
 if(distance(f,target)<r+target.r)hit(world,target,RULES.rockStomp,f);for(const o of world.obstacles)if(distance(f,{x:o.x+o.w/2,y:o.y+o.h/2})<r+20)o.hp-=RULES.rockStomp;}
function effect(world,e){world.effects.push({life:.3,total:.3,...e});}
// Bench pieces light up when their bonus does something: aid[side][piece] = time it last helped.
function aid(world,s,...types){world.aid??={w:{},b:{}};for(const t of types)world.aid[s][t]=world.elapsed;}
function hit(world,target,raw,source){
 let damage=raw*source.buff.damage*surge(world,source);
 if(target.guard&&target.stamina>0){world.events.push('guard');damage*=.35;target.stamina=Math.max(0,target.stamina-raw*.7);effect(world,{kind:'guard',x:target.x,y:target.y,color:'#94c5db'});}
 const absorb=Math.min(target.shield,damage);target.shield-=absorb;damage-=absorb;target.hp=Math.max(0,target.hp-damage);target.flash=.16;
 if(absorb>0){world.events.push('shield');aid(world,target.s,'p','r');}if(damage>0){world.events.push('hit');if(source.buff.damage>1)aid(world,source.s,'k');}
 // A hit the shield soaks up entirely reads as "shield", not as a puzzling 0.
 const soaked=absorb>0&&Math.round(damage)===0;effect(world,{kind:'text',x:target.x,y:target.y-32,text:soaked?'shield':String(Math.round(damage)),color:soaked?'#94c5db':source.s==='w'?'#eed7ac':'#ffad91',life:.6,total:.6});
}
function melee(world,f,power,range,arc){range*=surge(world,f);const target=world.fighters.find(x=>x!==f),d=distance(f,target),dot=(f.dx*(target.x-f.x)+f.dy*(target.y-f.y))/Math.max(1,d);
 effect(world,{kind:'slash',x:f.x,y:f.y,dx:f.dx,dy:f.dy,r:range,color:f.s==='w'?'#ebd0a1':'#ed9d83'});
 if(d<range+target.r&&dot>Math.cos(arc/2))hit(world,target,power,f);
 for(const o of world.obstacles){const point={x:o.x+o.w/2,y:o.y+o.h/2};if(distance(f,point)<range+20)o.hp-=power;}
}
function projectile(world,f,special=false){world.projectiles.push({x:f.x+f.dx*28,y:f.y+f.dy*28,dx:f.dx,dy:f.dy,speed:special?350:460,r:special?15:7,life:2,power:special?RULES.paperBlast:f.base.hit,source:f,special});}
function finish(world,winner,reason){world.done=true;world.events.push(reason.includes('minute')?'timeout':'knockout');world.result={winner,reason,damage:Object.fromEntries(world.fighters.map(f=>[f.s,Math.max(0,f.startHp-f.hp)]))};}
export function stepArena(world,dt,input={w:{},b:{}}){
 if(world.done)return world.result;
 world.events=[];dt=Math.min(.04,Math.max(0,dt));if(world.countdown>0){world.countdown=Math.max(0,world.countdown-dt);const count=world.countdown>.5?Math.ceil(world.countdown-.4):0;if(count!==world.lastCountdown){world.events.push(count===0?'fight':'countdown');world.lastCountdown=count;}return null;}
 if(world.time!==null)world.time=Math.max(0,world.time-dt);if(world.elapsed<RULES.surgeAt&&world.elapsed+dt>=RULES.surgeAt){world.events.push('countdown');const f=world.fighters.find(x=>x.s===world.attacker);if(f)effect(world,{kind:'pulse',x:f.x,y:f.y,color:'#f4c45e',life:.8,total:.8});}world.elapsed+=dt;
 for(const f of world.fighters){const a=input[f.s]??{};f.cd=Math.max(0,f.cd-dt);f.specialCd=Math.max(0,f.specialCd-dt);f.cast=Math.max(0,f.cast-dt);f.slow=Math.max(0,f.slow-dt);f.flash=Math.max(0,f.flash-dt);f.chargeLeft=f.charge??0;f.charge=Math.max(0,(f.charge??0)-dt);f.guardDelay=Math.max(0,f.guardDelay-dt);
  f.guard=!!a.guard&&f.stamina>4&&f.cast===0;
  if(f.guard){f.stamina=Math.max(0,f.stamina-24*dt);f.guardDelay=.75;}else if(!f.guardDelay)f.stamina=Math.min(100,f.stamina+23*dt);
  if(f.buff.regen>0&&f.hp<f.startHp){f.hp=Math.min(f.startHp,f.hp+f.buff.regen*dt);aid(world,f.s,'b');}
  let dx=a.x??0,dy=a.y??0,length=Math.hypot(dx,dy);if(length>0&&!f.moving&&f.buff.speed>0)aid(world,f.s,'n');f.moving=length>0;if(length>0){dx/=length;dy/=length;f.dx=dx;f.dy=dy;const speed=f.base.speed*(1+f.buff.speed)*surge(world,f)*(f.guard?.46:1)*(f.slow>0?RULES.slowFactor:1)*(f.cast>0?f.castSlow:1);move(world,f,dx*speed*dt,dy*speed*dt);}
  if(Number.isFinite(a.aimX)&&Number.isFinite(a.aimY)){const aimLength=Math.hypot(a.aimX,a.aimY);if(aimLength){f.dx=a.aimX/aimLength;f.dy=a.aimY/aimLength;}}
  if(f.charge>0)[f.dx,f.dy]=f.chargeDir;
 }
 // Apply both players' movement and guard before resolving either attack.
 // Alternate who resolves first each step so neither side wins simultaneous exchanges by list order.
 world.step=(world.step??0)+1;const order=world.step%2?world.fighters:[...world.fighters].reverse();
 for(const f of order){const a=input[f.s]??{};
  // A champion knocked out earlier in this same frame cannot strike back.
  if(f.hp<=0)continue;
  if(f.chargeLeft>0&&f.charge===0){[f.dx,f.dy]=f.chargeDir;if(f.chargeKind==='swing')melee(world,f,f.base.hit,f.base.range,2.8);else stomp(world,f);}
  if(a.attack&&f.cd===0&&!f.guard&&f.cast===0){world.events.push(f.t==='paper'?'cast':'swing-'+f.t);f.cd=f.base.attackCd;f.cast=f.t==='paper'?.19:.08;// A mage casts its normal bolt on the move; specials and swings still root.
   f.castSlow=f.t==='paper'?RULES.paperCastSlow:.12;if(f.t==='paper')projectile(world,f);else if(f.t==='rock'){f.charge=Math.max(.001,RULES.rockSwingWindup);f.chargeKind='swing';f.chargeDir=[f.dx,f.dy];f.cast=RULES.rockSwingWindup+.08;}else melee(world,f,f.base.hit,f.base.range,1.8);}
  if(a.special&&f.specialCd===0&&!f.guard&&f.cast===0){world.events.push('special-'+f.t);if(f.buff.cooldown<1)aid(world,f.s,'q');if(f.t==='scissors'&&f.buff.speed>0)aid(world,f.s,'n');f.castSlow=.12;f.specialCd=f.base.specialCd*f.buff.cooldown;
   if(f.t==='paper'){f.cast=.38;projectile(world,f,true);effect(world,{kind:'pulse',x:f.x,y:f.y,color:'#b2a4eb'});}
   else if(f.t==='rock'){f.charge=Math.max(.001,RULES.rockStompWindup);f.chargeKind='stomp';f.chargeDir=[f.dx,f.dy];f.cast=RULES.rockStompWindup+.25;}
   else{const mx=a.x??0,my=a.y??0,ml=Math.hypot(mx,my);dash(world,f,ml?mx/ml:f.dx,ml?my/ml:f.dy,RULES.scissorsDash);f.cast=.08;melee(world,f,RULES.scissorsDashHit,f.base.range,1.8);}
  }
 }
 // Separate fighters without letting a collision push either through arena cover.
 const [a,b]=world.fighters,d=distance(a,b),overlap=a.r+b.r-d;if(overlap>0){const nx=d?(b.x-a.x)/d:1,ny=d?(b.y-a.y)/d:0;move(world,a,-nx*overlap/2,-ny*overlap/2);move(world,b,nx*overlap/2,ny*overlap/2);}
 for(const p of world.projectiles){p.x+=p.dx*p.speed*dt;p.y+=p.dy*p.speed*dt;p.life-=dt;const target=world.fighters.find(f=>f!==p.source);
  if(p.life>0&&distance(p,target)<p.r+target.r){hit(world,target,p.power,p.source);if(p.special)target.slow=RULES.slowTime;p.life=0;effect(world,{kind:'pulse',x:p.x,y:p.y,color:'#b2a4eb'});}
  if(p.life>0)for(const o of world.obstacles)if(o.hp>0&&p.x+p.r>o.x&&p.x-p.r<o.x+o.w&&p.y+p.r>o.y&&p.y-p.r<o.y+o.h){world.events.push('cover');aid(world,o.s,'r');o.hp-=p.power;p.life=0;break;}
 }
 world.projectiles=world.projectiles.filter(p=>p.life>0&&p.x>-30&&p.x<SIZE+30&&p.y>-30&&p.y<SIZE+30);
 world.obstacles=world.obstacles.filter(o=>o.hp>0);for(const e of world.effects)e.life-=dt;world.effects=world.effects.filter(e=>e.life>0);
 const dead=world.fighters.filter(f=>f.hp<=0);if(dead.length){if(dead.length===2)finish(world,null,'Double knockout');else finish(world,dead[0].s==='w'?'b':'w','Knockout');}
 else if(world.time===0){finish(world,world.attacker??'w','One minute · attacker wins');}
 return world.result;
}
