// The same local AI policy drives both sides; champion choice stays with the players.
export function autoInput(world){
 const controls={};
 for(const f of world.fighters){const enemy=world.fighters.find(x=>x!==f),vx=enemy.x-f.x,vy=enemy.y-f.y,d=Math.hypot(vx,vy)||1,nx=vx/d,ny=vy/d;
  const side=f.s==='w'?1:-1,desired=f.t==='paper'?215:f.t==='scissors'?49:57;let x=0,y=0;
  if(d>desired+12){x=nx;y=ny;}else if(d<desired-12){x=-nx;y=-ny;}
  if(f.t==='paper'){x+=-ny*.48*side;y+=nx*.48*side;}
  else if(f.t==='scissors'&&f.specialCd>3.7&&d<105){x=-nx-ny*.3*side;y=-ny+nx*.3*side;}
  if(f.x<55&&x<0)x=.65;if(f.x>585&&x>0)x=-.65;if(f.y<55&&y<0)y=.65;if(f.y>585&&y>0)y=-.65;
  for(const o of world.obstacles){const px=f.x+x*37,py=f.y+y*37;if(px>o.x-25&&px<o.x+o.w+25&&py>o.y-25&&py<o.y+o.h+25){const direction=f.y<o.y+o.h/2?-1:1;x=-ny*direction;y=nx*direction;}}
  const incoming=world.projectiles.some(p=>p.source!==f&&Math.hypot(p.x-f.x,p.y-f.y)<95);
  const guard=f.stamina>35&&(incoming||(f.t==='rock'&&d<90&&enemy.cd<.16&&Math.sin(world.elapsed*3)>0));
  const attack=f.t==='paper'?d<470:d<f.base.range+13;
  // Never let repeated normal attacks suppress an available special.
  const special=f.specialCd===0&&!guard&&(f.t==='paper'?d>110:f.t==='scissors'?d>75&&d<235:d>100&&d<210);
  controls[f.s]={x,y,aimX:nx,aimY:ny,attack:attack&&!special,guard,special};
 }return controls;
}
