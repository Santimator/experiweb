// Painted assets are local and shared by the game and automatic demonstration.
import {RULES} from './arena.mjs';
const files={championsW:'champions-white.webp',championsB:'champions-black.webp',extraW:'champions-extra-white.webp',extraB:'champions-extra-black.webp',realmWhite:'realm-white.webp',realmBlack:'realm-black.webp',aids:'aids.webp',reactions:'bench-reactions.webp'};
// Bump when any painted asset changes, so browsers drop the cached copies (keep the ?v= in theme.css in step).
export const ART_VERSION=4;
const images={},pending={};
function loadImage(key){
 if(pending[key])return pending[key];
 if(typeof Image==='undefined')return Promise.resolve(false);
 pending[key]=new Promise(resolve=>{const im=new Image();im.onload=()=>{images[key]=im;resolve(true);};im.onerror=()=>resolve(false);im.src=new URL('./assets/'+files[key]+'?v='+ART_VERSION,import.meta.url).href;});return pending[key];
}
// 'board' is the figurine sheet the chessboard and benches need; 'arena' is everything a duel needs.
const sets={};
export function loadArtwork(which='all'){const keys=Object.keys(files).filter(k=>which==='all'||(which==='board')===(k==='aids'));return sets[which]??=Promise.all(keys.map(loadImage)).then(results=>results.every(Boolean));}
// Each team has its own painted champions (team paint on the same three monsters).
export function spriteAtlas(side='w'){return images[side==='b'?'championsB':'championsW']??null;}
export function courtyard(night){return images[night?'realmBlack':'realmWhite']??null;}
export function aidAtlas(){return images.aids??null;}
export function extraAtlas(side='w'){return images[side==='b'?'extraB':'extraW']??null;}
export function reactionAtlas(){return images.reactions??null;}
// Team sheets. Main sheet: uneven columns, rows rock/scissors/paper, poses idle, walk, walk, wind-up, attack, guard.
// Extra sheet: 296px cells; columns victory, hurt, knocked out, special wind-up, special release.
// Anchors are the measured eye position minus each pose's forward lean (so lunges still lunge); SCALE matches the
// on-screen size of the original art (Rock drawn 18% larger so the juggernaut out-bulks the others; hitboxes are equal); EXTRA is how big the extra poses are painted relative to the main ones.
export const EXTRA={victory:0,hurt:1,ko:2,windup:3,release:4};
const TEAM_ART={
 w:{anchors:{rock:[142,450,726,1035,1279,1658],scissors:[152,441,726,1028,1286,1646],paper:[170,467,762,1006,1272,1658]},scale:{rock:.4534,scissors:.3858,paper:.3673},extra:{rock:.8438,scissors:1.0077,paper:.9015},
  extraEyes:{rock:[158.8,113.6,189.8,165.3,164.6],scissors:[158.3,119.3,208.5,177,178.1],paper:[158.1,136.9,145.3,131.6,143.5]}},
 b:{anchors:{rock:[142,458,743,1044,1284,1664],scissors:[152,446,731,1032,1283,1654],paper:[169,470,758,1009,1266,1655]},scale:{rock:.4557,scissors:.3682,paper:.3673},extra:{rock:.8538,scissors:.9699,paper:.9312},
  extraEyes:{rock:[156.6,119.7,196.5,164,167.7],scissors:[160,122.5,208,185.6,176.7],paper:[160,134.6,157.8,137.7,138.9]}}};
const IDLE_LEAN={rock:30,scissors:24,paper:5},BASELINE=[279,571,834];
export function extraFrame(type,pose,side='w'){const art=TEAM_ART[side==='b'?'b':'w'],row={rock:0,scissors:1,paper:2}[type],rel=art.extra[type];
 // Standing poses line up their eyes with the idle pose; the knocked-out body is centred in its cell.
 const anchorX=pose===EXTRA.ko?148:art.extraEyes[type][pose]-IDLE_LEAN[type]*rel;
 return{x:pose*296,y:row*296,w:296,h:296,anchorX,anchorY:243,scale:art.scale[type]/rel};}
// bench-reactions (stored at half size): 181px cells; rows ivory active/cheer/sad, then Black; columns p n b r q k.
// Its pieces were shrunk by REACTION_SCALE relative to aids.webp.
const REACTION_SCALE={p:1.5878,n:1.3466,b:1.3298,r:1.3133,q:1.3466,k:1.2895};
export function reactionFrame(type,side,state){const col=['p','n','b','r','q','k'].indexOf(type),row=(side==='w'?0:3)+{active:0,cheer:1,sad:2}[state],box=AID_BOXES[col];
 // Same on-screen size as the idle figurine: idle height maps to its alpha box in aids.webp.
 return{x:col*181,y:row*181,w:181,h:181,anchorX:90.5,anchorY:144.5,unit:2*REACTION_SCALE[type]/(box[3]+4)};}
const COLUMNS=[0,300,596,883,1183,1540,1774],ROWS=[0,300,591,887];
export function spriteFrame(type,pose,side='w'){const art=TEAM_ART[side==='b'?'b':'w'],row={rock:0,scissors:1,paper:2}[type],x=COLUMNS[pose],y=ROWS[row];return{x,y,w:COLUMNS[pose+1]-x,h:ROWS[row+1]-y,anchorX:art.anchors[type][pose]-x,anchorY:BASELINE[row]-y,scale:art.scale[type]};}
const AID_BOXES=[[94,113,179,238],[441,62,210,293],[800,38,203,316],[1152,80,211,274],[1523,32,202,323],[1885,24,204,331],[94,455,179,236],[441,405,211,290],[800,381,203,314],[1152,421,211,274],[1523,375,202,320],[1884,367,205,329]];
export function aidFrame(type,side){if(!aidAtlas())return null;const index=['p','n','b','r','q','k'].indexOf(type)+(side==='w'?0:6),[x,y,w,h]=AID_BOXES[index];return{x:x-2,y:y-2,w:w+4,h:h+4};}
// Returns [sheet, pose]: 'main' is the team's champions sheet, 'extra' its champions-extra sheet.
export function spritePose(f,time,world){
 if(world?.done){const w=world.result?.winner;return['extra',w===f.s?EXTRA.victory:EXTRA.ko];}
 if(f.guard)return['main',5];
 const specialAge=f.base.specialCd*f.buff.cooldown-f.specialCd;
 if(f.charge>0)return f.chargeKind==='stomp'?['extra',EXTRA.windup]:['main',3];
 if(f.specialCd>0&&(f.t==='rock'?specialAge>=RULES.rockStompWindup&&specialAge<RULES.rockStompWindup+.3:specialAge<.28))return['extra',EXTRA.release];
 if(f.flash>0)return['extra',EXTRA.hurt];
 return['main',mainPose(f,time)];
}
function mainPose(f,time){
 const attackAge=f.base.attackCd-f.cd;
 if(f.cd>0&&attackAge<.24)return attackAge<.07?3:4;
 return f.moving?1+Math.floor(time*9)%2:0;
}
