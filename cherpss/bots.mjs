// The same local AI policy drives both sides; champion choice stays with the players.
// Movement scores a ring of candidate directions: keep a preferred range, stay out of
// walls and corners, avoid cover, keep some momentum, and wander a little.
const SIZE=640,DIRS=Array.from({length:16},(_,i)=>[Math.cos(i*Math.PI/8),Math.sin(i*Math.PI/8)]);
const PREFERRED={rock:57,scissors:49,paper:230},BOLT_SPEED=460;
function wallPenalty(x,y){let p=0;for(const d of [x,y,SIZE-x,SIZE-y]){const gap=Math.max(0,110-d);p+=gap*gap;}return p/100;}
function blocked(world,x,y){return world.obstacles.some(o=>x>o.x-24&&x<o.x+o.w+24&&y>o.y-24&&y<o.y+o.h+24);}
function steer(world,f,enemy,desired,{lookahead=60,rangeWeight=1,wallWeight=1,chase=false}={}){
 f.ai??={dir:null,wander:0,wanderAt:0};
 if(world.elapsed>=f.ai.wanderAt){f.ai.wander=(Math.random()-.5)*1.6;f.ai.wanderAt=world.elapsed+.35+Math.random()*.5;}
 let best=null,bestScore=-Infinity;
 for(const [dx,dy] of DIRS){const x=f.x+dx*lookahead,y=f.y+dy*lookahead;
  if(x<25||x>SIZE-25||y<25||y>SIZE-25||blocked(world,x,y))continue;
  const d=Math.hypot(enemy.x-x,enemy.y-y);
  let score=-Math.abs(d-desired)*rangeWeight-wallPenalty(x,y)*wallWeight;
  if(chase)score=-d;
  if(f.ai.dir)score+=(dx*f.ai.dir[0]+dy*f.ai.dir[1])*14;
  // Wander: bias toward one side of the enemy so kiting curves instead of jittering.
  const ex=(enemy.x-f.x),ey=(enemy.y-f.y),el=Math.hypot(ex,ey)||1;score+=(dx*-ey/el+dy*ex/el)*f.ai.wander*12;
  score+=Math.random()*3;
  if(score>bestScore){bestScore=score;best=[dx,dy];}
 }
 if(!best)best=[(SIZE/2-f.x)/SIZE,(SIZE/2-f.y)/SIZE];
 f.ai.dir=best;return best;
}
export function autoInput(world){
 const controls={};
 for(const f of world.fighters){const enemy=world.fighters.find(x=>x!==f),vx=enemy.x-f.x,vy=enemy.y-f.y,d=Math.hypot(vx,vy)||1,nx=vx/d,ny=vy/d;
  let x=0,y=0;
  if(f.t==='paper'){
   // A mage kites: hold long range, prefer open space, never get pinned.
   const mirror=enemy.t==='paper';[x,y]=steer(world,f,enemy,mirror?160:PREFERRED.paper,{rangeWeight:mirror?1:2,wallWeight:1.4});
  }else if(f.t==='scissors'&&f.specialCd>3.7&&d<105){
   // Hit and run after the dash.
   [x,y]=steer(world,f,enemy,170,{wallWeight:1});
  }else if(d>PREFERRED[f.t]+12){[x,y]=steer(world,f,enemy,PREFERRED[f.t],{chase:true,lookahead:40});}
  else if(d<PREFERRED[f.t]-12){x=-nx;y=-ny;}
  // Reflexes are imperfect: each bolt is read once, and only sometimes in time to guard.
  const incoming=world.projectiles.some(p=>{if(p.source===f||Math.hypot(p.x-f.x,p.y-f.y)>=95)return false;p.read??=Math.random()<.35;return p.read;});
  // A mage never guards: guarding slows it, and a slow mage gets caught.
  const guard=f.stamina>35&&f.t!=='paper'&&(incoming||(f.t==='rock'&&d<90&&enemy.cd<.16&&Math.sin(world.elapsed*3)>0));
  // A mage holds fire while the enemy is close and focuses on getting away.
  // Attacks wait a beat (human-like reaction), so mirror matches don't trade blows in lockstep.
  const attack=(f.t==='paper'?d<470&&(d>110||enemy.t==='paper'):d<f.base.range+13)&&Math.random()<.35;
  // Never let repeated normal attacks suppress an available special. Mirror matches hesitate
  // a little so identical champions don't land identical specials on the same frame.
  const special=f.specialCd===0&&!guard&&(enemy.t!==f.t||Math.random()<.35)&&(f.t==='paper'?d>130:f.t==='scissors'?d>75&&d<235:d>100&&d<210);
  // Aim partly ahead of a moving target; a full lead would make bolts impossible to dodge.
  let aimX=nx,aimY=ny;if(f.t==='paper'&&enemy.moving){const speed=enemy.base.speed*(1+enemy.buff.speed)*(enemy.guard?.46:1)*(enemy.slow>0?.65:1),lead=.6*d/BOLT_SPEED*speed;aimX=vx+enemy.dx*lead;aimY=vy+enemy.dy*lead;}
  controls[f.s]={x,y,aimX,aimY,attack:attack&&!special,guard,special};
 }return controls;
}
