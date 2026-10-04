import test from 'node:test';
import assert from 'node:assert/strict';
import {SoundBank} from '../../cherpss/sound.mjs';
function fakeAudio(){const voices=[];class Audio{
 constructor(){this.currentTime=1;this.state='running';this.destination={};}
 resume(){return Promise.resolve();}
 createGain(){return{gain:{value:1,setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}};}
 createOscillator(){const voice={type:'',frequency:{setValueAtTime(v){voice.from=v;},exponentialRampToValueAtTime(v){voice.to=v;}},connect(){},disconnect(){},start(t){voice.start=t;},stop(t){voice.stop=t;}};voices.push(voice);return voice;}
 }return{Audio,voices};}
test('audio unlocks after a gesture and muted effects create no voices',()=>{const f=fakeAudio();globalThis.window={AudioContext:f.Audio};const bank=new SoundBank();bank.play('hit');assert.equal(f.voices.length,0);bank.unlock();bank.play('hit');assert.equal(f.voices.length,1);bank.setEnabled(false);bank.play('cast');assert.equal(f.voices.length,1);assert.equal(bank.master.gain.value,0);});
test('combat sounds schedule distinct pitches and a result sequence',()=>{const f=fakeAudio();globalThis.window={AudioContext:f.Audio};const bank=new SoundBank();bank.unlock();bank.play('swing-rock');bank.play('cast');bank.play('knockout');assert.notEqual(f.voices[0].from,f.voices[1].from);assert.equal(f.voices.length,4);assert.ok(f.voices[3].start>f.voices[2].start);});
test('muting before unlock does not initialise audio',()=>{const f=fakeAudio();globalThis.window={AudioContext:f.Audio};const bank=new SoundBank(false);bank.unlock();assert.equal(bank.context,null);bank.setEnabled(true);assert.ok(bank.context);});
