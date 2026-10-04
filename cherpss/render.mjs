import {SIZE,RULES} from './arena.mjs';
import {spriteAtlas,spritePose,spriteFrame,courtyard,aidAtlas,aidFrame,extraAtlas,extraFrame,reactionAtlas,reactionFrame} from './art.mjs';
export const SCENE={width:800,height:736,x:80,y:48};
const TEAM={w:'#f4d69e',b:'#f5a281'},TAU=Math.PI*2,backgrounds=new Map();
function poly(c,pts,fill,stroke='#192d2a',width=2){c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
function ellipse(c,x,y,rx,ry,fill){c.fillStyle=fill;c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.fill();}
function line(c,x,y,u,v,col,w=2){c.strokeStyle=col;c.lineWidth=w;c.beginPath();c.moveTo(x,y);c.lineTo(u,v);c.stroke();}
function round(c,x,y,w,h,r,fill,stroke){c.beginPath();c.roundRect(x,y,w,h,r);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=1;c.stroke();}}
function star(c,x,y,r,col){const pts=Array.from({length:16},(_,i)=>{const a=i*Math.PI/8-Math.PI/2,k=i%2?r*.35:r;return[x+Math.cos(a)*k,y+Math.sin(a)*k]});poly(c,pts,col,null);}
function scenery(c,night){
 const stone=night?'#344755':'#93795c',tile=night?'#536774':'#c5ab7e',edge=night?'#a2b8b8':'#ebd3a0',gold=night?'#97b7c8':'#b28445';
 c.fillStyle=night?'#101d2b':'#283b2c';c.fillRect(0,0,800,736);
 // A garden surrounds the square; every decoration is outside the combat floor.
 for(let i=0;i<48;i++){const x=(i*139+17)%800,y=(i*83+13)%736;ellipse(c,x,y,20+(i%4)*7,12,night?'#1c3440':'#3f5941');ellipse(c,x-5,y-4,13,7,night?'#25434a':'#57734a');}
 round(c,69,37,662,662,18,'#0005');round(c,75,43,650,650,10,stone,edge);
 c.save();c.translate(SCENE.x,SCENE.y);
 const g=c.createRadialGradient(320,230,30,320,320,480);g.addColorStop(0,night?'#677b88':'#d7be91');g.addColorStop(1,night?'#344653':'#aa8b62');c.fillStyle=g;c.fillRect(0,0,SIZE,SIZE);
 for(let r=0;r<8;r++)for(let k=0;k<8;k++){const x=24+k*74,y=24+r*74;c.fillStyle=(r+k)%2?tile+'45':stone+'35';c.fillRect(x+1,y+1,72,72);line(c,x,y+73,x+74,y+73,night?'#20334055':'#7a604455',1);line(c,x+73,y,x+73,y+74,night?'#20334055':'#7a604455',1);
  // Fine irregular stone grain, deterministic and cached.
  for(let j=0;j<3;j++)line(c,x+9+(j*19+r*7)%45,y+18+j*16,x+19+(j*19+r*7)%45,y+18+j*16,night?'#d1e2e80d':'#f7e5be30',1);
 }
 c.strokeStyle=gold;c.lineWidth=3;c.strokeRect(12,12,616,616);c.lineWidth=1;c.strokeRect(19,19,602,602);c.strokeRect(26,26,588,588);
 // Inlaid compass and chess diamond in the courtyard's centre.
 for(const r of [104,97,69]){c.strokeStyle=gold+'70';c.lineWidth=r===97?2:1;c.beginPath();c.arc(320,320,r,0,TAU);c.stroke();}
 c.save();c.translate(320,320);for(let i=0;i<8;i++){c.save();c.rotate(i*Math.PI/4);poly(c,[[0,-89],[10,-49],[0,-62],[-10,-49]],gold+'75',null);c.restore();}poly(c,[[0,-48],[48,0],[0,48],[-48,0]],stone+'50',gold+'70',1);star(c,0,0,32,edge+'60');c.restore();
 for(const [x,y] of [[12,12],[628,12],[12,628],[628,628]]){c.save();c.translate(x,y);poly(c,[[0,-8],[8,0],[0,8],[-8,0]],edge,gold);c.restore();}
 c.restore();
 // Four stone lanterns frame the arena. Day and night share exactly this map.
 for(const x of [91,709])for(const y of [28,709]){ellipse(c,x,y+10,17,7,'#0005');round(c,x-11,y-7,22,20,3,stone,edge);round(c,x-6,y-3,12,10,2,night?'#ffcf77':'#e6bc70');poly(c,[[x-16,y-9],[x,y-20],[x+16,y-9]],stone,edge,1);if(night){const glow=c.createRadialGradient(x,y,0,x,y,50);glow.addColorStop(0,'#ffd17445');glow.addColorStop(1,'#ffd17400');c.fillStyle=glow;c.fillRect(x-50,y-50,100,100);}}
 c.font='600 11px system-ui';c.textAlign='center';c.fillStyle=night?'#c5d9e6':'#eddbb6';c.fillText(night?'MOONLIT COURTYARD':'SUNLIT COURTYARD',400,25);
 c.font='10px system-ui';c.fillStyle=night?'#88a5ba':'#a9bd94';c.fillText('IVORY',38,65);c.fillText('EMBER',762,65);
}
function paintedBackdrop(c,night){
 c.drawImage(courtyard(),0,0,800,736);
 if(night){
  // Recolour the same painted map; geometry and bench positions stay identical.
  c.save();c.globalCompositeOperation='multiply';c.fillStyle='#6881ba';c.fillRect(0,0,800,736);c.globalCompositeOperation='source-over';c.fillStyle='#0b173c60';c.fillRect(0,0,800,736);
  const moon=c.createRadialGradient(400,310,15,400,368,360);moon.addColorStop(0,'#a2ccff20');moon.addColorStop(1,'#a2ccff00');c.fillStyle=moon;c.fillRect(80,48,640,640);
  for(const x of [91,709])for(const y of [28,709]){const g=c.createRadialGradient(x,y,1,x,y,53);g.addColorStop(0,'#ffe6a3ba');g.addColorStop(.13,'#ffcf7480');g.addColorStop(1,'#ffcf7400');c.fillStyle=g;c.fillRect(x-53,y-53,106,106);}
  c.restore();
 }
}
function backdrop(c,night){const image=courtyard(),key=String(night)+(image?'painted':'loading');let b=backgrounds.get(key);if(!b&&typeof document!=='undefined'){b=document.createElement('canvas');b.width=800;b.height=736;const bc=b.getContext('2d');if(bc){if(image)paintedBackdrop(bc,night);else scenery(bc,night);backgrounds.set(key,b);}else b=null;}if(b)c.drawImage(b,0,0);else if(image)paintedBackdrop(c,night);else scenery(c,night);}
function chessToken(c,t,x,y,s){c.save();c.translate(x,y);c.fillStyle=TEAM[s];c.strokeStyle='#2d2b28';c.lineWidth=1.6;
 if(t==='p'){ellipse(c,0,-9,5,5,TEAM[s]);poly(c,[[-4,-3],[4,-3],[7,7],[-7,7]],TEAM[s]);}
 else if(t==='r')poly(c,[[-9,-13],[-4,-13],[-4,-8],[-1,-8],[-1,-13],[3,-13],[3,-8],[6,-8],[6,-13],[10,-13],[8,-3],[6,7],[-6,7],[-8,-3]],TEAM[s]);
 else if(t==='n')poly(c,[[-8,8],[-6,-1],[-10,-4],[-6,-12],[1,-15],[7,-10],[8,7]],TEAM[s]);
 else if(t==='b'){poly(c,[[0,-17],[7,-6],[2,0],[6,8],[-6,8],[-2,0],[-7,-6]],TEAM[s]);line(c,2,-10,-2,-5,'#665947',1);}
 else if(t==='q')poly(c,[[-9,-13],[-5,1],[5,1],[9,-13],[3,-6],[0,-17],[-3,-6]],TEAM[s]);
 else{poly(c,[[-6,-5],[6,-5],[4,7],[-4,7]],TEAM[s]);line(c,0,-18,0,-6,TEAM[s],4);line(c,-5,-13,5,-13,TEAM[s],3);}
 round(c,-10,8,20,4,1,TEAM[s],'#302c27');c.restore();}
// After a knockout the winning bench cheers and the losing bench slumps; during the duel a piece
// lights up for a moment whenever its bonus helps (shield soaks a hit, healing ticks, and so on).
function reaction(world,s,t){if(world?.done){const w=world.result?.winner;return w===s?'cheer':'sad';}const at=world?.aid?.[s]?.[t];return at!==undefined&&world.elapsed-at<.6?'active':null;}
function benches(c,support,night,world,clock){for(const s of ['w','b']){const list=support?.[s]??[],x=s==='w'?10:734,top=97;
 if(!courtyard()){round(c,x+3,top+8,53,532,9,'#0005');round(c,x,top,56,532,7,'#4c342c','#916a4d');for(let y=top+12;y<top+524;y+=15)line(c,x+4,y,x+52,y,'#b0895940',1);}
 const gap=Math.min(62,480/Math.max(1,list.length)),first=top+48+(480-gap*list.length)/2;
 list.forEach((p,i)=>{const y=first+i*gap;ellipse(c,x+28,y+16,18,6,'#140a0870');
  const state=reaction(world,s,p.t),reactions=reactionAtlas();
  if(state&&reactions){const h=p.t==='p'?40:47,f=reactionFrame(p.t,s,state),k=h*f.unit,hop=state==='cheer'?Math.abs(Math.sin(clock*7+i))*-5:0;
   c.save();if(night)c.globalAlpha=.96;c.drawImage(reactions,f.x,f.y,f.w,f.h,x+28-f.anchorX*k,y+20+hop-f.anchorY*k,f.w*k,f.h*k);c.restore();return;}
  const image=aidAtlas(),frame=aidFrame(p.t,s);if(image&&frame){const h=p.t==='p'?40:47,w=h*frame.w/frame.h;c.save();if(night)c.globalAlpha=.96;c.drawImage(image,frame.x,frame.y,frame.w,frame.h,x+28-w/2,y+20-h,w,h);c.restore();}else chessToken(c,p.t,x+28,y,s);
 });
 c.fillStyle=TEAM[s];c.font='700 10px system-ui';c.textAlign='center';c.fillText(s==='w'?'IVORY':'EMBER',x+28,78);
 if(!list.length){c.fillStyle=TEAM[s]+'b0';c.font='10px system-ui';c.fillText('EMPTY',x+28,top+263);}
}}
function flashTilt(f){return f.flash>0?-.08:0;}
// Telegraphs: a Rock winding up shows where its blow will land, so players can react.
function telegraph(c,f){if(!(f.charge>0)||!f.chargeDir)return;const [dx,dy]=f.chargeDir,a=Math.atan2(dy,dx),total=f.chargeKind==='swing'?RULES.rockSwingWindup:RULES.rockStompWindup,k=1-f.charge/total;
 c.save();c.globalAlpha=.3+.4*k;c.fillStyle='#b8432a55';c.strokeStyle='#8f2a17';c.lineWidth=2;c.setLineDash([7,5]);c.beginPath();
 if(f.chargeKind==='swing'){c.moveTo(f.x,f.y);c.arc(f.x,f.y,f.base.range+21,a-1.4,a+1.4);c.closePath();}
 else c.arc(f.x,f.y,RULES.rockStompRadius,0,TAU);
 c.fill();c.stroke();c.restore();}
function fighter(c,f,time,world,clock=time){
 telegraph(c,f);
 ellipse(c,f.x,f.y+25,f.t==='rock'?33:26,10,'#0b172766');c.strokeStyle=TEAM[f.s]+'b0';c.lineWidth=2;c.beginPath();c.ellipse(f.x,f.y+24,30,11,0,0,TAU);c.stroke();
 const image=spriteAtlas();
 if(image){const [sheet,pose]=spritePose(f,time,world),extra=sheet==='extra'&&extraAtlas(),frame=extra?extraFrame(f.t,pose):spriteFrame(f.t,sheet==='main'?pose:0),scale=extra?frame.scale:.36,src=extra?extraAtlas():image; c.save();c.translate(f.x,f.y+30);if(f.dx<0)c.scale(-1,1);const won=world?.done&&world.result?.winner===f.s,bob=world?.done?(won?-Math.abs(Math.sin(clock*6))*7:0):f.moving?Math.sin(time*13)*1.5:Math.sin(time*4);c.translate(0,bob);c.rotate(flashTilt(f));c.drawImage(src,frame.x,frame.y,frame.w,frame.h,-frame.anchorX*scale,-frame.anchorY*scale,frame.w*scale,frame.h*scale);c.restore();}
 else{c.fillStyle=TEAM[f.s];c.font='12px system-ui';c.textAlign='center';c.fillText('Loading…',f.x,f.y-4);}
 if(f.shield>0||f.guard){c.strokeStyle=f.guard?'#b1e6ff':'#f9d9a178';c.lineWidth=f.guard?4:2;c.beginPath();c.arc(f.x,f.y,40,0,TAU);c.stroke();if(f.guard){star(c,f.x+f.dx*38,f.y+f.dy*38,7,'#e0f4ff');}}
 if(f.buff.regen>0&&f.hp<f.startHp){c.strokeStyle='#99d8a5';c.globalAlpha=.5+.3*Math.sin(time*4);c.lineWidth=2;c.beginPath();c.ellipse(f.x,f.y+22,35,13,0,0,TAU);c.stroke();c.globalAlpha=1;}
 round(c,f.x-27,f.y+43,54,5,2,'#121b23');round(c,f.x-27,f.y+43,54*Math.max(0,f.hp/f.maxHp),5,2,TEAM[f.s]);round(c,f.x-27,f.y+51,54*f.stamina/100,2,1,'#8ab8d2');
 // Small direction marker; it remains separate from character illustration.
 if(!world?.done)poly(c,[[f.x+f.dx*49-f.dy*3,f.y+f.dy*49+f.dx*3],[f.x+f.dx*56,f.y+f.dy*56],[f.x+f.dx*49+f.dy*3,f.y+f.dy*49-f.dx*3]],TEAM[f.s]+'95',null);
}
export function drawArena(c,world,support,clock=typeof performance!=='undefined'?performance.now()/1000:world.elapsed){
 c.clearRect(0,0,800,736);backdrop(c,world.night);benches(c,support,world.night,world,clock);c.save();c.translate(SCENE.x,SCENE.y);
 for(const o of world.obstacles){const image=aidAtlas(),frame=aidFrame('r',o.s);ellipse(c,o.x+o.w/2,o.y+o.h,o.w*.65,10,'#10202c65');if(image&&frame)c.drawImage(image,frame.x,frame.y,frame.w,frame.h,o.x-7,o.y-17,o.w+14,o.h+20);else{round(c,o.x,o.y,o.w,o.h,3,'#b4a17c','#373c3b');line(c,o.x,o.y+24,o.x+o.w,o.y+24,'#4e5558');} }
 for(const p of world.projectiles){const col=p.special?'#d7a5ff':'#ffd285';for(let k=4;k>0;k--)ellipse(c,p.x-p.dx*k*9,p.y-p.dy*k*9,p.r*(1-k*.15),p.r*(1-k*.15),col+'35');ellipse(c,p.x,p.y,p.r+4,col+'45');ellipse(c,p.x,p.y,p.r,col);ellipse(c,p.x-2,p.y-2,p.r*.5,p.r*.5,'#fff3d0');}
 for(const f of [...world.fighters].sort((a,b)=>a.y-b.y))fighter(c,f,world.elapsed,world,clock);
 for(const e of world.effects){c.save();const age=1-e.life/e.total;c.globalAlpha=Math.max(0,1-age);c.strokeStyle=e.color;c.fillStyle=e.color;c.lineWidth=4;c.textAlign='center';if(e.kind==='slash'){const angle=Math.atan2(e.dy,e.dx);c.beginPath();c.arc(e.x,e.y,e.r,angle-1.1+age*.5,angle+1.1);c.stroke();c.globalAlpha*=.4;c.lineWidth=10;c.stroke();}else if(e.kind==='quake'){c.lineWidth=6;c.beginPath();c.arc(e.x,e.y,e.r*(.55+.45*age),0,TAU);c.stroke();}else if(e.kind==='text'){c.font='800 17px system-ui';c.strokeStyle='#152331';c.lineWidth=3;c.strokeText(e.text,e.x,e.y-age*26);c.fillText(e.text,e.x,e.y-age*26);}else{c.beginPath();c.arc(e.x,e.y,e.kind==='guard'?43:20+age*60,0,TAU);c.stroke();for(let i=0;i<8;i++){const a=i*TAU/8;star(c,e.x+Math.cos(a)*(25+age*55),e.y+Math.sin(a)*(25+age*55),3,e.color);}}c.restore();}
 if(world.countdown>0){c.fillStyle='#101b2c80';c.fillRect(0,0,640,640);c.fillStyle='#ffe4b0';c.font='800 70px system-ui';c.textAlign='center';c.fillText(world.countdown>.5?String(Math.ceil(world.countdown-.4)):'FIGHT',320,333);}
 c.restore();
}
