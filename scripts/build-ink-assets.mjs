import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';

// Deterministic GPU data packing after the imagegen composition/editing pass.
// R = stationary brush density; G = diluted wash; B = displacement permission.
const names = ['rongxi', 'qingyuan', 'fuchun'];
const directory = 'public/assets/ink';
await mkdir(directory, { recursive: true });
const manifest = [];
const smooth = (a,b,v) => { const t=Math.max(0,Math.min(1,(v-a)/(b-a))); return t*t*(3-2*t); };
for (const name of names) {
  const {data, info} = await sharp(`assets-src/ink/${name}-composition.png`)
    .resize(1536,1024).flatten({background:'#fff'}).greyscale().raw().toBuffer({resolveWithObject:true});
  const {width,height,channels} = info;
  const density = Buffer.alloc(width*height);
  for(let i=0;i<density.length;i++) density[i]=Math.round(Math.max(0,(255-data[i*channels]-5)/250)*255);
  const wash = await sharp(density,{raw:{width,height,channels:1}}).blur(7).raw().toBuffer();
  const packed = Buffer.alloc(width*height*3), fallback = Buffer.alloc(width*height*4);
  for(let i=0;i<density.length;i++) {
    const d=density[i]/255, w=wash[i]/255;
    packed[i*3]=density[i]; packed[i*3+1]=wash[i];
    packed[i*3+2]=Math.round(smooth(.006,.09,w)*(1-smooth(.3,.8,d))*255);
    const x=(i%width)/(width-1), y=Math.floor(i/width)/(height-1);
    const feather=smooth(0,.025,x)*smooth(0,.025,1-x)*smooth(0,.02,y)*smooth(0,.025,1-y);
    fallback[i*4+3]=Math.round(Math.min(1,d*.78+w*.30)*feather*255);
  }
  const packedInfo = await sharp(packed,{raw:{width,height,channels:3}})
    .webp({lossless:true,effort:6}).toFile(`${directory}/${name}-packed.webp`);
  const staticInfo = await sharp(fallback,{raw:{width,height,channels:4}})
    .webp({lossless:true,effort:6}).toFile(`${directory}/${name}-static.webp`);
  manifest.push({name,width,height,packedBytes:packedInfo.size,staticBytes:staticInfo.size});
}
const totalBytes=manifest.reduce((sum,a)=>sum+a.packedBytes+a.staticBytes,0);
if(totalBytes>1_500_000) throw new Error(`Ink assets exceed budget: ${totalBytes}`);
await writeFile(`${directory}/manifest.json`, JSON.stringify({totalBytes,assets:manifest},null,2)+'\n');
console.log(JSON.stringify({totalBytes,assets:manifest},null,2));
