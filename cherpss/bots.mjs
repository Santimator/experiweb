import {RULES} from './arena.mjs';
// The same local AI policy drives both sides; champion choice stays with the players.
// Movement scores a ring of candidate directions: keep a preferred range, stay out of
// walls and corners, avoid cover, keep some momentum, and wander a little.
// Skill (0..1) stands in for a human player's execution: reactions, aim, footwork and timing.
const SIZE=640,DIRS=Array.from({length:16},(_,i)=>[Math.cos(i*Math.PI/8),Math.sin(i*Math.PI/8)]);
const PREFERRED={rock:57,scissors:49,paper:230},BOLT_SPEED=460;
export const DEFAULT_SKILL=.6;
const CLOSE=1.5;
function wallPenalty(x,y){let p=0;for(const d of [x,y,SIZE-x,SIZE-y]){const gap=Math.max(0,110-d);p+=gap*gap;}return p/100;}
function blocked(world,x,y){return world.obstacles.some(o=>x>o.x-24&&x<o.x+o.w+24&&y>o.y-24&&y<o.y+o.h+24);}
function steer(world,f,enemy,desired,q,{lookahead=60,rangeWeight=1,wallWeight=1,chase=false}={}){
 f.ai??={dir:null,wander:0,wanderAt:0};
 if(world.elapsed>=f.ai.wanderAt){f.ai.wander=(Math.random()-.5)*(.8+(1-q)*1.6);f.ai.wanderAt=world.elapsed+.35+Math.random()*.5;}
 const noise=3+20*(1-q);let best=null,bestScore=-Infinity;
 // Judge each step against where the enemy will be by then, not where it is now.
 const tau=lookahead/(f.base.speed*(1+f.buff.speed)),es=enemy.moving?enemy.base.speed*(1+enemy.buff.speed)*(enemy.slow>0?.65:1)*tau:0,px=enemy.x+enemy.dx*es,py=enemy.y+enemy.dy*es;
 for(const [dx,dy] of DIRS){const x=f.x+dx*lookahead,y=f.y+dy*lookahead;
  if(x<25||x>SIZE-25||y<25||y>SIZE-25||blocked(world,x,y))continue;
  const d=Math.hypot(px-x,py-y);
  // Being too close is worse than being too far: closing in again is easy, escaping is not.
  let score=chase?-d:-(d<desired?(desired-d)*CLOSE:d-desired)*rangeWeight-wallPenalty(x,y)*wallWeight;
  if(f.ai.dir)score+=(dx*f.ai.dir[0]+dy*f.ai.dir[1])*14;
  // Wander: bias toward one side of the enemy so kiting curves instead of jittering.
  const ex=enemy.x-f.x,ey=enemy.y-f.y,el=Math.hypot(ex,ey)||1;score+=(dx*-ey/el+dy*ex/el)*f.ai.wander*12;
  score+=Math.random()*noise;
  if(score>bestScore){bestScore=score;best=[dx,dy];}
 }
 if(!best)best=[(SIZE/2-f.x)/SIZE,(SIZE/2-f.y)/SIZE];
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
  // Against the Rock, go in whenever it is not winding up; its heavy swing needs a moment to land.
  const opening=enemy.t==='rock'&&enemy.charge===0;
  if(f.t==='scissors'&&enemy.t==='rock')f.ai.engage=reacted(world,f,'open',opening,q);
  // A telegraphed charge is coming this way: step off its line (if the player reads it in time).
  const threatened=enemy.charge>0&&d<(enemy.chargeKind==='swing'?enemy.base.range+60:260)&&(enemy.chargeDir[0]*-vx+enemy.chargeDir[1]*-vy)/d>.5;
  if(reacted(world,f,'dodge',threatened,q)){f.ai.dodge??=Math.random()<.5?1:-1;}else if(!threatened)f.ai.dodge=undefined;
  if(f.ai.dodge&&enemy.chargeKind==='swing'){x=-nx;y=-ny;}
  else if(f.ai.dodge){x=-enemy.chargeDir[1]*f.ai.dodge;y=enemy.chargeDir[0]*f.ai.dodge;}
  else if(f.t==='paper'){
   // A mage kites: hold long range, prefer open space, never get pinned.
   [x,y]=steer(world,f,enemy,mirror?160:PREFERRED.paper,q,{rangeWeight:mirror?1:2,wallWeight:1.4});
  }else if(f.t==='scissors'&&enemy.t==='rock'&&!f.ai.engage){
   // Out of swing reach; out of dash reach too while the Rock's dash is ready.
   [x,y]=steer(world,f,enemy,enemy.specialCd<.4?RULES.rockDash+RULES.rockSlamRange+40:enemy.base.range+40,q,{rangeWeight:2,wallWeight:1});
  }else if(f.t==='scissors'&&f.specialCd>3.7&&d<105){
   // Hit and run after the dash.
   [x,y]=steer(world,f,enemy,170,q,{wallWeight:1});
  }else if(d>PREFERRED[f.t]+12){[x,y]=steer(world,f,enemy,PREFERRED[f.t],q,{chase:true,lookahead:40});}
  else if(d<PREFERRED[f.t]-12){x=-nx;y=-ny;}
  // Reflexes are imperfect: each bolt is read once, and only sometimes in time to guard.
  const incoming=world.projectiles.some(p=>{if(p.source===f||Math.hypot(p.x-f.x,p.y-f.y)>=95)return false;p.read??={};p.read[f.s]??=Math.random()<react;return p.read[f.s];});
  // A mage never guards: guarding slows it, and a slow mage gets caught.
  const guard=f.stamina>35&&f.t!=='paper'&&(incoming||(f.t==='rock'&&d<90&&enemy.cd<.16&&Math.sin(world.elapsed*3)>0));
  // Less skilled melee players swing from too far away and whiff.
  const reach=f.base.range+13+Math.random()*(1-q)*30;
  // A mage only holds fire up close when it can still outrun the enemy (the Rock); otherwise it fights back.
  const inRange=f.t==='paper'?d<470&&(d>110||enemy.t!=='rock'):d<reach&&(f.t!=='scissors'||enemy.t!=='rock'||f.ai.engage);
  const attack=reacted(world,f,'attack',inRange,q);
  // Never let repeated normal attacks suppress an available special. Mirror matches hesitate
  // a little so identical champions don't land identical specials on the same frame.
  const specialRange=f.t==='paper'?d>130:f.t==='scissors'?d>75&&d<235&&(enemy.t!=='rock'||opening):d>100&&d<210;
  const special=reacted(world,f,'special',f.specialCd===0&&!guard&&specialRange,q)&&(!mirror||Math.random()<.35);
  // Aim partly ahead of a moving target; a full lead would make bolts impossible to dodge.
  let aimX=nx,aimY=ny;
  // The Rock aims its charge where the target will be when the wind-up ends.
  if(f.t==='rock'&&enemy.moving){const speed=enemy.base.speed*(1+enemy.buff.speed),lead=q*.3*speed;aimX=vx+enemy.dx*lead;aimY=vy+enemy.dy*lead;}
  if(f.t==='paper'){if(enemy.moving){const speed=enemy.base.speed*(1+enemy.buff.speed)*(enemy.guard?.46:1)*(enemy.slow>0?.65:1),lead=.6*d/BOLT_SPEED*speed;aimX=vx+enemy.dx*lead;aimY=vy+enemy.dy*lead;}
   const a=Math.atan2(aimY,aimX)+(Math.random()-.5)*(1-q)*.7;aimX=Math.cos(a);aimY=Math.sin(a);}
  controls[f.s]={x,y,aimX,aimY,attack:attack&&!special,guard,special};
 }return controls;
}
