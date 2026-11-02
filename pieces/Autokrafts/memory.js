import {sliceMasks} from './cards/slice-masks.js';
import {wallet,ready,transaction} from '../../js/economy.js';
import '../../js/economy-ui.js';
import {portraits,modes,startRound,flip} from './memory-core.js';
const $=id=>document.getElementById(id);let round=null,busy=false,mismatch=[],timer;
function terms(){const wager=Number($('wager').value),mode=modes[$('mode').value];$('terms').textContent=`Match 6 pairs in ${mode.moves} turns. Wager: ${wager||0} coins. Win payout: ${Math.floor((wager||0)*mode.multiplier)} coins (includes your wager). Lose: forfeit ${wager||0} coins.`;}
function render(){const g=round,active=g?.status==='playing';$('bet').hidden=!!active;$('pairs').textContent=`${(g?.matched.length||0)/2} / 6 pairs`;$('moves').textContent=g?`${g.moves} / ${modes[g.mode].moves} turns`:'—';$('stake').textContent=g?`Wager ${g.wager} · Payout ${Math.floor(g.wager*modes[g.mode].multiplier)}`:'';
 const focus=document.activeElement?.dataset.index;$('cards').replaceChildren();for(let i=0;i<12;i++){const shown=g&&(g.matched.includes(i)||g.selected.includes(i)||mismatch.includes(i)||!active),b=document.createElement('button');b.className='slice'+(shown?' revealed':'')+(g?.matched.includes(i)?' matched':'');b.dataset.index=i;b.disabled=!active||busy||!!g?.matched.includes(i)||!!g?.selected.includes(i);b.setAttribute('aria-label',shown?`${g.cards[i]}, slice ${i+1}${g.matched.includes(i)?', matched':''}`:`Face-down slice ${i+1}`);const img=document.createElement('img');img.alt='';img.draggable=false;if(shown){img.src=`cards/${g.cards[i]}-slice.webp`;img.style.clipPath=sliceMasks[g.cards[i]];}else{img.src='cards/blank-cheese.svg';}b.append(img);b.onclick=()=>choose(i);$('cards').append(b);}if(focus!==undefined)$('cards').querySelector(`[data-index="${focus}"]`)?.focus();
 if(g)$('status').textContent=active?'Find the matching cheese slices.':g.status==='won'?`All pairs matched! ${g.payout} coins returned · Profit ${g.payout-g.wager}.`:`Turn limit reached. You lost ${g.wager} coins.`;
}
async function refresh(){await ready;const state=await wallet();$('balance').textContent=`${state.coins.toLocaleString()} coins`;round=state.memoryRound||null;if(!busy)render();}
async function choose(index){if(busy||!round||round.status!=='playing')return;busy=true;try{const result=await transaction(s=>flip(s,round.id,index));round=result.round;mismatch=result.mismatch||[];render();if(mismatch.length){timer=setTimeout(()=>{mismatch=[];busy=false;render();},850);}else{busy=false;render();}await refresh();}catch(e){busy=false;$('status').textContent=e.message;await refresh();}}
$('bet').addEventListener('submit',async e=>{e.preventDefault();if(busy)return;busy=true;$('start').disabled=true;try{round=await transaction(s=>startRound(s,crypto.randomUUID(),Number($('wager').value),$('mode').value));mismatch=[];}catch(error){$('status').textContent=error.message;}finally{busy=false;$('start').disabled=false;await refresh();}});
$('wager').oninput=$('mode').onchange=terms;window.addEventListener('walletchange',()=>refresh().catch(e=>$('status').textContent=e.message));window.addEventListener('pagehide',()=>clearTimeout(timer));terms();refresh().catch(e=>$('status').textContent=e.message);
// Load the exact photographic slices before the first flip.
for(const id of portraits){const img=new Image();img.src=`cards/${id}-slice.webp`;}

const blank=new Image();blank.src='cards/blank-cheese.svg';
