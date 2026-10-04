import {makeArena,stepArena} from './arena.mjs';
import {autoInput} from './bots.mjs';
import {drawArena} from './render.mjs';
import {loadArtwork} from './art.mjs';
import {benchHtml} from './benches.mjs';
import {SoundBank} from './sound.mjs';
const $=id=>document.getElementById(id),context=$('illustrated').getContext('2d');
const support={w:[{t:'n'},{t:'p'},{t:'b'},{t:'r'}],b:[{t:'p'},{t:'b'},{t:'q'},{t:'r'}]},vitality={w:{rock:100,scissors:100,paper:100},b:{rock:100,scissors:100,paper:100}};
const sfx=new SoundBank(false);let world,last=0,accumulator=0,paused=false,night=false,restartAt=null,artReady=false;
for(const s of ['w','b'])$('bench-'+s).innerHTML=benchHtml(support[s],s);
function reset(){const [w,b]=$('pair').value.split(',');world=makeArena({w,b},support,vitality,{night,duration:null,attacker:'w'});accumulator=0;restartAt=null;last=0;paint();}
function paint(){drawArena(context,world,support);const hud=world.fighters.map(f=>`<div class="demo-fighter"><b>${f.s==='w'?'Ivory':'Ember'} · ${f.t[0].toUpperCase()+f.t.slice(1)}</b><div class="hp-track"><i style="width:${100*f.hp/f.maxHp}%"></i></div><small>${Math.ceil(f.hp)} HP · ${f.shield>0?Math.ceil(f.shield)+' shield · ':''}${f.specialCd>0?'special '+f.specialCd.toFixed(1)+'s':'special ready'}</small></div>`).join('');$('spriteHud').innerHTML=hud;$('demoStatus').textContent=paused?'Paused':world.done?`${world.result.winner?world.result.winner==='w'?'Ivory wins':'Ember wins':'Double knockout'} · replaying shortly`:world.countdown>0?'The champions are getting ready.':`${world.elapsed.toFixed(1)}s · automatic fight · no time limit`;}
function frame(now){const dt=last?Math.min(.1,(now-last)/1000):0;last=now;if(artReady&&!paused&&!document.hidden){if(world.done){restartAt??=now+3500;if(now>=restartAt)reset();}else{accumulator+=dt;while(accumulator>=1/60&&!world.done){stepArena(world,1/60,autoInput(world));world.events.forEach(e=>sfx.play(e));accumulator-=1/60;}}paint();}requestAnimationFrame(frame);}
$('pair').onchange=reset;$('replay').onclick=reset;
function setNight(n){night=n;world.night=n;$('day').setAttribute('aria-pressed',String(!n));$('night').setAttribute('aria-pressed',String(n));paint();}
$('day').onclick=()=>setNight(false);$('night').onclick=()=>setNight(true);
$('pause').onclick=()=>{paused=!paused;restartAt=null;$('pause').textContent=paused?'Resume':'Pause';paint();};
$('sound').onclick=()=>{sfx.unlock();sfx.setEnabled(!sfx.enabled);$('sound').textContent=sfx.enabled?'Sound on':'Sound off';$('sound').setAttribute('aria-pressed',String(sfx.enabled));};
// Background tabs stop the simulation; returning does not consume combat time.
 document.addEventListener('visibilitychange',()=>{last=0;accumulator=0;restartAt=null;});
loadArtwork().then(ok=>{artReady=true;$('assetStatus').textContent=ok?'Hand-painted monsters & courtyard':'Some artwork could not load · refresh to retry';paint();});
reset();requestAnimationFrame(frame);
