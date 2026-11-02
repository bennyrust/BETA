import {normalizeLayout} from './inventory-layout.js';
import {TOYS,price,reward,initialState,award,buy} from './economy-rules.js';
const root=new URL('../',import.meta.url);
export const siteURL=path=>new URL(path,root).href;
const dbPromise=new Promise((resolve,reject)=>{const req=indexedDB.open('room-economy',1);req.onupgradeneeded=()=>req.result.createObjectStore('wallet');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
const channel=typeof BroadcastChannel==='function'?new BroadcastChannel('room-wallet'):null;
function changed(){window.dispatchEvent(new Event('walletchange'));}
if(channel)channel.onmessage=changed;
export async function transaction(fn){
 const db=await dbPromise;
 return new Promise((resolve,reject)=>{const tx=db.transaction('wallet','readwrite'),store=tx.objectStore('wallet'),req=store.get('player');let result;
 req.onsuccess=()=>{try{const state=req.result||initialState();if(!state.migrated){let old={};try{old=JSON.parse(localStorage.getItem('buddyologies-unboxed-v1')||'{}');}catch{}for(const id of TOYS)if(Number.isSafeInteger(old?.[id])&&old[id]>0)state.items[id]=(state.items[id]||0)+old[id];state.migrated=true;}normalizeLayout(state);result=fn(state);normalizeLayout(state);store.put(state,'player');}catch(error){reject(error);tx.abort();}};
 tx.oncomplete=()=>{changed();channel?.postMessage('changed');resolve(result);};tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Wallet update interrupted'));
 });
}
export async function wallet(){const db=await dbPromise;return new Promise((resolve,reject)=>{const req=db.transaction('wallet').objectStore('wallet').get('player');req.onsuccess=()=>resolve(normalizeLayout(req.result||initialState()));req.onerror=()=>reject(req.error);});}
export const ready=transaction(()=>{});ready.catch(()=>{});
let quotePromise,quoteAt=0;
export function market(){if(Date.now()-quoteAt>60000){quotePromise=null;quoteAt=Date.now();}return quotePromise??=fetch(siteURL('data/market.json'),{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('Prices unavailable');return r.json();}).catch(e=>{quotePromise=null;throw e;});}
export async function cost(kind){return price(kind,await market());}
// Keep shop labels on the same daily quote used by purchase().
export function watchCost(kind,onPrice,onError=()=>{}){
 let stopped=false,pending=false,previous;
 async function update(){
  if(stopped||pending||document.hidden)return;
  pending=true;
  try{const amount=await cost(kind);if(!stopped&&amount!==previous){previous=amount;onPrice(amount);}}
  catch(error){if(!stopped)onError(error);}
  finally{pending=false;}
 }
 const timer=setInterval(update,60000);
 const visible=()=>{if(!document.hidden)update();};
 function stop(){stopped=true;clearInterval(timer);document.removeEventListener('visibilitychange',visible);}
 document.addEventListener('visibilitychange',visible);
 window.addEventListener('pagehide',stop,{once:true});update();return stop;
}
export async function purchase(kind,item){
 const catalog=await fetch(siteURL('pieces/pieces.json')).then(r=>r.json());
 if(kind==='toy')item=TOYS[Math.floor(Math.random()*TOYS.length)];
 else if(kind!=='vape'||!catalog.some(p=>p.id===item&&p.pageId==='vapes'&&p.id!=='vapes'))throw Error('Unknown item');
 const amount=await cost(kind),id=crypto.randomUUID();return transaction(state=>buy(state,id,item,amount));
}
export async function awardGame(id,game,score){return transaction(state=>award(state,id,game,score));}
export {reward};
