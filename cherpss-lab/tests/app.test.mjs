import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {newGame,positionKey} from '../../cherpss/engine.mjs';
// This harness exercises actual UI handlers and the animation loop without a browser.
class Element{
 constructor(id,doc){this.id=id;this.doc=doc;this.children=[];this.hidden=false;this.listeners={};this.dataset={};this.attributes={};this.value='';this.textContent='';this.open=false;}
 set innerHTML(value){this.html=value;for(const m of value.matchAll(/id="([^"]+)"/g))this.doc.nodes[m[1]]=new Element(m[1],this.doc);}
 get innerHTML(){return this.html??'';}
 addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);}
 setAttribute(k,v){this.attributes[k]=v;}
 append(child){this.children.push(child);}
 replaceChildren(...children){this.children=children;}
 focus(){this.doc.focused=this;}
 showModal(){this.open=true;}
 close(){this.open=false;}
 click(){if(this.disabled)return;this.onclick?.();for(const fn of this.listeners.click??[])fn({});}
 getContext(){return this.doc.context;}
}
async function harness(saved,phone=false){
 const html=await readFile(new URL('../../cherpss/index.html',import.meta.url),'utf8');
 const context=new Proxy({createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}})},{get:(t,p)=>p in t?t[p]:()=>{},set:(t,p,v)=>(t[p]=v,true)});
 const classes=new Set();const doc={nodes:{},context,events:{},hidden:false,body:{classList:{toggle(c,on){if(on)classes.add(c);else classes.delete(c);},contains:c=>classes.has(c)}},getElementById(id){return this.nodes[id]??null;},createElement(tag){return new Element(tag,this);},querySelector(query){return query==='dialog[open]'?Object.values(this.nodes).find(n=>n.open)??null:null;},querySelectorAll(){return[];},addEventListener(type,fn){this.events[type]=fn;}};
 for(const m of html.matchAll(/id="([^"]+)"/g))doc.nodes[m[1]]=new Element(m[1],doc);doc.nodes.modeSelect.value='duel';doc.nodes.durationSelect.value='none';
 const events={},store={value:saved?JSON.stringify(saved):null},raf=[];
 globalThis.document=doc;globalThis.window={addEventListener(type,fn){events[type]=fn;},matchMedia:()=>({matches:phone})};Object.defineProperty(globalThis,'navigator',{configurable:true,value:{getGamepads:()=>[]}});globalThis.localStorage={getItem:()=>store.value,setItem:(k,v)=>store.value=v};globalThis.requestAnimationFrame=fn=>raf.push(fn);globalThis.setTimeout=()=>0;globalThis.clearTimeout=()=>{};
 await import('../../cherpss/app.mjs?case='+Math.random());
 let now=100;
 return{doc,events,store,get:id=>doc.nodes[id],state:()=>JSON.parse(store.value),key(code,down=true){events[down?'keydown':'keyup']({code,repeat:false,preventDefault(){}});},frames(n){for(let i=0;i<n;i++){now+=16;const fn=raf.shift();assert.ok(fn);fn(now);}},square(i){return doc.nodes.board.children[i];}};
}
test('UI: board moves → secret selection → duel → result → updated board',async()=>{
 const h=await harness({game:newGame(),duration:60});assert.equal(h.get('board').children.length,64);
 // e4, d5, exd5: the first challenge in an actual match.
 h.square(52).click();assert.ok(h.square(36).className.includes('legal'));h.square(36).click();assert.equal(h.state().game.turn,'b');h.square(11).click();h.square(27).click();h.square(36).click();h.square(27).click();
 assert.equal(h.get('stageOverlay').hidden,false);assert.ok(h.get('stageOverlay').innerHTML.includes('CHALLENGE AT D5'));
 h.key('KeyF');assert.ok(h.get('stageOverlay').innerHTML.includes('✓ LOCKED IN'));assert.ok(!h.get('roster-w').innerHTML.includes(' active'));
 h.key('KeyL');assert.equal(h.get('arenaArea').hidden,false);assert.equal(h.get('boardArea').hidden,true);assert.ok(h.get('roster-w').innerHTML.includes(' active'));
 h.key('Escape');assert.equal(h.get('pauseOverlay'),undefined);assert.equal(h.get('arenaArea').hidden,false);assert.equal(h.get('rulesBtn').disabled,true);
 h.frames(4100);h.frames(160);assert.ok(h.get('resultCard').innerHTML.includes('THE DUST SETTLES'));assert.ok(h.get('resultCard').innerHTML.includes('attacker wins'));assert.equal(h.get('arenaArea').hidden,false,'benches stay visible around the result');h.get('continueBtn').click();assert.equal(h.get('boardArea').hidden,false);assert.equal(h.state().game.board[27].s,'w');assert.equal(h.state().game.board[36],null);assert.equal(h.state().game.roster.w.rock,4);assert.equal(h.state().game.roster.b.paper,3);assert.equal(h.state().game.turn,'b');
});
test('UI: practice button is removed and ordinary chess can start',async()=>{
 const h=await harness({game:newGame(),duration:60});assert.equal(h.get('practiceBtn'),undefined);
 h.get('newBtn').click();assert.equal(h.get('newDialog').open,true);h.get('modeSelect').value='classic';h.get('startBtn').click();assert.equal(h.state().game.mode,'classic');assert.equal(h.get('boardMode').textContent,'CLASSIC CHESS');
});
test('UI: unfinished duel resumes at secret selection after reload',async()=>{
 const g=newGame();g.board[36]=g.board[52];g.board[52]=null;g.board[27]=g.board[11];g.board[11]=null;g.ply=2;g.repetitions={[positionKey(g)]:1};
 const h=await harness({game:g,duration:20,pending:{from:36,to:27}});assert.ok(h.get('stageOverlay').innerHTML.includes('CHALLENGE AT D5'));assert.ok(h.get('stageOverlay').innerHTML.includes('WAITING FOR YOUR CHOICE'));
});
test('UI: roster defeat offers consent, and accepted continuation uses classic rules',async()=>{
 const g=newGame();g.roster.b={rock:0,scissors:0,paper:0};const h=await harness({game:g,duration:25});assert.ok(h.get('requestBtn'));h.get('requestBtn').click();assert.ok(h.get('acceptBtn'));h.get('acceptBtn').click();assert.equal(h.state().game.mode,'classic');assert.equal(h.get('stageOverlay').hidden,true);
});
test('UI: accepted defeat stays finished across reload',async()=>{
 const g=newGame();g.roster.b={rock:0,scissors:0,paper:0};let h=await harness({game:g,duration:25});h.get('keepBtn').click();assert.equal(h.state().resolved,true);const stored=h.state();h=await harness(stored);assert.ok(h.get('stageOverlay').innerHTML.includes('MATCH COMPLETE'));assert.equal(h.get('stageOverlay').innerHTML.includes('Request ordinary chess'),false);
});
test('UI: phone detection enables automatic battles, private picks and playable duels',async()=>{
 const h=await harness(null,true);assert.equal(h.get('autoBtn').textContent,'Battles: automatic');assert.equal(h.state().duration,null);assert.ok(h.doc.body.classList.contains('auto-battles'));
 h.square(52).click();h.square(36).click();h.square(11).click();h.square(27).click();h.square(36).click();h.square(27).click();assert.ok(h.get('stageOverlay').innerHTML.includes('Ivory, choose your champion'));h.get('touch-scissors').click();assert.ok(h.get('stageOverlay').innerHTML.includes('Pass to Ember'));assert.ok(!h.get('stageOverlay').innerHTML.includes('The assassin'));h.get('handoffBtn').click();assert.ok(h.get('stageOverlay').innerHTML.includes('Ember, choose your champion'));h.get('touch-paper').click();assert.equal(h.get('arenaArea').hidden,false);assert.equal(h.get('clock').textContent,'∞');h.frames(3000);h.frames(160);assert.ok(h.get('resultCard').innerHTML.includes('THE DUST SETTLES'));h.get('continueBtn').click();assert.equal(h.get('boardArea').hidden,false);
});
test('UI: automatic battles have a persistent manual override',async()=>{
 let h=await harness(null,true);h.get('autoBtn').click();assert.equal(h.get('autoBtn').textContent,'Battles: manual');h=await harness(h.state(),true);assert.equal(h.get('autoBtn').textContent,'Battles: manual');
});
test('UI: one-minute and unlimited choices save the intended timing',async()=>{
 const h=await harness();h.get('durationSelect').value='60';h.get('startBtn').click();assert.equal(h.state().duration,60);h.get('durationSelect').value='none';h.get('startBtn').click();assert.equal(h.state().duration,null);
});
test('UI: old short duel limits migrate to unlimited',async()=>{const h=await harness({game:newGame(),duration:25});assert.equal(h.state().duration,null);});
test('UI: board pieces use team-coloured SVG rather than emoji glyphs',async()=>{const h=await harness();assert.ok(h.square(8).innerHTML.includes('chess-vector b piece-p'));assert.ok(h.square(48).innerHTML.includes('chess-vector w piece-p'));assert.ok(!h.square(48).innerHTML.includes('♟'));});
test('UI: move hints hide dots, preserve legal moves and combat support, and persist',async()=>{
 let h=await harness();h.square(52).click();assert.ok(h.square(36).className.includes('legal'));h.get('hintsBtn').click();assert.equal(h.state().moveHints,false);assert.ok(!h.square(36).className.includes('legal'));h.square(28).click();assert.equal(h.state().game.ply,0);h.square(52).click();h.square(36).click();assert.equal(h.state().game.board[36].s,'w');h=await harness(h.state());assert.equal(h.get('hintsBtn').textContent,'Move hints: off');h.square(11).click();h.square(27).click();h.square(36).click();assert.ok(!h.square(27).className.includes('legal'));h.square(27).click();assert.ok(h.get('support-w').innerHTML.includes('Pawn'));assert.ok(h.get('support-b').innerHTML.includes('Pawn'));assert.equal(h.get('assistBtn'),undefined);
});
test('UI: sounds start enabled and mute persists across reloads',async()=>{let h=await harness();assert.equal(h.get('soundBtn').textContent,'Sound on');h.get('soundBtn').click();assert.equal(h.state().soundEnabled,false);h=await harness(h.state());assert.equal(h.get('soundBtn').textContent,'Sound off');});
test('UI: old vector-art saves retain the match and no longer expose an art selector',async()=>{const game=newGame();game.ply=2;game.history=['Existing match'];const h=await harness({game,artStyle:'vector'});assert.equal(h.get('artSelect'),undefined);assert.deepEqual(h.state().game,game);assert.equal(h.state().artStyle,undefined);});
test('UI: reloading mid-duel resumes the same fight instead of rerolling picks',async()=>{
 let h=await harness({game:newGame(),duration:60});
 h.square(52).click();h.square(36).click();h.square(11).click();h.square(27).click();h.square(36).click();h.square(27).click();
 h.key('KeyF');h.key('KeyL');h.frames(400);
 const stored=h.state();assert.ok(stored.duel,'duel snapshot saved');const hp=stored.duel.world.fighters.map(f=>f.hp);
 h=await harness(stored);assert.equal(h.get('arenaArea').hidden,false,'arena reopens');assert.ok(!h.get('stageOverlay').innerHTML.includes('WAITING FOR YOUR CHOICE'));
 const again=h.state();assert.deepEqual(again.duel.world.fighters.map(f=>f.hp),hp);assert.deepEqual(again.duel.selection,{w:'rock',b:'paper'});
 h.frames(6000);h.frames(160);assert.ok(h.get('resultCard').innerHTML.includes('THE DUST SETTLES'));assert.equal(h.state().duel,null);
});
