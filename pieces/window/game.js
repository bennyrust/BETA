import {createBackgrounds} from './backgrounds.js';
import {awardGame} from '../../js/economy.js';
import {notify} from '../../js/economy-ui.js';
let economySession=crypto.randomUUID();
import {Gallery, ROUND_COUNT, score, accuracy} from './game-core.js';
// Artwork remains independent from movement and the hinged target mount.
export const ARTWORK={T:'Game Assets/Terrorist.png',CT:'Game Assets/Counter Terrorist.png'};
const $=id=>document.getElementById(id),game=new Gallery(),nodes=new Map();
const backgrounds=createBackgrounds(document.querySelector('.scenery'));
let rangeWidth=0,rangeHeight=0;const rangeObserver=new ResizeObserver(([entry])=>{rangeWidth=entry.contentRect.width;rangeHeight=entry.contentRect.height;});rangeObserver.observe($('range'));
let loadingRound=false;
let time=0,last=0,paused=false,raf,feedbackUntil=0,shownState='ready';

function text(id,value){const node=$(id),next=String(value);if(node.textContent!==next)node.textContent=next;}
function hud(){const s=game.stats;text('round',`${game.round} / ${ROUND_COUNT}`);text('score',score(s).toLocaleString());text('accuracy',s.shots?`${Math.round(accuracy(s.hits,s.shots)*100)}%`:'—');text('hits',s.hits);text('escaped',s.escaped);}
function show(title,text,button){$('messageTitle').textContent=title;$('messageText').textContent=text;$('start').textContent=button;$('message').hidden=false;}
function render(){
 for(const [id,node] of nodes)if(!game.targets.some(t=>t.id===id)){node.parentElement.remove();nodes.delete(id);}
 for(const t of game.targets){let node=nodes.get(t.id);if(!node){node=document.createElement('button');node.className='target';node.dataset.id=t.id;node.setAttribute('aria-label',`Shoot ${t.type==='T'?'terrorist':'counter-terrorist'} target`);const img=document.createElement('img');img.src=ARTWORK[t.type];img.alt='';const label=document.createElement('span');label.textContent=t.type;node.append(img,label);const mount=document.createElement('div');mount.className='target-mount';mount.append(node);$('slots').append(mount);nodes.set(t.id,node);void node.offsetWidth;}
 const mount=node.parentElement;mount.style.transform=`translate3d(${t.x*rangeWidth}px,${t.y*rangeHeight}px,0) translate(-50%,-100%)`;mount.style.width=`${13+(t.y-.56)*14}%`;mount.style.zIndex=Math.round(t.y*100);
 node.classList.toggle('upright',t.status==='up');node.classList.toggle('closed',t.status!=='up');node.disabled=t.status!=='up'||time<t.ready;
 }
 hud();if(time>feedbackUntil)text('feedback','');
 if(game.state!==shownState){shownState=game.state;if(game.state==='round-end'||game.state==='over'){
  $('pause').disabled=true;const s=game.stats;if(game.state==='over')awardGame(economySession,'gallery',score(s)).then(n=>notify(`Session complete: +${n} coins`)).catch(e=>notify(e.message));show(game.state==='over'?'SESSION COMPLETE':`ROUND ${game.round} COMPLETE`,`${s.hits} hits / ${s.shots} shots · ${s.escaped} escaped · Average reaction ${s.hits?Math.round(s.reaction/s.hits):0} ms · Score ${score(s).toLocaleString()}`,game.state==='over'?'Play again':'Next round');
 }}
}
function shoot(id){if(paused||game.state!=='playing')return;const result=game.shoot(id,time);if(!result)return;$('feedback').textContent=result.hit?`+${result.points} · ${Math.round(result.reaction)} ms`:'MISS';feedbackUntil=time+650;render();}
$('range').addEventListener('click',e=>{if(e.target.closest('#message'))return;shoot(Number(e.target.closest('.target')?.dataset.id));});
$('start').addEventListener('click',async()=>{if(loadingRound)return;if(paused){togglePause();return;}if(game.state==='over'){economySession=crypto.randomUUID();game.reset();nodes.forEach(n=>n.parentElement.remove());nodes.clear();}loadingRound=true;$('start').disabled=true;$('start').textContent='Loading map…';await backgrounds.change();loadingRound=false;$('start').disabled=false;game.begin(time);shownState='playing';$('message').hidden=true;wake();$('pause').disabled=false;$('feedback').textContent='';hud();});
function togglePause(){if(game.state!=='playing')return;paused=!paused;document.body.classList.toggle('paused',paused);$('pause').textContent=paused?'Resume':'Pause';if(paused)show('PAUSED','The clock and targets are paused.','Resume');else{$('message').hidden=true;last=performance.now();wake();}}
$('pause').addEventListener('click',togglePause);
window.addEventListener('keydown',e=>{if(e.code==='KeyP'&&!e.repeat){e.preventDefault();togglePause();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&!paused&&game.state==='playing')togglePause();});
function wake(){if(!raf&&!paused&&game.state==='playing'&&!document.hidden){last=performance.now();raf=requestAnimationFrame(animate);}}
function animate(now){raf=0;if(paused||document.hidden||game.state!=='playing')return;time+=Math.min(now-last||0,100);last=now;game.tick(time);render();if(game.state==='playing')raf=requestAnimationFrame(animate);}
window.addEventListener('pagehide',()=>{cancelAnimationFrame(raf);raf=0;});window.addEventListener('pageshow',e=>{if(e.persisted)wake();});hud();

window.addEventListener('inventorytoggle',e=>{if(e.detail&&!paused&&game.state==='playing')togglePause();});
