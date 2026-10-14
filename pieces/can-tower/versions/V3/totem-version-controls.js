export function mountVersionControls(piece,version){
 const liveVersion=piece.liveVersion||'V1';
 if(['localhost','127.0.0.1'].includes(location.hostname)){
  const controls=document.createElement('span');controls.style.cssText='display:inline-flex;gap:8px;margin-left:20px;align-items:center;background:white';
  const select=document.createElement('select');select.setAttribute('aria-label','Totem Pole version');
  for(const value of ['V1','V2','V3']){const option=new Option(value+(value===liveVersion?' (live)':''),value);select.add(option);}select.value=version;
  select.onchange=()=>{const url=new URL(location.href);url.searchParams.set('version',select.value);location.href=url.href;};
  const button=document.createElement('button');button.textContent=version===liveVersion?'Live':'Make live';button.disabled=version===liveVersion;
  const message=document.createElement('span');message.setAttribute('role','status');
  button.onclick=async()=>{button.disabled=true;message.textContent='Saving…';try{const saved=await fetch('/api/pieces',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:'can-tower',changes:{liveVersion:version},base:{liveVersion:piece.liveVersion||''}})});if(!saved.ok)throw Error(saved.status===409?'Version changed elsewhere. Reload and retry.':'Could not save version.');location.href=location.pathname;}catch(error){message.textContent=error.message;button.disabled=false;}};
  controls.append(select,button,message);document.querySelector('nav').append(controls);
 }
}
