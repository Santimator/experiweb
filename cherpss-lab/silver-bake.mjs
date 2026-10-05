// Turn gold trim into silver on the Black rows (lower half) of a figurine sheet; moss, stone and effects keep their colours.
import {chromium} from '/opt/node-tools/node_modules/playwright/index.mjs';import fs from 'node:fs';
const b=await chromium.launch();const p=await b.newPage();await p.goto('http://localhost:8766/cherpss/art.html');
for(const [src,from] of [['aids.webp',.5],['bench-reactions.webp',.5]]){
 const data=await p.evaluate(async([src,from])=>{const im=new Image();im.src='/cherpss/assets/'+src+'?raw';await im.decode();const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const x=c.getContext('2d');x.drawImage(im,0,0);
  const y0=Math.floor(im.height*from),d=x.getImageData(0,y0,im.width,im.height-y0),q=d.data;
  for(let i=0;i<q.length;i+=4){const r=q[i],g=q[i+1],bl=q[i+2];if(q[i+3]<10)continue;const mx=Math.max(r,g,bl),mn=Math.min(r,g,bl),sat=mx?(mx-mn)/mx:0;
   let h=0;if(mx!==mn){if(mx===r)h=60*(((g-bl)/(mx-mn))%6);else if(mx===g)h=60*((bl-r)/(mx-mn)+2);else h=60*((r-g)/(mx-mn)+4);}if(h<0)h+=360;
   // gold / amber / brass: warm hues with real saturation
   if(h>=18&&h<=62&&sat>.28&&mx>60){const l=.3*r+.59*g+.11*bl,w=Math.min(1,(sat-.28)/.2),v=Math.min(255,l*1.12+18);q[i]=r+(v-r)*w;q[i+1]=g+(v-g)*w;q[i+2]=bl+(v*1.04-bl)*w;}}
  x.putImageData(d,0,y0);return c.toDataURL('image/webp',.92);},[src,from]);
 fs.writeFileSync('/tmp/claude-0/-home-user-experiweb/dd044898-0ae9-5706-a2eb-3371950470fe/scratchpad/silver/'+src,Buffer.from(data.split(',')[1],'base64'));console.log(src,'done');}
await b.close();
