// Small, local Web Audio effects. Audio unlocks on a player gesture, including on iOS.
const EFFECTS={
 move:[[340,240,.07,'triangle',0]],
 select:[[420,620,.1,'sine',0]],
 countdown:[[440,440,.07,'sine',0]],
 fight:[[440,660,.13,'triangle',0],[660,880,.17,'triangle',.1]],
 'swing-rock':[[115,45,.15,'sine',0]],
 'swing-scissors':[[600,190,.07,'triangle',0]],
 cast:[[420,1100,.13,'sine',0]],
 'special-rock':[[90,35,.22,'triangle',0]],
 'special-scissors':[[250,1250,.15,'triangle',0]],
 'special-paper':[[240,880,.24,'sine',0],[480,1100,.2,'sine',.04]],
 hit:[[180,55,.11,'triangle',0]],
 guard:[[820,300,.09,'sine',0]],
 shield:[[1000,500,.12,'sine',0]],
 cover:[[95,45,.1,'triangle',0]],
 knockout:[[330,220,.2,'triangle',0],[220,110,.24,'triangle',.13]],
 timeout:[[440,660,.12,'sine',0],[660,880,.17,'sine',.12]]
};
export class SoundBank{
 constructor(enabled=true){this.enabled=enabled;this.context=null;this.master=null;this.last={};}
 unlock(){if(!this.enabled)return;try{const C=window.AudioContext||window.webkitAudioContext;if(!C)return;if(!this.context){this.context=new C();this.master=this.context.createGain();this.master.gain.value=.32;this.master.connect(this.context.destination);}const promise=this.context.resume();promise?.catch?.(()=>{});}catch{}}
 setEnabled(enabled){this.enabled=enabled;if(this.master)this.master.gain.value=enabled ? .32 : 0;if(enabled)this.unlock();}
 play(kind){const ctx=this.context;if(!this.enabled||!ctx||ctx.state==='suspended'||!EFFECTS[kind])return;
  const now=ctx.currentTime;if(now-(this.last[kind]??-100)<.045)return;this.last[kind]=now;
  try{for(const[from,to,duration,type,delay]of EFFECTS[kind]){const osc=ctx.createOscillator(),gain=ctx.createGain(),start=now+delay;osc.type=type;osc.frequency.setValueAtTime(from,start);osc.frequency.exponentialRampToValueAtTime(to,start+duration);gain.gain.setValueAtTime(.001,start);gain.gain.exponentialRampToValueAtTime(.14,start+.006);gain.gain.exponentialRampToValueAtTime(.001,start+duration);osc.connect(gain);gain.connect(this.master);osc.start(start);osc.stop(start+duration+.02);osc.onended=()=>{osc.disconnect();gain.disconnect();};}}catch{}
 }
}
