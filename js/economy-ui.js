import {loadPieceCatalog} from './pieces.js';
import {wallet,ready,market,siteURL,transaction} from './economy.js';
import {moveStack} from './inventory-layout.js';
const css=document.createElement('link');css.rel='stylesheet';css.href=siteURL('ui/inventory.css');document.head.append(css);
document.body.classList.add('hasInventoryHUD');
const dock=document.createElement('button');dock.className='walletDock';dock.textContent='(I) Inventory';dock.setAttribute('aria-keyshortcuts','I');document.body.append(dock);
// The shelf's original collection button remains the animation destination.
const shelfButton=document.getElementById('collectionButton');
if(shelfButton){shelfButton.classList.add('walletDock','shelfInventoryButton');dock.hidden=true;queueMicrotask(()=>shelfButton.textContent='(I) Inventory');}
const roomURL=new URL(siteURL('index.html'),location.href);
const isMainRoom=location.pathname===roomURL.pathname||location.pathname===roomURL.pathname.replace(/index\.html$/,'');
const tracker=isMainRoom?document.createElement('div'):null;
const marketQuote=tracker?document.createElement('div'):null;
const coinTracker=tracker?document.createElement('output'):null;
if(tracker){tracker.className='marketHUD';marketQuote.setAttribute('aria-label','S&P 500 daily tracker');marketQuote.textContent='S&P 500 · Loading…';coinTracker.className='coinTracker';coinTracker.setAttribute('aria-label','Coin balance');coinTracker.setAttribute('aria-live','polite');coinTracker.textContent='Coins · Loading…';tracker.append(marketQuote,coinTracker);document.body.append(tracker);}
const held=isMainRoom?document.createElement('div'):null;
if(held){held.className='heldHotbarItem';held.hidden=true;held.setAttribute('aria-label','Selected hotbar item');document.body.append(held);}
let heldView,heldItem=null,heldVersion=0;
async function updateHeld(state){
 if(!held)return;
 const id=state.slots[27+state.selectedHotbar]||null;
 if(id===heldItem)return;
 heldItem=id;const token=++heldVersion;
 held.hidden=!id;held.dataset.item=id||'';
 if(!id){heldView?.clear();return;}
 held.setAttribute('aria-label',nameFor(id));
 try{
  const module=await import('./inventory-view.js');
  if(token!==heldVersion)return;
  if(!heldView)heldView=module.createItemView(held);
  await heldView.show(catalog.find(p=>p.id===id),()=>token===heldVersion);
 }catch{if(token===heldVersion){held.hidden=true;heldItem=null;}}
}
const bar=document.createElement('div');bar.className='itemHotbar';bar.setAttribute('role','group');bar.setAttribute('aria-label','Item hotbar');document.body.append(bar);
const dialog=document.createElement('dialog');dialog.className='inventoryDialog';dialog.setAttribute('aria-label','Inventory');
dialog.innerHTML=`<div class="inventoryTop"><strong>Inventory</strong><button class="inventoryClose" aria-label="Close inventory">×</button></div><div class="inventoryUpper"><div class="equipmentSlots" aria-hidden="true"><i></i><i></i><i></i><i></i></div><div class="itemStage"><span>Select an owned item</span></div><div class="craftArea" aria-hidden="true"><span>Crafting</span><div><i></i><i></i><i></i><i></i></div><b>→</b><i></i></div></div><div class="inventoryInfo"><strong class="itemName">Inventory</strong><small class="itemHint">Drag items between slots · Drag a model to rotate it</small></div><div class="inventorySlots" role="group" aria-label="Stored items"></div><div class="inventoryHotbar" role="group" aria-label="Hotbar slots"></div>`;
document.body.append(dialog);
let catalog=[],view,version=0,refreshVersion=0,drag=null,dragGhost=null,refreshPending=false,suppressClick=false,keyboardItem=null;
const catalogPromise=loadPieceCatalog().then(p=>catalog=[...new Set(p.values())]);
export const inventoryOpen=()=>dialog.open;
export function notify(message){let el=document.querySelector('.walletToast');if(!el){el=document.createElement('output');el.className='walletToast';el.setAttribute('role','status');document.body.append(el);}el.textContent=message;clearTimeout(notify.timer);notify.timer=setTimeout(()=>el.remove(),6500);}
function nameFor(id){return catalog.find(p=>p.id===id)?.name.trim()||id;}
function slot(index,id,count,selected){
 const b=document.createElement('button');b.type='button';b.className='inventorySlot';b.dataset.slot=index;b.dataset.item=id||'';
 b.setAttribute('aria-label',`${index<27?'Inventory':'Hotbar'} slot ${index<27?index+1:index-26}${id?`: ${nameFor(id)} × ${count}`:': empty'}`);
 b.classList.toggle('isSelected',index===27+selected);if(index>=27)b.setAttribute('aria-pressed',String(index===27+selected));
 if(id){b.title=`${nameFor(id)} × ${count}`;const icon=document.createElement('img');icon.src=siteURL(`ui/inventory-icons/${id}.png`);icon.alt='';icon.draggable=false;icon.className='inventoryIcon';b.append(icon);if(count>1){const n=document.createElement('b');n.textContent=count;b.append(n);}}
 b.onclick=()=>{if(suppressClick)return;if(index>=27)selectHotbar(index-27);if(id&&dialog.open)inspect(id);};
 b.onpointerdown=e=>beginDrag(e,b);
 b.onkeydown=e=>{if(!dialog.open||!['Enter',' '].includes(e.key))return;e.preventDefault();if(keyboardItem){const source=keyboardItem;keyboardItem=null;move(source.index,index,source.id);}else if(id){keyboardItem={index,id};notify('Item picked up. Focus another slot and press Enter to move it.');}};
 return b;
}
async function inspect(id){const token=++version,p=catalog.find(p=>p.id===id);dialog.querySelector('.itemName').textContent=nameFor(id);const stage=dialog.querySelector('.itemStage');try{if(!view){const module=await import('./inventory-view.js');if(token!==version||!dialog.open)return;view=module.createItemView(stage);}await view.show(p,()=>token===version&&dialog.open);}catch{notify('Could not load this model. Select it to retry.');}}
async function refresh(){const token=++refreshVersion;await ready;await catalogPromise;const state=await wallet();if(token!==refreshVersion)return;if(coinTracker)coinTracker.textContent=`Coins  ${state.coins.toLocaleString('en-US')}`;if(drag){refreshPending=true;return;}updateHeld(state);bar.replaceChildren();for(let i=27;i<36;i++)bar.append(slot(i,state.slots[i],state.items[state.slots[i]],state.selectedHotbar));if(!dialog.open)return;const slots=dialog.querySelector('.inventorySlots'),hotbar=dialog.querySelector('.inventoryHotbar');slots.replaceChildren();hotbar.replaceChildren();for(let i=0;i<36;i++)(i<27?slots:hotbar).append(slot(i,state.slots[i],state.items[state.slots[i]],state.selectedHotbar));}
async function selectHotbar(index){try{await transaction(s=>{s.selectedHotbar=index;});}catch(e){notify(e.message);}}
async function move(from,to,id){if(from===to)return;try{await transaction(s=>moveStack(s,from,to,id));}catch(e){notify(e.message);}}
function targetAt(x,y){
 // Explicit rectangles also permit dropping onto the bottom HUD while the modal is open.
 const candidates=[...dialog.querySelectorAll('[data-slot]'),...bar.querySelectorAll('[data-slot]')];
 return candidates.find(b=>{if(b.closest('dialog')&&!dialog.open)return false;const r=b.getBoundingClientRect();return r.width&&x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom;});
}
function beginDrag(e,b){if(e.button!==0||!b.dataset.item)return;e.stopPropagation();drag={pointer:e.pointerId,index:+b.dataset.slot,id:b.dataset.item,x:e.clientX,y:e.clientY,button:b,active:false};b.setPointerCapture(e.pointerId);}
function cancelDrag(){drag?.button.classList.remove('isDragging');drag=null;dragGhost?.remove();dragGhost=null;document.querySelectorAll('.dropTarget').forEach(b=>b.classList.remove('dropTarget'));if(refreshPending){refreshPending=false;refresh().catch(e=>notify(e.message));}}
window.addEventListener('pointermove',e=>{if(!drag||drag.pointer!==e.pointerId)return;if(!drag.active&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<5)return;e.preventDefault();if(!drag.active){drag.active=true;drag.button.classList.add('isDragging');dragGhost=document.createElement('img');dragGhost.className='inventoryDragGhost';dragGhost.src=siteURL(`ui/inventory-icons/${drag.id}.png`);(dialog.open?dialog:document.body).append(dragGhost);}dragGhost.style.left=e.clientX+'px';dragGhost.style.top=e.clientY+'px';document.querySelectorAll('.dropTarget').forEach(b=>b.classList.remove('dropTarget'));targetAt(e.clientX,e.clientY)?.classList.add('dropTarget');},{passive:false});
window.addEventListener('pointerup',e=>{if(!drag||drag.pointer!==e.pointerId)return;const source=drag,target=targetAt(e.clientX,e.clientY);if(source.active){suppressClick=true;setTimeout(()=>suppressClick=false,0);}cancelDrag();if(source.active&&target)move(source.index,+target.dataset.slot,source.id);});
window.addEventListener('pointercancel',cancelDrag);window.addEventListener('blur',cancelDrag);
export async function openInventory(){if(dialog.open)return;dialog.showModal();dialog.querySelector('.itemName').textContent='Inventory';window.dispatchEvent(new CustomEvent('inventorytoggle',{detail:true}));refresh().catch(e=>notify(e.message));}
dock.onclick=openInventory;dialog.querySelector('.inventoryClose').onclick=()=>dialog.close();dialog.addEventListener('close',()=>{version++;keyboardItem=null;cancelDrag();view?.clear();window.dispatchEvent(new CustomEvent('inventorytoggle',{detail:false}));});
dialog.addEventListener('click',e=>{if(e.target===dialog&&!suppressClick){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
function typing(e){return e.target instanceof Element&&(e.target.isContentEditable||e.target.closest('input,textarea,select'));}
window.addEventListener('keydown',e=>{
 if(typing(e)||e.ctrlKey||e.altKey||e.metaKey)return;
 if(e.code==='KeyI'){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)dialog.open?dialog.close():openInventory();return;}
 if(!dialog.open&&/^Digit[1-9]$/.test(e.code)){e.preventDefault();e.stopImmediatePropagation();selectHotbar(Number(e.code.slice(-1))-1);return;}
 if(dialog.open&&e.key!=='Escape'){
  // Allow native Tab navigation and the slot's keyboard drop handler while stopping game shortcuts.
  if(e.key==='Tab'||((e.key==='Enter'||e.key===' ')&&e.target.closest?.('[data-slot]')))return;
  e.stopImmediatePropagation();
 }
},true);
dialog.addEventListener('keydown',e=>e.stopPropagation());
window.addEventListener('keyup',e=>{if(dialog.open||e.code==='KeyI')e.stopImmediatePropagation();},true);
async function refreshMarket(){if(!tracker)return;try{const q=await market();marketQuote.textContent=`S&P 500  ${q.close.toLocaleString('en-US',{minimumFractionDigits:2})}`;const date=document.createElement('small');date.textContent=`${q.date} · Daily close`;marketQuote.append(date);}catch{marketQuote.textContent='S&P 500 · Unavailable';}}
window.addEventListener('walletchange',()=>refresh().catch(e=>notify(e.message)));refresh().catch(()=>notify('Inventory storage is unavailable.'));if(tracker){refreshMarket();const marketTimer=setInterval(refreshMarket,60000);window.addEventListener('pagehide',()=>clearInterval(marketTimer));}
