export function totemSequence(cycles=10) {
 const sequence=[1];
 for(let cycle=0;cycle<cycles;cycle++){
  for(let step=19;step>=1;step--)sequence.push(step/20);
  for(let step=2;step<=20;step++)sequence.push(step/20);
 }
 return sequence;
}
