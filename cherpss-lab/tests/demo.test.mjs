import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
// Exercise the real automatic demonstration and background-tab time handling.
test('illustrated automatic demonstration preserves lighting, pauses, and replays',async()=>{
 const html=await readFile(new URL('../../cherpss/art.html',import.meta.url),'utf8'),nodes={},raf=[],events={};
 const context=new Proxy({createRadialGradient:()=>({addColorStop(){}})},{get:(t,p)=>p in t?t[p]:()=>{},set:(t,p,v)=>(t[p]=v,true)});
 for(const m of html.matchAll(/id="([^"]+)"/g))nodes[m[1]]={value:'',textContent:'',innerHTML:'',attributes:{},setAttribute(k,v){this.attributes[k]=v;},getContext:()=>context};nodes.pair.value='rock,scissors';
 globalThis.document={hidden:false,getElementById:id=>nodes[id],createElement:()=>({getContext:()=>context}),addEventListener:(k,fn)=>events[k]=fn};globalThis.requestAnimationFrame=fn=>raf.push(fn);
 await import('../../cherpss/demo.mjs?test');let now=100;const frames=n=>{for(let i=0;i<n;i++){now+=1000/60;raf.shift()(now);}};
 frames(180);assert.equal(nodes.vectorHud,undefined);assert.ok(nodes.demoStatus.textContent.includes('automatic fight'));assert.ok(nodes['bench-w'].innerHTML.includes('Knight'));assert.ok(nodes['bench-b'].innerHTML.includes('Faster attacks'));
 nodes.night.onclick();assert.equal(nodes.night.attributes['aria-pressed'],'true');const before=nodes.spriteHud.innerHTML;nodes.pause.onclick();frames(600);assert.equal(nodes.spriteHud.innerHTML,before);nodes.pause.onclick();
 document.hidden=true;events.visibilitychange();frames(600);assert.equal(nodes.spriteHud.innerHTML,before);document.hidden=false;events.visibilitychange();
 frames(4000);assert.equal(nodes.vectorHud,undefined);nodes.replay.onclick();assert.ok(nodes.demoStatus.textContent.includes('getting ready'));assert.equal(nodes.night.attributes['aria-pressed'],'true');
 nodes.pair.value='paper,rock';nodes.pair.onchange();assert.ok(nodes.spriteHud.innerHTML.includes('Ivory · Paper'));frames(300);assert.equal(nodes.spriteHud.innerHTML,nodes.spriteHud.innerHTML);
});
