// Read-only observations of the three r7 PNGs, after viewing each actual file.
// This is a fixture-specific audit, not an automatic chart parser or drawing step.
import {createRequire} from 'node:module';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
const require=createRequire(new URL('../../apps/paperbanana-api/package.json',import.meta.url));
const sharp=require('sharp'),dir=process.argv[2];
const specs=[
 {file:'generate-png-1-candidate-0.png',zero:687,alphaX:550,betaX:890,scanFrom:420,flowX:310,flowFrom:40,flowTo:150,axisLabelsBottomUp:[0,5,10,15,20,30],axisObservation:'Approximately equal tick spacing encodes unequal numeric intervals. Both bar tops are below the 30 line; reviewer incorrectly described Alpha above it.'},
 {file:'refine-png-1-candidate-0.png',zero:1380,alphaX:1100,betaX:1780,scanFrom:850,flowX:620,flowFrom:80,flowTo:300,axisLabelsBottomUp:[0,5,10,15,20,40],axisObservation:'Approximately equal tick spacing, final numeric step is 20 while previous steps are 5. Reviewer describes old 0–30 labels despite this submitted image displaying 40.'},
 {file:'restored-png-1-candidate-0.png',zero:668,max40:390,alphaX:550,betaX:850,scanFrom:395,flowX:310,flowFrom:130,flowTo:220,axisLabelsBottomUp:[0,10,20,30,40],axisObservation:'Linear labels; Alpha top is too high for 35. Chinese Check label violates the English-only request.'},
];
const results=[];
for(const s of specs){
 const {data,info}=await sharp(await readFile(path.join(dir,s.file))).flatten({background:'#fff'}).removeAlpha().raw().toBuffer({resolveWithObject:true});
 const blue=(x,y)=>{const i=(y*info.width+x)*info.channels,[r,g,b]=data.subarray(i,i+3);return b-r>25&&b>110&&r<165;};
 const first=(x,start,end)=>{for(let y=start;y<end;y++)if(Array.from({length:6},(_,i)=>blue(x,y+i)).every(Boolean))return y;throw Error('No bar pixels at inspected location');};
 const alphaTop=first(s.alphaX,s.scanFrom,s.zero),betaTop=first(s.betaX,s.scanFrom,s.zero),flowTop=first(s.flowX,s.flowFrom,s.flowTo);
 const alphaHeight=s.zero-alphaTop,betaHeight=s.zero-betaTop;
 results.push({...s,width:info.width,height:info.height,alphaTop,betaTop,alphaHeight,betaHeight,flowTop,normalizedFlowTop:flowTop/info.height,...(s.max40?{encodedAlpha:alphaHeight/(s.zero-s.max40)*40,encodedBeta:betaHeight/(s.zero-s.max40)*40}:{}),heightRatio:alphaHeight/betaHeight,expectedRatio:35/12,relativeRatioError:Math.abs(alphaHeight/betaHeight/(35/12)-1),method:'Interior pixel columns selected after visual inspection, six contiguous blue pixels identify the top. Approximate 2px tolerance (4px for 2K refine). Labels manually read from actual PNG. No source or output image modified.'});
}
await writeFile(path.join(dir,'independent-png-measurements.json'),JSON.stringify(results,null,2)+'\n');
console.log(JSON.stringify(results,null,2));
