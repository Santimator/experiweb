// Solo opponents. Hellagoof searches shallowly and makes human-sized mistakes; Hellagood searches deeper,
// weighs every capture as the duel it really is, and picks champions from the equilibrium of the pick game.
// The AI never looks at the human's secret champion: picks are mixed strategies.
import {moves as legalMoves,TYPES,applyMove,positionKey} from './engine.mjs';

export const LEVELS={
 goof:{name:'Hellagoof',depth:2,quiesce:1,timeMs:250,noise:70,blunder:.12,fightSkill:.45,smartPicks:false},
 good:{name:'Hellagood',depth:5,quiesce:4,timeMs:900,noise:0,blunder:0,fightSkill:.8,smartPicks:true}
};
const HUMAN_AUTO_SKILL=.6;

// ---------- Duel odds ----------
// How much one helper piece shifts a duel (win-logit), measured in the lab; repeats of a piece count less.
const HELP={p:.33,n:.3,b:.4,r:.55,q:.75,k:.65},BEATS={rock:'scissors',scissors:'paper',paper:'rock'};
const sig=x=>1/(1+Math.exp(-x)),logit=p=>Math.log(p/(1-p));
function helpLogit(types){const seen={};let sum=0;for(const t of types){sum+=HELP[t]*.8**(seen[t]??0);seen[t]=(seen[t]??0)+1;}return sum;}
// Zero-sum pick game: rows are the attacker's champions, columns the defender's. Returns the row player's
// equilibrium mix and value, by a fine grid over mixed strategies (3 options, cached).
const solved=new Map();
export function pickGame(rowTypes,colTypes,shift){
 const key=rowTypes.join()+'|'+colTypes.join()+'|'+Math.round(shift*20);if(solved.has(key))return solved.get(key);
 const M=rowTypes.map(a=>colTypes.map(b=>sig(logit(a===b?.5:BEATS[a]===b?.85:.15)+shift)));
 let best={value:-1,mix:null};const n=rowTypes.length,step=n===1?1:n===2?.01:.02;
 const tryMix=mix=>{let worst=Infinity;for(let j=0;j<colTypes.length;j++){let v=0;for(let i=0;i<n;i++)v+=mix[i]*M[i][j];worst=Math.min(worst,v);}if(worst>best.value)best={value:worst,mix};};
 if(n===1)tryMix([1]);else if(n===2)for(let a=0;a<=1.0001;a+=step)tryMix([a,1-a]);else for(let a=0;a<=1.0001;a+=step)for(let b=0;a+b<=1.0001;b+=step)tryMix([a,b,Math.max(0,1-a-b)]);
 const out={value:best.value,mix:best.mix,types:rowTypes};solved.set(key,out);return out;}
const available=(roster,s)=>TYPES.filter(t=>roster[s][t]>0);

// ---------- Fast board for search ----------
// Pieces as signed ints: white +1..+6, black -1..-6 for p n b r q k. Index 0 is a8, as in the engine.
const CODE={p:1,n:2,b:3,r:4,q:5,k:6},LETTER=['','p','n','b','r','q','k'],VAL=[0,100,320,330,500,900,0];
const KN=[[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]],KG=[[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
const DIAG=[[1,1],[1,-1],[-1,1],[-1,-1]],ORTH=[[1,0],[-1,0],[0,1],[0,-1]];
const MATE=100000;
function toFast(g){const b=new Int8Array(64);g.board.forEach((p,i)=>{if(p)b[i]=(p.s==='w'?1:-1)*CODE[p.t];});
 let rights=0;if(g.rights.wK)rights|=1;if(g.rights.wQ)rights|=2;if(g.rights.bK)rights|=4;if(g.rights.bQ)rights|=8;
 const total=s=>TYPES.reduce((n,t)=>n+g.roster[s][t],0);
 return{b,turn:g.turn==='w'?1:-1,ep:g.ep??-1,rights,champ:{1:total('w'),[-1]:total('b')},classic:g.mode==='classic',roster:g.roster};}
function gen(st,capturesOnly=false){
 const b=st.b,s=st.turn,out=[];
 for(let i=0;i<64;i++){const v=b[i];if(!v||Math.sign(v)!==s)continue;const t=Math.abs(v),r=i>>3,c=i&7;
  const push=(to,extra)=>{const tv=b[to];if(tv&&Math.sign(tv)===s)return false;if(capturesOnly&&!tv)return true;out.push({from:i,to,cap:Math.abs(tv),pt:t,...extra});return !tv;};
  if(t===1){const d=s===1?-8:8,last=s===1?0:7,start=s===1?6:1,y=r+(s===1?-1:1);
   if(y>=0&&y<8){if(!b[i+d]&&!capturesOnly){out.push({from:i,to:i+d,cap:0,pt:1,promo:y===last?5:0});if(r===start&&!b[i+2*d])out.push({from:i,to:i+2*d,cap:0,pt:1,double:1});}
    for(const dc of [-1,1]){const x=c+dc;if(x<0||x>7)continue;const to=y*8+x,tv=b[to];if(tv&&Math.sign(tv)!==s)out.push({from:i,to,cap:Math.abs(tv),pt:1,promo:y===last?5:0});else if(to===st.ep&&b[r*8+x]===-s)out.push({from:i,to,cap:1,pt:1,ep:r*8+x});}}}
  else if(t===2||t===6){for(const [dy,dx] of t===2?KN:KG){const y=r+dy,x=c+dx;if(y>=0&&y<8&&x>=0&&x<8)push(y*8+x);}
   if(t===6&&!capturesOnly&&!st.classic){const home=s===1?60:4,k=s===1?1:4,q=s===1?2:8;
    if(i===home){if(st.rights&k&&b[home+3]===4*s&&!b[home+1]&&!b[home+2])out.push({from:i,to:home+2,cap:0,pt:6,castle:[home+3,home+1]});if(st.rights&q&&b[home-4]===4*s&&!b[home-1]&&!b[home-2]&&!b[home-3])out.push({from:i,to:home-2,cap:0,pt:6,castle:[home-4,home-1]});}}}
  else{for(const [dy,dx] of t===3?DIAG:t===4?ORTH:[...DIAG,...ORTH]){let y=r+dy,x=c+dx;while(y>=0&&y<8&&x>=0&&x<8){if(!push(y*8+x))break;y+=dy;x+=dx;}}}
 }return out;}
// Make a move in place; win=false means the attacker lost its duel and is removed. Returns an undo record.
function make(st,m,win=true){const b=st.b,u={m,win,from:b[m.from],to:b[m.to],ep:st.ep,rights:st.rights,epPiece:m.ep!==undefined?b[m.ep]:0,champ:{...st.champ}};
 const mover=b[m.from],s=st.turn;st.ep=-1;
 const rev=(v,i)=>{if(Math.abs(v)===6)st.rights&=v>0?~3:~12;if(Math.abs(v)===4){if(i===63)st.rights&=~1;if(i===56)st.rights&=~2;if(i===7)st.rights&=~4;if(i===0)st.rights&=~8;}};
 rev(mover,m.from);
 if(m.cap&&!st.classic){if(win){st.champ[-s]--;}else{st.champ[s]--;b[m.from]=0;st.turn=-s;return u;}}
 if(m.cap)rev(b[m.to],m.to);
 if(m.ep!==undefined)b[m.ep]=0;b[m.to]=m.promo?m.promo*s:mover;b[m.from]=0;
 if(m.castle){b[m.castle[1]]=b[m.castle[0]];b[m.castle[0]]=0;}if(m.double)st.ep=(m.from+m.to)/2;
 st.turn=-s;return u;}
function unmake(st,u){const b=st.b,m=u.m;st.turn=-st.turn;st.ep=u.ep;st.rights=u.rights;st.champ=u.champ;b[m.from]=u.from;b[m.to]=u.to;if(m.ep!==undefined)b[m.ep]=u.epPiece;if(m.castle&&(!m.cap||u.win)){b[m.castle[0]]=b[m.castle[1]];b[m.castle[1]]=0;}}

// Static evaluation from White's point of view.
function evaluate(st){const b=st.b;let score=0,wk=-1,bk=-1;
 for(let i=0;i<64;i++){const v=b[i];if(!v)continue;const t=Math.abs(v),s=Math.sign(v),r=i>>3,c=i&7,rel=s===1?r:7-r;let x=VAL[t];
  if(t===1)x+=[0,90,55,32,18,8,0,0][rel]+(c>1&&c<6?6:0);
  else if(t===2)x-=(Math.abs(3.5-r)+Math.abs(3.5-c))*9;
  else if(t===3)x-=(Math.abs(3.5-r)+Math.abs(3.5-c))*4;
  else if(t===5)x-=(Math.abs(3.5-r)+Math.abs(3.5-c))*2;
  else if(t===6){x-=(7-rel)*12;if(s===1)wk=i;else bk=i;}
  score+=s*x;}
 if(wk<0)return -MATE;if(bk<0)return MATE;
 if(!st.classic)score+=(st.champ[1]-st.champ[-1])*70;
 return score;}

// ---------- Search ----------
// Captures are chance nodes in duel chess: the attacker wins its duel with probability p.
function duelOdds(st,m,ctx){
 if(st.classic)return 1;
 const b=st.b,s=st.turn,centre=m.ep??m.to,r=centre>>3,c=centre&7,mine=[LETTER[Math.abs(b[m.from])]],theirs=[];
 for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const y=r+dy,x=c+dx;if(y<0||y>7||x<0||x>7)continue;const i=y*8+x;if(i===m.from)continue;const v=b[i];if(!v)continue;(Math.sign(v)===s?mine:theirs).push(LETTER[Math.abs(v)]);}
 const sideName=s===1?'w':'b',foe=s===1?'b':'w',bias=s===ctx.aiTurn?ctx.skillEdge:-ctx.skillEdge;
 return pickGame(available(ctx.roster,sideName),available(ctx.roster,foe),helpLogit(mine)-helpLogit(theirs)+bias).value;}
// Most valuable victim first, least valuable attacker first; promotions early; quiet moves last.
const key=m=>(m.cap?10000+VAL[m.cap]*10-VAL[m.pt]/10:0)+(m.cap===6?50000:0)+(m.promo?5000:0);
function order(list){return list.sort((a,b)=>key(b)-key(a));}
function terminal(st){if(!st.classic){if(st.champ[st.turn]<=0)return -MATE+1;if(st.champ[-st.turn]<=0)return MATE-1;}return null;}
function search(st,depth,alpha,beta,ctx,ply){
 if((++ctx.nodes&1023)===0&&performance.now()>ctx.deadline)ctx.stop=true;if(ctx.stop)return 0;
 const term=terminal(st);if(term!==null)return term;
 const kingAlive=st.b.includes(6*st.turn);if(!kingAlive)return -MATE+ply;
 if(depth<=0)return quiesce(st,ctx.quiesce,alpha,beta,ctx,ply);
 const list=order(gen(st));if(!list.length)return 0;let best=-Infinity;
 for(const m of list){const v=child(st,m,depth-1,alpha,beta,ctx,ply);if(ctx.stop)return 0;if(v>best)best=v;if(v>alpha)alpha=v;if(alpha>=beta)break;}
 // Game-deciding chances shrink with every move they are put off: take a winning shot now, not later.
 return Math.abs(best)>MATE/8?best-Math.sign(best)*400:best;}
function child(st,m,depth,alpha,beta,ctx,ply){
 if(m.cap===6&&(st.classic))return MATE-ply;
 if(!m.cap||st.classic){const u=make(st,m);const v=-search(st,depth,-beta,-alpha,ctx,ply+1);unmake(st,u);return v;}
 const p=duelOdds(st,m,ctx);
 // A won duel against the king ends the game.
 let win;if(m.cap===6)win=MATE-ply;else{const u=make(st,m,true);win=-search(st,depth,-Infinity,Infinity,ctx,ply+1);unmake(st,u);}
 const u=make(st,m,false);const lose=-search(st,depth,-Infinity,Infinity,ctx,ply+1);unmake(st,u);
 return p*win+(1-p)*lose;}
function quiesce(st,left,alpha,beta,ctx,ply){
 const stand=evaluate(st)*st.turn;if(left<=0)return stand;if(stand>=beta)return stand;if(stand>alpha)alpha=stand;
 for(const m of order(gen(st,true))){if(st.classic&&m.cap===6)return MATE-ply;
  let v;if(st.classic){const u=make(st,m);v=-quiesce(st,left-1,-beta,-alpha,ctx,ply+1);unmake(st,u);}
  else{const p=duelOdds(st,m,ctx);
   // Skip duels that cannot pay off even if won.
   if(stand+p*VAL[m.cap]+(m.cap===6?MATE:0)<alpha-200)continue;
   let win;if(m.cap===6)win=MATE-ply;else{const u=make(st,m,true);win=-quiesce(st,left-1,-Infinity,Infinity,ctx,ply+1);unmake(st,u);}
   const u=make(st,m,false);const lose=-quiesce(st,left-1,-Infinity,Infinity,ctx,ply+1);unmake(st,u);v=p*win+(1-p)*lose;}
  if(v>=beta)return v;if(v>alpha)alpha=v;}
 return alpha;}

// Pick a move for the side to move in game g. Returns an engine move (from the engine's legal list).
export function chooseMove(g,level='good',opts={}){
 const L=LEVELS[level]??LEVELS.good,legal=g.board.flatMap((p,i)=>p?.s===g.turn?legalMoves(g,i):[]);if(!legal.length)return null;
 const st=toFast(g),aiTurn=st.turn,human=opts.humanSkill??HUMAN_AUTO_SKILL;
 const ctx={nodes:0,stop:false,deadline:performance.now()+(opts.timeMs??L.timeMs),quiesce:L.quiesce,roster:g.roster,aiTurn,skillEdge:(L.fightSkill-human)*2.5};
 // Root moves: the engine's legal moves (promotions to a queen only, the engine offers all four).
 const fast=gen(st),roots=legal.filter(m=>!m.promote||m.promote==='q').map(m=>({engine:m,fast:fast.find(f=>f.from===m.from&&f.to===m.to)})).filter(x=>x.fast);
 let scored=roots.map(x=>({...x,score:key(x.fast)}));scored.sort((a,b)=>b.score-a.score);
 for(let depth=1;depth<=(opts.depth??L.depth);depth++){
  // Best-so-far first; Hellagood prunes the rest against it, Hellagoof keeps exact scores for its noise.
  const pass=[];let alpha=-Infinity;
  for(const x of scored){const v=child(st,x.fast,depth-1,L.noise?-Infinity:alpha,Infinity,ctx,1);if(ctx.stop)break;pass.push({...x,score:v});if(v>alpha)alpha=v;}
  if(ctx.stop)break;scored=pass.sort((a,b)=>b.score-a.score);}
 // Steer away from positions already seen: repeating them drifts towards a drawn game.
 for(const x of scored){if(x.engine.to!==undefined&&!g.board[x.engine.epCapture??x.engine.to]){const seen=g.repetitions?.[positionKey(applyMove(g,x.engine))]??0;x.score-=seen*40;}}
 scored.sort((a,b)=>b.score-a.score);
 if(opts.debug)return scored.map(x=>[x.engine.from,x.engine.to,Math.round(x.score)]);
 const rand=opts.random??Math.random;
 if(L.noise){const best=scored[0].score;
  if(rand()<L.blunder){const ok=scored.filter(x=>x.score>best-300);return ok[Math.floor(rand()*ok.length)].engine;}
  const noisy=scored.map(x=>({x,v:x.score+gauss(rand)*L.noise})).sort((a,b)=>b.v-a.v);return noisy[0].x.engine;}
 return scored[0].engine;}
function gauss(rand){let u=0,v=0;while(!u)u=rand();while(!v)v=rand();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);}

// Secret champion pick for side s in the current duel. Hellagood plays the pick game's equilibrium;
// Hellagoof picks any champion it still has.
export function chooseChampion(g,support,s,attacker,level='good',opts={}){
 const L=LEVELS[level]??LEVELS.good,mine=available(g.roster,s),foe=s==='w'?'b':'w',theirs=available(g.roster,foe),rand=opts.random??Math.random;
 if(!mine.length)return null;if(!L.smartPicks||!theirs.length)return mine[Math.floor(rand()*mine.length)];
 const shift=helpLogit((support?.[s]??[]).map(p=>p.t))-helpLogit((support?.[foe]??[]).map(p=>p.t))+(L.fightSkill-(opts.humanSkill??HUMAN_AUTO_SKILL))*2.5;
 const game=pickGame(mine,theirs,shift);let x=rand();for(let i=0;i<mine.length;i++){x-=game.mix[i];if(x<=0)return mine[i];}return mine[mine.length-1];}
export function fightSkill(level){return (LEVELS[level]??LEVELS.good).fightSkill;}
