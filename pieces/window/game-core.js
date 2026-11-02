export const ROUND_COUNT = 10;
export function roundDifficulty(round) {
  const level=Math.max(0,Math.min(ROUND_COUNT-1,round-1));
  return {count:6+level*2,speed:1+level*.25,lifetime:3600-level*250,spawnDelay:800-level*50};
}
export function makeRound(round, random = Math.random) {
  const {count,lifetime,spawnDelay}=roundDifficulty(round);
  const types = ['T', 'CT', ...Array.from({length: count - 2}, () => random() < .5 ? 'T' : 'CT')];
  for (let i=types.length-1;i>0;i--) { const j=Math.floor(random()*(i+1)); [types[i],types[j]]=[types[j],types[i]]; }
  return types.map((type,i)=>({type, delay:i===0?450:spawnDelay*(.8+random()*.4), lifetime:lifetime*(.9+random()*.2)}));
}
export function pointsForHit(reaction, lifetime) { return Math.round(100+900*Math.max(0,1-reaction/lifetime)); }
export function accuracy(hits, shots) { return shots ? hits/shots : 0; }
export function score(stats) { return Math.round(Math.max(0,stats.points-stats.escaped*100)*accuracy(stats.hits,stats.shots)); }
export class Gallery {
  constructor(random=Math.random) { this.random=random; this.reset(); }
  reset() { this.round=0;this.stats={shots:0,hits:0,escaped:0,points:0,reaction:0};this.targets=[];this.sequence=0;this.state='ready'; }
  begin(now) { this.round++;this.plan=makeRound(this.round,this.random);this.next=now+this.plan[0].delay;this.state='playing';this.lastTick=now; }
  tick(now) {
    if(this.state!=='playing')return;
    // Integrate at bounded steps so movement is smooth at any display refresh rate.
    const elapsed=Math.max(0,now-this.lastTick);this.lastTick=now;
    for(const t of this.targets){
      if(t.status!=='up')continue;
      let remaining=Math.min(elapsed,100);
      while(remaining>0){
        const step=Math.min(remaining,16);remaining-=step;
        t.turnIn-=step;
        if(t.turnIn<=0){
          t.goal=(this.random()<.5?-1:1)*(.05+this.random()*.06)*roundDifficulty(this.round).speed;
          t.turnIn=280+this.random()*850;
        }
        t.velocity+=(t.goal-t.velocity)*(1-Math.exp(-step/150));
        t.x+=t.velocity*step/1000;
        if(t.x<.12||t.x>.88){
          t.x=Math.max(.12,Math.min(.88,t.x));
          const direction=t.x<=.12?1:-1;
          t.velocity=direction*Math.abs(t.velocity);t.goal=direction*Math.abs(t.goal);
        }
      }
    }
    for(const t of this.targets) if(t.status==='up'&&now>=t.ready+t.lifetime){t.status='escaped';t.closed=now;this.stats.escaped++;}
    this.targets=this.targets.filter(t=>t.status==='up'||now-t.closed<240);
    if(this.plan.length&&now>=this.next&&this.targets.length<3){
      const item=this.plan.shift();
      let x,y;
      // Avoid spawning directly over another target without imposing fixed lanes.
      for(let attempt=0;attempt<16;attempt++){
        x=.16+this.random()*.68;y=.56+this.random()*.35;
        if(!this.targets.some(t=>Math.abs(t.x-x)<.18&&Math.abs(t.y-y)<.13))break;
      }
      const velocity=(this.random()<.5?-1:1)*(.05+this.random()*.06)*roundDifficulty(this.round).speed;
      this.targets.push({...item,id:++this.sequence,x,y,velocity,goal:velocity,
        turnIn:280+this.random()*850,ready:now+240,status:'up'});
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
