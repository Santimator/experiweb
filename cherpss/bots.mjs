import {RULES,ARENA,insideArena} from './arena.mjs';
// The same local AI policy drives both sides; champion choice stays with the players.
// Movement scores a ring of candidate directions: keep a preferred range, stay out of
// walls and corners, avoid cover, keep some momentum, and wander a little.
// Skill (0..1) stands in for a human player's execution: reactions, aim, footwork and timing.
const DIRS=Array.from({length:16},(_,i)=>[Math.cos(i*Math.PI/8),Math.sin(i*Math.PI/8)]);
const PREFERRED={rock:57,scissors:49,paper:230},BOLT_SPEED=460;
export const DEFAULT_SKILL=.6;
const CLOSE=1.5;
// Distance to the ring along the ray from the centre, penalised inside a 110px band like the old square walls.
function wallPenalty(x,y){const dx=x-ARENA.cx,dy=y-ARENA.cy,d=Math.hypot(dx,dy)||1,c=dx/d,s=dy/d,edge=1/Math.hypot(c/ARENA.rx,s/ARENA.ry),gap=Math.max(0,110-(edge-d));return gap*gap/100;}
function blocked(world,x,y){return world.obstacles.some(o=>x>o.x-24&&x<o.x+o.w+24&&y>o.y-24&&y<o.y+o.h+24);}
function steer(world,f,enemy,desired,q,{lookahead=60,rangeWeight=1,wallWeight=1,chase=false}={}){
 f.ai??={dir:null,wander:0,wanderAt:0};
 if(world.elapsed>=f.ai.wanderAt){f.ai.wander=(Math.random()-.5)*(.8+(1-q)*1.6);f.ai.wanderAt=world.elapsed+.35+Math.random()*.5;}
 const noise=3+20*(1-q);let best=null,bestScore=-Infinity;
 // Judge each step against where the enemy will be by then, not where it is now.
 const tau=lookahead/(f.base.speed*(1+f.buff.speed)),es=enemy.moving?enemy.base.speed*(1+enemy.buff.speed)*(enemy.slow>0?.65:1)*tau:0,px=enemy.x+enemy.dx*es,py=enemy.y+enemy.dy*es;
 for(const [dx,dy] of DIRS){const x=f.x+dx*lookahead,y=f.y+dy*lookahead;
  if(!insideArena(x,y)||blocked(world,x,y))continue;
  const d=Math.hypot(px-x,py-y);
  // Being too close is worse than being too far: closing in again is easy, escaping is not.
  let score=chase?-d:-(d<desired?(desired-d)*CLOSE:d-desired)*rangeWeight-wallPenalty(x,y)*wallWeight;
  if(f.ai.dir)score+=(dx*f.ai.dir[0]+dy*f.ai.dir[1])*14;
  // Wander: bias toward one side of the enemy so kiting curves instead of jittering.
  const ex=enemy.x-f.x,ey=enemy.y-f.y,el=Math.hypot(ex,ey)||1;score+=(dx*-ey/el+dy*ex/el)*f.ai.wander*12;
  score+=Math.random()*noise;
  if(score>bestScore){bestScore=score;best=[dx,dy];}
 }
 if(!best){const tx=ARENA.cx-f.x,ty=ARENA.cy-f.y,tl=Math.hypot(tx,ty)||1;best=[tx/tl,ty/tl];}
 f.ai.dir=best;return best;
}
// Reaction time: a condition must hold this long before the bot acts on it (~160 ms at 0.6 skill).
function reacted(world,f,key,cond,q){f.ai.since??={};if(!cond){f.ai.since[key]=null;return false;}f.ai.since[key]??=world.elapsed+(.28-.2*q)*(.6+.8*Math.random());return world.elapsed>=f.ai.since[key];}
function skillOf(skill,s){return typeof skill==='number'?skill:skill?.[s]??DEFAULT_SKILL;}
export function autoInput(world,skill=DEFAULT_SKILL){
 const controls={};
 for(const f of world.fighters){const enemy=world.fighters.find(x=>x!==f),vx=enemy.x-f.x,vy=enemy.y-f.y,d=Math.hypot(vx,vy)||1,nx=vx/d,ny=vy/d;
  const q=skillOf(skill,f.s),react=.1+.5*q,mirror=enemy.t===f.t;
  f.ai??={dir:null,wander:0,wanderAt:0};
  let x=0,y=0;
  // Scissors against Rock: wait outside its reach, dart in while its swing recovers.
  // Against the Rock: bait a swing by stepping into its reach, then punish while it recovers.
  const opening=enemy.t==='rock'&&enemy.charge===0&&(enemy.cd>.3||enemy.cast>0);
  if(f.t==='scissors'&&enemy.t==='rock')f.ai.engage=reacted(world,f,'open',opening,q);
  // A telegraphed charge is coming this way: step off its line (if the player reads it in time).
  // A Rock is winding up and this fighter is inside the blow: back out (if read in time).
  const threatened=enemy.charge>0&&(enemy.chargeKind==='stomp'?d<RULES.rockStompRadius+f.r+25:d<enemy.base.range+60&&(enemy.chargeDir[0]*-vx+enemy.chargeDir[1]*-vy)/d>.5);
  f.ai.dodge=reacted(world,f,'dodge',threatened,q);
  if(f.ai.dodge){x=-nx;y=-ny;}
  else if(f.t==='paper'){
   // A mage kites: hold long range, prefer open space, never get pinned.
   [x,y]=steer(world,f,enemy,mirror?160:PREFERRED.paper,q,{rangeWeight:mirror?1:2,wallWeight:1.4});
  }else if(f.t==='scissors'&&enemy.t==='rock'&&!f.ai.engage){
   // Out of swing reach; out of dash reach too while the Rock's dash is ready.
   if(world.elapsed>=(f.ai.baitAt??0)){f.ai.baitAt=world.elapsed+.9+Math.random()*.9;f.ai.baitEnd=world.elapsed+.25;}
   // While the stomp is ready, wait outside its circle; otherwise hover at the edge of the swing.
   const stompReady=enemy.specialCd<.5,baiting=!stompReady&&world.elapsed<f.ai.baitEnd&&enemy.cd===0;
   [x,y]=steer(world,f,enemy,stompReady?RULES.rockStompRadius+f.r+30:enemy.base.range+f.r+(baiting?-6:30),q,{rangeWeight:2,wallWeight:1});
  }else if(f.t==='scissors'&&f.specialCd>3.7&&d<105){
   // Hit and run after the dash.
   [x,y]=steer(world,f,enemy,170,q,{wallWeight:1});
  }else if(f.t==='rock'&&enemy.t==='paper'&&enemy.moving&&d>PREFERRED.rock+12){
   // Cut the mage off: head for where it is going rather than where it is (better with skill).
   const lead=q*Math.min(1.2,Math.max(0,d-140)/(f.base.speed*(1+f.buff.speed))),es=enemy.base.speed*(1+enemy.buff.speed)*(enemy.slow>0?RULES.slowFactor:1);
   const tx=enemy.x+enemy.dx*es*lead-f.x,ty=enemy.y+enemy.dy*es*lead-f.y,tl=Math.hypot(tx,ty)||1;x=tx/tl;y=ty/tl;
  }else if(d>PREFERRED[f.t]+12){[x,y]=steer(world,f,enemy,PREFERRED[f.t],q,{chase:true,lookahead:40});}
  else if(d<PREFERRED[f.t]-12){x=-nx;y=-ny;}
  // Reflexes are imperfect: each bolt is read once, and only sometimes in time to guard.
  const incoming=world.projectiles.some(p=>{if(p.source===f||Math.hypot(p.x-f.x,p.y-f.y)>=95)return false;p.read??={};p.read[f.s]??=Math.random()<react;return p.read[f.s];});
  // A mage never guards: guarding slows it, and a slow mage gets caught.
  // Chasing a mage, a Rock takes the bolt rather than slowing down to block it.
  const guard=f.stamina>35&&f.t!=='paper'&&(incoming&&!(f.t==='rock'&&enemy.t==='paper'&&d>110)||(f.t==='rock'&&d<90&&enemy.cd<.16&&Math.sin(world.elapsed*3)>0));
  // Less skilled melee players swing from too far away and whiff.
  const reach=f.base.range+13+Math.random()*(1-q)*30;
  // A mage only holds fire up close when it can still outrun the enemy (the Rock); otherwise it fights back.
  const inRange=f.t==='paper'?d<470&&(d>110||enemy.t!=='rock'):d<reach&&(f.t!=='scissors'||enemy.t!=='rock'||f.ai.engage);
  const attack=reacted(world,f,'attack',inRange,q);
  // Never let repeated normal attacks suppress an available special. Mirror matches hesitate
  // a little so identical champions don't land identical specials on the same frame.
  const lunge=RULES.scissorsDash+f.base.range+enemy.r;
  const specialRange=f.t==='paper'?d>130:f.t==='scissors'?(f.ai.dodge&&enemy.chargeKind==='stomp')||d>90&&d<lunge-10&&(enemy.t!=='rock'||opening):d<RULES.rockStompRadius+enemy.r-10;
  const special=reacted(world,f,'special',f.specialCd===0&&!guard&&specialRange,q)&&(!mirror||Math.random()<.35);
  // The assassin's dash goes where it moves: straight at the target to lunge (the escape already moves away).
  if(special&&f.t==='scissors'&&!f.ai.dodge){x=nx;y=ny;}
  // Aim partly ahead of a moving target; a full lead would make bolts impossible to dodge.
  let aimX=nx,aimY=ny;
  // The Rock aims its charge where the target will be when the wind-up ends.
  if(f.t==='rock'&&enemy.moving){const speed=enemy.base.speed*(1+enemy.buff.speed),lead=q*.3*speed;aimX=vx+enemy.dx*lead;aimY=vy+enemy.dy*lead;}
  if(f.t==='paper'){if(enemy.moving){const speed=enemy.base.speed*(1+enemy.buff.speed)*(enemy.guard?.46:1)*(enemy.slow>0?.65:1),lead=.6*d/BOLT_SPEED*speed;aimX=vx+enemy.dx*lead;aimY=vy+enemy.dy*lead;}
   const a=Math.atan2(aimY,aimX)+(Math.random()-.5)*(1-q)*.7;aimX=Math.cos(a);aimY=Math.sin(a);}
  controls[f.s]={x,y,aimX,aimY,attack:attack&&!special,guard,special};
 }return controls;
}
