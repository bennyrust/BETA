import {awardGame} from '../../js/economy.js';
import {notify} from '../../js/economy-ui.js';
let economySession=crypto.randomUUID();
import {Gallery, ROUND_COUNT, score, accuracy} from './game-core.js';
// Replace these files with final target artwork; keep transparent backgrounds.
export const ARTWORK={T:'art/terrorist.svg',CT:'art/counter-terrorist.svg'};
const $=id=>document.getElementById(id),game=new Gallery(),nodes=new Map();
let time=0,last=0,paused=false,raf,feedbackUntil=0,shownState='ready';
for(let i=0;i<6;i++){const slot=document.createElement('div');slot.className='slot';$('slots').append(slot);}
function hud(){const s=game.stats;$('round').textContent=`${game.round} / ${ROUND_COUNT}`;$('score').textContent=score(s).toLocaleString();$('accuracy').textContent=s.shots?`${Math.round(accuracy(s.hits,s.shots)*100)}%`:'—';$('hits').textContent=s.hits;$('escaped').textContent=s.escaped;}
function show(title,text,button){$('messageTitle').textContent=title;$('messageText').textContent=text;$('start').textContent=button;$('message').hidden=false;}
function render(){
 for(const [id,node] of nodes)if(!game.targets.some(t=>t.id===id)){node.remove();nodes.delete(id);}
 for(const t of game.targets){let node=nodes.get(t.id);if(!node){node=document.createElement('button');node.className='target';node.dataset.id=t.id;node.setAttribute('aria-label',`Shoot ${t.type==='T'?'terrorist':'counter-terrorist'} target`);const img=document.createElement('img');img.src=ARTWORK[t.type];img.alt='';const label=document.createElement('span');label.textContent=t.type;node.append(img,label);$('slots').children[t.slot].append(node);nodes.set(t.id,node);void node.offsetWidth;}
 node.classList.toggle('upright',t.status==='up');node.classList.toggle('closed',t.status!=='up');node.disabled=t.status!=='up'||time<t.ready;
 }
 hud();if(time>feedbackUntil)$('feedback').textContent='';
 if(game.state!==shownState){shownState=game.state;if(game.state==='round-end'||game.state==='over'){
  $('pause').disabled=true;const s=game.stats;if(game.state==='over')awardGame(economySession,'gallery',score(s)).then(n=>notify(`Session complete: +${n} coins`)).catch(e=>notify(e.message));show(game.state==='over'?'SESSION COMPLETE':`ROUND ${game.round} COMPLETE`,`${s.hits} hits / ${s.shots} shots · ${s.escaped} escaped · Average reaction ${s.hits?Math.round(s.reaction/s.hits):0} ms · Score ${score(s).toLocaleString()}`,game.state==='over'?'Play again':'Next round');
 }}
}
function shoot(id){if(paused||game.state!=='playing')return;const result=game.shoot(id,time);if(!result)return;$('feedback').textContent=result.hit?`+${result.points} · ${Math.round(result.reaction)} ms`:'MISS';feedbackUntil=time+650;render();}
$('range').addEventListener('click',e=>{if(e.target.closest('#message'))return;shoot(Number(e.target.closest('.target')?.dataset.id));});
$('start').addEventListener('click',()=>{if(paused){togglePause();return;}if(game.state==='over'){economySession=crypto.randomUUID();game.reset();nodes.forEach(n=>n.remove());nodes.clear();}game.begin(time);shownState='playing';$('message').hidden=true;$('pause').disabled=false;$('feedback').textContent='';hud();});
function togglePause(){if(game.state!=='playing')return;paused=!paused;document.body.classList.toggle('paused',paused);$('pause').textContent=paused?'Resume':'Pause';if(paused)show('PAUSED','The clock and targets are paused.','Resume');else{$('message').hidden=true;last=performance.now();}}
$('pause').addEventListener('click',togglePause);
window.addEventListener('keydown',e=>{if(e.code==='KeyP'&&!e.repeat){e.preventDefault();togglePause();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&!paused&&game.state==='playing')togglePause();});
function animate(now){if(!paused){time+=Math.min(now-last||0,100);game.tick(time);render();}last=now;raf=requestAnimationFrame(animate);}
raf=requestAnimationFrame(animate);window.addEventListener('pagehide',()=>cancelAnimationFrame(raf));window.addEventListener('pageshow',e=>{if(e.persisted){last=performance.now();raf=requestAnimationFrame(animate);}});hud();

window.addEventListener('inventorytoggle',e=>{if(e.detail&&!paused&&game.state==='playing')togglePause();});
