// Cache only the next decoded screenshot; do not download every map at startup.
export function chooseBackground(maps, previous, random=Math.random){
  const candidates=maps.filter(map=>map.name!==previous);
  const pool=candidates.length?candidates:maps;
  if(!pool.length)return null;
  const map=pool[Math.floor(random()*pool.length)];
  return {...map.images[Math.floor(random()*map.images.length)],name:map.name};
}
export function createBackgrounds(scenery){
  let previous=null;
  const catalog=fetch(new URL('./backgrounds.json',import.meta.url)).then(r=>{if(!r.ok)throw Error('Background catalog');return r.json();}).catch(()=>[]);
  async function prepare(){
    const entry=chooseBackground(await catalog,previous);
    if(!entry)return null;
    const img=new Image();img.alt='';img.className='map-background';
    return new Promise(resolve=>{
      const timeout=setTimeout(()=>finish(null),5000);
      let done=false;
      function finish(result){if(done)return;done=true;clearTimeout(timeout);img.onload=img.onerror=null;resolve(result);}
      img.onload=()=>finish({entry,img});img.onerror=()=>finish(null);
      img.src=new URL(entry.src,import.meta.url).href;
    });
  }
  let next=prepare();
  return {async change(){
    const result=await next;
    if(result){
      scenery.querySelector('.map-background')?.remove();
      scenery.append(result.img);scenery.classList.add('has-map');
      scenery.dataset.map=result.entry.name;previous=result.entry.name;
    }
    next=prepare();
  }};
}
