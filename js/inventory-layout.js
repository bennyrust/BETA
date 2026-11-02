export const STORAGE_SIZE=27, SLOT_COUNT=36;
export function normalizeLayout(state){
 const seen=new Set();
 state.slots=Array.from({length:SLOT_COUNT},(_,i)=>{
  const id=state.slots?.[i];
  if(typeof id!=='string'||!(state.items[id]>0)||seen.has(id))return null;
  seen.add(id);return id;
 });
 for(const [id,count] of Object.entries(state.items))if(count>0&&!seen.has(id)){
  const index=state.slots.indexOf(null);if(index===-1)throw Error('Inventory is full');
  state.slots[index]=id;seen.add(id);
 }
 if(!Number.isInteger(state.selectedHotbar)||state.selectedHotbar<0||state.selectedHotbar>8)state.selectedHotbar=0;
 return state;
}
export function moveStack(state,from,to,expected){
 normalizeLayout(state);
 if(![from,to].every(i=>Number.isInteger(i)&&i>=0&&i<SLOT_COUNT))throw Error('Invalid slot');
 if(!state.slots[from]||state.slots[from]!==expected)throw Error('This item moved in another tab. Try again.');
 [state.slots[from],state.slots[to]]=[state.slots[to],state.slots[from]];
 return state.slots;
}
