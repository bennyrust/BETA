const overlay=document.getElementById('preview');
const closeButton=document.getElementById('closePreview');
const grid=document.querySelector('.pages');
const nav=document.querySelector('nav');
let trigger,image,motion,closing=false;
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
function fitted(){
  const ratio=image.naturalWidth/image.naturalHeight || 1065/1620;
  const height=Math.min(innerHeight-40,(innerWidth-40)/ratio);
  return {width:height*ratio,height,left:(innerWidth-height*ratio)/2,top:(innerHeight-height)/2};
}
function place(rect){Object.assign(image.style,{width:rect.width+'px',height:rect.height+'px',left:rect.left+'px',top:rect.top+'px'});}
function transform(from,to){return `translate(${from.left-to.left}px,${from.top-to.top}px) scale(${from.width/to.width},${from.height/to.height})`;}
grid.addEventListener('click',event=>{
  const page=event.target.closest('.page');
  if(!page||image)return;
  trigger=page;image=page.querySelector('img');
  const from=image.getBoundingClientRect();
  // Move the actual sheet; retain its grid slot while it is enlarged.
  page.style.aspectRatio=getComputedStyle(image).aspectRatio;
  overlay.hidden=false;
  overlay.append(image);image.id='expandedSheet';
  image.sizes='100vw';
  document.body.classList.add('page-expanded');grid.inert=true;nav.inert=true;
  const to=fitted();place(to);
  motion=image.animate([{transform:transform(from,to)},{transform:'none'}],{duration:reduced()?0:380,easing:'cubic-bezier(.22,.75,.25,1)'});
  closeButton.focus({preventScroll:true});
});
async function close(){
  if(!image||closing)return;
  closing=true;
  const from=image.getBoundingClientRect();
  motion?.cancel();
  const slot=trigger.getBoundingClientRect();
  place(slot);
  motion=image.animate([{transform:transform(from,slot)},{transform:'none'}],{duration:reduced()?0:200,easing:'cubic-bezier(.4,0,.2,1)'});
  await motion.finished.catch(()=>{});
  image.removeAttribute('style');image.removeAttribute('id');image.sizes='(max-width: 600px) 8vw, 90px';trigger.append(image);trigger.style.removeProperty('aspect-ratio');
  overlay.hidden=true;document.body.classList.remove('page-expanded');grid.inert=false;nav.inert=false;
  image=null;closing=false;trigger.focus({preventScroll:true});
}
closeButton.addEventListener('click',close);
overlay.addEventListener('click',event=>{if(event.target===overlay||event.target===image)close();});
window.addEventListener('keydown',event=>{if(image&&event.key==='Escape'){event.preventDefault();close();}});
window.addEventListener('resize',()=>{if(image&&!closing){motion?.cancel();place(fitted());}});

// Complete the lift even on a quick pass, then ease back after the cursor.
const trailTimers = new Map();
for (const page of document.querySelectorAll('.page')) {
  page.addEventListener('pointerenter', () => {
    clearTimeout(trailTimers.get(page));
    trailTimers.delete(page);
    page.classList.add('reacting');
  });
  page.addEventListener('pointerleave', () => {
    clearTimeout(trailTimers.get(page));
    trailTimers.set(page, setTimeout(() => {
      page.classList.remove('reacting');
      trailTimers.delete(page);
    }, 280));
  });
}
window.addEventListener('pagehide', () => {
  for (const timer of trailTimers.values()) clearTimeout(timer);
  trailTimers.clear();
  document.querySelectorAll('.reacting').forEach(page => page.classList.remove('reacting'));
});
