// Navigation stays in this frame: every nested laptop returns to its own room.
(()=>{
 const room=new URL('index.html?view=player',document.baseURI);
 if(window.self!==window.top)room.searchParams.set('instance',crypto.randomUUID());
 const destination=room.href;document.querySelector('nav a').href=destination;
 window.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&document.getElementById('objectMenuOverlay')?.hidden!==false){event.preventDefault();event.stopImmediatePropagation();window.location.href=destination;}
 },true);
})();
