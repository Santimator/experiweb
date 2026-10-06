import {newGame,moves,captureTarget,square,PIECES,NAMES,TYPES,inCheck,validateSave,positionKey,migrateRoster,ROSTER_SIZE} from './engine.mjs';
import {Match} from './match.mjs';
import {surge} from './arena.mjs';
import {drawArena} from './render.mjs';
import {loadArtwork} from './art.mjs';
// Champion icons are crops of each champion's idle sprite, trimmed to the figure (Black's face left).
// Idle-frame crops of each team's champions sheet.
const ICON_BOX={w:{rock:{x:48,y:89,w:204,h:193},scissors:{x:50,y:364,w:200,h:209},paper:{x:54,y:642,w:192,h:196}},b:{rock:{x:47,y:90,w:206,h:192},scissors:{x:43,y:354,w:214,h:219},paper:{x:58,y:641,w:184,h:196}}};
function champIcon(t,s='w',size=34){const f=ICON_BOX[s==='b'?'b':'w'][t],k=size/f.h;return `<span class="champ-icon ${s==='b'?'b flip':'w'}" aria-hidden="true" style="width:${Math.round(f.w*k)}px;height:${size}px;background-size:${Math.round(1774*k)}px ${Math.round(887*k)}px;background-position:${-Math.round(f.x*k)}px ${-Math.round(f.y*k)}px"></span>`;}
import {benchHtml} from './benches.mjs';
import {pieceSvg,pieceFigure} from './pieces.mjs';
import {autoInput} from './bots.mjs';
import {SoundBank} from './sound.mjs';
import {chooseMove,chooseChampion,fightSkill,LEVELS} from './ai.mjs';
const $=id=>document.getElementById(id),TEAM={w:'White',b:'Black'},ROLE={rock:'The juggernaut',scissors:'The assassin',paper:'The mage'},GLYPH={p:'♟',n:'♞',b:'♝',r:'♜',q:'♛',k:'♚'};
const STORE='cherpss-v1',keys=new Set(),pressed=new Set();let selected=null,promotionMoves=[],saveTimer=0,aftermathUntil=0,resultShown=false,frameNow=0,toastTimer,lastFrame=0,hudTimer=0,controllerSeen=false,previousPads={},storageAvailable=true;
const detectedPhone=!!window.matchMedia?.('(pointer: coarse)').matches&&!!window.matchMedia?.('(max-width: 900px)').matches;
let controlPreference=null,automatic=detectedPhone,handoff=false,moveHints=true;
// Solo play: {level:'goof'|'good', human:'w'|'b'}; null for two players on one device.
let solo=null,aiBusy=false;const aiSide=()=>solo?(solo.human==='w'?'b':'w'):null,aiName=()=>LEVELS[solo.level].name;
let match=new Match(),saved=null;
// Reloading must not reroll a duel: the running fight is saved and resumes after a short countdown.
// Projectiles point at their caster; store that as a side so the snapshot is plain JSON.
function duelSnapshot(){const w=match.world;return{selection:match.selection,world:{...w,events:[],projectiles:w.projectiles.map(p=>({...p,source:p.source.s}))}};}
function resumeDuel(duel){
 const w=duel?.world;if(match.phase!=='pick'||!w||!Array.isArray(w.fighters)||w.fighters.length!==2||w.done)return;
 const sel=duel.selection;if(!TYPES.includes(sel?.w)||!TYPES.includes(sel?.b)||w.fighters.some(f=>f.t!==sel[f.s]))return;
 const by={w:w.fighters.find(f=>f.s==='w'),b:w.fighters.find(f=>f.s==='b')};if(!by.w||!by.b)return;
 w.projectiles=(w.projectiles??[]).map(p=>({...p,source:by[p.source]})).filter(p=>p.source);
 w.events=[];w.countdown=Math.max(w.countdown??0,1.5);w.lastCountdown=null;
 match.selection={...sel};match.world=w;match.phase='fight';
}

try{saved=JSON.parse(localStorage.getItem(STORE));if(saved&&validateSave(saved.game)){controlPreference=['auto','manual'].includes(saved.controlPreference)?saved.controlPreference:null;automatic=controlPreference?controlPreference==='auto':detectedPhone;moveHints=saved.moveHints!==false;solo=LEVELS[saved.solo?.level]&&['w','b'].includes(saved.solo?.human)?{level:saved.solo.level,human:saved.solo.human}:null;match=new Match(migrateRoster(saved.game),saved.duration===60?60:null);if(saved.resolved&&match.phase==='continuation')match.keepWin();if(saved.pending&&match.phase==='board'&&match.play(saved.pending))resumeDuel(saved.duel);}}catch{storageAvailable=false;}
const sfx=new SoundBank(saved?.soundEnabled!==false);
window.addEventListener('pointerdown',()=>sfx.unlock());window.addEventListener('keydown',()=>sfx.unlock());
const ctx=$('arena').getContext('2d');
function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,3200);}
function save(){try{localStorage.setItem(STORE,JSON.stringify({game:match.game,duration:match.duration,solo,keys:mapping,controlPreference,moveHints,soundEnabled:sfx.enabled,resolved:match.phase==='gameover',pending:!match.practice&&['pick','fight'].includes(match.phase)?match.pending:null,duel:!match.practice&&match.phase==='fight'?duelSnapshot():null}));}catch{storageAvailable=false;}$('saveNote').textContent=storageAvailable?'Local play · no game accounts · progress saved on this device':'Local play · saving unavailable in this browser session';}
// Each roster card shows how many champions of that type are left, one pip each.
function renderRoster(s){const reveal=['fight','result'].includes(match.phase);$('roster-'+s).innerHTML=TYPES.map(t=>{const left=match.practice?ROSTER_SIZE:match.game.roster[s][t];return `<div class="roster-card ${left<=0?'exhausted':''} ${reveal&&match.selection[s]===t?'active':''}"><span class="monster-icon">${champIcon(t,s)}</span><div><strong>${NAMES[t]}</strong><small>${ROLE[t]}${left<=0?' · none left':''}</small></div><div class="vitality-row" aria-label="${left} of ${ROSTER_SIZE} left"><span class="pips">${Array.from({length:ROSTER_SIZE},(_,i)=>`<i class="${i<left?'on':''}"></i>`).join('')}</span><span>${left} left</span></div></div>`;}).join('');}
function renderBoard(){
 const g=match.game,legal=selected===null?[]:moves(g,selected),targets=new Set(legal.map(m=>m.to));$('board').replaceChildren();
 // Playing Black against the AI, the board is seen from Black's side.
 const flip=!!solo&&solo.human==='b';document.querySelectorAll('.rank-labels span').forEach((e,k)=>e.textContent=flip?k+1:8-k);document.querySelectorAll('.file-labels span').forEach((e,k)=>e.textContent='abcdefgh'[flip?7-k:k]);
 for(let n=0;n<64;n++){const i=flip?63-n:n,p=g.board[i],b=document.createElement('button');b.type='button';b.className='square'+(((i>>3)+i%8)%2?' dark':'')+(selected===i?' selected':'')+(moveHints&&targets.has(i)?' legal':'')+(moveHints&&targets.has(i)&&p?' capture':'')+([g.last?.from,g.last?.to].includes(i)?' last':'')+(g.mode==='classic'&&p?.t==='k'&&inCheck(g,p.s)?' check':'');b.setAttribute('aria-label',`${square(i)}${p?' · '+TEAM[p.s]+' '+PIECES[p.t]:', empty'}${targets.has(i)?' · available move':''}`);b.setAttribute('aria-pressed',String(selected===i));b.dataset.square=i;b.addEventListener('click',()=>boardClick(i));b.addEventListener('keydown',e=>{const d={ArrowLeft:-1,ArrowRight:1,ArrowUp:-8,ArrowDown:8}[e.code];if(d!==undefined){e.preventDefault();const next=Math.max(0,Math.min(63,i+(flip?-d:d)));$('board').querySelector(`[data-square="${next}"]`)?.focus();}});if(p)b.innerHTML=pieceFigure(p.t,p.s);b.disabled=match.phase!=='board';$('board').append(b);}
 const check=g.mode==='classic'&&inCheck(g,g.turn);$('boardCaption').textContent=g.mode==='classic'?(check?`${TEAM[g.turn]} is in check.`:'Ordinary chess · captures are final · kings must stay safe.'):moveHints?'Click a piece, then a highlighted square. Captures become duels.':'Click a piece, then its destination. Captures become duels.';
}
function boardClick(i){if(match.phase!=='board'||solo&&match.game.turn!==solo.human)return;const p=match.game.board[i];if(selected!==null){const options=moves(match.game,selected).filter(m=>m.to===i);if(options.length){if(options[0].promote&&match.game.mode==='duel'&&captureTarget(match.game,options[0])){const q=options.find(m=>m.promote==='q');laterPromotion={to:q.to,s:match.game.turn};play(q);return;}if(options[0].promote){promotionMoves=options;$('promotionOptions').replaceChildren();for(const m of options){const b=document.createElement('button');b.innerHTML=`${pieceSvg(m.promote,match.game.turn)}<small>${PIECES[m.promote]}</small>`;b.addEventListener('click',()=>{$('promotionDialog').close();play(m);});$('promotionOptions').append(b);}$('promotionDialog').showModal();return;}play(options[0]);return;}}
 selected=p?.s===match.game.turn?(selected===i?null:i):null;renderBoard();
}
// A pawn that captures onto the last rank in duel chess only promotes if it wins its duel, so the
// choice of piece is asked afterwards (it fights, and is placed, as a queen until then).
let laterPromotion=null;
function askLaterPromotion(){const lp=laterPromotion;laterPromotion=null;const p=lp&&match.game.board[lp.to];if(!p||p.s!==lp.s||p.t!=='q'||match.game.last?.to!==lp.to||!match.game.last?.attackerWins)return;
 $('promotionOptions').replaceChildren();for(const t of ['q','r','b','n']){const b=document.createElement('button');b.innerHTML=`${pieceSvg(t,lp.s)}<small>${PIECES[t]}</small>`;b.addEventListener('click',()=>{$('promotionDialog').close();
  match.game.board[lp.to]={s:lp.s,t};const h=match.game.history;if(t!=='q'&&h.length)h[h.length-1]=h[h.length-1].replace(/= Queen$/,'= '+PIECES[t]);save();render();});$('promotionOptions').append(b);}
 $('promotionDialog').showModal();}
function play(m){if(match.play(m)){selected=null;handoff=false;keys.clear();pressed.clear();sfx.play('move');save();render();}}
// The duel result sits in the middle of the arena so both benches stay visible around it.
function resultCard(html){$('resultCard').hidden=false;$('resultCard').innerHTML=html;resultShown=true;}
function overlay(html){$('stageOverlay').hidden=false;$('stageOverlay').innerHTML='<div class="stage-content">'+html+'</div>';}
function render(){if(['pick','fight','result'].includes(match.phase))loadArenaArt();
 const g=match.game,phase=match.phase;$('modeLabel').textContent=match.practice?'JUST A FRIENDLY SCRAP':g.mode==='classic'?'ORDINARY CHESS':'CHESS MEETS THE ARENA';$('headline').textContent=phase==='fight'?'The board set the stage. Now fight.':phase==='pick'?'Choose your champion. Keep it secret.':phase==='result'?'The dust settles.':phase==='gameover'?'The match is decided.':g.mode==='classic'?'Let the position speak.':'Plan your move. Pick your fight.';
 document.body.classList.toggle('auto-battles',automatic);document.body.classList.toggle('arena-open',['pick','fight','result'].includes(phase));$('autoBtn').textContent=automatic?'Battles: automatic':'Battles: manual';$('autoBtn').setAttribute('aria-pressed',String(automatic));$('autoBtn').disabled=phase==='fight';$('battleNote').textContent=solo?`Solo against ${aiName()} · ${automatic?'automatic battles':'keyboard or controller battles'}`:automatic?'Pass-and-play champion picks · automatic battles':match.duration===60?'Shared keyboard or controllers · one-minute duels':'Shared keyboard or controllers · unlimited duels';
 $('hintsBtn').textContent=moveHints?'Move hints: on':'Move hints: off';$('hintsBtn').setAttribute('aria-pressed',String(moveHints));$('soundBtn').textContent=sfx.enabled?'Sound on':'Sound off';$('soundBtn').setAttribute('aria-pressed',String(sfx.enabled));
 $('boardMode').textContent=g.mode==='classic'?'CLASSIC CHESS':'DUEL CHESS';$('localTag').textContent=solo?'SOLO · VS '+aiName().toUpperCase():'LOCAL · 2 PLAYERS';document.querySelectorAll('.player-panel .control-card').forEach((c,k)=>c.hidden=!!solo&&['w','b'][k]!==solo.human);for(const s of ['w','b'])$('player-'+s).textContent=solo?(s===solo.human?'YOU':aiName().toUpperCase()):s==='w'?'PLAYER ONE':'PLAYER TWO';$('status').textContent=phase==='board'?(solo?(g.turn===solo.human?'Your move':aiName()+' is thinking…'):TEAM[g.turn]+' to move'):phase==='pick'?'Secret selection':phase==='fight'?'Arena duel':phase==='result'?'Duel finished':'Match finished';
 for(const s of ['w','b']){$('turn-'+s).hidden=phase!=='board'||g.turn!==s;$('turn-'+s).textContent=solo&&s!==solo.human?'THINKING':'YOUR TURN';renderRoster(s);$('support-'+s).innerHTML=['pick','fight','result'].includes(phase)?benchHtml(match.support?.[s],s,match.support?.centre):'';}
 const arena=phase==='fight'||phase==='result'&&!!match.world;$('boardArea').hidden=arena;$('arenaArea').hidden=!arena;$('stageOverlay').hidden=true;$('resultCard').hidden=true;resultShown=false;$('newBtn').disabled=phase==='fight';$('rulesBtn').disabled=phase==='fight';
 renderBoard();$('moveCount').textContent=g.ply+' moves';$('historyList').replaceChildren();for(const line of [...g.history].reverse().slice(0,30)){const li=document.createElement('li');li.textContent=line;$('historyList').append(li);}
 if(phase==='pick'){
  const centre=match.support.centre;overlay(`<span class="eyebrow">${match.practice?'PRACTICE DUEL':`CHALLENGE AT ${square(centre).toUpperCase()}`}</span><h2>Two choices. One showdown.</h2><p>Choose on your side of the keyboard.<br>Both champions appear together when you're ready.</p><div class="pick-columns">${['w','b'].map(s=>solo&&s===aiSide()?`<div class="pick-box"><strong style="color:${s==='w'?'var(--ivory)':'var(--ember)'}">${TEAM[s]} · ${aiName()}</strong><p class="ready-state">${match.selection[s]?'✓ CHOSEN IN SECRET':'THINKING…'}</p></div>`:`<div class="pick-box"><strong style="color:${s==='w'?'var(--ivory)':'var(--ember)'}">${TEAM[s]}</strong><div class="choice-line">${TYPES.map((t,i)=>`<kbd>${keyLabel(mapping[s][['attack','guard','special'][i]])}</kbd> ${NAMES[t]}${!match.practice&&g.roster[s][t]<=0?' · unavailable':''}`).join('<br>')}</div><p class="ready-state">${match.selection[s]?'✓ LOCKED IN':'WAITING FOR YOUR CHOICE'}</p></div>`).join('')}</div><div class="support-preview">Controller choices: A Rock · X Scissors · B Paper<br>${match.practice?'A fresh roster. Your match will stay as it is.':'Your local formation will support your champion.'}</div>${match.practice?'<div class="stage-actions"><button id="cancelPractice" class="secondary">Back to board</button></div>':''}`);
  if(automatic)renderTouchPick();
  if(match.practice&&$('cancelPractice'))$('cancelPractice').onclick=()=>{match.practice=false;match.phase=match.returnPhase;handoff=false;render();};
 }else if(phase==='result'&&frameNow<aftermathUntil){
  // A short aftermath first: the winner celebrates, the loser collapses, the benches react.
 }else if(phase==='result'){
  const winner=match.result.winner,loser=winner?winner==='w'?'b':'w':null;(match.world?resultCard:overlay)(`<span class="eyebrow">${match.result.practice?'PRACTICE COMPLETE':'THE DUST SETTLES'}</span><h2>${winner?TEAM[winner]+' wins the duel':'A double defeat'}</h2><span class="result-pill">${match.result.reason}</span><p>${match.practice?'Try another champion, or return to your board.':winner?`${winner===match.result.attacker?'The capture succeeds.':'The defender holds. The attacker is removed.'}<br>${TEAM[loser]} loses a ${NAMES[match.selection[loser]]} champion (${match.game.roster[loser][match.selection[loser]]} left).`:'Both board pieces are removed. Both champions are eliminated.'}</p><div class="stage-actions"><button id="continueBtn" class="primary">${match.practice?'Back to board':'Return to board →'}</button>${match.practice?'<button id="againBtn" class="secondary">Another duel</button>':''}</div>`);
  $('continueBtn').onclick=()=>{match.continueAfterDuel();keys.clear();save();render();askLaterPromotion();};if(match.practice)$('againBtn').onclick=()=>{match.phase=match.returnPhase;match.practice=false;match.practiceStart();keys.clear();render();};
 }else if(phase==='continuation'){
  const winner=match.ending.winner,loser=match.ending.loser;
  if(match.offerStage==='loser')overlay(`<span class="eyebrow">${match.ending.reason.toUpperCase()}</span><h2>${winner?TEAM[winner]+' wins the brawl':'Both rosters are exhausted'}</h2><p>${loser?TEAM[loser]+', accept the defeat or ask for one last challenge on the chessboard.':'You can agree to settle this with ordinary chess.'}</p>${match.offerIssue?`<p>${match.offerIssue}</p>`:''}<div class="stage-actions"><button id="keepBtn" class="secondary">${winner?'Accept defeat':'Finish match'}</button><button id="requestBtn" class="primary" ${match.offerIssue?'disabled':''}>Request ordinary chess</button></div>`);
  else overlay(`<span class="eyebrow">A FINAL CHALLENGE</span><h2>${winner?TEAM[winner]+', your choice.':'Continue on the board?'}</h2><p>The same position. Ordinary chess rules.<br>Accept the challenge, or keep the brawl result.</p><div class="stage-actions"><button id="keepBtn" class="secondary">${winner?'Keep my win':'Keep the draw'}</button><button id="acceptBtn" class="primary">Accept · play chess</button></div>`);
  $('keepBtn').onclick=()=>{match.keepWin();save();render();};if($('requestBtn'))$('requestBtn').onclick=()=>{match.requestChess();render();};if($('acceptBtn'))$('acceptBtn').onclick=()=>{match.acceptChess();selected=null;save();render();};
 }else if(phase==='gameover'){
  overlay(`<span class="eyebrow">MATCH COMPLETE</span><h2>${match.ending.winner?TEAM[match.ending.winner]+' wins':'A worthy draw'}</h2><p>${match.ending.reason}</p><div class="stage-actions"><button id="rematchBtn" class="primary">Play again</button><button id="viewBoardBtn" class="secondary">View final board</button></div>`);$('rematchBtn').onclick=()=>$('newDialog').showModal();$('viewBoardBtn').onclick=()=>{$('stageOverlay').hidden=true;$('boardCaption').textContent=match.ending.reason+' · use New match to play again.';};
 }
 if(phase==='fight'){hud();drawArena(ctx,match.world,match.support);}
 scheduleAi();
}
function hud(){if(!match.world)return;for(const f of match.world.fighters){$('hud-'+f.s).innerHTML=`<div class="hud-name">${TEAM[f.s]} · ${NAMES[f.t]}</div><div class="hp-track"><i style="width:${Math.max(0,100*f.hp/f.maxHp)}%"></i></div><div class="hud-sub">${Math.ceil(f.hp)} HP · ${Math.ceil(f.stamina)} guard · ${f.specialCd>0?'special '+f.specialCd.toFixed(1)+'s':'SPECIAL READY'}${f.shield>0?' · shield '+Math.ceil(f.shield):''}</div>`;}$('clock').textContent=match.world.time===null?'∞':Math.ceil(match.world.time);const att=match.world.fighters.find(f=>f.s===match.world.attacker),boost=att?surge(match.world,att):1;$('lightLabel').textContent=boost>1?`${TEAM[match.world.attacker].toUpperCase()} SURGE ×${boost.toFixed(1)}`:(match.world.night?'BLACK REALM':'WHITE REALM')+(automatic?' · AUTO':'');}
function choose(s,t){const before=match.phase;if(match.choose(s,t)){handoff=automatic&&match.phase==='pick'&&!solo;keys.clear();pressed.clear();sfx.play('select');render();if(before!==match.phase)lastFrame=0;}else if(match.game.roster[s][t]<=0)toast(NAMES[t]+' is exhausted. Choose another champion.');}
function renderTouchPick(){const s=solo?solo.human:match.selection.w?'b':'w',cancel=match.practice?'<div class="stage-actions"><button id="cancelPractice" class="secondary">Back to board</button></div>':'';
 if(handoff){overlay(`<span class="eyebrow">FIRST CHOICE LOCKED IN</span><h2>Pass to ${TEAM[s]}</h2><p>The other player should look away.<br>The first champion stays hidden.</p><div class="stage-actions"><button id="handoffBtn" class="primary">${TEAM[s]} is ready</button></div>${cancel}`);$('handoffBtn').onclick=()=>{handoff=false;render();};return;}
 overlay(`<span class="eyebrow">${match.practice?'PRACTICE · ':''}PRIVATE CHAMPION PICK</span><h2>${TEAM[s]}, choose your champion</h2><p>Other player, look away.<br>Both champions reveal together, then fight automatically.</p><div class="touch-choices">${TYPES.map(t=>`<button id="touch-${t}" ${!match.practice&&match.game.roster[s][t]<=0?'disabled':''}><span>${champIcon(t,s,64)}</span><strong>${NAMES[t]}</strong><small>${ROLE[t]}</small></button>`).join('')}</div>${cancel}`);for(const t of TYPES)$('touch-'+t).onclick=()=>choose(s,t);
}
// Default keys for two players sitting sideways at either end of one keyboard, each turned towards it:
// White at the left end (E S D F to move, Q A Z to act), Black at the right end (P L ; . to move, arrows to act).
// Keys are physical positions (event.code), so they stay put on any keyboard layout. Double-click a key in a
// player's panel to change it.
const DEFAULT_KEYS={w:{up:'KeyF',down:'KeyS',left:'KeyE',right:'KeyD',attack:'KeyQ',guard:'KeyA',special:'KeyZ'},b:{up:'KeyL',down:'Semicolon',left:'Period',right:'KeyP',attack:'ArrowLeft',guard:'ArrowDown',special:'ArrowRight'}};
const ACTIONS=['up','down','left','right','attack','guard','special'],ACTION_LABEL={up:'Move up',down:'Move down',left:'Move left',right:'Move right',attack:'Attack · Rock',guard:'Guard · Scissors',special:'Special · Paper'};
let mapping=structuredClone(DEFAULT_KEYS),rebinding=null,layoutMap=null;
try{const k=saved?.keys;if(k&&['w','b'].every(s=>ACTIONS.every(a=>typeof k[s]?.[a]==='string'&&k[s][a].length<24)))mapping={w:{...k.w},b:{...k.b}};}catch{}
navigator.keyboard?.getLayoutMap?.().then(m=>{layoutMap=m;renderControls();}).catch(()=>{});
const KEY_NAMES={ArrowUp:'↑',ArrowDown:'↓',ArrowLeft:'←',ArrowRight:'→',Semicolon:';',Period:'.',Comma:',',Slash:'/',Quote:"'",BracketLeft:'[',BracketRight:']',Backslash:'\\',Minus:'-',Equal:'=',Backquote:'`',Space:'Space',Enter:'Enter',ShiftLeft:'L-Shift',ShiftRight:'R-Shift',ControlLeft:'L-Ctrl',ControlRight:'R-Ctrl',AltLeft:'L-Alt',AltRight:'R-Alt',Tab:'Tab',IntlBackslash:'<'};
function keyLabel(code){const k=layoutMap?.get?.(code);if(k&&k.trim())return k.toUpperCase();return KEY_NAMES[code]??code.replace(/^Key|^Digit|^Numpad/,'');}
// During a pick, each player's attack / guard / special key chooses Rock / Scissors / Paper.
function choiceFor(code){for(const s of ['w','b']){const m=mapping[s];if(code===m.attack)return[s,'rock'];if(code===m.guard)return[s,'scissors'];if(code===m.special)return[s,'paper'];}return null;}
function renderControls(){for(const s of ['w','b']){const el=$('controls-'+s);if(!el)continue;
  el.innerHTML=`<span class="eyebrow">YOUR SIDE OF THE KEYBOARD</span><p class="seat-note">${s==='w'?'Left end of the keyboard':'Right end of the keyboard'} · double-click a key to change it</p><div class="key-list">${ACTIONS.map(a=>`<span>${ACTION_LABEL[a]}</span><button type="button" class="keycap${rebinding?.s===s&&rebinding.a===a?' listening':''}" data-side="${s}" data-action="${a}" aria-label="${TEAM[s]} ${ACTION_LABEL[a]}: ${keyLabel(mapping[s][a])}. Double-click to change.">${rebinding?.s===s&&rebinding.a===a?'press a key':keyLabel(mapping[s][a])}</button>`).join('')}</div><button type="button" class="link-button" data-reset="${s}">Reset keys</button><p>Controller: stick · A attack · X guard · B special</p>`;}
 for(const b of document.querySelectorAll('.keycap'))b.ondblclick=()=>{rebinding={s:b.dataset.side,a:b.dataset.action};renderControls();};
 for(const b of document.querySelectorAll('[data-reset]'))b.onclick=()=>{mapping[b.dataset.reset]=structuredClone(DEFAULT_KEYS[b.dataset.reset]);rebinding=null;save();renderControls();};
 for(const s of ['w','b']){const r=$('rulesKeys-'+s);if(r){const m=mapping[s];r.textContent=`${keyLabel(m.up)} up · ${keyLabel(m.down)} down · ${keyLabel(m.left)} left · ${keyLabel(m.right)} right · ${keyLabel(m.attack)} attack · ${keyLabel(m.guard)} guard · ${keyLabel(m.special)} special`;}}}
// The next key pressed takes the action; a key already used elsewhere swaps places with the old one.
function rebind(code){const {s,a}=rebinding;rebinding=null;if(code!=='Escape'){const old=mapping[s][a];for(const t of ['w','b'])for(const x of ACTIONS)if(mapping[t][x]===code)mapping[t][x]=old;mapping[s][a]=code;save();}renderControls();}
window.addEventListener('keydown',e=>{if(rebinding){e.preventDefault();rebind(e.code);return;}if(document.querySelector('dialog[open]'))return;if(!['pick','fight'].includes(match.phase))return;const recognised=Object.values(mapping).some(m=>Object.values(m).includes(e.code));if(recognised)e.preventDefault();const choice=choiceFor(e.code);if(match.phase==='pick'&&!e.repeat&&choice){const [s,t]=choice;if(solo)choose(solo.human,t);else choose(s,t);return;}if(match.phase==='fight'){if(!keys.has(e.code))pressed.add(e.code);keys.add(e.code);}});
window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>{keys.clear();pressed.clear();});
// Attacks and specials fire on the press itself: holding the key does nothing more, so every blow is a tap.
function input(){const out={};for(const s of ['w','b']){const m=mapping[s];out[s]={x:Number(keys.has(m.right))-Number(keys.has(m.left)),y:Number(keys.has(m.down))-Number(keys.has(m.up)),attack:pressed.has(m.attack),guard:keys.has(m.guard),special:pressed.has(m.special)};}return out;}
function pads(controls){const list=Array.from(navigator.getGamepads?.()??[]).filter(Boolean).slice(0,2);if(list.length&&!controllerSeen){controllerSeen=true;toast('Controller connected. First pad is White; second is Black.');}for(let i=0;i<list.length;i++){const p=list[i],s=solo?solo.human:i===0?'w':'b',prev=previousPads[p.index]??[];const down=n=>!!p.buttons[n]?.pressed;const edge=n=>down(n)&&!prev[n];if(match.phase==='pick'){if(edge(0))choose(s,'rock');else if(edge(2))choose(s,'scissors');else if(edge(1))choose(s,'paper');}else if(match.phase==='fight'){if(Math.abs(p.axes[0]??0)>.2)controls[s].x=p.axes[0];if(Math.abs(p.axes[1]??0)>.2)controls[s].y=p.axes[1];if(down(14))controls[s].x=-1;if(down(15))controls[s].x=1;if(down(12))controls[s].y=-1;if(down(13))controls[s].y=1;controls[s].attack||=edge(0);controls[s].guard||=down(2);controls[s].special||=edge(1);}previousPads[p.index]=p.buttons.map(b=>b.pressed);}}
// In solo play the AI fighter is a bot at its level's skill; the human uses either side of the keyboard
// (or fights automatically at the standard skill).
function fightInput(controls){if(!solo)return automatic?autoInput(match.world):controls;const ai=aiSide(),h=solo.human,bot=autoInput(match.world,{[h]:.6,[ai]:fightSkill(solo.level)});if(automatic)return bot;
 const a=controls.w,b=controls.b,clamp=v=>Math.max(-1,Math.min(1,v));return{...bot,[h]:{x:clamp(a.x+b.x),y:clamp(a.y+b.y),attack:a.attack||b.attack,guard:a.guard||b.guard,special:a.special||b.special}};}
// The AI acts after a short pause: its move, its secret champion, and its answers at the end of a brawl.
function scheduleAi(){if(!solo||aiBusy)return;const ai=aiSide(),g=match.game;
 // Its champion is chosen at once (before the pick screen shows), so the screen never changes under the player's finger.
 if(match.phase==='pick'&&!match.practice&&!match.selection[ai]){aiBusy=true;queueMicrotask(()=>{aiBusy=false;if(match.phase!=='pick'||match.selection[ai])return;const t=chooseChampion(match.game,match.support,ai,match.game.turn,solo.level);if(t)choose(ai,t);});return;}
 if(match.phase==='continuation'){const {winner,loser}=match.ending;
  if(match.offerStage==='loser'&&loser===ai){match.keepWin();save();render();}
  else if(match.offerStage==='winner'&&(winner===ai||winner===null)){match.acceptChess();selected=null;save();render();toast(aiName()+' accepts: ordinary chess it is.');}return;}
 if(match.phase==='board'&&g.turn===ai&&!$('promotionDialog').open){aiBusy=true;setTimeout(()=>{const m=match.phase==='board'&&match.game.turn===ai&&!$('promotionDialog').open?chooseMove(match.game,solo.level):null;aiBusy=false;if(m)play(m);},450);}}
function frame(now){frameNow=now;const dt=lastFrame?Math.min(.04,(now-lastFrame)/1000):0;lastFrame=now;const controls=input();if(!automatic)pads(controls);pressed.clear();if(match.phase==='fight'){match.tick(dt,fightInput(controls));for(const event of match.world.events)sfx.play(event);match.world.events=[];if(match.phase==='result'){hud();aftermathUntil=now+2400;save();render();}else{drawArena(ctx,match.world,match.support);hudTimer+=dt;if(hudTimer>.08){hud();hudTimer=0;}saveTimer+=dt;if(saveTimer>.5){save();saveTimer=0;}}}
 else if(match.phase==='result'&&match.world){drawArena(ctx,match.world,match.support);if(!resultShown&&now>=aftermathUntil)render();}
 requestAnimationFrame(frame);}
$('hintsBtn').onclick=()=>{moveHints=!moveHints;save();render();};
$('autoBtn').onclick=()=>{if(match.phase==='fight')return;automatic=!automatic;controlPreference=automatic?'auto':'manual';handoff=false;keys.clear();pressed.clear();save();render();};
$('rulesBtn').onclick=()=>$('rulesDialog').showModal();$('newBtn').onclick=()=>$('newDialog').showModal();$('soundBtn').onclick=()=>{sfx.setEnabled(!sfx.enabled);sfx.play('select');save();render();};
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$(b.dataset.close).close());
$('opponentSelect').onchange=()=>{$('sideLabel').hidden=$('opponentSelect').value==='friend';};
// Closing the promotion dialog lets a waiting AI move.
$('promotionDialog').addEventListener('close',()=>render());
$('startBtn').onclick=()=>{const opp=$('opponentSelect').value,side=$('sideSelect').value;solo=LEVELS[opp]?{level:opp,human:side==='random'?(Math.random()<.5?'w':'b'):side}:null;aiBusy=false;match=new Match(newGame($('modeSelect').value),$('durationSelect').value==='60'?60:null);selected=null;handoff=false;keys.clear();pressed.clear();$('newDialog').close();save();render();};
// The figurines are needed at once; the arena art (about 2 MB) loads once the page has settled, or as soon as a duel needs it.
loadArtwork('board').then(ok=>{if(!ok)document.documentElement?.classList.add('no-figurines');});
function loadArenaArt(){if(loadArenaArt.started)return;loadArenaArt.started=true;loadArtwork('arena').then(ok=>{if(!ok)toast('Some artwork could not load. Please refresh to try again.');render();});}
if(document.readyState==='complete'||typeof addEventListener!=='function')setTimeout(loadArenaArt,1200);else addEventListener('load',()=>setTimeout(loadArenaArt,1200));
renderControls();render();save();requestAnimationFrame(frame);
if(saved&&validateSave(saved.game))toast('Your match is back.');
