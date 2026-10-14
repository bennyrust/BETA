export function totemSequence(cycles=10) {
 const sequence=[1];
 for(let cycle=0;cycle<cycles;cycle++){
  for(let step=19;step>=1;step--)sequence.push(step/20);
  for(let step=2;step<=20;step++)sequence.push(step/20);
 }
 return sequence;
}

export const TOTEM_PIXELS_PER_UNIT = 230;

export function sequenceForVersion(version) {
 if(version === "V1") return totemSequence();
 if(version === "V2" || version === "V3") {
  const minimum=1/TOTEM_PIXELS_PER_UNIT, sequence=[];
  for(let step=0; (500-step)/500>minimum; step++) sequence.push((500-step)/500);
  sequence.push(minimum);
  return sequence;
 }
 throw new Error("Unknown Totem Pole version");
}
