// Painted assets are local and shared by the game and automatic demonstration.
import {RULES} from './arena.mjs';
const files={champions:'champions.webp',realmWhite:'realm-white.webp',realmBlack:'realm-black.webp',aids:'aids.webp',extra:'champions-extra.webp',reactions:'bench-reactions.webp'};
const images={},pending={};let loading=null;
function loadImage(key){
 if(pending[key])return pending[key];
 if(typeof Image==='undefined')return Promise.resolve(false);
 pending[key]=new Promise(resolve=>{const im=new Image();im.onload=()=>{images[key]=im;resolve(true);};im.onerror=()=>resolve(false);im.src=new URL('./assets/'+files[key],import.meta.url).href;});return pending[key];
}
export function loadArtwork(){return loading??=Promise.all(Object.keys(files).map(loadImage)).then(results=>results.every(Boolean));}
export function spriteAtlas(){return images.champions??null;}
export function courtyard(night){return images[night?'realmBlack':'realmWhite']??null;}
export function aidAtlas(){return images.aids??null;}
export function extraAtlas(){return images.extra??null;}
export function reactionAtlas(){return images.reactions??null;}
// champions-extra: 296px cells; columns victory, hurt, knocked out, special wind-up, special release.
// Each row was packed at its own scale; dividing by it keeps the poses the same size as the main sheet.
export const EXTRA={victory:0,hurt:1,ko:2,windup:3,release:4};
const EXTRA_SCALE={rock:.6075,scissors:.5544,paper:.4901};
export function extraFrame(type,pose){const row={rock:0,scissors:1,paper:2}[type];return{x:pose*296,y:row*296,w:296,h:296,anchorX:148,anchorY:243,scale:.36/EXTRA_SCALE[type]};}
// bench-reactions (stored at half size): 181px cells; rows ivory active/cheer/sad, then Black; columns p n b r q k.
// Its pieces were shrunk by REACTION_SCALE relative to aids.webp.
const REACTION_SCALE={p:1.5878,n:1.3466,b:1.3298,r:1.3133,q:1.3466,k:1.2895};
export function reactionFrame(type,side,state){const col=['p','n','b','r','q','k'].indexOf(type),row=(side==='w'?0:3)+{active:0,cheer:1,sad:2}[state],box=AID_BOXES[col];
 // Same on-screen size as the idle figurine: idle height maps to its alpha box in aids.webp.
 return{x:col*181,y:row*181,w:181,h:181,anchorX:90.5,anchorY:144.5,unit:2*REACTION_SCALE[type]/(box[3]+4)};}
const COLUMNS=[0,300,596,883,1183,1540,1774],ROWS=[0,300,591,887];
const ANCHORS={rock:[160,458,742,1045,1320,1640],scissors:[160,454,746,1037,1290,1640],paper:[135,466,758,1033,1292,1609]};
export function spriteFrame(type,pose){const row={rock:0,scissors:1,paper:2}[type],x=COLUMNS[pose],y=ROWS[row];return{x,y,w:COLUMNS[pose+1]-x,h:ROWS[row+1]-y,anchorX:ANCHORS[type][pose]-x,anchorY:[278,574,834][row]-y};}
const AID_BOXES=[[94,113,179,238],[441,62,210,293],[800,38,203,316],[1152,80,211,274],[1523,32,202,323],[1885,24,204,331],[94,455,179,236],[441,405,211,290],[800,381,203,314],[1152,421,211,274],[1523,375,202,320],[1884,367,205,329]];
export function aidFrame(type,side){if(!aidAtlas())return null;const index=['p','n','b','r','q','k'].indexOf(type)+(side==='w'?0:6),[x,y,w,h]=AID_BOXES[index];return{x:x-2,y:y-2,w:w+4,h:h+4};}
// Returns [sheet, pose]: 'main' is champions.webp, 'extra' is champions-extra.webp.
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
