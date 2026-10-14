import { sequenceForVersion, TOTEM_PIXELS_PER_UNIT } from './totem-sequence.js';
import { mountVersionControls } from './totem-version-controls.js';
import { photoStage } from '../../../../js/totem-photo-stages.js';
import { mountPieceFiles } from './piece-files.js';
// One ordered glossy photographic sequence; no restart at strip boundaries.
// Height remains V2’s strictly decreasing 0.2 percentage-point progression.
export async function mountPhotoTower(piece){
 const host=document.getElementById('towerViewport'),track=document.getElementById('towerScroll'),status=document.getElementById('towerStatus');
 mountVersionControls(piece,'V3');
 const frames=[];
 for(let group=0;group<1;group++){
  const atlas=new Image();atlas.src=new URL('../pieces/can-tower/versions/V3/crushing-photo-v3.png',import.meta.url).href;await atlas.decode();
  const inspect=document.createElement('canvas');inspect.width=atlas.width;inspect.height=atlas.height;const read=inspect.getContext('2d',{willReadFrequently:true});read.drawImage(atlas,0,0);const data=read.getImageData(0,0,atlas.width,atlas.height).data;
  // Find actual transparent gutters; generated objects are not perfectly
  // centered in equal cells, which otherwise includes slivers of the next can.
  const spans=[];let start=-1;
  for(let x=0;x<=atlas.width;x++){
   let count=0;if(x<atlas.width)for(let y=0;y<atlas.height;y++)if(data[(y*atlas.width+x)*4+3]>64)count++;
   if(count>3){if(start<0)start=x;}
   else if(start>=0){if(x-start>30)spans.push([start,x]);start=-1;}
  }
  if(spans.length!==8)throw Error('Expected eight isolated can photographs');
  for(let n=0;n<8;n++){
   const [left,right]=spans[n];
   let x0=right,y0=atlas.height,x1=left,y1=0;
   for(let y=0;y<atlas.height;y++)for(let x=left;x<right;x++){if(data[(y*atlas.width+x)*4+3]>64){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}}
   if(x1<x0)throw Error('Missing photographic compression frame');
   // Keep opaque silhouette profiles, not one contact point. Every sample
   // across the foot must overlap the lower rim before the pair is seated.
   const top=[],bottom=[];
   for(let x=x0;x<=x1;x++){
    let first=y1,last=y0;
    for(let y=y0;y<=y1;y++)if(data[(y*atlas.width+x)*4+3]>240){first=Math.min(first,y);last=Math.max(last,y);}
    top.push((first-y0)/(y1-y0+1));bottom.push((last-y0+1)/(y1-y0+1));
   }
   frames.push({image:atlas,x:x0,y:y0,w:x1-x0+1,h:y1-y0+1,top,bottom});
  }
 }
 // Use measured proportions rather than claiming arbitrary crush percentages
 // for the generated photographs. Each successive stage must be shorter.
 const ratios=frames.map(f=>(f.h/f.w)/(frames[0].h/frames[0].w));
 for(let i=1;i<ratios.length;i++)if(ratios[i]>=ratios[i-1])throw Error('Photo stages must become progressively more crushed');
 function frameFor(ratio){
  const {from,to,mix}=photoStage(ratio,ratios);
  // Keep one opaque photograph: blending differing folds doubles the lettering.
  const source=frames[mix<.5?from:to];
  return {...source,width:125*((1-mix)*frames[from].w+mix*frames[to].w)/frames[0].w};
 }
 const sequence=sequenceForVersion('V3');let height=60;
 const cans=[];
 for(const ratio of sequence){
  const f=frameFor(ratio),h=ratio*TOTEM_PIXELS_PER_UNIT,width=f.width;
  const previous=cans.at(-1);let y=60;
  if(previous){
   let separation=Infinity;
   const halfFoot=Math.min(width,previous.width)*.31;
   for(let n=0;n<=64;n++){
    const x=-halfFoot+2*halfFoot*n/64;
    const upperIndex=Math.round((x/previous.width+.5)*(previous.f.w-1));
    const lowerIndex=Math.round((x/width+.5)*(f.w-1));
    separation=Math.min(separation,previous.f.bottom[upperIndex]*previous.h-f.top[lowerIndex]*h);
   }
   // Hide the visible lid ellipse beneath the base above, rather than
   // leaving a full photographed lid between the stacked cans.
   const rim=f.top.slice(Math.floor(f.w*.2),Math.ceil(f.w*.8));
   const rimDepth=(Math.max(...rim)-Math.min(...rim))*2*h;
   const nest=Math.max(h*.035,rimDepth)+Math.min(.75,h*.08);
   y=previous.y+Math.max(previous.h-Math.min(previous.h,h)*.24,separation-nest);
  }
  cans.push({ratio,y,h,f,width});height=Math.max(height,y+h);
 }

 track.dataset.version='V3';track.dataset.cans=String(cans.length);track.setAttribute('aria-label','Photographic can tower, progressively crushed to one pixel tall');
 const canvas=document.createElement('canvas');canvas.setAttribute('aria-label','Photographic Totem Pole');host.prepend(canvas);const ctx=canvas.getContext('2d');let frame=0;

 function draw(){frame=0;const offset=Math.max(0,-track.getBoundingClientRect().top);const w=host.clientWidth,h=host.clientHeight;ctx.clearRect(0,0,w,h);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  // Lower rims render first so the can above rests naturally over them.
  for(let index=cans.length-1;index>=0;index--){const can=cans[index],y=can.y-offset;if(y+can.h<0||y>h)continue;
   const f=can.f,width=can.width;
   ctx.drawImage(f.image,f.x,f.y,f.w,f.h,(w-width)/2,y,width,can.h);
  }

 }
 function invalidate(){if(!frame)frame=requestAnimationFrame(draw);}
 function resize(){const dpr=Math.min(devicePixelRatio,2);canvas.width=Math.round(host.clientWidth*dpr);canvas.height=Math.round(host.clientHeight*dpr);canvas.style.width=host.clientWidth+'px';canvas.style.height=host.clientHeight+'px';ctx.setTransform(dpr,0,0,dpr,0,0);track.style.height=(height+host.clientHeight*.3)+'px';invalidate();}
 new ResizeObserver(resize).observe(host);window.addEventListener('scroll',invalidate,{passive:true});resize();status.hidden=true;window.siteLoading?.finish();
 document.querySelector('h1').textContent=piece.name;document.querySelector('article').textContent=piece.documentation||'';
 mountPieceFiles('can-tower','can-tower',document.getElementById('towerGallery'),{photosOnly:true});
 window.addEventListener('pagehide',()=>cancelAnimationFrame(frame));
}
