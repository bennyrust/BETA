  const style=document.createElement('style');style.textContent=`.photoPreview{border:0;padding:0;background:transparent;max-width:96vw;max-height:96dvh;overflow:visible}.photoPreview::backdrop{background:rgba(0,0,0,.85)}.photoPreview img{display:block;max-width:94vw;max-height:90dvh;object-fit:contain}.photoPreview button{position:absolute;top:6px;right:6px;background:white;color:black;border:0;font:28px Arial;cursor:pointer;width:36px;height:36px}.photoPreviewTrigger{border:0;background:none;padding:0;cursor:zoom-in;display:block;width:100%}.photoPreviewTrigger img{display:block;margin:auto}`;document.head.append(style);
let dialog;
export function openPhoto(src, alt='') {
 if(!dialog){

  dialog=document.createElement('dialog');dialog.className='photoPreview';dialog.setAttribute('aria-label','Photo preview');dialog.innerHTML='<img alt=""><button aria-label="Close photo preview">×</button>';document.body.append(dialog);
  dialog.querySelector('button').onclick=()=>dialog.close();dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
 }
 const image=dialog.querySelector('img');image.src=src;image.alt=alt;
 if(!dialog.open)dialog.showModal();
}
document.addEventListener('click',event=>{const img=event.target.closest('main img');if(!img||img.closest('a,button'))return;event.preventDefault();openPhoto(img.currentSrc||img.src,img.alt);});
