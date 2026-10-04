// Painted assets are local and shared by the game and automatic demonstration.
const files={champions:'champions.webp',courtyard:'courtyard.webp',aids:'aids.webp'};
const images={},pending={};let loading=null;
function loadImage(key){
 if(pending[key])return pending[key];
 if(typeof Image==='undefined')return Promise.resolve(false);
 pending[key]=new Promise(resolve=>{const im=new Image();im.onload=()=>{images[key]=im;resolve(true);};im.onerror=()=>resolve(false);im.src=new URL('./assets/'+files[key],import.meta.url).href;});return pending[key];
}
export function loadArtwork(){return loading??=Promise.all(Object.keys(files).map(loadImage)).then(results=>results.every(Boolean));}
export function spriteAtlas(){return images.champions??null;}
export function courtyard(){return images.courtyard??null;}
export function aidAtlas(){return images.aids??null;}
const COLUMNS=[0,300,596,883,1183,1540,1774],ROWS=[0,300,591,887];
const ANCHORS={rock:[160,458,742,1045,1320,1640],scissors:[160,454,746,1037,1290,1640],paper:[149,451,742,1040,1290,1645]};
export function spriteFrame(type,pose){const row={rock:0,scissors:1,paper:2}[type],x=COLUMNS[pose],y=ROWS[row];return{x,y,w:COLUMNS[pose+1]-x,h:ROWS[row+1]-y,anchorX:ANCHORS[type][pose]-x,anchorY:[278,574,834][row]-y};}
const AID_BOXES=[[94,113,179,238],[441,62,210,293],[800,38,203,316],[1152,80,211,274],[1523,32,202,323],[1885,24,204,331],[94,455,179,236],[441,405,211,290],[800,381,203,314],[1152,421,211,274],[1523,375,202,320],[1884,367,205,329]];
export function aidFrame(type,side){if(!aidAtlas())return null;const index=['p','n','b','r','q','k'].indexOf(type)+(side==='w'?0:6),[x,y,w,h]=AID_BOXES[index];return{x:x-2,y:y-2,w:w+4,h:h+4};}
export function spritePose(f,time){
 if(f.guard||f.flash>0)return 5;
 if(f.charge>0)return 3;
 const specialAge=f.base.specialCd*f.buff.cooldown-f.specialCd,attackAge=f.base.attackCd-f.cd;
 if(f.specialCd>0&&specialAge<.24)return specialAge<.07?3:4;
 if(f.cd>0&&attackAge<.24)return attackAge<.07?3:4;
 return f.moving?1+Math.floor(time*9)%2:0;
}
