// Interpolate only between adjacent, ordered photographic crush states.
export function photoStage(ratio,ratios){
 if(ratio>=ratios[0])return {from:0,to:0,mix:0};
 for(let i=0;i<ratios.length-1;i++)if(ratio>=ratios[i+1])return {from:i,to:i+1,mix:(ratios[i]-ratio)/(ratios[i]-ratios[i+1])};
 const last=ratios.length-1;return {from:last,to:last,mix:0};
}
