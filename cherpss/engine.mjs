export const TYPES=['rock','scissors','paper'];
export const NAMES={rock:'Rock',scissors:'Scissors',paper:'Paper'};
export const PIECES={p:'Pawn',n:'Knight',b:'Bishop',r:'Rook',q:'Queen',k:'King'};
// Each side starts with this many champions of each type; a champion that loses a duel is eliminated.
export const ROSTER_SIZE=4;
export const inBoard=(r,c)=>r>=0&&r<8&&c>=0&&c<8;
export const square=i=>'abcdefgh'[i%8]+(8-Math.floor(i/8));
export const other=s=>s==='w'?'b':'w';
export function newGame(mode='duel'){
 const board=Array(64).fill(null),back='rnbqkbnr';
 for(let c=0;c<8;c++){board[c]={s:'b',t:back[c]};board[8+c]={s:'b',t:'p'};board[48+c]={s:'w',t:'p'};board[56+c]={s:'w',t:back[c]};}
 const state={board,turn:'w',mode,rights:{wK:true,wQ:true,bK:true,bQ:true},ep:null,half:0,ply:0,roster:{w:{rock:ROSTER_SIZE,scissors:ROSTER_SIZE,paper:ROSTER_SIZE},b:{rock:ROSTER_SIZE,scissors:ROSTER_SIZE,paper:ROSTER_SIZE}},history:[],last:null};
 state.repetitions={[positionKey(state)]:1};return state;
}
export function positionKey(g){return g.board.map(p=>p?p.s+p.t:'-').join('')+g.turn+Object.entries(g.rights).filter(x=>x[1]).map(x=>x[0]).join('')+g.ep;}
export function attacked(g,idx,by){
 const r=idx>>3,c=idx%8;
 for(let i=0;i<64;i++){const p=g.board[i];if(!p||p.s!==by)continue;const y=i>>3,x=i%8,dy=r-y,dx=c-x;
  if(p.t==='p'&&dy===(by==='w'?-1:1)&&Math.abs(dx)===1)return true;
  if(p.t==='n'&&Math.abs(dy)*Math.abs(dx)===2)return true;
  if(p.t==='k'&&Math.max(Math.abs(dy),Math.abs(dx))===1)return true;
  const aligned=(p.t==='b'&&Math.abs(dy)===Math.abs(dx))||(p.t==='r'&&(dy===0||dx===0))||(p.t==='q'&&(dy===0||dx===0||Math.abs(dy)===Math.abs(dx)));
  if(aligned&&(dy||dx)){const sy=Math.sign(dy),sx=Math.sign(dx);let yy=y+sy,xx=x+sx,clear=true;while(yy!==r||xx!==c){if(g.board[yy*8+xx]){clear=false;break;}yy+=sy;xx+=sx;}if(clear)return true;}
 }return false;
}
export function inCheck(g,s){const k=g.board.findIndex(p=>p?.s===s&&p.t==='k');return k<0||attacked(g,k,other(s));}
export function pseudoMoves(g,from,classic=g.mode==='classic'){
 const p=g.board[from];if(!p)return[];const r=from>>3,c=from%8,out=[];
 function add(y,x,extra={}){if(!inBoard(y,x))return false;const to=y*8+x,target=g.board[to];if(target?.s===p.s)return false;if(classic&&target?.t==='k')return false;out.push({from,to,...extra});return !target;}
 if(p.t==='p'){
  const d=p.s==='w'?-1:1,last=p.s==='w'?0:7,start=p.s==='w'?6:1;
  function pawn(y,x,extra={}){if(y===last){for(const promote of ['q','r','b','n'])add(y,x,{...extra,promote});}else add(y,x,extra);}
  if(inBoard(r+d,c)&&!g.board[(r+d)*8+c]){pawn(r+d,c);if(r===start&&!g.board[(r+2*d)*8+c])add(r+2*d,c,{double:true});}
  for(const dc of [-1,1]){const y=r+d,x=c+dc;if(!inBoard(y,x))continue;const to=y*8+x,target=g.board[to];if(target&&target.s!==p.s)pawn(y,x);else if(to===g.ep&&g.board[r*8+x]?.t==='p'&&g.board[r*8+x]?.s!==p.s)add(y,x,{epCapture:r*8+x});}
 }else if(p.t==='n'){for(const [dy,dx]of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]])add(r+dy,c+dx);}
 else if(p.t==='k'){
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(dy||dx)add(r+dy,c+dx);
  const home=p.s==='w'?60:4;
  if(from===home&&(!classic||!inCheck(g,p.s))){for(const side of ['K','Q']){const rook=side==='K'?home+3:home-4,step=side==='K'?1:-1,empty=side==='K'?[home+1,home+2]:[home-1,home-2,home-3];if(g.rights[p.s+side]&&g.board[rook]?.s===p.s&&g.board[rook]?.t==='r'&&empty.every(i=>!g.board[i])&&(!classic||[home+step,home+2*step].every(i=>!attacked(g,i,other(p.s)))))out.push({from,to:home+2*step,castle:{from:rook,to:home+step}});}}
 }else{
  const dirs=p.t==='b'?[[1,1],[1,-1],[-1,1],[-1,-1]]:p.t==='r'?[[1,0],[-1,0],[0,1],[0,-1]]:[[1,1],[1,-1],[-1,1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]];
  for(const[dy,dx]of dirs){let y=r+dy,x=c+dx;while(inBoard(y,x)){if(!add(y,x))break;y+=dy;x+=dx;}}
 }return out;
}
function revoke(g,p,i){if(p?.t==='k'){g.rights[p.s+'K']=false;g.rights[p.s+'Q']=false;}if(p?.t==='r'){if(i===(p.s==='w'?63:7))g.rights[p.s+'K']=false;if(i===(p.s==='w'?56:0))g.rights[p.s+'Q']=false;}}
export function applyMove(state,m,attackerWins=true){
 const g=structuredClone(state),p=g.board[m.from],ci=m.epCapture??m.to,target=g.board[ci];if(!p)throw new Error('No moving piece');
 revoke(g,p,m.from);g.ep=null;
 if(target&&attackerWins!==true){g.board[m.from]=null;if(attackerWins===null){revoke(g,target,ci);g.board[ci]=null;}}
 else {revoke(g,target,ci);if(m.epCapture!==undefined)g.board[ci]=null;g.board[m.from]=null;g.board[m.to]={s:p.s,t:m.promote??p.t};if(m.castle){g.board[m.castle.to]=g.board[m.castle.from];g.board[m.castle.from]=null;}if(m.double)g.ep=(m.from+m.to)/2;}
 g.turn=other(state.turn);g.ply++;g.half=p.t==='p'||target?0:g.half+1;g.last={from:m.from,to:m.to,attackerWins};
 const entry=`${state.turn==='w'?'White':'Black'}: ${PIECES[p.t]} ${square(m.from)} → ${square(m.to)}${target?(attackerWins===null?' · both pieces lost':attackerWins?' · capture':' · repelled'):''}${m.promote&&attackerWins?' = '+PIECES[m.promote]:''}`;
 g.history.push(entry);const key=positionKey(g);g.repetitions??={};g.repetitions[key]=(g.repetitions[key]??0)+1;return g;
}
export function moves(g,from){const out=pseudoMoves(g,from);return g.mode==='classic'?out.filter(m=>!inCheck(applyMove(g,m),g.board[from].s)):out;}
export function allMoves(g,s=g.turn){return g.board.flatMap((p,i)=>p?.s===s?moves(g,i):[]);}
export function captureTarget(g,m){return g.board[m.epCapture??m.to];}
export function collectSupport(g,m){
 const centre=m.epCapture??m.to,r=centre>>3,c=centre%8,pieces=[];
 for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!inBoard(r+dy,c+dx))continue;const i=(r+dy)*8+c+dx,p=g.board[i];if(p&&i!==m.from)pieces.push({...p,i});}
 pieces.push({...g.board[m.from],i:m.to,attacker:true});return{centre,pieces,w:pieces.filter(p=>p.s==='w'),b:pieces.filter(p=>p.s==='b')};
}
// What each neighbouring piece adds to its side's champion, and the cap per effect.
// Helper values are per champion (rock / scissors / paper): the same perk is worth very different amounts to
// each fighter (a few % of speed decides whether a Rock catches a mage; Scissors barely notice), so each value
// was calibrated in simulation to give every champion about the same edge. One helper is worth roughly
// +0.3 (pawn, knight) to +0.8 (queen, king) in win-logit; four helpers swing a duel by ~1.5. With the pieces
// that really stand next to duels, counters still win about 78-85% and a helper nearby moves that by 10-25
// points. Caps stop stacks of the same piece from running away (about two copies' worth).
// Pawns ward (a flat cut from every hit) rather than shield: a one-off shield was soon spent in fast
// Scissors slap-fights, where a queen's attack speed then decided everything.
const per=(rock,scissors,paper)=>({rock,scissors,paper});
export const SUPPORT={p:{ward:per(.45,.4,.42)},n:{speed:per(.021,.068,.2)},b:{cooldown:per(.062,.084,.24),power:per(.051,.07,.2)},r:{power:per(.28,.55,.215)},q:{attackSpeed:per(.095,.12,.1)},k:{damage:per(.1,.136,.065)}};
export const SUPPORT_CAPS={ward:per(.9,1.2,1.26),shield:24,speed:per(.042,.136,.24),regen:1.2,cooldown:per(.124,.168,.48),damage:per(.2,.272,.13),cover:2,attackSpeed:per(.19,.24,.2),reach:40,lifesteal:.5,armor:.5,power:per(.6,1.12,.6),interrupt:1};
// A value is either one number or one per champion type, so a helper can give each champion the same edge.
const valueFor=(v,type)=>typeof v==='number'?v:v?.[type]??0;
export function bonuses(pieces,type){
 const counts=Object.fromEntries(Object.keys(PIECES).map(t=>[t,pieces.filter(p=>p.t===t).length])),sum={};
 for(const [t,n] of Object.entries(counts))for(const [k,v] of Object.entries(SUPPORT[t]??{}))sum[k]=(sum[k]??0)+n*valueFor(v,type);
 const cap=k=>Math.min(SUPPORT_CAPS[k]==null?Infinity:valueFor(SUPPORT_CAPS[k],type),sum[k]??0);
 return{counts,shield:cap('shield'),speed:cap('speed'),regen:cap('regen'),cooldown:1-cap('cooldown'),damage:1+cap('damage'),cover:Math.floor(cap('cover')),
  // Optional effects (unused by default): faster attacks, longer melee reach, lifesteal, armour, stronger specials, wind-up interrupts.
  attackSpeed:cap('attackSpeed'),reach:cap('reach'),lifesteal:cap('lifesteal'),armor:cap('armor'),ward:cap('ward'),power:cap('power'),interrupt:cap('interrupt')};
}
export function continuationIssue(g){
 for(const s of ['w','b'])if(g.board.filter(p=>p?.s===s&&p.t==='k').length!==1)return 'Ordinary chess needs both kings.';
 if(inCheck(g,other(g.turn)))return 'The player who just moved has an exposed king. This position cannot continue as ordinary chess.';
 if(g.board.some((p,i)=>p?.t==='p'&&(i<8||i>=56)))return 'A pawn on the last rank must be promoted first.';
 return null;
}
export function classicStatus(g){
 if(!allMoves(g).length)return inCheck(g,g.turn)?{over:true,winner:other(g.turn),reason:'Checkmate'}:{over:true,winner:null,reason:'Stalemate'};
 if(g.half>=100)return{over:true,winner:null,reason:'Draw · fifty-move rule'};
 if((g.repetitions?.[positionKey(g)]??0)>=3)return{over:true,winner:null,reason:'Draw · threefold repetition'};
 const nonKings=g.board.map((p,i)=>({p,i})).filter(x=>x.p&&x.p.t!=='k');
 if(nonKings.length===0||(nonKings.length===1&&['b','n'].includes(nonKings[0].p.t))||(nonKings.every(x=>x.p.t==='b')&&new Set(nonKings.map(x=>((x.i>>3)+x.i%8)%2)).size===1))return{over:true,winner:null,reason:'Draw · insufficient material'};
 return{over:false,check:inCheck(g,g.turn)};
}
export function exhaust(g,s){return TYPES.every(t=>g.roster[s][t]<=0);}
// The losing champion is eliminated (both, after a double knockout); winners come back fresh.
export function recordWounds(g,selection,winner){const out=structuredClone(g);for(const s of ['w','b'])if(s!==winner)out.roster[s][selection[s]]=Math.max(0,out.roster[s][selection[s]]-1);return out;}
// Saves from the old vitality system (0-100 per type) become champions left: 100 -> 4, 60 -> 3, 20 -> 1.
export function migrateRoster(g){if(['w','b'].some(s=>TYPES.some(t=>g.roster?.[s]?.[t]>ROSTER_SIZE)))for(const s of ['w','b'])for(const t of TYPES)g.roster[s][t]=Math.ceil(g.roster[s][t]/100*ROSTER_SIZE);return g;}
export function validateSave(g){
 if(!g||!['duel','classic'].includes(g.mode)||!['w','b'].includes(g.turn)||!Array.isArray(g.board)||g.board.length!==64)return false;
 if(g.board.some(p=>p&&(!['w','b'].includes(p.s)||!Object.keys(PIECES).includes(p.t))))return false;
 if(!g.rights||Object.keys(g.rights).sort().join(',')!=='bK,bQ,wK,wQ'||Object.values(g.rights).some(v=>typeof v!=='boolean'))return false;
 if(g.ep!==null&&(!Number.isInteger(g.ep)||g.ep<0||g.ep>=64))return false;
 if(!Number.isInteger(g.ply)||g.ply<0||!Number.isInteger(g.half)||g.half<0||!Array.isArray(g.history)||g.history.some(x=>typeof x!=='string'))return false;
 if(!g.repetitions||typeof g.repetitions!=='object'||Object.values(g.repetitions).some(x=>!Number.isInteger(x)||x<1))return false;
 if(!['w','b'].every(s=>TYPES.every(t=>Number.isFinite(g.roster?.[s]?.[t])&&g.roster[s][t]>=0&&g.roster[s][t]<=Math.max(100,ROSTER_SIZE))))return false;
 if(['w','b'].some(s=>g.board.filter(p=>p?.s===s&&p.t==='k').length>1))return false;
 if(g.mode==='classic'&&continuationIssue(g))return false;return true;
}
