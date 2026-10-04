import {ARENA,RULES,surge} from './arena.mjs';
import {spriteAtlas,spritePose,spriteFrame,aidAtlas,aidFrame,extraAtlas,extraFrame,reactionAtlas,reactionFrame} from './art.mjs';
export const SCENE={width:800,height:800,x:25,y:100};
const TEAM={w:'#f4d69e',b:'#f5a281'},TAU=Math.PI*2,backgrounds=new Map();
function poly(c,pts,fill,stroke='#192d2a',width=2){c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
function ellipse(c,x,y,rx,ry,fill){c.fillStyle=fill;c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.fill();}
function line(c,x,y,u,v,col,w=2){c.strokeStyle=col;c.lineWidth=w;c.beginPath();c.moveTo(x,y);c.lineTo(u,v);c.stroke();}
function round(c,x,y,w,h,r,fill,stroke){c.beginPath();c.roundRect(x,y,w,h,r);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=1;c.stroke();}}
function star(c,x,y,r,col){const pts=Array.from({length:16},(_,i)=>{const a=i*Math.PI/8-Math.PI/2,k=i%2?r*.35:r;return[x+Math.cos(a)*k,y+Math.sin(a)*k]});poly(c,pts,col,null);}
// The arena is another dimension: a sand floor inside a marble ring, with marble benches above (Ember)
// and below (Ivory). Light target squares open the white-marble realm, dark ones the black-marble realm;
// the champions keep their own colours in both.
const REALMS={
 white:{void0:'#f6f1e7',void1:'#b9ae9b',marble0:'#f4f0e8',marble1:'#d6cfc2',vein:'#8f897d',sand0:'#efdcb4',sand1:'#c7a978',grainDark:'#8a6d4255',grainLight:'#fff7df70',edge:'#a89c86',inner:'#c9a45a',text:'#6d604c',stud:'#c9a45a'},
 black:{void0:'#2a2930',void1:'#040405',marble0:'#2b2a31',marble1:'#111115',vein:'#c8ad73',sand0:'#ad946f',sand1:'#6e5a3f',grainDark:'#2a1e1060',grainLight:'#f0dcb040',edge:'#000000',inner:'#c8ad73',text:'#d9cba9',stud:'#c8ad73'}};
export const realmOf=world=>world?.night?'black':'white';
function rng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function marble(c,R,path,x,y,w,h,seed){c.save();path();c.clip();const g=c.createLinearGradient(x,y,x+w,y+h);g.addColorStop(0,R.marble0);g.addColorStop(.55,R.marble1);g.addColorStop(1,R.marble0);c.fillStyle=g;c.fillRect(x,y,w,h);
 const r=rng(seed);
 // Soft clouds first, then a few long, thin veins that drift in one general direction.
 for(let i=0;i<26;i++){const bx=x+r()*w,by=y+r()*h,br=30+r()*110,cl=c.createRadialGradient(bx,by,0,bx,by,br);cl.addColorStop(0,(i%2?R.marble1:R.marble0)+'90');cl.addColorStop(1,(i%2?R.marble1:R.marble0)+'00');c.fillStyle=cl;c.fillRect(bx-br,by-br,2*br,2*br);}
 c.strokeStyle=R.vein;c.lineCap='round';for(let i=0;i<9;i++){const a=-.5+r()*.6;let px=x-40+r()*w*.6,py=y+r()*h;c.globalAlpha=.25+r()*.35;c.lineWidth=.6+r()*1.2;c.beginPath();c.moveTo(px,py);
  for(let k=0;k<5;k++){const len=60+r()*120,nx=px+Math.cos(a)*len,ny=py+Math.sin(a)*len+(r()-.5)*40;c.quadraticCurveTo((px+nx)/2+(r()-.5)*30,(py+ny)/2+(r()-.5)*30,nx,ny);px=nx;py=ny;}c.stroke();
  // A hair-thin branch now and then.
  if(r()<.5){c.globalAlpha*=.6;c.lineWidth*=.5;c.beginPath();c.moveTo(px,py);c.quadraticCurveTo(px+30,py+(r()-.5)*50,px+60+r()*60,py+(r()-.5)*60);c.stroke();}}
 c.restore();}
function scenery(c,realm){const R=REALMS[realm],cx=SCENE.x+ARENA.cx,cy=SCENE.y+ARENA.cy,rx=ARENA.rx,ry=ARENA.ry;
 const v=c.createRadialGradient(400,400,120,400,400,620);v.addColorStop(0,R.void0);v.addColorStop(1,R.void1);c.fillStyle=v;c.fillRect(0,0,800,800);
 // Benches.
 for(const [y,seed] of [[8,11],[708,23]]){ellipse(c,400,y+80,380,10,'#0004');marble(c,R,()=>{c.beginPath();c.roundRect(20,y,760,84,18);},20,y,760,84,seed);c.strokeStyle=R.edge;c.lineWidth=2;c.beginPath();c.roundRect(20,y,760,84,18);c.stroke();c.strokeStyle=R.inner+'90';c.lineWidth=1;c.beginPath();c.roundRect(27,y+7,746,70,13);c.stroke();}
 // Marble ring.
 ellipse(c,cx,cy+8,rx+26,ry+26,'#0005');
 marble(c,R,()=>{c.beginPath();c.ellipse(cx,cy,rx+24,ry+24,0,0,TAU);c.ellipse(cx,cy,rx,ry,0,0,TAU,true);},cx-rx-24,cy-ry-24,2*rx+48,2*ry+48,37);
 c.strokeStyle=R.edge;c.lineWidth=2;c.beginPath();c.ellipse(cx,cy,rx+24,ry+24,0,0,TAU);c.stroke();
 for(let i=0;i<12;i++){const a=i*TAU/12;ellipse(c,cx+Math.cos(a)*(rx+12),cy+Math.sin(a)*(ry+12),4.5,4.5,R.stud);}
 // Sand floor: warm centre, raked rings, fine grain.
 c.save();c.beginPath();c.ellipse(cx,cy,rx,ry,0,0,TAU);c.clip();
 const g=c.createRadialGradient(cx,cy-40,40,cx,cy,rx);g.addColorStop(0,R.sand0);g.addColorStop(1,R.sand1);c.fillStyle=g;c.fillRect(cx-rx,cy-ry,2*rx,2*ry);
 c.strokeStyle=R.grainDark;c.lineWidth=1;for(const k of [.3,.45,.6,.75,.9]){c.globalAlpha=.35;c.beginPath();c.ellipse(cx,cy,rx*k,ry*k,0,0,TAU);c.stroke();}c.globalAlpha=1;
 const r=rng(91);for(let i=0;i<3200;i++){c.fillStyle=i%3?R.grainDark:R.grainLight;c.fillRect(cx-rx+r()*2*rx,cy-ry+r()*2*ry,1+r()*1.4,1+r()*1.4);}
 c.strokeStyle=R.inner;c.globalAlpha=.55;c.lineWidth=2;c.beginPath();c.ellipse(cx,cy,64,52,0,0,TAU);c.stroke();star(c,cx,cy,26,R.inner+'80');c.globalAlpha=1;
 const shade=c.createRadialGradient(cx,cy,ry*.6,cx,cy,rx*1.05);shade.addColorStop(0,'#0000');shade.addColorStop(1,'#00000040');c.fillStyle=shade;c.fillRect(cx-rx,cy-ry,2*rx,2*ry);c.restore();
 c.strokeStyle=R.inner;c.lineWidth=2.5;c.beginPath();c.ellipse(cx,cy,rx,ry,0,0,TAU);c.stroke();
 c.font='700 11px system-ui';c.textAlign='left';c.fillStyle=R.text;c.fillText('EMBER',34,26);c.fillText('IVORY',34,786);}
function backdrop(c,realm){let b=backgrounds.get(realm);if(!b&&typeof document!=='undefined'){b=document.createElement('canvas');b.width=800;b.height=800;const bc=b.getContext('2d');if(bc){scenery(bc,realm);backgrounds.set(realm,b);}else b=null;}if(b)c.drawImage(b,0,0);else scenery(c,realm);}
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
// The pieces whose lives are on the line (the attacker and the defender) sit large in the middle of
// their bench; the helpers fan out to both sides.
function drawPiece(c,p,s,x,base,h,world,clock,i){const state=reaction(world,s,p.t),reactions=reactionAtlas();ellipse(c,x,base-3,h*.38,5,'#0006');
 if(state&&reactions){const f=reactionFrame(p.t,s,state),k=h*f.unit,hop=state==='cheer'?Math.abs(Math.sin(clock*7+i))*-5:0;c.drawImage(reactions,f.x,f.y,f.w,f.h,x-f.anchorX*k,base+hop-f.anchorY*k,f.w*k,f.h*k);return;}
 const image=aidAtlas(),frame=aidFrame(p.t,s);if(image&&frame){const w=h*frame.w/frame.h;c.drawImage(image,frame.x,frame.y,frame.w,frame.h,x-w/2,base-h,w,h);}else{c.save();c.translate(x,base-10);c.scale(h/40,h/40);chessToken(c,p.t,0,0,s);c.restore();}}
function benches(c,support,world,clock){const centre=support?.centre;const R=REALMS[realmOf(world)];
 for(const s of ['w','b']){const list=support?.[s]??[],base=s==='b'?80:780,atStake=p=>p.attacker||p.i===centre;
  const stake=list.filter(atStake),helpers=list.filter(p=>!atStake(p)),slots=[];
  stake.forEach((p,i)=>slots.push({p,x:400+(i-(stake.length-1)/2)*80,big:true}));
  helpers.forEach((p,i)=>{const k=Math.floor(i/2)+1,dir=i%2?1:-1;slots.push({p,x:400+dir*(46+k*58),big:false});});
  for(const {p,x,big} of slots){if(big){const g=c.createRadialGradient(x,base-28,4,x,base-28,46);g.addColorStop(0,TEAM[s]+'90');g.addColorStop(1,TEAM[s]+'00');c.fillStyle=g;c.fillRect(x-46,base-74,92,92);}
   drawPiece(c,p,s,x,base,big?64:p.t==='p'?36:42,world,clock,slots.indexOf(slots.find(z=>z.p===p)));}
  if(!list.length){c.fillStyle=R.text;c.font='11px system-ui';c.textAlign='center';c.fillText('NO SUPPORT',400,base-30);}
 }}
function flashTilt(f){return f.flash>0?-.08:0;}
// Telegraphs: a Rock winding up shows where its blow will land, so players can react.
function telegraph(c,f,world){if(!(f.charge>0)||!f.chargeDir)return;const m=world?surge(world,f):1,[dx,dy]=f.chargeDir,a=Math.atan2(dy,dx),total=f.chargeKind==='swing'?RULES.rockSwingWindup:RULES.rockStompWindup,k=1-f.charge/total;
 c.save();c.globalAlpha=.3+.4*k;c.fillStyle='#b8432a55';c.strokeStyle='#8f2a17';c.lineWidth=2;c.setLineDash([7,5]);c.beginPath();
 if(f.chargeKind==='swing'){c.moveTo(f.x,f.y);c.arc(f.x,f.y,(f.base.range+21)*m,a-1.4,a+1.4);c.closePath();}
 else c.arc(f.x,f.y,RULES.rockStompRadius*m,0,TAU);
 c.fill();c.stroke();c.restore();}
function fighter(c,f,time,world,clock=time){
 telegraph(c,f,world);
 // A surging attacker grows and glows gold.
 const grow=world?Math.min(1.6,1+(surge(world,f)-1)*.3):1;if(grow>1){c.save();c.globalAlpha=.25+.15*Math.sin(clock*8);ellipse(c,f.x,f.y+10,34*grow,30*grow,'#f4c45e');c.restore();}
 ellipse(c,f.x,f.y+25,f.t==='rock'?33:26,10,'#0b172766');c.strokeStyle=TEAM[f.s]+'b0';c.lineWidth=2;c.beginPath();c.ellipse(f.x,f.y+24,30,11,0,0,TAU);c.stroke();
 const image=spriteAtlas();
 if(image){const [sheet,pose]=spritePose(f,time,world),extra=sheet==='extra'&&extraAtlas(),frame=extra?extraFrame(f.t,pose):spriteFrame(f.t,sheet==='main'?pose:0),scale=(extra?frame.scale:.36)*grow,src=extra?extraAtlas():image; c.save();c.translate(f.x,f.y+30);if(f.dx<0)c.scale(-1,1);const won=world?.done&&world.result?.winner===f.s,bob=world?.done?(won?-Math.abs(Math.sin(clock*6))*7:0):f.moving?Math.sin(time*13)*1.5:Math.sin(time*4);c.translate(0,bob);c.rotate(flashTilt(f));c.drawImage(src,frame.x,frame.y,frame.w,frame.h,-frame.anchorX*scale,-frame.anchorY*scale,frame.w*scale,frame.h*scale);c.restore();}
 else{c.fillStyle=TEAM[f.s];c.font='12px system-ui';c.textAlign='center';c.fillText('Loading…',f.x,f.y-4);}
 if(f.shield>0||f.guard){c.strokeStyle=f.guard?'#b1e6ff':'#f9d9a178';c.lineWidth=f.guard?4:2;c.beginPath();c.arc(f.x,f.y,40,0,TAU);c.stroke();if(f.guard){star(c,f.x+f.dx*38,f.y+f.dy*38,7,'#e0f4ff');}}
 if(f.buff.regen>0&&f.hp<f.startHp){c.strokeStyle='#99d8a5';c.globalAlpha=.5+.3*Math.sin(time*4);c.lineWidth=2;c.beginPath();c.ellipse(f.x,f.y+22,35,13,0,0,TAU);c.stroke();c.globalAlpha=1;}
 round(c,f.x-27,f.y+43,54,5,2,'#121b23');round(c,f.x-27,f.y+43,54*Math.max(0,f.hp/f.maxHp),5,2,TEAM[f.s]);round(c,f.x-27,f.y+51,54*f.stamina/100,2,1,'#8ab8d2');
 // Small direction marker; it remains separate from character illustration.
 if(!world?.done)poly(c,[[f.x+f.dx*49-f.dy*3,f.y+f.dy*49+f.dx*3],[f.x+f.dx*56,f.y+f.dy*56],[f.x+f.dx*49+f.dy*3,f.y+f.dy*49-f.dx*3]],TEAM[f.s]+'95',null);
}
export function drawArena(c,world,support,clock=typeof performance!=='undefined'?performance.now()/1000:world.elapsed){
 c.clearRect(0,0,800,800);backdrop(c,realmOf(world));benches(c,support,world,clock);c.save();c.translate(SCENE.x,SCENE.y);
 for(const o of world.obstacles){const image=aidAtlas(),frame=aidFrame('r',o.s);ellipse(c,o.x+o.w/2,o.y+o.h,o.w*.65,10,'#10202c65');if(image&&frame)c.drawImage(image,frame.x,frame.y,frame.w,frame.h,o.x-7,o.y-17,o.w+14,o.h+20);else{round(c,o.x,o.y,o.w,o.h,3,'#b4a17c','#373c3b');line(c,o.x,o.y+24,o.x+o.w,o.y+24,'#4e5558');} }
 for(const p of world.projectiles){const col=p.special?'#d7a5ff':'#ffd285';for(let k=4;k>0;k--)ellipse(c,p.x-p.dx*k*9,p.y-p.dy*k*9,p.r*(1-k*.15),p.r*(1-k*.15),col+'35');ellipse(c,p.x,p.y,p.r+4,col+'45');ellipse(c,p.x,p.y,p.r,col);ellipse(c,p.x-2,p.y-2,p.r*.5,p.r*.5,'#fff3d0');}
 for(const f of [...world.fighters].sort((a,b)=>a.y-b.y))fighter(c,f,world.elapsed,world,clock);
 for(const e of world.effects){c.save();const age=1-e.life/e.total;c.globalAlpha=Math.max(0,1-age);c.strokeStyle=e.color;c.fillStyle=e.color;c.lineWidth=4;c.textAlign='center';if(e.kind==='slash'){const angle=Math.atan2(e.dy,e.dx);c.beginPath();c.arc(e.x,e.y,e.r,angle-1.1+age*.5,angle+1.1);c.stroke();c.globalAlpha*=.4;c.lineWidth=10;c.stroke();}else if(e.kind==='quake'){c.lineWidth=6;c.beginPath();c.arc(e.x,e.y,e.r*(.55+.45*age),0,TAU);c.stroke();}else if(e.kind==='text'){c.font='800 17px system-ui';c.strokeStyle='#152331';c.lineWidth=3;c.strokeText(e.text,e.x,e.y-age*26);c.fillText(e.text,e.x,e.y-age*26);}else{c.beginPath();c.arc(e.x,e.y,e.kind==='guard'?43:20+age*60,0,TAU);c.stroke();for(let i=0;i<8;i++){const a=i*TAU/8;star(c,e.x+Math.cos(a)*(25+age*55),e.y+Math.sin(a)*(25+age*55),3,e.color);}}c.restore();}
 if(world.countdown>0){c.fillStyle='#10101480';c.beginPath();c.ellipse(ARENA.cx,ARENA.cy,ARENA.rx,ARENA.ry,0,0,TAU);c.fill();c.fillStyle='#fff1d2';c.font='800 70px system-ui';c.textAlign='center';c.fillText(world.countdown>.5?String(Math.ceil(world.countdown-.4)):'FIGHT',ARENA.cx,ARENA.cy+24);}
 c.restore();
}
