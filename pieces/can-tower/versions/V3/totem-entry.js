try {
 const response=await fetch(new URL('../pieces/pieces.json',import.meta.url),{cache:'no-store'});
 if(!response.ok)throw Error('Catalog unavailable');
 const records=await response.json(),piece=records.find(p=>p.id==='can-tower');
 const requested=new URLSearchParams(location.search).get('version');
 const version=['V1','V2','V3'].includes(requested)?requested:(piece.liveVersion||'V1');
 if(version==='V3') {const {mountPhotoTower}=await import('./totem-photo.js');await mountPhotoTower(piece);}
 else await import('./totem-pole.js');
}catch(error){console.error(error);const status=document.getElementById('towerStatus');status.textContent='Totem Pole could not load. Reload to retry.';window.siteLoading?.fail(status.textContent);}
