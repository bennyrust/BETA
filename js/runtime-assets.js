// Derived runtime models retain original geometry; source downloads are untouched.
const root=new URL('../',import.meta.url);
const models={"pieces/american-spirit/american spirit.png":"optimized/images/88ba5805be661007.webp","pieces/jd/JD.png":"optimized/images/3df91a5cb44a0d43.webp","pieces/trotsky/Trotsky.png":"optimized/images/55595b8a60985dd5.webp"};
export function runtimeAsset(input){
 const url=new URL(input,typeof document==='undefined'?root:document.baseURI);
 if(url.origin===root.origin&&url.pathname.startsWith(root.pathname)){
  const path=decodeURIComponent(url.pathname.slice(root.pathname.length));
  if(models[path])return new URL(models[path],root).href;
 }
 return url.href;
}
