export const ROUND_COUNT = 10;
export function makeRound(round, random = Math.random) {
  const count = 5 + Math.min(5, round);
  const types = ['T', 'CT', ...Array.from({length: count - 2}, () => random() < .5 ? 'T' : 'CT')];
  for (let i=types.length-1;i>0;i--) { const j=Math.floor(random()*(i+1)); [types[i],types[j]]=[types[j],types[i]]; }
  return types.map((type,i)=>({type, delay:i===0?450:350+random()*Math.max(400,1000-round*45), lifetime:Math.max(950,2600-round*125)+random()*500}));
}
export function pointsForHit(reaction, lifetime) { return Math.round(100+900*Math.max(0,1-reaction/lifetime)); }
export function accuracy(hits, shots) { return shots ? hits/shots : 0; }
export function score(stats) { return Math.round(Math.max(0,stats.points-stats.escaped*100)*accuracy(stats.hits,stats.shots)); }
export class Gallery {
  constructor(random=Math.random) { this.random=random; this.reset(); }
  reset() { this.round=0;this.stats={shots:0,hits:0,escaped:0,points:0,reaction:0};this.targets=[];this.sequence=0;this.state='ready'; }
  begin(now) { this.round++;this.plan=makeRound(this.round,this.random);this.next=now+this.plan[0].delay;this.state='playing'; }
  tick(now) {
    if(this.state!=='playing')return;
    for(const t of this.targets) if(t.status==='up'&&now>=t.ready+t.lifetime){t.status='escaped';t.closed=now;this.stats.escaped++;}
    this.targets=this.targets.filter(t=>t.status==='up'||now-t.closed<240);
    if(this.plan.length&&now>=this.next&&this.targets.length<3){
      const free=[0,1,2,3,4,5].filter(slot=>!this.targets.some(t=>t.slot===slot));
      const item=this.plan.shift();const slot=free[Math.floor(this.random()*free.length)];
      this.targets.push({...item,id:++this.sequence,slot,ready:now+240,status:'up'});
      this.next=now+(this.plan[0]?.delay||0);
    }
    if(!this.plan.length&&!this.targets.length)this.state=this.round===ROUND_COUNT?'over':'round-end';
  }
  shoot(id, now) {
    if(this.state!=='playing')return null;
    this.stats.shots++;
    const target=this.targets.find(t=>t.id===id&&t.status==='up'&&now>=t.ready&&now<t.ready+t.lifetime);
    if(!target)return {hit:false};
    const reaction=now-target.ready,points=pointsForHit(reaction,target.lifetime);
    target.status='hit';target.closed=now;this.stats.hits++;this.stats.points+=points;this.stats.reaction+=reaction;
    return {hit:true,points,reaction};
  }
}
