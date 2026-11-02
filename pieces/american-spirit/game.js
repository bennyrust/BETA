const ns='http://www.w3.org/2000/svg',scene=document.getElementById('scene'),moving=document.getElementById('moving'),placed=document.getElementById('placed');
const pieces={
 hood:{x:310,y:112,art:'<g transform="translate(-310 -112)"><image href="reference.jpg" width="600" height="800" preserveAspectRatio="xMidYMid meet" clip-path="url(#photo-hood)"/></g>'},
 robe:{x:294,y:332,art:'<g transform="translate(-294 -332)"><image href="reference.jpg" width="600" height="800" preserveAspectRatio="xMidYMid meet" clip-path="url(#photo-robe)"/></g>'},
 wires:{x:300,y:360,art:'<g transform="translate(-300 -360)"><image href="reference.jpg" width="600" height="800" preserveAspectRatio="xMidYMid meet" clip-path="url(#photo-wires)"/></g>'}
};
let selected=null,position={x:300,y:330},results=[],dragging=false;
const buttons=[...document.querySelectorAll('[data-piece]')];
const previews={hood:'-45 -85 90 165',robe:'-185 -190 360 385',wires:'-260 -120 485 265'};
const labels={hood:'Drag hood / mask onto photograph',robe:'Drag robe onto photograph',wires:'Drag hand wires onto photograph'};
for(const button of buttons){
 const id=button.dataset.piece;button.setAttribute('aria-label',labels[id]);button.title=labels[id];
 button.innerHTML=`<svg viewBox="${previews[id]}" aria-hidden="true" focusable="false">${pieces[id].art}</svg>`;
}

function paint(){moving.innerHTML=selected?`<g transform="translate(${position.x} ${position.y})">${pieces[selected].art}</g>`:'';buttons.forEach(b=>b.classList.toggle('selected',b.dataset.piece===selected));}
function point(e){const p=scene.createSVGPoint();p.x=e.clientX;p.y=e.clientY;return p.matrixTransform(scene.getScreenCTM().inverse());}
function choose(id){if(results.some(r=>r.id===id))return;selected=id;position={x:300,y:330};paint();}
function pin(){if(!selected)return;const id=selected,target=pieces[id],distance=Math.hypot(position.x-target.x,position.y-target.y),points=Math.max(0,Math.round(100-distance*.4));const group=document.createElementNS(ns,'g');group.setAttribute('transform',`translate(${position.x} ${position.y})`);group.innerHTML=target.art;placed.append(group);results.push({id,points});buttons.find(b=>b.dataset.piece===id).disabled=true;selected=null;paint();const total=results.reduce((a,r)=>a+r.points,0);document.getElementById('score').textContent=`${results.length} / 3 placed · ${total} / 300`;if(results.length===3){document.querySelector('.result').hidden=false;document.getElementById('resultTitle').textContent=`${total} / 300`;}}
buttons.forEach(b=>{b.addEventListener('pointerdown',e=>{if(e.button!==0)return;choose(b.dataset.piece);dragging=true;b.setPointerCapture(e.pointerId);});b.addEventListener('click',()=>{if(!selected&&!b.disabled)choose(b.dataset.piece);});});
window.addEventListener('pointermove',e=>{if(!dragging||!selected)return;const p=point(e);position={x:Math.max(0,Math.min(600,p.x)),y:Math.max(0,Math.min(800,p.y))};paint();});
window.addEventListener('pointerup',e=>{if(!dragging)return;dragging=false;const p=point(e);if(p.x>=0&&p.x<=600&&p.y>=0&&p.y<=800)pin();});
window.addEventListener('pointercancel',()=>{dragging=false;selected=null;paint();});scene.addEventListener('click',e=>{if(!selected)return;position=point(e);pin();});
window.addEventListener('keydown',e=>{if(!selected)return;const delta=e.shiftKey?20:5;if(e.key==='Enter'||e.key===' '){e.preventDefault();pin();return;}const moves={ArrowLeft:[-delta,0],ArrowRight:[delta,0],ArrowUp:[0,-delta],ArrowDown:[0,delta]};if(moves[e.key]){e.preventDefault();position.x=Math.max(0,Math.min(600,position.x+moves[e.key][0]));position.y=Math.max(0,Math.min(800,position.y+moves[e.key][1]));paint();}if(e.key==='Escape'){selected=null;paint();}});
document.getElementById('reset').onclick=()=>{selected=null;dragging=false;results=[];placed.replaceChildren();buttons.forEach(b=>b.disabled=false);document.querySelector('.result').hidden=true;document.getElementById('score').textContent='0 / 3 placed';paint();};
